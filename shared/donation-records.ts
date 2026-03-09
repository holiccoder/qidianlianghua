import fs from "node:fs";
import path from "node:path";

export interface DonationRecord {
  id: string;
  time: string;
  amount: number;
}

export interface CreateDonationRecordInput {
  time: string;
  amount: number | string;
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

function formatRecordTime(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function normalizeRecordTime(value: string): string {
  const parsed = parseRecordTime(value);
  if (!parsed) {
    throw new Error("Invalid donation record time");
  }

  return formatRecordTime(parsed);
}

function parseAmount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replaceAll(",", "").replace(/[^0-9+.-]/g, ""));
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  throw new Error("Invalid donation amount");
}

function toTimestamp(time: string): number {
  const parsed = parseRecordTime(time);
  return parsed ? parsed.getTime() : 0;
}

function sortRecords(records: DonationRecord[]): DonationRecord[] {
  return [...records].sort((a, b) => toTimestamp(b.time) - toTimestamp(a.time));
}

function normalizeRecord(raw: unknown): DonationRecord | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const candidate = raw as {
    id?: unknown;
    time?: unknown;
    amount?: unknown;
  };

  if (typeof candidate.time !== "string") {
    return null;
  }

  try {
    const amount = parseAmount(candidate.amount);

    return {
      id: String(candidate.id ?? `${Date.now()}`),
      time: normalizeRecordTime(candidate.time),
      amount,
    };
  } catch {
    return null;
  }
}

function writeDonationRecords(
  filePath: string,
  records: DonationRecord[]
): void {
  ensureParentDirectory(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(records, null, 2)}\n`, "utf-8");
}

function buildDefaultRecords(): DonationRecord[] {
  return [];
}

export function readDonationRecords(filePath: string): DonationRecord[] {
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
      .filter((item): item is DonationRecord => Boolean(item));

    if (records.length === 0) {
      return buildDefaultRecords();
    }

    return sortRecords(records);
  } catch {
    return buildDefaultRecords();
  }
}

export function ensureDonationRecordsFile(filePath: string): DonationRecord[] {
  const records = readDonationRecords(filePath);

  if (!fs.existsSync(filePath)) {
    writeDonationRecords(filePath, records);
  }

  return records;
}

export function createDonationRecord(
  filePath: string,
  input: CreateDonationRecordInput
): DonationRecord[] {
  const amount = parseAmount(input.amount);

  const record: DonationRecord = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
    time: normalizeRecordTime(input.time),
    amount,
  };

  const records = sortRecords([...readDonationRecords(filePath), record]);
  writeDonationRecords(filePath, records);
  return records;
}

export function updateDonationRecord(
  filePath: string,
  id: string,
  input: CreateDonationRecordInput
): DonationRecord[] {
  const records = readDonationRecords(filePath);
  const index = records.findIndex(item => item.id === id);

  if (index === -1) {
    throw new Error("Donation record not found");
  }

  records[index] = {
    ...records[index],
    time: normalizeRecordTime(input.time),
    amount: parseAmount(input.amount),
  };

  const nextRecords = sortRecords(records);
  writeDonationRecords(filePath, nextRecords);
  return nextRecords;
}

export function deleteDonationRecord(
  filePath: string,
  id: string
): DonationRecord[] {
  const records = readDonationRecords(filePath);
  const nextRecords = records.filter(item => item.id !== id);

  if (nextRecords.length === records.length) {
    throw new Error("Donation record not found");
  }

  writeDonationRecords(filePath, nextRecords);
  return nextRecords;
}
