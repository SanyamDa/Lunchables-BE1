const express = require('express');
const fs = require('fs');
const path = require('path');
const { generateWeek } = require('../logic/weekGenerator');

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
  const { name, cuisine, style, main_ingredient } = req.body;
  if (!name || !cuisine || !style || !main_ingredient) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const meals = readMeals();
  const newMeal = { name, cuisine, style, main_ingredient };
  meals.push(newMeal);
  writeMeals(meals);
  res.status(201).json(newMeal);
});

// POST /api/generate-week — return a 14-meal plan
router.post('/generate-week', (req, res) => {
  const meals = readMeals();
  const week = generateWeek(meals);
  res.json(week);
});

module.exports = route