import { describe, expect, it } from "vitest";

import { slugify } from "./slug";

describe("slugify", () => {
  it("lowercases and hyphenates spaces", () => {
    expect(slugify("Clean Fuel")).toBe("clean-fuel");
  });

  it("collapses runs of non-alphanumerics into one hyphen", () => {
    expect(slugify("  Recipes & Meals!!  ")).toBe("recipes-meals");
  });

  it("strips leading and trailing separators", () => {
    expect(slugify("--Hello--")).toBe("hello");
  });

  it("keeps digits", () => {
    expect(slugify("Q4 2026 Plan")).toBe("q4-2026-plan");
  });

  it("returns an empty string when nothing is left", () => {
    expect(slugify("!!!")).toBe("");
  });
});
