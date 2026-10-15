import React, { useState, useRef } from 'react';
import { Upload, FileText, Sparkles, CheckCircle2, ArrowRight, User, Briefcase, GraduationCap, Cpu, Layers, AlertCircle, RefreshCw, Plus, X } from 'lucide-react';
import { extractTextFromPDF } from '../services/pdfParser';
import { analyzeResumeWithGemini, cleanCandidateName } from '../services/gemini';
import { parseResumeWithJavaBackend, parseResumeTextWithJavaBackend } from '../services/javaBackendService';
import { SAMPLE_RESUMES } from '../data/sampleResumes';

export default function ResumeUpload({ onResumeAnalyzed }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'text' | 'samples'
  const [pastedText, setPastedText] = useState('');
  const [newSkillInput, setNewSkillInput] = useState('');
  const [isEditingSkillsText, setIsEditingSkillsText] = useState(false);
  const fileInputRef = useRef(null);

  const processResumeText = async (text, fileName = 'Uploaded Resume') => {
    if (!text || text.trim().length < 20) {
      setErrorMsg('The resume text appears empty. Please paste your resume text or upload another file.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setProcessingStage('AI Analyzing Resume & Tailoring Questions...');

    try {
      // 1. Primary: Java Spring Boot Backend
      let javaProfile = null;
      try {
        const javaRes = await parseResumeTextWithJavaBackend(text);
        if (javaRes?.success && javaRes.profile) {
          javaProfile = javaRes.profile;
        }
      } catch (beErr) {
        console.warn('Java backend text parse attempt:', beErr);
      }

      const p = javaProfile;
      const allSkills = p?.extractedSkills || [];
      const candidateProjects = (p?.projects && p.projects.length > 0) 
        ? p.projects 
        : (p?.extractedProjects ? p.extractedProjects.map(name => ({ name, techStack: [], description: '' })) : []);

      // If backend AI extracted real name and projects:
      if (p && p.fullName && p.fullName !== 'Candidate' && candidateProjects.length > 0) {
        const formatted = {
          name: p.fullName,
          targetRole: p.targetRole || 'Software Engineer',
          experienceLevel: p.experienceLevel || p.yearsOfExperience || '1-3 years',
          skills: {
            frontend: allSkills.slice(0, 4),
            backend: allSkills.slice(4),
            all: allSkills
          },
          summary: p.summary || `Extracted profile for ${p.fullName}`,
          projects: candidateProjects,
          keyProjects: candidateProjects,
          rawText: text
        };
        setParsedData(formatted);
        setProcessingStage('Profile processed with AI!');
        return;
      }

      // 2. Client-side AI Deep Extraction (Groq / Gemini)
      setProcessingStage('AI Deep Extraction parsing candidate name & projects...');
      const analysis = await analyzeResumeWithGemini(text);
      if (analysis) {
        const finalProjects = (analysis.projects && analysis.projects.length > 0)
          ? analysis.projects
          : candidateProjects;

        const formatted = {
          ...analysis,
          name: analysis.name && analysis.name !== 'Candidate' ? analysis.name : (p?.fullName || 'Candidate'),
          targetRole: analysis.targetRole || p?.targetRole || 'Software Engineer',
          experienceLevel: analysis.experienceLevel || p?.experienceLevel || 'Mid-Level',
          projects: finalProjects,
          keyProjects: finalProjects,
          skills: analysis.skills || { all: allSkills },
          summary: analysis.summary || p?.summary || `Profile for ${analysis.name || 'Candidate'}`,
          rawText: text
        };
        setParsedData(formatted);
        setProcessingStage('Profile extracted successfully by AI!');
        return;
      }

      // 3. Fallback Heuristic Profile
      if (p) {
        const fallbackFormatted = {
          name: p.fullName || 'Candidate',
          targetRole: p.targetRole || 'Software Engineer',
          experienceLevel: p.experienceLevel || '1-3 years',
          skills: {
            frontend: allSkills.slice(0, 4),
            backend: allSkills.slice(4),
            all: allSkills
          },
          summary: p.summary || `Extracted profile for ${p.fullName || 'Candidate'}`,
          projects: candidateProjects,
          keyProjects: candidateProjects,
          rawText: text
        };
        setParsedData(fallbackFormatted);
      }
    } catch (err) {
      console.error('Resume parsing failed:', err);
      setErrorMsg(err.message || 'Failed to analyze resume. Please try a sample resume or paste text.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    setIsProcessing(true);
    setErrorMsg(null);
    setProcessingStage('AI Analyzing Resume & Tailoring Questions...');

    try {
      // 1. Primary: Direct Spring Boot Apache PDFBox + AI extraction
      let javaProfile = null;
      try {
        const javaRes = await parseResumeWithJavaBackend(file);
        if (javaRes?.success && javaRes.profile) {
          javaProfile = javaRes.profile;
        }
      } catch (beErr) {
        console.warn('Java backend PDF parse attempt:', beErr);
      }

      if (javaProfile) {
        const p = javaProfile;
        const allSkills = p.extractedSkills || [];
        const candidateProjects = (p.projects && p.projects.length > 0)
          ? p.projects
          : (p.extractedProjects ? p.extractedProjects.map(name => ({ name, techStack: [], description: '' })) : []);

        // If backend AI extracted real name and projects:
        if (p.fullName && p.fullName !== 'Candidate' && candidateProjects.length > 0) {
          const formatted = {
            name: p.fullName,
            targetRole: p.targetRole || 'Software Engineer',
            experienceLevel: p.experienceLevel || p.yearsOfExperience || '1-3 years',
            skills: {
              frontend: allSkills.slice(0, 4),
              backend: allSkills.slice(4),
              all: allSkills
            },
            summary: p.summary || `Extracted profile for ${p.fullName}`,
            projects: candidateProjects,
            keyProjects: candidateProjects,
            rawText: p.rawResumeText || ''
          };
          setParsedData(formatted);
          setProcessingStage('Profile Analyzed • Ready for AI Question Generation!');
          return;
        }

        // If backend parsed PDF raw text, pass it to AI extraction:
        if (p.rawResumeText && p.rawResumeText.trim().length > 30) {
          await processResumeText(p.rawResumeText, file.name);
          return;
        }
      }

      // 2. Fallback: Client-side PDF extraction + AI analysis
      setProcessingStage('AI Analyzing Resume & Tailoring Questions...');
      const text = await extractTextFromPDF(file);
      await processResumeText(text, file.name);
    } catch (err) {
      console.error('Error reading file:', err);
      setErrorMsg(err.message || 'Could not parse PDF. Try pasting the text directly in the "Paste Text" tab.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const getSkillsList = () => {
    if (!parsedData || !parsedData.skills) return [];
    if (Array.isArray(parsedData.skills)) return parsedData.skills;
    if (typeof parsedData.skills === 'object') {
      const allList = Object.entries(parsedData.skills).flatMap(([_, v]) => (Array.isArray(v) ? v : []));
      if (allList.length > 0) return Array.from(new Set(allList));
    }
    return [];
  };

  const handleRemoveSkill = (skillToRemove) => {
    const current = getSkillsList();
    const updated = current.filter(s => s.toLowerCase() !== skillToRemove.toLowerCase());
    setParsedData({
      ...parsedData,
      skills: { all: updated }
    });
  };

  const handleAddSkill = (skillToAdd) => {
    const trimmed = skillToAdd.trim().replace(/^,+|,+$/g, '');
    if (!trimmed) return;
    const current = getSkillsList();
    const newItems = trimmed.split(',').map(s => s.trim()).filter(Boolean);
    const combined = [...current];
    newItems.forEach(item => {
      if (!combined.some(s => s.toLowerCase() === item.toLowerCase())) {
        combined.push(item);
      }
    });
    setParsedData({
      ...parsedData,
      skills: { all: combined }
    });
    setNewSkillInput('');
  };

  const handleSelectSample = (sample) => {
    setParsedData({ ...sample });
  };

  const handleConfirmAndProceed = () => {
    if (parsedData) {
      onResumeAnalyzed(parsedData);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 space-y-3 sm:space-y-4 animate-in fade-in duration-300">
      {/* Header */}
      {!parsedData ? (
        <div className="text-center space-y-1 sm:space-y-1.5 mb-2 sm:mb-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FCF9EE] text-[#855E15] border border-[#EEDD9E] shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            Step 1 • Resume Analysis
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Personalize Your Experience
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 max-w-xl mx-auto font-medium">
            Upload your resume to tailor the interview to your unique background and tech stack.
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between pb-0.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FCF9EE] text-[#855E15] border border-[#EEDD9E] shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            Step 1 of 4 • Profile Verification
          </div>
          <span className="text-xs text-gray-500 font-medium hidden sm:inline">
            Verify & customize your profile below
          </span>
        </div>
      )}

      {/* Tabs Switcher */}
      {!parsedData && (
        <div className="flex justify-center mb-3">
          <div className="bg-white p-1 rounded-xl border border-[#EAE6DF] flex flex-row inline-flex shadow-2xs gap-0.5">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-4 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                activeTab === 'upload'
                  ? 'bg-[#FCF9EE] text-[#855E15] border border-[#EEDD9E] shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Upload PDF
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`px-4 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                activeTab === 'text'
                  ? 'bg-[#FCF9EE] text-[#855E15] border border-[#EEDD9E] shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Paste Text
            </button>
            <button
              onClick={() => setActiveTab('samples')}
              className={`px-4 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                activeTab === 'samples'
                  ? 'bg-[#FCF9EE] text-[#855E15] border border-[#EEDD9E] shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Sample Profiles
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span className="flex-1">{errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-[11px] font-semibold underline hover:text-red-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Upload Dropzone (Premium Proportioned) */}
      {!parsedData && activeTab === 'upload' && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          className={`relative p-8 sm:p-12 min-h-[260px] sm:min-h-[290px] flex flex-col items-center justify-center border-2 border-dashed rounded-2xl sm:rounded-3xl text-center cursor-pointer transition-all duration-300 ${
            isDragging
              ? 'border-[#D4AF37] bg-[#FCF9EE]/80 scale-[1.01] shadow-xl'
              : 'border-[#EAE6DF] bg-white hover:border-[#D4AF37] hover:bg-[#FCF9EE]/30 shadow-2xs hover:shadow-md'
          } ${isProcessing ? 'pointer-events-none' : ''}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf,.txt,text/plain"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
              e.target.value = '';
            }}
          />

          {isProcessing ? (
            <div className="space-y-5 py-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-white shadow-md border border-[#EEDD9E] flex items-center justify-center">
                <RefreshCw className="w-10 h-10 text-[#D4AF37] animate-spin" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-extrabold text-slate-900">{processingStage}</h3>
                <p className="text-sm text-gray-500 font-medium">Extracting tech stack & preparing personalized interview questions and answers...</p>
              </div>
              <div className="w-64 mx-auto h-2 bg-gray-100 rounded-full overflow-hidden mt-4 shadow-inner">
                <div className="h-full bg-gradient-to-r from-[#D4AF37] to-[#E2B857] animate-pulse w-3/4 rounded-full"></div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="w-20 h-20 mx-auto rounded-[1.5rem] bg-gradient-to-br from-[#FCF9EE] to-white border border-[#EEDD9E] flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
                <Upload className="w-10 h-10 text-[#A87D1B]" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-extrabold text-slate-900">
                  Upload Resume
                </h3>
                <p className="text-sm text-gray-500 font-medium">
                  Drag & drop your PDF or TXT file here
                </p>
              </div>
              <div className="pt-4">
                <span className="inline-flex items-center gap-2 px-8 py-3.5 text-sm font-bold text-white bg-gradient-to-r from-[#D4AF37] to-[#8C6314] rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
                  <FileText className="w-4 h-4 text-white" />
                  Select File
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Paste Text Tab */}
      {!parsedData && activeTab === 'text' && (
        <div className="luxury-card p-4 rounded-3xl space-y-3 bg-white">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">
            Paste Full Resume Text
          </label>
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            rows={6}
            placeholder="Paste your resume contents here (Name, Projects, Skills, Experience)..."
            className="w-full p-3 text-xs font-mono bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none transition-all resize-none"
          />
          <div className="flex justify-end">
            <button
              onClick={() => processResumeText(pastedText, 'Pasted Resume')}
              disabled={isProcessing || pastedText.trim().length < 20}
              className="px-5 py-2 text-xs font-bold text-white rounded-xl gold-gradient-btn flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              {isProcessing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              Analyze Text
            </button>
          </div>
        </div>
      )}

      {/* Sample Resumes Tab */}
      {!parsedData && activeTab === 'samples' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SAMPLE_RESUMES.map((sample) => (
            <div
              key={sample.id}
              onClick={() => handleSelectSample(sample)}
              className="luxury-card p-3.5 rounded-2xl cursor-pointer hover:border-[#D4AF37] hover:shadow-xs transition-all group relative overflow-hidden"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#FCF9EE] border border-[#EEDD9E] flex items-center justify-center overflow-hidden shadow-sm">
                    <img src={sample.image} alt={sample.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-gray-900 group-hover:text-[#A87D1B] transition-colors">
                      {sample.name}
                    </h4>
                    <p className="text-[10px] text-gray-500">{sample.targetRole}</p>
                  </div>
                </div>
                <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                  {sample.experienceLevel}
                </span>
              </div>

              <div className="mt-2 text-[11px] text-gray-600 line-clamp-1">
                {sample.summary}
              </div>

              <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[10px] text-gray-500">
                  {(sample.skills.frontend || Object.values(sample.skills)[0] || []).slice(0, 3).join(', ')}
                </span>
                <span className="text-[11px] font-bold text-[#A87D1B] flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                  Use Profile <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Extracted Profile Preview Card (Premium High-End Dashboard View - Fits on 1 Screen) */}
      {parsedData && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EEDD9E]/70 shadow-lg relative overflow-hidden p-3.5 sm:p-4 lg:p-5 space-y-2.5 sm:space-y-3.5 animate-in fade-in zoom-in-95 duration-200">
          {/* Subtle top gold accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D4AF37] via-[#F3CE6D] to-[#A87D1B]" />

          {/* Status Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2.5 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-2xs shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                    Profile Ready
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Sparkles className="w-3 h-3 text-emerald-500" /> AI Verified
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-gray-500 font-medium">
                  Review and customize your profile before moving to the AI interview setup.
                </p>
              </div>
            </div>

            <button
              onClick={() => setParsedData(null)}
              className="text-xs font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all shadow-2xs cursor-pointer shrink-0"
            >
              <RefreshCw className="w-3 h-3 text-gray-400" /> Upload Different Resume
            </button>
          </div>

          {/* Primary Metadata 3-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-2.5">
            {/* Name */}
            <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-b from-[#FCF9EE]/70 to-[#FCF9EE]/20 border border-[#EEDD9E]/60 space-y-0.5 focus-within:border-[#D4AF37] focus-within:ring-1 focus-within:ring-[#D4AF37]/20 transition-all">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#855E15] flex items-center gap-1">
                <User className="w-3 h-3 text-[#D4AF37]" /> Candidate Name
              </label>
              <input
                type="text"
                value={parsedData.name || ''}
                onChange={(e) => setParsedData({ ...parsedData, name: e.target.value })}
                placeholder="Candidate Name"
                className="w-full text-xs sm:text-sm font-bold text-slate-900 bg-transparent border-0 outline-none p-0 focus:ring-0"
              />
            </div>

            {/* Role */}
            <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-b from-[#FCF9EE]/70 to-[#FCF9EE]/20 border border-[#EEDD9E]/60 space-y-0.5 focus-within:border-[#D4AF37] focus-within:ring-1 focus-within:ring-[#D4AF37]/20 transition-all">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#855E15] flex items-center gap-1">
                <Briefcase className="w-3 h-3 text-[#D4AF37]" /> Target Role
              </label>
              <input
                type="text"
                value={parsedData.targetRole || ''}
                onChange={(e) => setParsedData({ ...parsedData, targetRole: e.target.value })}
                placeholder="Target Role (e.g. Java Developer)"
                className="w-full text-xs sm:text-sm font-bold text-slate-900 bg-transparent border-0 outline-none p-0 focus:ring-0"
              />
            </div>

            {/* Experience */}
            <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-b from-[#FCF9EE]/70 to-[#FCF9EE]/20 border border-[#EEDD9E]/60 space-y-0.5 focus-within:border-[#D4AF37] focus-within:ring-1 focus-within:ring-[#D4AF37]/20 transition-all">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#855E15] flex items-center gap-1">
                <GraduationCap className="w-3 h-3 text-[#D4AF37]" /> Experience Level
              </label>
              <input
                type="text"
                value={parsedData.experienceLevel || ''}
                onChange={(e) => setParsedData({ ...parsedData, experienceLevel: e.target.value })}
                placeholder="e.g. Fresher / Junior or 2-4 Years"
                className="w-full text-xs sm:text-sm font-bold text-slate-900 bg-transparent border-0 outline-none p-0 focus:ring-0"
              />
            </div>
          </div>

          {/* Skills & Main Project Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3">
            {/* Key Tech Skills (7 Cols) */}
            <div className="lg:col-span-7 p-2.5 sm:p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-2 flex flex-col justify-between">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-md bg-amber-100/70 text-[#855E15] flex items-center justify-center">
                    <Cpu className="w-3.5 h-3.5 text-[#A87D1B]" />
                  </div>
                  <div>
                    <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-800">
                      Key Tech Skills
                    </span>
                    <span className="ml-1.5 text-[10px] font-semibold text-gray-500">
                      ({getSkillsList().length} detected)
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditingSkillsText(!isEditingSkillsText)}
                  className="text-[10px] font-semibold text-[#855E15] hover:text-[#583C15] flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100/80 transition-colors cursor-pointer border border-[#EEDD9E]/60"
                >
                  {isEditingSkillsText ? 'View Chips' : 'Edit as Text'}
                </button>
              </div>

              {isEditingSkillsText ? (
                <div className="space-y-1 flex-1">
                  <textarea
                    value={getSkillsList().join(', ')}
                    onChange={(e) => {
                      setParsedData({
                        ...parsedData,
                        skills: { all: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }
                      });
                    }}
                    rows={3}
                    placeholder="Java, Spring Boot, React, PostgreSQL..."
                    className="w-full p-2 text-xs font-mono text-gray-800 bg-white border border-[#EAE6DF] rounded-lg focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none resize-none shadow-2xs leading-normal"
                  />
                  <p className="text-[10px] text-gray-400">Separate skills with commas.</p>
                </div>
              ) : (
                <div className="space-y-2 flex-1 flex flex-col justify-between">
                  {/* Chips Container */}
                  <div className="flex flex-wrap gap-1 max-h-[75px] sm:max-h-[85px] overflow-y-auto pr-1">
                    {getSkillsList().map((skill, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] sm:text-xs font-semibold bg-white text-slate-800 border border-slate-200/90 shadow-2xs hover:border-[#D4AF37] transition-all group"
                      >
                        <span>{skill}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="text-gray-400 hover:text-red-500 rounded-full p-0.5 transition-colors cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {getSkillsList().length === 0 && (
                      <p className="text-xs text-gray-400 italic py-1">No skills added yet.</p>
                    )}
                  </div>

                  {/* Quick Add Skill Input */}
                  <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-200/50">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={newSkillInput}
                        onChange={(e) => setNewSkillInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSkill(newSkillInput);
                          }
                        }}
                        placeholder="Add skill & press Enter"
                        className="w-full px-2.5 py-1 text-xs text-slate-800 bg-white border border-slate-200 rounded-lg focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none shadow-2xs"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddSkill(newSkillInput)}
                      disabled={!newSkillInput.trim()}
                      className="px-2.5 py-1 text-xs font-bold text-[#855E15] bg-amber-50 hover:bg-amber-100 border border-[#EEDD9E] rounded-lg transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Main Project (5 Cols) */}
            <div className="lg:col-span-5 p-2.5 sm:p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-2 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 pb-1.5 border-b border-slate-200/60">
                <div className="w-6 h-6 rounded-md bg-amber-100/70 text-[#855E15] flex items-center justify-center">
                  <Layers className="w-3.5 h-3.5 text-[#A87D1B]" />
                </div>
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-800">
                  Featured Engineering Project
                </span>
              </div>

              <div className="space-y-1.5 flex-1">
                <div>
                  <label className="text-[9px] font-bold text-gray-500 uppercase">Project Title</label>
                  <input
                    type="text"
                    value={parsedData.projects?.[0]?.name || ''}
                    onChange={(e) => {
                      const newProjects = [...(parsedData.projects || [])];
                      if (newProjects.length === 0) newProjects.push({});
                      newProjects[0].name = e.target.value;
                      setParsedData({ ...parsedData, projects: newProjects });
                    }}
                    placeholder="e.g. MockMate AI"
                    className="w-full px-2.5 py-1 text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-lg focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-bold text-gray-500 uppercase">Project Tech Stack</label>
                  <input
                    type="text"
                    value={(parsedData.projects?.[0]?.techStack || []).join(', ')}
                    onChange={(e) => {
                      const newProjects = [...(parsedData.projects || [])];
                      if (newProjects.length === 0) newProjects.push({});
                      newProjects[0].techStack = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                      setParsedData({ ...parsedData, projects: newProjects });
                    }}
                    placeholder="React, Spring Boot, Supabase, Groq"
                    className="w-full px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none shadow-2xs"
                  />
                </div>
              </div>

              <div className="p-1.5 rounded-lg bg-amber-50/70 border border-[#EEDD9E]/60 text-[10px] text-[#855E15] flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-[#D4AF37] shrink-0" />
                <span>Interviewer will probe architectural trade-offs on this project.</span>
              </div>
            </div>
          </div>

          {/* Footer Action Row */}
          <div className="pt-1.5 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-gray-100">
            <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Ready to configure difficulty, focus area, and session duration
            </div>

            <button
              onClick={handleConfirmAndProceed}
              className="w-full sm:w-auto px-7 py-2 text-xs sm:text-sm font-bold text-white rounded-xl gold-gradient-btn flex items-center justify-center gap-1.5 cursor-pointer shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              <span>Setup Interview</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
