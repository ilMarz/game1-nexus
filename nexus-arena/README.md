# NEXUS — Ultimo segnale

Gioco browser realizzato con **Phaser 4.2.1**, Arcade Physics e asset professionali Kenney Space Shooter Redux (CC0). Tre ondate, boss, fuoco manuale con il mouse, scatto, EMP, potenziamenti, suoni e record locale. Il direttore strategico usa **Jev di TypeSafe oppure Qwen via Hugging Face**, sempre via API server, senza modelli nel browser.

## Avvio

Richiede Node 22.12 o successivo.

```sh
npm install
npm run dev
```

Aprire http://127.0.0.1:5173. WASD/frecce: movimento; Spazio: scatto invulnerabile; F: EMP; P: pausa. Su touch: joystick e pulsanti. Il mouse orienta la navicella verso il cursore; tieni premuto il tasto sinistro sul campo di gioco per sparare. WASD e frecce spostano la nave sugli assi dello schermo, indipendentemente dalla mira. Il mirino segue il cursore. Rilascio del tasto, pausa, uscita dal canvas e perdita di focus fermano il fuoco. Su touch: joystick sinistro per muoversi e pressione/trascinamento sul campo per mirare e sparare. Per vincere, distruggere NEXUS e raggiungere 90 secondi; dopo 150 secondi senza aver distrutto il boss la missione termina.

Avvio e ripresa danno il focus della tastiera all'arena. Quando si passa a un'altra finestra o alla chat, compare una schermata di pausa persistente: WASD/frecce riprendono una pausa automatica, mentre una pausa richiesta con P si chiude con P o con il pulsante Riprendi. I tasti vengono azzerati quando si perde il focus, per evitare movimenti bloccati o rimasti premuti.

Il movimento legge direttamente gli eventi DOM `keydown`/`keyup` in cattura usando `event.code`, con fallback a `event.key`; non dipende dal vecchio `keyCode` o dalla coda tastiera Phaser. La fisica resta Arcade Physics. Anche il cambio di direttore AI restituisce il focus al canvas. Per diagnosi aprire `/?debugControls`: viene mostrata la posizione reale della navicella e il vettore di input, senza esporre credenziali.

## Hugging Face e Vercel

1. Importare questa cartella come progetto Vite su Vercel. In un repository che contiene anche il piano, impostare **Root Directory: nexus-arena**.
2. Build: `npm run build`; output: `dist`. `api/director.js` diventa una Vercel Function.
3. In Vercel → Settings → Environment Variables aggiungere **HF_TOKEN**, con un token Hugging Face autorizzato a Inference Providers. Non usare il prefisso `VITE_`: la chiave deve restare sul server.
4. Facoltativamente impostare **HF_MODEL**; default `Qwen/Qwen3-8B`. Verificare che il modello sia servito dal provider e che l'account abbia credito.
5. Eseguire il deploy o redeploy dopo aver aggiunto le variabili.

Per testare l'AI sul computer, copiare `.env.example` in `.env`, inserire la propria chiave e riavviare `npm run dev`. Non inserire token nella chat o nei file del frontend.

### Jev / TypeSafe

Per confrontare il direttore generativo con il comportamento programmato scegliere **AI disattivata** nel selettore, anche durante una partita. La modalità off non chiama API, annulla le richieste in corso e ignora le loro risposte tardive. La tattica torna immediatamente ad assalto fisso; i nemici continuano a muoversi, sparare e seguire la progressione delle ondate. Non c'è adattamento alla salute o alle azioni del giocatore. I nemici e i proiettili già presenti restano nella partita: il confronto durante una singola partita non è un test controllato. La tattica corrente è visibile sotto il timer. Riattivando Jev/Qwen viene richiesta una nuova decisione alla ripresa della simulazione; la scelta off è ricordata anche dopo il reload.

Nel file `.env` (oppure nelle variabili server di Vercel) impostare:

```env
TYPESAFE_API_KEY=la_propria_chiave_typesafe
TYPESAFE_MODEL=jev-1.14.0
AI_PROVIDER=auto
```

Il server locale rilegge `.env` dopo il salvataggio; non serve riavviarlo. Su Vercel le nuove variabili richiedono un redeploy. Le variabili già presenti nell'ambiente del processo hanno priorità sul file.

Dal selettore **Direttore AI** si sceglie **Jev · TypeSafe**, **Qwen · Hugging Face** oppure **AI automatica**. Auto usa Jev quando la sua chiave è configurata, altrimenti Qwen. Una selezione esplicita senza chiave usa regole locali e mostra quale configurazione manca: non viene chiamato un altro servizio a pagamento.

Jev riceve la telemetria numerica e una domanda Choice con quattro alternative: `assault`, `flank`, `barrage`, `relief`. Risposta e confidenza vengono validate. Le comunicazioni italiane associate alle scelte di Jev sono frasi preparate dal gioco, non testo generato dal modello. Il tooltip dello stato riporta latenza server e confidenza; le API continuano a controllare frequenza e azioni consentite. **JEV ATTIVO** compare soltanto dopo una risposta reale valida. La confidenza è informativa: non sono ancora state calibrate soglie per questo gioco.

Fonti: [API nativa TypeSafe](https://docs.typesafe.ai/api/system-one), [Choice](https://docs.typesafe.ai/primitives/choice), [modelli](https://docs.typesafe.ai/models).

Il modello riceve solo telemetria numerica della partita. Ogni 24 secondi propone `assault`, `flank`, `barrage` o `relief`; Qwen genera anche una comunicazione italiana. Solo risposte valide sono applicate. L'interfaccia mostra **HUGGING FACE ATTIVO** esclusivamente dopo una risposta reale Qwen. Senza token o durante errori resta disponibile un direttore a regole. Non c'è inferenza ML locale.

Il limiter della Function è in memoria e offre solo una protezione per singola istanza: non è un limite di spesa globale. Prima di esporre il gioco a traffico elevato configurare limiti del provider e un rate limit condiviso/Vercel Firewall. Il prototipo non include autenticazione.

## Leggere la strategia durante la partita

Il pannello nell’arena mostra la tattica effettiva, chi l’ha scelta, le ultime tre decisioni con il tempo di partita e il numero delle risposte API valide con latenza server. Jev e Qwen scelgono fra le stesse quattro tattiche: possono quindi prendere la stessa decisione. Il pannello distingue richieste in corso, risposte reali, AI disattivata e fallback a regole locali.

- **Assalto frontale, arancione:** frecce dall’alto e nemici che inseguono il giocatore.
- **Attacco laterale, viola:** frecce da sinistra e destra, con rinforzi dai fianchi.
- **Raffica, rosa:** intervallo di tiro ridotto del 30%; linee di mira visibili negli ultimi 450 ms prima del colpo.
- **Tregua, verde:** intervallo fra rinforzi aumentato del 55%; i nemici già presenti continuano ad attaccare.

I cerchi nell’arena anticipano di 750 ms la posizione reale di un nuovo rinforzo. La pausa congela anche questo preavviso. Un cambio di tattica cancella gli arrivi ancora annunciati; i nemici già presenti rimangono. Colori, frecce e testi derivano dalla stessa configurazione usata dalla simulazione.

## Verifica

```sh
npm test
npm run build
```

I test API verificano validazione, fallback, token server e risposta simulata del provider. Per verificare l'inferenza reale serve HF_TOKEN. Gli asset sono inclusi nel progetto e non dipendono da hotlink esterni.

## Asset e licenze

Grafica e SFX: **Kenney Vleugels, Space Shooter Redux**, CC0. Fonte: https://opengameart.org/content/space-shooter-redux. Licenza originale: `public/assets/LICENSE-KENNEY.txt`. Le immagini distribuite sono i file originali del pacchetto; non provengono da giochi proprietari. Sfondo della nebulosa di Orione: NASA, ESA, Hubble Space Telescope Orion Treasury Project Team, Massimo Robberto (STScI, ESA); fonte https://science.nasa.gov/asset/hubble/orion-nebula-3/. Crediti completi in `public/assets/CREDITS.txt`. Phaser: MIT.
