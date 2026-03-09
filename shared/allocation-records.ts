import fs from "node:fs";
import path from "node:path";

export interface AllocationRecord {
  id: string;
  contract: string;
  amount: number;
}

export interface AllocationRecordInput {
  contract: string;
  amount: number | string;
}

const DEFAULT_ALLOCATION_RECORDS: AllocationRecord[] = [
  { id: "1", contract: "BTC合约", amount: 31325 },
  { id: "2", contract: "ETH合约", amount: 22375 },
  { id: "3", contract: "BNB现货", amount: 13425 },
  { id: "4", contract: "SOL合约", amount: 8950 },
  { id: "5", contract: "其他代币", amount: 7160 },
  { id: "6", contract: "USDT储备", amount: 6265 },
];

function ensureParentDirectory(filePath: string): void {
  const parentDirectory = path.dirname(filePath);
  fs.mkdirSync(parentDirectory, { recursive: true });
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

  throw new Error("Invalid asset amount");
}

function normalizeRecord(raw: unknown): AllocationRecord | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const candidate = raw as {
    id?: unknown;
    contract?: unknown;
    amount?: unknown;
  };

  if (typeof candidate.contract !== "string") {
    return null;
  }

  const contract = candidate.contract.trim();
  if (!contract) {
    return null;
  }

  try {
    const amount = parseAmount(candidate.amount);

    return {
      id: String(candidate.id ?? `${Date.now()}`),
      contract,
      amount,
    };
  } catch {
    return null;
  }
}

function writeAllocationRecords(
  filePath: string,
  records: AllocationRecord[]
): void {
  ensureParentDirectory(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(records, null, 2)}\n`, "utf-8");
}

function buildDefaultRecords(): AllocationRecord[] {
  return DEFAULT_ALLOCATION_RECORDS.map(record => ({ ...record }));
}

export function readAllocationRecords(filePath: string): AllocationRecord[] {
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
      .filter((item): item is AllocationRecord => Boolean(item));

    if (records.length === 0) {
      return buildDefaultRecords();
    }

    return records;
  } catch {
    return buildDefaultRecords();
  }
}

export function ensureAllocationRecordsFile(
  filePath: string
): AllocationRecord[] {
  const records = readAllocationRecords(filePath);

  if (!fs.existsSync(filePath)) {
    writeAllocationRecords(filePath, records);
  }

  return records;
}

export function createAllocationRecord(
  filePath: string,
  input: AllocationRecordInput
): AllocationRecord[] {
  const contract = input.contract.trim();
  if (!contract) {
    throw new Error("Contract is required");
  }

  const amount = parseAmount(input.amount);

  const record: AllocationRecord = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
    contract,
    amount,
  };

  const records = [...readAllocationRecords(filePath), record];
  writeAllocationRecords(filePath, records);
  return records;
}

export function updateAllocationRecord(
  filePath: string,
  id: string,
  input: AllocationRecordInput
): AllocationRecord[] {
  const contract = input.contract.trim();
  if (!contract) {
    throw new Error("Contract is required");
  }

  const amount = parseAmount(input.amount);
  const records = readAllocationRecords(filePath);
  const index = records.findIndex(item => item.id === id);

  if (index === -1) {
    throw new Error("Allocation record not found");
  }

  records[index] = {
    ...records[index],
    contract,
    amount,
  };

  writeAllocationRecords(filePath, records);
  return records;
}

export function deleteAllocationRecord(
  filePath: string,
  id: string
): AllocationRecord[] {
  const records = readAllocationRecords(filePath);
  const nextRecords = records.filter(item => item.id !== id);

  if (nextRecords.length === records.length) {
    throw new Error("Allocation record not found");
  }

  writeAllocationRecords(filePath, nextRecords);
  return nextRecords;
}
