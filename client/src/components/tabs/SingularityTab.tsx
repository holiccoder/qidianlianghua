/**
 * SingularityTab - 奇点页面
 * 布局顺序：
 * 1. 社区介绍卡片（虾交易 AI自动交易实验室）
 * 2. 税收分配 + 合约收益分配结构
 * 3. 核心数据卡片
 * 4. 社区重点
 * 5. 钱包地址与余额
 */
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import DataCard from "../DataCard";
import {
  overviewData,
  taxDistribution,
  profitDistribution,
  communityHighlights,
  walletAddresses,
  walletBnbBalances,
  updateDestroyedFallback,
} from "@/lib/data";
import { Copy, RefreshCw, Eye, Bot, Shield } from "lucide-react";
import { toast } from "sonner";

const AI_VISUAL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663413222422/G6FQYjMMYEtsL9NvKBY9Ao/ai-trading-visual-kHfKNG2HsRTHaWjPvXrjDP.webp";

const highlightIcons: Record<string, React.ElementType> = {
  RefreshCw,
  Eye,
  Bot,
  Shield,
};

interface TokenMetricsResponse {
  currentPriceUsd?: string;
  marketCapUsd?: string;
  burnedTotal?: string;
  taxWalletBalance?: string;
  buybackWalletBalance?: string;
  buybackBurnWalletBalance?: string;
}

interface PublicSettingsResponse {
  taxWalletAddress?: string;
  buybackWalletAddress?: string;
  buybackBurnWalletAddress?: string;
  totalAssets?: string;
  weeklyGain?: string;
  returnRate?: string;
  binanceMargin?: string;
  followers?: string;
  aum?: string;
  weeklyReturn?: string;
  donationTotal?: string;
  donationTarget?: string;
}

const TOKEN_METRICS_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
  toast.success("已复制到剪贴板");
}

function WalletRow({
  label,
  middleValue,
  index,
  endValue,
  copyValue,
}: {
  label: string;
  middleValue: string;
  index: number;
  endValue: string;
  copyValue?: string;
}) {
  const valueToCopy = copyValue || middleValue || endValue;

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2 py-3 border-b border-white/[0.04] last:border-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10 px-1.5 text-[10px] font-mono text-emerald-300">
          {String(index).padStart(2, "0")}
        </span>
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {label}
        </span>
      </div>

      <span className="px-2 text-xs sm:text-sm font-mono text-foreground text-left break-all leading-5 tracking-[0.03em]">
        {middleValue}
      </span>

      <span className="text-lg font-mono font-semibold text-amber-300 whitespace-nowrap">
        {endValue}
      </span>

      <button
        onClick={() => copyToClipboard(valueToCopy)}
        className="p-1 rounded hover:bg-white/[0.06] text-muted-foreground hover:text-foreground transition-colors"
      >
        <Copy className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function DistributionBar({
  items,
}: {
  items: { label: string; percentage: number; color: string }[];
}) {
  return (
    <div className="space-y-3">
      <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
        {items.map((item, i) => (
          <motion.div
            key={i}
            initial={{ width: 0 }}
            animate={{ width: `${item.percentage}%` }}
            transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ backgroundColor: item.color }}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-muted-foreground">
              {item.percentage}%
            </span>
            <span className="text-xs text-foreground truncate">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SingularityTab() {
  const [liveOverview, setLiveOverview] = useState(() => ({
    currentPrice: overviewData.currentPrice,
    marketCap: overviewData.marketCap,
    destroyed: overviewData.destroyed,
    taxWalletBalance: walletBnbBalances.taxWallet,
    buybackWalletBalance: overviewData.buybackWalletBalance,
    buybackBurnWalletBalance: walletBnbBalances.buybackBurnWallet,
    taxWalletAddress: walletAddresses.taxWallet,
    buybackWalletAddress: walletAddresses.buybackWallet,
    buybackBurnWalletAddress: walletAddresses.buybackBurnWallet,
    totalAssets: overviewData.totalAssets,
    weeklyGain: overviewData.weeklyGain,
    returnRate: overviewData.returnRate,
    binanceMargin: overviewData.binanceMargin,
    followers: overviewData.followers,
    aum: overviewData.aum,
    weeklyReturn: overviewData.weeklyReturn,
    donationTotal: overviewData.donationTotal,
    donationTarget: overviewData.donationTarget,
  }));

  useEffect(() => {
    let isDisposed = false;
    let intervalId: number | undefined;

    async function loadTokenMetrics() {
      try {
        const response = await fetch("/api/token-metrics");

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as TokenMetricsResponse;

        if (isDisposed) {
          return;
        }

        const latestBurnedTotal = payload.burnedTotal?.trim();

        if (latestBurnedTotal) {
          updateDestroyedFallback(latestBurnedTotal);
        }

        setLiveOverview(previous => ({
          ...previous,
          currentPrice: payload.currentPriceUsd || previous.currentPrice,
          marketCap: payload.marketCapUsd || previous.marketCap,
          destroyed: latestBurnedTotal || previous.destroyed,
          taxWalletBalance:
            payload.taxWalletBalance || previous.taxWalletBalance,
          buybackWalletBalance:
            payload.buybackWalletBalance || previous.buybackWalletBalance,
          buybackBurnWalletBalance:
            payload.buybackBurnWalletBalance ||
            previous.buybackBurnWalletBalance,
        }));
      } catch {
        // Keep fallback values when request fails.
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

        const parsedFollowers = Number(
          String(payload.followers ?? "").replaceAll(",", "")
        );

        setLiveOverview(previous => ({
          ...previous,
          taxWalletAddress:
            payload.taxWalletAddress?.trim() || previous.taxWalletAddress,
          buybackWalletAddress:
            payload.buybackWalletAddress?.trim() ||
            previous.buybackWalletAddress,
          buybackBurnWalletAddress:
            payload.buybackBurnWalletAddress?.trim() ||
            previous.buybackBurnWalletAddress,
          weeklyGain: payload.weeklyGain?.trim() || previous.weeklyGain,
          returnRate: payload.returnRate?.trim() || previous.returnRate,
          binanceMargin:
            payload.binanceMargin?.trim() || previous.binanceMargin,
          aum: payload.aum?.trim() || previous.aum,
          followers: Number.isFinite(parsedFollowers)
            ? parsedFollowers
            : previous.followers,
          weeklyReturn: payload.weeklyReturn?.trim() || previous.weeklyReturn,
          donationTotal:
            payload.donationTotal?.trim() || previous.donationTotal,
          donationTarget:
            payload.donationTarget?.trim() || previous.donationTarget,
        }));
      } catch {
        // Keep fallback values when request fails.
      }
    }

    async function loadTotalAssets() {
      try {
        const response = await fetch("/api/total-assets");

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (isDisposed) {
          return;
        }

        setLiveOverview(previous => ({
          ...previous,
          totalAssets: `$${data.total.toLocaleString()}`,
        }));
      } catch {
        // Keep fallback values when request fails.
      }
    }

    void loadTokenMetrics();
    void loadPublicSettings();
    void loadTotalAssets();

    intervalId = window.setInterval(() => {
      void loadTokenMetrics();
      void loadPublicSettings();
    }, TOKEN_METRICS_REFRESH_INTERVAL_MS);

    return () => {
      isDisposed = true;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  const walletRows = [
    {
      label: "税收钱包地址",
      middleValue: liveOverview.taxWalletAddress,
      endValue: liveOverview.taxWalletBalance,
      copyValue: liveOverview.taxWalletAddress,
    },
    {
      label: "回购钱包地址",
      middleValue: liveOverview.buybackWalletAddress,
      endValue: liveOverview.buybackWalletBalance,
      copyValue: liveOverview.buybackWalletAddress,
    },
    {
      label: "回购销毁执行钱包地址",
      middleValue: liveOverview.buybackBurnWalletAddress,
      endValue: liveOverview.buybackBurnWalletBalance,
      copyValue: liveOverview.buybackBurnWalletAddress,
    },
    {
      label: "币安总钱包余额",
      middleValue: "",
      endValue: walletAddresses.binanceTotalBalance,
    },
    {
      label: "币安带单余额",
      middleValue: "",
      endValue: walletAddresses.binanceLeadBalance,
    },
    {
      label: "币安合约余额",
      middleValue: "",
      endValue: walletAddresses.binanceContractBalance,
    },
    {
      label: "现货余额",
      middleValue: "",
      endValue: walletAddresses.spotBalance,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* ===== 1. 社区介绍卡片（顶部） ===== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-card overflow-hidden"
      >
        <div className="relative">
          <img
            src={AI_VISUAL}
            alt="AI Trading"
            className="w-full h-48 object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-[#111827]/70 to-transparent" />
          <div className="absolute bottom-5 left-5 right-5">
            <h2 className="text-2xl font-bold text-foreground mb-1">虾交易</h2>
            <p className="text-sm text-emerald-400 font-medium">
              AI 自动交易实验室
            </p>
          </div>
        </div>
        <div className="p-5 space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground">虾交易 社区</strong> 是一个 AI
            自动交易实验社区。
          </p>
          <p>
            社区将大部分税收资金用于{" "}
            <strong className="text-emerald-400">AI 自动合约交易</strong>，
            在严格风控的前提下，尝试实现稳定收益。
          </p>
          <p>
            交易利润将用于：<strong className="text-amber-400">回购销毁</strong>{" "}
            + <strong className="text-sky-400">扩大交易本金</strong> +{" "}
            <strong className="text-rose-400">慈善捐助</strong>。
          </p>
          <p>
            随着 AI 交易规模扩大，大额合约交易也有机会在{" "}
            <strong className="text-foreground">币安广场</strong> 获得更多曝光，
            进一步提升 $虾交易 的社区影响力。
          </p>
          <p>
            我们希望通过{" "}
            <strong className="text-foreground">
              AI 交易 + 社区增长 + 公益行动
            </strong>
            ， 打造一个长期可持续发展的社区生态。
          </p>
        </div>
      </motion.div>

      {/* ===== 2. 税收分配 & 合约收益分配（紧跟社区介绍） ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="glass-card p-5"
        >
          <h3 className="text-base font-semibold text-foreground mb-4">
            税收分配结构
          </h3>
          <DistributionBar items={taxDistribution} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass-card p-5"
        >
          <h3 className="text-base font-semibold text-foreground mb-4">
            合约收益分配结构
          </h3>
          <DistributionBar items={profitDistribution} />
        </motion.div>
      </div>

      {/* ===== 分隔线 ===== */}
      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/[0.06]" />
        </div>
      </div>

      {/* ===== 3. 核心数据卡片 ===== */}

      {/* 第一行：核心价格数据 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DataCard
          label="当前价格"
          value={liveOverview.currentPrice}
          subtitle="基准价格"
          icon="DollarSign"
          color="emerald"
          delay={0.15}
        />
        <DataCard
          label="市值"
          value={liveOverview.marketCap}
          subtitle="流通市值"
          icon="BarChart3"
          color="amber"
          delay={0.2}
        />
        <DataCard
          label="已销毁"
          value={liveOverview.destroyed}
          subtitle="总发行10亿枚"
          icon="Flame"
          color="red"
          delay={0.25}
        />
        <DataCard
          label="回购钱包余额"
          value={liveOverview.buybackWalletBalance}
          subtitle="有序回购"
          icon="Wallet"
          color="blue"
          delay={0.3}
        />
      </div>

      {/* 第二行：资产与收益 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <DataCard
          label="总资产"
          value={liveOverview.totalAssets}
          subtitle="包含所有钱包余额"
          icon="Coins"
          color="amber"
          delay={0.35}
        />
        <DataCard
          label="周涨幅"
          value={liveOverview.weeklyGain}
          subtitle="过去7天收益表现"
          icon="TrendingUp"
          color="emerald"
          delay={0.4}
        />
        <DataCard
          label="收益率"
          value={liveOverview.returnRate}
          subtitle="累计收益率"
          icon="Activity"
          color="blue"
          delay={0.45}
        />
      </div>

      {/* 第三行：币安带单数据 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DataCard
          label="币安带单保证金"
          value={liveOverview.binanceMargin}
          subtitle="合约交易保证金"
          icon="Shield"
          color="amber"
          delay={0.5}
        />
        <DataCard
          label="跟单人数"
          value={liveOverview.followers.toLocaleString()}
          subtitle="币安广场跟单"
          icon="Users"
          color="blue"
          delay={0.55}
        />
        <DataCard
          label="资产管理规模"
          value={liveOverview.aum}
          subtitle="AUM (Assets Under Management)"
          icon="PieChart"
          color="purple"
          delay={0.6}
        />
        <DataCard
          label="周收益率"
          value={liveOverview.weeklyReturn}
          subtitle="带单周收益率"
          icon="TrendingUp"
          color="emerald"
          delay={0.65}
        />
      </div>

      {/* 第四行：慈善捐助 */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">慈善捐助</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DataCard
            label="捐款总金额"
            value={liveOverview.donationTotal}
            subtitle={`捐助给${liveOverview.donationTarget}`}
            icon="Heart"
            color="red"
            delay={0.7}
          />
          <DataCard
            label="捐助对象"
            value={liveOverview.donationTarget}
            subtitle="10% 合约收益用于慈善捐助"
            icon="Users"
            color="amber"
            delay={0.75}
          />
        </div>
      </div>

      {/* ===== 4. 社区重点 ===== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        <h3 className="text-base font-semibold text-foreground mb-4">
          社区重点
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {communityHighlights.map((item, index) => {
            const Icon = highlightIcons[item.icon] || Bot;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.85 + index * 0.05 }}
                className="glass-card p-4 text-center"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                  <Icon className="w-5 h-5 text-emerald-400" />
                </div>
                <h4 className="text-sm font-semibold text-foreground mb-1">
                  {item.title}
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ===== 5. 钱包地址与余额 ===== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.9 }}
        className="glass-card p-5"
      >
        <h3 className="text-base font-semibold text-foreground mb-4">
          钱包地址与余额
        </h3>
        <div className="space-y-0">
          {walletRows.map((row, index) => (
            <WalletRow
              key={row.label}
              label={row.label}
              middleValue={row.middleValue}
              endValue={row.endValue}
              copyValue={row.copyValue}
              index={index + 1}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
