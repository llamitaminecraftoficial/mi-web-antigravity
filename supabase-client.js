/**
 * Supabase Client Initialization (Secure Version)
 * Fetches credentials from Netlify Functions to avoid hardcoded secrets.
 */

window.SupabaseInit = (async () => {
    try {
        // Fetch config from our secure endpoint
        const response = await fetch('/.netlify/functions/get-config');
        const config = await response.json();

        if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
            throw new Error("Missing Supabase configuration in environment variables.");
        }

        if (!window.supabase) {
            throw new Error("Supabase script not loaded.");
        }

        const sb = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
        window.SupabaseClient = sb;
        console.log("Supabase initialized successfully.");
        return sb;

    } catch (error) {
        console.error("Supabase Initialization Error:", error.message);
        // Fallback or warning for the user
        return null;
    }
})();
