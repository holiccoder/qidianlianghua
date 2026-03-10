/**
 * ReturnsTab - 收益率页面
 * 展示收益率统计
 */
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import DataCard from "../DataCard";
import { returnData } from "@/lib/data";

interface ReturnRecordRow {
  id: string;
  time: string;
  returnRate: number;
  pnl: number;
}

interface PublicSettingsResponse {
  weeklyReturn?: string;
  monthlyReturn?: string;
  totalReturn?: string;
  winRate?: string;
  maxDrawdown?: string;
}

function toTimestamp(time: string): number {
  const parsed = new Date(time.replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
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

  return 0;
}

function normalizeReturnRows(payload: unknown): ReturnRecordRow[] {
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
        returnRate?: unknown;
        pnl?: unknown;
      };

      if (typeof raw.time !== "string") {
        return null;
      }

      return {
        id: String(raw.id ?? `return-${index}`),
        time: raw.time,
        returnRate: parseDecimal(raw.returnRate),
        pnl: parseDecimal(raw.pnl),
      };
    })
    .filter((item): item is ReturnRecordRow => Boolean(item))
    .sort((a, b) => toTimestamp(b.time) - toTimestamp(a.time));
}

function formatSignedDecimal(
  value: number,
  maxDigits = 4,
  minDigits = 0
): string {
  const absValue = Math.abs(value);
  const formatted = absValue.toLocaleString("en-US", {
    minimumFractionDigits: minDigits,
    maximumFractionDigits: maxDigits,
  });
  return `${value >= 0 ? "+" : "-"}${formatted}`;
}

function formatSignedPercent(value: number, maxDigits = 4): string {
  return `${formatSignedDecimal(value, maxDigits)}%`;
}

function formatSignedDollar(value: number, maxDigits = 4): string {
  const absValue = Math.abs(value);
  const formatted = absValue.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDigits,
  });
  return `${value >= 0 ? "+$" : "-$"}${formatted}`;
}

export default function ReturnsTab() {
  const [records, setRecords] = useState<ReturnRecordRow[]>([]);
  const [metrics, setMetrics] = useState(() => ({
    weekly: returnData.weekly,
    monthly: returnData.monthly,
    total: returnData.total,
    winRate: returnData.winRate,
    maxDrawdown: returnData.maxDrawdown,
  }));
  const totalPnl = records.reduce((sum, record) => sum + record.pnl, 0);

  useEffect(() => {
    let isDisposed = false;

    async function loadReturnRecords() {
      try {
        const response = await fetch("/api/returns");
        if (!response.ok) {
          return;
        }

        const payload = await response.json();

        if (isDisposed) {
          return;
        }

        setRecords(normalizeReturnRows(payload));
      } catch {
        // Keep empty records when request fails.
      }
    }

    async function loadPublicSettings() {
      try {
        const response = await fetch("/api/config");
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as PublicSettingsResponse;

        if (isDisposed) {
          return;
        }

        setMetrics(previous => ({
          weekly: payload.weeklyReturn?.trim() || previous.weekly,
          monthly: payload.monthlyReturn?.trim() || previous.monthly,
          total: payload.totalReturn?.trim() || previous.total,
          winRate: payload.winRate?.trim() || previous.winRate,
          maxDrawdown: payload.maxDrawdown?.trim() || previous.maxDrawdown,
        }));
      } catch {
        // Keep fallback card metrics when request fails.
      }
    }

    void loadReturnRecords();
    void loadPublicSettings();

    return () => {
      isDisposed = true;
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* 收益率指标 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <DataCard
          label="周收益率"
          value={metrics.weekly}
          icon="TrendingUp"
          color="emerald"
          delay={0}
        />
        <DataCard
          label="月收益率"
          value={metrics.monthly}
          icon="TrendingUp"
          color="amber"
          delay={0.05}
        />
        <DataCard
          label="累计收益率"
          value={metrics.total}
          icon="TrendingUp"
          color="blue"
          delay={0.1}
        />
      </div>

      {/* 风控指标 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <DataCard
          label="胜率"
          value={metrics.winRate}
          icon="Activity"
          color="emerald"
          delay={0.15}
        />
        <DataCard
          label="最大回撤"
          value={metrics.maxDrawdown}
          icon="TrendingDown"
          color="red"
          delay={0.2}
        />
        <DataCard
          label="总收益"
          value={formatSignedDollar(totalPnl, 4)}
          icon="RefreshCw"
          color="emerald"
          delay={0.25}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="glass-card overflow-hidden"
      >
        <div className="p-4 border-b border-white/[0.06]">
          <h3 className="text-sm font-semibold text-foreground">收益率记录</h3>
          <p className="text-xs text-muted-foreground mt-1">每周统计一次</p>
        </div>

        {records.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            暂无收益率记录
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-muted-foreground">
                  <th className="text-left font-medium px-4 py-2.5">时间</th>
                  <th className="text-right font-medium px-4 py-2.5">收益率</th>
                  <th className="text-right font-medium px-4 py-2.5">盈亏</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record, index) => (
                  <motion.tr
                    key={record.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: index * 0.03 }}
                    className="border-b border-white/[0.04]"
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                      {record.time}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right font-mono ${
                        record.returnRate >= 0
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }`}
                    >
                      {formatSignedPercent(record.returnRate, 4)}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right font-mono ${
                        record.pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {formatSignedDollar(record.pnl, 4)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
