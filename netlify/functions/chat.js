/**
 * Netlify Function: AI Chat Proxy (Production Final)
 * Optimized for performance with reliable fallback logic.
 */

exports.handler = async (event) => {
    // Health check
    if (event.httpMethod === 'GET') {
        return { statusCode: 200, body: "AI Chat Proxy is Online." };
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

        // Try the most stable production configurations
        const configs = [
            { ver: 'v1', mod: 'gemini-1.5-flash' },
            { ver: 'v1beta', mod: 'gemini-1.5-flash' },
            { ver: 'v1', mod: 'gemini-1.5-pro' }
        ];

        let lastError = "";

        for (const config of configs) {
            const url = `https://generativelanguage.googleapis.com/${config.ver}/models/${config.mod}:generateContent?key=${apiKey}`;

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: `Actúa como un asistente experto de Lead Machine Pro. Responde a: ${userMessage}. Sé profesional y conciso.` }]
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
                    lastError = data.error ? data.error.message : "Sin respuesta válida del modelo.";
                }
            } catch (e) {
                lastError = e.message;
            }
        }

        return {
            statusCode: 500,
            body: JSON.stringify({ error: `La IA no pudo responder: ${lastError}` })
        };

    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Error interno: ${err.message}` })
        };
    }
};
