exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { message } = JSON.parse(event.body);
        const API_KEY = process.env.GEMINI_API_KEY;
        const MODEL = 'gemini-1.5-flash';
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

        if (!API_KEY) {
            return { statusCode: 500, body: JSON.stringify({ error: 'GEMINI_API_KEY not configured on Netlify' }) };
        }

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: `Actúa como un asistente experto de Lead Machine Pro, una plataforma de gestión de leads y captación. El usuario pregunta: ${message}. Sé conciso y profesional.` }]
                }]
            })
        });

        const data = await response.json();

        if (data.candidates && data.candidates[0].content.parts[0].text) {
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ response: data.candidates[0].content.parts[0].text })
            };
        } else {
            throw new Error('Invalid response from AI');
        }

    } catch (error) {
        console.error('Chat error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to process AI request' }) };
    }
};
