import type { ResumeAnalysisResult, MockInterviewQuestion, MockEvaluationResult } from '../../types';

export interface AiDeps {
  fetcher?: typeof fetch;
  getToken?: () => Promise<string | null>;
}

/** Imported lazily so the AI client stays importable in environments without Vite env vars. */
async function getSessionToken(): Promise<string | null> {
  const { supabase } = await import('../../lib/supabase');
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/** Posts JSON to an AI endpoint with the caller's Supabase bearer token attached. */
export async function postAi<T>(
  path: string,
  body: unknown,
  errorMessage: (status: number) => string = (status) => `Server returned ${status}`,
  deps: AiDeps = {},
): Promise<T> {
  const { fetcher = fetch, getToken = getSessionToken } = deps;
  const token = await getToken();
  const response = await fetcher(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token ?? ''}`,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(errorMessage(response.status));
  }
  return (await response.json()) as T;
}

/** Like postAi, but resolves to null instead of throwing on an API error. */
export async function postAiOrNull<T>(path: string, body: unknown, deps: AiDeps = {}): Promise<T | null> {
  try {
    return await postAi<T>(path, body, undefined, deps);
  } catch {
    return null;
  }
}

export interface ResumeImproveResponse {
  score: number;
  strengths: string[];
  weaknesses: string[];
  improvedVersions: {
    style: string;
    text: string;
  }[];
  recommendedKeywords: string[];
  quickTips: string[];
  isFallback?: boolean;
}

export async function improveResumeBullet(
  text: string,
  section = 'Experience',
  role = 'Software Engineer',
  deps: AiDeps = {},
): Promise<ResumeImproveResponse> {
  return postAi<ResumeImproveResponse>('/api/ai/resume-improve', { text, section, role }, undefined, deps);
}

export async function analyzeFullResume(
  resumeText: string,
  targetRole: string,
  industry: string,
  deps: AiDeps = {},
): Promise<ResumeAnalysisResult> {
  return postAi<ResumeAnalysisResult>('/api/ai/resume-analyze', {
    resumeText,
    targetRole,
    industry,
  }, undefined, deps);
}

export async function generateMockQuestions(
  role: string,
  interviewType: string,
  seniority: string,
  testedSkill?: string,
  deps: AiDeps = {},
): Promise<{ questions: MockInterviewQuestion[] }> {
  return postAi<{ questions: MockInterviewQuestion[] }>(
    '/api/ai/mock-interview/generate-questions',
    { role, interviewType, seniority, testedSkill },
    undefined,
    deps,
  );
}

export async function evaluateMockResponse(
  question: string,
  candidateAnswer: string,
  role: string,
  interviewType: string,
  testedSkill?: string,
  deps: AiDeps = {},
): Promise<MockEvaluationResult> {
  return postAi<MockEvaluationResult>('/api/ai/mock-interview/evaluate-response', {
    question,
    candidateAnswer,
    role,
    interviewType,
    testedSkill,
  }, undefined, deps);
}

export async function getSkillRecommendations(
  currentRole: string,
  targetRole: string,
  completedSkills: string[],
  deps: AiDeps = {},
): Promise<any> {
  return postAi<any>('/api/ai/skills-recommend', {
    currentRole,
    targetRole,
    completedSkills,
  }, undefined, deps);
}

// 6. Gemini Multi-Turn Chat
export async function sendGeminiChatMessage(
  messages: { role: 'user' | 'assistant'; text: string }[],
  model = 'gemini-3.5-flash',
  role = 'Bioinformatics Principal Investigator & Career Mentor',
  systemInstruction?: string,
  deps: AiDeps = {},
): Promise<{ text: string; model: string; isFallback?: boolean }> {
  // The model and system prompt are pinned server-side; only messages are sent.
  void model; void role; void systemInstruction;
  return postAi<{ text: string; model: string; isFallback?: boolean }>(
    '/api/ai/chat',
    { messages },
    (status) => `Chat API error: ${status}`,
    deps,
  );
}

// 7. Google Search Grounding with Gemini 3.5 Flash
export async function searchBioinformaticsGrounding(query: string, deps: AiDeps = {}): Promise<{
  text: string;
  sources: { title: string; uri: string }[];
  searchEntryPoint?: string | null;
  grounded: boolean;
  isFallback?: boolean;
}> {
  return postAi<{
    text: string;
    sources: { title: string; uri: string }[];
    searchEntryPoint?: string | null;
    grounded: boolean;
    isFallback?: boolean;
  }>(
    '/api/ai/search-grounding',
    { query },
    (status) => `Search Grounding API error: ${status}`,
    deps,
  );
}

// 8. Audio Transcription with Gemini 3.5 Transcribe
export async function transcribeUserAudio(
  audioData: string,
  mimeType = 'audio/webm',
  prompt?: string,
  deps: AiDeps = {},
): Promise<string> {
  const data = await postAi<{ text?: string }>(
    '/api/ai/transcribe',
    { audioData, mimeType, prompt },
    (status) => `Transcribe API error: ${status}`,
    deps,
  );
  return data.text || '';
}

// 9. Image Generation and Editing with Gemini 3.1 Flash Image
export async function generateGeminiImage(
  prompt: string,
  base64Image?: string,
  aspectRatio = '1:1',
  deps: AiDeps = {},
): Promise<{ imageUrl: string; prompt: string }> {
  return postAi<{ imageUrl: string; prompt: string }>(
    '/api/ai/generate-image',
    { prompt, base64Image, aspectRatio },
    (status) => `Generate image API error: ${status}`,
    deps,
  );
}

// 10. Voice TTS Synthesis with Gemini 3.8 Flash Lite TTS
export async function synthesizeVoiceAudio(
  text: string,
  voiceName = 'Zephyr',
  deps: AiDeps = {},
): Promise<string | null> {
  const data = await postAiOrNull<{ audio?: string }>('/api/ai/voice-speak', { text, voiceName }, deps);
  return data?.audio ?? null;
}
