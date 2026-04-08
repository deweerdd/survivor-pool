import { describe, it, expect } from "vitest";
import { calculateSoleSurvivorPoints, isPickEliminated } from "@/lib/sole-survivor";

describe("calculateSoleSurvivorPoints", () => {
  it("picked on episode 1 of 13 → 26 points", () => {
    expect(calculateSoleSurvivorPoints(1, 13)).toBe(26);
  });

  it("picked on episode 4 of 13 → 20 points", () => {
    expect(calculateSoleSurvivorPoints(4, 13)).toBe(20);
  });

  it("picked on last episode (13 of 13) → 2 points", () => {
    expect(calculateSoleSurvivorPoints(13, 13)).toBe(2);
  });

  it("picked on episode 7 of 13 → 14 points", () => {
    expect(calculateSoleSurvivorPoints(7, 13)).toBe(14);
  });

  it("returns 0 for invalid inputs — pickedAtEpisode > totalEpisodes", () => {
    expect(calculateSoleSurvivorPoints(14, 13)).toBe(0);
  });

  it("returns 0 for invalid inputs — pickedAtEpisode < 1", () => {
    expect(calculateSoleSurvivorPoints(0, 13)).toBe(0);
  });

  it("returns 0 for invalid inputs — totalEpisodes < 1", () => {
    expect(calculateSoleSurvivorPoints(1, 0)).toBe(0);
  });

  it("works with different season lengths — 14 episodes, picked on ep 2 → 26", () => {
    expect(calculateSoleSurvivorPoints(2, 14)).toBe(26);
  });
});

describe("isPickEliminated", () => {
  it("returns true when contestant is in eliminated list", () => {
    expect(isPickEliminated(5, [3, 5, 7])).toBe(true);
  });

  it("returns false when contestant is not eliminated", () => {
    expect(isPickEliminated(5, [3, 7, 9])).toBe(false);
  });

  it("returns false for empty eliminations list", () => {
    expect(isPickEliminated(5, [])).toBe(false);
  });
});
