# 🎙️ MockMate AI — Enterprise AI Mock Interviewer Platform

[![Java](https://img.shields.io/badge/Java-17%2B-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.3.4-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Spring Data JPA](https://img.shields.io/badge/Spring_Data_JPA-Hibernate-59666C?style=for-the-badge&logo=hibernate&logoColor=white)](https://spring.io/projects/spring-data-jpa)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Maven](https://img.shields.io/badge/Maven-3.9-C71A36?style=for-the-badge&logo=apachemaven&logoColor=white)](https://maven.apache.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

An enterprise-ready, full-stack AI Mock Interview Coaching Platform architected with **Java 17**, **Spring Boot 3**, **Spring Data JPA (Hibernate)**, **PostgreSQL/H2 Database**, and a modern **React 19** frontend.

---

## 🏗️ Architecture & Tech Stack

```
MockMateAI (Root - Spring Boot Project)
├── ☕ src/main/java/com/mockmate/ai/
│   ├── controller/      # REST API Controllers (@RestController)
│   ├── entity/          # JPA Entities with Hibernate ORM (@Entity)
│   ├── repository/      # Spring Data JPA Repositories (JpaRepository)
│   ├── service/         # Business Logic, AI orchestration & PDF parsing
│   └── model/           # DTOs and Domain Models
├── ⚙️ src/main/resources/
│   ├── application.properties   # Database & server configuration
│   └── static/                  # API dashboard & documentation
├── 🧪 src/test/java/            # Spring Boot JUnit 5 integration tests
├── ⚛️ frontend/                 # React 19 + Vite + TailwindCSS Voice UI
│   ├── src/                     # React components, state, hooks, services
│   ├── package.json
│   └── vite.config.ts
├── 📦 pom.xml                   # Maven Build Descriptor
└── 🚀 start-all.bat             # 1-Click launcher for full stack
```

### ☕ Backend (Core)
* **Java 17 / OpenJDK**
* **Spring Boot 3.3.4** (`spring-boot-starter-web`, `spring-boot-starter-data-jpa`)
* **Hibernate 6 ORM** with **Spring Data JPA**
* **In-memory H2 Database** (Zero-config local development) & **PostgreSQL** support
* **Apache PDFBox 3.0.3** for server-side PDF resume parsing and text extraction
* **AI Orchestration Services**: Google Gemini 1.5 Flash & Groq LLM integration
* **Jackson Databind** for JSON serialization & DTO transformations

### ⚛️ Frontend
* **React 19** with **Vite** & **TailwindCSS**
* **Web Speech API** for real-time speech recognition and voice synthesis
* **Web Audio API visualizer** with live frequency wave rendering
* Comprehensive hiring scorecard, technical evaluations & dynamic follow-up questioning

---

## 🚀 REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/interview/start` | Initialize interview session & generate custom questions from resume |
| `POST` | `/api/interview/evaluate` | Submit candidate answer; returns AI score, rubric & dynamic follow-up |
| `POST` | `/api/interview/resume/parse` | Parse uploaded PDF resume via Apache PDFBox |
| `POST` | `/api/auth/register` | Register new user with JPA persistence |
| `POST` | `/api/auth/login` | Authenticate user |
| `GET` | `/api/history` | Retrieve candidate practice history & scorecards |
| `GET` | `/h2-console` | Interactive H2 Database management console |

---

## 🛠️ How to Run

### Prerequisites
* **Java 17+** (JDK)
* **Maven 3.8+** (or use bundled Maven)
* **Node.js 18+** (for frontend)

### Option 1: 1-Click Launch (Windows)
Double-click [`start-all.bat`](start-all.bat) in the root directory. It automatically starts both the Spring Boot backend and the React frontend.

### Option 2: Manual Launch

#### 1. Start Java Spring Boot Backend
```bash
# In the root directory
mvn clean spring-boot:run
```
* Backend runs at: `http://localhost:8080`
* H2 Database Console: `http://localhost:8080/h2-console`

#### 2. Start React Frontend
```bash
# In the frontend directory
cd frontend
npm install
npm run dev
```
* Frontend runs at: `http://localhost:5173`

---

## 🗄️ Database & JPA Entities
* **`UserEntity`**: User management, credentials, profile metadata.
* **`ResumeEntity`**: Candidate resumes, extracted skills, experience level, raw parsed text.
* **`InterviewRecordEntity`**: Interview history, category scores, feedback, strengths, and weaknesses.

---

## 👩‍💻 Author
* **Prajakta Gudadhe** — [GitHub Profile](https://github.com/prajakta2905)
