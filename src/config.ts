import { homedir } from "node:os";
import { join } from "node:path";

export type StoredSession = {
  email: string;
  sessionToken: string;
  refreshToken: string;
};

const CONFIG_DIR = join(homedir(), ".lunchit-cli");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

export async function loadSession(): Promise<StoredSession | null> {
  const file = Bun.file(CONFIG_PATH);
  if (!(await file.exists())) {
    return null;
  }

  try {
    return (await file.json()) as StoredSession;
  } catch {
    return null;
  }
}

export async function saveSession(session: StoredSession): Promise<void> {
  await Bun.write(CONFIG_PATH, JSON.stringify(session, null, 2));
  await Bun.$`chmod 600 ${CONFIG_PATH}`.quiet();
}

export async function clearSession(): Promise<void> {
  const file = Bun.file(CONFIG_PATH);
  if (await file.exists()) {
    await file.delete();
  }
}
