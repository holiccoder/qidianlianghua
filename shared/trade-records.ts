import fs from "node:fs";
import path from "node:path";

export interface TradeRecord {
  id: string;
  time: string;
  pair: string;
  pnl: number;
}

export interface CreateTradeRecordInput {
  time: string;
  pair: string;
  pnl: number | string;
}

const DEFAULT_TRADE_RECORDS: TradeRecord[] = [
  { id: "1", time: "2026-03-08 14:32:15", pair: "BTC/USDT", pnl: 128 },
  { id: "2", time: "2026-03-08 13:15:42", pair: "ETH/USDT", pnl: 56 },
  { id: "3", time: "2026-03-08 11:08:33", pair: "BNB/USDT", pnl: 24 },
  { id: "4", time: "2026-03-08 09:45:18", pair: "SOL/USDT", pnl: 33 },
  { id: "5", time: "2026-03-07 22:30:05", pair: "BTC/USDT", pnl: 30 },
  { id: "6", time: "2026-03-07 18:12:44", pair: "ETH/USDT", pnl: -24 },
  { id: "7", time: "2026-03-07 15:55:21", pair: "DOGE/USDT", pnl: 18 },
  { id: "8", time: "2026-03-07 12:40:09", pair: "BTC/USDT", pnl: 90 },
];

function ensureParentDirectory(filePath: string): void {
  const parentDirectory = path.dirname(filePath);
  fs.mkdirSync(parentDirectory, { recursive: true });
}

function parseTradeTime(value: string): Date | null {
  const normalized = value.trim().replace(" ", "T");
  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function formatTradeTime(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function normalizeTradeTime(value: string): string {
  const parsed = parseTradeTime(value);
  if (!parsed) {
    throw new Error("Invalid trade time");
  }

  return formatTradeTime(parsed);
}

function parsePnl(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replaceAll(",", "").replace(/[^0-9+.-]/g, ""));
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  throw new Error("Invalid pnl value");
}

function toTimestamp(time: string): number {
  const parsed = parseTradeTime(time);
  return parsed ? parsed.getTime() : 0;
}

function sortRecords(records: TradeRecord[]): TradeRecord[] {
  return [...records].sort((a, b) => toTimestamp(b.time) - toTimestamp(a.time));
}

function normalizeRecord(raw: unknown): TradeRecord | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const candidate = raw as {
    id?: unknown;
    time?: unknown;
    pair?: unknown;
    pnl?: unknown;
  };

  if (typeof candidate.time !== "string") {
    return null;
  }

  if (typeof candidate.pair !== "string") {
    return null;
  }

  const pair = candidate.pair.trim();
  if (!pair) {
    return null;
  }

  try {
    const pnl = parsePnl(candidate.pnl);

    return {
      id: String(candidate.id ?? `${Date.now()}`),
      time: normalizeTradeTime(candidate.time),
      pair,
      pnl,
    };
  } catch {
    return null;
  }
}

function writeTradeRecords(filePath: string, records: TradeRecord[]): void {
  ensureParentDirectory(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(records, null, 2)}\n`, "utf-8");
}

function buildDefaultRecords(): TradeRecord[] {
  return sortRecords(DEFAULT_TRADE_RECORDS.map(record => ({ ...record })));
}

export function readTradeRecords(filePath: string): TradeRecord[] {
  if (!fs.existsSync(filePath)) {
    return buildDefaultRecords();
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(content) as unknown;

    if (!Array.isArray(parsed)) {
      return buildDefaultRecords();
    }

    const records = parsed
      .map(item => normalizeRecord(item))
      .filter((item): item is TradeRecord => Boolean(item));

    if (records.length === 0) {
      return buildDefaultRecords();
    }

    return sortRecords(records);
  } catch {
    return buildDefaultRecords();
  }
}

export function ensureTradeRecordsFile(filePath: string): TradeRecord[] {
  const records = readTradeRecords(filePath);

  if (!fs.existsSync(filePath)) {
    writeTradeRecords(filePath, records);
  }

  return records;
}

export function createTradeRecord(
  filePath: string,
  input: CreateTradeRecordInput
): TradeRecord[] {
  const pair = input.pair.trim();
  if (!pair) {
    throw new Error("Trading pair is required");
  }

  const nextRecord: TradeRecord = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
    time: normalizeTradeTime(input.time),
    pair,
    pnl: parsePnl(input.pnl),
  };

  const existingRecords = readTradeRecords(filePath);
  const nextRecords = sortRecords([...existingRecords, nextRecord]);
  writeTradeRecords(filePath, nextRecords);
  return nextRecords;
}

export function updateTradeRecord(
  filePath: string,
  id: string,
  input: CreateTradeRecordInput
): TradeRecord[] {
  const pair = input.pair.trim();
  if (!pair) {
    throw new Error("Trading pair is required");
  }

  const records = readTradeRecords(filePath);
  const index = records.findIndex(item => item.id === id);

  if (index === -1) {
    throw new Error("Trade record not found");
  }

  records[index] = {
    ...records[index],
    time: normalizeTradeTime(input.time),
    pair,
    pnl: parsePnl(input.pnl),
  };

  const nextRecords = sortRecords(records);
  writeTradeRecords(filePath, nextRecords);
  return nextRecords;
}

export function deleteTradeRecord(filePath: string, id: string): TradeRecord[] {
  const records = readTradeRecords(filePath);
  const nextRecords = records.filter(item => item.id !== id);

  if (nextRecords.length === records.length) {
    throw new Error("Trade record not found");
  }

  writeTradeRecords(filePath, nextRecords);
  return nextRecords;
}
