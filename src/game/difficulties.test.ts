import { describe, expect, it } from "vitest";
import { DIFFICULTIES } from "./difficulties";

describe("Minesweeper difficulty presets", () => {
  it.each([
    ["beginner", 9, 9, 10],
    ["intermediate", 16, 16, 40],
    ["expert", 30, 16, 99],
  ] as const)(
    "%s uses the specified board dimensions and mine count",
    (id, width, height, mines) => {
      expect(DIFFICULTIES[id]).toMatchObject({ id, width, height, mines });
    },
  );
});
