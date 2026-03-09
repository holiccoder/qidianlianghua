import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

import {
  ADMIN_SESSION_COOKIE_NAME,
  clearSessionCookie,
  createSessionStore,
  getAdminCredentials,
  getPublicSettings,
  parseCookies,
  readEnvValue,
  readJsonBody,
  sendJson,
  setSessionCookie,
  updatePublicSettings,
} from "../shared/admin-settings";
import {
  DEFAULT_CONTRACT_ADDRESS,
  fetchTokenMetrics,
} from "../shared/token-metrics";
import {
  createTradeRecord,
  deleteTradeRecord,
  ensureTradeRecordsFile,
  readTradeRecords,
  updateTradeRecord,
} from "../shared/trade-records";
import {
  createReturnRecord,
  deleteReturnRecord,
  ensureReturnRecordsFile,
  readReturnRecords,
  updateReturnRecord,
} from "../shared/returns-records";
import {
  createAllocationRecord,
  deleteAllocationRecord,
  ensureAllocationRecordsFile,
  readAllocationRecords,
  updateAllocationRecord,
} from "../shared/allocation-records";
import {
  createExpenseRecord,
  deleteExpenseRecord,
  ensureExpenseRecordsFile,
  readExpenseRecords,
  updateExpenseRecord,
} from "../shared/expense-records";
import {
  createDonationRecord,
  deleteDonationRecord,
  ensureDonationRecordsFile,
  readDonationRecords,
  updateDonationRecord,
} from "../shared/donation-records";

const TOKEN_METRICS_CACHE_TTL_MS = 5 * 60 * 1000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENV_FILE_PATH = path.resolve(__dirname, "..", ".env");
const TRADE_RECORDS_FILE_PATH = path.resolve(
  __dirname,
  "..",
  "data",
  "trade-records.json"
);
const RETURN_RECORDS_FILE_PATH = path.resolve(
  __dirname,
  "..",
  "data",
  "returns-records.json"
);
const ALLOCATION_RECORDS_FILE_PATH = path.resolve(
  __dirname,
  "..",
  "data",
  "allocation-records.json"
);
const EXPENSE_RECORDS_FILE_PATH = path.resolve(
  __dirname,
  "..",
  "data",
  "expense-records.json"
);
const DONATION_RECORDS_FILE_PATH = path.resolve(
  __dirname,
  "..",
  "data",
  "donation-records.json"
);

function getContractAddress(): string {
  return (
    readEnvValue(ENV_FILE_PATH, "TOKEN_CONTRACT_ADDRESS") ||
    readEnvValue(ENV_FILE_PATH, "VITE_TOKEN_CONTRACT_ADDRESS") ||
    DEFAULT_CONTRACT_ADDRESS
  );
}

function getBuybackWalletAddress(): string | undefined {
  return (
    readEnvValue(ENV_FILE_PATH, "BUYBACK_WALLET_ADDRESS") ||
    readEnvValue(ENV_FILE_PATH, "VITE_BUYBACK_WALLET_ADDRESS")
  );
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  const adminSessions = createSessionStore();
  const contractAddress = getContractAddress();
  const buybackWalletAddress = getBuybackWalletAddress();

  ensureTradeRecordsFile(TRADE_RECORDS_FILE_PATH);
  ensureReturnRecordsFile(RETURN_RECORDS_FILE_PATH);
  ensureAllocationRecordsFile(ALLOCATION_RECORDS_FILE_PATH);
  ensureExpenseRecordsFile(EXPENSE_RECORDS_FILE_PATH);
  ensureDonationRecordsFile(DONATION_RECORDS_FILE_PATH);

  let metricsCache:
    | {
        expiresAt: number;
        data: Awaited<ReturnType<typeof fetchTokenMetrics>>;
      }
    | undefined;

  app.get("/api/token-metrics", async (_req, res) => {
    try {
      if (!metricsCache || metricsCache.expiresAt <= Date.now()) {
        const data = await fetchTokenMetrics(
          contractAddress,
          undefined,
          buybackWalletAddress
        );
        metricsCache = {
          data,
          expiresAt: Date.now() + TOKEN_METRICS_CACHE_TTL_MS,
        };
      }

      res.json(metricsCache.data);
    } catch (error) {
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch token metrics",
      });
    }
  });

  app.get("/api/config", (_req, res) => {
    const settings = getPublicSettings(ENV_FILE_PATH);
    res.json(settings);
  });

  app.get("/api/trades", (_req, res) => {
    const records = readTradeRecords(TRADE_RECORDS_FILE_PATH);
    res.json(records);
  });

  app.get("/api/returns", (_req, res) => {
    const records = readReturnRecords(RETURN_RECORDS_FILE_PATH);
    res.json(records);
  });

  app.get("/api/allocations", (_req, res) => {
    const records = readAllocationRecords(ALLOCATION_RECORDS_FILE_PATH);
    res.json(records);
  });

  app.get("/api/expenses", (_req, res) => {
    const records = readExpenseRecords(EXPENSE_RECORDS_FILE_PATH);
    res.json(records);
  });

  app.get("/api/donations", (_req, res) => {
    const records = readDonationRecords(DONATION_RECORDS_FILE_PATH);
    res.json(records);
  });

  app.get("/api/total-assets", (_req, res) => {
    const records = readAllocationRecords(ALLOCATION_RECORDS_FILE_PATH);
    const total = records.reduce((sum, r) => sum + r.amount, 0);
    res.json({ total });
  });

  function isAdminAuthenticated(req: express.Request): boolean {
    const token = parseCookies(req.headers.cookie)[ADMIN_SESSION_COOKIE_NAME];
    if (!token) {
      return false;
    }
    return adminSessions.isValidSession(token);
  }

  app.post("/api/admin/login", async (req, res) => {
    try {
      const body = await readJsonBody(req);
      const username = String(body.username ?? "").trim();
      const password = String(body.password ?? "").trim();
      const credentials = getAdminCredentials(ENV_FILE_PATH);

      if (
        username !== credentials.username ||
        password !== credentials.password
      ) {
        clearSessionCookie(res);
        return sendJson(res, 401, { error: "Invalid username or password" });
      }

      const sessionToken = adminSessions.createSession();
      setSessionCookie(res, sessionToken);
      return sendJson(res, 200, { success: true });
    } catch {
      return sendJson(res, 400, { error: "Invalid request body" });
    }
  });

  app.post("/api/admin/logout", (req, res) => {
    const token = parseCookies(req.headers.cookie)[ADMIN_SESSION_COOKIE_NAME];
    if (token) {
      adminSessions.removeSession(token);
    }
    clearSessionCookie(res);
    return sendJson(res, 200, { success: true });
  });

  app.get("/api/admin/settings", (req, res) => {
    if (!isAdminAuthenticated(req)) {
      return sendJson(res, 401, { error: "Unauthorized" });
    }

    const settings = getPublicSettings(ENV_FILE_PATH);
    return sendJson(res, 200, settings);
  });

  app.put("/api/admin/settings", async (req, res) => {
    if (!isAdminAuthenticated(req)) {
      return sendJson(res, 401, { error: "Unauthorized" });
    }

    try {
      const body = await readJsonBody(req);
      const settings = updatePublicSettings(
        ENV_FILE_PATH,
        body as Parameters<typeof updatePublicSettings>[1]
      );
      return sendJson(res, 200, settings);
    } catch {
      return sendJson(res, 400, { error: "Invalid request body" });
    }
  });

  app.get("/api/admin/trades", (req, res) => {
    if (!isAdminAuthenticated(req)) {
      return sendJson(res, 401, { error: "Unauthorized" });
    }

    const records = readTradeRecords(TRADE_RECORDS_FILE_PATH);
    return sendJson(res, 200, records);
  });

  app.post("/api/admin/trades", async (req, res) => {
    if (!isAdminAuthenticated(req)) {
      return sendJson(res, 401, { error: "Unauthorized" });
    }

    try {
      const body = await readJsonBody(req);
      const pnlValue =
        typeof body.pnl === "number" || typeof body.pnl === "string"
          ? body.pnl
          : "";
      const records = createTradeRecord(TRADE_RECORDS_FILE_PATH, {
        time: String(body.time ?? ""),
        pair: String(body.pair ?? ""),
        pnl: pnlValue,
      });
      return sendJson(res, 200, records);
    } catch (error) {
      return sendJson(res, 400, {
        error: error instanceof Error ? error.message : "Invalid request body",
      });
    }
  });

  app.put("/api/admin/trades/:id", async (req, res) => {
    if (!isAdminAuthenticated(req)) {
      return sendJson(res, 401, { error: "Unauthorized" });
    }

    try {
      const body = await readJsonBody(req);
      const pnlValue =
        typeof body.pnl === "number" || typeof body.pnl === "string"
          ? body.pnl
          : "";
      const records = updateTradeRecord(
        TRADE_RECORDS_FILE_PATH,
        req.params.id,
        {
          time: String(body.time ?? ""),
          pair: String(body.pair ?? ""),
          pnl: pnlValue,
        }
      );
      return sendJson(res, 200, records);
    } catch (error) {
      return sendJson(res, 400, {
        error: error instanceof Error ? error.message : "Invalid request body",
      });
    }
  });

  app.delete("/api/admin/trades/:id", (req, res) => {
    if (!isAdminAuthenticated(req)) {
      return sendJson(res, 401, { error: "Unauthorized" });
    }

    try {
      const records = deleteTradeRecord(TRADE_RECORDS_FILE_PATH, req.params.id);
      return sendJson(res, 200, records);
    } catch (error) {
      return sendJson(res, 400, {
        error: error instanceof Error ? error.message : "Invalid request body",
      });
    }
  });

  app.get("/api/admin/returns", (req, res) => {
    if (!isAdminAuthenticated(req)) {
      return sendJson(res, 401, { error: "Unauthorized" });
    }

    const records = readReturnRecords(RETURN_RECORDS_FILE_PATH);
    return sendJson(res, 200, records);
  });

  app.post("/api/admin/returns", async (req, res) => {
    if (!isAdminAuthenticated(req)) {
      return sendJson(res, 401, { error: "Unauthorized" });
    }

    try {
      const body = await readJsonBody(req);
      const returnRateValue =
        typeof body.returnRate === "number" ||
        typeof body.returnRate === "string"
          ? body.returnRate
          : "";
      const pnlValue =
        typeof body.pnl === "number" || typeof body.pnl === "string"
          ? body.pnl
          : "";

      const records = createReturnRecord(RETURN_RECORDS_FILE_PATH, {
        time: String(body.time ?? ""),
        endTime: String(body.endTime ?? ""),
        returnRate: returnRateValue,
        pnl: pnlValue,
      });

      return sendJson(res, 200, records);
    } catch (error) {
      return sendJson(res, 400, {
        error: error instanceof Error ? error.message : "Invalid request body",
      });
    }
  });

  app.put("/api/admin/returns/:id", async (req, res) => {
    if (!isAdminAuthenticated(req)) {
      return sendJson(res, 401, { error: "Unauthorized" });
    }

    try {
      const body = await readJsonBody(req);
      const returnRateValue =
        typeof body.returnRate === "number" ||
        typeof body.returnRate === "string"
          ? body.returnRate
          : "";
      const pnlValue =
        typeof body.pnl === "number" || typeof body.pnl === "string"
          ? body.pnl
          : "";

      const records = updateReturnRecord(
        RETURN_RECORDS_FILE_PATH,
        req.params.id,
        {
          time: String(body.time ?? ""),
          endTime: String(body.endTime ?? ""),
          returnRate: returnRateValue,
          pnl: pnlValue,
        }
      );

      return sendJson(res, 200, records);
    } catch (error) {
      return sendJson(res, 400, {
        error: error instanceof Error ? error.message : "Invalid request body",
      });
    }
  });

  app.delete("/api/admin/returns/:id", (req, res) => {
    if (!isAdminAuthenticated(req)) {
      return sendJson(res, 401, { error: "Unauthorized" });
    }

    try {
      const records = deleteReturnRecord(
        RETURN_RECORDS_FILE_PATH,
        req.params.id
      );
      return sendJson(res, 200, records);
    } catch (error) {
      return sendJson(res, 400, {
        error: error instanceof Error ? error.message : "Invalid request body",
      });
    }
  });

  app.get("/api/admin/allocations", (req, res) => {
    if (!isAdminAuthenticated(req)) {
      return sendJson(res, 401, { error: "Unauthorized" });
    }

    const records = readAllocationRecords(ALLOCATION_RECORDS_FILE_PATH);
    return sendJson(res, 200, records);
  });

  app.post("/api/admin/allocations", async (req, res) => {
    if (!isAdminAuthenticated(req)) {
      return sendJson(res, 401, { error: "Unauthorized" });
    }

    try {
      const body = await readJsonBody(req);
      const amountValue =
        typeof body.amount === "number" || typeof body.amount === "string"
          ? body.amount
          : "";

      const records = createAllocationRecord(ALLOCATION_RECORDS_FILE_PATH, {
        contract: String(body.contract ?? ""),
        amount: amountValue,
      });

      return sendJson(res, 200, records);
    } catch (error) {
      return sendJson(res, 400, {
        error: error instanceof Error ? error.message : "Invalid request body",
      });
    }
  });

  app.put("/api/admin/allocations/:id", async (req, res) => {
    if (!isAdminAuthenticated(req)) {
      return sendJson(res, 401, { error: "Unauthorized" });
    }

    try {
      const body = await readJsonBody(req);
      const amountValue =
        typeof body.amount === "number" || typeof body.amount === "string"
          ? body.amount
          : "";

      const records = updateAllocationRecord(
        ALLOCATION_RECORDS_FILE_PATH,
        req.params.id,
        {
          contract: String(body.contract ?? ""),
          amount: amountValue,
        }
      );

      return sendJson(res, 200, records);
    } catch (error) {
      return sendJson(res, 400, {
        error: error instanceof Error ? error.message : "Invalid request body",
      });
    }
  });

  app.delete("/api/admin/allocations/:id", (req, res) => {
    if (!isAdminAuthenticated(req)) {
      return sendJson(res, 401, { error: "Unauthorized" });
    }

    try {
      const records = deleteAllocationRecord(
        ALLOCATION_RECORDS_FILE_PATH,
        req.params.id
      );
      return sendJson(res, 200, records);
    } catch (error) {
      return sendJson(res, 400, {
        error: error instanceof Error ? error.message : "Invalid request body",
      });
    }
  });

  app.get("/api/admin/expenses", (req, res) => {
    if (!isAdminAuthenticated(req)) {
      return sendJson(res, 401, { error: "Unauthorized" });
    }

    const records = readExpenseRecords(EXPENSE_RECORDS_FILE_PATH);
    return sendJson(res, 200, records);
  });

  app.post("/api/admin/expenses", async (req, res) => {
    if (!isAdminAuthenticated(req)) {
      return sendJson(res, 401, { error: "Unauthorized" });
    }

    try {
      const body = await readJsonBody(req);
      const amountValue =
        typeof body.amount === "number" || typeof body.amount === "string"
          ? body.amount
          : "";
      const records = createExpenseRecord(EXPENSE_RECORDS_FILE_PATH, {
        time: String(body.time ?? ""),
        category: String(body.category ?? ""),
        amount: amountValue,
      });
      return sendJson(res, 200, records);
    } catch (error) {
      return sendJson(res, 400, {
        error: error instanceof Error ? error.message : "Invalid request body",
      });
    }
  });

  app.put("/api/admin/expenses/:id", async (req, res) => {
    if (!isAdminAuthenticated(req)) {
      return sendJson(res, 401, { error: "Unauthorized" });
    }

    try {
      const body = await readJsonBody(req);
      const amountValue =
        typeof body.amount === "number" || typeof body.amount === "string"
          ? body.amount
          : "";
      const records = updateExpenseRecord(
        EXPENSE_RECORDS_FILE_PATH,
        req.params.id,
        {
          time: String(body.time ?? ""),
          category: String(body.category ?? ""),
          amount: amountValue,
        }
      );
      return sendJson(res, 200, records);
    } catch (error) {
      return sendJson(res, 400, {
        error: error instanceof Error ? error.message : "Invalid request body",
      });
    }
  });

  app.delete("/api/admin/expenses/:id", (req, res) => {
    if (!isAdminAuthenticated(req)) {
      return sendJson(res, 401, { error: "Unauthorized" });
    }

    try {
      const records = deleteExpenseRecord(
        EXPENSE_RECORDS_FILE_PATH,
        req.params.id
      );
      return sendJson(res, 200, records);
    } catch (error) {
      return sendJson(res, 400, {
        error: error instanceof Error ? error.message : "Invalid request body",
      });
    }
  });

  app.get("/api/admin/donations", (req, res) => {
    if (!isAdminAuthenticated(req)) {
      return sendJson(res, 401, { error: "Unauthorized" });
    }

    const records = readDonationRecords(DONATION_RECORDS_FILE_PATH);
    return sendJson(res, 200, records);
  });

  app.post("/api/admin/donations", async (req, res) => {
    if (!isAdminAuthenticated(req)) {
      return sendJson(res, 401, { error: "Unauthorized" });
    }

    try {
      const body = await readJsonBody(req);
      const amountValue =
        typeof body.amount === "number" || typeof body.amount === "string"
          ? body.amount
          : "";
      const records = createDonationRecord(DONATION_RECORDS_FILE_PATH, {
        time: String(body.time ?? ""),
        amount: amountValue,
      });
      return sendJson(res, 200, records);
    } catch (error) {
      return sendJson(res, 400, {
        error: error instanceof Error ? error.message : "Invalid request body",
      });
    }
  });

  app.put("/api/admin/donations/:id", async (req, res) => {
    if (!isAdminAuthenticated(req)) {
      return sendJson(res, 401, { error: "Unauthorized" });
    }

    try {
      const body = await readJsonBody(req);
      const amountValue =
        typeof body.amount === "number" || typeof body.amount === "string"
          ? body.amount
          : "";
      const records = updateDonationRecord(
        DONATION_RECORDS_FILE_PATH,
        req.params.id,
        {
          time: String(body.time ?? ""),
          amount: amountValue,
        }
      );
      return sendJson(res, 200, records);
    } catch (error) {
      return sendJson(res, 400, {
        error: error instanceof Error ? error.message : "Invalid request body",
      });
    }
  });

  app.delete("/api/admin/donations/:id", (req, res) => {
    if (!isAdminAuthenticated(req)) {
      return sendJson(res, 401, { error: "Unauthorized" });
    }

    try {
      const records = deleteDonationRecord(
        DONATION_RECORDS_FILE_PATH,
        req.params.id
      );
      return sendJson(res, 200, records);
    } catch (error) {
      return sendJson(res, 400, {
        error: error instanceof Error ? error.message : "Invalid request body",
      });
    }
  });

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
