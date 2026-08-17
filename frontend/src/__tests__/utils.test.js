import { describe, it, expect } from "vitest";
import { cn } from "../lib/utils";

describe("cn utility", () => {
  it("combines class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    const hidden = false;
    expect(cn("base", hidden && "hidden", "visible")).toBe("base visible");
  });

  it("returns empty string for no arguments", () => {
    expect(cn()).toBe("");
  });
});
