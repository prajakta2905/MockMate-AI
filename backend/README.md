# MockMate AI — 100% Pure Java Enterprise Edition ☕🚀

> **Enterprise AI Mock Interview Coaching Platform written entirely in Java using Spring Boot 3 & Vaadin 24.**
> No raw frontend frameworks, no HTML, and no client-side JavaScript templates required. Everything is 100% Java from UI layouts to AI orchestration!

---

## 🏗️ Architecture & Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Full-Stack Framework** | **Spring Boot 3.3.4 + Vaadin 24** | 100% Java Web Framework (Component-based UI, routing & event models) |
| **PDF Processing** | **Apache PDFBox 3.0.3** | Server-side secure resume parsing and skill heuristic extraction |
| **Ultra-fast AI Inference** | **Groq LPU (LLaMA 3.3 70B)** | Real-time follow-up generation and rapid answer critiques |
| **Comprehensive AI Coach** | **Google Gemini 2.0 Flash** | Question generation & multi-dimensional evaluation rubric scoring |
| **HTTP & Networking** | **Java 17 `HttpClient`** | Asynchronous, zero-dependency REST clients for AI endpoints |
| **JSON Serialization** | **Jackson `ObjectMapper`** | Fast JSON serialization for LLM payloads and response trees |

---

## 🌟 Key Features

1. **100% Pure Java Architecture**:
   - `HomeView.java`: Responsive landing page with metrics and hero banner.
   - `ResumeUploadView.java`: Drag-and-drop resume upload parsed with Apache PDFBox.
   - `InterviewRoomView.java`: Live question progression, audio dictation via Web Speech API, and instant AI follow-ups.
   - `ReportCardView.java`: Detailed competency scorecards across Technical, Communication, Problem Solving, and Articulation.

2. **Dual AI Engine + Offline Fallback**:
   - Seamlessly uses **GroqCloud** (`gsk_...`) for sub-second responses.
   - Leverages **Google Gemini** for deep analytical reports.
   - Built-in **intelligent offline catalog** ensures your demo **never fails** even if the internet drops or keys are missing!

---

## 🚀 How to Run

### Prerequisites
- **JDK 17+** (Eclipse Temurin, OpenJDK, or Oracle JDK)
- **Apache Maven 3.8+**

### Step 1: Clone or Navigate to the Directory
```bash
cd "d:/GATE/MockMateAI-main (1)/mockmate-java"
```

### Step 2: Build & Run with Maven
```bash
mvn spring-boot:run
```

### Step 3: Open in Browser
Open **`http://localhost:8080`** in your browser.

---

## 📁 Package Structure

```
mockmate-java/
├── pom.xml
├── src/main/java/com/mockmate/ai/
│   ├── MockMateAiApplication.java       # Spring Boot & Vaadin Application Entrypoint
│   ├── model/
│   │   ├── CandidateProfile.java        # Parsed Resume Profile
│   │   ├── InterviewQuestion.java       # Question, Candidate Answer, Score & Feedback
│   │   ├── QuestionPool.java            # Structured Interview Question Set
│   │   ├── InterviewSession.java        # Active Session Progression State
│   │   └── EvaluationReport.java        # Holistic Scorecard & Competency Metrics
│   ├── service/
│   │   ├── PdfResumeParserService.java  # Apache PDFBox Resume Extraction
│   │   ├── GroqService.java             # Java 17 HttpClient for Groq LLaMA 3.3 70B
│   │   ├── GeminiService.java           # Java 17 HttpClient for Google Gemini 2.0
│   │   ├── InterviewCoachService.java   # Dual-Engine AI Coordinator & Scoring Heuristics
│   │   └── InterviewSessionStore.java   # Vaadin Session-Scoped User State
│   └── views/
│       ├── MainLayout.java              # Navbar, Branding & API Keys Settings Dialog
│       ├── HomeView.java                # Hero Banner & Feature Highlights
│       ├── ResumeUploadView.java        # PDF Upload & Candidate Profile View
│       ├── InterviewRoomView.java       # Live AI Interview Room & Speech Input
│       └── ReportCardView.java          # Performance Breakdown & Strengths/Improvements
└── src/main/resources/
    └── application.properties           # Spring Boot & Server Port Configuration
```
