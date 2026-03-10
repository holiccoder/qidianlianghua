/**
 * OverviewTab - 统筹页面
 * 展示核心数据卡片：价格、市值、销毁、回购、资产、收益、带单等
 */
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import DataCard from "../DataCard";
import { overviewData } from "@/lib/data";

export default function OverviewTab() {
  const [totalAssets, setTotalAssets] = useState<string>("$0");

  useEffect(() => {
    async function loadTotalAssets() {
      try {
        const response = await fetch("/api/total-assets");
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        setTotalAssets(`$${data.total.toLocaleString()}`);
      } catch {
        // ignore error
      }
    }

    void loadTotalAssets();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* 第一行：核心价格数据 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DataCard
          label="当前价格"
          value={overviewData.currentPrice}
          subtitle="基准价格"
          icon="DollarSign"
          color="emerald"
          delay={0}
        />
        <DataCard
          label="市值"
          value={overviewData.marketCap}
          subtitle="流通市值"
          icon="BarChart3"
          color="amber"
          delay={0.05}
        />
        <DataCard
          label="已销毁"
          value={overviewData.destroyed}
          subtitle="总发行10亿枚"
          icon="Flame"
          color="red"
          delay={0.1}
        />
        <DataCard
          label="回购钱包余额"
          value={overviewData.buybackWalletBalance}
          subtitle="有序回购"
          icon="Wallet"
          color="blue"
          delay={0.15}
        />
      </div>

      {/* 第二行：资产与收益 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <DataCard
          label="总资产"
          value={totalAssets}
          subtitle="包含所有钱包余额"
          icon="Coins"
          color="amber"
          delay={0.2}
        />
        <DataCard
          label="周涨幅"
          value={overviewData.weeklyGain}
          subtitle="过去7天收益表现"
          icon="TrendingUp"
          color="emerald"
          delay={0.25}
        />
        <DataCard
          label="收益率"
          value={overviewData.returnRate}
          subtitle="累计收益率"
          icon="Activity"
          color="blue"
          delay={0.3}
        />
      </div>

      {/* 第三行：币安带单数据 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DataCard
          label="币安带单保证金"
          value={overviewData.binanceMargin}
          subtitle="合约交易保证金"
          icon="Shield"
          color="amber"
          delay={0.35}
        />
        <DataCard
          label="跟单人数"
          value={overviewData.followers.toLocaleString()}
          subtitle="币安广场跟单"
          icon="Users"
          color="blue"
          delay={0.4}
        />
        <DataCard
          label="资产管理规模"
          value={overviewData.aum}
          subtitle="AUM (Assets Under Management)"
          icon="PieChart"
          color="purple"
          delay={0.45}
        />
        <DataCard
          label="周收益率"
          value={overviewData.weeklyReturn}
          subtitle="带单周收益率"
          icon="TrendingUp"
          color="emerald"
          delay={0.5}
        />
      </div>

      {/* 第四行：捐款 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DataCard
          label="捐款总金额"
          value={overviewData.donationTotal}
          subtitle={`捐助给${overviewData.donationTarget}`}
          icon="Heart"
          color="red"
          delay={0.55}
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="glass-card p-5 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              className="text-emerald-400"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M8 12l3 3 5-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">运行状态</p>
            <p className="text-xs text-emerald-400 mt-0.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
              AI 策略正常运行中
            </p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
