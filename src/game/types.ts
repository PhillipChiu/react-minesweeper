import type { DifficultyId } from "./difficulties";

export type GameStatus = "ready" | "playing" | "won" | "lost";

export interface Cell {
  readonly isMine: boolean;
  readonly adjacentMines: number;
  readonly isRevealed: boolean;
  readonly isFlagged: boolean;
}

export interface GameState {
  readonly difficulty: DifficultyId;
  readonly board: readonly (readonly Cell[])[];
  readonly status: GameStatus;
}

export type RandomSource = () => number;
