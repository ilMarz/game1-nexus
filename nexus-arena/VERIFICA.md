# Verifica del prototipo

- `npm test`: 15 test passati: API Hugging Face e TypeSafe, validazione delle decisioni, selezione esplicita/automatica, protezione delle chiavi, nessun addebito alternativo se manca la chiave, rilettura `.env` e regressioni della pausa.
- `npm run build`: completata. Il bundle principale include il motore Phaser; Vite segnala il superamento della soglia indicativa di 500 kB, con circa 364 kB gzip di JavaScript.
- Browser reale: caricamento asset, avvio, movimento WASD, fuoco e collisioni, nemici, punteggio, potenziamento doppio laser, sconfitta, nuovo avvio e pausa osservati.
- Correzione input: focus del canvas all'avvio/ripresa; movimento orizzontale e verticale osservato con WASD, pausa manuale persistente che non viene chiusa dai tasti movimento, pulsante Riprendi visibile. La ripresa automatica alla pressione di un tasto movimento è coperta dal test di regressione.
- Ispezione grafica a due dimensioni della finestra. Il gioco usa sprite originali Kenney e un'immagine astronomica Hubble; nessun modello ML locale.
- Endpoint `/api/director` provato via HTTP: restituisce correttamente `missing_token` senza HF_TOKEN.
- Hugging Face reale verificato dopo la configurazione della chiave e l'aggiunta di credito: `/api/director` ha restituito `source: huggingface`, `tactic: assault` e il messaggio italiano "Assalto in corso. Preparati al peggio.". La chiave resta nel file `.env` escluso da Git.
- Deploy Vercel non eseguito: il controllo `vercel whoami` restituisce `Logged out`. Configurazione di build e Function già presenti.
- Boss e vittoria sono implementati; non è stata completata una partita vincente durante la verifica manuale.
- Jev integrato con API nativa TypeSafe e modello predefinito `jev-1.14.0`. Richiesta e risposta verificate con un mock aderente alla documentazione ufficiale. Il backend reale, senza chiave TypeSafe inserita, restituisce correttamente `missing_token` e non chiama Hugging Face. La risposta reale di Jev resta da verificare dopo l'inserimento della chiave.
- Browser: selettore Jev/Qwen/Auto visibile e selezione Jev verificata. Il direttore mantiene le quattro tattiche implementate; le frasi associate a Jev sono predefinite.
