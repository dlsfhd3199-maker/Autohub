import { describe, expect, it } from "vitest";
import { paginationRange, parseContentSearch } from "./search";

describe("content search", () => {
  it("normalizes filters and pagination", () => {
    expect(parseContentSearch({ q: "  Virtual Paw ", status: "draft", page: "2", pageSize: "20" })).toMatchObject({ q: "Virtual Paw", status: "draft", page: 2, pageSize: 20 });
    expect(paginationRange(2, 20)).toEqual({ from: 20, to: 39 });
  });
  it("falls back to safe pagination values", () => {
    expect(parseContentSearch({ page: "-3", pageSize: "1000", status: "unknown" })).toMatchObject({ page: 1, pageSize: 10 });
  });
});
