
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

  async generateMultimodalSolution(topic: string, mode: ExplanationMode, wasCorrect: boolean, studentAnswer: string): Promise<MultimodalResult> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Topic: "${topic}". Student Answer: "${studentAnswer}". Result: ${wasCorrect ? 'Correct' : 'Incorrect'}. Mode: ${mode}`,
        config: {
          systemInstruction: `Role: You are an expert adaptive tutor.
          Task: A student has just answered a question. Generate an explanation in the requested [Mode] format.
          
          Mode Definitions:
          - Flowchart: Output a JSON array of process steps (Start -> Logic -> End) that logically leads to the correct answer.
          - Analogy: Explain the concept using a relatable real-world metaphor (e.g., "Think of a Capacitor like a water tank").
          - Concept Map: Show how this concept relates to two other prerequisites in the curriculum hierarchy (nodes and relations).
          - Theoretical: Provide a standard, deep-dive academic explanation.
          
          Constraint: Only output the requested mode. Use clear, encouraging language. Output JSON only.`,
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              mode: { type: Type.STRING },
              content: { type: Type.STRING, description: "Main text content for Analogy or Theoretical" },
              steps: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Steps for Flowchart" },
              connections: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT,
                  properties: { from: { type: Type.STRING }, to: { type: Type.STRING }, relation: { type: Type.STRING } }
                },
                description: "Connections for Concept Map"
              }
            },
            required: ['mode', 'content']
          }
        }
      });
      
      const result = JSON.parse(response.text || "{}");
      return result;
    } catch (e) {
      console.error(e);
      // Fallback
      return { 
        mode: mode, 
        content: "We encountered a momentary glitch in the matrix. Let's stick to the theory: Review the core principles of this topic in your textbook." 
      };
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
      return response.text || "Focus on reviewing your recent notes.";
    } catch (e) {
      return "Review your core subjects today.";
    }
  },

  async getStudyCoachResponse(history: ChatMessage[], weakSubjects: string[]): Promise<string> {
      try {
          const chat = ai.chats.create({
              model: 'gemini-3-flash-preview',
              config: { 
                systemInstruction: `You are Spark, a friendly AI Coach. The student struggles in: ${weakSubjects.join(', ')}. Keep responses under 30 words, encouraging, and emoji-friendly.`,
                thinkingConfig: { thinkingBudget: 0 }
              },
              history: history.slice(0, -1).map(h => ({ role: h.role, parts: [{ text: h.text }] }))
          });
          const result = await chat.sendMessage({ message: history[history.length - 1].text });
          return result.text || "";
      } catch (e) {
          if (handleApiError(e) === "QUOTA_EXCEEDED") return "I'm a bit overwhelmed right now! Give me a minute to catch my breath. 💨";
          return "I'm having a bit of trouble connecting to the cloud. Try again! 🌥️";
      }
  },

  // Optimized for speed with thinkingBudget: 0 and direct JSON schema
  async generateQuiz(topic: string, difficulty: string): Promise<QuizQuestion | string> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Create a single high-quality multiple choice question about: ${topic}. Difficulty: ${difficulty}. Output pure JSON.`,
        config: {
          systemInstruction: `Educational engine. Output JSON only. 
          Fields: question (text), options (string array of 4), correctIndex (0-3), explanation (why), theory (background), steps (array of 3-5 solving steps), difficulty (string).`,
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
      if (!response.text) throw new Error("No text returned");
      return JSON.parse(response.text);
    } catch (e) {
      const errType = handleApiError(e);
      return errType;
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

      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map((c: any) => c.web ? { title: c.web.title, uri: c.web.uri } : null)
        .filter(Boolean) || [];

      return {
        id: Date.now().toString(),
        role: 'model',
        text: response.text || "I couldn't find information on that.",
        sources: sources
      };
    } catch (e) {
      if (handleApiError(e) === "QUOTA_EXCEEDED") return { id: Date.now().toString(), role: 'model', text: "Search quota exceeded. Please wait 60 seconds." };
      return { id: Date.now().toString(), role: 'model', text: "Service unavailable." };
    }
  },

  async analyzeClassroomImage(base64Image: string): Promise<ConfusionAnalysis> {
    try {
      const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
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
              mood: { type: Type.STRING, enum: ['focused', 'confused', 'distracted', 'engaged'] }
            }
          }
        }
      });
      return JSON.parse(response.text || "{}");
    } catch (e) {
      handleApiError(e);
      return { confusionScore: 0, summary: "Could not analyze image.", mood: "focused" };
    }
  },

  async analyzeStudentAttention(base64Image: string): Promise<ConfusionAnalysis> {
    try {
      const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
            { text: "Analyze the student's visible biometric and behavioral state." }
          ]
        },
        config: {
          systemInstruction: `You are an educational vision AI. Analyze the student's confusion level (0-100) and cognitive state based on:
          - Eye gaze, focus, and tracking (eye focus)
          - Head orientation, tilt, and positioning
          - Overall body posture and leaning
          - Facial muscle tension (especially mouth/jaw)
          - Eyebrow movement (e.g., furrowing indicating high cognitive load)
          
          Provide:
          - confusionScore: integer 0-100
          - summary: short descriptive sentence summarizing student's current mood/state
          - mood: string enum ['focused', 'confused', 'distracted', 'engaged', 'frustrated', 'bored']
          
          Output JSON only.`,
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              confusionScore: { type: Type.INTEGER },
              summary: { type: Type.STRING },
              mood: { type: Type.STRING, enum: ['focused', 'confused', 'distracted', 'engaged', 'frustrated', 'bored'] }
            },
            required: ['confusionScore', 'summary', 'mood']
          }
        }
      });
      return JSON.parse(response.text || "{}");
    } catch (e) {
      handleApiError(e);
      return { confusionScore: 0, summary: "Tracking paused.", mood: "focused" };
    }
  },

  async submitSessionReport(data: any, isPrivate: boolean): Promise<void> {
    await DatabaseService.logSession(data.studentId, data.mode, data);
  },

  /**
   * Fetches the latest proctoring oversight logs from DatabaseService.
   */
  async getProctoringLogs(): Promise<any[]> {
    return await DatabaseService.getRecentProctoringLogs();
  },

  async createLessonPlan(subject: string, grade: string, objectives: string): Promise<LessonPlan> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Subject: ${subject}. Grade: ${grade}. Objectives: ${objectives}.`,
        config: {
          systemInstruction: "Create a professional adaptive lesson plan with a PBL activity and discussion questions. Output JSON only.",
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
      return JSON.parse(response.text || "{}");
    } catch (e) {
      handleApiError(e);
      throw e;
    }
  },

  async analyzePeerReview(reviewText: string): Promise<PeerReviewAnalysis> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview', 
        contents: `Analyze: "${reviewText}"`,
        config: {
            systemInstruction: "Analyze peer review for teamwork and creativity scores (0-100). Provide objective feedback. Output JSON only.",
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
      return JSON.parse(response.text || "{}");
    } catch (e) {
        handleApiError(e);
        return { teamworkScore: 0, creativityScore: 0, feedback: "Error" };
    }
  },

  async generateAdminReport(stats: any): Promise<AdminReport> {
      try {
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `Stats: ${JSON.stringify(stats)}`,
              config: {
                  systemInstruction: "Generate an executive administrative report. Output JSON only.",
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
          return JSON.parse(response.text || "{}");
      } catch (e) {
          handleApiError(e);
          return { institutionHealthPulse: "Unavailable", overallMastery: 0, adoptionRate: 0, studentSatisfaction: 0, teacherAdoption: 0, topDepartment: "N/A", adminConfidenceScore: 0 };
      }
  },

  async generateWeeklyReportText(stats: any): Promise<string> {
      try {
          const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Stats: ${JSON.stringify(stats)}`,
            config: {
              systemInstruction: "Write a professional weekly report in Markdown.",
              thinkingConfig: { thinkingBudget: 0 }
            }
          });
          return response.text || "Report generation failed.";
      } catch (e) {
          handleApiError(e);
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
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                }
            }
        });
        return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    } catch (e) {
        handleApiError(e);
        return null;
    }
  },

  async transcribeAudio(audioBase64: string, mimeType: string = 'audio/wav'): Promise<string> {
      try {
          const base64Data = audioBase64.includes(',') ? audioBase64.split(',')[1] : audioBase64;
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: {
                  parts: [
                      { inlineData: { mimeType: mimeType, data: base64Data } },
                      { text: "Transcribe clearly." }
                  ]
              },
              config: { thinkingConfig: { thinkingBudget: 0 } }
          });
          return response.text || "";
      } catch (e) {
          handleApiError(e);
          return "";
      }
  },

  async getInterviewQuestion(role: string): Promise<string> {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate a single challenging interview question for a ${role} role. Under 20 words.`,
            config: { thinkingConfig: { thinkingBudget: 0 } }
        });
        return response.text?.trim() || "Tell me about yourself.";
    } catch (e) {
        handleApiError(e);
        return "Tell me about a time you worked in a team.";
    }
  },

  async analyzeInterviewResponse(audioBase64: string, question: string): Promise<InterviewAnalysis> {
    try {
        const base64Data = audioBase64.includes(',') ? audioBase64.split(',')[1] : audioBase64;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'audio/wav', data: base64Data } },
                    { text: `Question: "${question}". Analyze response.` }
                ]
            },
            config: {
                systemInstruction: "Analyze interview response for hiring probability and feedback. Output JSON only.",
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
        return JSON.parse(response.text || "{}");
    } catch (e) {
        handleApiError(e);
        return { transcription: "Error processing audio.", confidenceScore: 0, hiringProbability: 0, feedback: "Please try again.", keywordsDetected: [] };
    }
  },

  async analyzeLectureVideo(videoBase64: string, mimeType: string = 'video/mp4'): Promise<LectureSummary> {
      try {
          const base64Data = videoBase64.includes(',') ? videoBase64.split(',')[1] : videoBase64;
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: {
                  parts: [
                      { inlineData: { mimeType: mimeType, data: base64Data } },
                      { text: "Analyze lecture video for chapters and flashcards." }
                  ]
              },
              config: {
                systemInstruction: "Output JSON summary and flashcards only.",
                thinkingConfig: { thinkingBudget: 0 },
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
          handleApiError(e);
          return { title: "Error", chapters: [], flashcards: [] };
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
      
      const links = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map((c: any) => {
          if (c.maps) return { title: c.maps.title, uri: c.maps.uri };
          if (c.web) return { title: c.web.title, uri: c.web.uri };
          return null;
        })
        .filter(Boolean) || [];

      return {
        text: response.text || "Here is what I found.",
        links: links
      };
    } catch (e) {
      handleApiError(e);
      return { text: "Map service unavailable.", links: [] };
    }
  },

  async analyzeWhiteboard(base64Image: string): Promise<string> {
    try {
      const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
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
      return response.text || "No text found.";
    } catch (e) {
      handleApiError(e);
      return "Error analyzing image.";
    }
  },

  async reviewResume(text: string): Promise<ResumeFeedback> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Resume: "${text}"`,
        config: {
          systemInstruction: "Review resume for score and professional summary. Output JSON only.",
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
      return JSON.parse(response.text || "{}");
    } catch (e) {
      handleApiError(e);
      return { score: 0, suggestions: [], rewrittenSummary: "Error" };
    }
  },

  async generateDailyBriefing(tasks: Task[], events: CalendarEvent[]): Promise<string> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Tasks: ${JSON.stringify(tasks)}. Events: ${JSON.stringify(events)}.`,
        config: {
          systemInstruction: "Generate a very concise, motivating daily greeting and a 1-sentence schedule summary. Maximum 30 words total. Be punchy and energetic.",
          thinkingConfig: { thinkingBudget: 0 }
        }
      });
      return response.text || "Have a productive day!";
    } catch (e) {
      return "Ready to start the day.";
    }
  },

  async autoSchedule(task: string, events: CalendarEvent[]): Promise<{startTime: string, reason: string}> {
      try {
          return { startTime: new Date().toISOString(), reason: "Free slot found" };
      } catch (e) {
          return { startTime: "", reason: "Error" };
      }
  },

  async prioritizeTasks(tasks: Task[]): Promise<Task[]> {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Prioritize: ${JSON.stringify(tasks)}`,
             config: {
                systemInstruction: "Return task list sorted by priority. Output JSON only.",
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
        return JSON.parse(response.text || "[]");
    } catch(e) {
        handleApiError(e);
        return tasks;
    }
  },

  async sortTasksByDeadline(tasks: Task[]): Promise<Task[]> {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Sort: ${JSON.stringify(tasks)}`,
             config: {
                systemInstruction: "Sort tasks by deadline ascending. Output JSON only.",
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
        return JSON.parse(response.text || "[]");
    } catch(e) {
        handleApiError(e);
        return tasks;
    }
  },

  async getConnectChatResponse(text: string): Promise<string> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: text,
        config: {
          systemInstruction: "You are a helpful AI assistant. Keep answers concise and friendly.",
          thinkingConfig: { thinkingBudget: 0 },
          tools: [{ googleSearch: {} }]
        }
      });
      return response.text || "I couldn't process that request.";
    } catch (e) {
      if (handleApiError(e) === "QUOTA_EXCEEDED") return "Quota reached. Please slow down!";
      return "AI is currently offline.";
    }
  },

  async planEvent(prompt: string): Promise<EventPlan> {
      try {
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `Plan: "${prompt}"`,
              config: {
                  systemInstruction: "Create an event plan with checklist, email, and budget. Output JSON only.",
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
          return JSON.parse(response.text || "{}");
      } catch (e) {
          handleApiError(e);
          return { checklist: ["Define goal"], emailDraft: "Error", budgetEstimate: "0" };
      }
  },

  async generateEventDescription(base64Image: string): Promise<EventPost> {
    try {
      const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
            { text: "Generate Instagram caption for this event." }
          ]
        },
        config: {
          systemInstruction: "Output JSON caption and hashtags only.",
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
      return JSON.parse(response.text || "{}");
    } catch (e) {
      handleApiError(e);
      return { caption: "Join us!", hashtags: ["#event"] };
    }
  },

  async getWellnessChatResponse(history: ChatMessage[]): Promise<string> {
      try {
          const chat = ai.chats.create({
              model: 'gemini-3-flash-preview',
              config: { 
                systemInstruction: "You are Lumi, a compassionate AI wellness companion. Keep responses warm and concise.",
                thinkingConfig: { thinkingBudget: 0 }
              },
              history: history.slice(0, -1).map(h => ({ role: h.role, parts: [{ text: h.text }] }))
          });
          const result = await chat.sendMessage({ message: history[history.length - 1].text });
          return result.text || "I'm here for you.";
      } catch (e) {
          if (handleApiError(e) === "QUOTA_EXCEEDED") return "I'm listening, but I'm processing too many thoughts right now. Please take a deep breath while I reset.";
          return "I'm having trouble connecting right now, but I'm here listening.";
      }
  },

  async analyzeMoodEntry(base64Audio: string): Promise<MoodEntry> {
      try {
          const base64Data = base64Audio.includes(',') ? base64Audio.split(',')[1] : base64Audio;
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: {
                  parts: [
                      { inlineData: { mimeType: 'audio/wav', data: base64Data } },
                      { text: "Analyze voice journal for sentiment and advice." }
                  ]
              },
              config: {
                  systemInstruction: "Output JSON sentiment, score, and advice only.",
                  thinkingConfig: { thinkingBudget: 0 },
                  responseMimeType: 'application/json',
                  responseSchema: {
                      type: Type.OBJECT,
                      properties: {
                          transcription: { type: Type.STRING },
                          sentiment: { type: Type.STRING, enum: ['Happy', 'Calm', 'Stressed', 'Anxious'] },
                          score: { type: Type.INTEGER },
                          advice: { type: Type.STRING }
                      }
                  }
              }
          });
          return JSON.parse(response.text || "{}");
      } catch (e) {
          handleApiError(e);
          return { transcription: "Audio processing failed.", sentiment: "Calm", score: 50, advice: "Take a deep breath." };
      }
  },

  async matchScholarships(studentProfile: any): Promise<ScholarshipMatch[]> {
      try {
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `Profile: ${JSON.stringify(studentProfile)}`,
              config: {
                  systemInstruction: "Find scholarship matches. Output JSON array only.",
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
          return JSON.parse(response.text || "[]");
      } catch (e) {
          handleApiError(e);
          return [];
      }
  },

  async analyzeSafetyFeed(base64Image: string): Promise<SafetyAlert> {
      try {
          const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
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
                          severity: { type: Type.STRING, enum: ['Safe', 'Caution', 'Danger'] },
                          description: { type: Type.STRING },
                          actionItem: { type: Type.STRING }
                      }
                  }
              }
          });
          return JSON.parse(response.text || "{}");
      } catch (e) {
          handleApiError(e);
          return { severity: 'Safe', description: 'Analysis failed.', actionItem: 'Check manual feed.' };
      }
  },

  async generateProjectTemplates(query: string): Promise<ProjectTemplate[]> {
      try {
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `Topic: "${query}"`,
              config: {
                  systemInstruction: "Generate PBL templates. Output JSON array only.",
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
          return JSON.parse(response.text || "[]");
      } catch (e) {
          handleApiError(e);
          return [];
      }
  }
};
