import fs from "node:fs";
import path from "node:path";

export interface ReturnRecord {
  id: string;
  time: string;
  returnRate: number;
  pnl: number;
}

export interface CreateReturnRecordInput {
  time: string;
  returnRate: number | string;
  pnl: number | string;
}

function ensureParentDirectory(filePath: string): void {
  const parentDirectory = path.dirname(filePath);
  fs.mkdirSync(parentDirectory, { recursive: true });
}

function parseRecordTime(value: string): Date | null {
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

function parseRecordIdTimestamp(id: string): number {
  const matched = id.match(/^(\d{10,})/);
  if (!matched) {
    return 0;
  }

  const parsed = Number(matched[1]);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeRecordTime(value: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error("Return record time is required");
  }

  return normalized;
}

function parseDecimal(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replaceAll(",", "").replace(/[^0-9+.-]/g, ""));
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  throw new Error("Invalid decimal value");
}

function toTimestamp(record: ReturnRecord): number {
  const parsedTime = parseRecordTime(record.time);
  if (parsedTime) {
    return parsedTime.getTime();
  }

  return parseRecordIdTimestamp(record.id);
}

function sortRecords(records: ReturnRecord[]): ReturnRecord[] {
  return [...records].sort((a, b) => toTimestamp(b) - toTimestamp(a));
}

function normalizeRecord(raw: unknown): ReturnRecord | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const candidate = raw as {
    id?: unknown;
    time?: unknown;
    returnRate?: unknown;
    pnl?: unknown;
  };

  if (typeof candidate.time !== "string") {
    return null;
  }

  try {
    const returnRate = parseDecimal(candidate.returnRate);
    const pnl = parseDecimal(candidate.pnl);

    return {
      id: String(candidate.id ?? `${Date.now()}`),
      time: normalizeRecordTime(candidate.time),
      returnRate,
      pnl,
    };
  } catch {
    return null;
  }
}

function writeReturnRecords(filePath: string, records: ReturnRecord[]): void {
  ensureParentDirectory(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(records, null, 2)}\n`, "utf-8");
}

export function readReturnRecords(filePath: string): ReturnRecord[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(content) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return sortRecords(
      parsed
        .map(item => normalizeRecord(item))
        .filter((item): item is ReturnRecord => Boolean(item))
    );
  } catch {
    return [];
  }
}

export function ensureReturnRecordsFile(filePath: string): ReturnRecord[] {
  const records = readReturnRecords(filePath);

  if (!fs.existsSync(filePath)) {
    writeReturnRecords(filePath, records);
  }

  return records;
}

export function createReturnRecord(
  filePath: string,
  input: CreateReturnRecordInput
): ReturnRecord[] {
  const nextRecord: ReturnRecord = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
    time: normalizeRecordTime(input.time),
    returnRate: parseDecimal(input.returnRate),
    pnl: parseDecimal(input.pnl),
  };

  const existingRecords = readReturnRecords(filePath);
  const nextRecords = sortRecords([...existingRecords, nextRecord]);
  writeReturnRecords(filePath, nextRecords);

  return nextRecords;
}

export function updateReturnRecord(
  filePath: string,
  id: string,
  input: CreateReturnRecordInput
): ReturnRecord[] {
  const records = readReturnRecords(filePath);
  const index = records.findIndex(item => item.id === id);

  if (index === -1) {
    throw new Error("Return record not found");
  }

  records[index] = {
    ...records[index],
    time: normalizeRecordTime(input.time),
    returnRate: parseDecimal(input.returnRate),
    pnl: parseDecimal(input.pnl),
  };

  const nextRecords = sortRecords(records);
  writeReturnRecords(filePath, nextRecords);
  return nextRecords;
}

export function deleteReturnRecord(
  filePath: string,
  id: string
): ReturnRecord[] {
  const records = readReturnRecords(filePath);
  const nextRecords = records.filter(item => item.id !== id);

  if (nextRecords.length === records.length) {
    throw new Error("Return record not found");
  }

  writeReturnRecords(filePath, nextRecords);
  return nextRecords;
}
