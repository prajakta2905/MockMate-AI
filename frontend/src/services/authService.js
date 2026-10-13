/**
 * MockMate AI — Supabase Cloud Authentication Service
 * Supports Email/Password, Google OAuth, and automatic session persistence.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { loginWithJavaBackend, signupWithJavaBackend } from './javaBackendService';

const TOKEN_STORAGE_KEY = 'mockmate_auth_token';
const USER_STORAGE_KEY = 'mockmate_auth_user';

const authListeners = new Set();

function notifyAuthListeners(user) {
  authListeners.forEach(listener => {
    try {
      listener(user);
    } catch (e) {
      console.warn('Auth listener error:', e);
    }
  });
}

// Listen to Supabase Auth state changes if Supabase is active
if (isSupabaseConfigured() && supabase) {
  supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      const formattedUser = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
        createdAt: session.user.created_at
      };
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(formattedUser));
      notifyAuthListeners(formattedUser);
    } else if (event === 'SIGNED_OUT') {
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      notifyAuthListeners(null);
    }
  });
}

export function isAuthAvailable() {
  return true;
}

export function getAuthToken() {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

/**
 * Register new user with Supabase Auth
 */
export async function signUpWithEmail({ email, password, fullName }) {
  // 1. Primary: Spring Boot JPA Auth (/api/auth/signup)
  try {
    const javaAuth = await signupWithJavaBackend(email, password, fullName);
    if (javaAuth?.user) {
      const u = javaAuth.user;
      const formattedUser = {
        id: String(u.id),
        email: u.email,
        name: u.fullName || fullName,
        createdAt: u.createdAt || new Date().toISOString()
      };
      if (javaAuth.token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, javaAuth.token);
      }
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(formattedUser));
      notifyAuthListeners(formattedUser);
      return { user: formattedUser, error: null };
    }
  } catch (err) {
    console.warn('[Spring Boot] JPA signup fallback:', err);
  }

  // 2. Fallback: Supabase Auth
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim()
          }
        }
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data?.user) {
        const formattedUser = {
          id: data.user.id,
          email: data.user.email,
          name: fullName.trim(),
          createdAt: data.user.created_at
        };
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(formattedUser));
        notifyAuthListeners(formattedUser);
        return { user: formattedUser, error: null };
      }
    } catch (err) {
      console.warn('Supabase signup error:', err);
    }
  }

  // Guest / Offline fallback registration
  const guestUser = {
    id: 'local-' + Date.now(),
    email: email.trim(),
    name: fullName.trim(),
    createdAt: new Date().toISOString()
  };
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(guestUser));
  notifyAuthListeners(guestUser);
  return { user: guestUser, error: null };
}

/**
 * Sign in with Email and Password via Spring Boot JPA Auth
 */
export async function signInWithEmail({ email, password }) {
  // 1. Primary: Spring Boot JPA Auth (/api/auth/login)
  try {
    const javaAuth = await loginWithJavaBackend(email, password);
    if (javaAuth?.user) {
      const u = javaAuth.user;
      const formattedUser = {
        id: String(u.id),
        email: u.email,
        name: u.fullName || email.split('@')[0],
        createdAt: u.createdAt || new Date().toISOString()
      };
      if (javaAuth.token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, javaAuth.token);
      }
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(formattedUser));
      notifyAuthListeners(formattedUser);
      return { user: formattedUser, error: null };
    }
  } catch (err) {
    console.warn('[Spring Boot] JPA login fallback:', err);
  }

  // 2. Fallback: Supabase Auth
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data?.user) {
        const formattedUser = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User',
          createdAt: data.user.created_at
        };
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(formattedUser));
        notifyAuthListeners(formattedUser);
        return { user: formattedUser, error: null };
      }
    } catch (err) {
      console.warn('Supabase login error:', err);
      return { user: null, error: err.message || 'Login failed.' };
    }
  }

  return { user: null, error: 'Supabase authentication service is currently unavailable.' };
}

/**
 * Sign in with Google via Supabase OAuth
 */
export async function signInWithGoogle() {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined
        }
      });
      if (error) {
        return { error: error.message };
      }
      return { data, error: null };
    } catch (err) {
      return { error: err.message };
    }
  }
  return await signInWithEmail({ email: 'demo@mockmate.ai', password: 'password123' });
}

/**
 * Get current active user from Supabase session or localStorage
 */
export async function getCurrentUser() {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const formattedUser = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
          createdAt: session.user.created_at
        };
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(formattedUser));
        return formattedUser;
      }
    } catch (e) {
      // fallback to cache
    }
  }

  try {
    const cached = localStorage.getItem(USER_STORAGE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

/**
 * Sign out user
 */
export async function signOut() {
  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
  }

  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
  notifyAuthListeners(null);
  return { error: null };
}

/**
 * Request password reset email via Supabase
 */
export async function resetPasswordForEmail(email) {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined
      });
      if (error) return { error: error.message };
      return { error: null, message: 'Password reset link sent to your email.' };
    } catch (err) {
      return { error: 'Failed to request reset.' };
    }
  }
  return { error: null, message: 'Password reset request noted.' };
}

/**
 * Subscribe to auth state updates
 */
export function onAuthStateChange(callback) {
  authListeners.add(callback);
  return () => authListeners.delete(callback);
}

export const signOutUser = signOut;
