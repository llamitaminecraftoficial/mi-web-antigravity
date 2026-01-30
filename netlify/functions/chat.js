/**
 * Netlify Function: AI Chat Proxy (Production Stable)
 * Optimized for gemini-2.0-flash confirmed in user account.
 */

exports.handler = async (event) => {
    // Basic Health Check (Clean)
    if (event.httpMethod === 'GET') {
        return { statusCode: 200, body: "Chat Service Online" };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const rawKey = process.env.GEMINI_API_KEY;
        if (!rawKey) return { statusCode: 500, body: JSON.stringify({ error: 'Configuración de IA incompleta.' }) };
        const apiKey = rawKey.trim();

        const body = JSON.parse(event.body);
        const userMessage = body.message || "";

        // Use the model that we confirmed works for your account
        const model = 'gemini-2.0-flash';
        const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `INSTRUCCIÓN DE SISTEMA: Eres el asistente experto de Lead Machine Pro. Tu misión es vender landing pages y CRM con web app. Si preguntan otra cosa, reconduce con amabilidad. Responde siempre en español de forma breve.

                     USUARIO: ${userMessage}`
                    }]
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
            const errorMsg = data.error ? data.error.message : "Error en la respuesta de Google.";
            return {
                statusCode: 500,
                body: JSON.stringify({ error: `La IA tuvo un problema técnico: ${errorMsg}` })
            };
        }

    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Error de conexión: ${err.message}` })
        };
    }
};
