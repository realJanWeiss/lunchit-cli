import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function promptLine(question: string): Promise<string> {
  const rl = readline.createInterface({ input, output });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}
