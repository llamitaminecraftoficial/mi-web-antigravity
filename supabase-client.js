/**
 * Supabase Client Initialization
 */
const SUPABASE_URL = 'https://xvixktmnyhjqihorrfec.supabase.co';
const SUPABASE_KEY = 'sb_publishable_la-AT5nBUQWgFXHSMe0HVQ_4HfU04Bm';

if (!window.supabase) {
    console.error("Supabase script not loaded. Please include <script src=\"https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2\"></script>");
}

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

window.SupabaseClient = sb;
