
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
import UserManagementApp from './components/admin/UserManagementApp';
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

// Mock Data
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

interface UserProfile {
    id: string;
    full_name: string;
    role: UserRole;
    xp: number;
    level: number;
}

export const HierarchyContext = createContext<{
    classes: SchoolClass[];
    subjects: Subject[];
    teams: Team[];
    students: { id: string; name: string }[];
    peerReviews: PeerReview[];
    updateConceptScore: (conceptId: string, delta: number) => void;
    addPeerReview: (review: PeerReview) => void;
    currentUserId: string;
    userProfile: UserProfile | null;
    addXp: (amount: number) => void;
}>({
    classes: [], subjects: [], teams: [], students: [], peerReviews: [],
    updateConceptScore: () => {}, addPeerReview: () => {}, currentUserId: '',
    userProfile: null, addXp: () => {}
});

const App: React.FC = () => {
    const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [currentRoute, setCurrentRoute] = useState<string>('classroom');
    const [initializing, setInitializing] = useState(true);
    const [dbStatus, setDbStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
    
    const [tasks, setTasks] = useState<Task[]>([]);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [peerReviews, setPeerReviews] = useState<PeerReview[]>([]);

    useEffect(() => {
        const bootSequence = async () => {
            const isConnected = await DatabaseService.ping();
            setDbStatus(isConnected ? 'connected' : 'error');

            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const profile = await AuthService.getProfile(session.user.id);
                if (profile) {
                    const stats = await DatabaseService.getUserStats(session.user.id);
                    setUserProfile({ 
                        id: session.user.id, 
                        full_name: profile.full_name, 
                        role: profile.role,
                        xp: stats.xp,
                        level: stats.level
                    });
                    setCurrentUserRole(profile.role);
                    setCurrentRoute('classroom');
                }
            }
            setTimeout(() => setInitializing(false), 600);
        };

        bootSequence();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                const profile = await AuthService.getProfile(session.user.id);
                if (profile) {
                    const stats = await DatabaseService.getUserStats(session.user.id);
                    setUserProfile({ 
                        id: session.user.id, 
                        full_name: profile.full_name, 
                        role: profile.role,
                        xp: stats.xp,
                        level: stats.level
                    });
                    setCurrentUserRole(profile.role);
                    setCurrentRoute('classroom');
                }
            } else if (event === 'SIGNED_OUT') {
                setCurrentUserRole(null);
                setUserProfile(null);
                setCurrentRoute('launcher');
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleLogout = async () => {
        setCurrentUserRole(null);
        setUserProfile(null);
        setCurrentRoute('launcher');
        try {
            await AuthService.signOut();
        } catch (error) {
            console.log("Cleanup complete.");
        }
    };

    const handleLogin = async (role: UserRole, userId: string) => {
        let mockName = 'Guest User';
        if (role === UserRole.STUDENT) mockName = 'Alex Scholar';
        else if (role === UserRole.TEACHER) mockName = 'Prof. Day';
        else if (role === UserRole.ADMIN) mockName = 'Root Admin';

        const stats = await DatabaseService.getUserStats(userId);
        setUserProfile({ 
            id: userId, 
            full_name: mockName, 
            role: role,
            xp: stats.xp,
            level: stats.level
        });
        setCurrentUserRole(role);
        setCurrentRoute('classroom');
    };

    const addXp = (amount: number) => {
        if (!userProfile) return;
        const newXp = userProfile.xp + amount;
        const newLevel = Math.floor(newXp / 1000) + 1;
        
        setUserProfile(prev => prev ? { ...prev, xp: newXp, level: newLevel } : null);
        DatabaseService.updateUserStats(userProfile.id, newXp, newLevel);
    };

    if (initializing) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-50 relative overflow-hidden">
                <div className="flex flex-col items-center gap-6 relative z-10">
                    <div className="w-16 h-16 border-[6px] border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-[0.4em]">AMEP.OS</span>
                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.2em] animate-pulse">Syncing Partition...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (!currentUserRole) {
        return <LoginGateway dbStatus={dbStatus} onLogin={handleLogin} />;
    }

    const renderContent = () => {
        switch (currentRoute) {
            case 'launcher': return <AppLauncher onNavigate={setCurrentRoute} tasks={tasks} events={events} role={currentUserRole} />;
            case 'classroom':
                if (currentUserRole === UserRole.STUDENT) return <StudentDashboard tasks={tasks} events={events} />;
                if (currentUserRole === UserRole.TEACHER) return <TeacherDashboard />;
                if (currentUserRole === UserRole.ADMIN) return <AdminDashboard />;
                return null;
            case 'planner': return <SmartPlanner tasks={tasks} events={events} onUpdateTasks={setTasks} onAddEvent={(e) => setEvents([...events, e])} role={currentUserRole} />;
            case 'connect': return <ConnectApp />;
            case 'events': return <EventHub />;
            case 'wellness': return <WellnessWing />;
            case 'admin-central': return <AdminCentralApp />;
            case 'user-mgmt': return <UserManagementApp />;
            case 'career': return <CareerCell />;
            case 'practice': return <PracticeArena />;
            case 'projects': return <ProjectLab />;
            case 'lecture': return <LectureGenius />;
            case 'live-class': return <LiveClassroom />;
            case 'grading': return <GradingHub />;
            case 'project-library': return <ProjectLibrary />;
            case 'reports': return <Reports />;
            default: return <AppLauncher onNavigate={setCurrentRoute} tasks={tasks} events={events} role={currentUserRole} />;
        }
    };

    const Layout = currentUserRole === UserRole.STUDENT ? StudentLayout 
                 : currentUserRole === UserRole.TEACHER ? TeacherLayout 
                 : AdminLayout;

    return (
        <HierarchyContext.Provider value={{ 
            classes: MOCK_CLASSES, subjects: MOCK_SUBJECTS, teams: MOCK_TEAMS, students: MOCK_STUDENTS, 
            peerReviews, updateConceptScore: (id, delta) => {}, addPeerReview: (r) => setPeerReviews([...peerReviews, r]), 
            currentUserId: userProfile?.id || 'guest',
            userProfile,
            addXp
        }}>
            <div className="flex flex-col min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-slate-50">
                <GlobalNavBar 
                    onNavigate={setCurrentRoute} 
                    currentRoute={currentRoute} 
                    role={currentUserRole} 
                    onLogout={handleLogout}
                    dbStatus={dbStatus}
                />
                <div className="flex-1 w-full max-w-full">
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
