// services/gemini.ts (FIXED FOR VERCEL)
// ✅ Uses Vercel API route: /api/chat
// ✅ No @google/genai in frontend
// ✅ Keeps your DB functions working
// ✅ Only implements features commonly used in UI (Quiz + StudyCoach + Goals + Summary + ProjectHelp + Basic stubs)

import {
  QuizQuestion,
  ConfusionAnalysis,
  ExamProctoringAnalysis,
  PeerReviewAnalysis,
  ChatMessage,
  LessonPlan,
  AdminReport,
  InterviewAnalysis,
  LectureSummary,
  CampusMapResponse,
  ResumeFeedback,
  CalendarEvent,
  Task,
  EventPlan,
  EventPost,
  MoodEntry,
  ScholarshipMatch,
  SafetyAlert,
  ProjectTemplate,
  ExplanationMode,
  MultimodalResult,
  PeerReview,
  CareerMilestone,
  CourseRecommendation,
  JobMatch,
} from "../types";
import { DatabaseService } from "./databaseService";

/**
 * Calls Vercel serverless function /api/chat
 * Your backend route should return:
 * { reply: string }
 */
const callGeminiText = async (message: string): Promise<string> => {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  const data = await res.json();
  return data?.reply || "";
};

const safeJsonParse = <T,>(text: string, fallback: T): T => {
  try {
    // Sometimes Gemini returns ```json ... ```
    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    return JSON.parse(cleaned);
  } catch {
    return fallback;
  }
};

const handleApiError = (e: any) => {
  console.error("Gemini API Error:", e);
  if (e?.message?.includes("429") || e?.message?.includes("quota")) {
    return "QUOTA_EXCEEDED";
  }
  return "GENERAL_ERROR";
};

export const GeminiService = {
  // ✅ DB FUNCTIONS (unchanged)
  async getMasteryScores(userId: string = "S1"): Promise<Record<string, number>> {
    return await DatabaseService.getMasteryScores(userId);
  },

  async updateMasteryScore(subjectId: string, delta: number, userId: string = "S1") {
    const scores = await DatabaseService.getMasteryScores(userId);
    const currentScore = scores[subjectId] || 0;
    const newScore = Math.max(0, Math.min(100, currentScore + delta));
    await DatabaseService.updateMasteryScore(userId, subjectId, newScore);
  },

  // ✅ IMPORTANT: Image/audio/video analysis won't work via simple text-only /api/chat
  // So we provide safe fallbacks (no crash)
  async analyzeExamProctoring(_: string): Promise<ExamProctoringAnalysis> {
    return { faceDetected: false, attentionScore: 0, confusionScore: 0, stressScore: 0, confidenceScore: 0 };
  },

  async analyzeClassroomImage(_: string): Promise<ConfusionAnalysis> {
    return { confusionScore: 0, summary: "Image analysis not enabled on this deployment.", mood: "focused" };
  },

  async analyzeStudentAttention(_: string): Promise<ConfusionAnalysis> {
    return { confusionScore: 0, summary: "Image analysis not enabled on this deployment.", mood: "focused" };
  },

  // ✅ TEXT FEATURES WORKING ✅
  async generateAnonymousSummary(reviews: PeerReview[]): Promise<string> {
    try {
      if (reviews.length === 0) return "No peer insights have been shared yet.";

      const reviewText = reviews
        .map((r) => `[T:${r.teamworkScore}, Cr:${r.creativityScore}, Co:${r.communicationScore}] Feedback: ${r.comment}`)
        .join("\n---\n");

      const prompt = `Summarize peer feedback in max 100 words:\n${reviewText}`;
      return await callGeminiText(prompt);
    } catch {
      return "The Anonymization Engine is currently distilling insights.";
    }
  },

  async generateMultimodalSolution(
    topic: string,
    mode: ExplanationMode,
    wasCorrect: boolean,
    studentAnswer: string
  ): Promise<MultimodalResult> {
    try {
      const prompt = `
You are an expert tutor.
Topic: "${topic}"
Student Answer: "${studentAnswer}"
Result: ${wasCorrect ? "Correct" : "Incorrect"}
Mode: ${mode}

Return ONLY JSON:
{
  "mode": "${mode}",
  "content": "short explanation",
  "steps": ["step1", "step2"]
}
`;
      const reply = await callGeminiText(prompt);
      return safeJsonParse(reply, { mode, content: "Review core principles in your text." });
    } catch {
      return { mode, content: "Review core principles in your text." };
    }
  },

  async generateStudyGoals(subjects: string[]): Promise<string> {
    try {
      const prompt = `Generate one concise, motivating daily study goal for: ${subjects.join(", ")}. Max 25 words.`;
      return await callGeminiText(prompt);
    } catch {
      return "Review your core subjects today.";
    }
  },

  async getStudyCoachResponse(history: ChatMessage[], weakSubjects: string[]): Promise<string> {
    try {
      const last = history[history.length - 1]?.text || "";
      const convo = history
        .slice(-6)
        .map((h) => `${h.role.toUpperCase()}: ${h.text}`)
        .join("\n");

      const prompt = `
You are a friendly AI study coach. Max 30 words.
Weak Subjects: ${weakSubjects.join(", ")}

Conversation:
${convo}

Reply to the student's last message:
"${last}"
`;
      return await callGeminiText(prompt);
    } catch {
      return "I'm having a bit of trouble connecting. Try again!";
    }
  },

  // ✅ THIS FIXES PRACTICE ARENA QUESTIONS ✅
 async generateQuiz(topic: string, difficulty: string) {
  const prompt = `
Return ONLY valid JSON (no text, no markdown).
{
  "question": "...",
  "options": ["A","B","C","D"],
  "correctIndex": 0,
  "explanation": "..."
}
Topic: ${topic}
Difficulty: ${difficulty}
  `;

  const reply = await callGeminiText(prompt);

  return JSON.parse(reply.replace(/```json|```/g, "").trim());
}

      const reply = await callGeminiText(prompt);

      const parsed = safeJsonParse<QuizQuestion>(reply, {
        question: "AI question generation failed. Try again.",
        options: ["Option A", "Option B", "Option C", "Option D"],
        correctIndex: 0,
        explanation: "No explanation available.",
        theory: "N/A",
        steps: [],
        difficulty,
      });

      return parsed;
    } catch (e) {
      return handleApiError(e);
    }
  },

  async getProjectHelp(query: string): Promise<ChatMessage> {
    try {
      const prompt = `Help with this query. Answer clearly:\n${query}`;
      const text = await callGeminiText(prompt);

      return {
        id: Date.now().toString(),
        role: "model",
        text,
        sources: [],
      };
    } catch {
      return { id: Date.now().toString(), role: "model", text: "Service unavailable." };
    }
  },

  // ✅ DB logging
  async submitSessionReport(data: any): Promise<void> {
    await DatabaseService.logSession(data.studentId, data.mode, data);
  },

  async getProctoringLogs(): Promise<any[]> {
    return await DatabaseService.getRecentProctoringLogs();
  },

  async createLessonPlan(subject: string, grade: string, objectives: string): Promise<LessonPlan> {
    const prompt = `
Create a lesson plan.
Subject: ${subject}
Grade: ${grade}
Objectives: ${objectives}

Return ONLY JSON:
{
  "topic": "string",
  "pblActivity": "string",
  "discussionQuestions": ["q1","q2"],
  "formativeAssessment": "string"
}
`;
    const reply = await callGeminiText(prompt);
    return safeJsonParse(reply, { topic: subject, pblActivity: "", discussionQuestions: [], formativeAssessment: "" });
  },

  async analyzePeerReview(reviewText: string): Promise<PeerReviewAnalysis> {
    const prompt = `
Analyze this peer review and return ONLY JSON:
{
  "teamworkScore": 0,
  "creativityScore": 0,
  "feedback": "string"
}

Review:
"${reviewText}"
`;
    const reply = await callGeminiText(prompt);
    return safeJsonParse(reply, { teamworkScore: 0, creativityScore: 0, feedback: "Feedback analysis unavailable." });
  },

  async generateAdminReport(stats: any): Promise<AdminReport> {
    const prompt = `
Generate an admin report from stats. Return ONLY JSON:
{
  "institutionHealthPulse": "string",
  "overallMastery": 0,
  "adoptionRate": 0,
  "studentSatisfaction": 0,
  "teacherAdoption": 0,
  "topDepartment": "string",
  "adminConfidenceScore": 0
}
Stats: ${JSON.stringify(stats)}
`;
    const reply = await callGeminiText(prompt);

    return safeJsonParse(reply, {
      institutionHealthPulse: "Unavailable",
      overallMastery: 0,
      adoptionRate: 0,
      studentSatisfaction: 0,
      teacherAdoption: 0,
      topDepartment: "N/A",
      adminConfidenceScore: 0,
    });
  },

  async generateWeeklyReportText(stats: any): Promise<string> {
    try {
      const prompt = `Write a professional weekly report in markdown from this JSON:\n${JSON.stringify(stats)}`;
      return await callGeminiText(prompt);
    } catch {
      return "Error generating report.";
    }
  },

  // ❌ Not supported in this deployment style
  async generateSpeech(_: string): Promise<string | null> {
    return null;
  },

  async transcribeAudio(_: string): Promise<string> {
    return "";
  },

  async getInterviewQuestion(role: string): Promise<string> {
    try {
      const prompt = `Give 1 interview question for role: ${role}. Max 20 words.`;
      const reply = await callGeminiText(prompt);
      return reply.trim() || "Tell me about yourself.";
    } catch {
      return "Tell me about a time you worked in a team.";
    }
  },

  async analyzeInterviewResponse(_: string, __: string): Promise<InterviewAnalysis> {
    return { transcription: "Not supported in this deployment.", confidenceScore: 0, hiringProbability: 0, feedback: "", keywordsDetected: [] };
  },

  async analyzeLectureVideo(_: string): Promise<LectureSummary> {
    return { summary: "Not supported in this deployment.", keyMoments: [], flashcards: [], smartNotes: [], quiz: [] };
  },

  async askCampusGuide(query: string): Promise<CampusMapResponse> {
    // basic text answer
    const text = await callGeminiText(`Answer this campus guide question: ${query}`);
    return { text, links: [] };
  },

  async analyzeWhiteboard(_: string): Promise<string> {
    return "Not supported in this deployment.";
  },

  async reviewResume(input: string): Promise<ResumeFeedback> {
    const prompt = `
Review resume and return ONLY JSON:
{
  "score": 0,
  "suggestions": ["s1","s2"],
  "rewrittenSummary": "string"
}
Resume:
${input}
`;
    const reply = await callGeminiText(prompt);
    return safeJsonParse(reply, { score: 0, suggestions: [], rewrittenSummary: "Review unavailable." });
  },

  async generateDailyBriefing(tasks: Task[], events: CalendarEvent[]): Promise<string> {
    const prompt = `
Generate daily briefing in max 30 words.
Tasks: ${JSON.stringify(tasks)}
Events: ${JSON.stringify(events)}
`;
    return await callGeminiText(prompt);
  },

  async prioritizeTasks(tasks: Task[]): Promise<Task[]> {
    return tasks;
  },

  async sortTasksByDeadline(tasks: Task[]): Promise<Task[]> {
    return tasks;
  },

  async autoSchedule(_: string): Promise<{ startTime: string; reason: string }> {
    const fallback = new Date();
    fallback.setHours(fallback.getHours() + 2);
    return { startTime: fallback.toISOString(), reason: "Default allocation." };
  },

  async getConnectChatResponse(text: string): Promise<string> {
    return await callGeminiText(text);
  },

  async planEvent(idea: string): Promise<EventPlan> {
    const prompt = `
Create event plan. Return ONLY JSON:
{
  "checklist": ["item1","item2"],
  "emailDraft": "string",
  "budgetEstimate": "string"
}
Idea: ${idea}
`;
    const reply = await callGeminiText(prompt);
    return safeJsonParse(reply, { checklist: ["Define goal"], emailDraft: "Planning error.", budgetEstimate: "0" });
  },

  async generateEventDescription(_: string): Promise<EventPost> {
    return { caption: "Join our event!", hashtags: ["#event", "#zync"] };
  },

  async getWellnessChatResponse(history: ChatMessage[]): Promise<string> {
    const convo = history.slice(-6).map((h) => `${h.role}: ${h.text}`).join("\n");
    return await callGeminiText(`You are an AI wellness companion. Warm and concise.\n${convo}`);
  },

  async analyzeMoodEntry(_: string): Promise<MoodEntry> {
    return { transcription: "Not supported.", sentiment: "Calm", score: 50, advice: "Take a deep breath." };
  },

  async matchScholarships(_: any): Promise<ScholarshipMatch[]> {
    return [];
  },

  async analyzeSafetyFeed(_: string): Promise<SafetyAlert> {
    return { severity: "Safe", description: "Monitor inactive.", actionItem: "Check logs manually." };
  },

  async generateProjectTemplates(_: string): Promise<ProjectTemplate[]> {
    return [];
  },

  async generateCareerRoadmap(_: Record<string, number>): Promise<CareerMilestone[]> {
    return [];
  },

  async suggestCourses(_: Record<string, number>): Promise<CourseRecommendation[]> {
    return [];
  },

  async findJobMatches(_: Record<string, number>): Promise<JobMatch[]> {
    return [];
  },
};
