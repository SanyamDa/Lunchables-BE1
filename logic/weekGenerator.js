const fs = require('fs');
const path = require('path');
const { buildSlots, passesAllRules, matchesSlotType } = require('./rules');

const LAST_WEEK_FILE = path.join(__dirname, '..', 'data', 'lastWeek.json');

function readLastWeek() {
  try { return JSON.parse(fs.readFileSync(LAST_WEEK_FILE, 'utf-8')); }
  catch { return null; }
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

function getOrderedSlots() {
  const anchors = ['saturday-dinner', 'sunday-dinner', 'saturday-lunch', 'sunday-lunch'];
  return [...anchors, ...buildSlots().filter(s => !anchors.includes(s))];
}

function pickForSlot(plan, slot, meals, options) {
  const shuffled = shuffle(meals);
  for (const c of shuffled) if (passesAllRules(plan, slot, c, options)) return c;
  for (const c of shuffled) if (passesAllRules(plan, slot, c, { ...options, relaxHistory: true })) return c;
  return shuffled.find(c => matchesSlotType(slot, c)) || shuffled[0];
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