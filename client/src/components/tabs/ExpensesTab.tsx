/**
 * ExpensesTab - 开支页面
 * 展示社区开支
 */
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import DataCard from "../DataCard";
import { expenseData } from "@/lib/data";

interface ExpenseRecord {
  id: string;
  time: string;
  category: string;
  amount: number;
}

interface PublicSettingsResponse {
  weeklyExpense?: string;
}

function normalizeExpenseRecords(payload: unknown): ExpenseRecord[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map(item => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const raw = item as {
        id?: unknown;
        time?: unknown;
        category?: unknown;
        amount?: unknown;
      };

      if (typeof raw.time !== "string" || typeof raw.category !== "string") {
        return null;
      }

      const amount = Number(raw.amount);
      if (!Number.isFinite(amount)) {
        return null;
      }

      return {
        id: String(raw.id ?? ""),
        time: raw.time,
        category: raw.category,
        amount,
      };
    })
    .filter((item): item is ExpenseRecord => Boolean(item));
}

export default function ExpensesTab() {
  const [records, setRecords] = useState<ExpenseRecord[]>([]);
  const [weeklyExpense, setWeeklyExpense] = useState(expenseData.totalExpense);

  useEffect(() => {
    async function loadExpenses() {
      try {
        const response = await fetch("/api/expenses");
        if (!response.ok) {
          return;
        }

        const payload = await response.json();
        const nextRecords = normalizeExpenseRecords(payload);

        if (nextRecords.length > 0) {
          setRecords(nextRecords);
        }
      } catch {
        // ignore error
      }
    }

    async function loadExpenseConfig() {
      try {
        const response = await fetch("/api/config");
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as PublicSettingsResponse;
        const nextWeeklyExpense = payload.weeklyExpense?.trim();

        if (nextWeeklyExpense) {
          setWeeklyExpense(nextWeeklyExpense);
        }
      } catch {
        // ignore error
      }
    }

    void loadExpenses();
    void loadExpenseConfig();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* 总开支 */}
      <DataCard
        label="本周总开支"
        value={weeklyExpense}
        icon="Receipt"
        color="amber"
        delay={0}
      />

      {/* 开支记录表格 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="glass-card overflow-hidden"
      >
        <div className="p-4 border-b border-white/[0.06]">
          <h3 className="text-sm font-semibold text-foreground">开支记录</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-muted-foreground">
                <th className="text-left font-medium px-4 py-2.5">时间</th>
                <th className="text-left font-medium px-4 py-2.5">开支分类</th>
                <th className="text-right font-medium px-4 py-2.5">金额</th>
              </tr>
            </thead>
            <tbody>
              {records.map(record => (
                <tr key={record.id} className="border-b border-white/[0.04]">
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                    {record.time}
                  </td>
                  <td className="px-4 py-2.5 text-foreground">
                    {record.category}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-rose-400">
                    ${record.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
