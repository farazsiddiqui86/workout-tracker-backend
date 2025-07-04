// server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001; // Port for your backend server

app.use(cors()); // Allow cross-origin requests
app.use(express.json()); // Allow server to accept JSON data

const dbPath = path.join(__dirname, 'db.json');

// Helper function to read from our JSON database
const readDb = () => {
  if (!fs.existsSync(dbPath)) {
    return { workouts: [] };
  }
  const data = fs.readFileSync(dbPath);
  return JSON.parse(data);
};

// Helper function to write to our JSON database
const writeDb = (data) => {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
};

// --- API ROUTES ---

// GET all workouts
app.get('/api/workouts', (req, res) => {
  const db = readDb();
  res.json(db.workouts);
});

// POST a new workout
app.post('/api/workouts', (req, res) => {
  const db = readDb();
  const newWorkout = { id: Date.now(), ...req.body }; // Add a unique ID
  db.workouts.push(newWorkout);
  writeDb(db);
  res.status(201).json(newWorkout);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});