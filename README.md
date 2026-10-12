# Parada Mística: astrology and tarot toolkit

🇬🇧 English (official) · 🇧🇷 [Leia em português](README.pt-BR.md)

![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)
![No build step](https://img.shields.io/badge/build-none-lightgrey.svg)
![JavaScript](https://img.shields.io/badge/vanilla-JavaScript-f7df1e.svg)

A Portuguese-language website that brings together four self-knowledge tools under one brand: **card readings** (tarot and oracle decks), a **synastry** calculator with PDF report, **natal and composite charts**, and an **ephemeris and transits** calculator. It is a personal project that models a professional astrology practice, built with plain HTML, CSS and JavaScript, with no framework and no build step.

## Features

- **Card readings (Cartarium).** Tarot, Lenormand, Sibilla, Kipper, oracle and rune systems; 1 to 3 decks shuffled together; free or fixed spreads; optional reversed cards; suggested questions by area (general, love, work, spiritual); single-reading and session modes; a log of questions and draws with meanings; copy and image capture.
- **Deck manager.** Import, export, create and delete your own decks in the browser, or create a new system that reuses the spreads of an existing one. See [docs/custom-decks.md](docs/custom-decks.md).
- **Synastry.** Calculates a relationship reading from the aspects and house overlays of two charts: markers by area (affection, practical, emotional, intellectual, affinity, passion), scores (compatibility, harmony, structure, destiny, sharpness, verdict), a comparison across many relationships, an editable meaning dictionary, and a printable PDF report.
- **Charts.** Natal chart with planets, angles, lots, dignities, structural reading and a people registry; synastry and composite charts.
- **Ephemeris and transits.** Individual and dual transits over a date range, with an aspects table ordered by impact. Results can be copied for an AI assistant or exported as Markdown, JSON or CSV.
- **Light and dark themes**, responsive layout.

## Screenshots

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/home-dark.webp">
    <img alt="Home page" src="docs/screenshots/home-light.webp" width="820">
  </picture>
</p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/card-reading-dark.webp">
    <img alt="Card reading page with a three-card draw and the log of readings" src="docs/screenshots/card-reading-light.webp" width="820">
  </picture>
</p>

<details>
<summary>More screenshots</summary>

| Synastry calculator | Synastry report (PDF) |
|---|---|
| <img alt="Synastry calculator with scores and markers by area" src="docs/screenshots/synastry-calculator-dark.webp"> | <img alt="First page of a synastry report" src="docs/screenshots/synastry-report-pdf.webp"> |

| Report options | Meaning dictionary |
|---|---|
| <img alt="Synastry report options" src="docs/screenshots/synastry-report-options-dark.webp"> | <img alt="Synastry meaning dictionary" src="docs/screenshots/synastry-dictionary-dark.webp"> |

| Natal chart | Transits |
|---|---|
| <img alt="Natal chart form and table of positions" src="docs/screenshots/natal-chart-dark.webp"> | <img alt="Transits, positions and aspects table" src="docs/screenshots/ephemeris-dark.webp"> |

The images follow your GitHub theme; the site has its own light and dark toggle. Names in the examples are first names of people who agreed to appear.

</details>

## Tech stack

- HTML, CSS and vanilla JavaScript (ES modules in the charts and ephemeris pages). No framework, no bundler.
- Data saved in the browser only: `localStorage` for people and settings, `IndexedDB` for custom decks.
- [html2canvas](https://html2canvas.hertzen.com/) (CDN) for image capture, [Nominatim](https://nominatim.org/) (OpenStreetMap) for city lookup, Google Fonts (Montserrat) and a bundled copy of Kaushan Script for headings.
- Static hosting, with a ready-made `netlify.toml`.

## Getting started

There is nothing to install. Serve the folder with any static server (opening `index.html` straight from `file://` breaks ES modules and IndexedDB):

```bash
# Python
python3 -m http.server 8000

# or Node
npx serve .
```

Then open `http://localhost:8000`.

To deploy, connect the repository to Netlify (or any static host). `netlify.toml` already sets no build command and publishes the project root.

## Project structure

```
├── index.html               Home page
├── tiragem-cartas.html      Card readings (Cartarium)
├── sinastria.html           Synastry: calculator, dictionary, report
├── mapas.html               Natal, composite and people charts
├── efemerides.html          Transits and ephemeris
├── style.css                Home page and shared shell (header, nav, footer)
├── netlify.toml             Static hosting settings
├── assets/
│   ├── css/tokens.css       Design tokens (colors, type, spacing)
│   ├── fonts/               Kaushan Script (OFL)
│   ├── js/                  Shared scripts, such as the people picker
│   └── backgrounds/, *.png  Background images and brand marks
├── js/                      Shared shell and Cartarium logic
│   ├── custom-decks.js      Deck manager (import, export, create, delete)
│   └── main.js, spreads.js, systems.js, loader.js, ...
├── decks/                   Deck definitions (riderwaite.js, _template.js)
├── images/riderwaite/       Card images (public domain scans, 1909)
├── sinastria/               CSS and logic of the synastry pages
├── efemerides/              CSS and logic of the charts and ephemeris pages
├── docs/                    Documentation, screenshots and a sample deck
└── scripts/                 Helper script to prepare card images
```

### Portuguese names in the code

The interface and the code base are in Portuguese. A quick map:

| Portuguese | English |
|---|---|
| tiragem, tiragem de cartas | reading, spread, card reading |
| baralho, carta(s) | deck, card(s) |
| sistema | system (tarot, lenormand, sibilla, kipper, oracle, runes) |
| significados, direta, invertida | meanings, upright, reversed |
| créditos, fontes, acesso | credits, sources, accessed on |
| sinastria | synastry |
| mapa natal, mapa composto | natal chart, composite chart |
| efemérides, trânsitos | ephemeris, transits |
| pessoas, registro | people, log |
| consulta única, sessão | single reading, session |

## Scope and limitations

- **Entertainment and self-reflection, not advice.** Readings and synastry scores come from heuristic weights over planets, aspects and houses. They are not scientific and not a substitute for professional guidance. The pages say so.
- **Astronomical accuracy.** Planets use Keplerian orbital elements valid for roughly 1900 to 2100, accurate to a few arcminutes. The Moon uses a series of periodic terms (about 1 arcminute). Chiron uses fixed osculating elements, reliable for decades around 2000 to 2050. Houses: Whole Sign, Equal and Placidus (Placidus can fail at very high latitudes). Check borderline cases against dedicated astrology software.
- **Sample content.** The testimonials, the "+1,200 people" counter, the booking button, the newsletter form, the login icon and the About, Blog and Contact pages are placeholders. Nothing is stored or sent.
- **Privacy.** Birth data and people stay in your browser. Typing a city sends that text to Nominatim, and the pages load Google Fonts and html2canvas from external servers.
- **Chatbot.** The card reading page embeds a third-party chatbot (ThinkStack). If you fork this project, replace the `chatbot_id` in `tiragem-cartas.html` with your own or remove the iframe.
- **One built-in deck.** This public edition ships only the Rider–Waite–Smith (1909) deck, which is in the public domain, and a free font. The original personal version used a commercial font and several decks whose artwork could not be redistributed, which forced these choices. Use the deck manager to add your own decks.
- **Made with AI assistance.** The background images were generated with ChatGPT and edited by the author, and the card meaning texts were written by the author with the help of generative AI.

## License

The source code is under the [MIT License](LICENSE). Images, the font and card artwork have their own terms, listed in [NOTICE.md](NOTICE.md).
