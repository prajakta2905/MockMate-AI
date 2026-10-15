import React, { useState, useEffect, lazy, Suspense } from 'react';
import Navbar from './components/Navbar';
import HeroLanding from './components/HeroLanding';

// Code-split heavy interactive stages to drastically reduce initial bundle size
const ResumeUpload = lazy(() => import('./components/ResumeUpload'));
const InterviewSetup = lazy(() => import('./components/InterviewSetup'));
const InterviewPrep = lazy(() => import('./components/InterviewPrep'));
const InterviewScreen = lazy(() => import('./components/InterviewScreen'));
const ProcessingScreen = lazy(() => import('./components/ProcessingScreen'));
const InterviewReport = lazy(() => import('./components/InterviewReport'));
const AuthModal = lazy(() => import('./components/AuthModal'));

import { saveResumeToJavaBackend as saveResumeToSupabase, saveInterviewReportToJavaBackend as saveInterviewReportToSupabase } from './services/historyService';
import { getCurrentUser, onAuthStateChange } from './services/authService';

function ScreenLoadingFallback() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] gap-3 animate-in fade-in duration-200">
      <div className="w-9 h-9 rounded-full border-3 border-[#EEDD9E] border-t-[#D4AF37] animate-spin"></div>
      <p className="text-xs font-semibold text-gray-500">Preparing interview module...</p>
    </div>
  );
}

export default function App() {
  const [currentStep, setCurrentStep] = useState('home'); // 'home' | 'upload' | 'setup' | 'prep' | 'interview' | 'processing' | 'report'

  // Stored state throughout session
  const [resumeData, setResumeData] = useState(null);
  const [interviewSetup, setInterviewSetup] = useState(null);
  const [questionPoolData, setQuestionPoolData] = useState([]);
  const [interviewResultData, setInterviewResultData] = useState(null);
  const [finalReport, setFinalReport] = useState(null);

  // Supabase tracking IDs & Auth state
  const [currentResumeId, setCurrentResumeId] = useState(null);
  const [isSupabaseSynced, setIsSupabaseSynced] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState('login'); // 'login' | 'signup'

  useEffect(() => {
    getCurrentUser().then((u) => setCurrentUser(u));
    const unsub = onAuthStateChange((u) => setCurrentUser(u));
    return () => unsub();
  }, []);

  const handleOpenAuth = (mode = 'login') => {
    setAuthInitialMode(mode);
    setIsAuthOpen(true);
  };

  const handleAuthSuccess = async (user) => {
    setCurrentUser(user);
    if (finalReport && interviewResultData) {
      try {
        const { success } = await saveInterviewReportToSupabase({
          report: finalReport,
          interviewData: interviewResultData,
          resumeId: currentResumeId
        });
        if (success) {
          setIsSupabaseSynced(true);
        }
      } catch (e) {
        console.warn('Supabase post-auth persistence error:', e);
      }
    }
  };


  // Handlers
  const handleStartUpload = () => {
    setCurrentStep('upload');
  };

  const handleQuickStartSample = async (sampleResume) => {
    setResumeData(sampleResume);
    setCurrentStep('setup');
    const { resumeId } = await saveResumeToSupabase(sampleResume);
    if (resumeId) setCurrentResumeId(resumeId);
  };

  const handleResumeAnalyzed = async (parsedProfile) => {
    setResumeData(parsedProfile);
    setCurrentStep('setup');
    const { resumeId } = await saveResumeToSupabase(parsedProfile);
    if (resumeId) setCurrentResumeId(resumeId);
  };

  const handleSetupComplete = (config) => {
    setInterviewSetup(config);
    setCurrentStep('prep');
  };

  const handleReadyToStart = ({ questionPool }) => {
    setQuestionPoolData(questionPool);
    setCurrentStep('interview');
  };

  const handleInterviewFinished = (data) => {
    setInterviewResultData(data);
    setCurrentStep('processing');
  };

  const handleReportReady = async (report) => {
    setFinalReport(report);
    setCurrentStep('report');

    // Save final report + full transcript + session info in Supabase
    try {
      if (interviewResultData) {
        const { success } = await saveInterviewReportToSupabase({
          report,
          interviewData: interviewResultData,
          resumeId: currentResumeId
        });
        if (success) {
          setIsSupabaseSynced(true);
        }
      }
    } catch (e) {
      console.warn('Supabase background persistence notice:', e);
    }
  };

  const handleReset = () => {
    setResumeData(null);
    setInterviewSetup(null);
    setQuestionPoolData([]);
    setInterviewResultData(null);
    setFinalReport(null);
    setCurrentResumeId(null);
    setIsSupabaseSynced(false);
    setCurrentStep('home');
  };

  return (
    <div className="h-[100dvh] bg-[#FAFAF7] text-[#1E2229] flex flex-col justify-between font-sans selection:bg-[#EEDD9E] selection:text-[#583C15] overflow-hidden">
      {/* Top Navbar */}
      <Navbar
        onReset={handleReset}
        currentStep={currentStep}
        currentUser={currentUser}
        onOpenAuth={handleOpenAuth}
      />

      {/* Main Content Area */}
      <main className={`flex-1 w-full overflow-y-auto overflow-x-hidden no-scrollbar ${currentStep === 'home'
        ? 'px-3 sm:px-6 lg:px-8'
        : 'max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-1 sm:py-2 flex flex-col justify-center'
        }`}>
        {currentStep === 'home' && (
          <HeroLanding
            onStartUpload={handleStartUpload}
            onQuickStartSample={handleQuickStartSample}
            onOpenAuth={handleOpenAuth}
            currentUser={currentUser}
          />
        )}

        <Suspense fallback={<ScreenLoadingFallback />}>
          {currentStep === 'upload' && (
            <ResumeUpload
              onResumeAnalyzed={handleResumeAnalyzed}
            />
          )}

          {currentStep === 'setup' && resumeData && (
            <InterviewSetup
              resume={resumeData}
              onSetupComplete={handleSetupComplete}
              onBack={() => setCurrentStep('upload')}
            />
          )}

          {currentStep === 'prep' && resumeData && interviewSetup && (
            <InterviewPrep
              resume={resumeData}
              setup={interviewSetup}
              onReadyToStart={handleReadyToStart}
              onBack={() => setCurrentStep('setup')}
            />
          )}

          {currentStep === 'interview' && resumeData && interviewSetup && (
            <InterviewScreen
              resume={resumeData}
              setup={interviewSetup}
              questionPool={questionPoolData}
              onInterviewFinished={handleInterviewFinished}
              onCancel={handleReset}
            />
          )}

          {currentStep === 'processing' && interviewResultData && (
            <ProcessingScreen
              interviewData={interviewResultData}
              onReportReady={handleReportReady}
            />
          )}

          {currentStep === 'report' && finalReport && interviewResultData && (
            <InterviewReport
              reportData={finalReport}
              interviewData={interviewResultData}
              isSupabaseSynced={isSupabaseSynced}
              onRetake={handleReset}
              onOpenAuth={handleOpenAuth}
              currentUser={currentUser}
            />
          )}
        </Suspense>
      </main>

      <footer className="border-t border-[#EAE6DF] bg-white/80 backdrop-blur-xs py-2 sm:py-3 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-1 sm:gap-2">
          <div className="flex items-center gap-2 font-semibold text-gray-700">
            <span className="gold-gradient-text font-black text-xs sm:text-sm">MockMate AI</span>
            <span className="text-gray-300">•</span>
            <span className="text-gray-500 font-normal text-[11px] sm:text-xs">Interactive Voice Interview Practice</span>
          </div>
          <div className="text-gray-400 text-[11px]">
            <span>© 2026 MockMate AI. All rights reserved.</span>
          </div>
        </div>
      </footer>

      {/* Global Auth Modal for Sign In, Sign Up & Passwordless Email */}
      {isAuthOpen && (
        <Suspense fallback={null}>
          <AuthModal
            isOpen={isAuthOpen}
            initialMode={authInitialMode}
            onClose={() => setIsAuthOpen(false)}
            onAuthSuccess={handleAuthSuccess}
          />
        </Suspense>
      )}
    </div>
  );
}

