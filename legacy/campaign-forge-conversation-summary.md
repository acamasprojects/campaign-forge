# Campaign Forge — Conversation Summary

## Background
User previously built a web-based D&D campaign creation app called **Campaign Forge** in an earlier conversation, but Claude had no memory of that prior work. User asked to recreate it from scratch.

## Requirements Gathered
- **Core focus:** Session/encounter planning (combat, quests) — not worldbuilding or character management
- **Data handling:** All in-browser, saved locally, no login/accounts
- **Format:** Both an interactive version usable immediately, and downloadable project files

## What Was Built

### 1. Design direction
Went with a "game master's ledger" aesthetic instead of generic AI-design defaults:
- Deep ink-black background (`#14110F`) with brass/gold accents (`#C9A227`)
- Display font: Bitter (serif), body: Inter, data/stats: JetBrains Mono
- Signature element: initiative tracker styled as a ledger with HP bars and round tracking

### 2. Features implemented
- **Campaigns** — create, switch between, rename (double-click), delete multiple campaigns from a sidebar
- **Quest Log** — add quests with active/complete/failed status and freeform notes
- **Encounter Builder** — build reusable stat-block templates (name, type: monster/NPC/PC, AC, max HP, initiative modifier); multiple encounters per campaign
- **Initiative Tracker** — "Launch" an encounter to roll initiative for all combatants, auto-sort turn order, then run live combat: HP adjustment buttons (±1/±5), condition tags, round counter, next/previous turn navigation

### 3. Three deliverables produced
| File | Purpose |
|---|---|
| `CampaignForge.jsx` | Interactive React artifact (renders directly in Claude chat), persists via Claude's `window.storage` API |
| `campaign-forge.html` | Single self-contained HTML file — open directly in any browser, no build tools, persists via browser `localStorage` |
| `campaign-forge.zip` (→ `campaign-forge-app/`) | Full Vite + React project — a real local dev server (`npm run dev`), same UI/logic as the artifact but using `localStorage` instead of Claude's storage API |

## Local Setup Walkthrough
User wanted the project running as an actual web app (not just a static file) in `/Users/acamas/code/campaign-forge`.

Steps covered:
1. Created the target directory with `mkdir -p /Users/acamas/code/campaign-forge`
2. Downloaded `campaign-forge.zip` — Safari auto-extracted it into `campaign-forge-app/` in `~/Downloads` (deleting the original `.zip`), which caused initial confusion when `unzip` couldn't find the file
3. Diagnosed via `ls -la` and `find ~ -iname "*campaign-forge*"` that the extracted folder had actually already landed inside `/Users/acamas/code/campaign-forge/campaign-forge-app`
4. Confirmed folder structure was correct: `package.json`, `index.html`, `vite.config.js`, `src/`, `README.md`, `.gitignore` all present
5. Next steps in progress: run `npm install` then `npm run dev`, open the local URL (typically `http://localhost:5173`) in a browser

## Project Structure (final)
```
/Users/acamas/code/campaign-forge/
├── campaign-forge.html          # standalone version
├── CampaignForge.jsx            # original artifact source
└── campaign-forge-app/          # Vite + React project
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── README.md
    ├── .gitignore
    └── src/
        ├── main.jsx
        ├── App.jsx              # all app logic + UI
        └── index.css
```

## Open Items
- Confirm `npm install` completes without errors and `npm run dev` serves the app successfully
- Possible future additions the user hasn't yet requested but were flagged as options: loot tracking, maps, dice roller, NPC relationship webs
- Optional: turn the local project into a git repository
