import crypto from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import fs from "node:fs";
import path from "node:path";

export const ADMIN_SESSION_COOKIE_NAME = "sq_admin_session";
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 12;

const DEFAULT_ADMIN_USERNAME = "admin";
const DEFAULT_ADMIN_PASSWORD = "admin123456";
const PUBLIC_SETTINGS_FILE_NAME = "admin-settings.json";

export interface AdminSettings {
  socialTelegramUrl: string;
  socialXUrl: string;
  socialBinanceUrl: string;
  tokenContractAddress: string;
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
  monthlyReturn: string;
  totalReturn: string;
  winRate: string;
  maxDrawdown: string;
  weeklyExpense: string;
  donationTotal: string;
  donationTarget: string;
}

type SettingKey = keyof AdminSettings;

interface SettingMeta {
  key: SettingKey;
  envKey: string;
  defaultValue: string;
  allowEmpty?: boolean;
  normalize?: (value: string) => string;
}

const NUMERIC_TEXT_PATTERN = /^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/;

function normalizeDollarAmount(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("$") || !NUMERIC_TEXT_PATTERN.test(trimmed)) {
    return trimmed;
  }

  return `$${trimmed}`;
}

function normalizeSettingValue(item: SettingMeta, value: string): string {
  return item.normalize ? item.normalize(value) : value;
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
    key: "tokenContractAddress",
    envKey: "VITE_TOKEN_CONTRACT_ADDRESS",
    defaultValue: "0x1094814045fe0c29023df28698ca539296cf7777",
    allowEmpty: true,
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
    key: "monthlyReturn",
    envKey: "VITE_MONTHLY_RETURN",
    defaultValue: "+12.8%",
  },
  {
    key: "totalReturn",
    envKey: "VITE_TOTAL_RETURN",
    defaultValue: "+45.2%",
  },
  {
    key: "winRate",
    envKey: "VITE_WIN_RATE",
    defaultValue: "72.5%",
  },
  {
    key: "maxDrawdown",
    envKey: "VITE_MAX_DRAWDOWN",
    defaultValue: "-8.3%",
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
    normalize: normalizeDollarAmount,
  },
  {
    key: "donationTarget",
    envKey: "VITE_DONATION_TARGET",
    defaultValue: "方鸭自闭症慈善社区",
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

function getPublicSettingsFilePath(envFilePath: string): string {
  return path.resolve(
    path.dirname(envFilePath),
    "data",
    PUBLIC_SETTINGS_FILE_NAME
  );
}

function parseStoredSettings(
  settingsFilePath: string
): Partial<Record<SettingKey, string>> {
  if (!fs.existsSync(settingsFilePath)) {
    return {};
  }

  try {
    const raw = fs.readFileSync(settingsFilePath, "utf-8");
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    const result: Partial<Record<SettingKey, string>> = {};

    for (const item of SETTING_META) {
      const value = (parsed as Record<string, unknown>)[item.key];
      if (typeof value === "string") {
        result[item.key] = normalizeSettingValue(item, value.trim());
      }
    }

    return result;
  } catch {
    return {};
  }
}

function writeStoredSettings(
  settingsFilePath: string,
  settings: AdminSettings
): void {
  fs.mkdirSync(path.dirname(settingsFilePath), { recursive: true });
  fs.writeFileSync(
    settingsFilePath,
    `${JSON.stringify(settings, null, 2)}\n`,
    "utf-8"
  );
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
  const storedSettings = parseStoredSettings(
    getPublicSettingsFilePath(envFilePath)
  );

  const result = {} as AdminSettings;

  for (const item of SETTING_META) {
    const storedValue = storedSettings[item.key];
    if (
      storedValue !== undefined &&
      (item.allowEmpty || storedValue.length > 0)
    ) {
      result[item.key] = normalizeSettingValue(item, storedValue);
      continue;
    }

    result[item.key] = normalizeSettingValue(
      item,
      readSettingValue(envMap, item.envKey, item.defaultValue)
    );
  }

  return result;
}

export function updatePublicSettings(
  envFilePath: string,
  updates: Partial<AdminSettings>
): AdminSettings {
  const nextSettings: AdminSettings = { ...getPublicSettings(envFilePath) };
  let hasUpdates = false;

  for (const item of SETTING_META) {
    if (!(item.key in updates)) {
      continue;
    }

    const nextValue = normalizeSettingValue(
      item,
      sanitizeSettingInput(updates[item.key])
    );
    nextSettings[item.key] =
      nextValue || (item.allowEmpty ? "" : item.defaultValue);
    hasUpdates = true;
  }

  if (hasUpdates) {
    writeStoredSettings(getPublicSettingsFilePath(envFilePath), nextSettings);
  }

  return nextSettings;
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
