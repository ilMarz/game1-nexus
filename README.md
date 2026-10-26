# Terre di Confine

Strategico medievale browser **Jev contro Jev**: tu recluti l’esercito durante la battaglia e il tuo Jev guida le truppe che gli affidi contro un Jev nemico indipendente. Puoi intervenire manualmente in qualsiasi momento; quei soldati restano ai tuoi ordini finché non li restituisci al comandante. Entrambi i Jev si adattano a reclutamenti, interventi e cambiamenti sul campo. Cinque attraversamenti, alture e boschi tattici, percorsi A*, soldati animati e zoom. Comando Orbitale resta in `/orbitale.html`, lo shooter in `/arcade.html`.

```sh
cd nexus-arena
npm install
npm run dev
```

Aprire http://127.0.0.1:5173. Per Jev, configurare `TYPESAFE_API_KEY` in `nexus-arena/.env`, usando `.env.example` come riferimento. Le chiavi esistenti continuano a funzionare e restano sul server. Senza una chiave valida, il gioco dichiara esplicitamente il ripiego su regole locali.

Per Vercel impostare **Root Directory: `nexus-arena`**, framework Vite, build `npm run build`, output `dist`. Aggiungere le variabili server `TYPESAFE_API_KEY` nelle impostazioni Vercel e fare il deploy.

[Istruzioni complete, comandi e crediti](nexus-arena/README.md) · [Verifiche e limiti del prototipo](nexus-arena/VERIFICA.md)

Le skill usate nello sviluppo sono incluse in [`.agents/skills`](.agents/skills/README.md), con istruzioni e file di supporto originali.

## Blocco temporaneo del gioco

`ENABLE_LIMIT` è disattivata per default, anche se assente. Impostando `ENABLE_LIMIT=true` oppure `ENABLE_LIMIT=ON`, tutte le pagine mostrano soltanto “Limite JEV raggiunto” e le API rispondono con HTTP 503 senza contattare Jev. `ENABLE_LIMIT=false` ripristina il gioco. In locale il server rilegge `.env`; ricaricare la pagina dopo la modifica. Su Vercel impostare la variabile e fare un redeploy: la schermata viene applicata durante la build.
