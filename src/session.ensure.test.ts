import { afterEach, beforeEach, expect, mock, test } from "bun:test";

import type { StoredSession } from "./config.ts";
import { futureExp, jwt, pastExp } from "./test-helpers.ts";

const loadSessionMock = mock<() => Promise<StoredSession | null>>();
const saveSessionMock = mock<(session: StoredSession) => Promise<void>>();
const clearSessionMock = mock<() => Promise<void>>();

mock.module("./config.ts", () => ({
  loadSession: loadSessionMock,
  saveSession: saveSessionMock,
  clearSession: clearSessionMock,
}));

const { ensureValidSession } = await import("./session.ts");

const originalFetch = globalThis.fetch;
let fetchMock: ReturnType<typeof mock>;

function storedSession(overrides: Partial<StoredSession> & Pick<StoredSession, "sessionToken" | "refreshToken">): StoredSession {
  return {
    email: "user@example.com",
    ...overrides,
  };
}

beforeEach(() => {
  loadSessionMock.mockReset();
  saveSessionMock.mockReset();
  clearSessionMock.mockReset();
  fetchMock = mock(async () => Response.json({ sessionToken: "new-session-token", refreshToken: "new-refresh-token" }));
  globalThis.fetch = fetchMock as typeof fetch;
});

afterEach(() => {
  loadSessionMock.mockReset();
  saveSessionMock.mockReset();
  clearSessionMock.mockReset();
  globalThis.fetch = originalFetch;
});

test("ensureValidSession throws when not logged in", async () => {
  loadSessionMock.mockResolvedValue(null);

  await expect(ensureValidSession()).rejects.toThrow("Not logged in. Run `lunchit login` first.");
});

test("ensureValidSession returns session when token is still valid", async () => {
  const session = storedSession({
    sessionToken: jwt({ exp: futureExp(3600) }),
    refreshToken: jwt({ exp: futureExp(86400) }),
  });
  loadSessionMock.mockResolvedValue(session);

  await expect(ensureValidSession()).resolves.toBe(session);
  expect(fetchMock).not.toHaveBeenCalled();
});

test("ensureValidSession refreshes expired session token", async () => {
  const session = storedSession({
    sessionToken: jwt({ exp: pastExp(120) }),
    refreshToken: jwt({ exp: futureExp(86400) }),
  });
  loadSessionMock.mockResolvedValue(session);

  const updated = await ensureValidSession();

  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/refreshTokens");
  expect(saveSessionMock).toHaveBeenCalledWith({
    email: session.email,
    sessionToken: "new-session-token",
    refreshToken: "new-refresh-token",
  });
  expect(updated.sessionToken).toBe("new-session-token");
});

test("ensureValidSession clears session when refresh token expired", async () => {
  loadSessionMock.mockResolvedValue(
    storedSession({
      sessionToken: jwt({ exp: pastExp(120) }),
      refreshToken: jwt({ exp: pastExp(60) }),
    }),
  );

  await expect(ensureValidSession()).rejects.toThrow("Login expired. Run `lunchit login` again.");
  expect(clearSessionMock).toHaveBeenCalledTimes(1);
  expect(fetchMock).not.toHaveBeenCalled();
});

test("ensureValidSession clears session when refresh fails", async () => {
  loadSessionMock.mockResolvedValue(
    storedSession({
      sessionToken: jwt({ exp: pastExp(120) }),
      refreshToken: jwt({ exp: futureExp(86400) }),
    }),
  );
  fetchMock.mockRejectedValue(new Error("401 Unauthorized"));

  await expect(ensureValidSession()).rejects.toThrow("Login expired. Run `lunchit login` again.");
  expect(clearSessionMock).toHaveBeenCalledTimes(1);
});
