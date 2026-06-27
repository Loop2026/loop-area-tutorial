# public/resources/

Cartella servita staticamente da Next.js all'URL `/resources/<file>`.

I moduli dell'area tutorial referenziano i file qui sotto. Finché un file
non è presente, il link nella pagina del modulo torna 404 — l'utente vede
il bottone ma cliccandolo non scarica nulla.

## File attesi (allineato al seed DB)

| URL pubblico | Tipo | Modulo | Stato |
|---|---|---|---|
| `/resources/m1-welcome.pdf`     | PDF   | m1 BENVENUTO                 | ❌ da produrre |
| `/resources/m1-prereq.pdf`      | PDF   | m1 BENVENUTO                 | ❌ da produrre |
| `/resources/m2-brokers.pdf`     | PDF   | m2 ONBOARDING BROKER         | ❌ da produrre |
| `/resources/m2-kyc-template.pdf`| PDF   | m2 ONBOARDING BROKER         | ❌ da produrre |
| `/resources/m3-risk-calc.xlsx`  | XLSX  | m3 ONBOARDING PROP CHALLENGE | ❌ da produrre |
| `/resources/m3-cheatsheet.pdf`  | PDF   | m3 ONBOARDING PROP CHALLENGE | ❌ da produrre |
| `/resources/m4-tech-doc.pdf`         | PDF   | m4 IL SOFTWARE LOOP 1.0          | ❌ da produrre |
| `/resources/m4-glossary.pdf`         | PDF   | m4 IL SOFTWARE LOOP 1.0          | ❌ da produrre |
| `/resources/m5-dashboard-guide.pdf`  | PDF   | m5 LA ARBITRAGE CLIENT DASHBOARD | ❌ da produrre |
| `/resources/m5-dashboard-features.pdf` | PDF | m5 LA ARBITRAGE CLIENT DASHBOARD | ❌ da produrre |
| `/resources/m6-runbook.pdf`          | PDF   | m6 SET UP OPERATIVO              | ❌ da produrre |

Inoltre il modulo m6 referenzia il canale Telegram esterno
[`@Customer_Care_Loop`](https://t.me/Customer_Care_Loop) — non è un file
locale, è un link diretto al gruppo di assistenza.

## Come aggiungere/aggiornare un file

1. Metti il file fisico in questa cartella, con lo stesso nome dell'URL
   (es. `public/resources/m1-welcome.pdf`).
2. Commit e push: Vercel ridistribuisce, e il link nel modulo inizia a funzionare.
3. Se cambi nome al file, aggiorna anche la riga `resources` del modulo in
   Supabase (tabella `public.modules`, colonna `resources` JSONB).

## Come cambiare l'elenco di risorse di un modulo

I file qui non sono "vincolati" alla lista del DB: il DB decide cosa
mostrare in pagina, questa cartella decide se il file è scaricabile.
Per aggiungere una nuova risorsa a un modulo:

1. Carica il file in questa cartella.
2. In Supabase aggiorna `modules.resources` per quel modulo aggiungendo
   un elemento al JSON array:

   ```json
   { "url": "/resources/m1-cheatsheet.pdf", "type": "pdf", "title": "Cheat sheet" }
   ```

   Tipi accettati: `pdf`, `xlsx`, `link`, `checklist`.

## Note operative

- I file scaricabili sono **pubblici** (chiunque conosca l'URL li scarica
  anche senza login). Non mettere qui documenti sensibili.
- Mantieni i PDF sotto i 5 MB per non rallentare il caricamento.
- File caricati qui finiscono nel bundle Vercel — niente CDN esterna.
