/**
 * Netlify Function: AI Chat Proxy (Targeted Version)
 * Uses the exact models confirmed in the user's diagnostic check.
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

        // Targeted models from your diagnostic list
        const configs = [
            { ver: 'v1', mod: 'gemini-2.0-flash-lite-001' }, // Found in your list
            { ver: 'v1beta', mod: 'gemini-2.0-flash-lite-001' },
            { ver: 'v1', mod: 'gemini-2.0-flash' },          // Found in your list
            { ver: 'v1beta', mod: 'gemini-2.0-flash' },
            { ver: 'v1', mod: 'gemini-1.5-flash' },          // Standard fallback
            { ver: 'v1beta', mod: 'gemini-1.5-flash' }
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
                            parts: [{ text: `Actúa como asistente: ${userMessage}` }]
                        }]
                    })
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
                    errors.push(`${config.mod} (${config.ver}): ${msg}`);
                }
            } catch (e) {
                errors.push(`${config.mod}: ${e.message}`);
            }
        }

        // Final response if all fail
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "Fallo de cuota o región en Google AI Studio.",
                details: errors[0] // Show the first significant error
            })
        };

    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Crash: ${err.message}` })
        };
    }
};
