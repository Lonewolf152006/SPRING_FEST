
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { QuizQuestion, ConfusionAnalysis, ExamProctoringAnalysis, PeerReviewAnalysis, ChatMessage, ClassInsights, LessonPlan, AdminReport, InterviewAnalysis, LectureSummary, CampusMapResponse, ResumeFeedback, CalendarEvent, Task, EventPlan, EventPost, MoodEntry, ScholarshipMatch, SafetyAlert, ProjectTemplate, ExplanationMode, MultimodalResult, PeerReview, CareerMilestone, CourseRecommendation, JobMatch } from "../types";
import { DatabaseService } from "./databaseService";

// API key obtained exclusively from process.env.API_KEY as per guidelines.
const callGemini = async (message: string) => {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  const data = await res.json();
  return data.reply;
};


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
      const dataStr = (base64Image || "") as string;
      const base64Data = dataStr.includes(',') ? dataStr.split(',')[1] : dataStr;
      const response = await callGemini({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
            { text: `Detect: 1. Face visibility. 2. Attention (0-100). 3. Confusion (0-100). 4. Stress (0-100). 5. Confidence (0-100).` }
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
      return JSON.parse((response as any).text || "{}");
    } catch (e) {
      handleApiError(e);
      return { faceDetected: false, attentionScore: 0, confusionScore: 0, stressScore: 0, confidenceScore: 0 };
    }
  },

  async generateAnonymousSummary(reviews: PeerReview[]): Promise<string> {
    try {
      if (reviews.length === 0) return "No peer insights have been shared yet.";
      const reviewText = reviews.map(r => `[T:${r.teamworkScore}, Cr:${r.creativityScore}, Co:${r.communicationScore}] Feedback: ${r.comment}`).join("\n---\n");
      const response = await callGemini({
        model: 'gemini-3-flash-preview',
        contents: `Summarize: ${reviewText}`,
        config: {
          systemInstruction: "You are an expert pedagogical coach. Synthesize peer feedback into a single summary. Max 100 words.",
          thinkingConfig: { thinkingBudget: 0 }
        }
      });
      return (response as any).text || "Synthesis engine encountered a delay.";
    } catch (e) {
      return "The Anonymization Engine is currently distilling insights.";
    }
  },

  async generateMultimodalSolution(topic: string, mode: ExplanationMode, wasCorrect: boolean, studentAnswer: string): Promise<MultimodalResult> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Topic: "${topic}". Student Answer: "${studentAnswer}". Result: ${wasCorrect ? 'Correct' : 'Incorrect'}. Mode: ${mode}`,
        config: {
          systemInstruction: `Role: You are an expert adaptive tutor. Generate explanation in [Mode] format.`,
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              mode: { type: Type.STRING },
              content: { type: Type.STRING },
              steps: { type: Type.ARRAY, items: { type: Type.STRING } },
              connections: { 
                type: Type.ARRAY, 
                items: { type: Type.OBJECT, properties: { from: { type: Type.STRING }, to: { type: Type.STRING }, relation: { type: Type.STRING } } }
              }
            },
            required: ['mode', 'content']
          }
        }
      });
      return JSON.parse((response as any).text || "{}");
    } catch (e) {
      return { mode: mode, content: "Review core principles in your text." };
    }
  },

  async generateStudyGoals(subjects: string[]): Promise<string> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Subjects: ${subjects.join(', ')}`,
        config: {
          systemInstruction: "Generate one concise, motivating daily study goal.",
          thinkingConfig: { thinkingBudget: 0 }
        }
      });
      return (response as any).text || "Focus on reviewing your recent notes.";
    } catch (e) {
      return "Review your core subjects today.";
    }
  },

  async getStudyCoachResponse(history: ChatMessage[], weakSubjects: string[]): Promise<string> {
      try {
          const chat = ai.chats.create({
              model: 'gemini-3-flash-preview',
              config: { 
                systemInstruction: `Friendly AI Coach. Weaknesses: ${weakSubjects.join(', ')}. Max 30 words.`,
                thinkingConfig: { thinkingBudget: 0 }
              },
              history: history.slice(0, -1).map(h => ({ role: h.role, parts: [{ text: h.text }] }))
          });
          const result = await chat.sendMessage({ message: history[history.length - 1].text });
          return (result as any).text || "";
      } catch (e) {
          return "I'm having a bit of trouble connecting. Try again!";
      }
  },

  async generateQuiz(topic: string, difficulty: string): Promise<QuizQuestion | string> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Multiple choice question: ${topic}. Difficulty: ${difficulty}. JSON only.`,
        config: {
          systemInstruction: `Educational engine. Output JSON only.`,
          thinkingConfig: { thinkingBudget: 0 },
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
            required: ['question', 'options', 'correctIndex', 'explanation', 'theory', 'steps', 'difficulty']
          }
        }
      });
      return JSON.parse((response as any).text || "{}");
    } catch (e) {
      return handleApiError(e);
    }
  },

  async getProjectHelp(query: string): Promise<ChatMessage> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: query,
        config: {
          thinkingConfig: { thinkingBudget: 0 },
          tools: [{ googleSearch: {} }]
        }
      });

      const sources = (response as any).candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map((c: any) => c.web ? { title: c.web.title, uri: c.web.uri } : null)
        .filter(Boolean) || [];

      return {
        id: Date.now().toString(),
        role: 'model',
        text: (response as any).text || "I couldn't find info.",
        sources: sources
      };
    } catch (e) {
      return { id: Date.now().toString(), role: 'model', text: "Service unavailable." };
    }
  },

  async analyzeClassroomImage(base64Image: string): Promise<ConfusionAnalysis> {
    try {
      const dataStr = (base64Image || "") as string;
      const base64Data = dataStr.includes(',') ? dataStr.split(',')[1] : dataStr;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
            { text: "Analyze classroom confusion level (0-100) and mood." }
          ]
        },
        config: {
          systemInstruction: "Output JSON analysis only.",
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              confusionScore: { type: Type.INTEGER },
              summary: { type: Type.STRING },
              mood: { type: Type.STRING }
            }
          }
        }
      });
      return JSON.parse((response as any).text || "{}");
    } catch (e) {
      return { confusionScore: 0, summary: "Could not analyze image.", mood: "focused" };
    }
  },

  async analyzeStudentAttention(base64Image: string): Promise<ConfusionAnalysis> {
    try {
      const dataStr = (base64Image || "") as string;
      const base64Data = dataStr.includes(',') ? dataStr.split(',')[1] : dataStr;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
            { text: "Detailed biometric analysis of student's cognitive state." }
          ]
        },
        config: {
          systemInstruction: `Advanced biometric analyst. JSON only.`,
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              confusionScore: { type: Type.INTEGER },
              summary: { type: Type.STRING },
              mood: { type: Type.STRING }
            },
            required: ['confusionScore', 'summary', 'mood']
          }
        }
      });
      return JSON.parse((response as any).text || "{}");
    } catch (e) {
      return { confusionScore: 0, summary: "Link interrupted.", mood: "focused" };
    }
  },

  async submitSessionReport(data: any, isPrivate: boolean): Promise<void> {
    await DatabaseService.logSession(data.studentId, data.mode, data);
  },

  async getProctoringLogs(): Promise<any[]> {
    return await DatabaseService.getRecentProctoringLogs();
  },

  async createLessonPlan(subject: string, grade: string, objectives: string): Promise<LessonPlan> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Subject: ${subject}. Grade: ${grade}. Objectives: ${objectives}.`,
        config: {
          systemInstruction: "Create adaptive lesson plan. JSON only.",
          thinkingConfig: { thinkingBudget: 0 },
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
      return JSON.parse((response as any).text || "{}");
    } catch (e) {
      throw e;
    }
  },

  async analyzePeerReview(reviewText: string): Promise<PeerReviewAnalysis> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview', 
        contents: `Analyze: "${reviewText}"`,
        config: {
            systemInstruction: "Analyze peer review. JSON only.",
            thinkingConfig: { thinkingBudget: 0 },
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
      return JSON.parse((response as any).text || "{}");
    } catch (e) {
        return { teamworkScore: 0, creativityScore: 0, feedback: "Feedback analysis unavailable." };
    }
  },

  async generateAdminReport(stats: any): Promise<AdminReport> {
      try {
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `Stats: ${JSON.stringify(stats)}`,
              config: {
                  systemInstruction: "Generate executive report. JSON only.",
                  thinkingConfig: { thinkingBudget: 0 },
                  responseMimeType: 'application/json',
                  responseSchema: {
                      type: Type.OBJECT,
                      properties: {
                          institutionHealthPulse: { type: Type.STRING },
                          overallMastery: { type: Type.INTEGER },
                          adoptionRate: { type: Type.INTEGER },
                          studentSatisfaction: { type: Type.INTEGER },
                          teacherAdoption: { type: Type.INTEGER },
                          topDepartment: { type: Type.STRING },
                          adminConfidenceScore: { type: Type.INTEGER }
                      }
                  }
              }
          });
          return JSON.parse((response as any).text || "{}");
      } catch (e) {
          return { institutionHealthPulse: "Unavailable", overallMastery: 0, adoptionRate: 0, studentSatisfaction: 0, teacherAdoption: 0, topDepartment: "N/A", adminConfidenceScore: 0 };
      }
  },

  async generateWeeklyReportText(stats: any): Promise<string> {
      try {
          const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Stats: ${JSON.stringify(stats)}`,
            config: {
              systemInstruction: "Write professional report in Markdown.",
              thinkingConfig: { thinkingBudget: 0 }
            }
          });
          return (response as any).text || "Report generation failed.";
      } catch (e) {
          return "Error generating report.";
      }
  },

  async generateSpeech(text: string): Promise<string | null> {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: { parts: [{ text }] },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
                }
            }
        });
        return (response as any).candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    } catch (e) {
        return null;
    }
  },

  async transcribeAudio(audioBase64: string, mimeType: string = 'audio/wav'): Promise<string> {
      try {
          const dataStr = (audioBase64 || "") as string;
          const base64Data = dataStr.includes(',') ? dataStr.split(',')[1] : dataStr;
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: {
                  parts: [
                      { inlineData: { mimeType: mimeType, data: base64Data } },
                      { text: "Transcribe audio content accurately." }
                  ]
              },
              config: { thinkingConfig: { thinkingBudget: 0 } }
          });
          return (response as any).text || "";
      } catch (e) {
          return "";
      }
  },

  async getInterviewQuestion(role: string): Promise<string> {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Interview question for ${role}. Max 20 words.`,
            config: { thinkingConfig: { thinkingBudget: 0 } }
        });
        return (response as any).text?.trim() || "Tell me about yourself.";
    } catch (e) {
        return "Tell me about a time you worked in a team.";
    }
  },

  async analyzeInterviewResponse(audioBase64: string, question: string): Promise<InterviewAnalysis> {
    try {
        const dataStr = (audioBase64 || "") as string;
        const base64Data = dataStr.includes(',') ? dataStr.split(',')[1] : dataStr;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'audio/wav', data: base64Data } },
                    { text: `Question: "${question}". Analyze response.` }
                ]
            },
            config: {
                systemInstruction: "Analyze interview response. JSON only.",
                thinkingConfig: { thinkingBudget: 0 },
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        transcription: { type: Type.STRING },
                        confidenceScore: { type: Type.INTEGER },
                        hiringProbability: { type: Type.INTEGER },
                        feedback: { type: Type.STRING },
                        keywordsDetected: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                }
            }
        });
        return JSON.parse((response as any).text || "{}");
    } catch (e) {
        return { transcription: "Error processing audio.", confidenceScore: 0, hiringProbability: 0, feedback: "Analysis failed.", keywordsDetected: [] };
    }
  },

  async analyzeLectureVideo(videoBase64: string, mimeType: string = 'video/mp4'): Promise<LectureSummary> {
      try {
          const dataStr = (videoBase64 || "") as string;
          const base64Data = dataStr.includes(',') ? dataStr.split(',')[1] : dataStr;
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: {
                  parts: [
                      { inlineData: { mimeType: mimeType, data: base64Data } },
                      { text: "Analyze video lecture. JSON only." }
                  ]
              },
              config: {
                thinkingConfig: { thinkingBudget: 0 },
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    summary: { type: Type.STRING },
                    keyMoments: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { time: { type: Type.STRING }, label: { type: Type.STRING } } } },
                    flashcards: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { front: { type: Type.STRING }, back: { type: Type.STRING } } } },
                    smartNotes: { type: Type.ARRAY, items: { type: Type.STRING } },
                    quiz: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { question: { type: Type.STRING }, options: { type: Type.ARRAY, items: { type: Type.STRING } }, answer: { type: Type.STRING } } } }
                  }
                }
              }
          });
          return JSON.parse((response as any).text || "{}");
      } catch (e) {
          return { summary: "Lecture processing failed.", keyMoments: [], flashcards: [], smartNotes: [], quiz: [] };
      }
  },

  async askCampusGuide(query: string, lat?: number, lng?: number): Promise<CampusMapResponse> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: query,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: lat && lng ? { retrievalConfig: { latLng: { latitude: lat, longitude: lng } } } : undefined
        }
      });
      
      const links = (response as any).candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map((c: any) => {
          if (c.maps) return { title: c.maps.title, uri: c.maps.uri };
          if (c.web) return { title: c.web.title, uri: c.web.uri };
          return null;
        })
        .filter(Boolean) || [];

      return {
        text: (response as any).text || "Here is what I found.",
        links: links
      };
    } catch (e) {
      return { text: "Map service unavailable.", links: [] };
    }
  },

  async analyzeWhiteboard(base64Image: string): Promise<string> {
    try {
      const dataStr = (base64Image || "") as string;
      const base64Data = dataStr.includes(',') ? dataStr.split(',')[1] : dataStr;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
            { text: "Extract text and summarize whiteboard content." }
          ]
        },
        config: { thinkingConfig: { thinkingBudget: 0 } }
      });
      return (response as any).text || "No content extracted.";
    } catch (e) {
      return "Error analyzing whiteboard image.";
    }
  },

  async reviewResume(input: string, isPdf: boolean = false): Promise<ResumeFeedback> {
    try {
      const dataStr = (input || "") as string;
      const cleanedInput = dataStr.includes(',') ? dataStr.split(',')[1] : dataStr;
      const parts = isPdf 
        ? [{ inlineData: { mimeType: 'application/pdf', data: cleanedInput } }, { text: "Analyze for ATS score." }]
        : [{ text: `Resume: "${input}". Analyze.` }];

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts },
        config: {
          systemInstruction: "Review resume score (0-100). JSON only.",
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.INTEGER },
              suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
              rewrittenSummary: { type: Type.STRING }
            }
          }
        }
      });
      return JSON.parse((response as any).text || "{}");
    } catch (e) {
      return { score: 0, suggestions: [], rewrittenSummary: "Review unavailable." };
    }
  },

  async generateDailyBriefing(tasks: Task[], events: CalendarEvent[]): Promise<string> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Tasks: ${JSON.stringify(tasks)}. Events: ${JSON.stringify(events)}.`,
        config: {
          systemInstruction: "Generate a motivating schedule summary. Max 30 words.",
          thinkingConfig: { thinkingBudget: 0 }
        }
      });
      return (response as any).text || "Ready to start the day.";
    } catch (e) {
      return "Have a productive day!";
    }
  },

  async prioritizeTasks(tasks: Task[]): Promise<Task[]> {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Prioritize: ${JSON.stringify(tasks)}`,
             config: {
                systemInstruction: "Return task list sorted by priority. JSON only.",
                thinkingConfig: { thinkingBudget: 0 },
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            title: { type: Type.STRING },
                            status: { type: Type.STRING },
                            priority: { type: Type.STRING },
                            deadline: { type: Type.STRING },
                            source: { type: Type.STRING }
                        }
                    }
                }
            }
        });
        return JSON.parse((response as any).text || "[]");
    } catch(e) {
        return tasks;
    }
  },

  async sortTasksByDeadline(tasks: Task[]): Promise<Task[]> {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Sort: ${JSON.stringify(tasks)}`,
             config: {
                systemInstruction: "Sort tasks by deadline. JSON only.",
                thinkingConfig: { thinkingBudget: 0 },
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            title: { type: Type.STRING },
                            status: { type: Type.STRING },
                            priority: { type: Type.STRING },
                            deadline: { type: Type.STRING },
                            source: { type: Type.STRING }
                        }
                    }
                }
            }
        });
        return JSON.parse((response as any).text || "[]");
    } catch(e) {
        return tasks;
    }
  },

  async autoSchedule(task: string, events: CalendarEvent[]): Promise<{ startTime: string; reason: string }> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Task: "${task}". Events: ${JSON.stringify(events)}. Find 1-hour slot.`,
        config: {
          systemInstruction: "AI calendar assistant. JSON with 'startTime' (ISO) and 'reason'.",
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              startTime: { type: Type.STRING },
              reason: { type: Type.STRING }
            },
            required: ['startTime', 'reason']
          }
        }
      });
      return JSON.parse((response as any).text || "{}");
    } catch (e) {
      const fallback = new Date();
      fallback.setHours(fallback.getHours() + 2);
      return { startTime: fallback.toISOString(), reason: "Default allocation." };
    }
  },

  async getConnectChatResponse(text: string): Promise<string> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: text,
        config: {
          systemInstruction: "Helpful assistant. Concise.",
          thinkingConfig: { thinkingBudget: 0 },
          tools: [{ googleSearch: {} }]
        }
      });
      return (response as any).text || "I couldn't process that.";
    } catch (e) {
      return "AI link offline.";
    }
  },

  async planEvent(idea: string): Promise<EventPlan> {
      try {
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `Plan: "${idea}"`,
              config: {
                  systemInstruction: "Create event plan. JSON only.",
                  thinkingConfig: { thinkingBudget: 0 },
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
          return JSON.parse((response as any).text || "{}");
      } catch (e) {
          return { checklist: ["Define goal"], emailDraft: "Internal planning Error.", budgetEstimate: "0" };
      }
  },

  async generateEventDescription(base64Image: string): Promise<EventPost> {
    try {
      const dataStr = (base64Image || "") as string;
      const base64Data = dataStr.includes(',') ? dataStr.split(',')[1] : dataStr;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
            { text: "Generate Instagram caption." }
          ]
        },
        config: {
          systemInstruction: "Output JSON caption only.",
          thinkingConfig: { thinkingBudget: 0 },
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
      return JSON.parse((response as any).text || "{}");
    } catch (e) {
      return { caption: "Join our event!", hashtags: ["#event", "#zync"] };
    }
  },

  async getWellnessChatResponse(history: ChatMessage[]): Promise<string> {
      try {
          const chat = ai.chats.create({
              model: 'gemini-3-flash-preview',
              config: { 
                systemInstruction: "AI wellness companion. Warm and concise.",
                thinkingConfig: { thinkingBudget: 0 }
              },
              history: history.slice(0, -1).map(h => ({ role: h.role, parts: [{ text: h.text }] }))
          });
          const result = await chat.sendMessage({ message: history[history.length - 1].text });
          return (result as any).text || "I'm here for you.";
      } catch (e) {
          return "I'm listening.";
      }
  },

  async analyzeMoodEntry(base64Audio: string): Promise<MoodEntry> {
      try {
          const dataStr = (base64Audio || "") as string;
          const base64Data = dataStr.includes(',') ? dataStr.split(',')[1] : dataStr;
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: {
                  parts: [
                      { inlineData: { mimeType: 'audio/wav', data: base64Data } },
                      { text: "Analyze voice journal for sentiment." }
                  ]
              },
              config: {
                  systemInstruction: "JSON sentiment analysis only.",
                  thinkingConfig: { thinkingBudget: 0 },
                  responseMimeType: 'application/json',
                  responseSchema: {
                      type: Type.OBJECT,
                      properties: {
                          transcription: { type: Type.STRING },
                          sentiment: { type: Type.STRING },
                          score: { type: Type.INTEGER },
                          advice: { type: Type.STRING }
                      }
                  }
              }
          });
          return JSON.parse((response as any).text || "{}");
      } catch (e) {
          return { transcription: "Processing error.", sentiment: "Calm", score: 50, advice: "Take a deep breath." };
      }
  },

  async matchScholarships(studentProfile: any): Promise<ScholarshipMatch[]> {
      try {
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `Profile: ${JSON.stringify(studentProfile)}`,
              config: {
                  systemInstruction: "Match scholarships. JSON array only.",
                  thinkingConfig: { thinkingBudget: 0 },
                  responseMimeType: 'application/json',
                  responseSchema: {
                      type: Type.ARRAY,
                      items: {
                          type: Type.OBJECT,
                          properties: {
                              name: { type: Type.STRING },
                              amount: { type: Type.STRING },
                              matchReason: { type: Type.STRING },
                              probability: { type: Type.INTEGER }
                          }
                      }
                  }
              }
          });
          return JSON.parse((response as any).text || "[]");
      } catch (e) { return []; }
  },

  async analyzeSafetyFeed(base64Image: string): Promise<SafetyAlert> {
      try {
          const dataStr = (base64Image || "") as string;
          const base64Data = dataStr.includes(',') ? dataStr.split(',')[1] : dataStr;
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: {
                  parts: [
                      { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                      { text: "Detect safety concerns." }
                  ]
              },
              config: {
                  systemInstruction: "Output JSON safety alert only.",
                  thinkingConfig: { thinkingBudget: 0 },
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
          return JSON.parse((response as any).text || "{}");
      } catch (e) {
          return { severity: 'Safe', description: 'Monitor inactive.', actionItem: 'Check logs manually.' };
      }
  },

  async generateProjectTemplates(query: string): Promise<ProjectTemplate[]> {
      try {
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `Topic: "${query}"`,
              config: {
                  systemInstruction: "Generate PBL templates. JSON array only.",
                  thinkingConfig: { thinkingBudget: 0 },
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
          return JSON.parse((response as any).text || "[]");
      } catch (e) { return []; }
  },

  async generateCareerRoadmap(masteryScores: Record<string, number>): Promise<CareerMilestone[]> {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Scores: ${JSON.stringify(masteryScores)}. Roadmap. JSON.`,
            config: {
                thinkingConfig: { thinkingBudget: 0 },
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, duration: { type: Type.STRING }, status: { type: Type.STRING } }
                    }
                }
            }
        });
        return JSON.parse((response as any).text || "[]");
    } catch (e) { return []; }
  },

  async suggestCourses(masteryScores: Record<string, number>): Promise<CourseRecommendation[]> {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Scores: ${JSON.stringify(masteryScores)}. Gaps. JSON.`,
            config: {
                thinkingConfig: { thinkingBudget: 0 },
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: { id: { type: Type.STRING }, title: { type: Type.STRING }, provider: { type: Type.STRING }, gapSkill: { type: Type.STRING }, difficulty: { type: Type.STRING }, matchReason: { type: Type.STRING }, courseUrl: { type: Type.STRING } }
                    }
                }
            }
        });
        return JSON.parse((response as any).text || "[]");
    } catch (e) { return []; }
  },

  async findJobMatches(masteryScores: Record<string, number>): Promise<JobMatch[]> {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Scores: ${JSON.stringify(masteryScores)}. Jobs. JSON.`,
            config: {
                thinkingConfig: { thinkingBudget: 0 },
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: { id: { type: Type.STRING }, role: { type: Type.STRING }, company: { type: Type.STRING }, matchScore: { type: Type.INTEGER }, type: { type: Type.STRING }, tags: { type: Type.ARRAY, items: { type: Type.STRING } } }
                    }
                }
            }
        });
        return JSON.parse((response as any).text || "[]");
    } catch (e) { return []; }
  }
};
