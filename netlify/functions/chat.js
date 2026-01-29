const https = require('https');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    return new Promise((resolve) => {
        try {
            const { message } = JSON.parse(event.body);
            const API_KEY = process.env.GEMINI_API_KEY;
            const MODEL = 'gemini-1.5-flash';
            const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

            if (!API_KEY) {
                console.error('ERROR: GEMINI_API_KEY missing in Netlify Env Vars');
                return resolve({
                    statusCode: 500,
                    body: JSON.stringify({ error: 'GEMINI_API_KEY not configured' })
                });
            }

            const payload = JSON.stringify({
                contents: [{
                    parts: [{ text: `Actúa como un asistente experto de Lead Machine Pro, una plataforma de gestión de leads y captación. El usuario pregunta: ${message}. Sé conciso, profesional y humano.` }]
                }],
                generationConfig: {
                    maxOutputTokens: 250,
                    temperature: 0.7
                }
            });

            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': payload.length
                }
            };

            const req = https.request(API_URL, options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        if (json.candidates && json.candidates[0].content.parts[0].text) {
                            resolve({
                                statusCode: 200,
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ response: json.candidates[0].content.parts[0].text })
                            });
                        } else {
                            console.error('Gemini API Error details:', data);
                            resolve({
                                statusCode: 500,
                                body: JSON.stringify({ error: 'Invalid response from Gemini', details: data })
                            });
                        }
                    } catch (e) {
                        console.error('Parse Error:', e);
                        resolve({ statusCode: 500, body: JSON.stringify({ error: 'Failed to parse AI response' }) });
                    }
                });
            });

            req.on('error', (e) => {
                console.error('Request Error:', e);
                resolve({ statusCode: 500, body: JSON.stringify({ error: 'Network error calling Gemini' }) });
            });

            req.write(payload);
            req.end();

        } catch (error) {
            console.error('Fatal Function Error:', error);
            resolve({ statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) });
        }
    });
};
