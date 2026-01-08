
import { supabase } from "./supabaseClient";
import { UserRole } from "../types";

export const AuthService = {
    async signUp(email: string, pass: string, fullName: string, role: UserRole) {
        if (!supabase) throw new Error("Cloud sync unavailable");
        
        // Passing data in options.data ensures it goes into raw_user_meta_data
        // This triggers the handle_new_user() SQL function in Supabase
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

        if (error) throw error;
        if (!data.user) throw new Error("Signup failed");

        return data.user;
    },

    async signIn(email: string, pass: string) {
        if (!supabase) throw new Error("Cloud sync unavailable");
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password: pass,
        });

        if (error) throw error;
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
            console.error("Profile fetch error:", error);
            return null;
        }
        return data;
    },

    async signOut() {
        if (!supabase) return;
        await supabase.auth.signOut();
    }
};
