require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mealRoutes = require('./routes/mealRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());                 // let frontend on :3000 call us on :3001
app.use(express.json());         // parse JSON request bodies into req.bo
app.use('/api', mealRoutes);     // anything starting with /api goes to mealRoutes

app.get('/', (req, res) => {
  res.send('Meal planner backend is running!');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
