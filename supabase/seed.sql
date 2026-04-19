-- =============================================================
-- LOOP Area Tutorial — SEED dati statici
-- 6 moduli video + 5 step checklist
-- =============================================================
-- Eseguire DOPO 001_init.sql:
--   psql $DB_URL -f supabase/seed.sql
-- oppure Supabase Studio > SQL Editor
-- =============================================================

-- -------------------------------------------------------------
-- MODULES  (m1..m6)
-- -------------------------------------------------------------
insert into public.modules (id, order_index, title, description, duration, level, bunny_video_id, chapters, resources, published) values

-- Modulo 1 --------------------------------------------------------
('m1', 1,
 'Introduzione al sistema LOOP',
 'Panoramica dell''arbitraggio matematico su XAUUSD: come funziona il sistema, perché è a rischio zero, cosa serve per iniziare.',
 '12:40', 'Base',
 null,  -- TODO: inserire GUID Bunny dopo upload
 '[
    {"time":0,"title":"Benvenuto"},
    {"time":90,"title":"Cos''è l''arbitraggio matematico"},
    {"time":300,"title":"Perché XAUUSD"},
    {"time":540,"title":"Setup iniziale richiesto"}
  ]'::jsonb,
 '[
    {"type":"pdf","title":"Guida benvenuto LOOP","url":"/resources/m1-welcome.pdf"},
    {"type":"checklist","title":"Pre-requisiti","url":"/resources/m1-prereq.pdf"}
  ]'::jsonb,
 true),

-- Modulo 2 --------------------------------------------------------
('m2', 2,
 'Apertura conti broker e KYC',
 'Procedura di apertura dei 2 conti broker necessari, verifica KYC e deposito iniziale. Con screenshot step-by-step.',
 '15:20', 'Base',
 null,
 '[
    {"time":0,"title":"Scelta broker A"},
    {"time":180,"title":"Registrazione e KYC broker A"},
    {"time":420,"title":"Scelta broker B"},
    {"time":600,"title":"Deposito minimo consigliato"},
    {"time":840,"title":"Verifica conti attivi"}
  ]'::jsonb,
 '[
    {"type":"pdf","title":"Lista broker raccomandati","url":"/resources/m2-brokers.pdf"},
    {"type":"link","title":"Template documenti KYC","url":"/resources/m2-kyc-template.pdf"}
  ]'::jsonb,
 true),

-- Modulo 3 --------------------------------------------------------
('m3', 3,
 'Parametri di rischio e money management',
 'Calibrazione dei parametri matematici del sistema: lotti, hedge ratio, tolleranza slippage, stop protettivo.',
 '18:05', 'Intermedio',
 null,
 '[
    {"time":0,"title":"Il concetto di hedge ratio"},
    {"time":240,"title":"Calcolo lotto per capitale"},
    {"time":540,"title":"Tolleranza slippage accettabile"},
    {"time":780,"title":"Stop protettivo sistemico"},
    {"time":960,"title":"Backtest parametri"}
  ]'::jsonb,
 '[
    {"type":"xlsx","title":"Calcolatore rischio LOOP","url":"/resources/m3-risk-calc.xlsx"},
    {"type":"pdf","title":"Cheat sheet parametri","url":"/resources/m3-cheatsheet.pdf"}
  ]'::jsonb,
 true),

-- Modulo 4 --------------------------------------------------------
('m4', 4,
 'Arbitraggio multi-broker: esecuzione',
 'Apertura della doppia posizione sincronizzata sui 2 broker. Pratica guidata con grafici reali.',
 '20:10', 'Intermedio',
 null,
 '[
    {"time":0,"title":"Setup MT4/MT5 dual"},
    {"time":300,"title":"Identificazione spread anomalo"},
    {"time":600,"title":"Esecuzione simultanea"},
    {"time":900,"title":"Monitoraggio e chiusura"},
    {"time":1140,"title":"Log operazione nel diario"}
  ]'::jsonb,
 '[
    {"type":"pdf","title":"Checklist pre-esecuzione","url":"/resources/m4-checklist.pdf"},
    {"type":"xlsx","title":"Template diario operazioni","url":"/resources/m4-journal.xlsx"}
  ]'::jsonb,
 true),

-- Modulo 5 --------------------------------------------------------
('m5', 5,
 'Scaling e prop firm',
 'Come replicare il sistema su capitale prop firm per moltiplicare la size mantenendo rischio zero.',
 '16:30', 'Avanzato',
 null,
 '[
    {"time":0,"title":"Logica scaling prop firm"},
    {"time":240,"title":"Scelta prop firm compatibili"},
    {"time":480,"title":"Replicazione setup LOOP"},
    {"time":780,"title":"Gestione payout e reinvestimento"}
  ]'::jsonb,
 '[
    {"type":"pdf","title":"Lista prop firm compatibili","url":"/resources/m5-propfirm.pdf"},
    {"type":"xlsx","title":"Modello payout scaling","url":"/resources/m5-scaling.xlsx"}
  ]'::jsonb,
 true),

-- Modulo 6 --------------------------------------------------------
('m6', 6,
 'Revisione finale e operatività continua',
 'Routine settimanale di verifica sistema, troubleshooting problemi comuni, canale di supporto LOOP.',
 '10:45', 'Base',
 null,
 '[
    {"time":0,"title":"Review settimanale"},
    {"time":180,"title":"Problemi comuni e soluzioni"},
    {"time":420,"title":"Canale supporto LOOP"},
    {"time":540,"title":"Prossimi passi"}
  ]'::jsonb,
 '[
    {"type":"pdf","title":"Runbook settimanale","url":"/resources/m6-runbook.pdf"},
    {"type":"link","title":"Canale supporto","url":"https://loop-support.example.com"}
  ]'::jsonb,
 true)

on conflict (id) do update set
  order_index    = excluded.order_index,
  title          = excluded.title,
  description    = excluded.description,
  duration       = excluded.duration,
  level          = excluded.level,
  chapters       = excluded.chapters,
  resources      = excluded.resources,
  published      = excluded.published;

-- -------------------------------------------------------------
-- CHECKLIST ITEMS  (c1..c5)
-- -------------------------------------------------------------
insert into public.checklist_items (id, order_index, title, subtitle) values
('c1', 1, 'Completa la procedura KYC',            'Verifica identità sui 2 broker selezionati'),
('c2', 2, 'Effettua il primo deposito',            'Deposito minimo €500 per broker (totale €1.000)'),
('c3', 3, 'Installa e configura MT4/MT5',          'Terminale trading con i 2 account collegati'),
('c4', 4, 'Imposta i parametri di rischio LOOP',   'Lotti, hedge ratio, slippage come da Modulo 3'),
('c5', 5, 'Esegui la prima operazione in demo',    'Prova l''arbitraggio in ambiente demo prima del live')
on conflict (id) do update set
  order_index = excluded.order_index,
  title       = excluded.title,
  subtitle    = excluded.subtitle;

-- =============================================================
-- END seed
-- =============================================================
