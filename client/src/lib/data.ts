/**
 * 虾交易 AI交易实验室 - 数据常量
 * 所有展示数据集中管理
 */

const env = import.meta.env as Record<string, string | undefined>;
const DESTROYED_TOTAL_CACHE_KEY = "token_metrics_burned_total";

function getEnvText(key: string, fallback: string): string {
  const value = env[key]?.trim();
  return value ? value : fallback;
}

function getEnvNumber(key: string, fallback: number): number {
  const value = env[key]?.trim();

  if (!value) {
    return fallback;
  }

  const parsed = Number(value.replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getCachedDestroyedTotal(fallback: string): string {
  if (typeof window === "undefined") {
    return fallback;
  }

  const cachedValue = window.localStorage
    .getItem(DESTROYED_TOTAL_CACHE_KEY)
    ?.trim();

  return cachedValue || fallback;
}

export function updateDestroyedFallback(value: string): void {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return;
  }

  overviewData.destroyed = normalizedValue;

  if (typeof window !== "undefined") {
    window.localStorage.setItem(DESTROYED_TOTAL_CACHE_KEY, normalizedValue);
  }
}

// ===== 统筹页面数据 =====
export const overviewData = {
  currentPrice: "$0.0001358",
  marketCap: "$135.80K",
  destroyed: getCachedDestroyedTotal(
    getEnvText("VITE_DESTROYED_TOTAL", "114,804,858")
  ),
  buybackWalletBalance: "0.430 BNB",
  totalAssets: getEnvText("VITE_TOTAL_ASSETS", "$198.50"),
  weeklyGain: getEnvText("VITE_WEEKLY_GAIN", "+5.2%"),
  returnRate: getEnvText("VITE_RETURN_RATE", "12.8%"),
  binanceMargin: getEnvText("VITE_BINANCE_MARGIN", "$15,000"),
  followers: getEnvNumber("VITE_FOLLOWERS", 1247),
  aum: getEnvText("VITE_AUM", "$89,500"),
  weeklyReturn: getEnvText("VITE_WEEKLY_RETURN", "+3.6%"),
  donationTotal: getEnvText("VITE_DONATION_TOTAL", "$2,580"),
  donationTarget: getEnvText("VITE_DONATION_TARGET", "方鸭自闭症慈善社区"),
};

// ===== 合约地址 =====
const DEFAULT_CONTRACT_ADDRESS = "0x1094814045fe0c29023df28698ca539296cf7777";

export const contractAddress =
  import.meta.env.VITE_TOKEN_CONTRACT_ADDRESS?.trim() ||
  DEFAULT_CONTRACT_ADDRESS;

// ===== 钱包地址 =====
export const walletAddresses = {
  taxWallet: getEnvText("VITE_TAX_WALLET_ADDRESS", "0x1234...5678abcd...ef90"),
  buybackWallet: getEnvText(
    "VITE_MAIN_BUYBACK_WALLET_ADDRESS",
    "0xabcd...1234efgh...5678"
  ),
  buybackBurnWallet: getEnvText(
    "VITE_BUYBACK_BURN_WALLET_ADDRESS",
    "0x5678...abcd1234...ef90"
  ),
  binanceTotalBalance: "2.456 USDT",
  binanceLeadBalance: "1.200 USDT",
  binanceContractBalance: "0.856 USDT",
  spotBalance: "0.400 USDT",
};

export const walletBnbBalances = {
  taxWallet: "0.542 BNB",
  buybackWallet: "0.324 BNB",
  buybackBurnWallet: "0.118 BNB",
};

// ===== 交易记录 =====
export const tradeRecords = [
  {
    id: 1,
    time: "2026-03-08 14:32:15",
    pair: "BTC/USDT",
    type: "做多",
    entry: "$67,250.00",
    exit: "$67,890.00",
    pnl: "+$128.00",
    status: "已平仓",
  },
  {
    id: 2,
    time: "2026-03-08 13:15:42",
    pair: "ETH/USDT",
    type: "做空",
    entry: "$3,450.00",
    exit: "$3,380.00",
    pnl: "+$56.00",
    status: "已平仓",
  },
  {
    id: 3,
    time: "2026-03-08 11:08:33",
    pair: "BNB/USDT",
    type: "做多",
    entry: "$580.00",
    exit: "$592.00",
    pnl: "+$24.00",
    status: "已平仓",
  },
  {
    id: 4,
    time: "2026-03-08 09:45:18",
    pair: "SOL/USDT",
    type: "做多",
    entry: "$142.50",
    exit: "$145.80",
    pnl: "+$33.00",
    status: "已平仓",
  },
  {
    id: 5,
    time: "2026-03-07 22:30:05",
    pair: "BTC/USDT",
    type: "做空",
    entry: "$67,800.00",
    exit: "$67,650.00",
    pnl: "+$30.00",
    status: "已平仓",
  },
  {
    id: 6,
    time: "2026-03-07 18:12:44",
    pair: "ETH/USDT",
    type: "做多",
    entry: "$3,380.00",
    exit: "$3,350.00",
    pnl: "-$24.00",
    status: "已平仓",
  },
  {
    id: 7,
    time: "2026-03-07 15:55:21",
    pair: "DOGE/USDT",
    type: "做多",
    entry: "$0.1820",
    exit: "$0.1865",
    pnl: "+$18.00",
    status: "已平仓",
  },
  {
    id: 8,
    time: "2026-03-07 12:40:09",
    pair: "BTC/USDT",
    type: "做多",
    entry: "$66,900.00",
    exit: "$67,350.00",
    pnl: "+$90.00",
    status: "已平仓",
  },
];

// ===== 收益率数据 =====
export const returnData = {
  daily: "+0.8%",
  weekly: getEnvText("VITE_WEEKLY_RETURN", "+3.6%"),
  monthly: getEnvText("VITE_MONTHLY_RETURN", "+12.8%"),
  total: getEnvText("VITE_TOTAL_RETURN", "+45.2%"),
  winRate: getEnvText("VITE_WIN_RATE", "72.5%"),
  maxDrawdown: getEnvText("VITE_MAX_DRAWDOWN", "-8.3%"),
  sharpeRatio: "2.14",
  totalTrades: 1247,
  weeklyChart: [
    { day: "周一", value: 100 },
    { day: "周二", value: 102.5 },
    { day: "周三", value: 101.8 },
    { day: "周四", value: 104.2 },
    { day: "周五", value: 103.6 },
    { day: "周六", value: 105.1 },
    { day: "周日", value: 103.6 },
  ],
};

// ===== 回购数据 =====
export const buybackData = {
  totalBuyback: "69.788 BNB",
  burnCount: 1247,
  lastBuyback: "2026-03-08 10:00:00",
  lastAmount: "0.125 BNB",
  records: [
    {
      id: 1,
      time: "2026-03-08 10:00:00",
      amount: "0.125 BNB",
      price: "$0.00024955",
      burned: true,
    },
    {
      id: 2,
      time: "2026-03-07 10:00:00",
      amount: "0.118 BNB",
      price: "$0.00025100",
      burned: true,
    },
    {
      id: 3,
      time: "2026-03-06 10:00:00",
      amount: "0.132 BNB",
      price: "$0.00024800",
      burned: true,
    },
    {
      id: 4,
      time: "2026-03-05 10:00:00",
      amount: "0.110 BNB",
      price: "$0.00025200",
      burned: true,
    },
    {
      id: 5,
      time: "2026-03-04 10:00:00",
      amount: "0.145 BNB",
      price: "$0.00024600",
      burned: true,
    },
    {
      id: 6,
      time: "2026-03-03 10:00:00",
      amount: "0.098 BNB",
      price: "$0.00025500",
      burned: true,
    },
  ],
};

// ===== 开支数据 =====
export const expenseData = {
  totalExpense: getEnvText("VITE_WEEKLY_EXPENSE", "$4,250"),
  categories: [
    { name: "AI策略开发", amount: "$1,800", percentage: 42 },
    { name: "服务器运维", amount: "$850", percentage: 20 },
    { name: "社区运营", amount: "$680", percentage: 16 },
    { name: "安全审计", amount: "$520", percentage: 12 },
    { name: "其他", amount: "$400", percentage: 10 },
  ],
  monthly: [
    { month: "1月", amount: 3200 },
    { month: "2月", amount: 3800 },
    { month: "3月", amount: 4250 },
  ],
};

// ===== 资产配置 =====
export const assetAllocation = {
  total: "$89,500",
  allocations: [
    { name: "BTC合约", value: 35, amount: "$31,325", color: "#f59e0b" },
    { name: "ETH合约", value: 25, amount: "$22,375", color: "#38bdf8" },
    { name: "BNB现货", value: 15, amount: "$13,425", color: "#10b981" },
    { name: "SOL合约", value: 10, amount: "$8,950", color: "#a78bfa" },
    { name: "其他代币", value: 8, amount: "$7,160", color: "#f43f5e" },
    { name: "USDT储备", value: 7, amount: "$6,265", color: "#6b7280" },
  ],
};

// ===== 捐款数据 =====
export const donationData = {
  totalDonation: getEnvText("VITE_DONATION_TOTAL", "$2,580"),
  donationTarget: "方鸭自闭症慈善社区",
  records: [
    {
      id: 1,
      time: "2026-03-05",
      amount: "$500",
      target: "方鸭自闭症慈善社区",
      status: "已完成",
    },
    {
      id: 2,
      time: "2026-02-20",
      amount: "$450",
      target: "方鸭自闭症慈善社区",
      status: "已完成",
    },
    {
      id: 3,
      time: "2026-02-05",
      amount: "$380",
      target: "方鸭自闭症慈善社区",
      status: "已完成",
    },
    {
      id: 4,
      time: "2026-01-20",
      amount: "$420",
      target: "方鸭自闭症慈善社区",
      status: "已完成",
    },
    {
      id: 5,
      time: "2026-01-05",
      amount: "$350",
      target: "方鸭自闭症慈善社区",
      status: "已完成",
    },
    {
      id: 6,
      time: "2025-12-20",
      amount: "$480",
      target: "方鸭自闭症慈善社区",
      status: "已完成",
    },
  ],
};

// ===== 税收分配 =====
export const taxDistribution = [
  { label: "AI 自动合约交易资金", percentage: 80, color: "#10b981" },
  { label: "自动回购并销毁 $虾交易", percentage: 20, color: "#f59e0b" },
];

// ===== 合约收益分配 =====
export const profitDistribution = [
  { label: "重新投入交易本金", percentage: 40, color: "#10b981" },
  { label: "回购并销毁 $虾交易", percentage: 30, color: "#f59e0b" },
  { label: "AI自动交易策略团队", percentage: 20, color: "#38bdf8" },
  { label: "慈善捐助", percentage: 10, color: "#f43f5e" },
];

// ===== 社区重点 =====
export const communityHighlights = [
  {
    title: "自动回购",
    description: "智能合约自动执行回购销毁，无需人工干预",
    icon: "RefreshCw",
  },
  {
    title: "公开透明",
    description: "所有交易记录和资金流向链上可查",
    icon: "Eye",
  },
  {
    title: "AI自动交易",
    description: "AI策略7x24小时不间断运行",
    icon: "Bot",
  },
  {
    title: "严格风控",
    description: "多层风控机制，保障资金安全",
    icon: "Shield",
  },
];

// ===== 导航标签 =====
export const navTabs = [
  { id: "singularity", label: "虾交易", icon: "Zap" },
  { id: "trades", label: "交易记录", icon: "FileText" },
  { id: "returns", label: "收益", icon: "TrendingUp" },
  { id: "buyback", label: "回购", icon: "RefreshCw" },
  { id: "expenses", label: "开支", icon: "Receipt" },
  { id: "allocation", label: "资产配置", icon: "PieChart" },
  { id: "donation", label: "捐款", icon: "Heart" },
  { id: "team", label: "团队", icon: "Users" },
];
