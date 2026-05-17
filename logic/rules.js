const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const MEALS_PER_DAY = ['lunch', 'dinner'];

function buildSlots() {
  const slots = [];
  for (const day of DAYS) {
    for (const m of MEALS_PER_DAY) {
      slots.push(`${day}-${m}`);
    }
  }
  return slots;
}

function getDay(slot)      { return slot.split('-')[0]; }
function getMealType(slot) { return slot.split('-')[1]; }

// 1a. Max N of the same cuisine per week
function withinCuisineCap(plan, slot, candidate, cap = 4) {
  const count = Object.values(plan).filter(m => m && m.cuisine === candidate.cuisine).length;
  return count < cap;
}

// 1b. Next-Day Block: don't repeat yesterday's dinner cuisine today
function passesNextDayBlock(plan, slot, candidate) {
  const dayIndex = DAYS.indexOf(getDay(slot));
  if (dayIndex === 0) return true;
  const prev = plan[`${DAYS[dayIndex - 1]}-dinner`];
  return !prev || prev.cuisine !== candidate.cuisine;
}

// 1c. Same-day lunch & dinner can't share a cuisine
function passesSameDayCuisine(plan, slot, candidate) {
  const other = getMealType(slot) === 'lunch' ? 'dinner' : 'lunch';
  const otherMeal = plan[`${getDay(slot)}-${other}`];
  return !otherMeal || otherMeal.cuisine !== candidate.cuisine;
}

// 2a. 24-hour buffer on main_ingredient
function passesIngredientBuffer(plan, slot, candidate) {
  const dayIndex = DAYS.indexOf(getDay(slot));
  if (dayIndex === 0) return true;
  const prev = plan[`${DAYS[dayIndex - 1]}-dinner`];
  return !prev || prev.main_ingredient !== candidate.main_ingredient;
}

// 2b. Same-day lunch & dinner can't share main_ingredient
function passesSameDayIngredient(plan, slot, candidate) {
  const other = getMealType(slot) === 'lunch' ? 'dinner' : 'lunch';
  const otherMeal = plan[`${getDay(slot)}-${other}`];
  return !otherMeal || otherMeal.main_ingredient !== candidate.main_ingredient;
}

// 3a. Never two Heavy meals on the same day
function passesDailyEquilibrium(plan, slot, candidate) {
  if (candidate.style !== 'Heavy') return true;
  const other = getMealType(slot) === 'lunch' ? 'dinner' : 'lunch';
  const otherMeal = plan[`${getDay(slot)}-${other}`];
  return !otherMeal || otherMeal.style !== 'Heavy';
}

// 3b. Max N Heavy meals across the whole week
function withinHeavyCap(plan, slot, candidate, cap = 6) {
  if (candidate.style !== 'Heavy') return true;
  const heavyCount = Object.values(plan).filter(m => m && m.style === 'Heavy').length;
  return heavyCount < cap;
}

// 4. Don't repeat last week's Sat/Sun meals on this Mon/Tue
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

// No dish twice in the same week
function notAlreadyUsed(plan, candidate) {
  return !Object.values(plan).some(m => m && m.name === candidate.name);
}

// Master gate — all rules must pass
function passesAllRules(plan, slot, candidate, options = {}) {
  const { lastWeek, relaxHistory = false } = options;
  if (!withinCuisineCap(plan, slot, candidate))        return false;
  if (!passesNextDayBlock(plan, slot, candidate))      return false;
  if (!passesSameDayCuisine(plan, slot, candidate))    return false;
  if (!passesIngredientBuffer(plan, slot, candidate))  return false;
  if (!passesSameDayIngredient(plan, slot, candidate)) return false;
  if (!passesDailyEquilibrium(plan, slot, candidate))  return false;
  if (!withinHeavyCap(plan, slot, candidate))          return false;
  if (!relaxHistory && !passesPreviousWeek(plan, slot, candidate, lastWeek)) return false;
  return true;
}

module.exports = {
  DAYS,
  MEALS_PER_DAY,
  buildSlots,
  passesAllRules,
  notAlreadyUsed,
};
ddd