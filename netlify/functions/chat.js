/**
 * Netlify Function: AI Chat Proxy (Final Production Version)
 * Optimized for the specific models discovered in the user's account.
 */

exports.handler = async (event) => {
    if (event.httpMethod === 'GET') {
        const apiKey = process.env.GEMINI_API_KEY ? "Configured ✔" : "Missing ✘";
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Chat endpoint active", key_status: apiKey })
        };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Not Allowed' };
    }

    try {
        const rawKey = process.env.GEMINI_API_KEY;
        if (!rawKey) return { statusCode: 500, body: JSON.stringify({ error: 'Falta GEMINI_API_KEY' }) };
        const apiKey = rawKey.trim();

        const body = JSON.parse(event.body);
        const userMessage = body.message || "Hola";

        // Models confirmed to exist in your specific API Key list
        const configs = [
            { ver: 'v1', mod: 'gemini-2.0-flash-lite-001' },
            { ver: 'v1', mod: 'gemini-2.0-flash' },
            { ver: 'v1', mod: 'gemini-1.5-flash' } // Fallback
        ];

        let lastGoogleError = "";

        for (const config of configs) {
            const url = `https://generativelanguage.googleapis.com/${config.ver}/models/${config.mod}:generateContent?key=${apiKey}`;

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: userMessage }] }]
                    }),
                    signal: AbortSignal.timeout(8000)
                });

                const data = await response.json();

                if (response.ok && data.candidates) {
                    return {
                        statusCode: 200,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ response: data.candidates[0].content.parts[0].text })
                    };
                } else {
                    lastGoogleError = data.error ? data.error.message : JSON.stringify(data);
                }
            } catch (e) {
                lastGoogleError = e.message;
            }
        }

        // Final response explaining the Quota 0 issue
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: `Límite 0 detectado en Google AI Studio. Detalles: ${lastGoogleError}`
            })
        };

    } catch (err) {
        return { statusCode: 500, body: JSON.stringify({ error: `Crash: ${err.message}` }) };
    }
};
