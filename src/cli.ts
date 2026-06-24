import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { login, submitReceipt, uploadReceiptDocument } from "./api.ts";
import { clearSession, loadSession, saveSession } from "./config.ts";

type ParsedArgs = {
  command?: string;
  positional: string[];
  flags: Record<string, string | boolean>;
};

function parseArgs(argv: string[]): ParsedArgs {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg) {
      continue;
    }

    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
      continue;
    }

    positional.push(arg);
  }

  const [command, ...rest] = positional;
  return { command, positional: rest, flags };
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function printUsage(): void {
  console.log(`Lunchit CLI

Usage:
  lunchit login [--email <email>] [--password <password>]
  lunchit upload <image> [--date YYYY-MM-DD] [--store-name <name>] [--city <city>] [--street <street>] [--zip <zip>]
  lunchit logout
  lunchit status

Environment:
  LUNCHIT_EMAIL       Default email for login
  LUNCHIT_PASSWORD    Default password for login
`);
}

async function promptLine(question: string): Promise<string> {
  const rl = readline.createInterface({ input, output });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

async function runLogin(flags: Record<string, string | boolean>): Promise<void> {
  const email =
    (typeof flags.email === "string" ? flags.email : undefined) ??
    process.env.LUNCHIT_EMAIL ??
    (await promptLine("Email: "));

  const password =
    (typeof flags.password === "string" ? flags.password : undefined) ??
    process.env.LUNCHIT_PASSWORD ??
    (await promptLine("Password: "));

  if (!email || !password) {
    throw new Error("Email and password are required.");
  }

  const tokens = await login(email, password);
  await saveSession({
    email,
    sessionToken: tokens.sessionToken,
    refreshToken: tokens.refreshToken,
  });

  console.log(`Logged in as ${email}`);
}

async function runUpload(
  filePath: string,
  flags: Record<string, string | boolean>,
): Promise<void> {
  const session = await loadSession();
  if (!session) {
    throw new Error("Not logged in. Run `lunchit login` first.");
  }

  const date = (typeof flags.date === "string" ? flags.date : undefined) ?? todayIsoDate();

  console.log(`Uploading ${filePath}...`);
  const upload = await uploadReceiptDocument(session.sessionToken, filePath);
  console.log(`Document uploaded (${upload.receiptId})`);

  const receipt = await submitReceipt(session.sessionToken, {
    receiptId: upload.receiptId,
    date,
    storeName: typeof flags["store-name"] === "string" ? flags["store-name"] : undefined,
    city: typeof flags.city === "string" ? flags.city : undefined,
    streetAndNumber: typeof flags.street === "string" ? flags.street : undefined,
    zipCode: typeof flags.zip === "string" ? flags.zip : undefined,
  });

  console.log("Receipt submitted:");
  console.log(JSON.stringify(receipt, null, 2));
}

async function runStatus(): Promise<void> {
  const session = await loadSession();
  if (!session) {
    console.log("Not logged in.");
    return;
  }

  console.log(`Logged in as ${session.email}`);
}

export async function run(argv: string[]): Promise<number> {
  const { command, positional, flags } = parseArgs(argv);

  if (flags.help || command === "help" || !command) {
    printUsage();
    return command ? 0 : 1;
  }

  try {
    switch (command) {
      case "login":
        await runLogin(flags);
        return 0;
      case "upload":
        if (!positional[0]) {
          throw new Error("Missing image path. Usage: lunchit upload <image>");
        }
        await runUpload(positional[0], flags);
        return 0;
      case "logout":
        await clearSession();
        console.log("Logged out.");
        return 0;
      case "status":
        await runStatus();
        return 0;
      default:
        console.error(`Unknown command: ${command}`);
        printUsage();
        return 1;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    return 1;
  }
}
