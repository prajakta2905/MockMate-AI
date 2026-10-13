/**
 * MockMate AI — Supabase Practice History & Persistence Service
 * Saves candidate resumes and interview reports directly to Supabase PostgreSQL cloud database.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { getCurrentUser } from './authService';

const LOCAL_HISTORY_KEY = 'mockmate_local_history';

/**
 * Save candidate resume profile to Supabase Database
 */
export async function saveResumeToSupabase(resumeData) {
  if (!resumeData) return { resumeId: null, error: null };

  const user = await getCurrentUser();

  if (isSupabaseConfigured() && supabase) {
    try {
      const skillsArray = resumeData.skills?.frontend?.concat(resumeData.skills?.backend || []) ||
        (Array.isArray(resumeData.skills) ? resumeData.skills : []);

      const { data, error } = await supabase
        .from('resumes')
        .insert({
          user_id: user?.id && !user.id.startsWith('local-') ? user.id : null,
          full_name: resumeData.name || resumeData.fullName || 'Candidate',
          target_role: resumeData.targetRole || resumeData.role || 'Software Engineer',
          email: resumeData.email || '',
          phone: resumeData.phone || '',
          skills: skillsArray,
          raw_text: resumeData.rawText || ''
        })
        .select('id')
        .single();

      if (!error && data?.id) {
        return { resumeId: data.id, error: null };
      }
      if (error) {
        console.warn('Supabase resume save notice:', error.message);
      }
    } catch (err) {
      console.warn('Supabase resume save exception:', err);
    }
  }

  // Fallback to local identifier
  return { resumeId: 'local-res-' + Date.now(), error: null };
}

/**
 * Save final interview report to Supabase Database
 */
export async function saveInterviewReportToSupabase({ report, interviewData, resumeId }) {
  if (!report) return { success: false };

  const user = await getCurrentUser();
  const validResumeId = resumeId && !resumeId.startsWith('local-') ? resumeId : null;

  const payload = {
    role: interviewData?.role || report.role || 'Software Engineer',
    overall_score: report.overallScore || report.score || 75,
    answer_count: interviewData?.answers?.length || report.answers?.length || 5,
    duration_minutes: interviewData?.durationMinutes || 15,
    hiring_decision: report.verdict || report.hiringDecision || 'Hire',
    report: report
  };

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('interview_history')
        .insert({
          user_id: user?.id && !user.id.startsWith('local-') ? user.id : null,
          resume_id: validResumeId,
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
      if (error) {
        console.warn('Supabase history save notice:', error.message);
      }
    } catch (err) {
      console.warn('Supabase history save exception:', err);
    }
  }

  // Local storage fallback so candidate never loses their report card
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
 * Fetch candidate's past interview records from Supabase Database
 */
export async function fetchInterviewHistory() {
  const user = await getCurrentUser();

  if (isSupabaseConfigured() && supabase) {
    try {
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
      console.warn('Supabase history fetch notice:', err);
    }
  }

  // Local history fallback
  try {
    const local = JSON.parse(localStorage.getItem(LOCAL_HISTORY_KEY) || '[]');
    return { history: local, error: null };
  } catch {
    return { history: [], error: null };
  }
}

// Aliases for compatibility
export const saveResumeToJavaBackend = saveResumeToSupabase;
export const saveInterviewReportToJavaBackend = saveInterviewReportToSupabase;
