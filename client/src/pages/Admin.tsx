import { FormEvent, useEffect, useState } from "react";

interface AdminSettingsForm {
  socialTelegramUrl: string;
  socialXUrl: string;
  socialBinanceUrl: string;
  tokenContractAddress: string;
  taxWalletAddress: string;
  buybackWalletAddress: string;
  buybackBurnWalletAddress: string;
  totalAssets: string;
  weeklyGain: string;
  returnRate: string;
  binanceMargin: string;
  followers: string;
  aum: string;
  weeklyReturn: string;
  monthlyReturn: string;
  totalReturn: string;
  winRate: string;
  maxDrawdown: string;
  weeklyExpense: string;
  donationTotal: string;
  donationTarget: string;
}

interface TradeRecord {
  id: string;
  time: string;
  pair: string;
  pnl: number;
}

interface TradeFormState {
  time: string;
  pair: string;
  pnl: string;
}

interface ReturnRecord {
  id: string;
  time: string;
  returnRate: number;
  pnl: number;
}

interface ReturnFormState {
  time: string;
  returnRate: string;
  pnl: string;
}

interface AllocationRecord {
  id: string;
  contract: string;
  amount: number;
}

interface AllocationFormState {
  contract: string;
  amount: string;
}

interface ExpenseRecord {
  id: string;
  time: string;
  category: string;
  amount: number;
}

interface ExpenseFormState {
  time: string;
  category: string;
  amount: string;
}

interface DonationRecord {
  id: string;
  time: string;
  amount: number;
}

interface DonationFormState {
  time: string;
  amount: string;
}

type AdminView =
  | "settings"
  | "trades"
  | "returns"
  | "allocations"
  | "expenses"
  | "donations";

const defaultSettings: AdminSettingsForm = {
  socialTelegramUrl: "https://t.me/your_channel",
  socialXUrl: "https://x.com/your_account",
  socialBinanceUrl: "https://www.binance.com/zh-CN/square",
  tokenContractAddress: "0x1094814045fe0c29023df28698ca539296cf7777",
  taxWalletAddress: "0x1234...5678abcd...ef90",
  buybackWalletAddress: "0xabcd...1234efgh...5678",
  buybackBurnWalletAddress: "0x5678...abcd1234...ef90",
  totalAssets: "$198.50",
  weeklyGain: "+5.2%",
  returnRate: "12.8%",
  binanceMargin: "$15,000",
  followers: "1247",
  aum: "$89,500",
  weeklyReturn: "+3.6%",
  monthlyReturn: "+12.8%",
  totalReturn: "+45.2%",
  winRate: "72.5%",
  maxDrawdown: "-8.3%",
  weeklyExpense: "$4,250",
  donationTotal: "$2,580",
  donationTarget: "方鸭自闭症慈善社区",
};

const fields: Array<{ key: keyof AdminSettingsForm; label: string }> = [
  { key: "socialTelegramUrl", label: "Telegram 链接" },
  { key: "socialXUrl", label: "X 链接" },
  { key: "socialBinanceUrl", label: "币安广场链接" },
  { key: "tokenContractAddress", label: "代币合约地址" },
  { key: "taxWalletAddress", label: "税收钱包地址" },
  { key: "buybackWalletAddress", label: "回购钱包地址" },
  { key: "buybackBurnWalletAddress", label: "回购销毁执行钱包地址" },
  { key: "weeklyGain", label: "周涨幅" },
  { key: "returnRate", label: "收益率" },
  { key: "binanceMargin", label: "币安带单保证金" },
  { key: "followers", label: "跟单人数" },
  { key: "aum", label: "资产管理规模" },
  { key: "weeklyReturn", label: "周收益率" },
  { key: "monthlyReturn", label: "月收益率" },
  { key: "totalReturn", label: "累计收益率" },
  { key: "winRate", label: "胜率" },
  { key: "maxDrawdown", label: "最大回撤" },
  { key: "weeklyExpense", label: "本周总开支" },
  { key: "donationTotal", label: "捐款总金额" },
  { key: "donationTarget", label: "捐助对象" },
];

function formatDateTimeInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDateInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toDateTimeInputValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T00:00`;
  }

  if (trimmed.includes(" ")) {
    return trimmed.replace(" ", "T").slice(0, 16);
  }

  if (trimmed.includes("T")) {
    return trimmed.slice(0, 16);
  }

  return "";
}

function toDateInputValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const matched = trimmed.match(/^\d{4}-\d{2}-\d{2}/);
  if (matched) {
    return matched[0];
  }

  return "";
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

function normalizeTradeRecords(payload: unknown): TradeRecord[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  const toTimestamp = (time: string) => {
    const parsed = new Date(time.replace(" ", "T"));
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  };

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

      const pnl = Number(raw.pnl);

      return {
        id: String(raw.id ?? `trade-${index}`),
        time: raw.time,
        pair,
        pnl: Number.isFinite(pnl) ? pnl : 0,
      };
    })
    .filter((item): item is TradeRecord => Boolean(item))
    .sort((a, b) => toTimestamp(b.time) - toTimestamp(a.time));
}

function normalizeReturnRecords(payload: unknown): ReturnRecord[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  const toTimestamp = (time: string) => {
    const parsed = new Date(time.replace(" ", "T"));
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  };

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

      const returnRate = Number(raw.returnRate);
      const pnl = Number(raw.pnl);

      return {
        id: String(raw.id ?? `return-${index}`),
        time: raw.time,
        returnRate: Number.isFinite(returnRate) ? returnRate : 0,
        pnl: Number.isFinite(pnl) ? pnl : 0,
      };
    })
    .filter((item): item is ReturnRecord => Boolean(item))
    .sort((a, b) => toTimestamp(b.time) - toTimestamp(a.time));
}

function normalizeAllocationRecords(payload: unknown): AllocationRecord[] {
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
    .filter((item): item is AllocationRecord => Boolean(item));
}

function normalizeExpenseRecords(payload: unknown): ExpenseRecord[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  const toTimestamp = (time: string) => {
    const parsed = new Date(time.replace(" ", "T"));
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  };

  return payload
    .map((item, index) => {
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

      const category = raw.category.trim();

      if (!category) {
        return null;
      }

      return {
        id: String(raw.id ?? `expense-${index}`),
        time: raw.time,
        category,
        amount: parseDecimal(raw.amount),
      };
    })
    .filter((item): item is ExpenseRecord => Boolean(item))
    .sort((a, b) => toTimestamp(b.time) - toTimestamp(a.time));
}

function normalizeDonationRecords(payload: unknown): DonationRecord[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  const toTimestamp = (time: string) => {
    const parsed = new Date(time.replace(" ", "T"));
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  };

  return payload
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const raw = item as {
        id?: unknown;
        time?: unknown;
        amount?: unknown;
      };

      if (typeof raw.time !== "string") {
        return null;
      }

      return {
        id: String(raw.id ?? `donation-${index}`),
        time: raw.time,
        amount: parseDecimal(raw.amount),
      };
    })
    .filter((item): item is DonationRecord => Boolean(item))
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

function formatCurrency(value: number): string {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export default function AdminPage() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingTrade, setIsAddingTrade] = useState(false);
  const [isUpdatingTrade, setIsUpdatingTrade] = useState(false);
  const [deletingTradeId, setDeletingTradeId] = useState<string | null>(null);
  const [isAddingReturn, setIsAddingReturn] = useState(false);
  const [isUpdatingReturn, setIsUpdatingReturn] = useState(false);
  const [deletingReturnId, setDeletingReturnId] = useState<string | null>(null);
  const [isAddingAllocation, setIsAddingAllocation] = useState(false);
  const [isUpdatingAllocation, setIsUpdatingAllocation] = useState(false);
  const [deletingAllocationId, setDeletingAllocationId] = useState<
    string | null
  >(null);
  const [isUpdatingExpense, setIsUpdatingExpense] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(
    null
  );
  const [isUpdatingDonation, setIsUpdatingDonation] = useState(false);
  const [deletingDonationId, setDeletingDonationId] = useState<string | null>(
    null
  );
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeView, setActiveView] = useState<AdminView>("settings");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const [settings, setSettings] = useState<AdminSettingsForm>(defaultSettings);
  const [tradeRecords, setTradeRecords] = useState<TradeRecord[]>([]);
  const [returnRecords, setReturnRecords] = useState<ReturnRecord[]>([]);
  const [allocationRecords, setAllocationRecords] = useState<
    AllocationRecord[]
  >([]);
  const [tradeForm, setTradeForm] = useState<TradeFormState>({
    time: formatDateTimeInput(new Date()),
    pair: "",
    pnl: "",
  });
  const [editingTradeId, setEditingTradeId] = useState<string | null>(null);
  const [editingTradeForm, setEditingTradeForm] = useState<TradeFormState>({
    time: "",
    pair: "",
    pnl: "",
  });
  const [returnForm, setReturnForm] = useState<ReturnFormState>({
    time: formatDateInput(new Date()),
    returnRate: "",
    pnl: "",
  });
  const [editingReturnId, setEditingReturnId] = useState<string | null>(null);
  const [editingReturnForm, setEditingReturnForm] = useState<ReturnFormState>({
    time: "",
    returnRate: "",
    pnl: "",
  });
  const [allocationForm, setAllocationForm] = useState<AllocationFormState>({
    contract: "",
    amount: "",
  });
  const [editingAllocationId, setEditingAllocationId] = useState<string | null>(
    null
  );
  const [editingAllocationForm, setEditingAllocationForm] =
    useState<AllocationFormState>({
      contract: "",
      amount: "",
    });
  const [expenseRecords, setExpenseRecords] = useState<ExpenseRecord[]>([]);
  const [expenseForm, setExpenseForm] = useState<ExpenseFormState>({
    time: formatDateTimeInput(new Date()),
    category: "",
    amount: "",
  });
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingExpenseForm, setEditingExpenseForm] =
    useState<ExpenseFormState>({
      time: "",
      category: "",
      amount: "",
    });
  const [donationRecords, setDonationRecords] = useState<DonationRecord[]>([]);
  const [donationForm, setDonationForm] = useState<DonationFormState>({
    time: formatDateInput(new Date()),
    amount: "",
  });
  const [editingDonationId, setEditingDonationId] = useState<string | null>(
    null
  );
  const [editingDonationForm, setEditingDonationForm] =
    useState<DonationFormState>({
      time: "",
      amount: "",
    });

  async function loadSettings() {
    const response = await fetch("/api/admin/settings", {
      credentials: "same-origin",
    });

    if (response.status === 401) {
      setIsAuthenticated(false);
      return;
    }

    if (!response.ok) {
      throw new Error("无法加载配置");
    }

    const payload = (await response.json()) as Partial<AdminSettingsForm>;

    setSettings(previous => ({
      ...previous,
      ...payload,
    }));
    setIsAuthenticated(true);
  }

  async function loadTrades() {
    const response = await fetch("/api/admin/trades", {
      credentials: "same-origin",
    });

    if (response.status === 401) {
      setIsAuthenticated(false);
      return;
    }

    if (!response.ok) {
      throw new Error("无法加载交易记录");
    }

    const payload = await response.json();
    setTradeRecords(normalizeTradeRecords(payload));
  }

  async function loadReturns() {
    const response = await fetch("/api/admin/returns", {
      credentials: "same-origin",
    });

    if (response.status === 401) {
      setIsAuthenticated(false);
      return;
    }

    if (!response.ok) {
      throw new Error("无法加载收益率记录");
    }

    const payload = await response.json();
    setReturnRecords(normalizeReturnRecords(payload));
  }

  async function loadAllocations() {
    const response = await fetch("/api/admin/allocations", {
      credentials: "same-origin",
    });

    if (response.status === 401) {
      setIsAuthenticated(false);
      return;
    }

    if (!response.ok) {
      throw new Error("无法加载资产配置记录");
    }

    const payload = await response.json();
    setAllocationRecords(normalizeAllocationRecords(payload));
  }

  async function loadExpenses() {
    const response = await fetch("/api/admin/expenses", {
      credentials: "same-origin",
    });

    if (response.status === 401) {
      setIsAuthenticated(false);
      return;
    }

    if (!response.ok) {
      throw new Error("无法加载开支记录");
    }

    const payload = await response.json();
    setExpenseRecords(normalizeExpenseRecords(payload));
  }

  async function loadDonations() {
    const response = await fetch("/api/admin/donations", {
      credentials: "same-origin",
    });

    if (response.status === 401) {
      setIsAuthenticated(false);
      return;
    }

    if (!response.ok) {
      throw new Error("无法加载捐款记录");
    }

    const payload = await response.json();
    setDonationRecords(normalizeDonationRecords(payload));
  }

  useEffect(() => {
    let disposed = false;

    async function init() {
      try {
        await Promise.all([
          loadSettings(),
          loadTrades(),
          loadReturns(),
          loadAllocations(),
          loadExpenses(),
          loadDonations(),
        ]);
      } catch {
        if (!disposed) {
          setError("初始化失败，请刷新重试");
        }
      } finally {
        if (!disposed) {
          setCheckingAuth(false);
        }
      }
    }

    void init();

    return () => {
      disposed = true;
    };
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoggingIn(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        setError("账号或密码错误");
        return;
      }

      await Promise.all([
        loadSettings(),
        loadTrades(),
        loadReturns(),
        loadAllocations(),
        loadExpenses(),
        loadDonations(),
      ]);
      setCredentials({ username: "", password: "" });
      setMessage("登录成功");
    } catch {
      setError("登录失败，请稍后重试");
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify(settings),
      });

      if (response.status === 401) {
        setIsAuthenticated(false);
        setError("登录已失效，请重新登录");
        return;
      }

      if (!response.ok) {
        setError("保存失败");
        return;
      }

      const payload = (await response.json()) as Partial<AdminSettingsForm>;
      setSettings(previous => ({
        ...previous,
        ...payload,
      }));
      setMessage("保存成功，前台会读取最新配置");
    } catch {
      setError("保存失败，请稍后重试");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", {
      method: "POST",
      credentials: "same-origin",
    });
    setIsAuthenticated(false);
    setMessage("");
  }

  async function handleAddTrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsAddingTrade(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/trades", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          time: tradeForm.time,
          pair: tradeForm.pair,
          pnl: tradeForm.pnl,
        }),
      });

      if (response.status === 401) {
        setIsAuthenticated(false);
        setError("登录已失效，请重新登录");
        return;
      }

      const payload = await response.json();

      if (!response.ok) {
        setError(
          typeof payload?.error === "string" ? payload.error : "保存失败"
        );
        return;
      }

      setTradeRecords(normalizeTradeRecords(payload));
      setTradeForm({
        time: formatDateTimeInput(new Date()),
        pair: "",
        pnl: "",
      });
      setMessage("交易记录已保存");
    } catch {
      setError("保存失败，请稍后重试");
    } finally {
      setIsAddingTrade(false);
    }
  }

  async function handleAddReturn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsAddingReturn(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/returns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          time: returnForm.time,
          returnRate: returnForm.returnRate,
          pnl: returnForm.pnl,
        }),
      });

      if (response.status === 401) {
        setIsAuthenticated(false);
        setError("登录已失效，请重新登录");
        return;
      }

      const payload = await response.json();

      if (!response.ok) {
        setError(
          typeof payload?.error === "string" ? payload.error : "保存失败"
        );
        return;
      }

      setReturnRecords(normalizeReturnRecords(payload));
      setReturnForm({
        time: formatDateInput(new Date()),
        returnRate: "",
        pnl: "",
      });
      setMessage("收益率记录已保存");
    } catch {
      setError("保存失败，请稍后重试");
    } finally {
      setIsAddingReturn(false);
    }
  }

  async function handleAddAllocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsAddingAllocation(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/allocations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          contract: allocationForm.contract,
          amount: allocationForm.amount,
        }),
      });

      if (response.status === 401) {
        setIsAuthenticated(false);
        setError("登录已失效，请重新登录");
        return;
      }

      const payload = await response.json();

      if (!response.ok) {
        setError(
          typeof payload?.error === "string" ? payload.error : "保存失败"
        );
        return;
      }

      setAllocationRecords(normalizeAllocationRecords(payload));
      setAllocationForm({ contract: "", amount: "" });
      setMessage("资产配置记录已保存");
    } catch {
      setError("保存失败，请稍后重试");
    } finally {
      setIsAddingAllocation(false);
    }
  }

  const [isAddingExpense, setIsAddingExpense] = useState(false);

  async function handleAddExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsAddingExpense(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          time: expenseForm.time,
          category: expenseForm.category,
          amount: expenseForm.amount,
        }),
      });

      if (response.status === 401) {
        setIsAuthenticated(false);
        setError("登录已失效，请重新登录");
        return;
      }

      const payload = await response.json();

      if (!response.ok) {
        setError(
          typeof payload?.error === "string" ? payload.error : "保存失败"
        );
        return;
      }

      setExpenseRecords(normalizeExpenseRecords(payload));
      setExpenseForm({
        time: formatDateTimeInput(new Date()),
        category: "",
        amount: "",
      });
      setMessage("开支记录已保存");
    } catch {
      setError("保存失败，请稍后重试");
    } finally {
      setIsAddingExpense(false);
    }
  }

  const [isAddingDonation, setIsAddingDonation] = useState(false);

  async function handleAddDonation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsAddingDonation(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/donations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          time: donationForm.time,
          amount: donationForm.amount,
        }),
      });

      if (response.status === 401) {
        setIsAuthenticated(false);
        setError("登录已失效，请重新登录");
        return;
      }

      const payload = await response.json();

      if (!response.ok) {
        setError(
          typeof payload?.error === "string" ? payload.error : "保存失败"
        );
        return;
      }

      setDonationRecords(normalizeDonationRecords(payload));
      setDonationForm({
        time: formatDateInput(new Date()),
        amount: "",
      });
      setMessage("捐款记录已保存");
    } catch {
      setError("保存失败，请稍后重试");
    } finally {
      setIsAddingDonation(false);
    }
  }

  function startEditTrade(record: TradeRecord) {
    setEditingTradeId(record.id);
    setEditingTradeForm({
      time: toDateTimeInputValue(record.time),
      pair: record.pair,
      pnl: String(record.pnl),
    });
  }

  function cancelEditTrade() {
    setEditingTradeId(null);
    setEditingTradeForm({
      time: "",
      pair: "",
      pnl: "",
    });
  }

  async function handleSaveTradeEdit(id: string) {
    setIsUpdatingTrade(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/trades/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          time: editingTradeForm.time,
          pair: editingTradeForm.pair,
          pnl: editingTradeForm.pnl,
        }),
      });

      if (response.status === 401) {
        setIsAuthenticated(false);
        setError("登录已失效，请重新登录");
        return;
      }

      const payload = await response.json();

      if (!response.ok) {
        setError(
          typeof payload?.error === "string" ? payload.error : "更新失败"
        );
        return;
      }

      setTradeRecords(normalizeTradeRecords(payload));
      cancelEditTrade();
      setMessage("交易记录已更新");
    } catch {
      setError("更新失败，请稍后重试");
    } finally {
      setIsUpdatingTrade(false);
    }
  }

  async function handleDeleteTrade(id: string) {
    setDeletingTradeId(id);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/trades/${id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });

      if (response.status === 401) {
        setIsAuthenticated(false);
        setError("登录已失效，请重新登录");
        return;
      }

      const payload = await response.json();

      if (!response.ok) {
        setError(
          typeof payload?.error === "string" ? payload.error : "删除失败"
        );
        return;
      }

      setTradeRecords(normalizeTradeRecords(payload));
      if (editingTradeId === id) {
        cancelEditTrade();
      }
      setMessage("交易记录已删除");
    } catch {
      setError("删除失败，请稍后重试");
    } finally {
      setDeletingTradeId(null);
    }
  }

  function startEditReturn(record: ReturnRecord) {
    setEditingReturnId(record.id);
    setEditingReturnForm({
      time: record.time,
      returnRate: String(record.returnRate),
      pnl: String(record.pnl),
    });
  }

  function cancelEditReturn() {
    setEditingReturnId(null);
    setEditingReturnForm({
      time: "",
      returnRate: "",
      pnl: "",
    });
  }

  async function handleSaveReturnEdit(id: string) {
    setIsUpdatingReturn(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/returns/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          time: editingReturnForm.time,
          returnRate: editingReturnForm.returnRate,
          pnl: editingReturnForm.pnl,
        }),
      });

      if (response.status === 401) {
        setIsAuthenticated(false);
        setError("登录已失效，请重新登录");
        return;
      }

      const payload = await response.json();

      if (!response.ok) {
        setError(
          typeof payload?.error === "string" ? payload.error : "更新失败"
        );
        return;
      }

      setReturnRecords(normalizeReturnRecords(payload));
      cancelEditReturn();
      setMessage("收益率记录已更新");
    } catch {
      setError("更新失败，请稍后重试");
    } finally {
      setIsUpdatingReturn(false);
    }
  }

  async function handleDeleteReturn(id: string) {
    setDeletingReturnId(id);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/returns/${id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });

      if (response.status === 401) {
        setIsAuthenticated(false);
        setError("登录已失效，请重新登录");
        return;
      }

      const payload = await response.json();

      if (!response.ok) {
        setError(
          typeof payload?.error === "string" ? payload.error : "删除失败"
        );
        return;
      }

      setReturnRecords(normalizeReturnRecords(payload));
      if (editingReturnId === id) {
        cancelEditReturn();
      }
      setMessage("收益率记录已删除");
    } catch {
      setError("删除失败，请稍后重试");
    } finally {
      setDeletingReturnId(null);
    }
  }

  function startEditExpense(record: ExpenseRecord) {
    setEditingExpenseId(record.id);
    setEditingExpenseForm({
      time: toDateTimeInputValue(record.time),
      category: record.category,
      amount: String(record.amount),
    });
  }

  function cancelEditExpense() {
    setEditingExpenseId(null);
    setEditingExpenseForm({
      time: "",
      category: "",
      amount: "",
    });
  }

  async function handleSaveExpenseEdit(id: string) {
    setIsUpdatingExpense(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/expenses/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          time: editingExpenseForm.time,
          category: editingExpenseForm.category,
          amount: editingExpenseForm.amount,
        }),
      });

      if (response.status === 401) {
        setIsAuthenticated(false);
        setError("登录已失效，请重新登录");
        return;
      }

      const payload = await response.json();

      if (!response.ok) {
        setError(
          typeof payload?.error === "string" ? payload.error : "更新失败"
        );
        return;
      }

      setExpenseRecords(normalizeExpenseRecords(payload));
      cancelEditExpense();
      setMessage("开支记录已更新");
    } catch {
      setError("更新失败，请稍后重试");
    } finally {
      setIsUpdatingExpense(false);
    }
  }

  async function handleDeleteExpense(id: string) {
    setDeletingExpenseId(id);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/expenses/${id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });

      if (response.status === 401) {
        setIsAuthenticated(false);
        setError("登录已失效，请重新登录");
        return;
      }

      const payload = await response.json();

      if (!response.ok) {
        setError(
          typeof payload?.error === "string" ? payload.error : "删除失败"
        );
        return;
      }

      setExpenseRecords(normalizeExpenseRecords(payload));
      if (editingExpenseId === id) {
        cancelEditExpense();
      }
      setMessage("开支记录已删除");
    } catch {
      setError("删除失败，请稍后重试");
    } finally {
      setDeletingExpenseId(null);
    }
  }

  function startEditDonation(record: DonationRecord) {
    setEditingDonationId(record.id);
    setEditingDonationForm({
      time: toDateInputValue(record.time),
      amount: String(record.amount),
    });
  }

  function cancelEditDonation() {
    setEditingDonationId(null);
    setEditingDonationForm({
      time: "",
      amount: "",
    });
  }

  async function handleSaveDonationEdit(id: string) {
    setIsUpdatingDonation(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/donations/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          time: editingDonationForm.time,
          amount: editingDonationForm.amount,
        }),
      });

      if (response.status === 401) {
        setIsAuthenticated(false);
        setError("登录已失效，请重新登录");
        return;
      }

      const payload = await response.json();

      if (!response.ok) {
        setError(
          typeof payload?.error === "string" ? payload.error : "更新失败"
        );
        return;
      }

      setDonationRecords(normalizeDonationRecords(payload));
      cancelEditDonation();
      setMessage("捐款记录已更新");
    } catch {
      setError("更新失败，请稍后重试");
    } finally {
      setIsUpdatingDonation(false);
    }
  }

  async function handleDeleteDonation(id: string) {
    setDeletingDonationId(id);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/donations/${id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });

      if (response.status === 401) {
        setIsAuthenticated(false);
        setError("登录已失效，请重新登录");
        return;
      }

      const payload = await response.json();

      if (!response.ok) {
        setError(
          typeof payload?.error === "string" ? payload.error : "删除失败"
        );
        return;
      }

      setDonationRecords(normalizeDonationRecords(payload));
      if (editingDonationId === id) {
        cancelEditDonation();
      }
      setMessage("捐款记录已删除");
    } catch {
      setError("删除失败，请稍后重试");
    } finally {
      setDeletingDonationId(null);
    }
  }

  function startEditAllocation(record: AllocationRecord) {
    setEditingAllocationId(record.id);
    setEditingAllocationForm({
      contract: record.contract,
      amount: String(record.amount),
    });
  }

  function cancelEditAllocation() {
    setEditingAllocationId(null);
    setEditingAllocationForm({ contract: "", amount: "" });
  }

  async function handleSaveAllocationEdit(id: string) {
    setIsUpdatingAllocation(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/allocations/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          contract: editingAllocationForm.contract,
          amount: editingAllocationForm.amount,
        }),
      });

      if (response.status === 401) {
        setIsAuthenticated(false);
        setError("登录已失效，请重新登录");
        return;
      }

      const payload = await response.json();

      if (!response.ok) {
        setError(
          typeof payload?.error === "string" ? payload.error : "更新失败"
        );
        return;
      }

      setAllocationRecords(normalizeAllocationRecords(payload));
      cancelEditAllocation();
      setMessage("资产配置记录已更新");
    } catch {
      setError("更新失败，请稍后重试");
    } finally {
      setIsUpdatingAllocation(false);
    }
  }

  async function handleDeleteAllocation(id: string) {
    setDeletingAllocationId(id);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/allocations/${id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });

      if (response.status === 401) {
        setIsAuthenticated(false);
        setError("登录已失效，请重新登录");
        return;
      }

      const payload = await response.json();

      if (!response.ok) {
        setError(
          typeof payload?.error === "string" ? payload.error : "删除失败"
        );
        return;
      }

      setAllocationRecords(normalizeAllocationRecords(payload));
      if (editingAllocationId === id) {
        cancelEditAllocation();
      }
      setMessage("资产配置记录已删除");
    } catch {
      setError("删除失败，请稍后重试");
    } finally {
      setDeletingAllocationId(null);
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#0b1120] text-foreground flex items-center justify-center">
        <p className="text-sm text-muted-foreground">加载中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1120] text-foreground p-6">
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="glass-card p-5">
          <h1 className="text-lg font-semibold">配置后台</h1>
        </div>

        {error ? (
          <div className="glass-card border border-rose-500/30 p-3 text-sm text-rose-300">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="glass-card border border-emerald-500/30 p-3 text-sm text-emerald-300">
            {message}
          </div>
        ) : null}

        {!isAuthenticated ? (
          <form onSubmit={handleLogin} className="glass-card p-5 space-y-4">
            <h2 className="text-base font-semibold">管理员登录</h2>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">用户名</label>
              <input
                value={credentials.username}
                onChange={event =>
                  setCredentials(previous => ({
                    ...previous,
                    username: event.target.value,
                  }))
                }
                className="w-full rounded-lg border border-white/[0.12] bg-black/20 px-3 py-2 text-sm outline-none focus:border-emerald-500/40"
                placeholder="admin"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">密码</label>
              <input
                type="password"
                value={credentials.password}
                onChange={event =>
                  setCredentials(previous => ({
                    ...previous,
                    password: event.target.value,
                  }))
                }
                className="w-full rounded-lg border border-white/[0.12] bg-black/20 px-3 py-2 text-sm outline-none focus:border-emerald-500/40"
                placeholder="请输入密码"
              />
            </div>
            <button
              type="submit"
              disabled={isLoggingIn}
              className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-50"
            >
              {isLoggingIn ? "登录中..." : "登录"}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 rounded-lg border border-white/[0.12] bg-black/20 p-1">
                <button
                  type="button"
                  onClick={() => setActiveView("settings")}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    activeView === "settings"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  参数配置
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView("trades")}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    activeView === "trades"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  AI 自动交易记录
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView("returns")}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    activeView === "returns"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  创建收益率
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView("allocations")}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    activeView === "allocations"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  资产配置详情
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView("expenses")}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    activeView === "expenses"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  开支
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView("donations")}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    activeView === "donations"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  捐款
                </button>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                退出登录
              </button>
            </div>

            {activeView === "settings" ? (
              <form onSubmit={handleSave} className="glass-card p-5 space-y-4">
                <h2 className="text-base font-semibold">参数配置</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {fields.map(field => (
                    <div key={field.key} className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">
                        {field.label}
                      </label>
                      <input
                        value={settings[field.key]}
                        onChange={event =>
                          setSettings(previous => ({
                            ...previous,
                            [field.key]: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-white/[0.12] bg-black/20 px-3 py-2 text-sm outline-none focus:border-emerald-500/40"
                      />
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-50"
                >
                  {isSaving ? "保存中..." : "保存配置"}
                </button>
              </form>
            ) : activeView === "trades" ? (
              <div className="space-y-4">
                <form
                  onSubmit={handleAddTrade}
                  className="glass-card p-5 space-y-4"
                >
                  <h2 className="text-base font-semibold">AI 自动交易记录</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">
                        时间
                      </label>
                      <input
                        type="datetime-local"
                        value={tradeForm.time}
                        onChange={event =>
                          setTradeForm(previous => ({
                            ...previous,
                            time: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-white/[0.12] bg-black/20 px-3 py-2 text-sm outline-none focus:border-emerald-500/40"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">
                        交易对
                      </label>
                      <input
                        value={tradeForm.pair}
                        onChange={event =>
                          setTradeForm(previous => ({
                            ...previous,
                            pair: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-white/[0.12] bg-black/20 px-3 py-2 text-sm outline-none focus:border-emerald-500/40"
                        placeholder="如 BTC/USDT"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">
                        盈亏
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={tradeForm.pnl}
                        onChange={event =>
                          setTradeForm(previous => ({
                            ...previous,
                            pnl: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-white/[0.12] bg-black/20 px-3 py-2 text-sm outline-none focus:border-emerald-500/40"
                        placeholder="如 128.50 或 -24"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isAddingTrade}
                    className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-50"
                  >
                    {isAddingTrade ? "保存中..." : "新增记录"}
                  </button>
                </form>

                <div className="glass-card overflow-hidden">
                  <div className="p-4 border-b border-white/[0.06]">
                    <h3 className="text-sm font-semibold text-foreground">
                      已保存记录
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/[0.06] text-muted-foreground">
                          <th className="text-left font-medium px-4 py-2.5">
                            时间
                          </th>
                          <th className="text-left font-medium px-4 py-2.5">
                            交易对
                          </th>
                          <th className="text-right font-medium px-4 py-2.5">
                            盈亏
                          </th>
                          <th className="text-right font-medium px-4 py-2.5">
                            操作
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {tradeRecords.map(record => {
                          const isProfit = record.pnl >= 0;
                          const isEditing = editingTradeId === record.id;
                          return (
                            <tr
                              key={record.id}
                              className="border-b border-white/[0.04]"
                            >
                              <td className="px-4 py-2.5">
                                {isEditing ? (
                                  <input
                                    type="datetime-local"
                                    value={editingTradeForm.time}
                                    onChange={event =>
                                      setEditingTradeForm(previous => ({
                                        ...previous,
                                        time: event.target.value,
                                      }))
                                    }
                                    className="w-full rounded-md border border-white/[0.12] bg-black/20 px-2.5 py-1.5 text-xs font-mono outline-none focus:border-emerald-500/40"
                                    required
                                  />
                                ) : (
                                  <span className="font-mono text-xs text-muted-foreground">
                                    {record.time}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2.5">
                                {isEditing ? (
                                  <input
                                    value={editingTradeForm.pair}
                                    onChange={event =>
                                      setEditingTradeForm(previous => ({
                                        ...previous,
                                        pair: event.target.value,
                                      }))
                                    }
                                    className="w-full rounded-md border border-white/[0.12] bg-black/20 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-500/40"
                                    required
                                  />
                                ) : (
                                  <span className="text-foreground">
                                    {record.pair}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={editingTradeForm.pnl}
                                    onChange={event =>
                                      setEditingTradeForm(previous => ({
                                        ...previous,
                                        pnl: event.target.value,
                                      }))
                                    }
                                    className="w-32 rounded-md border border-white/[0.12] bg-black/20 px-2.5 py-1.5 text-sm text-right outline-none focus:border-emerald-500/40"
                                    required
                                  />
                                ) : (
                                  <span
                                    className={`font-mono ${
                                      isProfit
                                        ? "text-emerald-400"
                                        : "text-rose-400"
                                    }`}
                                  >
                                    {formatPnl(record.pnl)}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                {isEditing ? (
                                  <div className="inline-flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleSaveTradeEdit(record.id)
                                      }
                                      disabled={isUpdatingTrade}
                                      className="rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-300 disabled:opacity-50"
                                    >
                                      保存
                                    </button>
                                    <button
                                      type="button"
                                      onClick={cancelEditTrade}
                                      className="rounded-md border border-white/[0.12] px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                                    >
                                      取消
                                    </button>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => startEditTrade(record)}
                                      className="rounded-md border border-sky-500/35 bg-sky-500/10 px-2.5 py-1 text-xs text-sky-300"
                                    >
                                      编辑
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleDeleteTrade(record.id)
                                      }
                                      disabled={deletingTradeId === record.id}
                                      className="rounded-md border border-rose-500/35 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-300 disabled:opacity-50"
                                    >
                                      删除
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : activeView === "returns" ? (
              <div className="space-y-4">
                <form
                  onSubmit={handleAddReturn}
                  className="glass-card p-5 space-y-4"
                >
                  <h2 className="text-base font-semibold">创建收益率</h2>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">
                        时间
                      </label>
                      <input
                        type="text"
                        value={returnForm.time}
                        onChange={event =>
                          setReturnForm(previous => ({
                            ...previous,
                            time: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-white/[0.12] bg-black/20 px-3 py-2 text-sm outline-none focus:border-emerald-500/40"
                        placeholder="如 2026-03-02 至 2026-03-08"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">
                        收益率
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        value={returnForm.returnRate}
                        onChange={event =>
                          setReturnForm(previous => ({
                            ...previous,
                            returnRate: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-white/[0.12] bg-black/20 px-3 py-2 text-sm outline-none focus:border-emerald-500/40"
                        placeholder="如 0.0125"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">
                        盈亏
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        value={returnForm.pnl}
                        onChange={event =>
                          setReturnForm(previous => ({
                            ...previous,
                            pnl: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-white/[0.12] bg-black/20 px-3 py-2 text-sm outline-none focus:border-emerald-500/40"
                        placeholder="如 0.85 或 -0.12"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isAddingReturn}
                    className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-50"
                  >
                    {isAddingReturn ? "保存中..." : "新增收益率"}
                  </button>
                </form>

                <div className="glass-card overflow-hidden">
                  <div className="p-4 border-b border-white/[0.06]">
                    <h3 className="text-sm font-semibold text-foreground">
                      已保存收益率
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/[0.06] text-muted-foreground">
                          <th className="text-left font-medium px-4 py-2.5">
                            时间
                          </th>
                          <th className="text-right font-medium px-4 py-2.5">
                            收益率
                          </th>
                          <th className="text-right font-medium px-4 py-2.5">
                            盈亏
                          </th>
                          <th className="text-right font-medium px-4 py-2.5">
                            操作
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {returnRecords.map(record => {
                          const isProfit = record.pnl >= 0;
                          const isEditing = editingReturnId === record.id;
                          return (
                            <tr
                              key={record.id}
                              className="border-b border-white/[0.04]"
                            >
                              <td className="px-4 py-2.5">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editingReturnForm.time}
                                    onChange={event =>
                                      setEditingReturnForm(previous => ({
                                        ...previous,
                                        time: event.target.value,
                                      }))
                                    }
                                    className="w-full rounded-md border border-white/[0.12] bg-black/20 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-500/40"
                                    placeholder="如 2026-03-02 至 2026-03-08"
                                    required
                                  />
                                ) : (
                                  <span className="font-mono text-xs text-muted-foreground">
                                    {record.time}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    step="0.0001"
                                    value={editingReturnForm.returnRate}
                                    onChange={event =>
                                      setEditingReturnForm(previous => ({
                                        ...previous,
                                        returnRate: event.target.value,
                                      }))
                                    }
                                    className="w-28 rounded-md border border-white/[0.12] bg-black/20 px-2.5 py-1.5 text-sm text-right outline-none focus:border-emerald-500/40"
                                    required
                                  />
                                ) : (
                                  <span
                                    className={`font-mono ${
                                      record.returnRate >= 0
                                        ? "text-emerald-400"
                                        : "text-rose-400"
                                    }`}
                                  >
                                    {formatSignedPercent(record.returnRate, 4)}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    step="0.0001"
                                    value={editingReturnForm.pnl}
                                    onChange={event =>
                                      setEditingReturnForm(previous => ({
                                        ...previous,
                                        pnl: event.target.value,
                                      }))
                                    }
                                    className="w-28 rounded-md border border-white/[0.12] bg-black/20 px-2.5 py-1.5 text-sm text-right outline-none focus:border-emerald-500/40"
                                    required
                                  />
                                ) : (
                                  <span
                                    className={`font-mono ${
                                      isProfit
                                        ? "text-emerald-400"
                                        : "text-rose-400"
                                    }`}
                                  >
                                    {formatSignedDollar(record.pnl, 4)}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                {isEditing ? (
                                  <div className="inline-flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleSaveReturnEdit(record.id)
                                      }
                                      disabled={isUpdatingReturn}
                                      className="rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-300 disabled:opacity-50"
                                    >
                                      保存
                                    </button>
                                    <button
                                      type="button"
                                      onClick={cancelEditReturn}
                                      className="rounded-md border border-white/[0.12] px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                                    >
                                      取消
                                    </button>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => startEditReturn(record)}
                                      className="rounded-md border border-sky-500/35 bg-sky-500/10 px-2.5 py-1 text-xs text-sky-300"
                                    >
                                      编辑
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleDeleteReturn(record.id)
                                      }
                                      disabled={deletingReturnId === record.id}
                                      className="rounded-md border border-rose-500/35 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-300 disabled:opacity-50"
                                    >
                                      删除
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : activeView === "allocations" ? (
              <div className="space-y-4">
                <form
                  onSubmit={handleAddAllocation}
                  className="glass-card p-5 space-y-4"
                >
                  <h2 className="text-base font-semibold">资产配置详情</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">
                        合约
                      </label>
                      <input
                        type="text"
                        value={allocationForm.contract}
                        onChange={event =>
                          setAllocationForm(previous => ({
                            ...previous,
                            contract: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-white/[0.12] bg-black/20 px-3 py-2 text-sm outline-none focus:border-emerald-500/40"
                        placeholder="如 BTC合约"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">
                        资产量
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={allocationForm.amount}
                        onChange={event =>
                          setAllocationForm(previous => ({
                            ...previous,
                            amount: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-white/[0.12] bg-black/20 px-3 py-2 text-sm outline-none focus:border-emerald-500/40"
                        placeholder="如 31325"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isAddingAllocation}
                    className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-50"
                  >
                    {isAddingAllocation ? "保存中..." : "新增配置"}
                  </button>
                </form>

                <div className="glass-card overflow-hidden">
                  <div className="p-4 border-b border-white/[0.06]">
                    <h3 className="text-sm font-semibold text-foreground">
                      配置详情（CRUD）
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/[0.06] text-muted-foreground">
                          <th className="text-left font-medium px-4 py-2.5">
                            合约
                          </th>
                          <th className="text-right font-medium px-4 py-2.5">
                            资产量
                          </th>
                          <th className="text-right font-medium px-4 py-2.5">
                            操作
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {allocationRecords.map(record => {
                          const isEditing = editingAllocationId === record.id;
                          return (
                            <tr
                              key={record.id}
                              className="border-b border-white/[0.04]"
                            >
                              <td className="px-4 py-2.5">
                                {isEditing ? (
                                  <input
                                    value={editingAllocationForm.contract}
                                    onChange={event =>
                                      setEditingAllocationForm(previous => ({
                                        ...previous,
                                        contract: event.target.value,
                                      }))
                                    }
                                    className="w-full rounded-md border border-white/[0.12] bg-black/20 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-500/40"
                                  />
                                ) : (
                                  <span className="text-foreground">
                                    {record.contract}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={editingAllocationForm.amount}
                                    onChange={event =>
                                      setEditingAllocationForm(previous => ({
                                        ...previous,
                                        amount: event.target.value,
                                      }))
                                    }
                                    className="w-32 rounded-md border border-white/[0.12] bg-black/20 px-2.5 py-1.5 text-sm text-right outline-none focus:border-emerald-500/40"
                                  />
                                ) : (
                                  <span className="font-mono text-foreground">
                                    {formatCurrency(record.amount)}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                {isEditing ? (
                                  <div className="inline-flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleSaveAllocationEdit(record.id)
                                      }
                                      disabled={isUpdatingAllocation}
                                      className="rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-300 disabled:opacity-50"
                                    >
                                      保存
                                    </button>
                                    <button
                                      type="button"
                                      onClick={cancelEditAllocation}
                                      className="rounded-md border border-white/[0.12] px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                                    >
                                      取消
                                    </button>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        startEditAllocation(record)
                                      }
                                      className="rounded-md border border-sky-500/35 bg-sky-500/10 px-2.5 py-1 text-xs text-sky-300"
                                    >
                                      编辑
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleDeleteAllocation(record.id)
                                      }
                                      disabled={
                                        deletingAllocationId === record.id
                                      }
                                      className="rounded-md border border-rose-500/35 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-300 disabled:opacity-50"
                                    >
                                      删除
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : activeView === "expenses" ? (
              <div className="space-y-4">
                <form
                  onSubmit={handleAddExpense}
                  className="glass-card p-5 space-y-4"
                >
                  <h2 className="text-base font-semibold">开支记录</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">
                        时间
                      </label>
                      <input
                        type="datetime-local"
                        value={expenseForm.time}
                        onChange={event =>
                          setExpenseForm(previous => ({
                            ...previous,
                            time: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-white/[0.12] bg-black/20 px-3 py-2 text-sm outline-none focus:border-emerald-500/40"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">
                        开支分类
                      </label>
                      <input
                        type="text"
                        value={expenseForm.category}
                        onChange={event =>
                          setExpenseForm(previous => ({
                            ...previous,
                            category: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-white/[0.12] bg-black/20 px-3 py-2 text-sm outline-none focus:border-emerald-500/40"
                        placeholder="如 服务器、推广"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">
                        金额
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={expenseForm.amount}
                        onChange={event =>
                          setExpenseForm(previous => ({
                            ...previous,
                            amount: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-white/[0.12] bg-black/20 px-3 py-2 text-sm outline-none focus:border-emerald-500/40"
                        placeholder="如 520"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isAddingExpense}
                    className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-50"
                  >
                    {isAddingExpense ? "保存中..." : "新增开支"}
                  </button>
                </form>

                <div className="glass-card overflow-hidden">
                  <div className="p-4 border-b border-white/[0.06]">
                    <h3 className="text-sm font-semibold text-foreground">
                      已保存开支记录
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/[0.06] text-muted-foreground">
                          <th className="text-left font-medium px-4 py-2.5">
                            时间
                          </th>
                          <th className="text-left font-medium px-4 py-2.5">
                            开支分类
                          </th>
                          <th className="text-right font-medium px-4 py-2.5">
                            金额
                          </th>
                          <th className="text-right font-medium px-4 py-2.5">
                            操作
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenseRecords.map(record => {
                          const isEditing = editingExpenseId === record.id;
                          return (
                            <tr
                              key={record.id}
                              className="border-b border-white/[0.04]"
                            >
                              <td className="px-4 py-2.5">
                                {isEditing ? (
                                  <input
                                    type="datetime-local"
                                    value={editingExpenseForm.time}
                                    onChange={event =>
                                      setEditingExpenseForm(previous => ({
                                        ...previous,
                                        time: event.target.value,
                                      }))
                                    }
                                    className="w-full rounded-md border border-white/[0.12] bg-black/20 px-2.5 py-1.5 text-xs font-mono outline-none focus:border-emerald-500/40"
                                    required
                                  />
                                ) : (
                                  <span className="font-mono text-xs text-muted-foreground">
                                    {record.time}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2.5">
                                {isEditing ? (
                                  <input
                                    value={editingExpenseForm.category}
                                    onChange={event =>
                                      setEditingExpenseForm(previous => ({
                                        ...previous,
                                        category: event.target.value,
                                      }))
                                    }
                                    className="w-full rounded-md border border-white/[0.12] bg-black/20 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-500/40"
                                    required
                                  />
                                ) : (
                                  <span className="text-foreground">
                                    {record.category}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={editingExpenseForm.amount}
                                    onChange={event =>
                                      setEditingExpenseForm(previous => ({
                                        ...previous,
                                        amount: event.target.value,
                                      }))
                                    }
                                    className="w-32 rounded-md border border-white/[0.12] bg-black/20 px-2.5 py-1.5 text-sm text-right outline-none focus:border-emerald-500/40"
                                    required
                                  />
                                ) : (
                                  <span className="font-mono text-rose-400">
                                    ${record.amount.toLocaleString()}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                {isEditing ? (
                                  <div className="inline-flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleSaveExpenseEdit(record.id)
                                      }
                                      disabled={isUpdatingExpense}
                                      className="rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-300 disabled:opacity-50"
                                    >
                                      保存
                                    </button>
                                    <button
                                      type="button"
                                      onClick={cancelEditExpense}
                                      className="rounded-md border border-white/[0.12] px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                                    >
                                      取消
                                    </button>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => startEditExpense(record)}
                                      className="rounded-md border border-sky-500/35 bg-sky-500/10 px-2.5 py-1 text-xs text-sky-300"
                                    >
                                      编辑
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleDeleteExpense(record.id)
                                      }
                                      disabled={deletingExpenseId === record.id}
                                      className="rounded-md border border-rose-500/35 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-300 disabled:opacity-50"
                                    >
                                      删除
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : activeView === "donations" ? (
              <div className="space-y-4">
                <form
                  onSubmit={handleAddDonation}
                  className="glass-card p-5 space-y-4"
                >
                  <h2 className="text-base font-semibold">捐款记录</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">
                        时间
                      </label>
                      <input
                        type="date"
                        value={donationForm.time}
                        onChange={event =>
                          setDonationForm(previous => ({
                            ...previous,
                            time: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-white/[0.12] bg-black/20 px-3 py-2 text-sm outline-none focus:border-emerald-500/40"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">
                        捐款额
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={donationForm.amount}
                        onChange={event =>
                          setDonationForm(previous => ({
                            ...previous,
                            amount: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-white/[0.12] bg-black/20 px-3 py-2 text-sm outline-none focus:border-emerald-500/40"
                        placeholder="如 520"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isAddingDonation}
                    className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-50"
                  >
                    {isAddingDonation ? "保存中..." : "新增捐款"}
                  </button>
                </form>

                <div className="glass-card overflow-hidden">
                  <div className="p-4 border-b border-white/[0.06]">
                    <h3 className="text-sm font-semibold text-foreground">
                      已保存捐款记录
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/[0.06] text-muted-foreground">
                          <th className="text-left font-medium px-4 py-2.5">
                            时间
                          </th>
                          <th className="text-right font-medium px-4 py-2.5">
                            捐款额
                          </th>
                          <th className="text-right font-medium px-4 py-2.5">
                            操作
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {donationRecords.map(record => {
                          const isEditing = editingDonationId === record.id;
                          return (
                            <tr
                              key={record.id}
                              className="border-b border-white/[0.04]"
                            >
                              <td className="px-4 py-2.5">
                                {isEditing ? (
                                  <input
                                    type="date"
                                    value={editingDonationForm.time}
                                    onChange={event =>
                                      setEditingDonationForm(previous => ({
                                        ...previous,
                                        time: event.target.value,
                                      }))
                                    }
                                    className="w-full rounded-md border border-white/[0.12] bg-black/20 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-500/40"
                                    required
                                  />
                                ) : (
                                  <span className="font-mono text-xs text-muted-foreground">
                                    {record.time}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={editingDonationForm.amount}
                                    onChange={event =>
                                      setEditingDonationForm(previous => ({
                                        ...previous,
                                        amount: event.target.value,
                                      }))
                                    }
                                    className="w-28 rounded-md border border-white/[0.12] bg-black/20 px-2.5 py-1.5 text-sm text-right outline-none focus:border-emerald-500/40"
                                    required
                                  />
                                ) : (
                                  <span className="font-mono text-emerald-400">
                                    ${record.amount.toLocaleString()}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                {isEditing ? (
                                  <div className="inline-flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleSaveDonationEdit(record.id)
                                      }
                                      disabled={isUpdatingDonation}
                                      className="rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-300 disabled:opacity-50"
                                    >
                                      保存
                                    </button>
                                    <button
                                      type="button"
                                      onClick={cancelEditDonation}
                                      className="rounded-md border border-white/[0.12] px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                                    >
                                      取消
                                    </button>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => startEditDonation(record)}
                                      className="rounded-md border border-sky-500/35 bg-sky-500/10 px-2.5 py-1 text-xs text-sky-300"
                                    >
                                      编辑
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleDeleteDonation(record.id)
                                      }
                                      disabled={
                                        deletingDonationId === record.id
                                      }
                                      className="rounded-md border border-rose-500/35 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-300 disabled:opacity-50"
                                    >
                                      删除
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
