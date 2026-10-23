# NEXUS — Ultimo segnale

Gioco browser con Phaser 4, asset Kenney CC0 e direttore tattico Jev/TypeSafe o Qwen/Hugging Face via API server.

```sh
cd nexus-arena
npm install
npm run dev
```

Aprire http://127.0.0.1:5173. Creare `nexus-arena/.env` copiando `.env.example` e inserire le proprie chiavi. Le credenziali non sono incluse nel repository.

Per Vercel impostare **Root Directory: `nexus-arena`**, framework Vite, build `npm run build`, output `dist`. Aggiungere le variabili server `HF_TOKEN` e/o `TYPESAFE_API_KEY` nelle impostazioni Vercel e fare il deploy.

[Istruzioni complete, comandi e crediti](nexus-arena/README.md) · [Verifiche e limiti del prototipo](nexus-arena/VERIFICA.md)
