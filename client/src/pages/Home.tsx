/**
 * Home - 虾交易 AI交易实验室 主页面
 * 设计风格：量化交易控制台（Quant Trading Console）
 * - 深海蓝黑背景，玻璃拟态卡片
 * - 翡翠绿/琥珀金/天蓝/珊瑚红颜色编码
 * - JetBrains Mono等宽字体用于数据
 * - pill形标签导航，卡片入场动画
 */
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Header from "@/components/Header";
import ContractAddress from "@/components/ContractAddress";
import SingularityTab from "@/components/tabs/SingularityTab";
import TeamTab from "@/components/tabs/TeamTab";
import TradesTab from "@/components/tabs/TradesTab";
import ReturnsTab from "@/components/tabs/ReturnsTab";
import BuybackTab from "@/components/tabs/BuybackTab";
import ExpensesTab from "@/components/tabs/ExpensesTab";
import AllocationTab from "@/components/tabs/AllocationTab";
import DonationTab from "@/components/tabs/DonationTab";
import { navTabs } from "@/lib/data";

const HERO_BG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663413222422/G6FQYjMMYEtsL9NvKBY9Ao/hero-bg-fQFSF5D5gZHPKwbcq2GEQL.webp";

const tabComponents: Record<string, React.ComponentType> = {
  singularity: SingularityTab,
  team: TeamTab,
  trades: TradesTab,
  returns: ReturnsTab,
  buyback: BuybackTab,
  expenses: ExpensesTab,
  allocation: AllocationTab,
  donation: DonationTab,
};

interface PublicSettingsResponse {
  tokenContractAddress?: string;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState("singularity");
  const [hasTokenContractAddress, setHasTokenContractAddress] = useState(false);

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

        setHasTokenContractAddress(
          Boolean(payload.tokenContractAddress?.trim().length)
        );
      } catch {
        // Keep current tab visibility when request fails.
      }
    }

    void loadSettings();

    return () => {
      isDisposed = true;
    };
  }, []);

  const visibleTabs = useMemo(
    () =>
      navTabs.filter(tab => tab.id !== "buyback" || hasTokenContractAddress),
    [hasTokenContractAddress]
  );

  useEffect(() => {
    if (activeTab === "buyback" && !hasTokenContractAddress) {
      setActiveTab("singularity");
    }
  }, [activeTab, hasTokenContractAddress]);

  const ActiveComponent = tabComponents[activeTab] || SingularityTab;

  return (
    <div className="min-h-screen relative">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[#0b1120]" />
        <img
          src={HERO_BG}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-[0.07] mix-blend-screen"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0b1120]/50 to-[#0b1120]" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <Header
          tabs={visibleTabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <main className="container py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <ActiveComponent />
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Contract Address Card - fixed at bottom */}
        {activeTab === "singularity" ? (
          <div className="container pb-6">
            <ContractAddress />
          </div>
        ) : null}

        {/* Footer */}
        <footer className="relative z-10 border-t border-white/[0.06]">
          <div className="container py-6">
            <div className="flex items-center justify-center">
              <p className="text-xs text-muted-foreground">
                AI 交易 · 社区增长 · 公益行动
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
