/**
 * BuybackTab - 回购页面
 * 展示回购销毁数据和历史记录
 */
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import DataCard from "../DataCard";
import { overviewData } from "@/lib/data";
import { useBurnRecords } from "@/hooks/useBurnRecords";
import { Flame, CheckCircle2 } from "lucide-react";

interface TokenMetricsResponse {
  burnedTotal?: string;
}

const TOKEN_METRICS_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

function shortenHash(hash: string): string {
  if (hash.length <= 16) {
    return hash;
  }

  return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
}

export default function BuybackTab() {
  const [totalBurned, setTotalBurned] = useState(overviewData.destroyed);
  const {
    records: burnRecords,
    loading: burnRecordsLoading,
    error: burnRecordsError,
  } = useBurnRecords();
  const latestBurnRecord = burnRecords[0];

  const burnCountValue =
    burnRecordsLoading && burnRecords.length === 0
      ? "加载中..."
      : burnRecords.length.toLocaleString();

  const latestBuybackTimeValue = latestBurnRecord
    ? latestBurnRecord.time
    : burnRecordsLoading
      ? "加载中..."
      : "--";

  const latestBuybackAmountValue = latestBurnRecord
    ? `${latestBurnRecord.burnAmount} 枚`
    : burnRecordsLoading
      ? "加载中..."
      : "--";

  useEffect(() => {
    let isDisposed = false;
    let intervalId: number | undefined;

    async function loadBurnedTotal() {
      try {
        const response = await fetch("/api/token-metrics");
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as TokenMetricsResponse;

        if (isDisposed) {
          return;
        }

        const nextValue = payload.burnedTotal?.trim();
        if (nextValue) {
          setTotalBurned(nextValue);
        }
      } catch {
        // Keep fallback value when request fails.
      }
    }

    void loadBurnedTotal();

    intervalId = window.setInterval(() => {
      void loadBurnedTotal();
    }, TOKEN_METRICS_REFRESH_INTERVAL_MS);

    return () => {
      isDisposed = true;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* 回购概览 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DataCard
          label="累计回购销毁"
          value={totalBurned}
          icon="Flame"
          color="red"
          delay={0}
        />
        <DataCard
          label="燃烧次数"
          value={burnCountValue}
          icon="RefreshCw"
          color="amber"
          delay={0.05}
        />
        <DataCard
          label="最近回购时间"
          value={latestBuybackTimeValue}
          icon="Activity"
          color="blue"
          delay={0.1}
        />
        <DataCard
          label="最近回购金额"
          value={latestBuybackAmountValue}
          icon="Coins"
          color="emerald"
          delay={0.15}
        />
      </div>

      {/* 回购记录 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="glass-card overflow-hidden"
      >
        <div className="p-5 border-b border-white/[0.06]">
          <h3 className="text-base font-semibold text-foreground">
            回购销毁记录
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            自动回购并销毁 $奇点量化 代币
          </p>
          {burnRecordsError && (
            <p className="text-xs text-rose-300 mt-2">{burnRecordsError}</p>
          )}
        </div>

        <div className="divide-y divide-white/[0.04]">
          {burnRecordsLoading && burnRecords.length === 0 ? (
            <div className="p-5 text-sm text-muted-foreground">
              正在加载回购销毁记录...
            </div>
          ) : burnRecords.length === 0 ? (
            <div className="p-5 text-sm text-muted-foreground">
              暂无回购销毁记录
            </div>
          ) : (
            burnRecords.map((record, index) => (
              <motion.div
                key={record.txHash}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.3,
                  delay: 0.25 + Math.min(index, 8) * 0.03,
                }}
                className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                    <Flame className="w-4 h-4 text-rose-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {record.burnAmount} 枚 $奇点量化
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {record.time}
                    </p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-2">
                  <div>
                    <a
                      href={`https://bscscan.com/tx/${record.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {shortenHash(record.txHash)}
                    </a>
                    <p className="text-[11px] text-muted-foreground/80">
                      区块 {record.blockNumber.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    <CheckCircle2 className="w-3 h-3" />
                    已销毁
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
