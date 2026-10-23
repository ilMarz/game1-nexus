# Verifica del prototipo

- `npm test`: 25 test passati: API, provider, `.env`, pausa, input e rotazione. Verificati Q/E indipendenti dallo spostamento, F per EMP, velocità angolare indipendente dal frame rate, direzione e punti di origine dei laser nei quattro quadranti.
- `npm run build`: completata. Il bundle principale include il motore Phaser; Vite segnala il superamento della soglia indicativa di 500 kB, con circa 364 kB gzip di JavaScript.
- Browser reale: caricamento asset, avvio, movimento WASD, fuoco e collisioni, nemici, punteggio, potenziamento doppio laser, sconfitta, nuovo avvio e pausa osservati.
- Correzione input: focus del canvas all'avvio/ripresa; movimento orizzontale e verticale osservato con WASD, pausa manuale persistente che non viene chiusa dai tasti movimento, pulsante Riprendi visibile. La ripresa automatica alla pressione di un tasto movimento è coperta dal test di regressione.
- Ispezione grafica a due dimensioni della finestra. Il gioco usa sprite originali Kenney e un'immagine astronomica Hubble; nessun modello ML locale.
- Endpoint `/api/director` provato via HTTP: restituisce correttamente `missing_token` senza HF_TOKEN.
- Hugging Face reale verificato dopo la configurazione della chiave e l'aggiunta di credito: `/api/director` ha restituito `source: huggingface`, `tactic: assault` e il messaggio italiano "Assalto in corso. Preparati al peggio.". La chiave resta nel file `.env` escluso da Git.
- Deploy Vercel non eseguito: il controllo `vercel whoami` restituisce `Logged out`. Configurazione di build e Function già presenti.
- Boss e vittoria sono implementati; non è stata completata una partita vincente durante la verifica manuale.
- Jev integrato con API nativa TypeSafe e modello predefinito `jev-1.14.0`. Risposta reale osservata nel browser: JEV ATTIVO, assalto, latenza 231 ms, confidenza 80%. Sono misure di una singola chiamata, non un benchmark.
- Browser: selettore Jev/Qwen/Auto visibile e selezione Jev verificata. Il direttore mantiene le quattro tattiche implementate; le frasi associate a Jev sono predefinite.
- Nuovo gestore input: in locale D sposta X da 720 a 929,7, W sposta Y da 630 a circa 494. Dopo il cambio di direttore e la ripresa, le frecce spostano la nave a X=788 e Y=607 circa. Nella build compilata servita su porta 4174, destra/su spostano la nave da (720,630) a circa (879,505), poi il vettore torna a zero al rilascio. Posizioni lette dall'output diagnostico visibile, oltre all'ispezione grafica.
- Rotazione nel browser: tenendo E per circa 550 ms, orientamento misurato a 90,3°. La nave resta orientata a destra dopo il rilascio e dopo lo spostamento con D; laser e scia seguono il muso. Aggiunti pulsanti di rotazione anche ai controlli touch (non verificati su hardware touch).
