# KinkMatch

A private, serverless BDSM practices checklist for talking about desires and limits with a partner — and comparing answers.

**Live site:** https://klevatess.github.io/kinkmatch/

> 18+ only. The site is a conversation aid, not advice. Consent, safety and communication are always your own responsibility.

## What it does

- **Checklist** — 488 practices in 14 sections. Mark each one *No*, *Maybe*, *Yes* or *Love*, add your role (Top / Bottom) and a short "About me".
- **Share without an account** — your answers are packed into the link itself (or a QR code). Nothing is sent to a server.
- **Compare** — paste two or more links (up to 10). For two people: matches, things to discuss and hard limits. For a group: what everyone likes and a table of pair matches. A role can be set per participant right on the compare page.
- **Saved comparisons** — groups of 3+ can be saved and reopened; they pick up the newest version of every list on the device.
- **Templates** — make a shorter checklist from a selection of items and send it to a friend.
- **"What shall we try?"** — a roulette that picks something both of you marked Yes or Love (random pairs for a group).
- **Portrait** — how much each group of sections is liked, in percent, plus a vertical picture card for a profile or a story.
- **PDF** — a printable version of a list, optionally with the portrait as the first page.
- **7 languages** — Russian, English, Portuguese, Spanish, Japanese, Thai, Traditional Chinese.
- Light and dark theme, works on phones.

## Privacy

- No accounts and no server-side storage. Lists live in the link and in your browser's local storage.
- Visits are counted with [GoatCounter](https://www.goatcounter.com/) — no cookies, no personal data, and never the answers. The counter script is stored in this repository rather than loaded from outside.
- To exclude your own visits from the counter, open `https://klevatess.github.io/kinkmatch/#toggle-goatcounter` once in each browser.

## How it is built

Plain HTML, CSS and JavaScript (ES2017). No framework, no build step, no dependencies to install — the files in this repository are the site.

```
index.html         the checklist
compare.html       the compare page
css/style.css      all styles
js/boot.js         loads the scripts for each page
js/core/           shared logic: link codec, storage, matching, portrait, help, stats
js/data/           the list of practices and profile fields
js/lang/           interface and practice texts, one pair of files per language
js/form/           the checklist page
js/compare/        the compare page and the roulette
js/vendor/         GoatCounter's counter script (unmodified)
tests/             automated tests (Node.js + jsdom)
```

Loaded from outside at runtime: Google Fonts (Inter, Fraunces) and, only when a PDF or QR code is made, `html2canvas`, `jsPDF` and `qrcodejs` from cdnjs.

### Run locally

Any static file server works, for example:

```
python3 -m http.server 8000
```

then open http://localhost:8000/.

### Tests

```
cd tests
npm install jsdom
node --max-old-space-size=5500 suite.js
```

### Compatibility rule

Links that people have already shared must keep working. Item codes and ids are permanent: new practices are only ever added at the end, and nothing is renumbered.

## License

[MIT](LICENSE) © 2026 klevatess.

Third-party parts keep their own licenses: GoatCounter `count.js` (ISC), html2canvas, jsPDF and qrcodejs (MIT), Inter and Fraunces fonts (SIL Open Font License).
