
export enum UserRole {
  STUDENT = 'Student',
  TEACHER = 'Teacher',
  ADMIN = 'Administrator'
}

export type ExplanationMode = 'flowchart' | 'analogy' | 'concept-map' | 'theoretical';

export interface MultimodalResult {
  mode: ExplanationMode;
  content: string;
  steps?: string[];
  connections?: { from: string; to: string }[];
}

export interface Team {
  id: string;
  name: string;
  projectTitle: string;
  studentIds: string[];
  classId: string;
}

export interface PeerReview {
  id: string;
  teamId: string;
  fromStudentId: string;
  toStudentId: string;
  teamworkScore: number;
  creativityScore: number;
  communicationScore: number;
  comment: string;
  timestamp: number;
}

export interface Concept {
  id: string;
  name: string;
  subjectId: string;
  masteryScore: number;
  prerequisites: string[];
}

export interface Subject {
  id: string;
  name: string;
  teacherId: string;
  classId: string;
  concepts: Concept[];
}

export interface SchoolClass {
  id: string;
  name: string;
  teacherIds: string[];
  studentIds: string[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  theory: string;
  steps: string[];
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface ConfusionAnalysis {
  confusionScore: number;
  summary: string;
  mood: 'focused' | 'confused' | 'distracted' | 'engaged';
}

export interface ExamProctoringAnalysis {
  faceDetected: boolean;
  attentionScore: number;
  confusionScore: number;
  stressScore: number;
  confidenceScore: number;
}

export interface PeerReviewAnalysis {
  teamworkScore: number;
  creativityScore: number;
  feedback: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  sources?: { title: string; uri: string }[];
}

export interface StudentSummary {
  name: string;
  status: 'High Performer' | 'On Track' | 'Needs Intervention';
  gpa: number;
  attendance: number;
}

export interface ClassInsights {
  classTrend: string;
  commonDifficulty: string;
  recommendation: string;
  students: StudentSummary[];
}

export interface LessonPlan {
  topic: string;
  pblActivity: string;
  discussionQuestions: string[];
  formativeAssessment: string;
}

export interface AdminReport {
  institutionHealthPulse: string;
  overallMastery: number;
  adoptionRate: number;
  studentSatisfaction: number;
  teacherAdoption: number;
  topDepartment: string;
  adminConfidenceScore: number;
}

export interface InterviewAnalysis {
  transcription: string;
  confidenceScore: number;
  hiringProbability: number;
  feedback: string;
  keywordsDetected: string[];
}

export interface LectureChapter {
  timestamp: string;
  title: string;
  summary: string;
}

export interface LectureSummary {
  title: string;
  chapters: LectureChapter[];
  flashcards: { front: string; back: string }[];
}

export interface CampusMapResponse {
  text: string;
  location?: { lat: number; lng: number };
  links: { title: string; uri: string }[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'class' | 'study' | 'deadline' | 'personal';
  color: string;
}

export interface Task {
  id: string;
  title: string;
  status: 'todo' | 'inprogress' | 'done';
  priority: 'low' | 'medium' | 'high';
  deadline?: string;
  source: 'classroom' | 'personal';
}

export interface ConnectChannel {
  id: string;
  name: string;
  type: 'class' | 'project';
}

export interface ConnectMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  isAi: boolean;
  attachments?: { type: 'image' | 'map', content: string, title?: string }[];
}

export interface ResumeFeedback {
  score: number;
  suggestions: string[];
  rewrittenSummary: string;
}

export interface EventPlan {
  checklist: string[];
  emailDraft: string;
  budgetEstimate: string;
}

export interface EventPost {
  caption: string;
  hashtags: string[];
}

export interface MoodEntry {
  transcription: string;
  sentiment: 'Happy' | 'Calm' | 'Stressed' | 'Anxious';
  advice: string;
  score: number;
}

export interface ScholarshipMatch {
  name: string;
  amount: string;
  matchReason: string;
  probability: number;
}

export interface SafetyAlert {
  severity: 'Safe' | 'Caution' | 'Danger';
  description: string;
  actionItem: string;
}

export interface ProjectTemplate {
    id: string;
    title: string;
    subject: string;
    difficulty: string;
    duration: string;
    description: string;
    milestones: string[];
    skillsTargeted: string[];
}

export interface Poll {
    id: string;
    question: string;
    options: { label: string; votes: number }[];
    totalVotes: number;
    isActive: boolean;
}
