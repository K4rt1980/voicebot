# Voicebot – Deploy in /voicebot

Server Node che espone il WebSocket **/voice** (proxy verso ElevenLabs Speech-to-Text). Usato dalla chat in **/iavod** per la modalità vocale “telefonata” (microfono aperto una volta, niente bip).

---

## 1. Cosa caricare in /voicebot

Carica sul server **tutta** la cartella `voicebot` nella directory che diventerà la root dell’app (es. `/voicebot` o la document root del sottodominio):

```
voicebot/
├── package.json
├── server.js
├── DEPLOY.md     (questo file)
└── node_modules/ (opzionale: puoi generarlo sul server con npm install)
```

- Se carichi **senza** `node_modules`: dopo l’upload, sul server esegui `npm install` dentro `/voicebot`.
- Se carichi **con** `node_modules` (dopo aver fatto `npm install` in locale): l’upload è più pesante ma sul server non serve eseguire npm.

**Non** mettere nel pacchetto file con chiavi (niente `.env` con la API key dentro).

---

## 2. Cosa inserire nel pannello (Plesk / hosting)

### Opzione A – Plesk con estensione “Node.js”

1. **Aggiungi un sottodominio** (es. `voice.tuodominio.it`) oppure usa un dominio dedicato.
2. Vai in **Siti web e domini** → il dominio/sottodominio → **Impostazioni Node.js** (o “Node.js” nel menu).
3. **Abilita** l’applicazione Node.js.
4. **Percorso dell’applicazione / Document root**: la cartella dove hai caricato voicebot (es. `/voicebot` o `~/voicebot`).
5. **Modalità**: Production.
6. **File di avvio**: `server.js` (o lascia il default se punta già a `server.js`).
7. **Variabili d’ambiente** (Environment variables / Variabili d’ambiente):
   - Nome: `ELEVENLABS_API_KEY`  
   - Valore: `la-tua-chiave-elevenlabs`  
   (stessa chiave usata per il TTS in iavod; sulla chiave deve essere abilitato anche **Speech to Text → Accesso**.)
8. **Porta applicazione**: lascia quella proposta (es. 3000) oppure imposta `PORT` tra le variabili d’ambiente (es. `PORT=3000`).
9. **Salva** e **Riavvia** l’applicazione Node.js.
10. Configura **proxy inverso** (se non è già attivo): richieste a `https://voice.tuodominio.it` devono essere inoltrate a `http://127.0.0.1:PORT` (stessa porta dell’app). In Plesk di solito è gestito automaticamente quando attivi Node.js sul dominio.

Verifica: apri `https://voice.tuodominio.it/` o `https://voice.tuodominio.it/health` → deve rispondere `{"status":"ok","voice":true}`.

---

### Opzione B – Pannello generico (cPanel / altro) o VPS

- **Esegui** l’app Node sulla macchina (es. porta 3000):
  - Dalla cartella dell’app: `npm install` poi `node server.js`.
  - Oppure con **PM2**:  
    `pm2 start server.js --name voicebot`  
    e imposta le variabili d’ambiente (es. `pm2 start server.js --name voicebot --update-env` dopo aver impostato `ELEVENLABS_API_KEY` nell’ambiente o in un file `.env` che leggi con un loader, se lo aggiungi).
- **Variabili d’ambiente** da impostare (nel pannello “Variabili d’ambiente”, nel file `.env` o nel comando di avvio):
  - `ELEVENLABS_API_KEY` = la tua chiave ElevenLabs (con Speech to Text abilitato).
  - `PORT` = porta su cui ascolta l’app (es. 3000), se il pannello non la imposta già.
- **Proxy inverso**: configura Nginx/Apache in modo che:
  - `https://voice.tuodominio.it` (o il path che usi) → `http://127.0.0.1:PORT`
  - Sia abilitato l’upgrade WebSocket per il path `/voice` (es. Nginx: `proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade";`).

---

## 3. Collegare la chat (iavod) al voicebot

Nella pagina che carica la chat (es. **/iavod/index.html**), imposta l’URL del WebSocket voce **prima** degli script della chat. Esempio:

```html
<script>
  window.VOICE_WS_URL = 'wss://voice.tuodominio.it/voice';
</script>
```

Sostituisci `voice.tuodominio.it` con il dominio/sottodominio dove hai pubblicato voicebot. Se usi un path (es. `https://tuodominio.it/voicebot`) invece del sottodominio, usa:

```html
window.VOICE_WS_URL = 'wss://tuodominio.it/voicebot/voice';
```

(solo se il proxy inoltra correttamente WebSocket su quel path.)

Dopo aver salvato e pubblicato la modifica a **index.html**, apri la chat, clicca **Modalità vocale**: la connessione partirà verso `VOICE_WS_URL` e il microfono resterà aperto una volta (architettura “telefonata”).

---

## 4. Riepilogo pannello

| Dove | Cosa inserire |
|------|----------------|
| **Percorso / Document root** | Cartella dove hai caricato voicebot (es. `/voicebot`) |
| **File di avvio** | `server.js` |
| **Variabili d’ambiente** | `ELEVENLABS_API_KEY` = chiave ElevenLabs (TTS + STT). Opzionale: `ELEVENLABS_VOICE_ID` = ID di una voce italiana da Voice Library (filtra Italian) per pronuncia sempre in italiano |
| **Porta** | Lasciare default o impostare `PORT` (es. 3000) |
| **Proxy / Node.js** | Abilitare app Node e proxy verso la porta dell’app (con supporto WebSocket per `/voice`) |

Se qualcosa non torna (es. “Node.js” non compare nel pannello), descrivi che hosting/pannello usi e si può adattare la guida.
