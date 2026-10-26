const path = require('path');
const express = require('express');
const multer = require('multer');
const dotenv = require('dotenv');
const OpenAI = require('openai');
const speech = require('@google-cloud/speech');

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 }
});
const googleClient = new speech.SpeechClient();

function getProviderOrder(requestedProvider) {
    if (requestedProvider === 'whisper') return ['whisper'];
    if (requestedProvider === 'google') return ['google'];
    return process.env.SPEECH_PROVIDER === 'google'
        ? ['google', 'whisper']
        : ['whisper', 'google'];
}

async function transcribeWithWhisper(file) {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY chưa được cấu hình.');
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const result = await client.audio.transcriptions.create({
        file: await OpenAI.toFile(file.buffer, file.originalname || 'voice.webm', { type: file.mimetype }),
        model: 'whisper-1',
        language: 'vi',
        response_format: 'json'
    });
    return result.text || '';
}

async function transcribeWithGoogle(file) {
    const [response] = await googleClient.recognize({
        audio: { content: file.buffer.toString('base64') },
        config: {
            encoding: 'WEBM_OPUS',
            languageCode: 'vi-VN',
            model: 'latest_long',
            enableAutomaticPunctuation: true,
            useEnhanced: true
        }
    });
    return (response.results || [])
        .map(result => result.alternatives?.[0]?.transcript || '')
        .join(' ')
        .trim();
}

app.use(express.static(__dirname));

app.post('/api/transcribe', upload.single('audio'), async (request, response) => {
    if (!request.file) return response.status(400).json({ error: 'Thiếu file audio.' });

    const providers = getProviderOrder(request.query.provider);
    const errors = [];
    for (const provider of providers) {
        try {
            const text = provider === 'whisper'
                ? await transcribeWithWhisper(request.file)
                : await transcribeWithGoogle(request.file);
            if (text) return response.json({ provider, text });
            errors.push(`${provider}: không trả về văn bản.`);
        } catch (error) {
            errors.push(`${provider}: ${error.message}`);
        }
    }
    return response.status(503).json({ error: 'Không thể nhận dạng audio.', details: errors });
});

app.listen(port, () => {
    console.log(`Voice order server: http://localhost:${port}`);
});
