import fs from "node:fs";
import path from "node:path";

export interface ExpenseRecord {
  id: string;
  time: string;
  category: string;
  amount: number;
}

export interface CreateExpenseRecordInput {
  time: string;
  category: string;
  amount: number | string;
}

const DEFAULT_EXPENSE_RECORDS: ExpenseRecord[] = [
  { id: "1", time: "2026-03-08 10:00:00", category: "服务器", amount: 520 },
  { id: "2", time: "2026-03-07 14:30:00", category: "推广", amount: 780 },
  { id: "3", time: "2026-03-06 11:20:00", category: "社区激励", amount: 360 },
  { id: "4", time: "2026-03-05 16:10:00", category: "工具订阅", amount: 240 },
  { id: "5", time: "2026-03-04 09:45:00", category: "运营", amount: 410 },
];

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
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function normalizeRecordTime(value: string): string {
  const parsed = parseRecordTime(value);
  if (!parsed) {
    throw new Error("Invalid expense record time");
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

  throw new Error("Invalid expense amount");
}

function toTimestamp(time: string): number {
  const parsed = parseRecordTime(time);
  return parsed ? parsed.getTime() : 0;
}

function sortRecords(records: ExpenseRecord[]): ExpenseRecord[] {
  return [...records].sort((a, b) => toTimestamp(b.time) - toTimestamp(a.time));
}

function normalizeRecord(raw: unknown): ExpenseRecord | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const candidate = raw as {
    id?: unknown;
    time?: unknown;
    category?: unknown;
    amount?: unknown;
  };

  if (
    typeof candidate.time !== "string" ||
    typeof candidate.category !== "string"
  ) {
    return null;
  }

  const category = candidate.category.trim();
  if (!category) {
    return null;
  }

  try {
    const amount = parseAmount(candidate.amount);

    return {
      id: String(candidate.id ?? `${Date.now()}`),
      time: normalizeRecordTime(candidate.time),
      category,
      amount,
    };
  } catch {
    return null;
  }
}

function writeExpenseRecords(filePath: string, records: ExpenseRecord[]): void {
  ensureParentDirectory(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(records, null, 2)}\n`, "utf-8");
}

function buildDefaultRecords(): ExpenseRecord[] {
  return sortRecords(DEFAULT_EXPENSE_RECORDS.map(record => ({ ...record })));
}

export function readExpenseRecords(filePath: string): ExpenseRecord[] {
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
      .filter((item): item is ExpenseRecord => Boolean(item));

    if (records.length === 0) {
      return buildDefaultRecords();
    }

    return sortRecords(records);
  } catch {
    return buildDefaultRecords();
  }
}

export function ensureExpenseRecordsFile(filePath: string): ExpenseRecord[] {
  const records = readExpenseRecords(filePath);

  if (!fs.existsSync(filePath)) {
    writeExpenseRecords(filePath, records);
  }

  return records;
}

export function createExpenseRecord(
  filePath: string,
  input: CreateExpenseRecordInput
): ExpenseRecord[] {
  const category = input.category.trim();
  if (!category) {
    throw new Error("Expense category is required");
  }

  const amount = parseAmount(input.amount);

  const record: ExpenseRecord = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
    time: normalizeRecordTime(input.time),
    category,
    amount,
  };

  const records = sortRecords([...readExpenseRecords(filePath), record]);
  writeExpenseRecords(filePath, records);
  return records;
}

export function updateExpenseRecord(
  filePath: string,
  id: string,
  input: CreateExpenseRecordInput
): ExpenseRecord[] {
  const category = input.category.trim();
  if (!category) {
    throw new Error("Expense category is required");
  }

  const records = readExpenseRecords(filePath);
  const index = records.findIndex(item => item.id === id);

  if (index === -1) {
    throw new Error("Expense record not found");
  }

  records[index] = {
    ...records[index],
    time: normalizeRecordTime(input.time),
    category,
    amount: parseAmount(input.amount),
  };

  const nextRecords = sortRecords(records);
  writeExpenseRecords(filePath, nextRecords);
  return nextRecords;
}

export function deleteExpenseRecord(
  filePath: string,
  id: string
): ExpenseRecord[] {
  const records = readExpenseRecords(filePath);
  const nextRecords = records.filter(item => item.id !== id);

  if (nextRecords.length === records.length) {
    throw new Error("Expense record not found");
  }

  writeExpenseRecords(filePath, nextRecords);
  return nextRecords;
}
