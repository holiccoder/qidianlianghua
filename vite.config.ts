import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";

import {
  ADMIN_SESSION_COOKIE_NAME,
  clearSessionCookie,
  createSessionStore,
  getAdminCredentials,
  getPublicSettings,
  parseCookies,
  readJsonBody,
  sendJson,
  setSessionCookie,
  updatePublicSettings,
} from "./shared/admin-settings";
import {
  DEFAULT_CONTRACT_ADDRESS,
  fetchTokenMetrics,
} from "./shared/token-metrics";
import {
  createTradeRecord,
  deleteTradeRecord,
  ensureTradeRecordsFile,
  readTradeRecords,
  updateTradeRecord,
} from "./shared/trade-records";
import {
  createReturnRecord,
  deleteReturnRecord,
  ensureReturnRecordsFile,
  readReturnRecords,
  updateReturnRecord,
} from "./shared/returns-records";
import {
  createAllocationRecord,
  deleteAllocationRecord,
  ensureAllocationRecordsFile,
  readAllocationRecords,
  updateAllocationRecord,
} from "./shared/allocation-records";
import {
  createExpenseRecord,
  deleteExpenseRecord,
  ensureExpenseRecordsFile,
  readExpenseRecords,
  updateExpenseRecord,
} from "./shared/expense-records";
import {
  createDonationRecord,
  deleteDonationRecord,
  ensureDonationRecordsFile,
  readDonationRecords,
  updateDonationRecord,
} from "./shared/donation-records";

const TOKEN_METRICS_CACHE_TTL_MS = 5 * 60 * 1000;
const ENV_FILE_PATH = path.resolve(import.meta.dirname, ".env");
const TRADE_RECORDS_FILE_PATH = path.resolve(
  import.meta.dirname,
  "data",
  "trade-records.json"
);
const RETURN_RECORDS_FILE_PATH = path.resolve(
  import.meta.dirname,
  "data",
  "returns-records.json"
);
const ALLOCATION_RECORDS_FILE_PATH = path.resolve(
  import.meta.dirname,
  "data",
  "allocation-records.json"
);
const EXPENSE_RECORDS_FILE_PATH = path.resolve(
  import.meta.dirname,
  "data",
  "expense-records.json"
);
const DONATION_RECORDS_FILE_PATH = path.resolve(
  import.meta.dirname,
  "data",
  "donation-records.json"
);

// =============================================================================
// Manus Debug Collector - Vite Plugin
// Writes browser logs directly to files, trimmed when exceeding size limit
// =============================================================================

const PROJECT_ROOT = import.meta.dirname;
const LOG_DIR = path.join(PROJECT_ROOT, ".manus-logs");
const MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024; // 1MB per log file
const TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6); // Trim to 60% to avoid constant re-trimming

type LogSource = "browserConsole" | "networkRequests" | "sessionReplay";

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function trimLogFile(logPath: string, maxSize: number) {
  try {
    if (!fs.existsSync(logPath) || fs.statSync(logPath).size <= maxSize) {
      return;
    }

    const lines = fs.readFileSync(logPath, "utf-8").split("\n");
    const keptLines: string[] = [];
    let keptBytes = 0;

    // Keep newest lines (from end) that fit within 60% of maxSize
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}\n`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }

    fs.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
    /* ignore trim errors */
  }
}

function writeToLogFile(source: LogSource, entries: unknown[]) {
  if (entries.length === 0) return;

  ensureLogDir();
  const logPath = path.join(LOG_DIR, `${source}.log`);

  // Format entries with timestamps
  const lines = entries.map(entry => {
    const ts = new Date().toISOString();
    return `[${ts}] ${JSON.stringify(entry)}`;
  });

  // Append to log file
  fs.appendFileSync(logPath, `${lines.join("\n")}\n`, "utf-8");

  // Trim if exceeds max size
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}

/**
 * Vite plugin to collect browser debug logs
 * - POST /__manus__/logs: Browser sends logs, written directly to files
 * - Files: browserConsole.log, networkRequests.log, sessionReplay.log
 * - Auto-trimmed when exceeding 1MB (keeps newest entries)
 */
function vitePluginManusDebugCollector(): Plugin {
  return {
    name: "manus-debug-collector",

    transformIndexHtml(html) {
      if (process.env.NODE_ENV === "production") {
        return html;
      }
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              src: "/__manus__/debug-collector.js",
              defer: true,
            },
            injectTo: "head",
          },
        ],
      };
    },

    configureServer(server: ViteDevServer) {
      // POST /__manus__/logs: Browser sends logs (written directly to files)
      server.middlewares.use("/__manus__/logs", (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }

        const handlePayload = (payload: any) => {
          // Write logs directly to files
          if (payload.consoleLogs?.length > 0) {
            writeToLogFile("browserConsole", payload.consoleLogs);
          }
          if (payload.networkRequests?.length > 0) {
            writeToLogFile("networkRequests", payload.networkRequests);
          }
          if (payload.sessionEvents?.length > 0) {
            writeToLogFile("sessionReplay", payload.sessionEvents);
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        };

        const reqBody = (req as { body?: unknown }).body;
        if (reqBody && typeof reqBody === "object") {
          try {
            handlePayload(reqBody);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
          return;
        }

        let body = "";
        req.on("data", chunk => {
          body += chunk.toString();
        });

        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            handlePayload(payload);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        });
      });
    },
  };
}

function vitePluginStripGoogleFonts(): Plugin {
  const googleFontLinkPattern =
    /^\s*<link[^>]*href=["']https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com)[^"']*["'][^>]*>\s*$/gm;

  return {
    name: "strip-google-font-links",

    transformIndexHtml(html) {
      return html.replace(googleFontLinkPattern, "");
    },
  };
}

function vitePluginTokenMetrics(
  contractAddress: string,
  buybackWalletAddress?: string
): Plugin {
  let cached:
    | {
        expiresAt: number;
        data: Awaited<ReturnType<typeof fetchTokenMetrics>>;
      }
    | undefined;

  return {
    name: "token-metrics-api",

    configureServer(server) {
      server.middlewares.use("/api/token-metrics", (req, res, next) => {
        if (req.method !== "GET") {
          return next();
        }

        void (async () => {
          try {
            if (!cached || cached.expiresAt <= Date.now()) {
              const data = await fetchTokenMetrics(
                contractAddress,
                undefined,
                buybackWalletAddress
              );
              cached = {
                data,
                expiresAt: Date.now() + TOKEN_METRICS_CACHE_TTL_MS,
              };
            }

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(cached.data));
          } catch (error) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                error:
                  error instanceof Error
                    ? error.message
                    : "Failed to fetch token metrics",
              })
            );
          }
        })();
      });
    },
  };
}

function vitePluginAdminSettingsApi(envFilePath: string): Plugin {
  const adminSessions = createSessionStore();

  function isAdminAuthenticated(req: {
    headers: { cookie?: string };
  }): boolean {
    const token = parseCookies(req.headers.cookie)[ADMIN_SESSION_COOKIE_NAME];
    if (!token) {
      return false;
    }
    return adminSessions.isValidSession(token);
  }

  return {
    name: "admin-settings-api",

    configureServer(server) {
      ensureTradeRecordsFile(TRADE_RECORDS_FILE_PATH);
      ensureReturnRecordsFile(RETURN_RECORDS_FILE_PATH);
      ensureAllocationRecordsFile(ALLOCATION_RECORDS_FILE_PATH);
      ensureExpenseRecordsFile(EXPENSE_RECORDS_FILE_PATH);
      ensureDonationRecordsFile(DONATION_RECORDS_FILE_PATH);

      server.middlewares.use((req, res, next) => {
        const pathname = req.url ? req.url.split("?")[0] : "";

        if (pathname === "/api/config" && req.method === "GET") {
          const settings = getPublicSettings(envFilePath);
          sendJson(res, 200, settings);
          return;
        }

        if (pathname === "/api/trades" && req.method === "GET") {
          const records = readTradeRecords(TRADE_RECORDS_FILE_PATH);
          sendJson(res, 200, records);
          return;
        }

        if (pathname === "/api/returns" && req.method === "GET") {
          const records = readReturnRecords(RETURN_RECORDS_FILE_PATH);
          sendJson(res, 200, records);
          return;
        }

        if (pathname === "/api/allocations" && req.method === "GET") {
          const records = readAllocationRecords(ALLOCATION_RECORDS_FILE_PATH);
          sendJson(res, 200, records);
          return;
        }

        if (pathname === "/api/expenses" && req.method === "GET") {
          const records = readExpenseRecords(EXPENSE_RECORDS_FILE_PATH);
          sendJson(res, 200, records);
          return;
        }

        if (pathname === "/api/donations" && req.method === "GET") {
          const records = readDonationRecords(DONATION_RECORDS_FILE_PATH);
          sendJson(res, 200, records);
          return;
        }

        if (pathname === "/api/total-assets" && req.method === "GET") {
          const records = readAllocationRecords(ALLOCATION_RECORDS_FILE_PATH);
          const total = records.reduce((sum, r) => sum + r.amount, 0);
          sendJson(res, 200, { total });
          return;
        }

        if (pathname === "/api/admin/login" && req.method === "POST") {
          void (async () => {
            try {
              const body = await readJsonBody(req);
              const username = String(body.username ?? "").trim();
              const password = String(body.password ?? "").trim();
              const credentials = getAdminCredentials(envFilePath);

              if (
                username !== credentials.username ||
                password !== credentials.password
              ) {
                clearSessionCookie(res);
                sendJson(res, 401, { error: "Invalid username or password" });
                return;
              }

              const sessionToken = adminSessions.createSession();
              setSessionCookie(res, sessionToken);
              sendJson(res, 200, { success: true });
            } catch {
              sendJson(res, 400, { error: "Invalid request body" });
            }
          })();
          return;
        }

        if (pathname === "/api/admin/logout" && req.method === "POST") {
          const token = parseCookies(req.headers.cookie)[
            ADMIN_SESSION_COOKIE_NAME
          ];
          if (token) {
            adminSessions.removeSession(token);
          }
          clearSessionCookie(res);
          sendJson(res, 200, { success: true });
          return;
        }

        if (pathname === "/api/admin/settings" && req.method === "GET") {
          if (!isAdminAuthenticated(req)) {
            sendJson(res, 401, { error: "Unauthorized" });
            return;
          }

          const settings = getPublicSettings(envFilePath);
          sendJson(res, 200, settings);
          return;
        }

        if (pathname === "/api/admin/settings" && req.method === "PUT") {
          if (!isAdminAuthenticated(req)) {
            sendJson(res, 401, { error: "Unauthorized" });
            return;
          }

          void (async () => {
            try {
              const body = await readJsonBody(req);
              const settings = updatePublicSettings(
                envFilePath,
                body as Parameters<typeof updatePublicSettings>[1]
              );
              sendJson(res, 200, settings);
            } catch {
              sendJson(res, 400, { error: "Invalid request body" });
            }
          })();
          return;
        }

        if (pathname === "/api/admin/trades" && req.method === "GET") {
          if (!isAdminAuthenticated(req)) {
            sendJson(res, 401, { error: "Unauthorized" });
            return;
          }

          const records = readTradeRecords(TRADE_RECORDS_FILE_PATH);
          sendJson(res, 200, records);
          return;
        }

        if (pathname === "/api/admin/trades" && req.method === "POST") {
          if (!isAdminAuthenticated(req)) {
            sendJson(res, 401, { error: "Unauthorized" });
            return;
          }

          void (async () => {
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
              sendJson(res, 200, records);
            } catch (error) {
              sendJson(res, 400, {
                error:
                  error instanceof Error
                    ? error.message
                    : "Invalid request body",
              });
            }
          })();
          return;
        }

        const tradeMatch = pathname.match(/^\/api\/admin\/trades\/([^/]+)$/);

        if (tradeMatch && req.method === "PUT") {
          if (!isAdminAuthenticated(req)) {
            sendJson(res, 401, { error: "Unauthorized" });
            return;
          }

          const tradeId = decodeURIComponent(tradeMatch[1]);

          void (async () => {
            try {
              const body = await readJsonBody(req);
              const pnlValue =
                typeof body.pnl === "number" || typeof body.pnl === "string"
                  ? body.pnl
                  : "";
              const records = updateTradeRecord(
                TRADE_RECORDS_FILE_PATH,
                tradeId,
                {
                  time: String(body.time ?? ""),
                  pair: String(body.pair ?? ""),
                  pnl: pnlValue,
                }
              );
              sendJson(res, 200, records);
            } catch (error) {
              sendJson(res, 400, {
                error:
                  error instanceof Error
                    ? error.message
                    : "Invalid request body",
              });
            }
          })();
          return;
        }

        if (tradeMatch && req.method === "DELETE") {
          if (!isAdminAuthenticated(req)) {
            sendJson(res, 401, { error: "Unauthorized" });
            return;
          }

          const tradeId = decodeURIComponent(tradeMatch[1]);

          try {
            const records = deleteTradeRecord(TRADE_RECORDS_FILE_PATH, tradeId);
            sendJson(res, 200, records);
          } catch (error) {
            sendJson(res, 400, {
              error:
                error instanceof Error ? error.message : "Invalid request body",
            });
          }
          return;
        }

        if (pathname === "/api/admin/returns" && req.method === "GET") {
          if (!isAdminAuthenticated(req)) {
            sendJson(res, 401, { error: "Unauthorized" });
            return;
          }

          const records = readReturnRecords(RETURN_RECORDS_FILE_PATH);
          sendJson(res, 200, records);
          return;
        }

        if (pathname === "/api/admin/returns" && req.method === "POST") {
          if (!isAdminAuthenticated(req)) {
            sendJson(res, 401, { error: "Unauthorized" });
            return;
          }

          void (async () => {
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
              sendJson(res, 200, records);
            } catch (error) {
              sendJson(res, 400, {
                error:
                  error instanceof Error
                    ? error.message
                    : "Invalid request body",
              });
            }
          })();
          return;
        }

        const returnMatch = pathname.match(/^\/api\/admin\/returns\/([^/]+)$/);

        if (returnMatch && req.method === "PUT") {
          if (!isAdminAuthenticated(req)) {
            sendJson(res, 401, { error: "Unauthorized" });
            return;
          }

          const returnId = decodeURIComponent(returnMatch[1]);

          void (async () => {
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
                returnId,
                {
                  time: String(body.time ?? ""),
                  endTime: String(body.endTime ?? ""),
                  returnRate: returnRateValue,
                  pnl: pnlValue,
                }
              );
              sendJson(res, 200, records);
            } catch (error) {
              sendJson(res, 400, {
                error:
                  error instanceof Error
                    ? error.message
                    : "Invalid request body",
              });
            }
          })();
          return;
        }

        if (returnMatch && req.method === "DELETE") {
          if (!isAdminAuthenticated(req)) {
            sendJson(res, 401, { error: "Unauthorized" });
            return;
          }

          const returnId = decodeURIComponent(returnMatch[1]);

          try {
            const records = deleteReturnRecord(
              RETURN_RECORDS_FILE_PATH,
              returnId
            );
            sendJson(res, 200, records);
          } catch (error) {
            sendJson(res, 400, {
              error:
                error instanceof Error ? error.message : "Invalid request body",
            });
          }
          return;
        }

        if (pathname === "/api/admin/allocations" && req.method === "GET") {
          if (!isAdminAuthenticated(req)) {
            sendJson(res, 401, { error: "Unauthorized" });
            return;
          }

          const records = readAllocationRecords(ALLOCATION_RECORDS_FILE_PATH);
          sendJson(res, 200, records);
          return;
        }

        if (pathname === "/api/admin/allocations" && req.method === "POST") {
          if (!isAdminAuthenticated(req)) {
            sendJson(res, 401, { error: "Unauthorized" });
            return;
          }

          void (async () => {
            try {
              const body = await readJsonBody(req);
              const amountValue =
                typeof body.amount === "number" ||
                typeof body.amount === "string"
                  ? body.amount
                  : "";
              const records = createAllocationRecord(
                ALLOCATION_RECORDS_FILE_PATH,
                {
                  contract: String(body.contract ?? ""),
                  amount: amountValue,
                }
              );
              sendJson(res, 200, records);
            } catch (error) {
              sendJson(res, 400, {
                error:
                  error instanceof Error
                    ? error.message
                    : "Invalid request body",
              });
            }
          })();
          return;
        }

        const allocationMatch = pathname.match(
          /^\/api\/admin\/allocations\/([^/]+)$/
        );

        if (allocationMatch && req.method === "PUT") {
          if (!isAdminAuthenticated(req)) {
            sendJson(res, 401, { error: "Unauthorized" });
            return;
          }

          const allocationId = decodeURIComponent(allocationMatch[1]);

          void (async () => {
            try {
              const body = await readJsonBody(req);
              const amountValue =
                typeof body.amount === "number" ||
                typeof body.amount === "string"
                  ? body.amount
                  : "";
              const records = updateAllocationRecord(
                ALLOCATION_RECORDS_FILE_PATH,
                allocationId,
                {
                  contract: String(body.contract ?? ""),
                  amount: amountValue,
                }
              );
              sendJson(res, 200, records);
            } catch (error) {
              sendJson(res, 400, {
                error:
                  error instanceof Error
                    ? error.message
                    : "Invalid request body",
              });
            }
          })();
          return;
        }

        if (allocationMatch && req.method === "DELETE") {
          if (!isAdminAuthenticated(req)) {
            sendJson(res, 401, { error: "Unauthorized" });
            return;
          }

          const allocationId = decodeURIComponent(allocationMatch[1]);

          try {
            const records = deleteAllocationRecord(
              ALLOCATION_RECORDS_FILE_PATH,
              allocationId
            );
            sendJson(res, 200, records);
          } catch (error) {
            sendJson(res, 400, {
              error:
                error instanceof Error ? error.message : "Invalid request body",
            });
          }
          return;
        }

        if (pathname === "/api/admin/expenses" && req.method === "GET") {
          if (!isAdminAuthenticated(req)) {
            sendJson(res, 401, { error: "Unauthorized" });
            return;
          }

          const records = readExpenseRecords(EXPENSE_RECORDS_FILE_PATH);
          sendJson(res, 200, records);
          return;
        }

        if (pathname === "/api/admin/expenses" && req.method === "POST") {
          if (!isAdminAuthenticated(req)) {
            sendJson(res, 401, { error: "Unauthorized" });
            return;
          }

          void (async () => {
            try {
              const body = await readJsonBody(req);
              const amountValue =
                typeof body.amount === "number" ||
                typeof body.amount === "string"
                  ? body.amount
                  : "";
              const records = createExpenseRecord(EXPENSE_RECORDS_FILE_PATH, {
                time: String(body.time ?? ""),
                category: String(body.category ?? ""),
                amount: amountValue,
              });
              sendJson(res, 200, records);
            } catch (error) {
              sendJson(res, 400, {
                error:
                  error instanceof Error
                    ? error.message
                    : "Invalid request body",
              });
            }
          })();
          return;
        }

        const expenseMatch = pathname.match(
          /^\/api\/admin\/expenses\/([^/]+)$/
        );

        if (expenseMatch && req.method === "PUT") {
          if (!isAdminAuthenticated(req)) {
            sendJson(res, 401, { error: "Unauthorized" });
            return;
          }

          const expenseId = decodeURIComponent(expenseMatch[1]);

          void (async () => {
            try {
              const body = await readJsonBody(req);
              const amountValue =
                typeof body.amount === "number" ||
                typeof body.amount === "string"
                  ? body.amount
                  : "";
              const records = updateExpenseRecord(
                EXPENSE_RECORDS_FILE_PATH,
                expenseId,
                {
                  time: String(body.time ?? ""),
                  category: String(body.category ?? ""),
                  amount: amountValue,
                }
              );
              sendJson(res, 200, records);
            } catch (error) {
              sendJson(res, 400, {
                error:
                  error instanceof Error
                    ? error.message
                    : "Invalid request body",
              });
            }
          })();
          return;
        }

        if (expenseMatch && req.method === "DELETE") {
          if (!isAdminAuthenticated(req)) {
            sendJson(res, 401, { error: "Unauthorized" });
            return;
          }

          const expenseId = decodeURIComponent(expenseMatch[1]);

          try {
            const records = deleteExpenseRecord(
              EXPENSE_RECORDS_FILE_PATH,
              expenseId
            );
            sendJson(res, 200, records);
          } catch (error) {
            sendJson(res, 400, {
              error:
                error instanceof Error ? error.message : "Invalid request body",
            });
          }
          return;
        }

        if (pathname === "/api/admin/donations" && req.method === "GET") {
          if (!isAdminAuthenticated(req)) {
            sendJson(res, 401, { error: "Unauthorized" });
            return;
          }

          const records = readDonationRecords(DONATION_RECORDS_FILE_PATH);
          sendJson(res, 200, records);
          return;
        }

        if (pathname === "/api/admin/donations" && req.method === "POST") {
          if (!isAdminAuthenticated(req)) {
            sendJson(res, 401, { error: "Unauthorized" });
            return;
          }

          void (async () => {
            try {
              const body = await readJsonBody(req);
              const amountValue =
                typeof body.amount === "number" ||
                typeof body.amount === "string"
                  ? body.amount
                  : "";
              const records = createDonationRecord(DONATION_RECORDS_FILE_PATH, {
                time: String(body.time ?? ""),
                amount: amountValue,
              });
              sendJson(res, 200, records);
            } catch (error) {
              sendJson(res, 400, {
                error:
                  error instanceof Error
                    ? error.message
                    : "Invalid request body",
              });
            }
          })();
          return;
        }

        const donationMatch = pathname.match(
          /^\/api\/admin\/donations\/([^/]+)$/
        );

        if (donationMatch && req.method === "PUT") {
          if (!isAdminAuthenticated(req)) {
            sendJson(res, 401, { error: "Unauthorized" });
            return;
          }

          const donationId = decodeURIComponent(donationMatch[1]);

          void (async () => {
            try {
              const body = await readJsonBody(req);
              const amountValue =
                typeof body.amount === "number" ||
                typeof body.amount === "string"
                  ? body.amount
                  : "";
              const records = updateDonationRecord(
                DONATION_RECORDS_FILE_PATH,
                donationId,
                {
                  time: String(body.time ?? ""),
                  amount: amountValue,
                }
              );
              sendJson(res, 200, records);
            } catch (error) {
              sendJson(res, 400, {
                error:
                  error instanceof Error
                    ? error.message
                    : "Invalid request body",
              });
            }
          })();
          return;
        }

        if (donationMatch && req.method === "DELETE") {
          if (!isAdminAuthenticated(req)) {
            sendJson(res, 401, { error: "Unauthorized" });
            return;
          }

          const donationId = decodeURIComponent(donationMatch[1]);

          try {
            const records = deleteDonationRecord(
              DONATION_RECORDS_FILE_PATH,
              donationId
            );
            sendJson(res, 200, records);
          } catch (error) {
            sendJson(res, 400, {
              error:
                error instanceof Error ? error.message : "Invalid request body",
            });
          }
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, "");

  const tokenContractAddress =
    env.TOKEN_CONTRACT_ADDRESS ||
    env.VITE_TOKEN_CONTRACT_ADDRESS ||
    DEFAULT_CONTRACT_ADDRESS;

  const buybackWalletAddress =
    env.BUYBACK_WALLET_ADDRESS || env.VITE_BUYBACK_WALLET_ADDRESS;

  const plugins = [
    vitePluginStripGoogleFonts(),
    react(),
    tailwindcss(),
    jsxLocPlugin(),
    vitePluginManusRuntime(),
    vitePluginAdminSettingsApi(ENV_FILE_PATH),
    vitePluginTokenMetrics(tokenContractAddress, buybackWalletAddress),
    vitePluginManusDebugCollector(),
  ];

  return {
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },
    envDir: path.resolve(import.meta.dirname),
    root: path.resolve(import.meta.dirname, "client"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      port: 3000,
      strictPort: false, // Will find next available port if 3000 is busy
      host: true,
      allowedHosts: [
        ".manuspre.computer",
        ".manus.computer",
        ".manus-asia.computer",
        ".manuscomputer.ai",
        ".manusvm.computer",
        "web.gmaigc.cn",
        "localhost",
        "127.0.0.1",
      ],
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  };
});
