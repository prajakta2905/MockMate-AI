import React, { useState, useEffect } from 'react';
import { Sparkles, Mic, CheckCircle2, Play, RefreshCw, Cpu, Layers, Users } from 'lucide-react';
import { generateQuestionPoolWithGemini, cleanCandidateName, enforceQuestionWordCount } from '../services/gemini';
import { generateQuestionsWithJavaBackend } from '../services/javaBackendService';
import { speechService } from '../services/speechService';

export default function InterviewPrep({ resume, setup, onReadyToStart, onBack }) {
  const [loading, setLoading] = useState(true);
  const [questionPool, setQuestionPool] = useState(null);
  const [micStatus, setMicStatus] = useState('checking'); // 'checking' | 'ready' | 'denied'
  const [micVolume, setMicVolume] = useState(0);

  const fetchQuestions = async () => {
    try {
      setLoading(true);

      // 1. Primary: AI Question Generator tailored directly to candidate's uploaded resume, skills & projects
      const pool = await generateQuestionPoolWithGemini(
        resume,
        setup.type,
        setup.durationMinutes
      );

      if (pool && (pool.warmupQuestion || pool.skillsQuestions?.length > 0 || pool.technicalQuestions?.length > 0 || pool.foundationalQuestion)) {
        setQuestionPool(pool);
        setLoading(false);
        return;
      }

      // 2. Secondary Fallback: Java Spring Boot REST Endpoint (/api/interview/questions)
      const javaRes = await generateQuestionsWithJavaBackend(resume);
      if (javaRes?.success && javaRes.pool) {
        setQuestionPool(javaRes.pool);
        setLoading(false);
        return;
      }

      // 3. Last-resort fallback to context-aware pool
      setQuestionPool(pool);
      setLoading(false);
    } catch (err) {
      console.error('Error generating question pool:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function checkMic() {
      const ok = await speechService.setupAudioAnalyser((vol) => {
        if (isMounted) setMicVolume(vol);
      });
      if (isMounted) {
        setMicStatus(ok ? 'ready' : 'denied');
      }
    }

    fetchQuestions();
    checkMic();

    return () => {
      isMounted = false;
      speechService.releaseMediaStream();
    };
  }, [resume, setup]);

  const firstName = cleanCandidateName(resume?.name).split(' ')[0] || 'Candidate';
  const targetRole = resume?.targetRole || 'Software Engineer';
  const primaryProject = resume?.projects?.[0]?.name || 'your primary engineering project';

  const normalizeQuestion = (q, fallbackCategory = 'Technical', defaultText = '') => {
    if (!q) return null;
    let text = '';
    if (typeof q === 'string') {
      text = q.trim();
    } else if (typeof q === 'object') {
      text = (q.question || q.questionText || q.text || '').trim();
    }
    if (!text) {
      text = defaultText;
    }
    if (!text) return null;

    // Enforce 15-18 words strictly
    text = enforceQuestionWordCount(text);

    return {
      id: q.id || `q-${Math.random().toString(36).substr(2, 8)}`,
      category: q.category || fallbackCategory,
      question: text,
      questionText: text,
      focus: q.focus || q.contextHint || '',
      difficulty: q.difficulty || 'medium'
    };
  };

  // Compile full progressive questions list
  const compiledQuestions = React.useMemo(() => {
    let allQuestions = [];

    // 1. Warm-up introduction ("Tell me about yourself")
    if (questionPool?.warmupQuestion) {
      const q = normalizeQuestion(
        questionPool.warmupQuestion,
        'Introduction',
        `Could you introduce yourself, your software engineering background, and what you specialize in as an engineer?`
      );
      if (q) allQuestions.push(q);
    }

    // 2. Medium engineering fundamentals & approach
    if (questionPool?.foundationalQuestion) {
      const q = normalizeQuestion(
        questionPool.foundationalQuestion,
        'Engineering Approach',
        `When starting a new project from scratch, what is your standard approach for planning architecture and maintainability?`
      );
      if (q) allQuestions.push(q);
    }

    // 3. Core technical skills & frameworks
    const techPool = (questionPool?.skillsQuestions?.length > 0)
      ? questionPool.skillsQuestions
      : (questionPool?.technicalQuestions || []);
    
    if (Array.isArray(techPool) && techPool.length > 0) {
      techPool.forEach((item) => {
        const q = normalizeQuestion(
          item,
          'Technical',
          `Can you walk me through your technical experience, core stack, and architectural trade-offs in past projects?`
        );
        if (q) allQuestions.push(q);
      });
    }

    // 4. Project deep-dive & blockers
    if (questionPool?.projectQuestions?.length > 0) {
      questionPool.projectQuestions.forEach((item) => {
        const q = normalizeQuestion(
          item,
          'Project Architecture',
          `Looking at your primary engineering project, can you walk me through the end-to-end architecture and key trade-offs?`
        );
        if (q) allQuestions.push(q);
      });
    }

    // 5. Behavioral / STAR scenarios
    if (questionPool?.behavioralQuestions?.length > 0) {
      questionPool.behavioralQuestions.forEach((item) => {
        const q = normalizeQuestion(
          item,
          'Behavioral',
          `Tell me about a challenging technical decision you had to make and how you handled team disagreement.`
        );
        if (q) allQuestions.push(q);
      });
    }

    if (allQuestions.length === 0) {
      const q1 = enforceQuestionWordCount(`Welcome to your interview today! Could you introduce yourself, your engineering background, and your technical skills?`);
      const q2 = enforceQuestionWordCount(`When starting a new project from scratch, what is your standard approach for planning architecture and maintainability?`);
      const q3 = enforceQuestionWordCount(`Looking at your primary engineering project, can you walk me through the end-to-end architecture and key trade-offs?`);
      allQuestions = [
        {
          id: 'q1-warmup',
          category: 'Introduction & Background',
          question: q1,
          questionText: q1,
          focus: 'Career overview, communication clarity, and introduction',
          difficulty: 'warm-up'
        },
        {
          id: 'q2-fundamentals',
          category: 'Engineering Mindset & Approach',
          question: q2,
          questionText: q2,
          focus: 'Systematic problem breakdown, architectural thinking, and best practices',
          difficulty: 'medium'
        },
        {
          id: 'q3-project',
          category: 'Project Deep-Dive',
          question: q3,
          questionText: q3,
          focus: 'Architectural trade-offs, scalability, and system modularity',
          difficulty: 'hard'
        }
      ];
    }

    return allQuestions;
  }, [questionPool, firstName, targetRole, primaryProject]);

  const handleBegin = () => {
    speechService.releaseMediaStream();
    speechService.warmup();

    onReadyToStart({
      questionPool: compiledQuestions
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-in fade-in duration-300">
      {/* Compact Header */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-[#FCF9EE] text-[#855E15] border border-[#EEDD9E]">
          <Sparkles className="w-3 h-3 text-[#D4AF37]" />
          Step 3 • Audio Check & Question Roadmap
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
          Your Personalized Interview Room is Ready
        </h2>
        <p className="text-xs text-gray-600 max-w-md mx-auto">
          Progressive questions tailored for <strong className="text-gray-900">{cleanCandidateName(resume.name)}</strong> ({resume.targetRole}).
        </p>
      </div>

      {loading ? (
        <div className="luxury-card p-6 rounded-3xl space-y-4 text-center">
          <div className="w-10 h-10 mx-auto rounded-full bg-[#FCF9EE] border border-[#EEDD9E] flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-[#D4AF37] animate-spin" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900">Synthesizing Fresh Questions from AI...</h4>
            <p className="text-[10px] text-gray-500">Generating unique, resume-specific probes for your projects & skills</p>
          </div>
          <div className="w-48 mx-auto h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#D4AF37] to-[#E2B857] animate-pulse w-3/4 rounded-full"></div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Header Action Bar with Regenerate Button */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#D4AF37]" />
                Tailored Questions ({compiledQuestions.length})
              </span>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                AI Live Session
              </span>
            </div>
            <button
              type="button"
              onClick={fetchQuestions}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FCF9EE] text-[#855E15] border border-[#EEDD9E] hover:bg-[#F6EFC8] active:scale-95 transition-all cursor-pointer shadow-2xs"
              title="Click to generate completely new questions from AI"
            >
              <RefreshCw className={`w-3 h-3 text-[#D4AF37] ${loading ? 'animate-spin' : ''}`} />
              <span>Regenerate New Questions</span>
            </button>
          </div>

          {/* Progressive Question Sequence Overview (4 cards) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-3 bg-white rounded-2xl border border-[#EAE6DF] shadow-2xs space-y-0.5">
              <span className="text-[9px] uppercase font-bold text-[#A87D1B] block">Phase 1</span>
              <p className="text-xs font-bold text-gray-900">Introduction</p>
              <p className="text-[9px] text-gray-400 truncate">Tell me about yourself</p>
            </div>

            <div className="p-3 bg-white rounded-2xl border border-[#EAE6DF] shadow-2xs space-y-0.5">
              <span className="text-[9px] uppercase font-bold text-blue-600 block">Phase 2</span>
              <p className="text-xs font-bold text-gray-900">Fundamentals</p>
              <p className="text-[9px] text-gray-400 truncate">Core approach & stack</p>
            </div>

            <div className="p-3 bg-white rounded-2xl border border-[#EAE6DF] shadow-2xs space-y-0.5">
              <span className="text-[9px] uppercase font-bold text-emerald-600 block">Phase 3</span>
              <p className="text-xs font-bold text-gray-900">Project Probes</p>
              <p className="text-[9px] text-gray-400 truncate">Architecture & blockers</p>
            </div>

            <div className="p-3 bg-white rounded-2xl border border-[#EAE6DF] shadow-2xs space-y-0.5">
              <span className="text-[9px] uppercase font-bold text-purple-600 block">Phase 4</span>
              <p className="text-xs font-bold text-gray-900">Behavioral</p>
              <p className="text-[9px] text-gray-400 truncate">Team & STAR scenarios</p>
            </div>
          </div>

          {/* Question Roadmap Preview */}
          <div className="luxury-card p-3.5 rounded-2xl bg-white border border-[#EAE6DF] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Prepared Question Flow
              </span>
              <span className="text-[10px] text-gray-400">
                Adapts dynamically based on your spoken answers
              </span>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {compiledQuestions.map((q, idx) => (
                <div key={q.id || idx} className="p-2 rounded-xl bg-gray-50 border border-gray-100 flex items-start gap-2.5 text-left hover:bg-gray-100/70 transition-colors">
                  <span className="w-5 h-5 rounded-full bg-white border border-gray-200 text-[10px] font-bold text-gray-700 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-[#FCF9EE] text-[#855E15] border border-[#EEDD9E]">
                        {q.category || 'Technical'}
                      </span>
                      {q.focus && (
                        <span className="text-[9px] text-gray-400 truncate">
                          • {q.focus}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-800 font-medium line-clamp-2">
                      {q.question}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Audio & Mic Health Check Card (Compact) */}
          <div className="luxury-card p-4 rounded-3xl space-y-2.5 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Microphone & Speech Check
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                micStatus === 'ready'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {micStatus === 'ready' ? 'Microphone Active' : 'Speech Enabled'}
              </span>
            </div>

            <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-2xl border border-gray-200">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                micStatus === 'ready' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}>
                <Mic className="w-4 h-4" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-gray-800">
                  <span>Speak into mic to test volume:</span>
                  <span className="font-mono text-gray-500">{Math.round(micVolume)}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-[#D4AF37] transition-all duration-100"
                    style={{ width: `${Math.min(100, Math.max(micVolume * 1.5, 5))}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={onBack}
              className="text-xs font-semibold text-gray-500 hover:text-gray-900 px-3 py-1.5 cursor-pointer"
            >
              ← Back to Setup
            </button>

            <button
              onClick={handleBegin}
              className="px-7 py-3 text-xs font-bold text-white rounded-xl gold-gradient-btn flex items-center gap-2 cursor-pointer shadow-md hover:shadow-lg transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Enter Live Interview Room</span>
              <span className="font-bold text-sm">→</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
