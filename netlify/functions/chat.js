/**
 * Netlify Function: AI Chat Proxy (Diagnostic & Resilient)
 */

exports.handler = async (event) => {
    // 1. Diagnostics: GET now lists available models to see what's wrong
    if (event.httpMethod === 'GET') {
        const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null;
        if (!apiKey) return { statusCode: 500, body: JSON.stringify({ error: "Missing Key in Netlify" }) };

        try {
            // Check both v1 and v1beta
            const responseV1 = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
            const dataV1 = await responseV1.json();

            return {
                statusCode: 200,
                body: JSON.stringify({
                    status: "alive",
                    available_models_v1: dataV1.models ? dataV1.models.map(m => m.name) : dataV1
                })
            };
        } catch (err) {
            return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
        }
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

        // Attempting with updated model strings based on latest docs
        const configs = [
            { ver: 'v1beta', mod: 'gemini-1.5-flash' },
            { ver: 'v1', mod: 'gemini-1.5-flash' },
            { ver: 'v1beta', mod: 'gemini-1.5-pro' }
        ];

        let lastError = "";

        for (const config of configs) {
            const url = `https://generativelanguage.googleapis.com/${config.ver}/models/${config.mod}:generateContent?key=${apiKey}`;

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: userMessage }] }]
                    })
                });

                const data = await response.json();

                if (response.ok && data.candidates) {
                    return {
                        statusCode: 200,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ response: data.candidates[0].content.parts[0].text })
                    };
                } else {
                    lastError = data.error ? (data.error.message || JSON.stringify(data.error)) : JSON.stringify(data);
                }
            } catch (e) {
                lastError = e.message;
            }
        }

        return {
            statusCode: 500,
            body: JSON.stringify({ error: `No se pudo conectar con ningún modelo. Google dice: ${lastError}` })
        };

    } catch (err) {
        return { statusCode: 500, body: JSON.stringify({ error: `Crash: ${err.message}` }) };
    }
};
