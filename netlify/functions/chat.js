/**
 * Netlify Function: AI Chat Proxy (Resilient Version)
 */

exports.handler = async (event) => {
    // 1. Diagnostics: Allow GET to test if function is live
    if (event.httpMethod === 'GET') {
        return {
            statusCode: 200,
            body: JSON.stringify({ status: "alive", message: "Chat function is ready for POST requests" })
        };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    console.log("Chat function POST received");

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("CRITICAL: GEMINI_API_KEY is missing in Netlify environment variables.");
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Config Error: Missing API Key' })
            };
        }

        const body = JSON.parse(event.body);
        const userMessage = body.message || "";

        console.log(`Calling Gemini API for message: ${userMessage.substring(0, 20)}...`);

        const model = 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: `Actúa como un asistente experto de Lead Machine Pro. El usuario pregunta: ${userMessage}. Sé conciso.` }]
                }],
                generationConfig: {
                    maxOutputTokens: 250,
                    temperature: 0.7
                }
            })
        });

        console.log(`Gemini API Response Status: ${response.status}`);
        const data = await response.json();

        if (response.ok && data.candidates && data.candidates[0].content.parts[0].text) {
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ response: data.candidates[0].content.parts[0].text })
            };
        } else {
            console.error("Gemini Error Payload:", JSON.stringify(data));
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'AI Error', details: data })
            };
        }

    } catch (err) {
        console.error("Function Crash:", err.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Crash', message: err.message })
        };
    }
};
