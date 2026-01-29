/**
 * Netlify Function: AI Chat Proxy (Extreme Fallback Version)
 */

exports.handler = async (event) => {
    if (event.httpMethod === 'GET') {
        return { statusCode: 200, body: "Chat endpoint is online and waiting for POST requests." };
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

        // Strategy: Try the most stable models first, then fallbacks.
        // We include both v1 and v1beta to cover all regional variations.
        const configs = [
            { ver: 'v1beta', mod: 'gemini-1.5-flash' }, // Most compatible
            { ver: 'v1', mod: 'gemini-1.5-flash' },     // Stable 1.5
            { ver: 'v1beta', mod: 'gemini-1.5-pro' },   // High quality
            { ver: 'v1beta', mod: 'gemini-2.0-flash-lite' }, // Low quota requirement
            { ver: 'v1beta', mod: 'gemini-1.0-pro' }    // Legacy stable
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
                            parts: [{ text: `Actúa como un asistente experto de Lead Machine Pro. El usuario pregunta: ${userMessage}. Sé breve.` }]
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

        // Detailed error for the user to help debug
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "Ningún modelo de Google respondió correctamente.",
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
