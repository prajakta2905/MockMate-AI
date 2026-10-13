# MockMate AI — Intelligent Autonomous Voice Interview Coach

MockMate AI is an enterprise-grade AI mock interview platform that simulates hyper-realistic technical and behavioral interviews. Powered by real-time voice speech synthesis/recognition, adaptive AI questioning, resume parsing, and a Spring Boot + JPA backend.

---

## 🌟 Key Features

- **Live Voice Interview Rounds**: Real-time microphone listening (Speech-to-Text) and natural voice responses (Text-to-Speech) using the Web Speech API and dynamic audio visualizer.
- **Adaptive AI Questioning**: Real-time follow-up generation using Groq LPU (Qwen/LLaMA) and Google Gemini Flash models.
- **Resume-Driven Customization**: Upload any PDF resume; Apache PDFBox extracts candidate skills, experience, and projects to generate custom question pools.
- **Spring Boot 3 + Spring Data JPA**: Enterprise Java backend with Hibernate ORM, repository patterns, session management, and PostgreSQL database support.
- **Supabase Cloud Persistence**: Cloud PostgreSQL storage for interview history, turn-by-turn transcripts, and JWT-authenticated user profiles.
- **Comprehensive Analytics & Scorecards**: Instant feedback, category scoring (Technical Accuracy, Communication, Problem Solving), and recommendations.

---

## 🏗️ Architecture & Tech Stack

```
                       ┌───────────────────────────────┐
                       │   FRONTEND (React 19 + Vite)  │
                       │   • Tailwind CSS  • Web Speech │
                       │   • Audio Visualizer Canvas   │
                       └──────────────┬────────────────┘
                                      │
              ┌───────────────────────┼────────────────────────┐
              ▼                       ▼                        ▼
    ┌───────────────────┐   ┌───────────────────┐   ┌────────────────────┐
    │  SPRING BOOT API  │   │     AI ENGINES    │   │      SUPABASE      │
    │  (Java 17 / 20)   │   │  • Groq Cloud     │   │  (PostgreSQL DB)   │
    │  • Spring Data JPA│   │  • Google Gemini  │   │  • User Auth (JWT) │
    │  • Apache PDFBox  │   │  • LLaMA / Flash  │   │  • Scorecards/Docs │
    └───────────────────┘   └───────────────────┘   └────────────────────┘
```

### Frontend (`/MockMateAI-main`)
- **React 19** with **Vite 6**
- **Tailwind CSS** for responsive glassmorphism UI
- **Web Speech API** for browser-native STT / TTS
- **Recharts** & **Lucide Icons**
- **Supabase JS Client** (`@supabase/supabase-js`)

### Backend (`/mockmate-java`)
- **Java 17 / 20** with **Spring Boot 3.3.4**
- **Spring Data JPA & Hibernate ORM**
- **PostgreSQL JDBC Driver** & H2 Dev Engine
- **Apache PDFBox 3.0.3** for server-side PDF resume parsing
- **Jackson Databind** for JSON serialization

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+) & npm
- Java JDK 17+
- Maven 3.8+ (or bundled wrapper)

### 1. Frontend Setup
```bash
cd MockMateAI-main
npm install
npm run dev
```
The frontend will start at `http://localhost:5173`.

### 2. Backend Setup
```bash
cd mockmate-java
mvn spring-boot:run
```
The Spring Boot REST API will start at `http://localhost:8080`.

---

## ⚙️ Environment Configuration

Copy `.env.example` to `.env` in `MockMateAI-main` and configure your API keys:
```env
VITE_JAVA_BACKEND_URL=http://localhost:8080
VITE_GROK_API_KEY=your_groq_api_key_here
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

---

## 📄 License
This project is open source and available under the [MIT License](LICENSE).
