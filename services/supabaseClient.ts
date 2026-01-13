
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://fddemkgedsjslwzgtjdu.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZGVta2dlZHNqc2x3emd0amR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3ODI1NDMsImV4cCI6MjA4MzM1ODU0M30.dlA3RfzwbInpgC6VeogZFQnzeXyYzcS89No4Q2mvNVU";

// Initializing with provided credentials
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
