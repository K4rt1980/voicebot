/**
 * Voicebot – WebSocket /voice → ElevenLabs STT Realtime + TTS Multi-Context
 * Una connessione per client: PCM → STT, comandi JSON speak/interrupt → TTS.
 * Variabili: ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID (opzionale)
 */

const http = require('http');
const WebSocket = require('ws').WebSocket;
const WebSocketServer = require('ws').WebSocketServer;

const PORT = parseInt(process.env.PORT || '3000', 10);
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';
// Per pronuncia italiana affidabile usa una voce italiana da https://elevenlabs.io/voice-library (filtra Italian)
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';

const server = http.createServer((req, res) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { ...cors, 'Content-Length': '0' });
    res.end();
    return;
  }
  if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
    res.writeHead(200, { 'Content-Type': 'application/json', ...cors });
    res.end(JSON.stringify({ status: 'ok', voice: !!ELEVENLABS_API_KEY }));
    return;
  }
  res.writeHead(404, cors);
  res.end();
});

if (ELEVENLABS_API_KEY && WebSocketServer) {
  const wss = new WebSocketServer({ server, path: '/voice' });
  wss.on('connection', (clientWs) => {
    let currentTtsContextId = null;
    const sttUrl = 'wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_v2_realtime&audio_format=pcm_16000&language_code=it&commit_strategy=vad';
    const sttWs = new WebSocket(sttUrl, {
      headers: { 'xi-api-key': ELEVENLABS_API_KEY }
    });

    const ttsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}/multi-stream-input?model_id=eleven_flash_v2_5&output_format=mp3_44100_32&language_code=it`;
    const ttsWs = new WebSocket(ttsUrl, {
      headers: { 'xi-api-key': ELEVENLABS_API_KEY }
    });

    ttsWs.on('message', (data) => {
      try {
        const j = JSON.parse(data.toString());
        if (clientWs.readyState !== WebSocket.OPEN) return;
        clientWs.send(JSON.stringify({
          type: 'tts',
          audio: j.audio,
          contextId: j.contextId,
          is_final: j.isFinal === true
        }));
      } catch (_) {}
    });
    ttsWs.on('error', () => {});
    ttsWs.on('close', () => {});

    sttWs.on('open', () => {
      clientWs.on('message', (msg) => {
        if (clientWs.readyState !== WebSocket.OPEN) return;
        const isLikelyJson = Buffer.isBuffer(msg) ? (msg.length > 0 && msg[0] === 0x7b) : (typeof msg === 'string');
        if (isLikelyJson) {
          try {
            const raw = Buffer.isBuffer(msg) ? msg.toString('utf8') : msg;
            const j = JSON.parse(raw);
            if (j.type === 'interrupt' && currentTtsContextId && ttsWs.readyState === WebSocket.OPEN) {
              ttsWs.send(JSON.stringify({ context_id: currentTtsContextId, close_context: true }));
              currentTtsContextId = null;
            } else if (j.type === 'speak' && typeof j.text === 'string' && ttsWs.readyState === WebSocket.OPEN) {
              const text = String(j.text).trim();
              if (!text) return;
              if (currentTtsContextId) {
                ttsWs.send(JSON.stringify({ context_id: currentTtsContextId, close_context: true }));
              }
              currentTtsContextId = 'ctx_' + Date.now();
              const textWithSpace = text.replace(/\s+/g, ' ').trim() + ' ';
              const voiceSettings = { stability: 0.75, similarity_boost: 0.8 };
              ttsWs.send(JSON.stringify({
                text: textWithSpace,
                context_id: currentTtsContextId,
                voice_settings: voiceSettings
              }));
              ttsWs.send(JSON.stringify({ context_id: currentTtsContextId, flush: true }));
            }
          } catch (_) {}
          return;
        }
        if (Buffer.isBuffer(msg) && sttWs.readyState === WebSocket.OPEN) {
          const base64 = msg.toString('base64');
          try {
            sttWs.send(JSON.stringify({
              message_type: 'input_audio_chunk',
              audio_base_64: base64,
              commit: false,
              sample_rate: 16000
            }));
          } catch (_) {}
        }
      });
    });
    sttWs.on('message', (data) => {
      try {
        const j = JSON.parse(data.toString());
        const text = (j.text || '').trim();
        if (!text) return;
        if (clientWs.readyState !== WebSocket.OPEN) return;
        const isFinal = (j.message_type === 'committed_transcript' || j.message_type === 'committed_transcript_with_timestamps');
        clientWs.send(JSON.stringify({ transcript: text, is_final: isFinal }));
      } catch (_) {}
    });
    sttWs.on('error', () => { try { clientWs.close(); } catch (_) {} });
    sttWs.on('close', () => { try { clientWs.close(); } catch (_) {} });
    clientWs.on('close', () => {
      try { sttWs.close(); } catch (_) {}
      try { ttsWs.close(); } catch (_) {}
    });
  });
}

server.listen(PORT, () => {
  console.log('Voicebot in ascolto su porta', PORT);
  if (ELEVENLABS_API_KEY) {
    console.log('WebSocket /voice attivo (STT + TTS ElevenLabs)');
  } else {
    console.log('ATTENZIONE: imposta ELEVENLABS_API_KEY per abilitare /voice');
  }
});
