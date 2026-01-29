/**
 * Netlify Function: AI Chat Proxy (The "Try Everything" Edition)
 * Tries every model confirmed by the user's diagnostic check.
 */

exports.handler = async (event) => {
    if (event.httpMethod === 'GET') {
        return { statusCode: 200, body: "Chat endpoint is online." };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Not Allowed' };
    }

    try {
        const rawKey = process.env.GEMINI_API_KEY;
        if (!rawKey) return { statusCode: 500, body: JSON.stringify({ error: 'Falta GEMINI_API_KEY en Netlify' }) };
        const apiKey = rawKey.trim();

        const body = JSON.parse(event.body);
        const userMessage = body.message || "Hola";

        // Every single model the diagnostic tool found in your account
        const configs = [
            { ver: 'v1', mod: 'gemini-2.0-flash-lite-001' },
            { ver: 'v1', mod: 'gemini-2.0-flash' },
            { ver: 'v1', mod: 'gemini-2.5-flash' }, // As seen in your list
            { ver: 'v1', mod: 'gemini-1.5-flash' }, // Just in case
            { ver: 'v1beta', mod: 'gemini-1.5-flash' },
            { ver: 'v1beta', mod: 'gemini-pro' }
        ];

        let errors = [];

        for (const config of configs) {
            const url = `https://generativelanguage.googleapis.com/${config.ver}/models/${config.mod}:generateContent?key=${apiKey}`;

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: `Actúa como asistente experto: ${userMessage}` }]
                        }]
                    }),
                    // Short timeout so we can try the next one quickly
                    signal: AbortSignal.timeout(5000)
                });

                const data = await response.json();

                if (response.ok && data.candidates && data.candidates[0].content.parts[0].text) {
                    return {
                        statusCode: 200,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ response: data.candidates[0].content.parts[0].text })
                    };
                } else {
                    const msg = data.error ? data.error.message : "Error desconocido";
                    errors.push(`${config.mod}: ${msg}`);
                }
            } catch (e) {
                errors.push(`${config.mod}: ${e.message}`);
            }
        }

        // If we reach here, tell the user the hard truth about their Google Account
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "Tu cuenta de Google tiene el límite en 0 para todos los modelos.",
                details: errors.join(" | ")
            })
        };

    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Crash: ${err.message}` })
        };
    }
};
