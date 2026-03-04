/**
 * Voicebot – WebSocket /voice → ElevenLabs STT Realtime
 * Da caricare in /voicebot e avviare come app Node (Plesk / PM2).
 * Variabile d'ambiente: ELEVENLABS_API_KEY (con permesso Speech to Text)
 */

const http = require('http');
const WebSocket = require('ws').WebSocket;
const WebSocketServer = require('ws').WebSocketServer;

const PORT = parseInt(process.env.PORT || '3000', 10);
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', voice: !!ELEVENLABS_API_KEY }));
    return;
  }
  res.writeHead(404);
  res.end();
});

if (ELEVENLABS_API_KEY && WebSocketServer) {
  const wss = new WebSocketServer({ server, path: '/voice' });
  wss.on('connection', (clientWs) => {
    const sttUrl = 'wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_v2_realtime&audio_format=pcm_16000&language_code=it&commit_strategy=vad';
    const elWs = new WebSocket(sttUrl, {
      headers: { 'xi-api-key': ELEVENLABS_API_KEY }
    });
    elWs.on('open', () => {
      clientWs.on('message', (msg) => {
        if (elWs.readyState !== WebSocket.OPEN || !Buffer.isBuffer(msg)) return;
        const base64 = msg.toString('base64');
        try {
          elWs.send(JSON.stringify({
            message_type: 'input_audio_chunk',
            audio_base_64: base64,
            commit: false,
            sample_rate: 16000
          }));
        } catch (_) {}
      });
    });
    elWs.on('message', (data) => {
      try {
        const j = JSON.parse(data.toString());
        const mt = j.message_type;
        const text = (j.text || '').trim();
        if (!text) return;
        if (clientWs.readyState !== WebSocket.OPEN) return;
        const isFinal = (mt === 'committed_transcript' || mt === 'committed_transcript_with_timestamps');
        clientWs.send(JSON.stringify({ transcript: text, is_final: isFinal }));
      } catch (_) {}
    });
    elWs.on('error', () => { try { clientWs.close(); } catch (_) {} });
    elWs.on('close', () => { try { clientWs.close(); } catch (_) {} });
    clientWs.on('close', () => { try { elWs.close(); } catch (_) {} });
  });
}

server.listen(PORT, () => {
  console.log('Voicebot in ascolto su porta', PORT);
  if (ELEVENLABS_API_KEY) {
    console.log('WebSocket /voice attivo (ElevenLabs STT)');
  } else {
    console.log('ATTENZIONE: imposta ELEVENLABS_API_KEY per abilitare /voice');
  }
});
