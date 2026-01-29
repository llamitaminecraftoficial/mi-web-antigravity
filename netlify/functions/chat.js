/**
 * Netlify Function: AI Chat Proxy (Refined for Production)
 * This handles Gemini API calls securely without exposing keys to the browser.
 */

exports.handler = async (event) => {
    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    console.log("Status: Chat function triggered");

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("Error: GEMINI_API_KEY environment variable is not defined in Netlify.");
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Server configuration error: Missing API Key' })
            };
        }

        const body = JSON.parse(event.body);
        const userMessage = body.message || "";

        console.log(`Log: Processing message (length: ${userMessage.length})`);

        const model = 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        // Using native fetch (Available in Node 18+ on Netlify)
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: `Actúa como un asistente experto de Lead Machine Pro, una plataforma de gestión de leads y captación. El usuario pregunta: ${userMessage}. Sé conciso y profesional.` }]
                }],
                generationConfig: {
                    maxOutputTokens: 300,
                    temperature: 0.7
                }
            })
        });

        console.log(`Log: Gemini API responded with status ${response.status}`);

        const data = await response.json();

        if (response.ok && data.candidates && data.candidates[0].content.parts[0].text) {
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ response: data.candidates[0].content.parts[0].text })
            };
        } else {
            console.error("Error: Invalid or error response from Gemini API", data);
            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: 'AI Provider Error',
                    details: data.error || 'Invalid response structure'
                })
            };
        }

    } catch (err) {
        console.error("Fatal: Exception in function handler", err.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error', message: err.message })
        };
    }
};
