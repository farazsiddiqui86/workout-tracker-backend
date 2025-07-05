// server.js
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3001;

// --- Database Connection ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Helper Function to Create Tables on Startup ---
const setupDatabase = async () => {
  const client = await pool.connect();
  try {
    // Create workouts table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS workouts (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        workout_type VARCHAR(255) NOT NULL,
        exercises JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // **NEW**: Create exercise_library table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS exercise_library (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL
      );
    `);
    
    console.log('Database tables are ready.');
  } catch (err) {
    console.error('Error setting up database tables:', err);
  } finally {
    client.release();
  }
};

// --- API ROUTES for Workouts ---

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
  if (!date || !workoutType || !exercises) {
    return res.status(400).send('Missing required fields.');
  }
  try {
    const result = await pool.query(
  'INSERT INTO workouts (date, workout_type, exercises) VALUES ($1, $2, $3) RETURNING *;',
  [date, workoutType, JSON.stringify(exercises)] // The change is here
);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// --- **NEW**: API ROUTES for Exercise Library ---

// GET all exercises from the library
app.get('/api/exercises', async (req, res) => {
  try {
    const result = await pool.query('SELECT name FROM exercise_library ORDER BY name ASC;');
    res.json(result.rows.map(row => row.name)); // Send back an array of names
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// POST a new exercise to the library
app.post('/api/exercises', async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).send('Exercise name is required.');
  }
  try {
    // "ON CONFLICT (name) DO NOTHING" elegantly handles duplicates.
    // If the name already exists, it does nothing and doesn't throw an error.
    const result = await pool.query(
      'INSERT INTO exercise_library (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING *;',
      [name.trim()]
    );
    if (result.rows.length > 0) {
      res.status(201).json(result.rows[0]);
    } else {
      res.status(200).send('Exercise already exists.');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// DELETE a specific workout
app.delete('/api/workouts/:id', async (req, res) => {
  const { id } = req.params; // Get the ID from the URL parameter
  try {
    const deleteOp = await pool.query('DELETE FROM workouts WHERE id = $1 RETURNING *;', [id]);
    
    if (deleteOp.rowCount > 0) {
      res.status(200).send(`Workout with ID ${id} deleted.`);
    } else {
      res.status(404).send('Workout not found.');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// PUT (update) a specific workout
app.put('/api/workouts/:id', async (req, res) => {
  const { id } = req.params;
  const { date, workoutType, exercises } = req.body;

  if (!date || !workoutType || !exercises) {
    return res.status(400).send('Missing required fields.');
  }

  try {
    const result = await pool.query(
      'UPDATE workouts SET date = $1, workout_type = $2, exercises = $3 WHERE id = $4 RETURNING *;',
      [date, workoutType, JSON.stringify(exercises), id]
    );

    if (result.rowCount > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).send('Workout not found.');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  setupDatabase(); // Run the database setup on start
});
// Forcing a redeploy