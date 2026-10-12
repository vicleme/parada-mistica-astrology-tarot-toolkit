# Notices: assets, fonts and third-party material

The MIT license in [`LICENSE`](LICENSE) covers the **source code** (HTML, CSS, JavaScript and the card meaning texts written for this project). Everything else has its own terms.

| What | Where | Terms |
|---|---|---|
| Card artwork, Rider–Waite–Smith (1909) | `images/riderwaite/` | **Public domain.** Art by Pamela Colman Smith, published in 1909 by William Rider & Son (London). The digitized scans come from the Wikipedia article ["Rider–Waite Tarot"](https://en.wikipedia.org/wiki/Rider%E2%80%93Waite_Tarot), accessed on 08/10/2026, whose images are hosted on Wikimedia Commons. The names "Rider-Waite" and "Rider" are trademarks of U.S. Games Systems, Inc.; this project is not affiliated with it and uses the 1909 original, not a later edition. |
| Background images, logo and brand marks | `assets/` | **CC BY 4.0**, © 2026 Victor Leme. Generated with ChatGPT and edited by the author. Use them freely with credit; the legal status of AI-assisted images varies by country, so this is a statement of permission, not a guarantee. |
| Font: Kaushan Script | `assets/fonts/` | **SIL Open Font License 1.1**, © 2011 Pablo Impallari and Igino Marini. Full text in [`assets/fonts/OFL-KaushanScript.txt`](assets/fonts/OFL-KaushanScript.txt). The WOFF2 file is a format conversion of the original, with no change to the glyphs. |
| Font: Montserrat | loaded from Google Fonts at run time | SIL Open Font License 1.1. Not stored in this repository. |
| Card meaning texts | `decks/riderwaite.js` | Written by the author with the help of generative AI. Included under the MIT license. |
| Sample deck | `docs/examples/` | Five original illustrations made for this project, free to use. |
| html2canvas | loaded from cdnjs at run time | MIT. Not stored in this repository. |
| Chatbot | iframe in `tiragem-cartas.html` | Third-party service (ThinkStack). Not part of this project's code. |

## Why only one deck?

The original, personal version of this project used a commercial font and several decks whose artwork could not be redistributed. For a public repository the font was replaced by a free one and only decks that can be shared were kept. Anyone can add their own deck from the browser: see [`docs/custom-decks.md`](docs/custom-decks.md).
