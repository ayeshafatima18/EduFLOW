const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'eduflow.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err);
  } else {
    console.log('Connected to SQLite database.');
    initDb();
  }
});

function initDb() {
  db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL
    )`);

    // Course Requests table
    db.run(`CREATE TABLE IF NOT EXISTS requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      courseTitle TEXT NOT NULL,
      department TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      faculty TEXT NOT NULL,
      facultyEmail TEXT NOT NULL,
      submittedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      reviewNotes TEXT,
      reviewedAt DATETIME
    )`);

    // Seed dummy users if empty
    db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
      if (row.count === 0) {
        db.run(`INSERT INTO users (name, email, password, role) VALUES 
          ('Admin User', 'admin@fau.edu', 'Admin@123', 'admin'),
          ('Dr. Faculty', 'faculty@fau.edu', 'Faculty@123', 'faculty'),
          ('Student User', 'student@fau.edu', 'Student@123', 'student')
        `);
        console.log('Seeded database with dummy users.');
      }
    });

    // Seed dummy requests if empty
    db.get("SELECT COUNT(*) as count FROM requests", (err, row) => {
      if (row.count === 0) {
        db.run(`INSERT INTO requests (courseTitle, department, description, status, faculty, facultyEmail) VALUES 
          ('Intro to Machine Learning', 'Computer Science', 'A foundational course for ML concepts.', 'approved', 'Dr. Faculty', 'faculty@fau.edu'),
          ('Advanced Data Structures', 'Computer Science', 'Deep dive into complex data structures.', 'pending', 'Dr. Faculty', 'faculty@fau.edu')
        `);
      }
    });
  });
}

module.exports = db;
