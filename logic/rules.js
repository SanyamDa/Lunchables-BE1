const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const MEALS_PER_DAY = ['lunch', 'dinner'];

function buildSlots() {
  const slots = [];
  for (const day of DAYS) for (const m of MEALS_PER_DAY) slots.push(`${day}-${m}`);
  return slots;
}

const getDay      = slot => slot.split('-')[0];
const getMealType = slot => slot.split('-')[1];

//only allow meals tagged for this slot type
function matchesSlotType(slot, candidate) {
  const want = getMealType(slot) === 'lunch' ? 'Lunch' : 'Dinner';
  return Array.isArray(candidate.meal_type) && candidate.meal_type.includes(want);
}

//frequency cap scaled to one week
function withinFrequencyCap(plan, slot, candidate) {
  const perWeekCap = Math.max(1, Math.ceil((candidate.frequency_per_month || 0) / 4));
  const used = Object.values(plan).filter(m => m && m.name === candidate.name).length;
  return used < perWeekCap;
}

function withinCuisineCap(plan, slot, candidate, cap = 7) {
  const count = Object.values(plan).filter(m => m && m.cuisine === candidate.cuisine).length;
  return count < cap;
}

function passesNextDayBlock(plan, slot, candidate) {
  const i = DAYS.indexOf(getDay(slot));
  if (i === 0) return true;
  const prev = plan[`${DAYS[i - 1]}-dinner`];
  return !prev || prev.cuisine !== candidate.cuisine;
}

function passesSameDayCuisine(plan, slot, candidate) {
  const other = getMealType(slot) === 'lunch' ? 'dinner' : 'lunch';
  const otherMeal = plan[`${getDay(slot)}-${other}`];
  return !otherMeal || otherMeal.cuisine !== candidate.cuisine;
}

function passesDailyEquilibrium(plan, slot, candidate) {
  if (candidate.style !== 'Heavy') return true;
  const other = getMealType(slot) === 'lunch' ? 'dinner' : 'lunch';
  const otherMeal = plan[`${getDay(slot)}-${other}`];
  return !otherMeal || otherMeal.style !== 'Heavy';
}

function withinHeavyCap(plan, slot, candidate, cap = 6) {
  if (candidate.style !== 'Heavy') return true;
  const heavy = Object.values(plan).filter(m => m && m.style === 'Heavy').length;
  return heavy < cap;
}

function passesPreviousWeek(plan, slot, candidate, lastWeek) {
  if (!lastWeek) return true;
  const day = getDay(slot);
  if (day !== 'monday' && day !== 'tuesday') return true;
  const recent = [
    lastWeek['saturday-lunch'], lastWeek['saturday-dinner'],
    lastWeek['sunday-lunch'],   lastWeek['sunday-dinner'],
  ];
  return !recent.some(m => m && m.name === candidate.name);
}

function passesAllRules(plan, slot, candidate, options = {}) {
  const { lastWeek, relaxHistory = false } = options;
  if (!matchesSlotType(slot, candidate))              return false;
  if (!withinFrequencyCap(plan, slot, candidate))     return false;
  if (!withinCuisineCap(plan, slot, candidate))       return false;
  if (!passesNextDayBlock(plan, slot, candidate))     return false;
  if (!passesSameDayCuisine(plan, slot, candidate))   return false;
  if (!passesDailyEquilibrium(plan, slot, candidate)) return false;
  if (!withinHeavyCap(plan, slot, candidate))         return false;
  if (!relaxHistory && !passesPreviousWeek(plan, slot, candidate, lastWeek)) return false;
  return true;
}

module.exports = { DAYS, MEALS_PER_DAY, buildSlots, passesAllRules, matchesSlotType };