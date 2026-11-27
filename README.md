# Torneo Rocket League · Intesa Universitaria

Web app statica per seguire il torneo 3v3: iscrizioni, fase a gironi (classifiche automatiche), quarti, semifinali e finale con tabellone che si aggiorna da solo.

Nessun backend, nessun database: si ospita gratis su GitHub Pages (o Netlify / Vercel / Cloudflare Pages).

## Come funziona

- **Vista pubblica** (`/`): tutti vedono i dati contenuti in `public/tournament.json`.
- **Area organizzatori** (`/?admin`): si inseriscono squadre, gironi e risultati. Le modifiche vengono salvate come *bozza* nel browser (localStorage).
- **Pubblicare**: in *Gestione* → **Esporta tournament.json**, poi sostituisci `public/tournament.json` nel repository (anche dall'interfaccia web di GitHub: *Add file → Upload files*). GitHub Actions ricostruisce il sito in ~1 minuto.

> L'area organizzatori non ha password: chiunque può aprirla, ma le modifiche restano nel *suo* browser e non toccano il sito pubblico. Solo chi può fare commit sul repository pubblica i dati.

### Regole implementate

- Gironi all'italiana, calendario generato automaticamente; serie BO1/3/5/7 configurabili per fase.
- Classifica: serie vinte → differenza game → differenza reti → gol fatti → scontro diretto.
- Accoppiamenti dei quarti: 4 gironi × 2 (1A–2B, 1C–2D, 1B–2A, 1D–2C), 2 gironi × 4, 8 gironi × 1; per altri formati seeding generico. Le squadre entrano nel tabellone quando il loro girone è concluso; ogni slot si può comunque forzare a mano.
- Semifinali: QF1/QF2 e QF3/QF4; finale tra le vincenti.

## Sviluppo locale

```bash
npm install
npm run dev
```

Apri http://localhost:5173/?admin e, per provare, *Gestione → Carica dati demo*.

## Pubblicazione gratuita su GitHub Pages

1. Crea un repository su GitHub e fai push di questo progetto sul branch `main`.
2. Su GitHub: *Settings → Pages → Build and deployment → Source: **GitHub Actions***.
3. Ad ogni push il workflow `.github/workflows/deploy.yml` pubblica il sito su `https://<utente>.github.io/<repo>/`.

In alternativa su Netlify/Vercel/Cloudflare Pages: build command `npm run build`, cartella di output `dist`.
