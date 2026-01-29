/**
 * Netlify Function: AI Chat Proxy (Final Fix)
 * Uses the models identified by the diagnostic tool.
 */

exports.handler = async (event) => {
    if (event.httpMethod === 'GET') {
        const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null;
        return {
            statusCode: 200,
            body: JSON.stringify({ status: "alive", key_configured: !!apiKey })
        };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Not Allowed' };
    }

    try {
        const rawKey = process.env.GEMINI_API_KEY;
        if (!rawKey) return { statusCode: 500, body: JSON.stringify({ error: 'Falta GEMINI_API_KEY en Netlify' }) };
        const apiKey = rawKey.trim();

        const body = JSON.parse(event.body);
        const userMessage = body.message || "";

        // Use gemini-2.0-flash as it was confirmed available in the diagnostic
        const model = 'gemini-2.0-flash';
        const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;

        console.log(`Using model: ${model}`);

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: `Actúa como un asistente experto de Lead Machine Pro. El usuario pregunta: ${userMessage}. Sé conciso y profesional.` }]
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
            const errorMsg = data.error ? data.error.message : JSON.stringify(data);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: `Google Gemini Error: ${errorMsg}` })
            };
        }

    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Crash: ${err.message}` })
        };
    }
};
