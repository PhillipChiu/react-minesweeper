import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Minesweeper interface", () => {
  it("starts with an accessible Beginner board and accurate counters", () => {
    render(<App random={() => 0} />);

    expect(screen.getByRole("combobox", { name: "Difficulty" })).toHaveValue(
      "beginner",
    );
    expect(
      screen.getByRole("grid", {
        name: "Minesweeper board, 9 columns by 9 rows",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("gridcell")).toHaveLength(81);
    expect(screen.getByLabelText("Remaining mines")).toHaveTextContent("10");
    expect(screen.getByLabelText("Elapsed time")).toHaveTextContent("00:00");
    expect(screen.getByText(/Choose a tile to begin/)).toBeInTheDocument();
  });

  it("supports touch-friendly flag mode without revealing or starting the timer", () => {
    render(<App random={() => 0} />);

    const flagModeButton = screen.getByRole("button", {
      name: "Flag mode off",
    });
    expect(flagModeButton.closest(".board-panel")).not.toBeNull();
    expect(screen.getByText(/Tap a covered tile to reveal/)).toBeInTheDocument();

    fireEvent.click(flagModeButton);
    const firstCell = screen.getByRole("gridcell", {
      name: "Row 1, column 1, hidden",
    });
    fireEvent.click(firstCell);

    expect(
      screen.getByRole("button", { name: "Flag mode on" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("gridcell", { name: "Row 1, column 1, flagged" }),
    ).toHaveAttribute("data-state", "flagged");
    expect(
      screen.getByText(/Flag mode on · tap a covered tile to flag it/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Remaining mines")).toHaveTextContent("9");
    expect(screen.getByLabelText("Elapsed time")).toHaveTextContent("00:00");
    expect(screen.getByText(/Choose a tile to begin/)).toBeInTheDocument();
  });

  it("toggles flag mode with the keyboard", async () => {
    const user = userEvent.setup();
    render(<App random={() => 0} />);
    const flagModeButton = screen.getByRole("button", {
      name: "Flag mode off",
    });

    flagModeButton.focus();
    await user.keyboard("{Enter}");

    expect(
      screen.getByRole("button", { name: "Flag mode on" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByText(/Flag mode on · tap a covered tile to flag it/),
    ).toBeInTheDocument();
  });

  it("flags a tile with the mouse context menu", () => {
    render(<App random={() => 0} />);
    const cell = screen.getByRole("gridcell", {
      name: "Row 1, column 2, hidden",
    });

    fireEvent.contextMenu(cell);

    expect(
      screen.getByRole("gridcell", { name: "Row 1, column 2, flagged" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Remaining mines")).toHaveTextContent("9");
    expect(screen.getByLabelText("Elapsed time")).toHaveTextContent("00:00");
  });

  it("opens a fresh board when the selected difficulty changes", () => {
    render(<App random={() => 0} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Difficulty" }), {
      target: { value: "expert" },
    });

    expect(screen.getByRole("combobox", { name: "Difficulty" })).toHaveValue(
      "expert",
    );
    expect(
      screen.getByRole("grid", {
        name: "Minesweeper board, 30 columns by 16 rows",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("gridcell")).toHaveLength(480);
    expect(screen.getByLabelText("Remaining mines")).toHaveTextContent("99");
    expect(screen.getByLabelText("Elapsed time")).toHaveTextContent("00:00");
  });

  it("starts the timer on reveal, stops on loss, and reset clears the run", () => {
    vi.useFakeTimers();
    render(<App random={() => 0} />);

    fireEvent.click(
      screen.getByRole("gridcell", {
        name: "Row 2, column 2, hidden",
      }),
    );
    expect(screen.getByText(/Game in progress/)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByLabelText("Elapsed time")).toHaveTextContent("00:03");

    fireEvent.click(
      screen.getByRole("gridcell", {
        name: "Row 1, column 1, hidden",
      }),
    );
    expect(screen.getByText(/A mine was triggered/)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByLabelText("Elapsed time")).toHaveTextContent("00:03");

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByLabelText("Elapsed time")).toHaveTextContent("00:00");
    expect(
      screen.getByText("Choose a tile to begin. Your first reveal is always safe.", {
        exact: true,
      }),
    ).toBeInTheDocument();
  });

  it("catches up after a delayed timer callback and freezes time on loss", () => {
    let monotonicTime = 1000;
    let refreshTimer: (() => void) | undefined;

    vi.spyOn(performance, "now").mockImplementation(() => monotonicTime);
    vi.spyOn(window, "setInterval").mockImplementation((handler) => {
      refreshTimer = handler as () => void;
      return 1;
    });
    vi.spyOn(window, "clearInterval").mockImplementation(() => undefined);

    render(<App random={() => 0} />);

    fireEvent.click(
      screen.getByRole("gridcell", {
        name: "Row 2, column 2, hidden",
      }),
    );
    expect(screen.getByLabelText("Elapsed time")).toHaveTextContent("00:00");

    monotonicTime += 8750;
    act(() => refreshTimer?.());
    expect(screen.getByLabelText("Elapsed time")).toHaveTextContent("00:08");

    fireEvent.click(
      screen.getByRole("gridcell", {
        name: "Row 1, column 1, hidden",
      }),
    );
    expect(screen.getByText(/A mine was triggered/)).toBeInTheDocument();
    expect(screen.getByLabelText("Elapsed time")).toHaveTextContent("00:08");

    monotonicTime += 10_000;
    act(() => refreshTimer?.());
    expect(screen.getByLabelText("Elapsed time")).toHaveTextContent("00:08");
  });

  it("starts a clean game when New game is pressed", () => {
    render(<App random={() => 0} />);
    fireEvent.contextMenu(
      screen.getByRole("gridcell", {
        name: "Row 1, column 1, hidden",
      }),
    );
    expect(screen.getByLabelText("Remaining mines")).toHaveTextContent("9");

    fireEvent.click(screen.getByRole("button", { name: "New game" }));

    expect(screen.getByLabelText("Remaining mines")).toHaveTextContent("10");
    expect(screen.getByLabelText("Elapsed time")).toHaveTextContent("00:00");
    expect(
      screen.getByRole("gridcell", { name: "Row 1, column 1, hidden" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Choose a tile to begin. Your first reveal is always safe.", {
        exact: true,
      }),
    ).toBeInTheDocument();
  });

  it("supports keyboard focus movement and F-key flagging", () => {
    render(<App random={() => 0} />);
    const firstCell = screen.getByRole("gridcell", {
      name: "Row 1, column 1, hidden",
    });
    firstCell.focus();
    fireEvent.keyDown(firstCell, { key: "f" });

    expect(
      screen.getByRole("gridcell", { name: "Row 1, column 1, flagged" }),
    ).toBeInTheDocument();

    const flaggedFirstCell = screen.getByRole("gridcell", {
      name: "Row 1, column 1, flagged",
    });
    fireEvent.keyDown(flaggedFirstCell, { key: "ArrowRight" });

    const secondCell = screen.getByRole("gridcell", {
      name: "Row 1, column 2, hidden",
    });
    expect(document.activeElement).toBe(secondCell);
    fireEvent.keyDown(secondCell, { key: "f" });

    expect(
      screen.getByRole("gridcell", { name: "Row 1, column 2, flagged" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Remaining mines")).toHaveTextContent("8");
  });

  it("reveals tiles with the keyboard Enter and Space keys", async () => {
    const user = userEvent.setup();
    render(<App random={() => 0} />);
    const firstNumber = screen.getByRole("gridcell", {
      name: "Row 2, column 2, hidden",
    });
    firstNumber.focus();

    await user.keyboard("{Enter}");
    expect(
      screen.getByRole("gridcell", {
        name: "Row 2, column 2, 4 adjacent mines",
      }),
    ).toHaveAttribute("data-state", "revealed");

    await user.keyboard("{ArrowRight}");
    await user.keyboard(" ");

    expect(
      screen.getByRole("gridcell", {
        name: "Row 2, column 3, 3 adjacent mines",
      }),
    ).toHaveAttribute("data-state", "revealed");
  });

  it("announces a win when the safe area is completely revealed", () => {
    render(<App random={() => 0} />);
    fireEvent.click(
      screen.getByRole("gridcell", {
        name: "Row 9, column 9, hidden",
      }),
    );

    expect(
      screen.getByText("Field cleared — you win!", { exact: true }),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("gridcell")
        .filter((cell) => cell.getAttribute("data-state") === "revealed"),
    ).toHaveLength(71);
  });

  it("keeps the full Expert board horizontally scrollable", () => {
    const { container } = render(<App random={() => 0} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Difficulty" }), {
      target: { value: "expert" },
    });
    const scrollRegion = container.querySelector(".board-scroll");
    const firstRow = screen.getAllByRole("row")[0];

    expect(scrollRegion).not.toBeNull();
    expect((scrollRegion as HTMLElement).style.overflowX).toBe("auto");
    expect((firstRow as HTMLElement).style.gridTemplateColumns).toBe(
      "repeat(30, var(--cell-size))",
    );
  });
});
