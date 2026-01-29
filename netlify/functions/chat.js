/**
 * Netlify Function: AI Chat Proxy (Ultra-Resilient Version)
 * Handles model versioning and common environment variable issues.
 */

exports.handler = async (event) => {
    if (event.httpMethod === 'GET') {
        return {
            statusCode: 200,
            body: JSON.stringify({ status: "alive", env_present: !!process.env.GEMINI_API_KEY })
        };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Not Allowed' };
    }

    try {
        // 1. Clean API Key
        const rawKey = process.env.GEMINI_API_KEY;
        if (!rawKey) {
            return { statusCode: 500, body: JSON.stringify({ error: 'Falta GEMINI_API_KEY en Netlify' }) };
        }
        const apiKey = rawKey.trim();

        const body = JSON.parse(event.body);
        const userMessage = body.message || "Hola";

        // 2. Try multiple model configurations in order of preference
        // Some regions/keys prefer different model strings or versions
        const configs = [
            { ver: 'v1beta', mod: 'gemini-1.5-flash' },
            { ver: 'v1', mod: 'gemini-1.5-flash' },
            { ver: 'v1beta', mod: 'gemini-pro' }
        ];

        let lastError = null;

        for (const config of configs) {
            console.log(`Attempting Gemini ${config.mod} via ${config.ver}...`);
            const url = `https://generativelanguage.googleapis.com/${config.ver}/models/${config.mod}:generateContent?key=${apiKey}`;

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: `Actúa como un asistente experto de Lead Machine Pro. El usuario pregunta: ${userMessage}. Sé conciso.` }]
                        }]
                    })
                });

                const data = await response.json();

                if (response.ok && data.candidates && data.candidates[0].content.parts[0].text) {
                    console.log(`Success with ${config.mod}`);
                    return {
                        statusCode: 200,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ response: data.candidates[0].content.parts[0].text })
                    };
                } else {
                    lastError = data.error ? data.error.message : JSON.stringify(data);
                    console.warn(`Failed ${config.mod}: ${lastError}`);
                    // Continue to next config
                }
            } catch (fetchErr) {
                lastError = fetchErr.message;
                console.warn(`Fetch error for ${config.mod}: ${lastError}`);
            }
        }

        // If we reach here, all attempts failed
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Google dice: ${lastError}` })
        };

    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Crash interno: ${err.message}` })
        };
    }
};
