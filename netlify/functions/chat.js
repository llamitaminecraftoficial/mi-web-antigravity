/**
 * Netlify Function: AI Chat Proxy (Diagnostic Version)
 */

exports.handler = async (event) => {
    if (event.httpMethod === 'GET') {
        return {
            statusCode: 200,
            body: JSON.stringify({ status: "alive", env: !!process.env.GEMINI_API_KEY })
        };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Not Allowed' };
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Falta GEMINI_API_KEY en Netlify' })
            };
        }

        const body = JSON.parse(event.body);
        const userMessage = body.message || "";

        const model = 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: `Responde como experto: ${userMessage}` }]
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
            // RELAY THE EXACT ERROR FROM GOOGLE
            const googleError = data.error ? data.error.message : JSON.stringify(data);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: `Google dice: ${googleError}` })
            };
        }

    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Crash: ${err.message}` })
        };
    }
};
