/**
 * AllocationTab - 资产配置页面
 * 展示资产分配饼图和详细列表
 */
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import DataCard from "../DataCard";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface AllocationRow {
  id: string;
  contract: string;
  amount: number;
}

const PIE_COLORS = [
  "#f59e0b",
  "#38bdf8",
  "#10b981",
  "#a78bfa",
  "#f43f5e",
  "#6b7280",
  "#22d3ee",
  "#fb7185",
];

const fallbackRows: AllocationRow[] = [
  { id: "1", contract: "BTC合约", amount: 31325 },
  { id: "2", contract: "ETH合约", amount: 22375 },
  { id: "3", contract: "BNB现货", amount: 13425 },
  { id: "4", contract: "SOL合约", amount: 8950 },
  { id: "5", contract: "其他代币", amount: 7160 },
  { id: "6", contract: "USDT储备", amount: 6265 },
];

function normalizeRows(payload: unknown): AllocationRow[] {
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
        contract?: unknown;
        amount?: unknown;
      };

      if (typeof raw.contract !== "string") {
        return null;
      }

      const contract = raw.contract.trim();
      const amount = Number(raw.amount);

      if (!contract || !Number.isFinite(amount)) {
        return null;
      }

      return {
        id: String(raw.id ?? `allocation-${index}`),
        contract,
        amount,
      };
    })
    .filter((item): item is AllocationRow => Boolean(item));
}

function formatAmount(value: number): string {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export default function AllocationTab() {
  const [rows, setRows] = useState<AllocationRow[]>(fallbackRows);

  useEffect(() => {
    let isDisposed = false;

    async function loadAllocations() {
      try {
        const response = await fetch("/api/allocations");
        if (!response.ok) {
          return;
        }

        const payload = await response.json();
        const nextRows = normalizeRows(payload);

        if (isDisposed || nextRows.length === 0) {
          return;
        }

        setRows(nextRows);
      } catch {
        // Keep fallback rows when request fails.
      }
    }

    void loadAllocations();

    return () => {
      isDisposed = true;
    };
  }, []);

  const totalAmount = useMemo(
    () => rows.reduce((sum, row) => sum + row.amount, 0),
    [rows]
  );

  const pieData = useMemo(() => {
    return rows.map((row, index) => ({
      ...row,
      color: PIE_COLORS[index % PIE_COLORS.length],
      percent: totalAmount > 0 ? (row.amount / totalAmount) * 100 : 0,
    }));
  }, [rows, totalAmount]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* 总资产 */}
      <DataCard
        label="总资产"
        value={formatAmount(totalAmount)}
        icon="PieChart"
        color="blue"
        delay={0}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 饼图 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass-card p-5"
        >
          <h3 className="text-base font-semibold text-foreground mb-4">
            资产分布
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="amount"
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke="transparent"
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(17, 25, 40, 0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                  formatter={(
                    value: number,
                    _name,
                    payload?: { payload?: { percent?: number } }
                  ) => {
                    const percent = payload?.payload?.percent ?? 0;
                    return [
                      `${formatAmount(value)} (${percent.toFixed(2)}%)`,
                      "资产量",
                    ];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* 详细列表 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="glass-card p-5"
        >
          <h3 className="text-base font-semibold text-foreground mb-4">
            配置详情
          </h3>
          <div className="space-y-4">
            {pieData.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.25 + index * 0.05 }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-foreground">
                    {item.contract}
                  </span>
                </div>
                <span className="text-sm font-mono font-semibold text-foreground">
                  {formatAmount(item.amount)}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
