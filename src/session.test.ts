import { expect, test } from "bun:test";

import { describeSessionStatus, getTokenExpiry, isTokenExpired } from "./session.ts";

function jwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.signature`;
}

function futureExp(secondsFromNow: number): number {
  return Math.floor(Date.now() / 1000) + secondsFromNow;
}

function pastExp(secondsAgo: number): number {
  return Math.floor(Date.now() / 1000) - secondsAgo;
}

test("getTokenExpiry reads exp from JWT payload", () => {
  const exp = 1782822812;
  const expiry = getTokenExpiry(jwt({ exp }));
  expect(expiry?.getTime()).toBe(exp * 1000);
});

test("isTokenExpired respects buffer", () => {
  const token = jwt({ exp: futureExp(120) });

  expect(isTokenExpired(token, 60)).toBe(false);
  expect(isTokenExpired(token, 180)).toBe(true);
});

test("isTokenExpired returns false when exp is missing", () => {
  expect(isTokenExpired(jwt({ sub: "user" }))).toBe(false);
});

test("describeSessionStatus reports login expired when refresh token expired", () => {
  const status = describeSessionStatus({
    email: "user@example.com",
    sessionToken: jwt({ exp: pastExp(60) }),
    refreshToken: jwt({ exp: pastExp(60) }),
  });

  expect(status.kind).toBe("login_expired");
});

test("describeSessionStatus reports session expired when only session token expired", () => {
  const refreshExp = futureExp(3600);
  const status = describeSessionStatus({
    email: "user@example.com",
    sessionToken: jwt({ exp: pastExp(60) }),
    refreshToken: jwt({ exp: refreshExp }),
  });

  expect(status.kind).toBe("session_expired");
  if (status.kind === "session_expired") {
    expect(status.refreshExpiresAt?.getTime()).toBe(refreshExp * 1000);
  }
});

test("describeSessionStatus reports valid session", () => {
  const sessionExp = futureExp(3600);
  const refreshExp = futureExp(86400);
  const status = describeSessionStatus({
    email: "user@example.com",
    sessionToken: jwt({ exp: sessionExp }),
    refreshToken: jwt({ exp: refreshExp }),
  });

  expect(status.kind).toBe("valid");
  if (status.kind === "valid") {
    expect(status.sessionExpiresAt.getTime()).toBe(sessionExp * 1000);
    expect(status.refreshExpiresAt?.getTime()).toBe(refreshExp * 1000);
  }
});
