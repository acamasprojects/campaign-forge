# Campaign Forge

A web-based reference tool for D&D dungeon masters: keep NPCs, locations, and quests
in one place, cross-link them to each other, and filter or search down to exactly
what you need mid-session. Everything is saved to your browser's local storage —
nothing leaves your machine, no account required.

## Features

- **NPCs, Locations, and Quests** as first-class, fully editable entries
- **Cross-linking** — give a quest a giver NPC and a location, put NPCs at a
  location, nest locations inside each other — then jump between linked entries
  with one click
- **Filtering** by disposition, location, quest status, location type, and
  freeform tags (AND logic across active filters)
- **Search** — a per-list search box, plus a quick-search in the top bar that
  matches across all NPCs, locations, and quests at once and jumps you straight
  to the result
- **Multiple campaigns**, switchable and renameable from the sidebar
- **Export / Import** your data as a JSON backup file

## Running it locally

You'll need [Node.js](https://nodejs.org) installed (v18+ recommended).

```bash
npm install
npm run dev
```

Then open the URL it prints (usually `http://localhost:5173`) in your browser.

## Building for production

```bash
npm run build
npm run preview
```

`npm run build` outputs a static site into `dist/` that you can host anywhere,
or open `dist/index.html` directly.

## Deploying to GitHub Pages

A workflow at `.github/workflows/deploy.yml` builds and publishes the app to
GitHub Pages automatically on every push to `main`. To turn it on:

1. Push this repo to GitHub.
2. In the repo's **Settings → Pages**, set **Source** to "GitHub Actions".
3. Push to `main` (or run the workflow manually from the **Actions** tab).

Your campaign data lives in each visitor's own browser storage — the hosted
page is the same app, but nobody's data is shared or synced between devices.

## Project structure

```
campaign-forge/
├── index.html
├── package.json
├── vite.config.js
├── .github/workflows/deploy.yml   # GitHub Pages CI
└── src/
    ├── main.jsx                   # React root
    ├── App.jsx                    # top-level layout, campaign + navigation state
    ├── index.css                  # all styling
    ├── data/model.js              # entity shapes + constants
    ├── hooks/useCampaignStore.js  # localStorage-backed campaign state
    ├── utils/search.js            # search/filter/tag helpers
    └── components/
        ├── Sidebar.jsx            # campaign switcher + export/import
        ├── TopBar.jsx             # tabs + global quick-search
        ├── FilterBar.jsx          # shared search + filter-chip toolbar
        ├── EntityCard.jsx         # collapsible card shell
        ├── ChoiceChips.jsx        # single-select chip row (status/type/etc.)
        ├── TagInput.jsx           # freeform tag editor
        ├── LinkPicker.jsx         # searchable single/multi entity picker
        └── panels/
            ├── NpcPanel.jsx
            ├── LocationPanel.jsx
            └── QuestPanel.jsx
```

## License

MIT — see [LICENSE](LICENSE).
