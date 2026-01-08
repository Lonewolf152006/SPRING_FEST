
import React, { useState, createContext, useContext, useEffect } from 'react';
import { UserRole, Task, CalendarEvent, Subject, SchoolClass, Team, PeerReview } from './types';
import { DatabaseService } from './services/databaseService';
import { AuthService } from './services/authService';
import { supabase } from './services/supabaseClient';

// Components
import LoginGateway from './components/LoginGateway';
import AppLauncher from './components/AppLauncher';
import SmartPlanner from './components/apps/SmartPlanner';
import ConnectApp from './components/apps/ConnectApp';
import EventHub from './components/apps/EventHub';
import WellnessWing from './components/apps/WellnessWing';
import AdminCentralApp from './components/apps/AdminCentralApp';
import CareerCell from './components/student/CareerCell';
import TeacherDashboard from './components/teacher/TeacherDashboard';
import StudentDashboard from './components/student/StudentDashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import CampusConcierge from './components/CampusConcierge';
import PracticeArena from './components/student/PracticeArena';
import ProjectLab from './components/student/ProjectLab';
import LectureGenius from './components/student/LectureGenius';
import LiveClassroom from './components/teacher/LiveClassroom';
import GradingHub from './components/teacher/GradingHub';
import ProjectLibrary from './components/teacher/ProjectLibrary';
import Reports from './components/teacher/Reports';
import GlobalNavBar from './components/GlobalNavBar';

// Layouts
import StudentLayout from './components/layouts/StudentLayout';
import TeacherLayout from './components/layouts/TeacherLayout';
import AdminLayout from './components/layouts/AdminLayout';

// Mock Data for Structure
const MOCK_CLASSES: SchoolClass[] = [{ id: 'C1', name: 'Class 10-A', teacherIds: ['T1'], studentIds: ['S1', 'S2', 'S3'] }];
const MOCK_SUBJECTS: Subject[] = [
    { 
        id: 'math', name: 'Mathematics', teacherId: 'T1', classId: 'C1', 
        concepts: [
            {id: 'c1', name: 'Calculus', subjectId: 'math', masteryScore: 85, prerequisites: []},
            {id: 'c2', name: 'Linear Algebra', subjectId: 'math', masteryScore: 70, prerequisites: ['c1']}
        ] 
    },
    { id: 'phys', name: 'Physics', teacherId: 'T1', classId: 'C1', concepts: [{id: 'c3', name: 'Mechanics', subjectId: 'phys', masteryScore: 70, prerequisites: []}] }
];
const MOCK_TEAMS: Team[] = [{ id: 'team1', name: 'Alpha Squad', projectTitle: 'Mars Colony AI', studentIds: ['S1', 'S2'], classId: 'C1' }];
const MOCK_STUDENTS = [{ id: 'S1', name: 'Alex Student' }, { id: 'S2', name: 'Jordan Lee' }, { id: 'S3', name: 'Casey Ray' }];

export const HierarchyContext = createContext<{
    classes: SchoolClass[];
    subjects: Subject[];
    teams: Team[];
    students: { id: string; name: string }[];
    peerReviews: PeerReview[];
    updateConceptScore: (conceptId: string, delta: number) => void;
    addPeerReview: (review: PeerReview) => void;
    currentUserId: string;
}>({
    classes: [], subjects: [], teams: [], students: [], peerReviews: [],
    updateConceptScore: () => {}, addPeerReview: () => {}, currentUserId: ''
});

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<UserRole | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string>('');
    const [currentRoute, setCurrentRoute] = useState<string>('launcher');
    const [initializing, setInitializing] = useState(true);
    
    // Global State
    const [tasks, setTasks] = useState<Task[]>([]);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [peerReviews, setPeerReviews] = useState<PeerReview[]>([]);

    // 1. SESSION LISTENER
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const profile = await AuthService.getProfile(session.user.id);
                if (profile) {
                    setCurrentUser(profile.role as UserRole);
                    setCurrentUserId(session.user.id);
                }
            }
            setInitializing(false);
        };

        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                const profile = await AuthService.getProfile(session.user.id);
                if (profile) {
                    setCurrentUser(profile.role as UserRole);
                    setCurrentUserId(session.user.id);
                }
            } else if (event === 'SIGNED_OUT') {
                setCurrentUser(null);
                setCurrentUserId('');
                setCurrentRoute('launcher');
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // 2. DATA LOADER
    useEffect(() => {
        const loadInitialData = async () => {
            if (!currentUserId) return;
            const dbTasks = await DatabaseService.getTasks(currentUserId);
            if (dbTasks) setTasks(dbTasks);
        };
        loadInitialData();
    }, [currentUserId]);

    const handleLogout = async () => {
        if (confirm("Sign out of AMEP?")) {
            await AuthService.signOut();
        }
    };

    if (initializing) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Waking Neural OS...</span>
                </div>
            </div>
        );
    }

    if (!currentUser) {
        return <LoginGateway onLogin={(role, uid) => { setCurrentUser(role); setCurrentUserId(uid); }} />;
    }

    const renderContent = () => {
        switch (currentRoute) {
            case 'launcher': return <AppLauncher onNavigate={setCurrentRoute} tasks={tasks} events={events} role={currentUser!} />;
            case 'classroom':
                if (currentUser === UserRole.STUDENT) return <StudentDashboard tasks={tasks} events={events} />;
                if (currentUser === UserRole.TEACHER) return <TeacherDashboard />;
                if (currentUser === UserRole.ADMIN) return <AdminDashboard />;
                return <div>Access Denied</div>;
            case 'planner': return <SmartPlanner tasks={tasks} events={events} onUpdateTasks={setTasks} onAddEvent={(e) => setEvents([...events, e])} role={currentUser!} />;
            case 'connect': return <ConnectApp />;
            case 'events': return <EventHub />;
            case 'wellness': return <WellnessWing />;
            case 'admin-central': return <AdminCentralApp />;
            case 'career': return <CareerCell />;
            case 'practice': return <PracticeArena />;
            case 'projects': return <ProjectLab />;
            case 'lecture': return <LectureGenius />;
            case 'live-class': return <LiveClassroom />;
            case 'grading': return <GradingHub />;
            case 'project-library': return <ProjectLibrary />;
            case 'reports': return <Reports />;
            default: return <AppLauncher onNavigate={setCurrentRoute} tasks={tasks} events={events} role={currentUser!} />;
        }
    };

    const Layout = currentUser === UserRole.STUDENT ? StudentLayout : currentUser === UserRole.TEACHER ? TeacherLayout : AdminLayout;

    return (
        <HierarchyContext.Provider value={{ 
            classes: MOCK_CLASSES, subjects: MOCK_SUBJECTS, teams: MOCK_TEAMS, students: MOCK_STUDENTS, 
            peerReviews, updateConceptScore: () => {}, addPeerReview: (r) => setPeerReviews([...peerReviews, r]), 
            currentUserId 
        }}>
            <div className="flex flex-col h-screen">
                <GlobalNavBar onNavigate={setCurrentRoute} currentRoute={currentRoute} role={currentUser!} onLogout={handleLogout} />
                <div className="flex-1 overflow-hidden">
                    <Layout activeRoute={currentRoute} onNavigate={setCurrentRoute} onLogout={handleLogout}>
                        {renderContent()}
                        <CampusConcierge />
                    </Layout>
                </div>
            </div>
        </HierarchyContext.Provider>
    );
};

export default App;
