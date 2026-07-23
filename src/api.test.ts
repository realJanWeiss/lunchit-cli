import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  RECEIPT_TYPE_RESTAURANT,
  RECEIPT_TYPE_SUPERMARKET,
  login,
  receiptCategory,
  refreshTokens,
  submitReceipt,
  uploadReceiptDocument,
} from "./api.ts";

test("receiptCategory maps known type ids", () => {
  expect(receiptCategory(RECEIPT_TYPE_RESTAURANT)).toBe("restaurant");
  expect(receiptCategory(RECEIPT_TYPE_SUPERMARKET)).toBe("supermarket");
  expect(receiptCategory(99)).toBe("99");
});

const originalFetch = globalThis.fetch;

beforeEach(() => {
  globalThis.fetch = originalFetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("login posts credentials and returns tokens", async () => {
  const fetchMock = mock(async (url: string | URL | Request, init?: RequestInit) => {
    expect(String(url)).toBe("https://api-v2.lunchit.com/v2/login");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      email: "user@example.com",
      password: "secret",
    });

    return Response.json({
      sessionToken: "session-token",
      refreshToken: "refresh-token",
    });
  });
  globalThis.fetch = fetchMock as typeof fetch;

  const tokens = await login("user@example.com", "secret");
  expect(tokens).toEqual({
    sessionToken: "session-token",
    refreshToken: "refresh-token",
  });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("refreshTokens sends refresh cookie", async () => {
  const fetchMock = mock(async (url: string | URL | Request, init?: RequestInit) => {
    expect(String(url)).toBe("https://api-v2.lunchit.com/refreshTokens");
    expect(init?.headers).toMatchObject({ cookie: "refreshToken=old-refresh" });

    return Response.json({
      sessionToken: "new-session",
      refreshToken: "new-refresh",
    });
  });
  globalThis.fetch = fetchMock as typeof fetch;

  const tokens = await refreshTokens("old-refresh");
  expect(tokens.refreshToken).toBe("new-refresh");
});

test("login throws with response body on error", async () => {
  globalThis.fetch = mock(async () =>
    new Response("Invalid credentials", { status: 401, statusText: "Unauthorized" }),
  ) as typeof fetch;

  await expect(login("user@example.com", "wrong")).rejects.toThrow(
    "401 Unauthorized: Invalid credentials",
  );
});

test("submitReceipt sends restaurant type id", async () => {
  const fetchMock = mock(async (url: string | URL | Request, init?: RequestInit) => {
    expect(String(url)).toBe("https://api-v2.lunchit.com/receipt/receipt-123");
    const payload = JSON.parse(String(init?.body));
    expect(payload.typeId).toBe(RECEIPT_TYPE_RESTAURANT);
    expect(payload.date).toBe("2026-07-23");
    expect(payload.storeName).toBe("Cafe");

    return Response.json(payload);
  });
  globalThis.fetch = fetchMock as typeof fetch;

  await submitReceipt("session-token", {
    receiptId: "receipt-123",
    date: "2026-07-23",
    restaurant: true,
    storeName: "Cafe",
  });
});

test("uploadReceiptDocument throws when file is missing", async () => {
  await expect(uploadReceiptDocument("session-token", "/no/such/file.png")).rejects.toThrow(
    "File not found: /no/such/file.png",
  );
});

test("uploadReceiptDocument posts multipart form data", async () => {
  const dir = await mkdtemp(join(tmpdir(), "lunchit-test-"));
  const filePath = join(dir, "receipt.png");
  await writeFile(filePath, "fake-image");

  const fetchMock = mock(async (url: string | URL | Request, init?: RequestInit) => {
    expect(String(url)).toBe("https://api-v2.lunchit.com/receipt/document");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({ cookie: "sessionToken=session-token" });
    expect(init?.body).toBeInstanceOf(FormData);

    return Response.json({
      receiptDocumentLink: "https://example.com/doc",
      receiptId: "receipt-456",
    });
  });
  globalThis.fetch = fetchMock as typeof fetch;

  const result = await uploadReceiptDocument("session-token", filePath);
  expect(result.receiptId).toBe("receipt-456");

  await rm(dir, { recursive: true });
});
