# Voicebot in cloud – senza il tuo dominio né sottodominio

Puoi hostare il voicebot su **Render.com** (o Railway): ti danno un URL tipo `https://voicebot-xxx.onrender.com`. La chat resta sul tuo sito (**tuodominio.it/iavod**); solo il WebSocket voce usa quell’URL. Niente sottodominio sul tuo dominio, niente server tuo.

---

## Render.com (piano gratuito)

### 1. Account e repo

- Vai su [render.com](https://render.com) e crea un account (gratis).
- Crea un **repository GitHub** con solo i file del voicebot:
  - `package.json`
  - `server.js`
  - (opzionale: questo file CLOUD-DEPLOY.md)
- Oppure: se hai già un repo del progetto, Render può usare la **sottocartella** `voicebot` (vedi sotto).

### 2. Nuovo Web Service su Render

1. Dashboard Render → **New +** → **Web Service**.
2. **Connect a repository**: collega il repo GitHub (quello che contiene voicebot).
3. **Name**: es. `voicebot`.
4. **Region**: scegli la più vicina (es. Frankfurt).
5. **Branch**: `main` (o il branch che usi).
6. **Root Directory**: se il voicebot è in una sottocartella, indica `voicebot`; se il repo è solo voicebot, lascia vuoto.
7. **Runtime**: Node.
8. **Build Command**: `npm install`.
9. **Start Command**: `npm start` oppure `node server.js`.
10. **Instance Type**: **Free**.

### 3. Variabile d’ambiente

- Nella stessa pagina, sezione **Environment** (Variabili d’ambiente):
  - **Key**: `ELEVENLABS_API_KEY`
  - **Value**: la tua chiave ElevenLabs (con **Speech to Text** abilitato).
- Clicca **Add** e poi **Create Web Service**.

### 4. Deploy

Render avvia il deploy. Quando è finito, in alto vedi l’URL del servizio, tipo:

`https://voicebot-xxxx.onrender.com`

(oppure un nome che hai scelto).

### 5. Collegare la chat

Nella pagina della chat in produzione (**/iavod/index.html**), aggiungi subito dopo `<head>`:

```html
<script>window.VOICE_WS_URL = 'wss://voicebot-xxxx.onrender.com/voice';</script>
```

Sostituisci `voicebot-xxxx.onrender.com` con l’URL reale che ti ha dato Render (senza `https://` qui va `wss://` e il path `/voice`).

Fatto: la modalità vocale userà il voicebot in cloud, senza toccare il tuo dominio né creare sottodomini.

---

## Limitazioni piano gratuito Render

- Il servizio si **spegne** dopo ~15 minuti senza richieste/connessioni. La prima volta che un utente clicca “Modalità vocale” può esserci 1–2 minuti di attesa (avvio a freddo), poi va bene.
- Se vuoi evitare lo spegnimento, puoi usare un servizio di “ping” che chiama il tuo URL ogni 10 minuti (es. cron-job.org su `https://voicebot-xxxx.onrender.com/health`), oppure passare a un piano a pagamento.

---

## Alternativa: Railway

- [railway.app](https://railway.app) → **Start a New Project** → **Deploy from GitHub** (repo con voicebot).
- Imposta la variabile `ELEVENLABS_API_KEY` nel pannello del progetto.
- Railway assegna un URL tipo `https://voicebot-production-xxxx.up.railway.app`.
- In **iavod** imposti:  
  `window.VOICE_WS_URL = 'wss://voicebot-production-xxxx.up.railway.app/voice';`

Stessa idea: tutto in cloud, nessun sottodominio sul tuo dominio.
