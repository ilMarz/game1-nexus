# NEXUS — Comando Orbitale

Gioco strategico browser: costruisci difese su 16 postazioni e proteggi una stazione per sei ondate. Jev/TypeSafe o Qwen/Hugging Face studiano lo schieramento e scelgono ingresso, composizione e obiettivo della flotta nemica. Motore Phaser 4, asset originali Kenney CC0 e inferenza solo tramite API server. Lo shooter precedente resta disponibile in `/arcade.html`.

```sh
cd nexus-arena
npm install
npm run dev
```

Aprire http://127.0.0.1:5173. Creare `nexus-arena/.env` copiando `.env.example` e inserire le proprie chiavi. Le credenziali non sono incluse nel repository.

Per Vercel impostare **Root Directory: `nexus-arena`**, framework Vite, build `npm run build`, output `dist`. Aggiungere le variabili server `HF_TOKEN` e/o `TYPESAFE_API_KEY` nelle impostazioni Vercel e fare il deploy.

[Istruzioni complete, comandi e crediti](nexus-arena/README.md) · [Verifiche e limiti del prototipo](nexus-arena/VERIFICA.md)
