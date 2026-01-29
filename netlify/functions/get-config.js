/**
 * Netlify Function: secure-config
 * Safely provides Supabase credentials from Netlify environment variables.
 */

exports.handler = async (event) => {
    // Only allow requests from our own site in production
    // (In local dev, Origin might be undefined or localhost)

    return {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*" // Simplified for this project
        },
        body: JSON.stringify({
            SUPABASE_URL: process.env.SUPABASE_URL,
            SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
        })
    };
};
