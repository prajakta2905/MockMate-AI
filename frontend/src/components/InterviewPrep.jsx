import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  Mic, 
  CheckCircle2, 
  Play, 
  RefreshCw, 
  Cpu, 
  Layers, 
  Users, 
  Lock, 
  ShieldCheck, 
  Volume2, 
  Lightbulb, 
  ArrowRight, 
  UserCheck,
  Bot
} from 'lucide-react';
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

  // Compile full progressive questions list in memory (questions are kept confidential)
  const compiledQuestions = useMemo(() => {
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
          'Core Technical Stack',
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
          'STAR Behavioral',
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
          category: 'Project Architecture',
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

  const interviewerName = setup?.persona?.name || 'Alexander';

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 space-y-2.5 sm:space-y-3.5 animate-in fade-in duration-300">
      {/* Top Header / Progress Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-0.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FCF9EE] text-[#855E15] border border-[#EEDD9E] shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
          Step 3 of 4 • Pre-Interview Readiness & Audio Check
        </div>

        {/* Candidate & Persona Summary Pill */}
        <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-gray-200/90 shadow-2xs text-xs">
          <div className="w-5 h-5 rounded-full bg-amber-100 text-[#855E15] flex items-center justify-center font-bold text-[10px]">
            <Bot className="w-3 h-3" />
          </div>
          <span className="font-bold text-slate-900">{interviewerName}</span>
          <span className="text-gray-300">•</span>
          <span className="text-gray-500 font-medium capitalize">{setup?.type || 'Mixed'} Round ({setup?.durationMinutes || 15}m)</span>
          <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
            Ready
          </span>
          <button
            onClick={onBack}
            className="text-xs font-bold text-[#A87D1B] hover:text-[#8C6314] transition-colors ml-1 cursor-pointer"
          >
            Edit
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EEDD9E]/70 shadow-lg p-8 sm:p-12 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#FCF9EE] border border-[#EEDD9E] flex items-center justify-center shadow-sm">
            <RefreshCw className="w-6 h-6 text-[#D4AF37] animate-spin" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
              Synthesizing Tailored Interview Questions...
            </h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto mt-1 font-medium">
              Calibrating question difficulty to your tech stack, projects, and {interviewerName}'s persona style.
            </p>
          </div>
          <div className="w-56 mx-auto h-2 bg-gray-100 rounded-full overflow-hidden shadow-inner">
            <div className="h-full bg-gradient-to-r from-[#D4AF37] to-[#E2B857] animate-pulse w-3/4 rounded-full"></div>
          </div>
        </div>
      ) : (
        /* Main Luxury Briefing Console Card */
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EEDD9E]/70 shadow-lg relative overflow-hidden p-3.5 sm:p-5 space-y-3 sm:space-y-3.5 animate-in fade-in zoom-in-95 duration-200">
          {/* Top Gold Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D4AF37] via-[#F3CE6D] to-[#A87D1B]" />

          {/* 2-Column Split Console Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
            
            {/* Left Column (7 Cols): Evaluation Blueprint & Sealed Questions */}
            <div className="lg:col-span-7 space-y-2.5 flex flex-col justify-between">
              
              {/* Header with Secret Badge & Refresh */}
              <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-amber-100/70 text-[#855E15] flex items-center justify-center">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#A87D1B]" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Evaluation Blueprint ({compiledQuestions.length} Questions)
                    </span>
                    <span className="ml-2 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                      Sealed & Adaptive
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={fetchQuestions}
                  disabled={loading}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#855E15] hover:text-[#583C15] px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100/80 transition-colors cursor-pointer border border-[#EEDD9E]/60 shadow-2xs"
                  title="Generate a completely new set of questions"
                >
                  <RefreshCw className={`w-3 h-3 text-[#D4AF37] ${loading ? 'animate-spin' : ''}`} />
                  <span>Reshuffle</span>
                </button>
              </div>

              {/* Notice Banner: Why questions are confidential */}
              <div className="p-2 rounded-xl bg-amber-50/70 border border-[#EEDD9E]/60 text-[11px] text-[#855E15] flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                <span>
                  <strong>Confidential Interview Mode:</strong> Exact questions remain sealed to guarantee an authentic, unscripted evaluation.
                </span>
              </div>

              {/* Sealed Questions Sequence List (Exact questions are hidden!) */}
              <div className="space-y-1.5 max-h-[175px] sm:max-h-[190px] overflow-y-auto pr-1">
                {compiledQuestions.map((q, idx) => {
                  const categoryLabel = q.category || (idx === 0 ? 'Introduction' : idx === 1 ? 'Foundations' : idx === 2 ? 'Technical Stack' : idx === 3 ? 'Architecture' : 'Behavioral');
                  
                  const evaluationGoal = q.focus 
                    ? `Focus: ${q.focus}` 
                    : idx === 0 
                      ? 'Career overview, communication clarity & domain expertise' 
                      : idx === 1 
                        ? 'Engineering mindset, systematic planning & best practices' 
                        : idx === 2 
                          ? 'Hands-on technical stack depth & concurrency models' 
                          : idx === 3 
                            ? 'System trade-offs, architecture & blocker resolution' 
                            : 'STAR scenario, leadership, and team collaboration';

                  return (
                    <div 
                      key={q.id || idx} 
                      className="p-2 rounded-xl bg-slate-50/70 border border-slate-200/80 flex items-center justify-between gap-2.5 hover:bg-slate-50 transition-colors shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-white border border-slate-200 text-[10px] font-bold text-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#FCF9EE] text-[#855E15] border border-[#EEDD9E]">
                              {categoryLabel}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium truncate">
                              {evaluationGoal}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Lock className="w-3 h-3 text-amber-500/80 shrink-0" />
                            <span className="text-[10px] font-mono text-slate-400 select-none tracking-wider">
                              [Question sealed • Spoken live by {interviewerName}]
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <ShieldCheck className="w-3 h-3 text-emerald-500" />
                        <span className="hidden sm:inline">Sealed</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column (5 Cols): Audio Health & Interview Tips */}
            <div className="lg:col-span-5 space-y-2.5 flex flex-col justify-between">
              
              {/* Section: Microphone & Speech Health */}
              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
                  <div className="flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-[#A87D1B]" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800">
                      Microphone & Audio Check
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    micStatus === 'ready'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {micStatus === 'ready' ? 'Mic Active' : 'Speech Ready'}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                    <span>Live Input Level:</span>
                    <span className="font-mono text-xs text-amber-700">{Math.round(micVolume)}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 via-[#D4AF37] to-amber-500 transition-all duration-100 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(micVolume * 1.5, 6))}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-gray-400">Speak into your mic to verify dynamic sensitivity.</p>
                </div>
              </div>

              {/* Section: Best Practice Advice */}
              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-2">
                <div className="flex items-center gap-1.5 pb-1 border-b border-slate-200/60">
                  <Lightbulb className="w-3.5 h-3.5 text-[#A87D1B]" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800">
                    FAANG Interview Best Practices
                  </span>
                </div>

                <ul className="space-y-1.5 text-[11px] text-slate-600 font-medium">
                  <li className="flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] mt-1 shrink-0"></span>
                    <span><strong>Structure Before Answering:</strong> Take 2-3 seconds to outline your approach clearly.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] mt-1 shrink-0"></span>
                    <span><strong>Use STAR Method:</strong> Detail Situation, Task, Action & Result on behavioral questions.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] mt-1 shrink-0"></span>
                    <span><strong>Clarify Anytime:</strong> You can ask {interviewerName} to repeat or clarify any probe.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Footer Action Row */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5 border-t border-gray-100">
            <button
              onClick={onBack}
              className="text-xs font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              ← Back to Setup
            </button>

            <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Audio engine warmed up • Room environment calibrated
            </div>

            <button
              onClick={handleBegin}
              className="w-full sm:w-auto px-7 py-2.5 text-xs sm:text-sm font-bold text-white rounded-xl gold-gradient-btn flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Enter Live Interview Room</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
