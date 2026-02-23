# MyWA Chat Viewer

Visualizzatore web per chat WhatsApp esportate in `.txt`.

L'app gira interamente nel browser: puoi caricare chat reali dal tuo dispositivo, oppure provare subito 5 chat demo gia incluse (di cui 2 di gruppo).

## Funzionalita

- Upload multiplo di file `.txt` esportati da WhatsApp
- Parsing di chat private e gruppi
- Gestione messaggi multilinea e messaggi di sistema
- Ricerca chat per nome/contenuto recente
- Tema chiaro/scuro
- Salvataggio locale in `localStorage` (solo sul tuo browser)
- Demo pronta con 5 chat di esempio

## Struttura progetto

- `src/` app React principale
- `public/sample-chats/` 5 chat demo
- `.github/workflows/deploy-pages.yml` deploy automatico su GitHub Pages

## Avvio locale

```bash
npm install
npm start
```

Apri `http://localhost:3000`.

## Deploy automatico su GitHub Pages

Il repository e gia configurato con GitHub Actions.

1. Vai su GitHub -> `Settings` -> `Pages`
2. In `Build and deployment`, scegli `Source: GitHub Actions`
3. Fai push su `main`
4. Attendi il workflow `Deploy to GitHub Pages`

URL finale previsto:

`https://lukepalmdev.github.io/mywa/`

## Privacy chat personali

### Modalita consigliata (gia implementata)

- Non salvare chat personali nel repository.
- Caricale dal browser con `Carica Chat WhatsApp`.
- Le chat restano nel tuo `localStorage` locale.

### File privati locali (gia predisposto)

Nel `.gitignore` sono esclusi:

- `private-chats/`
- `*.private-chat.txt`
- `*.chat-backup.json`

Quindi puoi tenere file sensibili nella repo locale senza rischio di push.

### Se vuoi chat su GitHub ma non pubbliche

- Usa una repo **privata** separata per i file chat.
- Non pubblicare quella repo su GitHub Pages.

In una repo pubblica non esiste un modo sicuro per includere chat in chiaro senza renderle scaricabili a chi visita il sito.

## Comandi utili

```bash
npm test -- --watch=false --runInBand
npm run build
```

## Licenza

Uso personale / progetto demo.
