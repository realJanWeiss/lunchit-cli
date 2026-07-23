import { refreshTokens } from "./api.ts";
import { clearSession, loadSession, saveSession, type StoredSession } from "./config.ts";

const EXPIRY_BUFFER_SECONDS = 60;

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const payload = token.split(".")[1];
  if (!payload) {
    return null;
  }

  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(base64, "base64").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getTokenExpiry(token: string): Date | null {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") {
    return null;
  }

  return new Date(payload.exp * 1000);
}

export function isTokenExpired(token: string, bufferSeconds = EXPIRY_BUFFER_SECONDS): boolean {
  const expiry = getTokenExpiry(token);
  if (!expiry) {
    return false;
  }

  return Date.now() >= expiry.getTime() - bufferSeconds * 1000;
}

export type SessionStatus =
  | { kind: "valid"; sessionExpiresAt: Date; refreshExpiresAt: Date | null }
  | { kind: "session_expired"; refreshExpiresAt: Date | null }
  | { kind: "login_expired" };

export function describeSessionStatus(session: StoredSession): SessionStatus {
  if (isTokenExpired(session.refreshToken, 0)) {
    return { kind: "login_expired" };
  }

  const sessionExpiresAt = getTokenExpiry(session.sessionToken);
  const refreshExpiresAt = getTokenExpiry(session.refreshToken);

  if (sessionExpiresAt && !isTokenExpired(session.sessionToken, 0)) {
    return { kind: "valid", sessionExpiresAt, refreshExpiresAt };
  }

  return { kind: "session_expired", refreshExpiresAt };
}

async function expireLogin(): Promise<never> {
  await clearSession();
  throw new Error("Login expired. Run `lunchit login` again.");
}

async function refreshSession(session: StoredSession): Promise<StoredSession> {
  const tokens = await refreshTokens(session.refreshToken);
  const updated: StoredSession = {
    email: session.email,
    sessionToken: tokens.sessionToken,
    refreshToken: tokens.refreshToken,
  };
  await saveSession(updated);
  return updated;
}

export async function ensureValidSession(): Promise<StoredSession> {
  const session = await loadSession();
  if (!session) {
    throw new Error("Not logged in. Run `lunchit login` first.");
  }

  if (!isTokenExpired(session.sessionToken)) {
    return session;
  }

  if (isTokenExpired(session.refreshToken)) {
    return expireLogin();
  }

  try {
    const updated = await refreshSession(session);
    console.error("Session expired — refreshed automatically.");
    return updated;
  } catch {
    return expireLogin();
  }
}

export function formatExpiry(expiry: Date): string {
  return expiry.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
