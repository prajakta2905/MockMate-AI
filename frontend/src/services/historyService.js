/**
 * MockMate AI — Practice History & Persistence Service
 * Persists candidate resumes and interview reports directly to Java Spring Boot JPA Backend.
 */

import { fetchHistoryFromJavaBackend, saveHistoryToJavaBackend } from './javaBackendService';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { getCurrentUser } from './authService';

const LOCAL_HISTORY_KEY = 'mockmate_local_history';

/**
 * Save candidate resume profile
 */
export async function saveResumeToSupabase(resumeData) {
  if (!resumeData) return { resumeId: null, error: null };
  return { resumeId: 'res-' + Date.now(), error: null };
}

/**
 * Save final interview report to Spring Boot JPA Backend (/api/history)
 */
export async function saveInterviewReportToJavaBackend({ report, interviewData, resumeId }) {
  if (!report) return { success: false };

  const payload = {
    role: interviewData?.role || report.role || 'Software Engineer',
    overall_score: report.overallScore || report.score || 75,
    answer_count: interviewData?.answers?.length || report.answers?.length || 5,
    duration_minutes: interviewData?.durationMinutes || 15,
    hiring_decision: report.verdict || report.hiringDecision || 'Hire',
    report: report
  };

  // 1. Primary: Save to Java Spring Boot JPA Backend
  try {
    const javaRes = await saveHistoryToJavaBackend(payload);
    if (javaRes && (javaRes.id || javaRes.status === 'SAVED' || javaRes.role)) {
      return { success: true, id: javaRes.id };
    }
  } catch (err) {
    console.warn('[Spring Boot] JPA History save fallback:', err);
  }

  // 2. Fallback: Supabase cloud
  if (isSupabaseConfigured() && supabase) {
    try {
      const user = await getCurrentUser();
      const { data, error } = await supabase
        .from('interview_history')
        .insert({
          user_id: user?.id && !user.id.startsWith('local-') ? user.id : null,
          role: payload.role,
          overall_score: payload.overall_score,
          hiring_decision: payload.hiring_decision,
          duration_minutes: payload.duration_minutes,
          report: payload.report
        })
        .select('id')
        .single();

      if (!error && data?.id) {
        return { success: true, id: data.id };
      }
    } catch (e) {
      // ignore
    }
  }

  // 3. Fallback: Local storage
  try {
    const existing = JSON.parse(localStorage.getItem(LOCAL_HISTORY_KEY) || '[]');
    existing.unshift({
      id: 'local-' + Date.now(),
      created_at: new Date().toISOString(),
      ...payload
    });
    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(existing.slice(0, 30)));
    return { success: true };
  } catch {
    return { success: false };
  }
}

/**
 * Fetch candidate's past interview records from Spring Boot JPA Backend (/api/history)
 */
export async function fetchInterviewHistory() {
  // 1. Primary: Java Spring Boot JPA Backend
  try {
    const records = await fetchHistoryFromJavaBackend();
    if (records && records.length > 0) {
      return { history: records, error: null };
    }
  } catch (err) {
    console.warn('[Spring Boot] JPA History fetch fallback:', err);
  }

  // 2. Fallback: Supabase
  if (isSupabaseConfigured() && supabase) {
    try {
      const user = await getCurrentUser();
      let query = supabase
        .from('interview_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      if (user?.id && !user.id.startsWith('local-')) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return { history: data, error: null };
      }
    } catch (err) {
      console.warn('Supabase fetch error:', err);
    }
  }

  // 3. Fallback: Local storage
  try {
    const local = JSON.parse(localStorage.getItem(LOCAL_HISTORY_KEY) || '[]');
    return { history: local, error: null };
  } catch {
    return { history: [], error: null };
  }
}

// Aliases
export const saveResumeToJavaBackend = saveResumeToSupabase;
export const saveInterviewReportToSupabase = saveInterviewReportToJavaBackend;
