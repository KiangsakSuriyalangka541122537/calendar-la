
import { createClient } from '@supabase/supabase-js';

// Use process.env which is polyfilled by vite.config.ts
// This prevents "Cannot read properties of undefined (reading 'VITE_SUPABASE_URL')" errors
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://okeyxsiqxuzimyfwojlu.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rZXl4c2lxeHV6aW15Zndvamx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NDE4OTQsImV4cCI6MjA4NTMxNzg5NH0.NVpRclwEWDkYLo_WwgYSGcTHrIAyh1JCCreIiMT5z6Y';

export const supabase = createClient(supabaseUrl, supabaseKey);
