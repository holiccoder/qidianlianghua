import crypto from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import fs from "node:fs";

export const ADMIN_SESSION_COOKIE_NAME = "sq_admin_session";
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 12;

const DEFAULT_ADMIN_USERNAME = "admin";
const DEFAULT_ADMIN_PASSWORD = "admin123456";

export interface AdminSettings {
  socialTelegramUrl: string;
  socialXUrl: string;
  socialBinanceUrl: string;
  taxWalletAddress: string;
  buybackWalletAddress: string;
  buybackBurnWalletAddress: string;
  totalAssets: string;
  weeklyGain: string;
  returnRate: string;
  binanceMargin: string;
  followers: string;
  aum: string;
  weeklyReturn: string;
  weeklyExpense: string;
  donationTotal: string;
  donationTarget: string;
}

type SettingKey = keyof AdminSettings;

interface SettingMeta {
  key: SettingKey;
  envKey: string;
  defaultValue: string;
}

const SETTING_META: SettingMeta[] = [
  {
    key: "socialTelegramUrl",
    envKey: "VITE_SOCIAL_TELEGRAM_URL",
    defaultValue: "https://t.me/your_channel",
  },
  {
    key: "socialXUrl",
    envKey: "VITE_SOCIAL_X_URL",
    defaultValue: "https://x.com/your_account",
  },
  {
    key: "socialBinanceUrl",
    envKey: "VITE_SOCIAL_BINANCE_URL",
    defaultValue: "https://www.binance.com/zh-CN/square",
  },
  {
    key: "taxWalletAddress",
    envKey: "VITE_TAX_WALLET_ADDRESS",
    defaultValue: "0x1234...5678abcd...ef90",
  },
  {
    key: "buybackWalletAddress",
    envKey: "VITE_MAIN_BUYBACK_WALLET_ADDRESS",
    defaultValue: "0xabcd...1234efgh...5678",
  },
  {
    key: "buybackBurnWalletAddress",
    envKey: "VITE_BUYBACK_BURN_WALLET_ADDRESS",
    defaultValue: "0x5678...abcd1234...ef90",
  },
  {
    key: "totalAssets",
    envKey: "VITE_TOTAL_ASSETS",
    defaultValue: "$198.50",
  },
  {
    key: "weeklyGain",
    envKey: "VITE_WEEKLY_GAIN",
    defaultValue: "+5.2%",
  },
  {
    key: "returnRate",
    envKey: "VITE_RETURN_RATE",
    defaultValue: "12.8%",
  },
  {
    key: "binanceMargin",
    envKey: "VITE_BINANCE_MARGIN",
    defaultValue: "$15,000",
  },
  {
    key: "followers",
    envKey: "VITE_FOLLOWERS",
    defaultValue: "1247",
  },
  {
    key: "aum",
    envKey: "VITE_AUM",
    defaultValue: "$89,500",
  },
  {
    key: "weeklyReturn",
    envKey: "VITE_WEEKLY_RETURN",
    defaultValue: "+3.6%",
  },
  {
    key: "weeklyExpense",
    envKey: "VITE_WEEKLY_EXPENSE",
    defaultValue: "$4,250",
  },
  {
    key: "donationTotal",
    envKey: "VITE_DONATION_TOTAL",
    defaultValue: "$2,580",
  },
  {
    key: "donationTarget",
    envKey: "VITE_DONATION_TARGET",
    defaultValue: "方鸭社区",
  },
];

function unquote(value: string): string {
  if (value.length >= 2) {
    if (value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1);
    }
    if (value.startsWith("'") && value.endsWith("'")) {
      return value.slice(1, -1);
    }
  }
  return value;
}

function parseEnvMap(envFilePath: string): Record<string, string> {
  if (!fs.existsSync(envFilePath)) {
    return {};
  }

  const content = fs.readFileSync(envFilePath, "utf-8");
  const lines = content.split(/\r?\n/);
  const result: Record<string, string> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    result[key] = unquote(rawValue);
  }

  return result;
}

function shouldQuote(value: string): boolean {
  return /\s/.test(value) || value.includes("#") || value.includes("=");
}

function formatEnvValue(value: string): string {
  if (!shouldQuote(value)) {
    return value;
  }
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function setEnvValues(
  envFilePath: string,
  values: Record<string, string>
): void {
  const exists = fs.existsSync(envFilePath);
  const original = exists ? fs.readFileSync(envFilePath, "utf-8") : "";
  const lineBreak = original.includes("\r\n") ? "\r\n" : "\n";

  const lines = (exists ? original : "").split(/\r?\n/);
  const seen = new Set<string>();

  const updatedLines = lines.map(line => {
    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      return line;
    }

    const key = line.slice(0, separatorIndex).trim();
    const nextValue = values[key];

    if (typeof nextValue !== "string") {
      return line;
    }

    seen.add(key);
    return `${key}=${formatEnvValue(nextValue)}`;
  });

  for (const [key, value] of Object.entries(values)) {
    if (!seen.has(key)) {
      updatedLines.push(`${key}=${formatEnvValue(value)}`);
    }
  }

  const result = updatedLines.join(lineBreak).replace(/[\r\n]*$/, lineBreak);
  fs.writeFileSync(envFilePath, result, "utf-8");
}

function readSettingValue(
  envMap: Record<string, string>,
  key: string,
  fallback: string
): string {
  const fileValue = envMap[key];
  if (fileValue?.trim()) {
    return fileValue.trim();
  }

  const processValue = process.env[key]?.trim();
  if (processValue) {
    return processValue;
  }

  return fallback;
}

function sanitizeSettingInput(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "string") {
    return value.trim();
  }
  return "";
}

export function readEnvValue(
  envFilePath: string,
  key: string
): string | undefined {
  const envMap = parseEnvMap(envFilePath);
  const fileValue = envMap[key]?.trim();
  if (fileValue) {
    return fileValue;
  }

  const processValue = process.env[key]?.trim();
  return processValue || undefined;
}

export function getPublicSettings(envFilePath: string): AdminSettings {
  const envMap = parseEnvMap(envFilePath);

  const result = {} as AdminSettings;

  for (const item of SETTING_META) {
    result[item.key] = readSettingValue(envMap, item.envKey, item.defaultValue);
  }

  return result;
}

export function updatePublicSettings(
  envFilePath: string,
  updates: Partial<AdminSettings>
): AdminSettings {
  const envUpdates: Record<string, string> = {};

  for (const item of SETTING_META) {
    if (!(item.key in updates)) {
      continue;
    }

    const nextValue = sanitizeSettingInput(updates[item.key]);
    envUpdates[item.envKey] = nextValue || item.defaultValue;
  }

  if (Object.keys(envUpdates).length > 0) {
    setEnvValues(envFilePath, envUpdates);
  }

  return getPublicSettings(envFilePath);
}

export function getAdminCredentials(envFilePath: string): {
  username: string;
  password: string;
} {
  const envMap = parseEnvMap(envFilePath);

  return {
    username: readSettingValue(
      envMap,
      "ADMIN_USERNAME",
      DEFAULT_ADMIN_USERNAME
    ),
    password: readSettingValue(
      envMap,
      "ADMIN_PASSWORD",
      DEFAULT_ADMIN_PASSWORD
    ),
  };
}

export function parseCookies(cookieHeader?: string): Record<string, string> {
  const cookies: Record<string, string> = {};

  if (!cookieHeader) {
    return cookies;
  }

  for (const pair of cookieHeader.split(";")) {
    const separator = pair.indexOf("=");
    if (separator <= 0) {
      continue;
    }

    const key = pair.slice(0, separator).trim();
    const value = pair.slice(separator + 1).trim();
    cookies[key] = decodeURIComponent(value);
  }

  return cookies;
}

export function readJsonBody(
  req: IncomingMessage & { body?: unknown }
): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === "object") {
    return Promise.resolve(req.body as Record<string, unknown>);
  }

  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", chunk => {
      raw += chunk.toString();
    });

    req.on("end", () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }

      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          resolve(parsed as Record<string, unknown>);
          return;
        }
        reject(new Error("JSON body must be an object"));
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

export function sendJson(
  res: ServerResponse,
  statusCode: number,
  payload: unknown
): void {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
  });
  res.end(JSON.stringify(payload));
}

export function setSessionCookie(
  res: ServerResponse,
  token: string,
  ttlSeconds = ADMIN_SESSION_TTL_SECONDS
): void {
  res.setHeader(
    "Set-Cookie",
    `${ADMIN_SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ttlSeconds}`
  );
}

export function clearSessionCookie(res: ServerResponse): void {
  res.setHeader(
    "Set-Cookie",
    `${ADMIN_SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
}

export function createSessionStore(ttlMs = ADMIN_SESSION_TTL_SECONDS * 1000): {
  createSession: () => string;
  isValidSession: (token: string) => boolean;
  removeSession: (token: string) => void;
} {
  const sessions = new Map<string, number>();

  function createSession(): string {
    const token = crypto.randomBytes(24).toString("hex");
    sessions.set(token, Date.now() + ttlMs);
    return token;
  }

  function isValidSession(token: string): boolean {
    const expiresAt = sessions.get(token);
    if (!expiresAt) {
      return false;
    }

    if (expiresAt <= Date.now()) {
      sessions.delete(token);
      return false;
    }

    return true;
  }

  function removeSession(token: string): void {
    sessions.delete(token);
  }

  return {
    createSession,
    isValidSession,
    removeSession,
  };
}
