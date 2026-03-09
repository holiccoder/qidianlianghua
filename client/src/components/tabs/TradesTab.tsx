/**
 * TradesTab - 交易记录页面
 * 展示AI自动交易的历史记录表格
 */
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { tradeRecords } from "@/lib/data";

interface TradeRecordRow {
  id: string;
  time: string;
  pair: string;
  pnl: number;
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

  return 0;
}

function toTimestamp(time: string): number {
  const parsed = new Date(time.replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function normalizeTradeRows(payload: unknown): TradeRecordRow[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const raw = item as {
        id?: unknown;
        time?: unknown;
        pair?: unknown;
        pnl?: unknown;
      };

      if (typeof raw.time !== "string" || typeof raw.pair !== "string") {
        return null;
      }

      const pair = raw.pair.trim();
      if (!pair) {
        return null;
      }

      return {
        id: String(raw.id ?? `trade-${index}`),
        time: raw.time,
        pair,
        pnl: parsePnl(raw.pnl),
      };
    })
    .filter((item): item is TradeRecordRow => Boolean(item))
    .sort((a, b) => toTimestamp(b.time) - toTimestamp(a.time));
}

function formatPnl(value: number): string {
  const absValue = Math.abs(value);
  const formatted = absValue.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${value >= 0 ? "+" : "-"}$${formatted}`;
}

const fallbackRecords = normalizeTradeRows(
  tradeRecords.map(record => ({
    id: record.id,
    time: record.time,
    pair: record.pair,
    pnl: record.pnl,
  }))
);

export default function TradesTab() {
  const [records, setRecords] = useState<TradeRecordRow[]>(fallbackRecords);

  useEffect(() => {
    let isDisposed = false;

    async function loadTrades() {
      try {
        const response = await fetch("/api/trades");
        if (!response.ok) {
          return;
        }

        const payload = await response.json();

        if (isDisposed) {
          return;
        }

        const nextRecords = normalizeTradeRows(payload);
        if (nextRecords.length > 0) {
          setRecords(nextRecords);
        }
      } catch {
        // Keep fallback records when request fails.
      }
    }

    void loadTrades();

    return () => {
      isDisposed = true;
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      <div className="glass-card overflow-hidden">
        <div className="p-5 border-b border-white/[0.06] flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              AI 自动交易记录
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              AI 策略执行的合约交易记录
            </p>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-[#38bdf8] whitespace-nowrap">
            总交易次数：{records.length.toLocaleString("zh-CN")}
          </p>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">
                  时间
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">
                  交易对
                </th>
                <th className="text-right text-xs font-medium text-muted-foreground px-5 py-3">
                  盈亏
                </th>
              </tr>
            </thead>
            <tbody>
              {records.map((record, index) => {
                const isProfit = record.pnl >= 0;
                return (
                  <motion.tr
                    key={record.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-5 py-3.5 text-xs text-muted-foreground font-mono">
                      {record.time}
                    </td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-foreground">
                      {record.pair}
                    </td>
                    <td
                      className={`px-5 py-3.5 text-right text-sm font-mono font-semibold ${
                        isProfit ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {formatPnl(record.pnl)}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-white/[0.06]">
          {records.map((record, index) => {
            const isProfit = record.pnl >= 0;
            return (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">
                    {record.pair}
                  </span>
                  <span
                    className={`text-sm font-mono font-semibold ${isProfit ? "text-emerald-400" : "text-rose-400"}`}
                  >
                    {formatPnl(record.pnl)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  <span className="font-mono">{record.time}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
