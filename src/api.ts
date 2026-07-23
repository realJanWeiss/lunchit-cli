const API_BASE = "https://api-v2.lunchit.com";

const DEFAULT_HEADERS = {
  accept: "application/json, text/plain, */*",
  origin: "https://web.lunchit.com",
  referer: "https://web.lunchit.com/",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
};

type LoginResponse = {
  sessionToken: string;
  refreshToken: string;
};

type UploadDocumentResponse = {
  receiptDocumentLink: string;
  receiptId: string;
};

export type ReceiptGroup = {
  date: string;
  groupRejected: boolean;
  receipts: ReceiptDetails[];
  receiptsCount: number;
  refundAmount: number;
  submittedAmount: number;
  withinMaxRefundDays: boolean;
};

export type ReceiptDetails = {
  addonItems: unknown[];
  city: string;
  date: string;
  id: string;
  isReceipt: boolean;
  refundAmount: number;
  rejected: boolean;
  resultId: number;
  storeName: string;
  streetAndNumber: string;
  submittedAmount: number;
  typeId: number;
  withinMaxRefundDays: boolean;
  zipCode: string;
};

export const RECEIPT_TYPE_RESTAURANT = 2;
export const RECEIPT_TYPE_SUPERMARKET = 3;

export function receiptCategory(typeId: number): string {
  switch (typeId) {
    case RECEIPT_TYPE_RESTAURANT:
      return "restaurant";
    case RECEIPT_TYPE_SUPERMARKET:
      return "supermarket";
    default:
      return String(typeId);
  }
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const body = await response.text();

  if (!response.ok) {
    throw new Error(
      body ? `${response.status} ${response.statusText}: ${body}` : `${response.status} ${response.statusText}`,
    );
  }

  return JSON.parse(body) as T;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE}/v2/login`, {
    method: "POST",
    headers: {
      ...DEFAULT_HEADERS,
      "content-type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  return parseJsonResponse<LoginResponse>(response);
}

export async function refreshTokens(refreshToken: string): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE}/refreshTokens`, {
    method: "GET",
    headers: {
      ...DEFAULT_HEADERS,
      cookie: `refreshToken=${refreshToken}`,
    },
  });

  return parseJsonResponse<LoginResponse>(response);
}

export async function uploadReceiptDocument(
  sessionToken: string,
  filePath: string,
): Promise<UploadDocumentResponse> {
  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    throw new Error(`File not found: ${filePath}`);
  }

  const formData = new FormData();
  formData.append("document", file, filePath.split("/").pop() ?? "receipt.png");

  const response = await fetch(`${API_BASE}/receipt/document`, {
    method: "POST",
    headers: {
      ...DEFAULT_HEADERS,
      accept: "application/json",
      cookie: `sessionToken=${sessionToken}`,
    },
    body: formData,
  });

  return parseJsonResponse<UploadDocumentResponse>(response);
}

export type SubmitReceiptInput = {
  receiptId: string;
  date: string;
  restaurant?: boolean;
  storeName?: string;
  city?: string;
  streetAndNumber?: string;
  zipCode?: string;
};

export async function submitReceipt(
  sessionToken: string,
  input: SubmitReceiptInput,
): Promise<ReceiptDetails> {
  const payload: ReceiptDetails = {
    addonItems: [],
    city: input.city ?? "",
    date: input.date,
    id: input.receiptId,
    isReceipt: true,
    refundAmount: 0,
    rejected: false,
    resultId: 0,
    storeName: input.storeName ?? "",
    streetAndNumber: input.streetAndNumber ?? "",
    submittedAmount: 2,
    typeId: input.restaurant ? RECEIPT_TYPE_RESTAURANT : RECEIPT_TYPE_SUPERMARKET,
    withinMaxRefundDays: true,
    zipCode: input.zipCode ?? "",
  };

  const response = await fetch(`${API_BASE}/receipt/${input.receiptId}`, {
    method: "POST",
    headers: {
      ...DEFAULT_HEADERS,
      "content-type": "application/json",
      cookie: `sessionToken=${sessionToken}`,
    },
    body: JSON.stringify(payload),
  });

  return parseJsonResponse<ReceiptDetails>(response);
}

export async function fetchReceiptGroups(
  sessionToken: string,
  year: number,
  month: number,
): Promise<ReceiptGroup[]> {
  const response = await fetch(`${API_BASE}/receipt/groups/${year}/${month}`, {
    headers: {
      ...DEFAULT_HEADERS,
      cookie: `sessionToken=${sessionToken}`,
    },
  });

  return parseJsonResponse<ReceiptGroup[]>(response);
}
