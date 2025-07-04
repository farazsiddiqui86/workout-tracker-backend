// server.js
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = 3001;

// --- Database Connection ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Render provides this automatically
  ssl: {
    rejectUnauthorized: false
  }
});

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Helper Function to Create Table on Startup ---
const setupDatabase = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS workouts (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        workout_type VARCHAR(255) NOT NULL,
        exercises JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Database table is ready.');
  } catch (err) {
    console.error('Error setting up database table:', err);
  } finally {
    client.release();
  }
};

// --- API ROUTES ---

// GET all workouts
app.get('/api/workouts', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM workouts ORDER BY date DESC;');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// POST a new workout
app.post('/api/workouts', async (req, res) => {
  const { date, workoutType, exercises } = req.body;
  
  // Basic validation
  if (!date || !workoutType || !exercises) {
    return res.status(400).send('Missing required fields.');
  }

  try {
    const result = await pool.query(
      'INSERT INTO workouts (date, workout_type, exercises) VALUES ($1, $2, $3) RETURNING *;',
      [date, workoutType, exercises]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  setupDatabase(); // Run the database setup
});