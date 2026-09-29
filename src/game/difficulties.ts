export type DifficultyId = "beginner" | "intermediate" | "expert";

export interface Difficulty {
  readonly id: DifficultyId;
  readonly label: string;
  readonly width: number;
  readonly height: number;
  readonly mines: number;
}

export const DIFFICULTIES: Readonly<Record<DifficultyId, Difficulty>> = {
  beginner: {
    id: "beginner",
    label: "Beginner",
    width: 9,
    height: 9,
    mines: 10,
  },
  intermediate: {
    id: "intermediate",
    label: "Intermediate",
    width: 16,
    height: 16,
    mines: 40,
  },
  expert: {
    id: "expert",
    label: "Expert",
    width: 30,
    height: 16,
    mines: 99,
  },
};
