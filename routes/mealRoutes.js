const express = require('express');
const fs = require('fs');
const path = require('path');
const { generateWeekAI } = require('../logic/aiWeekGenerator');


const router = express.Router();
const MEALS_FILE = path.join(__dirname, '..', 'data', 'meals.json');

function readMeals() {
  const raw = fs.readFileSync(MEALS_FILE, 'utf-8');
  return JSON.parse(raw);
}

function writeMeals(meals) {
  fs.writeFileSync(MEALS_FILE, JSON.stringify(meals, null, 2));
}

// GET /api/meals — return the whole meal list
router.get('/meals', (req, res) => {
  res.json(readMeals());
});

// POST /api/meals — add a new meal
router.post('/meals', (req, res) => {
  const { name, cuisine, style, meal_type, frequency_per_month } = req.body;
  if (!name || !cuisine || !style || !Array.isArray(meal_type) || typeof frequency_per_month !== 'number') {
    return res.status(400).json({ error: 'Missing or invalid fields' });
  }
  const meals = readMeals();
  const newMeal = { name, cuisine, style, meal_type, frequency_per_month };
  meals.push(newMeal);
  writeMeals(meals);
  res.status(201).json(newMeal);
});

// POST /api/generate-week — return a 14-meal plan
router.post('/generate-week', async(req, res) => {
  try {
    const meals = readMeals();
    const week = await generateWeekAI(meals);
    res.json(week);
  } catch (err) {
    console.error('generate-week error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate week' });
  }
});

module.exports = router;