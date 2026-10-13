# MockMate AI — Full Stack AI Mock Interview Platform

[![Live Demo](https://img.shields.io/badge/Demo-Live_on_Render-success.svg)](https://mockmateai-nsfb.onrender.com/)
[![Java](https://img.shields.io/badge/Java-17-orange.svg)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.4-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![Spring Data JPA](https://img.shields.io/badge/JPA-Hibernate-blue.svg)](https://spring.io/projects/spring-data-jpa)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![License](https://img.shields.io/badge/License-MIT-lightgrey.svg)](LICENSE)

> 🌐 **Live Application**: [https://mockmateai-nsfb.onrender.com](https://mockmateai-nsfb.onrender.com)

MockMate AI is an interactive mock interview preparation platform built with **Java 17**, **Spring Boot 3**, **Spring Data JPA (Hibernate)**, and **React 19**.

It allows candidates to upload their PDF resume, parses their skills and experience on the backend, generates tailored technical interview questions, and conducts a voice-driven mock interview with real-time feedback, scoring rubrics, and dynamic follow-up questions.

---

## Why I Built This

Preparing for technical interviews alone usually means practicing on LeetCode or memorizing answers from websites. While that helps with syntax, it doesn't prepare candidates for the actual conversational pressure of a live technical interview:
- Real interviewers don't ask random trivia; they pick projects and technologies straight off your resume.
- They listen to how you structure your answer and ask spontaneous follow-ups when an explanation is incomplete.
- They look for both technical accuracy and clear communication.

I built MockMate AI to simulate this experience end-to-end. The backend handles resume extraction, manages multi-turn interview sessions, integrates with LLMs for real-time evaluation, and persists candidate progress using Spring Data JPA.

---

## Tech Stack & Highlights

### Backend (Core)
- **Java 17**: Modern Java features including Records, pattern matching, and Stream API.
- **Spring Boot 3.3.4**: RESTful API architecture with `@RestController`, `@Service`, and `@Repository` layers.
- **Spring Data JPA & Hibernate 6**: Relational data persistence with derived query methods.
- **H2 In-Memory Database**: Zero-configuration local database with an interactive web console at `/h2-console` (PostgreSQL-compatible for production).
- **Apache PDFBox 3.0**: Server-side binary PDF resume parsing and text normalization without temporary disk writes.
- **Jackson**: Serialization and mapping for complex nested JSON evaluation payloads.

### Frontend
- **React 19** + **Vite**: Clean and fast Single Page Application (SPA).
- **Tailwind CSS**: Modern responsive interface with dark mode styling.
- **Web Speech API**: Browser-native Speech-to-Text (STT) for candidate responses and Text-to-Speech (TTS) for the interviewer voice.
- **Web Audio API**: Live microphone frequency visualizer.

---

## How It Works

1. **Resume Processing**: The candidate uploads their PDF resume. The Spring Boot backend uses Apache PDFBox (`PdfResumeParserService`) to extract raw text, identify key technical skills, and estimate experience level.
2. **Session Initialization**: When the interview starts (`/api/interview/start`), the backend builds an interview plan tailored to the candidate's skills and caches the session state in a thread-safe `InterviewSessionStore`.
3. **Conversational Turn**:
   - The AI interviewer asks a question (spoken aloud via TTS).
   - The candidate speaks their response (transcribed in real-time via STT).
   - The response is sent to `/api/interview/evaluate`.
   - The backend evaluates technical correctness, problem-solving depth, and communication clarity, then generates an adaptive follow-up question.
4. **Scorecard & Persistence**: At the end of the interview, a detailed scorecard (overall score, strengths, areas for improvement) is computed and saved to the database via `InterviewRecordEntity`.

---

## Project Structure

```text
MockMateAI/
├── src/
│   ├── main/
│   │   ├── java/com/mockmate/ai/
│   │   │   ├── MockMateAiApplication.java       # Spring Boot main class
│   │   │   ├── controller/                      # REST API endpoints
│   │   │   │   ├── AuthController.java          # User registration & login
│   │   │   │   ├── HistoryController.java       # Past interview records
│   │   │   │   ├── InterviewApiController.java  # Core interview & resume APIs
│   │   │   │   └── SpaWebController.java        # SPA routing helper
│   │   │   ├── entity/                          # JPA database entities
│   │   │   │   ├── UserEntity.java
│   │   │   │   ├── ResumeEntity.java
│   │   │   │   └── InterviewRecordEntity.java
│   │   │   ├── repository/                      # Spring Data JPA repositories
│   │   │   │   ├── UserRepository.java
│   │   │   │   ├── ResumeRepository.java
│   │   │   │   └── InterviewRecordRepository.java
│   │   │   ├── service/                         # Business logic & integrations
│   │   │   │   ├── InterviewCoachService.java   # Interview flow & evaluation
│   │   │   │   ├── PdfResumeParserService.java  # Apache PDFBox resume parsing
│   │   │   │   ├── GroqService.java             # Low-latency voice LLM client
│   │   │   │   ├── GeminiService.java           # Evaluation & rubric scoring
│   │   │   │   ├── UserService.java
│   │   │   │   ├── HistoryService.java
│   │   │   │   └── InterviewSessionStore.java   # Concurrent session cache
│   │   │   └── model/                           # DTOs and domain objects
│   │   └── resources/
│   │       ├── application.properties           # Server port & JPA configuration
│   │       └── static/                          # Backend status landing page
│   └── test/
│       └── java/com/mockmate/ai/                # Spring Boot test suite
│
├── frontend/                                    # React 19 voice interface
│   ├── src/                                     # Components, state, audio logic
│   ├── package.json
│   └── vite.config.ts
│
├── pom.xml                                      # Maven build configuration
├── Dockerfile                                   # Multi-stage Docker build
├── start-all.bat                                # 1-Click launcher for Windows
├── start-backend.bat                            # Backend startup script
└── start-frontend.bat                           # Frontend startup script
```

---

## Database Schema (JPA Entities)

- **`UserEntity`** (`users` table): Stores candidate accounts (id, email, name, password hash, created_at).
- **`ResumeEntity`** (`resumes` table): Stores parsed resume details linked to a user (candidate_name, experience_level, parsed_skills, raw_text, created_at).
- **`InterviewRecordEntity`** (`interview_records` table): Stores completed interview scorecards (target_role, overall_score, technical_score, communication_score, feedback, strengths, improvements, created_at).

---

## REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/interview/resume/parse` | Upload a PDF resume; returns extracted skills and experience |
| `POST` | `/api/interview/start` | Creates a new session with customized interview questions |
| `POST` | `/api/interview/evaluate` | Evaluates a candidate's answer; returns scores and follow-up question |
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Authenticate an existing user |
| `GET` | `/api/history` | Fetch past interview attempts and performance scorecards |
| `GET` | `/h2-console` | In-memory H2 database web console |

---

## Engineering Decisions & Challenges

1. **Minimizing Voice Latency**:
   - In a conversational interview, a delay of 3–4 seconds feels robotic and unnatural. I integrated Groq (LLaMA 3.3 70B) for generating questions and follow-ups because it achieves under 400ms time-to-first-token, keeping the voice exchange fluid.
2. **Server-Side PDF Parsing with Apache PDFBox**:
   - Resumes vary widely in formatting (tables, multi-column layouts, varying character encodings). Parsing on the server using Apache PDFBox ensures consistent text normalization and skill matching without relying on heavy client-side JavaScript libraries.
3. **Decoupling DTOs from JPA Entities**:
   - External API contracts (`CandidateProfile`, `EvaluationReport`) are intentionally decoupled from internal JPA database models (`ResumeEntity`, `InterviewRecordEntity`). This protects internal database structures from leaking to the frontend and prevents JSON serialization issues.
4. **Fallback Handling for Zero Downtime**:
   - If an external AI endpoint experiences rate limits or network hiccups, the backend automatically falls back to an offline question pool (`QuestionPool.java`), ensuring the candidate's interview session never abruptly crashes.

---

## How to Run Locally

### Prerequisites
- **Java 17+** (JDK)
- **Maven 3.8+**
- **Node.js 18+**

### 1. Clone the repository
```bash
git clone https://github.com/prajakta2905/MockMateAI.git
cd MockMateAI
```

### 2. Start Backend (Spring Boot)
```bash
mvn clean spring-boot:run
```
- API server runs at: `http://localhost:8080`
- H2 Database Console: `http://localhost:8080/h2-console`  
  *(JDBC URL: `jdbc:h2:mem:mockmatedb`, User: `sa`, Password: empty)*

### 3. Start Frontend (React)
In another terminal:
```bash
cd frontend
npm install
npm run dev
```
- Frontend runs at: `http://localhost:5173`

> **Tip for Windows users**: You can double-click [`start-all.bat`](start-all.bat) in the project root to start both backend and frontend together.

---

## Future Improvements
- [ ] Add WebSocket / STOMP support for streaming audio packets.
- [ ] Add JWT-based stateless authentication with Spring Security.
- [ ] Add Docker Compose for containerized PostgreSQL + Spring Boot + React deployment.
- [ ] Add an interactive live coding scratchpad for DSA rounds.

---

## Author

**Prajakta Gudadhe**  
- GitHub: [@prajakta2905](https://github.com/prajakta2905)  
- Email: prajaktagudadhe068@gmail.com
