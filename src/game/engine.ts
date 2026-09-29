import { DIFFICULTIES, type DifficultyId } from "./difficulties";
import type { Cell, GameState, RandomSource } from "./types";

export function createGame(
  difficulty: DifficultyId,
  random: RandomSource = Math.random,
): GameState {
  const { width, height, mines } = DIFFICULTIES[difficulty];
  const availablePositions = Array.from(
    { length: width * height },
    (_, position) => position,
  );
  const minePositions = new Set<number>();

  for (let mine = 0; mine < mines; mine += 1) {
    const positionIndex = randomIndex(random, availablePositions.length);
    minePositions.add(availablePositions.splice(positionIndex, 1)[0]);
  }

  return {
    difficulty,
    board: buildBoard(width, height, minePositions),
    status: "ready",
  };
}

export function toggleFlag(
  state: GameState,
  row: number,
  column: number,
): GameState {
  const target = state.board[row]?.[column];

  if (
    state.status === "won" ||
    state.status === "lost" ||
    !target ||
    target.isRevealed
  ) {
    return state;
  }

  const board = cloneBoard(state.board);
  board[row][column] = { ...target, isFlagged: !target.isFlagged };

  return { ...state, board };
}

export function resetGame(state: GameState): GameState {
  const { width, height } = DIFFICULTIES[state.difficulty];
  const minePositions = new Set<number>();

  state.board.forEach((row, rowIndex) => {
    row.forEach((cell, columnIndex) => {
      if (cell.isMine) {
        minePositions.add(rowIndex * width + columnIndex);
      }
    });
  });

  return {
    difficulty: state.difficulty,
    board: buildBoard(width, height, minePositions),
    status: "ready",
  };
}

export function revealCell(
  state: GameState,
  row: number,
  column: number,
  random: RandomSource = Math.random,
): GameState {
  const target = state.board[row]?.[column];

  if (
    state.status === "won" ||
    state.status === "lost" ||
    !target ||
    target.isRevealed ||
    target.isFlagged
  ) {
    return state;
  }

  let board = cloneBoard(state.board);

  if (state.status === "ready" && target.isMine) {
    board = relocateMine(board, state.difficulty, row, column, random);
  }

  const selectedCell = board[row][column];

  if (selectedCell.isMine) {
    return {
      ...state,
      board: board.map((currentRow) =>
        currentRow.map((cell) => ({
          ...cell,
          isRevealed: cell.isRevealed || cell.isMine,
        })),
      ),
      status: "lost",
    };
  }

  board = expandSafeArea(board, row, column);

  return {
    ...state,
    board,
    status: hasWon(board) ? "won" : "playing",
  };
}

function expandSafeArea(
  board: Cell[][],
  row: number,
  column: number,
): Cell[][] {
  const queue: Array<readonly [number, number]> = [[row, column]];

  for (let index = 0; index < queue.length; index += 1) {
    const [currentRow, currentColumn] = queue[index];
    const cell = board[currentRow]?.[currentColumn];

    if (!cell || cell.isMine || cell.isFlagged || cell.isRevealed) {
      continue;
    }

    board[currentRow][currentColumn] = { ...cell, isRevealed: true };

    if (cell.adjacentMines !== 0) {
      continue;
    }

    for (
      let neighborRow = currentRow - 1;
      neighborRow <= currentRow + 1;
      neighborRow += 1
    ) {
      for (
        let neighborColumn = currentColumn - 1;
        neighborColumn <= currentColumn + 1;
        neighborColumn += 1
      ) {
        if (
          neighborRow >= 0 &&
          neighborRow < board.length &&
          neighborColumn >= 0 &&
          neighborColumn < board[neighborRow].length
        ) {
          const neighbor = board[neighborRow][neighborColumn];

          if (!neighbor.isMine && !neighbor.isFlagged && !neighbor.isRevealed) {
            queue.push([neighborRow, neighborColumn]);
          }
        }
      }
    }
  }

  return board;
}

export function remainingMines(state: GameState): number {
  const flags = state.board.reduce(
    (total, row) =>
      total + row.filter((cell) => cell.isFlagged).length,
    0,
  );

  return DIFFICULTIES[state.difficulty].mines - flags;
}

function randomIndex(random: RandomSource, length: number): number {
  const value = random();
  const index = Number.isFinite(value) ? Math.floor(value * length) : 0;
  return Math.max(0, Math.min(length - 1, index));
}

function relocateMine(
  board: readonly (readonly Cell[])[],
  difficulty: DifficultyId,
  row: number,
  column: number,
  random: RandomSource,
): Cell[][] {
  const { width, height } = DIFFICULTIES[difficulty];
  const minePositions = new Set<number>();

  board.forEach((currentRow, currentRowIndex) => {
    currentRow.forEach((cell, currentColumnIndex) => {
      if (cell.isMine) {
        minePositions.add(currentRowIndex * width + currentColumnIndex);
      }
    });
  });

  const selectedPosition = row * width + column;
  minePositions.delete(selectedPosition);

  const safePositions = Array.from(
    { length: width * height },
    (_, position) => position,
  ).filter(
    (position) => position !== selectedPosition && !minePositions.has(position),
  );
  const unflaggedPositions = safePositions.filter((position) => {
    const safeRow = Math.floor(position / width);
    const safeColumn = position % width;

    return !board[safeRow][safeColumn].isFlagged;
  });
  const destinations =
    unflaggedPositions.length > 0 ? unflaggedPositions : safePositions;

  minePositions.add(destinations[randomIndex(random, destinations.length)]);

  const relocatedBoard = buildBoard(width, height, minePositions);

  return relocatedBoard.map((currentRow, currentRowIndex) =>
    currentRow.map((cell, currentColumnIndex) => ({
      ...cell,
      isFlagged: board[currentRowIndex][currentColumnIndex].isFlagged,
      isRevealed: board[currentRowIndex][currentColumnIndex].isRevealed,
    })),
  );
}

function cloneBoard(board: readonly (readonly Cell[])[]): Cell[][] {
  return board.map((row) => row.map((cell) => ({ ...cell })));
}

function hasWon(board: readonly (readonly Cell[])[]): boolean {
  return board.every((row) =>
    row.every((cell) => cell.isMine || cell.isRevealed),
  );
}

function buildBoard(
  width: number,
  height: number,
  minePositions: ReadonlySet<number>,
): Cell[][] {
  return Array.from({ length: height }, (_, row) =>
    Array.from({ length: width }, (_, column) => {
      const position = row * width + column;

      return {
        isMine: minePositions.has(position),
        adjacentMines: countAdjacentMines(
          row,
          column,
          width,
          height,
          minePositions,
        ),
        isRevealed: false,
        isFlagged: false,
      };
    }),
  );
}

function countAdjacentMines(
  row: number,
  column: number,
  width: number,
  height: number,
  minePositions: ReadonlySet<number>,
): number {
  let count = 0;

  for (let neighborRow = row - 1; neighborRow <= row + 1; neighborRow += 1) {
    for (
      let neighborColumn = column - 1;
      neighborColumn <= column + 1;
      neighborColumn += 1
    ) {
      if (
        neighborRow < 0 ||
        neighborRow >= height ||
        neighborColumn < 0 ||
        neighborColumn >= width
      ) {
        continue;
      }

      if (
        minePositions.has(neighborRow * width + neighborColumn) &&
        (neighborRow !== row || neighborColumn !== column)
      ) {
        count += 1;
      }
    }
  }

  return count;
}
