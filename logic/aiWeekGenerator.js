const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const SLOTS = DAYS.flatMap(d => ['lunch', 'dinner'].map(m => `${d}-${m}`));
const LAST_WEEK_FILE = path.join(__dirname, '..', 'data', 'lastWeek.json');

function readLastWeek() {
  try { return JSON.parse(fs.readFileSync(LAST_WEEK_FILE, 'utf-8')); }
  catch { return null; }
}

function saveLastWeek(plan) {
  try { fs.writeFileSync(LAST_WEEK_FILE, JSON.stringify(plan, null, 2)); }
  catch (e) { console.warn('Could not save lastWeek.json:', e.message); }
}

const mealSchema = {
  type: 'object',
  properties: {
    name:                 { type: 'string' },
    cuisine:              { type: 'string' },
    style:                { type: 'string' },
    meal_type:            { type: 'array', items: { type: 'string' } },
    frequency_per_month:  { type: 'number' }
  },
  required: ['name', 'cuisine', 'style', 'meal_type', 'frequency_per_month'],
  additionalProperties: false
};

const weekPlanSchema = {
  type: 'object',
  properties: Object.fromEntries(SLOTS.map(s => [s, mealSchema])),
  required: SLOTS,
  additionalProperties: false
};

async function generateWeekAI(meals) {
  const client = new OpenAI();
  const lastWeek = readLastWeek();
  const lunchMeals = meals.filter(m => m.meal_type.includes('Lunch'));
  const dinnerMeals = meals.filter(m => m.meal_type.includes('Dinner'));

  const prompt = `You are a deterministic, zero-hallucination meal scheduling engine. Your absolute priority is structural accuracy and adherence to logic, not creativity. Your task is to generate a realistic 14-meal weekly schedule (Lunch and Dinner for 7 days) using ONLY the provided household dataset.

Available meals (choose ONLY from this list, return the complete meal object):

LUNCH options:
${JSON.stringify(lunchMeals, null, 2)}

DINNER options:
${JSON.stringify(dinnerMeals, null, 2)}


You must build the schedule by strictly applying the following four algorithmic layers:

LAYER 1: THE 72-HOUR COOLDOWN RULE (MAXIMUM PRIORITY)
- Once a specific dish is scheduled for a meal slot, that EXACT dish is completely locked and CANNOT be used again for the next 7 consecutive meal slots (which equals 72 hours).
- Example: If "Dosa" is chosen for Monday Lunch, it is banned from Monday Dinner, Tuesday Lunch/Dinner, Wednesday Lunch/Dinner, and Thursday Lunch. It can only reappear on Thursday Dinner at the earliest.

LAYER 2: STRICT CONSECUTIVE DAY & CUISINE BLOCKERS
- No Bacdddk-to-Back Cuisines: You cannot schedule the same cuisine for consecutive meal slots. If Monday Dinner is Indian, Tuesday Lunch CANNOT be Indian.
- No Same-Day Cuisine Clashes: Lunch and Dinner on the exact same day must always be different cuisines (e.g., you cannot have Thai for both lunch and dinner on Friday).

LAYER 3: HEALTH & STYLE BALANCE RULES
- Daily Equilibrium: Every single day MUST have exactly one "Light" meal and one "Heavy" meal. You are strictly forbidden from scheduling two "Heavy" meals or two "Light" meals on the same day. 
- Weekly Cap: Across the entire 14-meal schedule, you are capped at a maximum of 6 "Heavy" meals total. 
- Meal Type Restrictions: Ensure that dishes assigned to a slot match the allowed values in their "meal_type" array from the dataset (e.g., do not put a Dinner-only dish into a Lunch slot).

LAYER 4: PROBABILITY WEIGHTING (FREQUENCY PER MONTH)
- You must mathematically favor dishes with a higher "frequency_per_month" value. A dish with a value of 8 should appear roughly 4 times more often over a monthly cycle than a dish with a value of 2. 
- However, the 72-hour cooldown rule and the Cuisine blockers ALWAYS take absolute priority over frequency. If a high-frequency dish breaks a rule, it must be skipped.

GENERATION PROCESS:
To ensure accuracy, execute a Multi-Pass Strategy internally:
1. Pass 1: Space out your highest-frequency staples (e.g., Dal Chawal) across the week first, ensuring they obey the 72-hour buffer.
2. Pass 2: Fill the remaining vacant slots with lower-frequency items.
3. Pass 3: Review the final matrix. If "Heavy" meals exceed 6, erase and rebuild.

Return the complete meal object for every slot.`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 4096,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'week_plan',
        schema: weekPlanSchema,
        strict: true
      }
    },
    messages: [{ role: 'user', content: prompt }]
  });

  const plan = JSON.parse(response.choices[0].message.content);
  saveLastWeek(plan);
  return plan;
}

module.exports = { generateWeekAI };