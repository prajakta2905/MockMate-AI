/**
 * MockMate AI — Java Spring Boot REST Backend Integration Service
 * Connects the React Frontend to the Java Spring Boot Backend (http://localhost:8080/api)
 * Provides automatic fallback to browser services if the Java backend is not running.
 */

export const JAVA_BACKEND_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_JAVA_BACKEND_URL) || 
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' ? '' : 'http://localhost:8080');

let isBackendReachable = null;
let lastCheckTime = 0;

/**
 * Checks if Java Spring Boot Backend is running.
 */
export async function checkJavaBackendStatus() {
  const now = Date.now();
  if (isBackendReachable !== null && now - lastCheckTime < 15000) {
    return isBackendReachable;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
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
    // Backend offline or spinning up
  }

  isBackendReachable = false;
  lastCheckTime = now;
  return { online: false };
}

/**
 * Parses resume PDF via Java Spring Boot Apache PDFBox + Persists to Spring Data JPA.
 */
export async function parseResumeWithJavaBackend(file) {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

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
    console.warn('[Java Backend] PDF parsing failed or offline', err);
  }
  return { success: false };
}

/**
 * Parses raw resume text via Java Spring Boot + Persists to Spring Data JPA.
 */
export async function parseResumeTextWithJavaBackend(rawText) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(`${JAVA_BACKEND_URL}/api/resume/parse-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const profile = await res.json();
      return { success: true, profile };
    }
  } catch (err) {
    console.warn('[Java Backend] Text resume parsing failed', err);
  }
  return { success: false };
}

/**
 * Generates tailored interview question pool via Java Spring Boot.
 */
export async function generateQuestionsWithJavaBackend(profile) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(`${JAVA_BACKEND_URL}/api/interview/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: profile.targetRole || profile.role || 'Software Engineer',
        fullName: profile.fullName || profile.name || 'Candidate',
        skills: profile.extractedSkills || profile.skills || []
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const pool = await res.json();
      return { success: true, pool };
    }
  } catch (err) {
    console.warn('[Java Backend] Question generation offline', err);
  }
  return { success: false };
}

/**
 * Evaluates candidate response & generates real-time follow-up question via Java Spring Boot.
 */
export async function evaluateAnswerWithJavaBackend(question, answer, role = 'Software Engineer') {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(`${JAVA_BACKEND_URL}/api/interview/evaluate-answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, answer, role }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

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
 * Generates comprehensive final evaluation report card via Java Spring Boot + Persists to JPA.
 */
export async function generateReportWithJavaBackend(answers, role = 'Software Engineer') {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(`${JAVA_BACKEND_URL}/api/interview/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers, role }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const report = await res.json();
      return { success: true, report };
    }
  } catch (err) {
    console.warn('[Java Backend] Report generation offline', err);
  }
  return { success: false };
}

/**
 * User authentication via Spring Boot JPA
 */
export async function loginWithJavaBackend(email, password) {
  try {
    const res = await fetch(`${JAVA_BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[Java Backend] Auth login error', err);
  }
  return null;
}

export async function signupWithJavaBackend(email, password, fullName) {
  try {
    const res = await fetch(`${JAVA_BACKEND_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, fullName })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[Java Backend] Auth signup error', err);
  }
  return null;
}

/**
 * History records from Spring Data JPA
 */
export async function fetchHistoryFromJavaBackend() {
  try {
    const res = await fetch(`${JAVA_BACKEND_URL}/api/history`, {
      method: 'GET'
    });
    if (res.ok) {
      const data = await res.json();
      return data?.history || [];
    }
  } catch (err) {
    console.warn('[Java Backend] History fetch error', err);
  }
  return [];
}

export async function saveHistoryToJavaBackend(historyData) {
  try {
    const res = await fetch(`${JAVA_BACKEND_URL}/api/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(historyData)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[Java Backend] History save error', err);
  }
  return null;
}

/**
 * Checks AI configuration status on Java Spring Boot backend
 */
export async function checkAiProxyStatus() {
  try {
    const res = await fetch(`${JAVA_BACKEND_URL}/api/ai/status`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    // backend offline or unreachable
  }
  return { groqConfigured: false, geminiConfigured: false };
}

/**
 * Proxy Groq AI call through Spring Boot backend (protects API keys server-side)
 */
export async function callGroqViaBackend({ prompt, systemInstruction = '', model = 'qwen/qwen3.8-27b', temperature = 0.85, jsonMode = true, apiKey = null }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch(`${JAVA_BACKEND_URL}/api/ai/groq`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, systemInstruction, model, temperature, jsonMode, apiKey }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Backend Groq Error: HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Proxy Gemini AI call through Spring Boot backend (protects API keys server-side)
 */
export async function callGeminiViaBackend({ prompt, systemInstruction = '', model = 'gemini-2.5-flash', temperature = 0.85, jsonMode = true, apiKey = null }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch(`${JAVA_BACKEND_URL}/api/ai/gemini`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, systemInstruction, model, temperature, jsonMode, apiKey }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Backend Gemini Error: HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

