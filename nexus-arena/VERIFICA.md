# Verifica del prototipo

- `npm test`: 27 test passati: API, provider, `.env`, pausa, input, AI off e mira automatica. La mira al centro è verificata su 36 posizioni di un’orbita completa e al centro esatto; Q/E non hanno più azioni associate.
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
- AI off: verificati selezione prima della partita, passaggio Jev → off durante la partita, assalto fisso, refresh AI disabilitato e indicatore tattico sotto il timer. Le risposte tardive della modalità precedente vengono ignorate tramite revisione della selezione; l'endpoint off non esegue fetch, come verificato dal test. Il confronto non usa un seed condiviso tra partite.
- Mira automatica verificata nel browser: a (941,630) orientamento circa -50,8°, a (946,409) circa -100,3°, entrambi verso il centro (720,450). Laser e scia seguono la direzione automatica. Rimossi i controlli di rotazione manuale, mantenuti movimento, scatto e F per EMP.
