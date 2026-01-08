
import { UserRole } from '../types';

export interface NavItemConfig {
    id: string;
    label: string;
    icon: string;
}

export const ROLE_NAVIGATION: Record<UserRole, NavItemConfig[]> = {
    [UserRole.STUDENT]: [
        { id: 'launcher', label: 'Home Base', icon: '🏠' },
        { id: 'classroom', label: 'My Dashboard', icon: '📊' },
        { id: 'planner', label: 'Smart Planner', icon: '🗓️' },
        { id: 'connect', label: 'Connect', icon: '💬' },
        { id: 'events', label: 'Event Hub', icon: '🎉' },
        { id: 'practice', label: 'Practice Arena', icon: '⚔️' },
        { id: 'projects', label: 'Project Lab', icon: '🧪' },
        { id: 'lecture', label: 'Lecture Genius', icon: '🧠' },
        { id: 'career', label: 'Career Cell', icon: '💼' },
        { id: 'wellness', label: 'Wellness Wing', icon: '🌱' },
    ],
    [UserRole.TEACHER]: [
        { id: 'launcher', label: 'Overview', icon: '🏠' },
        { id: 'classroom', label: 'Command Center', icon: '🎛️' },
        { id: 'planner', label: 'Smart Planner', icon: '🗓️' },
        { id: 'live-class', label: 'Live Classroom', icon: '📡' },
        { id: 'reports', label: 'Performance Reports', icon: '📈' },
        { id: 'project-library', label: 'Project Library', icon: '📚' },
        { id: 'grading', label: 'Grading Hub', icon: '📝' },
        { id: 'events', label: 'Event Planner', icon: '🎉' },
        { id: 'connect', label: 'Faculty Chat', icon: '💬' },
    ],
    [UserRole.ADMIN]: [
        { id: 'launcher', label: 'Dashboard', icon: '📊' },
        { id: 'admin-central', label: 'Ops Central', icon: '🛡️' },
        { id: 'classroom', label: 'Analytics', icon: '📈' },
        { id: 'planner', label: 'Master Planner', icon: '🗓️' },
        { id: 'connect', label: 'Global Comms', icon: '📢' },
    ]
};
