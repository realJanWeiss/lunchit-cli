import { expect, test } from "bun:test";

import { formatTable, twoLetterWeekday } from "./utils.ts";

test("twoLetterWeekday returns two-letter weekday", () => {
  expect(twoLetterWeekday("2026-01-05")).toBe("Mo");
  expect(twoLetterWeekday("2026-01-06")).toBe("Tu");
});

test("formatTable aligns columns and adds separator", () => {
  const table = formatTable(
    ["Day", "Refund"],
    [
      ["Mo", "2.50"],
      ["Tu", "10.00"],
    ],
    { alignRight: [1] },
  );

  expect(table).toBe(
    ["Day  Refund", "───  ──────", "Mo     2.50", "Tu    10.00"].join("\n"),
  );
});

test("formatTable handles empty rows", () => {
  const table = formatTable(["Name"], []);
  expect(table).toBe(["Name", "────"].join("\n"));
});
