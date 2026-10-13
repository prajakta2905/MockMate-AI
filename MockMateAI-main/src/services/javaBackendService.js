/**
 * MockMate AI — Java Spring Boot REST Backend Integration Service
 * Connects the React Frontend to the Java Spring Boot Backend (http://localhost:8080/api)
 * Provides automatic fallback to browser services if the Java backend is not running.
 */

const JAVA_BACKEND_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_JAVA_BACKEND_URL) || 'http://localhost:8080';

let isBackendReachable = null;
let lastCheckTime = 0;

/**
 * Checks if Java Spring Boot Backend is running on port 8080.
 * Caches result for 15 seconds to avoid spamming network requests.
 */
export async function checkJavaBackendStatus() {
  const now = Date.now();
  if (isBackendReachable !== null && now - lastCheckTime < 15000) {
    return isBackendReachable;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${JAVA_BACKEND_URL}/api/status`, {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      isBackendReachable = true;
      lastCheckTime = now;
      return { online: true, ...data };
    }
  } catch (e) {
    // Backend is offline or starting up
  }

  isBackendReachable = false;
  lastCheckTime = now;
  return { online: false };
}

/**
 * Parses resume PDF via Java Spring Boot Apache PDFBox.
 */
export async function parseResumeWithJavaBackend(file) {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`${JAVA_BACKEND_URL}/api/resume/parse`, {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const profile = await res.json();
      return { success: true, profile };
    }
  } catch (err) {
    console.warn('[Java Backend] PDF parsing failed or offline, falling back to client-side PDF.js', err);
  }
  return { success: false };
}

/**
 * Generates tailored interview question pool via Java Spring Boot.
 */
export async function generateQuestionsWithJavaBackend(profile) {
  try {
    const res = await fetch(`${JAVA_BACKEND_URL}/api/interview/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: profile.targetRole || profile.role || 'Software Engineer',
        fullName: profile.fullName || profile.name || 'Candidate',
        skills: profile.extractedSkills || profile.skills || []
      })
    });

    if (res.ok) {
      const pool = await res.json();
      return { success: true, pool };
    }
  } catch (err) {
    console.warn('[Java Backend] Question generation offline, using client-side generator', err);
  }
  return { success: false };
}

/**
 * Evaluates candidate response & generates real-time follow-up question via Java Spring Boot.
 */
export async function evaluateAnswerWithJavaBackend(question, answer, role = 'Software Engineer') {
  try {
    const res = await fetch(`${JAVA_BACKEND_URL}/api/interview/evaluate-answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, answer, role })
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, ...data };
    }
  } catch (err) {
    console.warn('[Java Backend] Answer evaluation offline', err);
  }
  return { success: false };
}

/**
 * Generates comprehensive final evaluation report card via Java Spring Boot.
 */
export async function generateReportWithJavaBackend(answers, role = 'Software Engineer') {
  try {
    const res = await fetch(`${JAVA_BACKEND_URL}/api/interview/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers, role })
    });

    if (res.ok) {
      const report = await res.json();
      return { success: true, report };
    }
  } catch (err) {
    console.warn('[Java Backend] Report generation offline', err);
  }
  return { success: false };
}
