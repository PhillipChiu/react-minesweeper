import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { DIFFICULTIES, type DifficultyId } from "./game/difficulties";
import {
  createGame,
  remainingMines,
  resetGame,
  revealCell,
  toggleFlag,
} from "./game/engine";
import type { Cell, RandomSource } from "./game/types";
import "./App.css";

interface AppProps {
  readonly random?: RandomSource;
}

interface Position {
  readonly row: number;
  readonly column: number;
}

function cellName(cell: Cell, row: number, column: number): string {
  const location = `Row ${row + 1}, column ${column + 1}`;
  let description: string;

  if (cell.isRevealed && cell.isMine) {
    description = "mine";
  } else if (cell.isRevealed && cell.adjacentMines > 0) {
    description = `${cell.adjacentMines} adjacent ${
      cell.adjacentMines === 1 ? "mine" : "mines"
    }`;
  } else if (cell.isRevealed) {
    description = "empty";
  } else if (cell.isFlagged) {
    description = "flagged";
  } else {
    description = "hidden";
  }

  if (cell.isFlagged && cell.isRevealed) {
    description += ", flagged";
  }

  return `${location}, ${description}`;
}

function cellContent(cell: Cell): string {
  if (cell.isRevealed && cell.isMine) {
    return "✹";
  }

  if (!cell.isRevealed && cell.isFlagged) {
    return "⚑";
  }

  return cell.isRevealed && cell.adjacentMines > 0
    ? String(cell.adjacentMines)
    : "";
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds,
  ).padStart(2, "0")}`;
}

function gameMessage(status: "ready" | "playing" | "won" | "lost"): string {
  switch (status) {
    case "ready":
      return "Choose a tile to begin. Your first reveal is always safe.";
    case "playing":
      return "Game in progress. Take your time and watch the numbers.";
    case "won":
      return "Field cleared — you win!";
    case "lost":
      return "A mine was triggered. Reset the board or start a new game.";
  }
}

export default function App({ random = Math.random }: AppProps) {
  const [game, setGame] = useState(() => createGame("beginner", random));
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [flagMode, setFlagMode] = useState(false);
  const [activeCell, setActiveCell] = useState<Position>({
    row: 0,
    column: 0,
  });
  const cellRefs = useRef(new Map<string, HTMLButtonElement>());
  const timerStartedAt = useRef<number | null>(null);
  const preset = DIFFICULTIES[game.difficulty];
  const flagsRemaining = remainingMines(game);

  useEffect(() => {
    if (game.status === "ready") {
      timerStartedAt.current = null;
      return undefined;
    }

    const startedAt =
      timerStartedAt.current ??
      (timerStartedAt.current = performance.now());
    const updateElapsedTime = () => {
      setElapsedSeconds(
        Math.floor((performance.now() - startedAt) / 1000),
      );
    };

    updateElapsedTime();

    if (game.status !== "playing") {
      return undefined;
    }

    let isActive = true;
    const intervalId = window.setInterval(() => {
      if (isActive) {
        updateElapsedTime();
      }
    }, 1000);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [game.status]);

  function startNewGame(difficulty: DifficultyId = game.difficulty) {
    setGame(createGame(difficulty, random));
    timerStartedAt.current = null;
    setElapsedSeconds(0);
    setFlagMode(false);
    setActiveCell({ row: 0, column: 0 });
  }

  function restartGame() {
    setGame((currentGame) => resetGame(currentGame));
    timerStartedAt.current = null;
    setElapsedSeconds(0);
    setFlagMode(false);
    setActiveCell({ row: 0, column: 0 });
  }

  function changeDifficulty(value: string) {
    startNewGame(value as DifficultyId);
  }

  function handleCellClick(row: number, column: number) {
    if (flagMode) {
      setGame((currentGame) => toggleFlag(currentGame, row, column));
      return;
    }

    setGame((currentGame) =>
      revealCell(currentGame, row, column, random),
    );
  }

  function handleCellContextMenu(
    event: MouseEvent<HTMLButtonElement>,
    row: number,
    column: number,
  ) {
    event.preventDefault();
    setGame((currentGame) => toggleFlag(currentGame, row, column));
  }

  function moveFocus(position: Position) {
    const row = Math.max(0, Math.min(preset.height - 1, position.row));
    const column = Math.max(0, Math.min(preset.width - 1, position.column));
    const key = `${row}:${column}`;

    setActiveCell({ row, column });
    cellRefs.current.get(key)?.focus();
  }

  function handleCellKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    row: number,
    column: number,
  ) {
    let nextPosition: Position | undefined;

    switch (event.key) {
      case "ArrowUp":
        nextPosition = { row: row - 1, column };
        break;
      case "ArrowDown":
        nextPosition = { row: row + 1, column };
        break;
      case "ArrowLeft":
        nextPosition = { row, column: column - 1 };
        break;
      case "ArrowRight":
        nextPosition = { row, column: column + 1 };
        break;
      case "Home":
        nextPosition = event.ctrlKey || event.metaKey
          ? { row: 0, column: 0 }
          : { row, column: 0 };
        break;
      case "End":
        nextPosition =
          event.ctrlKey || event.metaKey
            ? { row: preset.height - 1, column: preset.width - 1 }
            : { row, column: preset.width - 1 };
        break;
      case "f":
      case "F":
        event.preventDefault();
        setGame((currentGame) => toggleFlag(currentGame, row, column));
        return;
      default:
        return;
    }

    event.preventDefault();
    moveFocus(nextPosition);
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Minefield home">
          <span className="brand-mark" aria-hidden="true">
            ✹
          </span>
          <span>minefield</span>
        </a>
        <span className="header-note">
          <span className="online-dot" aria-hidden="true" />
          Classic puzzle · ready when you are
        </span>
      </header>

      <main className="game-layout">
        <aside className="control-panel" aria-label="Game controls">
          <div className="intro">
            <p className="eyebrow">A little focus goes a long way</p>
            <h1>Clear the field.</h1>
            <p className="intro-copy">
              Use the numbers to find every mine. One careful reveal at a time.
            </p>
          </div>

          <label className="field-label" htmlFor="difficulty">
            Difficulty
          </label>
          <select
            className="difficulty-select"
            id="difficulty"
            value={game.difficulty}
            onChange={(event) => changeDifficulty(event.currentTarget.value)}
          >
            {Object.values(DIFFICULTIES).map((difficulty) => (
              <option key={difficulty.id} value={difficulty.id}>
                {difficulty.label}
              </option>
            ))}
          </select>

          <div className="control-actions">
            <button
              className="button button-primary"
              type="button"
              onClick={() => startNewGame()}
            >
              <span aria-hidden="true">↻</span>
              New game
            </button>
            <button
              className="button button-secondary"
              type="button"
              onClick={restartGame}
            >
              Reset
            </button>
          </div>

          <button
            className={`flag-mode-button${flagMode ? " is-active" : ""}`}
            type="button"
            aria-label={`Flag mode ${flagMode ? "on" : "off"}`}
            aria-pressed={flagMode}
            onClick={() => setFlagMode((enabled) => !enabled)}
          >
            <span className="flag-mode-icon" aria-hidden="true">
              ⚑
            </span>
            <span className="flag-mode-text">
              <strong>Flag mode</strong>
              <span>{flagMode ? "Tap a tile to flag it" : "Off · tap to turn on"}</span>
            </span>
            <span className="mode-switch" aria-hidden="true" />
          </button>

          <div className="how-to-play">
            <h2>How to play</h2>
            <ul>
              <li>
                <span className="instruction-icon reveal-icon" aria-hidden="true">
                  ◉
                </span>
                Reveal every safe tile.
              </li>
              <li>
                <span className="instruction-icon number-icon" aria-hidden="true">
                  3
                </span>
                Numbers count nearby mines.
              </li>
              <li>
                <span className="instruction-icon flag-icon" aria-hidden="true">
                  ⚑
                </span>
                Right-click or use flag mode.
              </li>
            </ul>
          </div>

          <p className="first-click-note">
            <span aria-hidden="true">✦</span>
            Your first reveal is always safe.
          </p>
        </aside>

        <section className="board-panel" aria-labelledby="board-title">
          <div className="board-heading">
            <div>
              <p className="eyebrow">Your current run</p>
              <h2 id="board-title">{preset.label} field</h2>
            </div>
            <span className={`difficulty-pill difficulty-${game.difficulty}`}>
              {preset.width} × {preset.height}
            </span>
          </div>

          <div className="scoreboard">
            <div className="score-card">
              <span className="score-icon mine-icon" aria-hidden="true">
                ✹
              </span>
              <div>
                <span className="score-label">Mines left</span>
                <output
                  className={`score-value${flagsRemaining < 0 ? " is-negative" : ""}`}
                  aria-label="Remaining mines"
                  aria-live="polite"
                >
                  {flagsRemaining}
                </output>
              </div>
            </div>
            <div className="score-divider" aria-hidden="true" />
            <div className="score-card">
              <span className="score-icon timer-icon" aria-hidden="true">
                ◷
              </span>
              <div>
                <span className="score-label">Time</span>
                <output
                  className="score-value"
                  aria-label="Elapsed time"
                  aria-live="off"
                >
                  {formatTime(elapsedSeconds)}
                </output>
              </div>
            </div>
            <span className="status-face" aria-hidden="true">
              {game.status === "won" ? "😎" : game.status === "lost" ? "😵" : "🙂"}
            </span>
          </div>

          <p className={`game-message status-${game.status}`} role="status">
            <span className="message-indicator" aria-hidden="true" />
            {gameMessage(game.status)}
          </p>

          <div className="board-card">
            <div className="board-card-topline">
              <span>GAME BOARD</span>
              <span>
                {preset.height} rows <span aria-hidden="true">·</span>{" "}
                {preset.width} columns
              </span>
            </div>
            <div
              className="board-scroll"
              role="region"
              aria-label="Scrollable game board area"
              tabIndex={0}
              style={{ maxWidth: "100%", overflowX: "auto" }}
            >
              <div
                className="board-grid"
                role="grid"
                aria-label={`Minesweeper board, ${preset.width} columns by ${preset.height} rows`}
                aria-describedby="board-help"
              >
                {game.board.map((rowCells, row) => (
                  <div
                    className="board-row"
                    role="row"
                    key={row}
                    style={{
                      gridTemplateColumns: `repeat(${preset.width}, var(--cell-size))`,
                    }}
                  >
                    {rowCells.map((cell, column) => {
                      const state = cell.isRevealed
                        ? cell.isMine
                          ? "mine"
                          : "revealed"
                        : cell.isFlagged
                          ? "flagged"
                          : "covered";
                      const numberClass =
                        cell.isRevealed &&
                        !cell.isMine &&
                        cell.adjacentMines > 0
                          ? ` cell-number-${cell.adjacentMines}`
                          : "";
                      const key = `${row}:${column}`;

                      return (
                        <button
                          className={`cell cell-${state}${numberClass}`}
                          type="button"
                          role="gridcell"
                          key={key}
                          ref={(element) => {
                            if (element) {
                              cellRefs.current.set(key, element);
                            } else {
                              cellRefs.current.delete(key);
                            }
                          }}
                          aria-label={cellName(cell, row, column)}
                          data-state={state}
                          data-flagged={cell.isFlagged}
                          tabIndex={
                            activeCell.row === row &&
                            activeCell.column === column
                              ? 0
                              : -1
                          }
                          onFocus={() => setActiveCell({ row, column })}
                          onClick={() => handleCellClick(row, column)}
                          onContextMenu={(event) =>
                            handleCellContextMenu(event, row, column)
                          }
                          onKeyDown={(event) =>
                            handleCellKeyDown(event, row, column)
                          }
                        >
                          {cellContent(cell)}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <p className="board-help" id="board-help">
              <span aria-hidden="true">⌨</span>
              Arrow keys move · Enter or Space reveals · F flags · right-click flags
            </p>
          </div>

          <footer className="game-footer">
            <span>Take a breath. You’ve got this.</span>
            <span>First move is protected</span>
          </footer>
        </section>
      </main>

      <footer className="page-footer">
        <span>MINDFUL MINUTES, ONE TILE AT A TIME</span>
        <span>Minefield <span aria-hidden="true">✹</span> Classic</span>
      </footer>
    </div>
  );
}
