<div align="center">
  <img src="https://img.icons8.com/color/96/000000/microphone--v1.png" alt="MockMate AI Logo" width="100"/>
  
  <h1 align="center">MockMate AI</h1>
  
  <p align="center">
    <strong>Autonomous AI Mock Interview Coaching Platform with React 19 Frontend & Java Spring Boot 3 REST Backend.</strong>
  </p>
  
  <p align="center">
    <img src="https://img.shields.io/badge/Frontend-React_19_+_Vite-61DAFB?style=for-the-badge&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/Backend-Java_Spring_Boot_3-6DB33F?style=for-the-badge&logo=springboot" alt="Spring Boot" />
    <img src="https://img.shields.io/badge/PDF_Parser-Apache_PDFBox-D22128?style=for-the-badge&logo=apache" alt="Apache PDFBox" />
    <img src="https://img.shields.io/badge/AI_Engine-Groq_LLaMA_3.3_70B-F55036?style=for-the-badge&logo=lightning" alt="Groq" />
    <img src="https://img.shields.io/badge/AI_Rubrics-Google_Gemini-8E75B2?style=for-the-badge&logo=googlebard" alt="Gemini" />
  </p>
</div>

<hr />

## ✨ Features

- 🎙️ **Real-time Voice Interactions**: Talk directly to the AI interviewer using built-in browser speech recognition and real-time audio visualization.
- 📄 **Server-Side PDF Parsing (Java Apache PDFBox)**: Upload your PDF resume, securely extracted server-side in Java.
- 🤖 **Dynamic AI Coaching (Groq LPU + Google Gemini)**: Experience adaptive follow-up questions, real-time rubric grading, and personalized feedback.
- 📊 **Actionable Analytics**: Track your progress over time with visual charts and detailed history logs stored in the Java backend.
- 🔐 **Spring Boot Authentication**: Seamless signup, login, and session tracking powered by Java Spring Boot REST API.
- 🚀 **Blazing Fast UI**: Built with React 19, styled with Tailwind CSS, and smoothly animated using Framer Motion.

---

## 🛠️ Architecture & Tech Stack

| Layer | Technologies Used | Purpose |
| :--- | :--- | :--- |
| **Frontend UI** | **React 19 + Vite 6** | Dynamic responsive single-page application |
| **Styling & Motion** | **Tailwind CSS + Framer Motion** | Sleek modern design system and fluid micro-animations |
| **Visual Charts** | **Recharts** | Interactive competency and score trend graphs |
| **Backend REST API** | **Java 17 + Spring Boot 3.3.4** | High-performance enterprise REST API backend (`mockmate-java`) |
| **PDF Processing** | **Apache PDFBox 3.0.3** | Server-side secure candidate resume parsing in Java |
| **Ultra-fast AI** | **Groq LPU (LLaMA 3.3 70B)** | Sub-second follow-up question generation and instant critique |
| **AI Assessment** | **Google Gemini 2.0 Flash** | Comprehensive rubric scoring and evaluation reports |

---

## 🚀 Quick Start (Local Setup)

### 1-Click Launch (Recommended)
Simply double-click:
```bash
start-all.bat
```
This automatically starts:
1. **Java Spring Boot Backend** on `http://localhost:8080`
2. **React Frontend** on `http://127.0.0.1:5173`

---

### Manual Launch

#### Step 1: Start Java Backend
```bash
cd mockmate-java
run.bat
# Or: mvn spring-boot:run
```

#### Step 2: Start React Frontend
```bash
cd MockMateAI-main
npm install
npm run dev
```

Open **`http://127.0.0.1:5173/`** in your browser.
