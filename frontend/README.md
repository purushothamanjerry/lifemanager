# 🗂 Life Manager

A personal life management web application — minimal, dark, and beautifully designed.

## Tech Stack
- **Frontend**: React 18, React Router v6
- **Backend**: Node.js, Express
- **Database**: MongoDB (local)

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local instance)

### 1. Install Dependencies
```bash
chmod +x setup.sh && ./setup.sh
```

### 2. Start MongoDB
```bash
mongod --dbpath /data/db
```

### 3. Start Backend
```bash
cd backend
npm run dev     # http://localhost:5000
```

### 4. Start Frontend
```bash
cd frontend
npm start       # http://localhost:3000
```

---

## Project Structure
```
life-manager/
├── backend/
│   ├── models/
│   │   ├── Person.js
│   │   └── Conversation.js
│   ├── routes/
│   │   ├── people.js
│   │   └── conversations.js
│   ├── uploads/           ← photos stored here
│   ├── server.js
│   └── .env
└── frontend/
    └── src/
        ├── components/
        │   └── layout/
        │       ├── Sidebar.js
        │       └── PageHeader.js
        ├── pages/
        │   ├── Dashboard.js
        │   └── relationships/
        │       ├── Relationships.js   ← Grid view
        │       ├── PersonProfile.js   ← Profile + conversations
        │       └── PersonForm.js      ← Add/edit modal
        ├── utils/api.js
        ├── styles/global.css
        └── App.js
```

## Modules

| Module | Status | Description |
|--------|--------|-------------|
| Dashboard | ✅ | Overview of all sections |
| Relationships | ✅ | Full relationship tracker |
| Notes | 🔜 | Placeholder |
| Memories | 🔜 | Placeholder |
| Plans | 🔜 | Placeholder |
| Finance | 🔜 | Placeholder |
| Health | 🔜 | Placeholder |
| Timeline | 🔜 | Placeholder |

## Relationship Module Features
- Add/edit people with rich profile data
- Relationship type tagging (friend, family, love, colleague)
- Conversation logging with date, place, mood, summary
- Smart reminders when you haven't contacted someone
- Photo gallery per person
- Dark/light mode toggle
