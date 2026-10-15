import React, { useState } from 'react';
import { 
  Sparkles, 
  Clock, 
  Mic, 
  Code2, 
  Users, 
  Shuffle, 
  ArrowRight, 
  UserCheck, 
  CheckCircle2, 
  Volume2, 
  Bot, 
  Briefcase, 
  Award, 
  Compass, 
  ShieldCheck,
  MessageSquare
} from 'lucide-react';
import { cleanCandidateName } from '../services/gemini';
import { speechService } from '../services/speechService';

export default function InterviewSetup({ resume, onSetupComplete, onBack }) {
  const [interviewType, setInterviewType] = useState('mixed'); // 'technical' | 'behavioral' | 'mixed'
  const [duration, setDuration] = useState(15); // 15 | 30 | 45
  const [interviewerPersona, setInterviewerPersona] = useState('alex'); // 'alex' | 'sophia' | 'marcus' | 'dave'
  const [voiceMode, setVoiceMode] = useState('voice-to-voice'); // 'voice-to-voice' | 'voice-to-text' | 'text-to-voice'

  const personas = [
    {
      id: 'alex',
      name: 'Alexander',
      role: 'Principal Systems Architect',
      shortRole: 'Principal Architect',
      title: 'Principal Systems Architect',
      style: 'Rigorous & Technical',
      description: 'System trade-offs, architecture, and code clarity.',
      avatarBg: 'from-amber-500/20 to-amber-600/30 text-amber-700 border-amber-300/60'
    },
    {
      id: 'sophia',
      name: 'Sophia',
      role: 'VP of Engineering',
      shortRole: 'VP of Engineering',
      title: 'VP of Engineering & Tech Lead',
      style: 'Strategic & Conversational',
      description: 'Balances deep technical probes with product vision.',
      avatarBg: 'from-purple-500/20 to-purple-600/30 text-purple-700 border-purple-300/60'
    },
    {
      id: 'marcus',
      name: 'Elena',
      role: 'Head of Talent & HR',
      shortRole: 'Head of Talent',
      title: 'Head of Talent & Engineering HR',
      style: 'STAR Stories & Culture',
      description: 'Problem-solving mindset, STAR stories, and collaboration.',
      avatarBg: 'from-emerald-500/20 to-emerald-600/30 text-emerald-700 border-emerald-300/60'
    },
    {
      id: 'dave',
      name: 'Dave',
      role: 'Interview Coach',
      shortRole: 'Interview Coach',
      title: 'Supportive Interview Coach',
      style: 'Supportive & Mentoring',
      description: 'Gentle hints, guidance, and actionable tips.',
      avatarBg: 'from-blue-500/20 to-blue-600/30 text-blue-700 border-blue-300/60'
    }
  ];

  const handleStart = () => {
    speechService.warmup(); // Synchronous warmup for audio engines
    const selectedPersona = personas.find(p => p.id === interviewerPersona) || personas[0];
    onSetupComplete({
      type: interviewType,
      durationMinutes: duration,
      persona: selectedPersona,
      voiceMode
    });
  };

  const selectedPersona = personas.find(p => p.id === interviewerPersona) || personas[0];

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 space-y-2.5 sm:space-y-3.5 animate-in fade-in duration-300">
      {/* Top Header / Progress Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-0.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FCF9EE] text-[#855E15] border border-[#EEDD9E] shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
          Step 2 of 4 • Interview Configuration
        </div>

        {/* Candidate Badge */}
        <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-gray-200/90 shadow-2xs text-xs">
          <div className="w-5 h-5 rounded-full bg-amber-100 text-[#855E15] flex items-center justify-center font-bold text-[10px]">
            <UserCheck className="w-3 h-3" />
          </div>
          <span className="font-bold text-slate-900">{cleanCandidateName(resume?.name || 'Candidate')}</span>
          <span className="text-gray-300">•</span>
          <span className="text-gray-500 font-medium">{resume?.targetRole || 'Software Engineer'}</span>
          <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
            Verified
          </span>
          <button
            onClick={onBack}
            className="text-xs font-bold text-[#A87D1B] hover:text-[#8C6314] transition-colors ml-1 cursor-pointer"
          >
            Change
          </button>
        </div>
      </div>

      {/* Main Luxury Console Card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EEDD9E]/70 shadow-lg relative overflow-hidden p-3.5 sm:p-5 space-y-3 sm:space-y-3.5 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Gold Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D4AF37] via-[#F3CE6D] to-[#A87D1B]" />

        {/* 2-Column Split Console Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
          
          {/* Left Column (5 Cols): Interview Type & Duration */}
          <div className="lg:col-span-5 space-y-3 sm:space-y-3.5 flex flex-col justify-between">
            
            {/* Section 1: Interview Type */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 pb-1 border-b border-gray-100">
                <div className="w-5 h-5 rounded-md bg-amber-100/70 text-[#855E15] flex items-center justify-center">
                  <Shuffle className="w-3 h-3 text-[#A87D1B]" />
                </div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-800">
                  1. Interview Focus
                </label>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'mixed', title: 'Mixed', subtitle: 'Tech + Behav', desc: 'Full 360° Assessment', icon: Shuffle },
                  { id: 'technical', title: 'Technical', subtitle: 'Arch & Stack', desc: 'Deep Code & Systems', icon: Code2 },
                  { id: 'behavioral', title: 'Behavioral', subtitle: 'STAR & Fit', desc: 'Culture & Situational', icon: Users }
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = interviewType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setInterviewType(item.id)}
                      className={`relative p-2 sm:p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[76px] ${
                        isSelected
                          ? 'bg-gradient-to-b from-[#FCF9EE] to-white border-[#D4AF37] shadow-sm ring-1 ring-[#D4AF37]/50'
                          : 'bg-slate-50/60 border-slate-200/80 hover:bg-white hover:border-[#D4AF37]/50 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-[#A87D1B]' : 'text-gray-400'}`} />
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37]" />}
                      </div>
                      <div className="mt-1">
                        <p className={`font-bold text-xs leading-tight ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                          {item.title}
                        </p>
                        <p className={`text-[10px] mt-0.5 leading-tight ${isSelected ? 'text-[#855E15] font-semibold' : 'text-gray-500'}`}>
                          {item.subtitle}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Target Duration */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 pb-1 border-b border-gray-100">
                <div className="w-5 h-5 rounded-md bg-amber-100/70 text-[#855E15] flex items-center justify-center">
                  <Clock className="w-3 h-3 text-[#A87D1B]" />
                </div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-800">
                  2. Session Length
                </label>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { mins: 15, label: '15 Min', desc: 'Screening', qCount: '~4-5 Questions' },
                  { mins: 30, label: '30 Min', desc: 'Standard', qCount: '~8-10 Questions' },
                  { mins: 45, label: '45 Min', desc: 'Full Mock', qCount: '~12-15 Questions' }
                ].map((item) => {
                  const isSelected = duration === item.mins;
                  return (
                    <button
                      key={item.mins}
                      type="button"
                      onClick={() => setDuration(item.mins)}
                      className={`relative p-2 sm:p-2.5 rounded-xl border text-center transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[66px] ${
                        isSelected
                          ? 'bg-gradient-to-b from-[#FCF9EE] to-white border-[#D4AF37] shadow-sm ring-1 ring-[#D4AF37]/50'
                          : 'bg-slate-50/60 border-slate-200/80 hover:bg-white hover:border-[#D4AF37]/50 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-[10px] font-semibold ${isSelected ? 'text-[#855E15]' : 'text-gray-400'}`}>
                          {item.desc}
                        </span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37]" />}
                      </div>
                      <div>
                        <p className={`text-sm font-extrabold leading-tight ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                          {item.label}
                        </p>
                        <p className={`text-[9px] mt-0.5 ${isSelected ? 'text-[#A87D1B] font-semibold' : 'text-gray-400'}`}>
                          {item.qCount}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Context Prompt Tip */}
            <div className="p-2 rounded-xl bg-amber-50/70 border border-[#EEDD9E]/60 text-[11px] text-[#855E15] flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
              <span>Questions will be tailored to your tech stack & projects.</span>
            </div>
          </div>

          {/* Right Column (7 Cols): Interviewer Persona & Interaction Mode */}
          <div className="lg:col-span-7 space-y-3 sm:space-y-3.5 flex flex-col justify-between">
            
            {/* Section 3: Interviewer Persona */}
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-md bg-amber-100/70 text-[#855E15] flex items-center justify-center">
                    <Bot className="w-3 h-3 text-[#A87D1B]" />
                  </div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-800">
                    3. AI Interviewer Persona
                  </label>
                </div>
                <span className="text-[10px] font-medium text-gray-400">
                  Select personality & probe style
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {personas.map((p) => {
                  const isSelected = interviewerPersona === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setInterviewerPersona(p.id)}
                      className={`relative p-2 sm:p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[72px] ${
                        isSelected
                          ? 'bg-gradient-to-b from-[#FCF9EE] to-white border-[#D4AF37] shadow-sm ring-1 ring-[#D4AF37]/50'
                          : 'bg-slate-50/60 border-slate-200/80 hover:bg-white hover:border-[#D4AF37]/50 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-5 h-5 rounded-md border flex items-center justify-center text-[10px] font-bold bg-gradient-to-br ${p.avatarBg}`}>
                            {p.name[0]}
                          </span>
                          <span className={`font-bold text-xs leading-tight ${isSelected ? 'text-slate-900' : 'text-slate-800'}`}>
                            {p.name}
                          </span>
                        </div>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />}
                      </div>

                      <div className="mt-1">
                        <p className={`text-[10px] font-semibold leading-tight ${isSelected ? 'text-[#855E15]' : 'text-gray-500'}`}>
                          {p.shortRole}
                        </p>
                        <p className={`text-[9px] mt-0.5 truncate ${isSelected ? 'text-slate-600' : 'text-gray-400'}`}>
                          {p.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 4: Interaction Mode */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 pb-1 border-b border-gray-100">
                <div className="w-5 h-5 rounded-md bg-amber-100/70 text-[#855E15] flex items-center justify-center">
                  <Mic className="w-3 h-3 text-[#A87D1B]" />
                </div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-800">
                  4. Audio & Interaction Mode
                </label>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'voice-to-voice', title: 'Voice ↔ Voice', desc: 'Realtime Speech', badge: 'Recommended', icon: Volume2 },
                  { id: 'voice-to-text', title: 'Voice → Text', desc: 'Live Transcript', badge: 'Standard', icon: MessageSquare },
                  { id: 'text-to-voice', title: 'Text → Voice', desc: 'Type & Listen', badge: 'Quiet Mode', icon: Mic }
                ].map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = voiceMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setVoiceMode(mode.id)}
                      className={`relative p-2 sm:p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[66px] ${
                        isSelected
                          ? 'bg-gradient-to-b from-[#FCF9EE] to-white border-[#D4AF37] shadow-sm ring-1 ring-[#D4AF37]/50'
                          : 'bg-slate-50/60 border-slate-200/80 hover:bg-white hover:border-[#D4AF37]/50 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#A87D1B]' : 'text-gray-400'}`} />
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37]" />}
                      </div>
                      <div className="mt-1">
                        <p className={`font-bold text-xs leading-tight ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                          {mode.title}
                        </p>
                        <p className={`text-[10px] mt-0.5 leading-tight ${isSelected ? 'text-[#855E15] font-semibold' : 'text-gray-500'}`}>
                          {mode.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Status / Mode Info */}
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/70 text-[11px] text-gray-500 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Active Persona: <strong className="text-slate-800">{selectedPersona.name}</strong> ({selectedPersona.style})</span>
              </span>
              <span className="text-[10px] text-[#855E15] font-semibold bg-amber-50 px-2 py-0.5 rounded-md border border-[#EEDD9E]/60">
                {duration} Min Round
              </span>
            </div>
          </div>
        </div>

        {/* Footer Action Row */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5 border-t border-gray-100">
          <button
            onClick={onBack}
            className="text-xs font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            ← Back to Profile
          </button>

          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Ready to initialize tailored questions and audio environment
          </div>

          <button
            onClick={handleStart}
            className="w-full sm:w-auto px-7 py-2.5 text-xs sm:text-sm font-bold text-white rounded-xl gold-gradient-btn flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            <span>Initialize Interview Environment</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
