# Minefield — Minesweeper

A standalone, responsive Minesweeper game built with React, TypeScript, and Vite. The game runs entirely in the browser; board state is kept in memory and no backend or account is required.

## Requirements

- Node.js 20.19+, 22.12+, or 24+
- npm

## Run locally

From this directory:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`).

## GitHub Pages

The live game is published at <https://phillipchiu.github.io/react-minesweeper/>.
Pushing to `main` runs the GitHub Actions workflow in
`.github/workflows/deploy-pages.yml`, which tests, builds, and deploys the site.

## Tests and production build

```bash
npm test           # Run the Vitest and Testing Library suite
npm run test:watch # Re-run tests while editing
npm run build      # Type-check and create the production app in dist/
npm run preview    # Serve the production build locally
```

The tests cover the exact difficulty presets, mine placement and adjacent counts, first-reveal safety, flagging, zero-area expansion, win/loss/reset behavior, timer lifecycle, difficulty changes, keyboard controls, and the rendered board.

## How to play

| Difficulty | Board (width × height) | Mines |
| --- | ---: | ---: |
| Beginner | 9 × 9 | 10 |
| Intermediate | 16 × 16 | 40 |
| Expert | 30 × 16 | 99 |

- **Reveal:** click/tap a tile, or focus it and press **Enter** or **Space**.
- **Flag:** right-click a tile, press **F** while it is focused, or turn on **Flag mode** and tap the tile. Flag mode is provided for touchscreens.
- **Move focus:** use the **arrow keys**; **Home/End** move to the start/end of a row, and **Ctrl/⌘ + Home/End** move to a board corner.
- Your first reveal is safe. Placing a flag does not count as a reveal or trigger first-click protection.
- Revealing a zero-count tile opens the connected safe area. Revealing every safe tile wins; revealing a mine loses.
- **Reset** restarts the current mine layout. **New game** creates a fresh layout. Changing difficulty starts a new board.
- The timer starts on the first reveal and stops when the game ends. The mine counter is the number of mines minus the number of flags and may go below zero.

The Expert board stays full-sized and can be scrolled horizontally on narrow screens. Controls and board cells use semantic labels and visible keyboard focus styles.
