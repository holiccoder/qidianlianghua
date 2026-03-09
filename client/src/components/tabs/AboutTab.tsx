/**
 * AboutTab - 说明页面
 * 包含社区介绍、税收分配、合约收益分配、钱包地址、社区重点
 */
import { motion } from "framer-motion";
import {
  taxDistribution,
  profitDistribution,
  communityHighlights,
  walletAddresses,
  walletBnbBalances,
} from "@/lib/data";
import { Copy, RefreshCw, Eye, Bot, Shield, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";

const AI_VISUAL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663413222422/G6FQYjMMYEtsL9NvKBY9Ao/ai-trading-visual-kHfKNG2HsRTHaWjPvXrjDP.webp";
const COMMUNITY_BANNER =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663413222422/G6FQYjMMYEtsL9NvKBY9Ao/community-banner-oGcRKSJjqVT8bCL8xkSoA6.webp";

const highlightIcons: Record<string, React.ElementType> = {
  RefreshCw,
  Eye,
  Bot,
  Shield,
};

interface PublicSettingsResponse {
  taxWalletAddress?: string;
  buybackWalletAddress?: string;
  buybackBurnWalletAddress?: string;
}

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

      <span className="px-2 text-sm font-mono text-foreground text-center break-all leading-5">
        {middleValue}
      </span>

      <span className="text-xs font-mono text-amber-300 whitespace-nowrap">
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
      {/* Bar */}
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
      {/* Legend */}
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

export default function AboutTab() {
  const [walletConfig, setWalletConfig] = useState(() => ({
    taxWalletAddress: walletAddresses.taxWallet,
    buybackWalletAddress: walletAddresses.buybackWallet,
    buybackBurnWalletAddress: walletAddresses.buybackBurnWallet,
  }));

  useEffect(() => {
    let isDisposed = false;

    async function loadSettings() {
      try {
        const response = await fetch("/api/config");
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as PublicSettingsResponse;

        if (isDisposed) {
          return;
        }

        setWalletConfig(previous => ({
          taxWalletAddress:
            payload.taxWalletAddress?.trim() || previous.taxWalletAddress,
          buybackWalletAddress:
            payload.buybackWalletAddress?.trim() ||
            previous.buybackWalletAddress,
          buybackBurnWalletAddress:
            payload.buybackBurnWalletAddress?.trim() ||
            previous.buybackBurnWalletAddress,
        }));
      } catch {
        // Keep fallback addresses when request fails.
      }
    }

    void loadSettings();

    return () => {
      isDisposed = true;
    };
  }, []);

  const walletRows = [
    {
      label: "税收钱包地址",
      middleValue: walletConfig.taxWalletAddress,
      endValue: walletBnbBalances.taxWallet,
    },
    {
      label: "回购钱包地址",
      middleValue: walletConfig.buybackWalletAddress,
      endValue: walletBnbBalances.buybackWallet,
    },
    {
      label: "回购销毁执行钱包地址",
      middleValue: walletConfig.buybackBurnWalletAddress,
      endValue: walletBnbBalances.buybackBurnWallet,
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
      {/* Hero Banner */}
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
            className="w-full h-56 object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-[#111827]/70 to-transparent" />
          <div className="absolute bottom-5 left-5 right-5">
            <h2 className="text-2xl font-bold text-foreground mb-1">
              奇点量化
            </h2>
            <p className="text-sm text-emerald-400 font-medium">
              AI 自动交易实验室
            </p>
          </div>
        </div>
        <div className="p-5 space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground">奇点量化 社区</strong> 是一个 AI
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
            进一步提升 $奇点量化 的社区影响力。
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

      {/* 税收分配 & 合约收益分配 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
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
          transition={{ duration: 0.5, delay: 0.15 }}
          className="glass-card p-5"
        >
          <h3 className="text-base font-semibold text-foreground mb-4">
            合约收益分配结构
          </h3>
          <DistributionBar items={profitDistribution} />
        </motion.div>
      </div>

      {/* 社区重点 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
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
                transition={{ duration: 0.4, delay: 0.25 + index * 0.05 }}
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

      {/* 钱包地址 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
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
              index={index + 1}
            />
          ))}
        </div>
      </motion.div>

      {/* Community Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        className="glass-card overflow-hidden"
      >
        <div className="relative h-40">
          <img
            src={COMMUNITY_BANNER}
            alt="社区网络"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#111827]/90 to-transparent" />
          <div className="absolute inset-0 flex items-center px-6">
            <div>
              <h3 className="text-lg font-bold text-foreground mb-1">
                加入奇点量化社区
              </h3>
              <p className="text-sm text-muted-foreground">
                AI 交易 + 社区增长 + 公益行动
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
