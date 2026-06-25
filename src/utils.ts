import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function currentYear(): number {
  return new Date().getFullYear();
}

export function currentMonth(): number {
  return new Date().getMonth() + 1;
}

export function twoLetterWeekday(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  return date.toLocaleDateString("en-GB", { weekday: "short" }).slice(0, 2);
}

export function formatTable(
  headers: string[],
  rows: string[][],
  options?: { alignRight?: number[] },
): string {
  const alignRight = new Set(options?.alignRight ?? []);
  const widths = headers.map((header, columnIndex) =>
    Math.max(header.length, ...rows.map((row) => (row[columnIndex] ?? "").length)),
  );

  const formatCell = (value: string, columnIndex: number) => {
    const width = widths[columnIndex]!;
    return alignRight.has(columnIndex) ? value.padStart(width) : value.padEnd(width);
  };

  const formatRow = (cells: string[]) =>
    cells.map((cell, columnIndex) => formatCell(cell, columnIndex)).join("  ");

  const separator = widths.map((width) => "─".repeat(width)).join("  ");

  return [formatRow(headers), separator, ...rows.map((row) => formatRow(row))].join("\n");
}

export async function promptLine(question: string): Promise<string> {
  const rl = readline.createInterface({ input, output });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}
