import { enforceQuestionWordCount } from './gemini';
import { evaluateAnswerWithJavaBackend } from './javaBackendService';

export const getGrokApiKey = () => {
  const fromMeta = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GROK_API_KEY) || '';
  const fromProcess = (typeof process !== 'undefined' && process.env?.VITE_GROK_API_KEY) || '';
  const fromStorage = (typeof localStorage !== 'undefined' && localStorage.getItem('MOCKMATE_GROK_KEY')) || '';
  return fromMeta || fromProcess || fromStorage || '';
};

export const setGrokApiKey = (key) => {
  if (typeof localStorage === 'undefined') return;
  if (key) {
    localStorage.setItem('MOCKMATE_GROK_KEY', key.trim());
  } else {
    localStorage.removeItem('MOCKMATE_GROK_KEY');
  }
};

/**
 * Detects whether candidate utterance is requesting to repeat or return to the previous question.
 * Handles English, Hindi, and Hinglish phrasing.
 */
export function isRepeatOrPreviousCommand(text = '') {
  if (!text || typeof text !== 'string') return false;
  const clean = text.toLowerCase().trim().replace(/[.,?!;:'"_\-/\\]/g, ' ').replace(/\s+/g, ' ');
  if (!clean) return false;

  const words = clean.split(' ');
  // If the answer is long (more than 10 words), candidate is providing a detailed technical answer
  if (words.length > 10) return false;

  const exactList = [
    'repeat',
    'repeat please',
    'please repeat',
    'repeat that',
    'repeat that please',
    'repeat the question',
    'repeat question',
    'repeat the questions',
    'repeat this question',
    'repeat it',
    'can you repeat',
    'can you repeat that',
    'can you repeat the question',
    'could you repeat',
    'could you repeat that',
    'could you repeat the question',
    'please repeat the question',
    'what was the question',
    'what was the question again',
    'what is the question',
    'say that again',
    'say again',
    'say it again',
    'previous question',
    'previous questions',
    'go to previous question',
    'go to the previous question',
    'go back to previous question',
    'go back',
    'last question',
    'previous',
    'pichla question',
    'pichhla question',
    'pichla sawal',
    'pichla sawaal',
    'pehle wala question',
    'pehle wala sawal',
    'repeat karo',
    'dobara bolo',
    'phir se bolo',
    'phir se boliye',
    'dobara boliye',
    'ek baar phir se',
    'ek baar phir bolo',
    'sawaal repeat karo',
    'question repeat karo'
  ];

  if (exactList.includes(clean)) return true;

  // Pattern matching
  const pattern = /(repeat.*(question|that|it|sawaal|sawal)|(previous|pichla|pichhla|pehle\s*wala|last)\s*(question|sawal|sawaal)|can\s*you\s*repeat|could\s*you\s*repeat|what\s*was\s*the\s*question|go\s*back|dobara\s*bolo|phir\s*se\s*bolo)/i;
  return pattern.test(clean);
}

/**
 * Detects whether candidate's answer is unclear, unintelligible, gibberish, filler noises, or not understood by AI
 */
export function isUnclearOrGibberishAnswer(text = '') {
  if (!text || typeof text !== 'string') return true;
  const clean = text.trim();
  if (!clean || clean.length < 3) return true;

  // If answer consists only of non-alphanumeric characters like "...???"
  if (!/[a-zA-Z0-9]/.test(clean)) return true;

  // Repeated character streaks like "aaaaaa" or "hhhhhh"
  if (/(.)\1{3,}/.test(clean)) return true;

  const words = clean.split(/\s+/).filter(Boolean);

  // Common filler sounds that don't constitute a technical answer
  const fillers = ['uh', 'um', 'umm', 'hmm', 'hmmm', 'er', 'ah', 'eh', 'ok', 'yes', 'no', 'yeah', 'hi', 'hello', 'test'];
  const nonFillers = words.filter(w => !fillers.includes(w.toLowerCase().replace(/[^a-z]/g, '')));
  if (nonFillers.length === 0) return true;

  // Keyboard mashing (e.g. "asdfghjk", "zxcvbnm", "qwertypoiu")
  if (words.length === 1 && clean.length > 6) {
    const vowels = (clean.match(/[aeiou]/gi) || []).length;
    if (vowels === 0 || (clean.length > 8 && vowels <= 1)) return true;
  }

  // 5+ consecutive consonants (e.g. "bcdfgh", "rstvwx")
  if (/[bcdfghjklmnpqrstvwxyz]{5,}/i.test(clean)) return true;

  // Very short response with only 1 or 2 small words (under 9 chars) that is not an answer
  if (nonFillers.length < 3 && clean.length < 9) {
    return true;
  }

  return false;
}

export async function evaluateAnswerAndGenerateNextQuestion({
  currentQuestion,
  candidateAnswer,
  conversationHistory = [],
  questionPool = [],
  currentQuestionIndex = 0,
  targetRole = 'Senior Software Engineer',
  interviewType = 'mixed',
  resume = null,
  isFollowUp = false
}) {
  // 1. If candidate answer is a repeat or previous question voice command, immediately return previous action with 0ms network latency
  if (isRepeatOrPreviousCommand(candidateAnswer)) {
    return {
      action: 'previous',
      isFollowUp: false,
      nextQuestion: '',
      rationale: 'Candidate requested repeat or previous question'
    };
  }

  // 2. If candidate answer is unclear, gibberish, filler noises, or not understood by AI, immediately enter "I didn't quite catch that" screen
  if (isUnclearOrGibberishAnswer(candidateAnswer)) {
    return {
      action: 'clarify',
      isFollowUp: true,
      nextQuestion: "I didn't quite catch that. Could you please repeat or clarify your answer?",
      rationale: "Candidate answer was unclear, unintelligible, or not understood."
    };
  }

  const lastTurn = conversationHistory[conversationHistory.length - 1];
  const lastWasFollowUp = Boolean(isFollowUp || lastTurn?.isFollowUp);

  const apiKey = getGrokApiKey();

  // 1. Live Ultra-Fast AI Evaluation (Java Backend Groq Proxy / GroqCloud)
  try {
    let evaluation = null;
    if (!apiKey || apiKey.startsWith('gsk_')) {
      // Groq Proxy via Java backend (server-side keys, with optional custom key override)
      evaluation = await callGroqCloudApi({
        currentQuestion,
        candidateAnswer,
        conversationHistory,
        questionPool,
        currentQuestionIndex,
        targetRole,
        apiKey,
        resume,
        lastWasFollowUp
      });
    } else {
      // xAI Grok API (only if user provided an xAI custom key)
      evaluation = await callXaiGrokApi({
        currentQuestion,
        candidateAnswer,
        conversationHistory,
        questionPool,
        currentQuestionIndex,
        targetRole,
        apiKey,
        resume,
        lastWasFollowUp
      });
    }

    if (evaluation && (evaluation.nextQuestion || evaluation.action)) {
      // Natural progression guarantees:
      // Rule A: Never ask a follow-up on Question 0 (Warmup) - move directly to Question 1/2
      // Rule B: Never ask 2 consecutive follow-ups - after 1 follow-up, advance to next main question
      // Rule C: Never override previous, repeat, or clarify navigation commands
      const isClarifyOrNav = evaluation.action === 'previous' || 
        evaluation.action === 'repeat' || 
        evaluation.action === 'clarify' ||
        evaluation.nextQuestion?.toLowerCase().includes("didn't quite catch") ||
        evaluation.nextQuestion?.toLowerCase().includes("catch that");

      if ((currentQuestionIndex === 0 || lastWasFollowUp) && !isClarifyOrNav) {
        evaluation.isFollowUp = false;
        evaluation.action = 'next';
      }
      return evaluation;
    }
  } catch (err) {
    console.warn('[AI Evaluation] Groq proxy failed or skipped, trying Java interview coach:', err.message);
  }

  // 2. Secondary: Java Spring Boot /api/interview/evaluate-answer
  try {
    const backendEval = await evaluateAnswerWithJavaBackend(currentQuestion, candidateAnswer, targetRole);
    if (backendEval?.success && backendEval.nextQuestion) {
      const isClarifyOrNav = backendEval.action === 'previous' || 
        backendEval.action === 'repeat' || 
        backendEval.action === 'clarify';

      return {
        action: (currentQuestionIndex === 0 || lastWasFollowUp) && !isClarifyOrNav ? 'next' : (backendEval.action || 'next'),
        isFollowUp: (currentQuestionIndex === 0 || lastWasFollowUp) && !isClarifyOrNav ? false : (backendEval.isFollowUp !== false),
        nextQuestion: enforceQuestionWordCount(backendEval.nextQuestion),
        rationale: backendEval.rationale || 'Evaluation generated by Java backend AI coach'
      };
    }
  } catch (backendErr) {
    console.warn('[AI Evaluation] Java backend coach offline:', backendErr.message);
  }

  // 3. Intelligent local conversational follow-up engine (zero-latency, smooth progression)
  return generateIntelligentFollowUpLocal({
    currentQuestion,
    candidateAnswer,
    conversationHistory,
    questionPool,
    currentQuestionIndex,
    targetRole,
    resume
  });
}

/**
 * GroqCloud API implementation
 * Prioritizes Java Spring Boot backend proxy so API keys stay 100% server-side.
 */
async function callGroqCloudApi({
  currentQuestion,
  candidateAnswer,
  conversationHistory,
  questionPool,
  currentQuestionIndex,
  targetRole,
  apiKey,
  resume,
  lastWasFollowUp = false
}) {
  const backendUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_JAVA_BACKEND_URL) || 
    (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' ? '' : 'http://localhost:8080');

  const systemPrompt = `You are a concise, sharp technical interviewer conducting a live voice interview for a ${targetRole} position.
CRITICAL RULES FOR QUESTIONS:
1. Every question MUST be STRICTLY between 15 and 18 words long. Never less than 15 words, never more than 18 words. Count words carefully.
2. NO long compound sentences or multi-part questions.
3. If asking a follow-up, probe ONE specific trade-off or technical decision sharply and briefly (15-18 words).
4. Keep the question natural and conversational so Text-to-Speech reads it quickly.
5. UNCLEAR / GIBBERISH / UNINTELLIGIBLE ANSWER HANDLING: If the candidate's answer is unintelligible, gibberish, filler noises, random letters, or completely incomprehensible, you MUST set "action": "clarify", "isFollowUp": true, and "nextQuestion": "I did not catch that clearly. Could you please repeat your answer and explain your engineering approach?". DO NOT advance to the next question.
6. REPEAT / PREVIOUS REQUESTS: If the candidate asks you to repeat the question, go back, or what the previous question was, you MUST return "action": "previous".
7. TRANSITIONING: If moving to the next planned question, set "isFollowUp" to false, "action" to "next", and "nextQuestion" to the next planned question.

You MUST respond strictly with valid JSON with this exact schema:
{
  "action": "next" | "previous" | "repeat" | "clarify",
  "isFollowUp": true,
  "nextQuestion": "Spoken question strictly between fifteen and eighteen words long",
  "rationale": "1-sentence reason"
}`;

  const nextPlannedQ = questionPool[currentQuestionIndex + 1]?.question || 'Can you describe another significant engineering achievement?';

  const userPrompt = `
Candidate Name: ${resume?.name || 'Candidate'}
Candidate Projects: ${JSON.stringify(resume?.projects?.map(p => p.name) || [])}
Current Question Asked: "${currentQuestion}"
Candidate Answer Spoken: "${candidateAnswer}"
Next Planned Main Question: "${nextPlannedQ}"
Current Question Index: ${currentQuestionIndex}
Was Last Question A Follow-Up: ${lastWasFollowUp ? 'YES' : 'NO'}

${currentQuestionIndex === 0 ? 'MANDATORY: Candidate has answered their introductory warmup. You MUST set "isFollowUp" to false, "action" to "next", and transition directly to the Next Planned Main Question.' : ''}
${lastWasFollowUp ? 'MANDATORY: Candidate has already answered a follow-up. You MUST set "isFollowUp" to false, "action" to "next", and transition directly to the Next Planned Main Question.' : ''}

Decide whether to ask a follow-up probe on their answer or move forward. Return strictly valid JSON.
`;

  // 1. Primary: Route via Java Spring Boot Backend (Server-side API keys, credentials NEVER exposed in browser)
  try {
    const proxyController = new AbortController();
    const proxyTimeoutId = setTimeout(() => proxyController.abort(), 15000);
    const proxyRes = await fetch(`${backendUrl}/api/ai/groq`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: userPrompt,
        systemInstruction: systemPrompt,
        model: 'qwen/qwen3.8-27b',
        temperature: 0.3,
        jsonMode: true,
        apiKey: apiKey || null
      }),
      signal: proxyController.signal
    });
    clearTimeout(proxyTimeoutId);

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data.success && data.content) {
        let parsed = null;
        try {
          parsed = JSON.parse(data.content);
        } catch {
          const match = data.content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
          if (match) parsed = JSON.parse(match[0]);
        }

        if (parsed) {
          const isClarifyOrNav = parsed.action === 'previous' || 
            parsed.action === 'repeat' || 
            parsed.action === 'clarify' ||
            parsed.nextQuestion?.toLowerCase().includes("didn't quite catch") ||
            parsed.nextQuestion?.toLowerCase().includes("catch that");

          if ((currentQuestionIndex === 0 || lastWasFollowUp) && !isClarifyOrNav) {
            parsed.isFollowUp = false;
            parsed.action = 'next';
            if (!parsed.nextQuestion || parsed.nextQuestion.trim().length < 5) {
              parsed.nextQuestion = nextPlannedQ;
            }
          }
          if (parsed.nextQuestion && !isClarifyOrNav) {
            parsed.nextQuestion = enforceQuestionWordCount(parsed.nextQuestion);
          }
          return parsed;
        }
      }
    }
  } catch (proxyErr) {
    console.warn('[AI Proxy] Backend Groq evaluation call offline or failed, attempting direct fallback:', proxyErr.message);
  }

  // 2. Direct client fallback (Only if user has manually provided a client-side key)
  if (!apiKey || !apiKey.startsWith('gsk_')) {
    throw new Error('NO_GROQ_KEY_AND_BACKEND_OFFLINE');
  }

  const endpoint = 'https://api.groq.com/openai/v1/chat/completions';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'qwen/qwen3.8-27b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const fbController = new AbortController();
      const fbTimeoutId = setTimeout(() => fbController.abort(), 15000);
      try {
        const fallbackResponse = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          signal: fbController.signal,
          body: JSON.stringify({
            model: 'openai/gpt-oss-20b',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' }
          })
        });
        clearTimeout(fbTimeoutId);
        if (!fallbackResponse.ok) {
          throw new Error(`Groq API error: HTTP ${fallbackResponse.status}`);
        }
        const data = await fallbackResponse.json();
        const content = data.choices?.[0]?.message?.content;
        const parsed = JSON.parse(content);
        const isClarifyOrNav = parsed.action === 'previous' || 
          parsed.action === 'repeat' || 
          parsed.action === 'clarify' ||
          parsed.nextQuestion?.toLowerCase().includes("didn't quite catch") ||
          parsed.nextQuestion?.toLowerCase().includes("catch that");

        if ((currentQuestionIndex === 0 || lastWasFollowUp) && !isClarifyOrNav) {
          parsed.isFollowUp = false;
          parsed.action = 'next';
          if (!parsed.nextQuestion || parsed.nextQuestion.trim().length < 5) {
            parsed.nextQuestion = nextPlannedQ;
          }
        }
        if (parsed.nextQuestion && !isClarifyOrNav) {
          parsed.nextQuestion = enforceQuestionWordCount(parsed.nextQuestion);
        }
        return parsed;
      } catch (err) {
        clearTimeout(fbTimeoutId);
        throw err;
      }
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);
    const isClarifyOrNav = parsed.action === 'previous' || 
      parsed.action === 'repeat' || 
      parsed.action === 'clarify' ||
      parsed.nextQuestion?.toLowerCase().includes("didn't quite catch") ||
      parsed.nextQuestion?.toLowerCase().includes("catch that");

    if ((currentQuestionIndex === 0 || lastWasFollowUp) && !isClarifyOrNav) {
      parsed.isFollowUp = false;
      parsed.action = 'next';
      if (!parsed.nextQuestion || parsed.nextQuestion.trim().length < 5) {
        parsed.nextQuestion = nextPlannedQ;
      }
    }
    if (parsed.nextQuestion && !isClarifyOrNav) {
      parsed.nextQuestion = enforceQuestionWordCount(parsed.nextQuestion);
    }
    return parsed;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * xAI Grok API implementation
 */
async function callXaiGrokApi({
  currentQuestion,
  candidateAnswer,
  conversationHistory,
  questionPool,
  currentQuestionIndex,
  targetRole,
  apiKey,
  resume,
  lastWasFollowUp = false
}) {
  const endpoint = 'https://api.x.ai/v1/chat/completions';

  const systemPrompt = `You are a live AI technical interviewer conducting a voice interview for ${targetRole}. 
CRITICAL RULE: If the candidate answers with gibberish, random letters, or nonsense, set isFollowUp to true and ask them to repeat/clarify. 
CRITICAL RULE: If the candidate asks you to repeat the question or go to the previous question, you MUST return "action": "previous".
Return strictly valid JSON with keys: action (string, optional), isFollowUp (boolean), nextQuestion (string), rationale (string).`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'grok-beta',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Current Question: "${currentQuestion}"\nAnswer: "${candidateAnswer}"\nNext Pool Question: "${questionPool[currentQuestionIndex + 1]?.question || ''}"` }
        ],
        temperature: 0.3
      })
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`xAI Grok HTTP ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    if ((currentQuestionIndex === 0 || lastWasFollowUp) && parsed.action !== 'previous' && parsed.action !== 'repeat') {
      parsed.isFollowUp = false;
      parsed.action = 'next';
    }
    return parsed;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Smart Local Heuristic Engine for Instant Zero-Latency Follow-ups
 */
function generateIntelligentFollowUpLocal({
  currentQuestion,
  candidateAnswer = '',
  conversationHistory = [],
  questionPool = [],
  currentQuestionIndex = 0,
  resume
}) {
  const lowerAnswer = candidateAnswer.toLowerCase();
  const lastTurn = conversationHistory[conversationHistory.length - 1];
  const lastWasFollowUp = lastTurn?.isFollowUp || false;
  const projectName = resume?.projects?.[0]?.name || 'your project';

  // Direct repeat / previous command handling
  if (isRepeatOrPreviousCommand(candidateAnswer)) {
    return {
      action: 'previous',
      isFollowUp: false,
      nextQuestion: "",
      rationale: "Candidate asked to repeat or go to the previous question."
    };
  }

  // Unclear / Gibberish / Incomprehensible answer detection
  if (isUnclearOrGibberishAnswer(candidateAnswer)) {
    return {
      action: 'clarify',
      isFollowUp: true,
      nextQuestion: "I did not catch that clearly. Could you please repeat your answer and explain your engineering approach?",
      rationale: "Candidate answered with gibberish, filler sounds, or an incomprehensible string."
    };
  }

  // If candidate just answered the initial introduction question (index 0), smoothly transition to Question 2
  if (currentQuestionIndex === 0) {
    const nextQ = questionPool[1] || questionPool[0];
    return {
      isFollowUp: false,
      nextQuestion: nextQ ? enforceQuestionWordCount(nextQ.question) : "Could you explain how you design and structure scalable software systems when planning a complex feature?",
      rationale: "Introductory answer complete; moving to fundamental engineering questions."
    };
  }

  // Don't ask more than 1 consecutive follow-up on the same topic to keep interview moving smoothly
  if (!lastWasFollowUp && candidateAnswer.trim().length > 12) {
    if (lowerAnswer.includes('jwt') || lowerAnswer.includes('token') || lowerAnswer.includes('auth')) {
      return {
        isFollowUp: true,
        nextQuestion: enforceQuestionWordCount("In your authentication setup, how did you handle token revocation, refresh token rotation, and API gateway security?"),
        rationale: "Candidate highlighted JWT authentication; probing security tradeoffs."
      };
    }

    if (lowerAnswer.includes('redis') || lowerAnswer.includes('cache') || lowerAnswer.includes('caching')) {
      return {
        isFollowUp: true,
        nextQuestion: enforceQuestionWordCount("When implementing Redis caching, how did you prevent cache stampedes, dogpiling, and stale data synchronization issues?"),
        rationale: "Candidate mentioned caching; probing invalidation and concurrency."
      };
    }

    if (lowerAnswer.includes('microservice') || lowerAnswer.includes('microservices') || lowerAnswer.includes('distributed')) {
      return {
        isFollowUp: true,
        nextQuestion: enforceQuestionWordCount("In your distributed microservices architecture, how did you maintain eventual data consistency across isolated database boundaries?"),
        rationale: "Probing distributed systems consistency patterns."
      };
    }

    if (lowerAnswer.includes('websocket') || lowerAnswer.includes('realtime') || lowerAnswer.includes('real-time')) {
      return {
        isFollowUp: true,
        nextQuestion: enforceQuestionWordCount("When building real-time WebSockets, how did you manage connection state, heartbeat pinging, and automated reconnections at scale?"),
        rationale: "Probing real-time infrastructure scalability."
      };
    }

    if (lowerAnswer.includes('next.js') || lowerAnswer.includes('ssr') || lowerAnswer.includes('server component')) {
      return {
        isFollowUp: true,
        nextQuestion: enforceQuestionWordCount("When building modern web applications, how do you evaluate boundaries between Server Components and dynamic Client Components?"),
        rationale: "Evaluating Next.js architectural boundaries."
      };
    }

    if (lowerAnswer.includes('postgres') || lowerAnswer.includes('database') || lowerAnswer.includes('sql') || lowerAnswer.includes('mongodb')) {
      return {
        isFollowUp: true,
        nextQuestion: enforceQuestionWordCount("In your database architecture, how did you optimize slow queries, analyze execution plans, and structure composite indexes?"),
        rationale: "Deep dive into database reliability and index performance."
      };
    }

    if (lowerAnswer.includes('rag') || lowerAnswer.includes('vector') || lowerAnswer.includes('embedding') || lowerAnswer.includes('llm')) {
      return {
        isFollowUp: true,
        nextQuestion: enforceQuestionWordCount("In your AI pipeline, how did you reduce vector retrieval latency, manage chunking strategies, and prevent hallucinations?"),
        rationale: "Probing generative AI engineering precision and latency mitigation."
      };
    }

    // Short answers trigger an elaboration follow-up (Strictly 15-18 words)
    if (candidateAnswer.trim().split(/\s+/).length < 10) {
      return {
        isFollowUp: true,
        nextQuestion: enforceQuestionWordCount("Could you please elaborate on that technical approach, explaining the primary architectural trade-offs and decisions you considered?"),
        rationale: "Answer was brief; requesting structured elaboration."
      };
    }
  }

  // Move to next question in pool
  const nextPoolIndex = currentQuestionIndex + 1;
  const nextQ = questionPool[nextPoolIndex] || questionPool[0];

  return {
    isFollowUp: false,
    nextQuestion: nextQ ? enforceQuestionWordCount(nextQ.question) : "Could you describe another significant software engineering milestone you delivered and the architectural trade-offs you evaluated?",
    rationale: "Answer was sufficiently explored; transitioning to the next planned question."
  };
}
