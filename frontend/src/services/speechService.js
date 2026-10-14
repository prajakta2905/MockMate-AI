// Web Speech API wrapper for speech recognition and synthesis
class SpeechService {
  constructor() {
    this.recognition = null;
    this.synthesis = typeof window !== 'undefined' ? window.speechSynthesis : null;
    
    // Recognition states
    this.isListening = false;
    this.shouldBeListening = false;
    this.permissionDenied = false;
    this.restartTimeout = null;
    
    // Callbacks
    this.onResultCallback = null;
    this.onListeningChangeCallback = null;
    this.onErrorCallback = null;
    this.onEndCallback = null;

    // TTS states
    this.isSpeaking = false;
    this.lastSpokenText = '';
    this.lastSpeechEndTime = 0;
    this.activeUtterance = null;
    this.speechWatchdog = null;
    this.speechHeartbeat = null;
    this.selectedVoice = null;
    this.voices = [];

    // Audio Analyser
    this.audioContext = null;
    this.analyser = null;
    this.mediaStream = null;
    this.sourceNode = null;
    this.volumeAnimationFrame = null;

    this.initVoices();
    this.bindUserInteractionResume();
  }

  isSupported() {
    const hasSpeechRecognition = typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
    const hasSpeechSynthesis = typeof window !== 'undefined' && Boolean(window.speechSynthesis);
    const hasAudioContext = typeof window !== 'undefined' && Boolean(window.AudioContext || window.webkitAudioContext);
    const hasGetUserMedia = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);

    return {
      speechRecognition: hasSpeechRecognition,
      speechSynthesis: hasSpeechSynthesis,
      audioContext: hasAudioContext,
      getUserMedia: hasGetUserMedia
    };
  }

  warmup() {
    if (typeof window === 'undefined') return;
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
    if (this.synthesis) {
      if (this.synthesis.paused) {
        this.synthesis.resume();
      }
    }
    this.initVoices();
  }

  bindUserInteractionResume() {
    if (typeof window === 'undefined') return;
    const resumeAudio = () => {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }
      if (this.synthesis && this.synthesis.paused) {
        this.synthesis.resume();
      }
    };
    window.addEventListener('click', resumeAudio, { passive: true });
    window.addEventListener('keydown', resumeAudio, { passive: true });
    window.addEventListener('touchstart', resumeAudio, { passive: true });
  }

  initVoices() {
    if (!this.synthesis) return;

    const loadVoices = () => {
      try {
        const vList = this.synthesis.getVoices() || [];
        if (vList.length > 0) {
          this.voices = vList;
          // Prioritize natural English voices
          this.selectedVoice =
            vList.find(v => v.lang && v.lang.startsWith('en') && (
              v.name.includes('Google') ||
              v.name.includes('Natural') ||
              v.name.includes('Premium') ||
              v.name.includes('Samantha') ||
              v.name.includes('Daniel') ||
              v.name.includes('Guy') ||
              v.name.includes('Jenny')
            )) ||
            vList.find(v => v.lang && v.lang.startsWith('en')) ||
            vList[0] || null;
        }
      } catch (e) {
        console.warn('Could not load speech synthesis voices:', e);
      }
    };

    loadVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  /**
   * Internal factory to create a fresh SpeechRecognition instance.
   * Creating a new instance on auto-reconnect prevents Chromium InvalidStateError.
   */
  _createRecognition() {
    if (typeof window === 'undefined') return null;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    if (this.recognition) {
      try {
        this.recognition.onstart = null;
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.abort();
      } catch (_) {}
      this.recognition = null;
    }

    try {
      const isMobile = typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent);
      
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = !isMobile;

      // Smart language support: Use en-IN for Indian accents / Hinglish, or browser English
      const sysLang = (typeof navigator !== 'undefined' && navigator.language) || '';
      recognition.lang = sysLang.toLowerCase().includes('in') ? 'en-IN' : (sysLang.startsWith('en') ? sysLang : 'en-IN');
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        this.isListening = true;
        this.permissionDenied = false;
        if (this.onListeningChangeCallback) {
          this.onListeningChangeCallback(true);
        }
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            finalTranscript += (res[0]?.transcript || '') + ' ';
          } else {
            interimTranscript += (res[0]?.transcript || '');
          }
        }

        const hasCandidateSpeech = (finalTranscript.trim().length > 1) || (interimTranscript.trim().length > 2);

        // If candidate speaks while interviewer TTS is speaking, automatically interrupt the AI
        if (this.isSpeaking && hasCandidateSpeech) {
          this.stopSpeaking();
        }

        if (this.onResultCallback) {
          this.onResultCallback({
            final: finalTranscript.trim(),
            interim: interimTranscript.trim()
          });
        }
      };

      recognition.onerror = (event) => {
        const error = event.error;
        if (error === 'no-speech' || error === 'aborted') {
          return;
        }

        if (error === 'not-allowed' || error === 'service-not-allowed') {
          console.warn('Microphone permission check notice:', error);
          this.isListening = false;
          if (this.onListeningChangeCallback) {
            this.onListeningChangeCallback(false);
          }
          if (this.onErrorCallback) {
            this.onErrorCallback('Microphone permission was not granted. Please allow microphone access in your browser bar.');
          }
          return;
        }

        if (error === 'audio-capture') {
          console.warn('Microphone audio capture busy, retrying in 400ms...');
          if (this.shouldBeListening && !this.isSpeaking) {
            clearTimeout(this.restartTimeout);
            this.restartTimeout = setTimeout(() => this._restartRecognition(), 400);
          }
          return;
        }

        if (error === 'network') {
          console.warn('Speech recognition network notice, auto-reconnecting...');
          return;
        }

        console.warn('SpeechRecognition event error:', error);
      };

      recognition.onend = () => {
        this.isListening = false;

        if (this.shouldBeListening && !this.isSpeaking) {
          clearTimeout(this.restartTimeout);
          this.restartTimeout = setTimeout(() => {
            if (this.shouldBeListening && !this.isSpeaking) {
              this._restartRecognition();
            }
          }, 200);
        } else {
          if (this.onListeningChangeCallback) {
            this.onListeningChangeCallback(false);
          }
          if (this.onEndCallback) {
            this.onEndCallback();
          }
        }
      };

      this.recognition = recognition;
      return recognition;
    } catch (e) {
      console.error('Error instantiating SpeechRecognition:', e);
      return null;
    }
  }

  _restartRecognition() {
    if (!this.shouldBeListening || this.isSpeaking) return;
    clearTimeout(this.restartTimeout);

    try {
      if (!this.recognition) {
        this.recognition = this._createRecognition();
      }
      if (this.recognition) {
        try {
          this.recognition.start();
          this.isListening = true;
          this.permissionDenied = false;
          if (this.onListeningChangeCallback) {
            this.onListeningChangeCallback(true);
          }
        } catch (startErr) {
          if (startErr.name === 'InvalidStateError') {
            // Already active or transitioning
            return;
          }
          // Re-create and retry
          this.recognition = this._createRecognition();
          if (this.recognition) {
            this.recognition.start();
            this.isListening = true;
            this.permissionDenied = false;
            if (this.onListeningChangeCallback) {
              this.onListeningChangeCallback(true);
            }
          }
        }
      }
    } catch (err) {
      if (err.name !== 'InvalidStateError') {
        console.warn('Recognition restart notice:', err);
      }
      if (this.shouldBeListening && !this.isSpeaking) {
        this.restartTimeout = setTimeout(() => this._restartRecognition(), 500);
      }
    }
  }

  /**
   * Initialize speech recognition and register callbacks
   */
  initRecognition(onResult, onEnd, onError, onListeningChange) {
    this.onResultCallback = onResult;
    this.onEndCallback = onEnd;
    this.onErrorCallback = onError;
    this.onListeningChangeCallback = onListeningChange;

    return this._createRecognition() !== null;
  }

  /**
   * Start listening to candidate
   */
  startListening() {
    this.shouldBeListening = true;
    this.permissionDenied = false;
    clearTimeout(this.restartTimeout);

    if (this.isSpeaking) {
      this.stopSpeaking();
    }

    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }

    this._restartRecognition();
    return true;
  }

  stopListening() {
    this.shouldBeListening = false;
    clearTimeout(this.restartTimeout);

    if (this.recognition) {
      try {
        this.recognition.onstart = null;
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.abort();
      } catch (_) {}
      this.recognition = null;
    }
    this.isListening = false;
    if (this.onListeningChangeCallback) {
      this.onListeningChangeCallback(false);
    }
  }

  /**
   * Toggle listening state
   */
  toggleListening() {
    if (this.isListening || this.shouldBeListening) {
      this.stopListening();
      return false;
    } else {
      this.startListening();
      return true;
    }
  }

  /**
   * Speak interviewer question aloud via TTS with watchdog & GC protection
   */
  speak(text, onStart, onEnd) {
    this.stopListening();

    if (!this.synthesis) {
      if (onStart) onStart();
      if (onEnd) setTimeout(onEnd, 1500);
      return;
    }

    const cleanText = String(text || '')
      .replace(/[#*_`]/g, '')
      .replace(/\[.*?\]\(.*?\)/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    this.lastSpokenText = cleanText.toLowerCase();

    if (!cleanText) {
      this.isSpeaking = false;
      this.lastSpeechEndTime = Date.now();
      if (onEnd) onEnd();
      return;
    }

    clearTimeout(this.speechWatchdog);
    clearInterval(this.speechHeartbeat);
    this.speechHeartbeat = null;

    // If browser is currently speaking, cancel first and wait 70ms for cancel IPC to clear
    if (this.synthesis.speaking || this.synthesis.pending) {
      try {
        this.synthesis.cancel();
      } catch (_) {}
      setTimeout(() => {
        this._executeSpeak(cleanText, onStart, onEnd);
      }, 70);
    } else {
      this._executeSpeak(cleanText, onStart, onEnd);
    }
  }

  _executeSpeak(cleanText, onStart, onEnd) {
    if (!this.synthesis) {
      if (onEnd) onEnd();
      return;
    }

    if (this.synthesis.paused) {
      this.synthesis.resume();
    }

    this.isSpeaking = true;

    // Load voices if not loaded yet
    if (!this.selectedVoice || this.voices.length === 0) {
      const vList = this.synthesis.getVoices() || [];
      if (vList.length > 0) {
        this.voices = vList;
        this.selectedVoice =
          vList.find(v => v.lang && v.lang.startsWith('en') && (
            v.name.includes('Google') ||
            v.name.includes('Natural') ||
            v.name.includes('Premium') ||
            v.name.includes('Samantha') ||
            v.name.includes('Daniel') ||
            v.name.includes('Guy') ||
            v.name.includes('Jenny')
          )) ||
          vList.find(v => v.lang && v.lang.startsWith('en')) ||
          vList[0] || null;
      }
    }

    // Split into sentences if text is long; otherwise keep as single clean utterance
    const chunks = cleanText.length > 200
      ? (cleanText.match(/[^.?!]+[.?!]+|\s*[^.?!]+/g) || [cleanText]).map(c => c.trim()).filter(Boolean)
      : [cleanText];

    let currentChunkIndex = 0;
    let finished = false;

    if (onStart) onStart();

    const finishSpeech = () => {
      if (finished) return;
      finished = true;
      clearTimeout(this.speechWatchdog);
      clearInterval(this.speechHeartbeat);
      this.speechHeartbeat = null;
      this.activeUtterance = null;
      if (typeof window !== 'undefined') window.__mockmateUtterance = null;

      setTimeout(() => {
        this.isSpeaking = false;
        this.lastSpeechEndTime = Date.now();
        if (onEnd) onEnd();
      }, 250);
    };

    const playNextChunk = () => {
      if (!this.isSpeaking || finished) return;

      if (currentChunkIndex >= chunks.length) {
        finishSpeech();
        return;
      }

      const chunkText = chunks[currentChunkIndex];
      const utterance = new SpeechSynthesisUtterance(chunkText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }

      utterance.onstart = () => {
        if (!this.speechHeartbeat) {
          this.speechHeartbeat = setInterval(() => {
            if (this.synthesis && this.synthesis.speaking && !this.synthesis.paused) {
              this.synthesis.pause();
              this.synthesis.resume();
            }
          }, 10000);
        }
      };

      utterance.onend = () => {
        currentChunkIndex++;
        playNextChunk();
      };

      utterance.onerror = (err) => {
        console.warn('Speech synthesis chunk error:', err?.error || err);
        if (err?.error === 'interrupted' || err?.error === 'canceled') {
          // Intentionally stopped or canceled - cleanly finish speech and trigger onEnd
          finishSpeech();
          return;
        }
        currentChunkIndex++;
        playNextChunk();
      };

      // Keep active reference to prevent Chromium GC from eating onend
      this.activeUtterance = utterance;
      if (typeof window !== 'undefined') {
        window.__mockmateUtterance = utterance;
      }

      clearTimeout(this.speechWatchdog);
      const words = chunkText.split(/\s+/).length;
      const expectedTimeMs = Math.max(4000, (words / 1.8) * 1000 + 3500);

      this.speechWatchdog = setTimeout(() => {
        if (this.isSpeaking && !finished) {
          console.warn('Speech chunk watchdog expired, moving to next chunk.');
          currentChunkIndex++;
          playNextChunk();
        }
      }, expectedTimeMs);

      try {
        this.synthesis.speak(utterance);
      } catch (e) {
        console.error('TTS speak invocation error:', e);
        finishSpeech();
      }
    };

    playNextChunk();
  }

  /**
   * Stop TTS speech immediately
   */
  stopSpeaking() {
    clearTimeout(this.speechWatchdog);
    clearInterval(this.speechHeartbeat);
    this.speechHeartbeat = null;
    this.isSpeaking = false;
    this.activeUtterance = null;
    if (typeof window !== 'undefined') {
      window.__mockmateUtterance = null;
    }
    if (this.synthesis) {
      try {
        this.synthesis.cancel();
      } catch (_) {}
    }
  }

  /**
   * Setup real microphone audio analyser for live visualizer
   * Calculates volume focused on human vocal frequencies (80Hz - 3500Hz)
   */
  async setupAudioAnalyser(onVolumeUpdate) {
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        return false;
      }

      const isMobile = typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent);
      
      if (isMobile) {
        // Mobile Android Chrome cannot share the microphone between AudioContext and SpeechRecognition.
        // We completely bypass getUserMedia here. SpeechRecognition will handle the permission prompt.
        if (this.volumeAnimationFrame) {
          cancelAnimationFrame(this.volumeAnimationFrame);
        }
        const simulateVolume = () => {
          if (onVolumeUpdate) {
            onVolumeUpdate(this.isListening ? Math.floor(Math.random() * 25 + 5) : 0);
          }
          this.volumeAnimationFrame = requestAnimationFrame(() => {
            setTimeout(simulateVolume, 100);
          });
        };
        simulateVolume();
        this.permissionDenied = false;
        return true;
      }

      // For Desktop: Use actual AudioContext and getUserMedia with full constraints
      if (this.volumeAnimationFrame) {
        cancelAnimationFrame(this.volumeAnimationFrame);
        this.volumeAnimationFrame = null;
      }

      if (!this.mediaStream || !this.mediaStream.active) {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: false
        });
      }

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new AudioCtx();
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume().catch(() => {});
      }

      // Disconnect old source node if existing
      if (this.sourceNode) {
        try {
          this.sourceNode.disconnect();
        } catch (_) {}
      }

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.5;
      this.sourceNode.connect(this.analyser);

      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      const checkVolume = () => {
        if (!this.analyser) return;
        this.analyser.getByteFrequencyData(dataArray);

        // Vocal spectrum analysis: focus on bins 1 to 40 (~80Hz to ~3500Hz)
        let sum = 0;
        const voiceBins = 38;
        for (let i = 1; i <= voiceBins; i++) {
          sum += dataArray[i];
        }
        const vocalAvg = sum / voiceBins;
        
        // Scale to a lively 0 - 100 range with minimum noise threshold
        const scaledVol = vocalAvg < 3 ? 0 : Math.min(100, Math.round(vocalAvg * 1.8));

        if (onVolumeUpdate) {
          onVolumeUpdate(scaledVol);
        }
        this.volumeAnimationFrame = requestAnimationFrame(checkVolume);
      };

      checkVolume();
      this.permissionDenied = false;
      return true;
    } catch (err) {
      console.warn('Microphone access check failed:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        this.permissionDenied = true;
      }
      return false;
    }
  }

  /**
   * Stop volume analyser loop without terminating the media tracks
   */
  stopVolumeCheck() {
    if (this.volumeAnimationFrame) {
      cancelAnimationFrame(this.volumeAnimationFrame);
      this.volumeAnimationFrame = null;
    }
  }

  /**
   * Release media stream tracks to immediately free the hardware mic for SpeechRecognition
   */
  releaseMediaStream() {
    this.stopVolumeCheck();
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch (_) {}
      this.sourceNode = null;
    }
    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach(track => track.stop());
      } catch (_) {}
      this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close().catch(() => {});
      } catch (_) {}
      this.audioContext = null;
    }
    this.analyser = null;
  }

  /**
   * Clean up audio tracks and shutdown recognition on session exit
   */
  cleanupAudio() {
    this.stopVolumeCheck();
    this.stopSpeaking();
    this.stopListening();

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch (_) {}
      this.sourceNode = null;
    }

    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach(track => track.stop());
      } catch (_) {}
      this.mediaStream = null;
    }

    if (this.audioContext) {
      try {
        this.audioContext.close().catch(() => {});
      } catch (_) {}
      this.audioContext = null;
    }

    this.analyser = null;
  }
}

export const speechService = new SpeechService();
