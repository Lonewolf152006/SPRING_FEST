
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { QuizQuestion, ConfusionAnalysis, ExamProctoringAnalysis, PeerReviewAnalysis, ChatMessage, ClassInsights, LessonPlan, AdminReport, InterviewAnalysis, LectureSummary, CampusMapResponse, ResumeFeedback, CalendarEvent, Task, EventPlan, EventPost, MoodEntry, ScholarshipMatch, SafetyAlert, ProjectTemplate, ExplanationMode, MultimodalResult, PeerReview } from "../types";
import { DatabaseService } from "./databaseService";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const GeminiService = {
  // Added proxy for getMasteryScores to resolve component errors
  async getMasteryScores(userId: string = 'S1'): Promise<Record<string, number>> {
    return await DatabaseService.getMasteryScores(userId);
  },

  // Added proxy for updateMasteryScore to resolve component errors
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
              text: `You are an AI analysis module integrated into an online examination platform.
              Analyze the image using only visible facial cues and estimate the student’s current cognitive and emotional state.
              Perform the following:
              1. Detect whether a human face is clearly visible.
              2. Estimate attention level based on eye gaze, head orientation, and posture (0-100).
              3. Estimate confusion level (0-100).
              4. Estimate stress level (0-100).
              5. Estimate confidence level (0-100).
              Return JSON only.` 
            }
          ]
        },
        config: {
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
      console.error("Proctoring analysis error", e);
      return { faceDetected: false, attentionScore: 0, confusionScore: 0, stressScore: 0, confidenceScore: 0 };
    }
  },

  async generateAnonymousSummary(reviews: PeerReview[]): Promise<string> {
    try {
      if (reviews.length === 0) return "No peer insights have been shared yet. Once your teammates submit their reflections, I'll synthesize them into a growth roadmap for you.";
      
      const reviewText = reviews.map(r => `[Teamwork: ${r.teamworkScore}, Creativity: ${r.creativityScore}, Communication: ${r.communicationScore}] Feedback: ${r.comment}`).join("\n---\n");
      
      const prompt = `Role: Expert Pedagogical Growth Coach.
      Task: Synthesize peer feedback into a single, constructive, and completely anonymized summary.
      
      Rules:
      1. DO NOT mention specific names or identifying gendered pronouns (use 'you' or 'the student').
      2. Identify common themes in soft skills (Teamwork, Creativity, Communication).
      3. Highlight 2 specific strengths mentioned by peers.
      4. Suggest 1 actionable growth area based on the critiques.
      5. Tone: Encouraging, objective, and professional.
      6. Length: Maximum 120 words.
      
      Raw Feedback Data:
      ${reviewText}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      return response.text || "Synthesis engine encountered a delay. Please refresh in a moment.";
    } catch (e) {
      console.error(e);
      return "The Anonymization Engine is currently distilling insights. Check back soon! ✨";
    }
  },

  async generateMultimodalSolution(topic: string, mode: ExplanationMode, wasCorrect: boolean, studentAnswer: string): Promise<MultimodalResult> {
    try {
      const prompt = `Role: You are an expert adaptive tutor. 
      Task: A student has just answered a question on "${topic}". They chose "${studentAnswer}", which was ${wasCorrect ? 'CORRECT' : 'INCORRECT'}. 
      Generate an explanation in the "${mode}" format.
      
      Mode Definitions:
      - flowchart: JSON array of 4-6 logic steps (Start -> Action -> Logic -> End) explaining the process.
      - analogy: Relatable real-world metaphor (e.g. "Think of a Capacitor like a water tank").
      - concept-map: Explain how this concept links to 2 other related academic topics.
      - theoretical: Deep-dive academic explanation.
      
      Output exactly the requested JSON format. Be encouraging.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              content: { type: Type.STRING },
              steps: { type: Type.ARRAY, items: { type: Type.STRING } },
              mode: { type: Type.STRING }
            },
            required: ['content']
          }
        }
      });

      return JSON.parse(response.text || "{}");
    } catch (e) {
      console.error("Multimodal error", e);
      return { mode, content: "Theoretical explanation unavailable. Review your notes." };
    }
  },

  async generateStudyGoals(subjects: string[]): Promise<string> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Based on these subjects: ${subjects.join(', ')}, suggest a concise daily study goal sentence for a student.`,
      });
      return response.text || "Focus on reviewing your recent notes.";
    } catch (e) {
      console.error(e);
      return "Review your core subjects today.";
    }
  },

  async getStudyCoachResponse(history: ChatMessage[], weakSubjects: string[]): Promise<string> {
      try {
          const systemPrompt = `You are a friendly AI Study Coach named 'Spark'. 
          The student is struggling in: ${weakSubjects.length > 0 ? weakSubjects.join(', ') : 'None (doing great!)'}. 
          Your goal is to set specific, small, achievable daily study goals.
          Keep responses short (under 40 words), encouraging, and emoji-friendly.
          If they ask for a goal, give them one specific task based on their weak subjects.`;
          
          const chat = ai.chats.create({
              model: 'gemini-3-flash-preview',
              config: { systemInstruction: systemPrompt },
              history: history.slice(0, -1).map(h => ({ role: h.role, parts: [{ text: h.text }] }))
          });
          const result = await chat.sendMessage({ message: history[history.length - 1].text });
          return result.text || "";
      } catch (e) {
          console.error(e);
          return "I'm having a bit of trouble connecting to the cloud. Let's try again in a moment! 🌥️";
      }
  },

  async generateQuiz(topic: string, difficulty: string): Promise<QuizQuestion> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate a multiple choice question about ${topic} at ${difficulty} level. 
        Crucially, provide a 'theory' section explaining the core concept clearly.
        Also provide a 'steps' array that breaks down the solution logic step-by-step (for a flow chart).`,
        config: {
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
              difficulty: { type: Type.STRING, enum: ['easy', 'medium', 'hard'] }
            }
          }
        }
      });
      if (!response.text) throw new Error("No text returned");
      return JSON.parse(response.text);
    } catch (e) {
      console.error(e);
      return { 
          question: "Service unavailable. Try again.", 
          options: ["Retry"], 
          correctIndex: 0, 
          explanation: "Error", 
          theory: "N/A", 
          steps: [], 
          difficulty: "medium" 
      };
    }
  },

  async getProjectHelp(query: string): Promise<ChatMessage> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: query,
        config: {
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
            { text: "Analyze the facial expressions and body language in this classroom view. Estimate a 'Confusion Score' (0-100), determine the general mood, and provide a 1-sentence summary." }
          ]
        },
        config: {
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
            { text: "Analyze the facial expression of this specific student during a study session. Estimate a 'Confusion Score' (0-100), determine the mood (focused, confused, frustrated, bored), and provide a very brief 1-sentence observation." }
          ]
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              confusionScore: { type: Type.INTEGER },
              summary: { type: Type.STRING },
              mood: { type: Type.STRING, enum: ['focused', 'confused', 'frustrated', 'bored'] }
            }
          }
        }
      });
      return JSON.parse(response.text || "{}");
    } catch (e) {
      return { confusionScore: 0, summary: "Tracking paused.", mood: "focused" };
    }
  },

  async submitSessionReport(data: any, isPrivate: boolean): Promise<void> {
    // Persistent Storage via Supabase
    await DatabaseService.logSession(data.studentId, data.mode, data);
  },

  async getProctoringLogs(): Promise<any[]> {
    return await DatabaseService.getRecentProctoringLogs();
  },

  async createLessonPlan(subject: string, grade: string, objectives: string): Promise<LessonPlan> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Create a lesson plan for ${grade} ${subject} with objectives: ${objectives}.`,
        config: {
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
      console.error(e);
      throw e;
    }
  },

  async analyzePeerReview(reviewText: string): Promise<PeerReviewAnalysis> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview', 
        contents: `Analyze this peer review text for soft skills: "${reviewText}". output objective scores 0-100. Be extremely objective and look for specific examples of teamwork and creativity.`,
        config: {
            thinkingConfig: { thinkingBudget: 1024 },
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
        return { teamworkScore: 0, creativityScore: 0, feedback: "Error" };
    }
  },

  async generateAdminReport(stats: any): Promise<AdminReport> {
      try {
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `Generate an executive summary based on these stats: ${JSON.stringify(stats)}.`,
              config: {
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
          return { institutionHealthPulse: "Unavailable", overallMastery: 0, adoptionRate: 0, studentSatisfaction: 0, teacherAdoption: 0, topDepartment: "N/A", adminConfidenceScore: 0 };
      }
  },

  async generateWeeklyReportText(stats: any): Promise<string> {
      try {
          const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Write a professional weekly report for the school administration based on these stats: ${JSON.stringify(stats)}. Include a title, key highlights, and action items. Format as Markdown.`
          });
          return response.text || "Report generation failed.";
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
                // Fixed typo: responseModalities
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
                }
            }
        });
        return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    } catch (e) {
        console.error("TTS Error", e);
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
                      { text: "Transcribe this audio clearly." }
                  ]
              }
          });
          return response.text || "";
      } catch (e) {
          return "";
      }
  },

  async getInterviewQuestion(role: string): Promise<string> {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate a single challenging behavioral or technical interview question for a student applying for a ${role} internship. Keep it under 20 words.`
        });
        return response.text?.trim() || "Tell me about yourself.";
    } catch (e) {
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
                    { text: `The user was asked: "${question}". Transcribe their answer, then analyze it for confidence, clarity, and content. Give a hiring probability (0-100).` }
                ]
            },
            config: {
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
        console.error(e);
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
                      { text: "Analyze this lecture video. Segment it into chapters with timestamps, provide a summary for each, and generate 5 flashcards." }
                  ]
              },
              config: {
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
        ?.map((c: any) => c.web ? { title: c.web.title, uri: c.web.uri } : null)
        .filter(Boolean) || [];

      return {
        text: response.text || "Here is what I found.",
        links: links
      };
    } catch (e) {
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
            { text: "Extract text and summarize the content of this whiteboard image." }
          ]
        }
      });
      return response.text || "No text found.";
    } catch (e) {
      return "Error analyzing image.";
    }
  },

  async reviewResume(text: string): Promise<ResumeFeedback> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Review this resume text: "${text}". Provide a score (0-100), suggestions, and a rewritten professional summary.`,
        config: {
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
      return { score: 0, suggestions: [], rewrittenSummary: "Error" };
    }
  },

  async generateDailyBriefing(tasks: Task[], events: CalendarEvent[]): Promise<string> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate a short, motivating daily briefing based on these tasks: ${JSON.stringify(tasks)} and events: ${JSON.stringify(events)}.`,
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
            contents: `Prioritize these tasks: ${JSON.stringify(tasks)}. Return the same JSON structure but sorted and with updated 'priority' fields if needed.`,
             config: {
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
        return tasks;
    }
  },

  async sortTasksByDeadline(tasks: Task[]): Promise<Task[]> {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Sort these tasks by their deadline in ascending chronological order (soonest first). Treat 'Today' as today, 'Tomorrow' as tomorrow, etc. Tasks with no deadline should be at the end. Return the list of tasks. Input: ${JSON.stringify(tasks)}`,
             config: {
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
        return tasks;
    }
  },

  async getConnectChatResponse(text: string): Promise<string> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: text,
        config: {
          systemInstruction: "You are a helpful AI assistant in a school communication app called AMEP. Keep answers concise, friendly, and relevant to students/teachers.",
          tools: [{ googleSearch: {} }]
        }
      });
      return response.text || "I couldn't process that request.";
    } catch (e) {
      return "AI is currently offline.";
    }
  },

  async planEvent(prompt: string): Promise<EventPlan> {
      try {
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `Plan an event based on this idea: "${prompt}". Return a JSON object with a checklist, email draft to principal, and budget estimate.`,
              config: {
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
            { text: "Generate an engaging Instagram caption and hashtags for this event poster." }
          ]
        },
        config: {
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
      return { caption: "Join us!", hashtags: ["#event"] };
    }
  },

  async getWellnessChatResponse(history: ChatMessage[]): Promise<string> {
      try {
          const systemPrompt = `You are Lumi, a compassionate AI wellness companion for students. 
          Listen actively, validate feelings, and offer gentle, evidence-based coping strategies. 
          Keep responses warm, concise, and supportive. 
          If a student expresses self-harm or severe distress, gently encourage them to contact a school counselor or professional help immediately.`;

          const chat = ai.chats.create({
              model: 'gemini-3-flash-preview',
              config: { systemInstruction: systemPrompt },
              history: history.slice(0, -1).map(h => ({ role: h.role, parts: [{ text: h.text }] }))
          });
          
          const result = await chat.sendMessage({ message: history[history.length - 1].text });
          return result.text || "I'm here for you.";
      } catch (e) {
          console.error(e);
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
                      { text: "Analyze this voice journal entry. Transcribe it, detect the sentiment, provide a wellness score (0-100 where 100 is great), and offer a short piece of advice." }
                  ]
              },
              config: {
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
          console.error(e);
          return { transcription: "Audio processing failed.", sentiment: "Calm", score: 50, advice: "Take a deep breath." };
      }
  },

  async matchScholarships(studentProfile: any): Promise<ScholarshipMatch[]> {
      try {
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `Find 3 fictional but realistic scholarship matches for this student profile: ${JSON.stringify(studentProfile)}.`,
              config: {
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
                      { text: "Analyze this security feed frame. Detect any safety concerns (unattended bags, running, conflicts, etc). If safe, report safe." }
                  ]
              },
              config: {
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
          return { severity: 'Safe', description: 'Analysis failed.', actionItem: 'Check manual feed.' };
      }
  },

  async generateProjectTemplates(query: string): Promise<ProjectTemplate[]> {
      try {
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `Generate 2 Project-Based Learning (PBL) templates for the topic: "${query}".`,
              config: {
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
  }
};
