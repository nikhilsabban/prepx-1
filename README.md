# PrepX — AI Placement Preparation Platform

[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Groq AI](https://img.shields.io/badge/Groq-Llama%203%20%2F%20GPT--OSS-F55036?style=for-the-badge&logo=openai&logoColor=white)](https://groq.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS%20v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?style=for-the-badge&logo=vercel&logoColor=white)](https://prepx-one.vercel.app)

> **PrepX** is an end-to-end, AI-powered placement preparation ecosystem designed to help engineering and computer science students crack competitive tech placements. PrepX simulates genuine campus placement rounds—combining real-time conversational AI interviews, live multi-participant WebRTC group discussions, competitive coding environments, and ATS resume scoring into a unified platform.

---

## 🌐 Live Deployment & Links

- **Live Application:** [https://prepx-one.vercel.app](https://prepx-one.vercel.app)
- **GitHub Repository:** [https://github.com/nikhilsabban/prepx-1](https://github.com/nikhilsabban/prepx-1)

---

## 📸 Screenshots & Visual Tour

| **Student Dashboard & Readiness Score** | **AI Mock Technical Interview** |
|:---:|:---:|
| ![Dashboard Placeholder](https://placehold.co/600x350/0f172a/38bdf8?text=PrepX+Student+Dashboard) | ![Interview Placeholder](https://placehold.co/600x350/0f172a/a855f7?text=AI+Mock+Interview+Grounding) |
| *Track XP, daily streaks, readiness index, and activity* | *Voice & text interview grounded in real GitHub repositories* |

| **Live Multi-Peer Group Discussion** | **ATS Resume Reviewer & Keyword Gap Analysis** |
|:---:|:---:|
| ![GD Room Placeholder](https://placehold.co/600x350/0f172a/22c55e?text=WebRTC+Live+GD+Room) | ![Resume Placeholder](https://placehold.co/600x350/0f172a/eab308?text=ATS+Resume+Analysis+%26+Score) |
| *Mesh WebRTC audio/video rooms with AI speech moderator* | *Stream PDF parsing, skill extraction & ATS rubric matching* |

---

## 🚀 Core Features

### 1. 🎙️ AI Technical & HR Mock Interview
- **GitHub Repository Code Grounding:** Scrapes student GitHub repositories or user-provided codebase architectures to generate realistic, role-specific technical questions rather than generic trivia.
- **Real-Time Voice & Speech Interaction:** Voice recognition using browser Web Speech API with audio streaming capabilities and fallback synthesis.
- **Dynamic Follow-Up Questions:** Powered by high-throughput LLMs via Groq Cloud (`openai/gpt-oss-120b`), evaluating technical depth, practical trade-offs, and communication clarity.
- **Granular Post-Interview Analytics:** Generates score breakdowns across clarity, relevance, problem-solving, and accuracy with actionable feedback.

### 2. 👥 Live AI Group Discussion (GD) Rooms
- **Multi-Peer Live Audio & Video:** WebRTC mesh peer-to-peer room architecture supporting up to 5 concurrent participants with mute/unmute and camera toggling.
- **Automated AI Moderator:** Synthesizes voice prompts to welcome participants, present the GD topic, enforce turn-taking etiquette, and summarize discussion turns.
- **Real-Time Speech-to-Text & Transcript Feed:** Broadcasts live speaker transcripts with attribution and chronological reconciliation.
- **Evidence-Based Evaluation Rubric:** Evaluates topic relevance, argument depth, active listening, respectful participation, and teamwork.

### 3. 💻 In-Browser Coding Sandbox & Problem Catalog
- **Monaco Code Editor:** VS Code-grade code editor with syntax highlighting, autocomplete, and theme personalization.
- **Multi-Language Execution:** Supports C++, Java, Python, and JavaScript executed via low-latency cloud compiler APIs (`OnlineCompiler.io`).
- **Comprehensive Problem Catalog:** Filterable catalog (Arrays, Two Pointers, Strings, Dynamic Programming, Trees) with sample test cases, hidden validation cases, and execution feedback.

### 4. 📄 ATS Resume Reviewer & Parsing Engine
- **Robust PDF Stream Extraction:** Decodes compressed FlateDecode streams, glyph mappings, and TJ negative displacement spacing to preserve word boundaries.
- **100+ Skill Dictionary & Section Matcher:** Accurately categorizes skills into Languages, Frameworks, Cloud, Databases, and Developer Tools.
- **ATS Match Score & Gap Detection:** Calculates match scores (0-100) against target job descriptions, flagging missing keywords, bullet point formatting issues, and verb strength.

### 5. 🏆 Gamification, Readiness Score & Analytics
- **Readiness Score Algorithm:** Composite placement readiness metric synthesized across interview scores, coding solve rate, and ATS compatibility.
- **Streak & XP Rewards:** Daily login streaks, completion badges, and global peer leaderboards to encourage consistent daily practice.

### 6. 🔐 Authentication & Enterprise Security
- **Flexible Login Flows:** Google OAuth 2.0 (`@react-oauth/google`), GitHub OAuth, and email/password with bcrypt hashing.
- **Transactional OTP Verification:** Secure email verification and password resets delivered via Nodemailer SMTP.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend Framework** | [React 19](https://react.dev/), [Vite 6](https://vitejs.dev/), [TypeScript 5.7](https://www.typescriptlang.org/) |
| **Styling & UI** | [Tailwind CSS v4](https://tailwindcss.com/), [Radix UI](https://www.radix-ui.com/), [Lucide React](https://lucide.dev/), [Framer Motion](https://www.framer.com/motion) |
| **Code Editor** | [@monaco-editor/react](https://github.com/suren-atoyan/monaco-react) |
| **Backend Runtime** | [Node.js 20.x](https://nodejs.org/), [Express 4.21](https://expressjs.com/), [TypeScript](https://www.typescriptlang.org/) |
| **Bundling & Deployment** | [Esbuild](https://esbuild.github.io/) (Vercel Serverless bundle `api/index.js`), Turborepo monorepo |
| **Database & ODM** | [MongoDB Atlas](https://www.mongodb.com/atlas), [Mongoose 8.10](https://mongoosejs.com/) |
| **AI & LLM Provider** | [Groq SDK](https://groq.com/) (`openai/gpt-oss-120b`, `llama-3.3-70b-versatile`) |
| **Voice & Speech Engine** | Murf AI Speech Engine, Web Speech API |
| **Real-Time & WebRTC** | Native WebRTC (RTCPeerConnection, STUN/TURN), WebSocket (`ws`) |
| **Code Execution Engine** | OnlineCompiler.io Execution API |
| **Email & Storage** | Nodemailer (SMTP), Cloudinary |

---

## 📁 Repository & Architecture Structure

```text
prepx-1/
├── apps/
│   ├── backend/                      # Express + Node.js TypeScript API server
│   │   ├── api/                      # Vercel serverless compiled entrypoint (index.js)
│   │   ├── src/
│   │   │   ├── config/               # Database connection & environment loaders
│   │   │   ├── controllers/          # Business logic (Auth, Interview, GD, Coding, Resume)
│   │   │   ├── middleware/           # JWT auth, CORS, error handling
│   │   │   ├── models/               # Mongoose data schemas (User, Interview, GD, Problem)
│   │   │   ├── routes/               # Express REST route endpoints
│   │   │   ├── services/             # AI (Groq), Murf Speech, WebRTC WS, PDF Parser
│   │   │   └── index.ts              # Server startup & WebSocket server gateway
│   │   ├── .env.example              # Sample backend environment variables
│   │   ├── package.json
│   │   └── vercel.json               # Serverless rewrites & CORS headers
│   │
│   └── frontend/                     # React 19 + Vite + Tailwind CSS SPA
│       ├── public/                   # Static assets, icons, sounds
│       ├── src/
│       │   ├── components/           # Reusable UI widgets, Navbar, Modals
│       │   ├── context/              # Auth, Gamification, and Theme providers
│       │   ├── pages/                # Application routes:
│       │   │   ├── auth/             # Login, Signup, OTP Verification, Password Reset
│       │   │   ├── coding/           # Problem Catalog, Monaco Playground, Submissions
│       │   │   ├── gd/               # Live Room, Participant Grid, Transcript Panel
│       │   │   ├── interview/        # Repo Select, Voice AI Interviewer, Analysis
│       │   │   ├── resume/           # ATS Uploader, Skill Tagging, Score Card
│       │   │   └── Dashboard.tsx     # Student central hub & readiness overview
│       │   ├── lib/                  # Axios HTTP client, utility functions
│       │   └── main.tsx              # React DOM root entrypoint
│       ├── .env.example              # Sample frontend environment variables
│       ├── package.json
│       ├── tailwind.config.js
│       └── vite.config.ts
│
├── packages/                         # Monorepo shared configurations
│   ├── eslint-config/                # Shared ESLint rules
│   ├── typescript-config/            # Base tsconfig files
│   └── ui/                           # Shared UI components
│
├── .gitignore                        # Git exclusion rules (safeguards secrets & builds)
├── package.json                      # Turborepo root workspace definition
├── README.md                         # Project documentation
└── turbo.json                        # Monorepo build pipeline definition
```

---

## ⚙️ Getting Started & Local Development

### 1. Prerequisites
- **Node.js**: `v18.x` or higher (Recommended: `v20.x`)
- **npm** or **bun**: Package manager
- **MongoDB**: Local MongoDB instance or free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster connection string

---

### 2. Clone the Repository
```bash
git clone https://github.com/nikhilsabban/prepx-1.git
cd prepx-1
```

---

### 3. Install Dependencies
Install all workspace dependencies from the root directory:
```bash
npm install
```

---

### 4. Configure Environment Variables

#### Backend Configuration (`apps/backend/.env`)
Create `apps/backend/.env` using `apps/backend/.env.example` as a template:
```env
PORT=3003
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/prepx
JWT_SECRET=your_super_secret_jwt_key

# Groq Cloud LLM
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b

# Email Service (OTP verification & password resets)
SMTP_EMAIL=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# OAuth Providers (Optional for local testing)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Online Compiler (Code execution sandbox)
ONLINE_COMPILER_API_KEY=your_online_compiler_api_key
```

#### Frontend Configuration (`apps/frontend/.env`)
Create `apps/frontend/.env` using `apps/frontend/.env.example` as a template:
```env
VITE_BACKEND_URL=http://localhost:3003
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

---

### 5. Run the Application Locally
Run both backend and frontend concurrently from the root directory:
```bash
npm run dev
```

- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:3003](http://localhost:3003)

To run apps individually:
```bash
# Run backend only
npm run dev:backend

# Run frontend only
npm run dev:frontend
```

---

## 🔌 API & WebSocket Gateway Endpoints

### Authentication & Profile (`/api/v1/auth`)
- `POST /api/v1/auth/signup` — Register with email, password, and profile metadata.
- `POST /api/v1/auth/login` — Authenticate and receive signed JWT.
- `POST /api/v1/auth/google` — Authenticate via Google OAuth token.
- `POST /api/v1/auth/send-otp` — Dispatch verification OTP to user email.
- `POST /api/v1/auth/verify-otp` — Validate 6-digit OTP code.
- `POST /api/v1/auth/reset-password` — Update password using verification token.

### AI Mock Interview (`/api/v1/interview`)
- `POST /api/v1/interview/start` — Initialize session with role, tech stack, and GitHub repo context.
- `POST /api/v1/interview/message` — Submit user response; receive AI follow-up & critique.
- `POST /api/v1/interview/end` — Conclude interview and compute comprehensive evaluation.
- `GET  /api/v1/interview/history` — Fetch user's historical interview sessions.
- `WS   /api/v1/interview/stt-stream` — Real-time audio streaming speech-to-text gateway.

### Live Group Discussion (`/api/v1/gd`)
- `GET  /api/v1/gd/topics` — Discover active and trending GD discussion topics.
- `POST /api/v1/gd/rooms/create` — Create live discussion room.
- `POST /api/v1/gd/rooms/join` — Join room by unique ID.
- `POST /api/v1/gd/rooms/:roomId/evaluations` — Retrieve multi-participant performance reports.
- `WS   /api/v1/gd/ws` — WebSocket gateway for WebRTC signaling and real-time STT transcripts.

### Coding Sandbox (`/api/coding`)
- `GET  /api/coding/problems` — List curated coding problems with difficulty and tags.
- `GET  /api/coding/problems/:slug` — Retrieve problem description, constraints, and starter boilerplate.
- `POST /api/coding/execute` — Run code against sample test cases in cloud runner.
- `POST /api/coding/submit` — Submit solution against full validation test suites.

### ATS Resume Reviewer (`/api/v1/resume`)
- `POST /api/v1/resume/analyze` — Multipart upload of PDF/DOCX resume + target JD.
- `GET  /api/v1/resume/history` — Fetch past resume scans and scoring trajectories.

---

## 🔒 Security & Privacy Best Practices

- **Zero Secret Ingestion:** All sensitive keys (`GROQ_API_KEY`, `JWT_SECRET`, database connection URIs) are managed strictly via environment variables and excluded from Git via `.gitignore`.
- **CORS & COOP:** Configured with `Cross-Origin-Opener-Policy: same-origin-allow-popups` to support seamless Google OAuth popups and prevent cross-site leaks.
- **Fail-Safe Fallbacks:** Robust circuit breakers ensure speech synthesis and code runners gracefully fall back when external services experience transient rate limits.

---

## 📄 License

This project is licensed under the **MIT License**. Feel free to use, modify, and distribute this software in accordance with the license conditions.

---

<p align="center">
  <b>Built with ❤️ for aspiring software engineers preparing for placements.</b><br>
  <sub>Maintained by <a href="https://github.com/nikhilsabban">Nikhil Sabban</a></sub>
</p>
