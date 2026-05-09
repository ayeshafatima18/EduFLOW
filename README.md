# EduFlow — AI-Powered Learning Platform

**Live Demo:** https://69f81c894985f72fe174d7e9--cozy-dusk-f2dbc9.netlify.app/

A full-stack education management platform built for a university's Online Education (Mock Project). Features AI-powered automated course approval workflows, role-based dashboards, and a personalized Learning Garden with RAG-enabled memory.

---

## Features

- **AI Auto-Approval Agent** — Automatically reviews faculty course proposals using Gemini AI and approves or flags them for admin review
- **Role-Based Dashboards** — Separate views for Admin, Faculty, and Students with contextual AI assistants
- **Learning Garden** — Interactive knowledge graph where students map their learning journey with AI-powered insights
- **RAG Memory** — Students upload notes and content; the AI answers questions using their stored materials
- **Automated Workflows** — Admin can toggle AI auto-approval on/off in real time

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@fau.edu | Admin@123 |
| Faculty | faculty@fau.edu | Faculty@123 |
| Student | student@fau.edu | Student@123 |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vue.js 3, Vite, Pinia, Vue Router |
| Backend | Node.js, Express.js |
| Database | SQLite |
| AI | Google Gemini 2.5 Flash |
| Frontend Hosting | Netlify |
| Backend Hosting | Render |

---

## Architecture

```
Frontend (Netlify)  ──API calls──►  Backend (Render)  ──►  Gemini AI
                                         │
                                       SQLite DB
```

---

## Running Locally

**Backend**
```bash
cd eduflow/backend
npm install
node server.js
```

**Frontend**
```bash
cd eduflow/frontend
npm install
npm run dev
```

Create `eduflow/backend/.env` from `.env.example` and add your Gemini API key.
