/**
 * Netlify Function: AI Chat Proxy (Final Production Version)
 */

exports.handler = async (event) => {
    // 1. Logging - This MUST show up in Netlify logs
    console.log("--- CHAT FUNCTION START ---");
    console.log("Method:", event.httpMethod);

    // GET for testing
    if (event.httpMethod === 'GET') {
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Function is ONLINE", timestamp: new Date().toISOString() })
        };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Not Allowed' };
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("CRITICAL ERROR: GEMINI_API_KEY environment variable is Missing.");
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Missing API Key in Netlify settings' })
            };
        }

        const body = JSON.parse(event.body);
        const userMessage = body.message || "Hola";

        console.log("Input Message:", userMessage);

        const model = 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        // Standard fetch (Node 18+)
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: `Eres un experto de Lead Machine Pro. El usuario pregunta: ${userMessage}. Responde de forma muy breve.` }]
                }]
            })
        });

        const data = await response.json();
        console.log("Gemini Status:", response.status);

        if (response.ok && data.candidates) {
            const aiResponse = data.candidates[0].content.parts[0].text;
            console.log("AI Response Sent successfully");
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ response: aiResponse })
            };
        } else {
            console.error("Gemini Error:", JSON.stringify(data));
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Error de la IA de Google', details: data })
            };
        }

    } catch (err) {
        console.error("Fatal Error:", err.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error interno del servidor', details: err.message })
        };
    }
};
