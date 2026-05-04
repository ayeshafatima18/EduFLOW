require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'super-secret-key-eduflow';

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:4173',
    'https://69f81a9d478ce0197d78ecfd--cozy-dusk-f2dbc9.netlify.app/'
  ],
  credentials: true
}));
app.use(express.json());

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) console.warn('WARNING: GEMINI_API_KEY is not set. AI features will not work.');
const genAI = new GoogleGenerativeAI(API_KEY);

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  db.get("SELECT * FROM users WHERE email = ? AND password = ?", [email, password], (err, user) => {
    if (err || !user) return res.status(401).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
  });
});

app.get('/api/requests', authenticateToken, (req, res) => {
  if (req.user.role === 'admin') {
    db.all("SELECT * FROM requests ORDER BY submittedAt DESC", [], (err, rows) => res.json(rows));
  } else {
    db.all("SELECT * FROM requests WHERE facultyEmail = ? ORDER BY submittedAt DESC", [req.user.email], (err, rows) => res.json(rows));
  }
});

app.get('/api/requests/stats', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  db.all("SELECT status, COUNT(*) as count FROM requests GROUP BY status", [], (err, rows) => {
    let stats = { totalRequests: 0, pendingRequests: 0, approvedRequests: 0, rejectedRequests: 0, totalFaculty: 0 };
    rows.forEach(r => {
      stats.totalRequests += r.count;
      if (r.status === 'pending') stats.pendingRequests = r.count;
      if (r.status === 'approved') stats.approvedRequests = r.count;
      if (r.status === 'rejected') stats.rejectedRequests = r.count;
    });
    db.get("SELECT COUNT(*) as count FROM users WHERE role = 'faculty'", (err, row) => {
      stats.totalFaculty = row ? row.count : 0;
      res.json(stats);
    });
  });
});

let isAutoApproveEnabled = true;

app.get('/api/settings/auto-approve', authenticateToken, (req, res) => {
  res.json({ enabled: isAutoApproveEnabled });
});

app.post('/api/settings/auto-approve', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  isAutoApproveEnabled = req.body.enabled;
  res.json({ success: true, enabled: isAutoApproveEnabled });
});

app.post('/api/requests', authenticateToken, async (req, res) => {
  if (req.user.role !== 'faculty') return res.sendStatus(403);
  const { courseTitle, department, description } = req.body;

  let autoStatus = 'pending';
  let autoNotes = 'Awaiting human review.';

  if (API_KEY && isAutoApproveEnabled) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const prompt = `You are an automated curriculum reviewer for FAU. 
      Review this course proposal:
      Title: ${courseTitle}
      Department: ${department}
      Description: ${description}
      
      If the description is highly detailed, clear, and academically sound, reply with exactly "APPROVE".
      If it is too short, vague, or lacks detail, reply with "FLAG:" followed by a short specific reason why an Admin needs to review it manually.`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim();

      if (responseText.toUpperCase().includes("APPROVE")) {
        autoStatus = 'approved';
        autoNotes = '✨ Auto-approved by EduFlow AI Review Agent. Meets all detailed curriculum standards.';
      } else {
        autoStatus = 'pending';
        autoNotes = '🤖 AI Flagged for Admin: ' + responseText.replace('FLAG:', '').trim();
      }
    } catch (e) {
      console.error("Agentic AI Review Failed:", e);
    }
  } else if (!isAutoApproveEnabled) {
    autoStatus = 'pending';
    autoNotes = 'AI Auto-Approval is currently disabled by Admin. Awaiting manual review.';
  }

  db.run(
    `INSERT INTO requests (courseTitle, department, description, status, reviewNotes, faculty, facultyEmail, reviewedAt) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [courseTitle, department, description, autoStatus, autoNotes, req.user.name, req.user.email],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, courseTitle, status: autoStatus, notes: autoNotes });
    }
  );
});

app.put('/api/requests/:id', authenticateToken, (req, res) => {
  const id = req.params.id;
  const { courseTitle, department, description } = req.body;
  db.get('SELECT * FROM requests WHERE id = ?', [id], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Request not found' });
    if (req.user.role === 'faculty') {
      if (row.facultyEmail !== req.user.email) return res.sendStatus(403);
      if (row.status !== 'pending') return res.status(400).json({ error: 'Only pending requests can be edited.' });
    }
    db.run(
      `UPDATE requests SET courseTitle = ?, department = ?, description = ? WHERE id = ?`,
      [courseTitle || row.courseTitle, department || row.department, description || row.description, id],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
      }
    );
  });
});

app.put('/api/requests/:id/status', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const { status, reviewNotes } = req.body;
  const id = req.params.id;
  db.run(
    `UPDATE requests SET status = ?, reviewNotes = ?, reviewedAt = CURRENT_TIMESTAMP WHERE id = ?`,
    [status, reviewNotes, id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.get('/api/courses/approved', authenticateToken, (req, res) => {
  db.all("SELECT id, courseTitle, department, description, faculty FROM requests WHERE status = 'approved' ORDER BY courseTitle ASC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/chat', authenticateToken, async (req, res) => {
  try {
    if (!API_KEY) return res.json({ reply: "AI is not configured on this server." });
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(req.body.message);
    const response = await result.response;
    res.json({ reply: response.text() });
  } catch (error) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ reply: "Sorry, I am having trouble connecting to my AI brain right now." });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
