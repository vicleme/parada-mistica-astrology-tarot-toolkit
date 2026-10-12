# Custom decks

The card reading page (`tiragem-cartas.html`) lets anyone bring their own deck without touching the code. Click the ⚙️ button next to the deck selector to open **Manage decks**.

Everything is stored in your own browser (IndexedDB). Nothing is uploaded to a server, and clearing the site data in your browser removes your decks. **Export a deck to keep a backup.**

## What you can do

| Action | What it does |
|---|---|
| **Import** | Reads a `.cartarium-deck.json` file (format below) and adds the deck to the selector. |
| **Create from images** | Builds a deck from image files on your computer (see below). Images are resized to 720 px tall and converted to WebP when the browser supports it. |
| **Credits** | For decks you own: edit the author/credit, source link and note shown under the deck selector. |
| **Export** | Downloads any deck as a `.cartarium-deck.json` file, including the built-in ones (the images are embedded in the file). |
| **Delete** | Removes a deck you created or imported. |
| **Hide / Show** | Built-in decks live in the site files, so they can't be deleted; hiding only removes them from your selector. At least one deck always stays visible. |

### Create from images

1. Pick the images. They are used in the alphabetical/numeric order of the file names (`card2` comes before `card10`).
2. Choose the **system**. It decides which spreads and suggested questions are offered. Pick **New system…** to make your own: give it a name and choose which existing system it borrows spreads and questions from.
3. List the cards, one per line, in the same order as the images: `Name | meaning | reversed meaning`. Only the name is required. The reversed meaning is only used if the deck accepts reversed cards.
4. Or pick **Copy names and meanings from** a deck: the list is filled in for you and you edit it.
5. Optionally fill in the credits (author, source link starting with `https://`, note or license).

A try-it file is in [`examples/sample-oracle.cartarium-deck.json`](examples/sample-oracle.cartarium-deck.json) (5 original cards, free to use).

## File format (version 1)

A single JSON file with images embedded as base64 data URLs.

```json
{
  "formato": "cartarium-deck",
  "versao": 1,
  "nome": "My Deck",
  "sistema": "oraculo",
  "aceitaInversao": true,
  "cartas": ["The Sun", "The Moon"],
  "significados": {
    "The Sun":  { "direta": "Warmth and clarity.", "invertida": "Burnout." },
    "The Moon": { "direta": "Intuition.",          "invertida": "Confusion." }
  },
  "creditos": {
    "texto": "Artwork by Someone",
    "url": "https://example.com/someone",
    "link": "example.com/someone",
    "nota": "Optional note shown under the selector."
  },
  "imagens": ["data:image/webp;base64,...", "data:image/png;base64,..."]
}
```

The field names are in Portuguese because the whole code base is.

| Field | Required | Rules |
|---|---|---|
| `formato` | yes | Must be `"cartarium-deck"`. |
| `versao` | yes | Number, `1` for now. Files from a newer version are refused. |
| `nome` | yes | Up to 80 characters. |
| `sistema` | yes | One of `tarot`, `lenormand`, `sibilla`, `kipper`, `oraculo`, `runas`. It decides which spreads are offered. |
| `sistemaPersonalizado` | no | `{ "nome": "...", "herdaDe": "oraculo" }` creates (or reuses, by name) a new system that borrows the spreads and questions of `herdaDe`. Keep `sistema` equal to `herdaDe` so older versions still open the file. |
| `aceitaInversao` | no | `true` shows the "include reversals" option. |
| `cartas` | yes | 1 to 200 unique names, up to 80 characters each, in the same order as `imagens`. |
| `imagens` | yes | One data URL per card: PNG, JPEG or WebP only (no SVG), up to about 2 MB each. |
| `significados` | no | Keyed by card name. Each entry may have `direta` and `invertida`, or a single `significado`; up to 1200 characters each. |
| `creditos` | no | `texto` is required if present; `url` is only kept if it starts with `https://` (otherwise it is dropped on import). Optional `fontes` is a list (up to 6) of `{ "link": "label", "url": "https://...", "acesso": "DD/MM/YYYY" }` shown as "Source: ... · Accessed on ...". Credits travel with the deck through export and import. |

The `id` is generated on import, so a file can never overwrite a built-in deck. Importing the same file twice adds a second deck named "(2)".

## Safety

Imported files are treated as untrusted. They are validated (types, sizes, image formats), and card names and meanings are always inserted into the page as text, never as HTML. A deck cannot run code.

## For site authors

- Built-in decks are still defined in `decks/*.js` (see `decks/_template.js`).
- A built-in deck can set `permiteExportar: false` to hide its **Export** button, for example when the artwork can't be redistributed.
- Custom decks are registered through the same `DECKS.registrar` as built-in ones, with `personalizado: true` and `imagens` holding blob URLs instead of `imagemPasta`.
