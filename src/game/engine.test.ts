import { describe, expect, it } from "vitest";
import { DIFFICULTIES, type DifficultyId } from "./difficulties";
import {
  createGame,
  remainingMines,
  revealCell,
  resetGame,
  toggleFlag,
} from "./engine";

describe("new Minesweeper games", () => {
  it.each([
    "beginner",
    "intermediate",
    "expert",
  ] satisfies DifficultyId[])(
    "creates the exact board and mine count for %s",
    (difficulty) => {
      const game = createGame(difficulty, () => 0);
      const preset = DIFFICULTIES[difficulty];

      expect(game.status).toBe("ready");
      expect(game.board).toHaveLength(preset.height);
      expect(game.board.every((row) => row.length === preset.width)).toBe(true);
      expect(game.board.flat().filter((cell) => cell.isMine)).toHaveLength(
        preset.mines,
      );
    },
  );

  it("protects the first revealed mine and recalculates adjacent counts", () => {
    const initialGame = createGame("beginner", () => 0);

    expect(initialGame.board[0][0].isMine).toBe(true);

    const game = revealCell(initialGame, 0, 0, () => 0);

    expect(game.status).toBe("playing");
    expect(game.board[0][0]).toMatchObject({
      isMine: false,
      isRevealed: true,
      adjacentMines: 3,
    });
    expect(game.board[2][2].adjacentMines).toBe(1);
    expect(initialGame.board[0][0].isMine).toBe(true);
  });

  it("flags without revealing or triggering first-click protection", () => {
    const initialGame = createGame("beginner", () => 0);
    const flaggedGame = toggleFlag(initialGame, 0, 0);
    const revealAttempt = revealCell(flaggedGame, 0, 0, () => 0);

    expect(flaggedGame.status).toBe("ready");
    expect(flaggedGame.board[0][0]).toMatchObject({
      isMine: true,
      isFlagged: true,
      isRevealed: false,
    });
    expect(remainingMines(flaggedGame)).toBe(9);
    expect(revealAttempt).toBe(flaggedGame);

    const unflaggedGame = toggleFlag(flaggedGame, 0, 0);

    expect(unflaggedGame.board[0][0].isFlagged).toBe(false);
    expect(remainingMines(unflaggedGame)).toBe(10);
  });

  it("preserves flags while relocating a mine after a protected first click", () => {
    const initialGame = createGame("beginner", () => 0);
    const flaggedGame = toggleFlag(initialGame, 8, 8);
    const revealedGame = revealCell(flaggedGame, 0, 0, () => 0);

    expect(revealedGame.board[8][8]).toMatchObject({
      isMine: false,
      isFlagged: true,
      isRevealed: false,
    });
    expect(remainingMines(revealedGame)).toBe(9);
  });

  it("expands a zero-area reveal through every safe cell and wins", () => {
    const initialGame = createGame("beginner", () => 0);
    const game = revealCell(initialGame, 8, 8, () => 0);

    expect(game.board[8][8].adjacentMines).toBe(0);
    expect(game.board[1][1].isRevealed).toBe(true);
    expect(game.board[2][1]).toMatchObject({
      adjacentMines: 1,
      isRevealed: true,
    });
    expect(
      game.board.flat().every((cell) => cell.isMine || cell.isRevealed),
    ).toBe(true);
    expect(game.status).toBe("won");
  });

  it("loses on a later mine reveal and ignores actions after the game ends", () => {
    const initialGame = createGame("beginner", () => 0);
    const startedGame = revealCell(initialGame, 1, 1, () => 0);
    const lostGame = revealCell(startedGame, 0, 0, () => 0);

    expect(startedGame.status).toBe("playing");
    expect(lostGame.status).toBe("lost");
    expect(
      lostGame.board.flat().every((cell) => !cell.isMine || cell.isRevealed),
    ).toBe(true);
    expect(revealCell(lostGame, 8, 8)).toBe(lostGame);
    expect(toggleFlag(lostGame, 8, 8)).toBe(lostGame);
  });

  it("resets progress and flags while preserving the current mine layout", () => {
    const initialGame = createGame("beginner", () => 0);
    const flaggedGame = toggleFlag(initialGame, 0, 1);
    const playingGame = revealCell(flaggedGame, 1, 1, () => 0);
    const reset = resetGame(playingGame);

    expect(reset.status).toBe("ready");
    expect(reset.board[0].slice(0, 9).every((cell) => cell.isMine)).toBe(true);
    expect(reset.board[1][0].isMine).toBe(true);
    expect(
      reset.board.flat().every((cell) => !cell.isFlagged && !cell.isRevealed),
    ).toBe(true);
  });
});
