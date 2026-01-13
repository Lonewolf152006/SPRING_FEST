import { GoogleGenAI, Type, Modality } from "@google/genai";
import { QuizQuestion, ConfusionAnalysis, ExamProctoringAnalysis, PeerReviewAnalysis, ChatMessage, ClassInsights, LessonPlan, AdminReport, InterviewAnalysis, LectureSummary, CampusMapResponse, ResumeFeedback, CalendarEvent, Task, EventPlan, EventPost, MoodEntry, ScholarshipMatch, SafetyAlert, ProjectTemplate, ExplanationMode, MultimodalResult, PeerReview } from "../types";
import { DatabaseService } from "./databaseService";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const handleApiError = (e: any) => {
  console.error("Gemini API Error:", e);
  if (e?.message?.includes("429") || e?.message?.includes("quota")) {
    return "QUOTA_EXCEEDED";
  }
  return "GENERAL_ERROR";
};

export const GeminiService = {
  async getMasteryScores(userId: string = 'S1'): Promise<Record<string, number>> {
    return await DatabaseService.getMasteryScores(userId);
  },

  async updateMasteryScore(subjectId: string, delta: number, userId: string = 'S1') {
    const scores = await DatabaseService.getMasteryScores(userId);
    const currentScore = scores[subjectId] || 0;
    const newScore = Math.max(0, Math.min(100, currentScore + delta));
    await DatabaseService.updateMasteryScore(userId, subjectId, newScore);
  },

  async analyzeExamProctoring(base64Image: string): Promise<ExamProctoringAnalysis> {
    try {
      const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
            { 
              text: `Detect: 1. Face visibility. 2. Attention (0-100). 3. Confusion (0-100). 4. Stress (0-100). 5. Confidence (0-100).` 
            }
          ]
        },
        config: {
          systemInstruction: "Act as a proctoring analysis engine. Output JSON only.",
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              faceDetected: { type: Type.BOOLEAN },
              attentionScore: { type: Type.INTEGER },
              confusionScore: { type: Type.INTEGER },
              stressScore: { type: Type.INTEGER },
              confidenceScore: { type: Type.INTEGER }
            },
            required: ['faceDetected', 'attentionScore', 'confusionScore', 'stressScore', 'confidenceScore']
          }
        }
      });
      return JSON.parse(response.text || "{}");
    } catch (e) {
      handleApiError(e);
      return { faceDetected: false, attentionScore: 0, confusionScore: 0, stressScore: 0, confidenceScore: 0 };
    }
  },

  async generateAnonymousSummary(reviews: PeerReview[]): Promise<string> {
    try {
      if (reviews.length === 0) return "No peer insights have been shared yet.";
      const reviewText = reviews.map(r => `[T:${r.teamworkScore}, Cr:${r.creativityScore}, Co:${r.communicationScore}] Feedback: ${r.comment}`).join("\n---\n");
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Summarize: ${reviewText}`,
        config: {
          systemInstruction: "You are an expert pedagogical coach. Synthesize peer feedback into a single, constructive, anonymized summary. Max 100 words.",
          thinkingConfig: { thinkingBudget: 0 }
        }
      });
      return response.text || "Synthesis engine encountered a delay.";
    } catch (e) {
      if (handleApiError(e) === "QUOTA_EXCEEDED") return "Quota reached. Please wait a moment before distilling insights.";
      return "The Anonymization Engine is currently distilling insights.";
    }
  },

  async generateMultimodalSolution(topic: string, mode: ExplanationMode, wasCorrect: boolean, studentAnswer: string): Promise<MultimodalResult | string> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Topic: ${topic}. Mode: ${mode}. Student was ${wasCorrect ? 'correct' : 'incorrect'}. Student answer: ${studentAnswer}`,
        config: {
          systemInstruction: "Provide a multi-modal educational explanation. Output JSON matching the MultimodalResult type.",
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              mode: { type: Type.STRING },
              content: { type: Type.STRING },
              steps: { type: Type.ARRAY, items: { type: Type.STRING } },
              connections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    from: { type: Type.STRING },
                    to: { type: Type.STRING }
                  }
                }
              }
            },
            required: ['mode', 'content']
          }
        }
      });
      return JSON.parse(response.text || "{}") as MultimodalResult;
    } catch (e) {
      const err = handleApiError(e);
      return err === "QUOTA_EXCEEDED" ? "QUOTA_EXCEEDED" : "An error occurred generating the explanation.";
    }
  },

  async generateStudyGoals(topics: string[]): Promise<string> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Suggest a study goal for: ${topics.join(', ')}`,
        config: { systemInstruction: "Output a single short, motivating study goal." }
      });
      return response.text?.trim() || "Stay focused on your core concepts.";
    } catch (e) {
      return "Master today's specific topics.";
    }
  },

  async getStudyCoachResponse(history: ChatMessage[], weakSubjects: string[]): Promise<string> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: history.map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.text}`).join('\n'),
        config: {
          systemInstruction: `You are Spark, a motivating AI Study Coach. Weak areas: ${weakSubjects.join(', ')}. Keep it brief and encouraging.`
        }
      });
      return response.text || "I'm here to help you master these concepts!";
    } catch (e) {
      return "Let's keep working on your study targets.";
    }
  },

  async submitSessionReport(data: any, isDiscovery: boolean) {
    await DatabaseService.logSession(data.studentId, isDiscovery ? 'DISCOVERY' : 'PRACTICE', data);
  },

  async analyzeStudentAttention(base64Image: string): Promise<ConfusionAnalysis> {
    try {
      const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { 
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Data } }, 
            { text: "Examine the student image. Process: 1. Eye gaze (where they are looking), 2. Head orientation/tilt (curiosity or distraction), 3. Posture (slumped vs alert), 4. Facial tension (brow furrowing), 5. Eye focus (pupil fixity). Based on these biometric markers, provide a confusionScore (0-100) and a mood summary (focused, confused, distracted, or engaged)." }
          ] 
        },
        config: {
          systemInstruction: "You are a high-precision biometric pedagogy interpretator. Analyze subtle physical cues to detect confusion, focus, or distraction. Output strictly JSON.",
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              confusionScore: { type: Type.INTEGER },
              summary: { type: Type.STRING },
              mood: { type: Type.STRING, enum: ['focused', 'confused', 'distracted', 'engaged'] }
            },
            required: ['confusionScore', 'summary', 'mood']
          }
        }
      });
      return JSON.parse(response.text || '{"confusionScore":0,"summary":"Biometric link stabilizing...","mood":"focused"}');
    } catch (e) {
      return { confusionScore: 0, summary: "Neural synchronization delayed.", mood: 'focused' };
    }
  },

  async generateQuiz(topic: string, difficulty: 'easy' | 'medium' | 'hard'): Promise<QuizQuestion | string> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Create a ${difficulty} quiz question about ${topic}.`,
        config: {
          systemInstruction: "Output JSON for a quiz question.",
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctIndex: { type: Type.INTEGER },
              explanation: { type: Type.STRING },
              theory: { type: Type.STRING },
              steps: { type: Type.ARRAY, items: { type: Type.STRING } },
              difficulty: { type: Type.STRING }
            },
            required: ['question', 'options', 'correctIndex', 'explanation', 'theory', 'steps']
          }
        }
      });
      return JSON.parse(response.text || "{}");
    } catch (e) {
      return handleApiError(e) === "QUOTA_EXCEEDED" ? "QUOTA_EXCEEDED" : "ERROR";
    }
  },

  async getProjectHelp(query: string): Promise<ChatMessage> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: query,
        config: {
          tools: [{ googleSearch: {} }],
          systemInstruction: "You are a project research assistant. Use Google Search for facts."
        }
      });
      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => ({
        title: c.web?.title || "Source",
        uri: c.web?.uri || ""
      })) || [];
      return { id: Date.now().toString(), role: 'model', text: response.text || "", sources };
    } catch (e) {
      return { id: Date.now().toString(), role: 'model', text: "I'm having trouble accessing my research modules." };
    }
  },

  async analyzePeerReview(text: string): Promise<PeerReviewAnalysis> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Evaluate objectivity and feedback: ${text}`,
        config: {
          systemInstruction: "Analyze peer review. Output JSON.",
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              teamworkScore: { type: Type.INTEGER },
              creativityScore: { type: Type.INTEGER },
              feedback: { type: Type.STRING }
            }
          }
        }
      });
      return JSON.parse(response.text || '{"teamworkScore":50,"creativityScore":50,"feedback":"Balanced"}');
    } catch (e) {
      return { teamworkScore: 0, creativityScore: 0, feedback: "Analysis engine offline." };
    }
  },

  async createLessonPlan(subject: string, grade: string, objectives: string): Promise<LessonPlan> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Subject: ${subject}. Grade: ${grade}. Objectives: ${objectives}`,
        config: {
          systemInstruction: "Generate a lesson plan JSON.",
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              topic: { type: Type.STRING },
              pblActivity: { type: Type.STRING },
              discussionQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
              formativeAssessment: { type: Type.STRING }
            }
          }
        }
      });
      return JSON.parse(response.text || "{}");
    } catch (e) {
      return { topic: subject, pblActivity: "Error generating plan", discussionQuestions: [], formativeAssessment: "" };
    }
  },

  async analyzeClassroomImage(base64: string): Promise<ConfusionAnalysis> {
    return this.analyzeStudentAttention(base64);
  },

  async generateAdminReport(stats: any): Promise<AdminReport> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Stats: ${JSON.stringify(stats)}`,
        config: {
          systemInstruction: "Generate an institutional admin report JSON.",
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              institutionHealthPulse: { type: Type.STRING },
              overallMastery: { type: Type.NUMBER },
              adoptionRate: { type: Type.NUMBER },
              studentSatisfaction: { type: Type.NUMBER },
              teacherAdoption: { type: Type.NUMBER },
              topDepartment: { type: Type.STRING },
              adminConfidenceScore: { type: Type.NUMBER }
            }
          }
        }
      });
      return JSON.parse(response.text || "{}");
    } catch (e) {
      return { institutionHealthPulse: "Syncing...", overallMastery: 0, adoptionRate: 0, studentSatisfaction: 0, teacherAdoption: 0, topDepartment: "", adminConfidenceScore: 0 };
    }
  },

  async getInterviewQuestion(role: string): Promise<string> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate an interview question for: ${role}`,
        config: { systemInstruction: "Output one clear interview question only." }
      });
      return response.text || "Tell me about your most challenging project.";
    } catch (e) {
      return "Describe your strengths.";
    }
  },

  async generateSpeech(text: string): Promise<string | null> {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say naturally: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          }
        }
      });
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    } catch (e) {
      return null;
    }
  },

  async analyzeInterviewResponse(base64Audio: string, question: string): Promise<InterviewAnalysis> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        contents: {
          parts: [
            { inlineData: { mimeType: 'audio/pcm;rate=16000', data: base64Audio } },
            { text: `Question was: ${question}. Analyze my answer.` }
          ]
        },
        config: {
          systemInstruction: "Analyze interview performance JSON.",
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              transcription: { type: Type.STRING },
              confidenceScore: { type: Type.NUMBER },
              hiringProbability: { type: Type.NUMBER },
              feedback: { type: Type.STRING },
              keywordsDetected: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          }
        }
      });
      return JSON.parse(response.text || "{}");
    } catch (e) {
      return { transcription: "Error", confidenceScore: 0, hiringProbability: 0, feedback: "Analysis failed", keywordsDetected: [] };
    }
  },

  async reviewResume(text: string): Promise<ResumeFeedback> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: text,
        config: {
          systemInstruction: "Provide resume feedback JSON.",
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
              rewrittenSummary: { type: Type.STRING }
            }
          }
        }
      });
      return JSON.parse(response.text || "{}");
    } catch (e) {
      return { score: 0, suggestions: [], rewrittenSummary: "" };
    }
  },

  async analyzeLectureVideo(base64: string, mimeType: string): Promise<LectureSummary> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ inlineData: { mimeType, data: base64 } }, { text: "Summarize this lecture." }] },
        config: {
          systemInstruction: "Generate lecture summary with chapters and flashcards JSON.",
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              chapters: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    timestamp: { type: Type.STRING },
                    title: { type: Type.STRING },
                    summary: { type: Type.STRING }
                  }
                }
              },
              flashcards: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    front: { type: Type.STRING },
                    back: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      });
      return JSON.parse(response.text || "{}");
    } catch (e) {
      return { title: "Error", chapters: [], flashcards: [] };
    }
  },

  async transcribeAudio(base64: string, mimeType: string): Promise<string> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        contents: { parts: [{ inlineData: { mimeType, data: base64 } }, { text: "Transcribe this." }] }
      });
      return response.text || "";
    } catch (e) {
      return "";
    }
  },

  async askCampusGuide(query: string, lat?: number, lng?: number): Promise<CampusMapResponse> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: query,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: lat && lng ? { retrievalConfig: { latLng: { latitude: lat, longitude: lng } } } : undefined,
          systemInstruction: "You are a campus map guide."
        }
      });
      const links = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => ({
        title: c.maps?.title || "Location",
        uri: c.maps?.uri || ""
      })) || [];
      return { text: response.text || "Here is what I found on the map.", links };
    } catch (e) {
      return { text: "I'm having trouble connecting to the map services.", links: [] };
    }
  },

  async generateDailyBriefing(tasks: Task[], events: CalendarEvent[]): Promise<string> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Tasks: ${JSON.stringify(tasks)}. Events: ${JSON.stringify(events)}`,
        config: { systemInstruction: "Provide a short, motivating daily briefing." }
      });
      return response.text || "You've got a busy day ahead, stay focused!";
    } catch (e) {
      return "Make today productive!";
    }
  },

  async autoSchedule(task: string, events: CalendarEvent[]): Promise<{ startTime: string; reason: string }> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Task: ${task}. Events: ${JSON.stringify(events)}`,
        config: {
          systemInstruction: "Suggest a start time for the task based on events. Output JSON.",
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              startTime: { type: Type.STRING },
              reason: { type: Type.STRING }
            }
          }
        }
      });
      return JSON.parse(response.text || '{"startTime":"","reason":"Error"}');
    } catch (e) {
      return { startTime: "", reason: "Auto-scheduler offline" };
    }
  },

  async prioritizeTasks(tasks: Task[]): Promise<Task[]> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Prioritize these tasks: ${JSON.stringify(tasks)}`,
        config: {
          systemInstruction: "Prioritize tasks by high, medium, low. Output JSON array.",
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                priority: { type: Type.STRING },
                status: { type: Type.STRING },
                source: { type: Type.STRING }
              }
            }
          }
        }
      });
      return JSON.parse(response.text || "[]");
    } catch (e) {
      return tasks;
    }
  },

  async sortTasksByDeadline(tasks: Task[]): Promise<Task[]> {
    return [...tasks].sort((a, b) => (a.deadline || "").localeCompare(b.deadline || ""));
  },

  async getConnectChatResponse(prompt: string): Promise<string> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      return response.text || "";
    } catch (e) {
      return "Assistant currently unavailable.";
    }
  },

  async analyzeWhiteboard(base64: string): Promise<string> {
    try {
      const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: base64Data } }, { text: "Summarize these notes." }] }
      });
      return response.text || "";
    } catch (e) {
      return "Whiteboard analysis failed.";
    }
  },

  async planEvent(idea: string): Promise<EventPlan> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: idea,
        config: {
          systemInstruction: "Plan an event JSON.",
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              checklist: { type: Type.ARRAY, items: { type: Type.STRING } },
              emailDraft: { type: Type.STRING },
              budgetEstimate: { type: Type.STRING }
            }
          }
        }
      });
      return JSON.parse(response.text || "{}");
    } catch (e) {
      return { checklist: [], emailDraft: "", budgetEstimate: "" };
    }
  },

  async generateEventDescription(base64: string): Promise<EventPost> {
    try {
      const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: base64Data } }, { text: "Describe this poster." }] },
        config: {
          systemInstruction: "Generate social media caption and hashtags JSON.",
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              caption: { type: Type.STRING },
              hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          }
        }
      });
      return JSON.parse(response.text || "{}");
    } catch (e) {
      return { caption: "", hashtags: [] };
    }
  },

  async getWellnessChatResponse(history: ChatMessage[]): Promise<string> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: history.map(h => `${h.role === 'user' ? 'User' : 'Lumi'}: ${h.text}`).join('\n'),
        config: { systemInstruction: "You are Lumi, a wellness companion. Be empathetic and supportive." }
      });
      return response.text || "I'm here for you.";
    } catch (e) {
      return "I'm listening.";
    }
  },

  async analyzeMoodEntry(base64Audio: string): Promise<MoodEntry> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        contents: { parts: [{ inlineData: { mimeType: 'audio/pcm;rate=16000', data: base64Audio } }, { text: "Analyze mood." }] },
        config: {
          systemInstruction: "Analyze mood entry JSON.",
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              transcription: { type: Type.STRING },
              sentiment: { type: Type.STRING },
              advice: { type: Type.STRING },
              score: { type: Type.INTEGER }
            }
          }
        }
      });
      return JSON.parse(response.text || "{}");
    } catch (e) {
      return { transcription: "", sentiment: 'Calm', advice: "Take a deep breath.", score: 50 };
    }
  },

  async matchScholarships(student: any): Promise<ScholarshipMatch[]> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Student: ${JSON.stringify(student)}`,
        config: {
          systemInstruction: "Find scholarship matches JSON array.",
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                amount: { type: Type.STRING },
                matchReason: { type: Type.STRING },
                probability: { type: Type.NUMBER }
              }
            }
          }
        }
      });
      return JSON.parse(response.text || "[]");
    } catch (e) {
      return [];
    }
  },

  async analyzeSafetyFeed(base64: string): Promise<SafetyAlert> {
    try {
      const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: base64Data } }, { text: "Analyze security." }] },
        config: {
          systemInstruction: "Analyze security severity and actions JSON.",
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              severity: { type: Type.STRING },
              description: { type: Type.STRING },
              actionItem: { type: Type.STRING }
            }
          }
        }
      });
      return JSON.parse(response.text || '{"severity":"Safe","description":"Normal","actionItem":"None"}');
    } catch (e) {
      return { severity: 'Safe', description: "Sync delay", actionItem: "Maintain monitor" };
    }
  },

  async generateProjectTemplates(query: string): Promise<ProjectTemplate[]> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Project query: ${query}`,
        config: {
          systemInstruction: "Generate project templates JSON array.",
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                subject: { type: Type.STRING },
                difficulty: { type: Type.STRING },
                duration: { type: Type.STRING },
                description: { type: Type.STRING },
                milestones: { type: Type.ARRAY, items: { type: Type.STRING } },
                skillsTargeted: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          }
        }
      });
      return JSON.parse(response.text || "[]");
    } catch (e) {
      return [];
    }
  },
};