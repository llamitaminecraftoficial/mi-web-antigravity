/**
 * Netlify Function: AI Chat Proxy (Final Production Fix)
 * Uses the exact models confirmed in the user's account diagnostic.
 */

exports.handler = async (event) => {
    if (event.httpMethod === 'GET') {
        const apiKey = process.env.GEMINI_API_KEY ? "Configured" : "Missing";
        return {
            statusCode: 200,
            body: JSON.stringify({ status: "alive", key: apiKey, note: "Use POST to chat" })
        };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const rawKey = process.env.GEMINI_API_KEY;
        if (!rawKey) return { statusCode: 500, body: JSON.stringify({ error: 'Falta GEMINI_API_KEY en Netlify' }) };
        const apiKey = rawKey.trim();

        const body = JSON.parse(event.body);
        const userMessage = body.message || "Hola";

        // Models specifically listed in your account diagnostic (Step Id: 1181)
        const configs = [
            { ver: 'v1', mod: 'gemini-2.0-flash' },      // Confirmed in your list
            { ver: 'v1', mod: 'gemini-2.0-flash-lite' }, // Confirmed in your list
            { ver: 'v1', mod: 'gemini-2.5-flash' },      // Confirmed in your list (Experimental)
            { ver: 'v1beta', mod: 'gemini-1.5-flash' }   // Universal fallback
        ];

        let lastDetail = "";

        for (const config of configs) {
            const url = `https://generativelanguage.googleapis.com/${config.ver}/models/${config.mod}:generateContent?key=${apiKey}`;

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: `Actúa como un asistente experto. Responde brevemente a: ${userMessage}` }]
                        }]
                    }),
                    signal: AbortSignal.timeout(10000)
                });

                const data = await response.json();

                if (response.ok && data.candidates && data.candidates[0].content.parts[0].text) {
                    return {
                        statusCode: 200,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ response: data.candidates[0].content.parts[0].text })
                    };
                } else {
                    lastDetail = data.error ? data.error.message : JSON.stringify(data);
                    console.log(`Failed config ${config.mod}: ${lastDetail}`);
                }
            } catch (e) {
                lastDetail = e.message;
            }
        }

        return {
            statusCode: 500,
            body: JSON.stringify({
                error: `No se pudo conectar con los modelos de tu cuenta.`,
                details: lastDetail
            })
        };

    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Crash interno: ${err.message}` })
        };
    }
};
