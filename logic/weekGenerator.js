const fs = require('fs');
const path = require('path');
const { buildSlots, passesAllRules, notAlreadyUsed } = require('./rules');

const LAST_WEEK_FILE = path.join(__dirname, '..', 'data', 'lastWeek.json');

function readLastWeek() {
  try {
    return JSON.parse(fs.readFileSync(LAST_WEEK_FILE, 'utf-8'));
  } catch {
    return null;   // first ever run — no history file yet
  }
}

function saveLastWeek(plan) {
  fs.writeFileSync(LAST_WEEK_FILE, JSON.stringify(plan, null, 2));
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Anchor slots first (weekend dinners are typically the "fancier" picks)
function getOrderedSlots() {
  const anchors = ['saturday-dinner', 'sunday-dinner', 'saturday-lunch', 'sunday-lunch'];
  const rest = buildSlots().filter(s => !anchors.includes(s));
  return [...anchors, ...rest];
}

function pickForSlot(plan, slot, meals, options) {
  const shuffled = shuffle(meals);

  // Attempt 1: full rules
  for (const c of shuffled) {
    if (notAlreadyUsed(plan, c) && passesAllRules(plan, slot, c, options)) return c;
  }
  // Attempt 2: relax history rule
  for (const c of shuffled) {
    if (notAlreadyUsed(plan, c) && passesAllRules(plan, slot, c, { ...options, relaxHistory: true })) return c;
  }
  // Last resort: any unused meal
  for (const c of shuffled) {
    if (notAlreadyUsed(plan, c)) return c;
  }
  return shuffled[0];   // pool exhausted — should never happen with 20 meals
}

function generateWeek(meals) {
  const lastWeek = readLastWeek();
  const plan = {};
  for (const slot of getOrderedSlots()) {
    plan[slot] = pickForSlot(plan, slot, meals, { lastWeek });
  }
  saveLastWeek(plan);
  return plan;
}

module.exports = { generateWeek };
