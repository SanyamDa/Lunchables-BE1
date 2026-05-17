const Anthropic = require('@anthropic-ai/sdk');
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
  fs.writeFileSync(LAST_WEEK_FILE, JSON.stringify(plan, null, 2));
}

const weekPlanSchema = {
  type: 'object',
  properties: Object.fromEntries(SLOTS.map(s => [s, { '$ref': '#/$defs/meal' }])),
  required: SLOTS,
  additionalProperties: false,
  '$defs': {
    meal: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        cuisine: { type: 'string' },
        style: { type: 'string' },
        meal_type: { type: 'array', items: { type: 'string' } },
        frequency_per_month: { type: 'number' }
      },
      required: ['name', 'cuisine', 'style', 'meal_type', 'frequency_per_month'],
      additionalProperties: false
    }
  }
};

async function generateWeekAI(meals) {
  const client = new Anthropic();
  const lastWeek = readLastWeek();
  const lunchMeals = meals.filter(m => m.meal_type.includes('Lunch'));
  const dinnerMeals = meals.filter(m => m.meal_type.includes('Dinner'));

  const prompt = `You are a meal planner. Choose meals for each slot in a weekly plan.

Available meals (choose ONLY from this list, return the complete meal object):

LUNCH options:
${JSON.stringify(lunchMeals, null, 2)}

DINNER options:
${JSON.stringify(dinnerMeals, null, 2)}

Rules:
1. Lunch slots must use a meal from LUNCH options; dinner slots from DINNER options
2. A meal with frequency_per_month N can appear at most ceil(N/4) times (minimum 1)
3. Avoid the same cuisine for both meals on the same day
4. Avoid the same cuisine as the previous day's dinner
5. At most 6 Heavy-style meals total across the week
6. No two Heavy-style meals on the same day
7. Maximize variety — spread different cuisines across the week
${lastWeek ? `8. Avoid repeating these meals on Monday and Tuesday (served last weekend):
   Saturday lunch: ${lastWeek['saturday-lunch']?.name}
   Saturday dinner: ${lastWeek['saturday-dinner']?.name}
   Sunday lunch: ${lastWeek['sunday-lunch']?.name}
   Sunday dinner: ${lastWeek['sunday-dinner']?.name}` : ''}

Return the complete meal object for every slot.`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 4096,
    output_config: {
      format: { type: 'json_schema', schema: weekPlanSchema }
    },
    messages: [{ role: 'user', content: prompt }]
  });

  const text = response.content.find(b => b.type === 'text')?.text;
  const plan = JSON.parse(text);
  saveLastWeek(plan);
  return plan;
}

module.exports = { generateWeekAI };
