
import { supabase } from "./supabaseClient";
import { UserRole } from "../types";

/**
 * Normalizes role strings from the database to match the UserRole enum.
 * Handles casing and common synonyms.
 */
const normalizeRole = (role: string | undefined): UserRole => {
    if (!role) return UserRole.STUDENT;
    const r = role.toLowerCase().trim();
    
    // Faculty / Teacher Mapping
    if (r === 'teacher' || r === 'faculty' || r === 'professor') {
        return UserRole.TEACHER;
    }
    
    // Administrator Mapping
    if (r === 'administrator' || r === 'admin' || r === 'root') {
        return UserRole.ADMIN;
    }
    
    // Default to Student
    return UserRole.STUDENT;
};

export const AuthService = {
    async signUp(email: string, pass: string, fullName: string, role: UserRole) {
        if (!supabase) throw new Error("Database service is currently unreachable.");
        
        console.log(`[Auth] Initializing secure enrollment for: ${email} as ${role}`);
        
        const { data, error } = await supabase.auth.signUp({
            email,
            password: pass,
            options: {
                data: {
                    full_name: fullName,
                    role: role 
                }
            }
        });

        if (error) {
            console.error("[Auth] Enrollment rejected:", error.message);
            throw error;
        }

        if (!data.user) throw new Error("Identity initialization failed.");
        return data.user;
    },

    async signIn(email: string, pass: string) {
        if (!supabase) throw new Error("Database link offline.");
        
        console.log(`[Auth] Attempting identity handshake for: ${email}`);
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password: pass,
        });

        if (error) {
            console.warn("[Auth] Handshake rejected:", error.message);
            throw error;
        }
        
        return data.user;
    },

    async getProfile(userId: string) {
        if (!supabase) return null;
        
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (error) {
            console.error("[Auth] Profile retrieval error:", error.message);
            return null;
        }

        return {
            ...data,
            role: normalizeRole(data.role)
        };
    },

    async signOut() {
        if (!supabase) return;
        await supabase.auth.signOut();
        console.log("[Auth] Session terminated.");
    }
};
