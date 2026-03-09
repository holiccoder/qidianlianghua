/**
 * Home - 奇点量化 AI交易实验室 主页面
 * 设计风格：量化交易控制台（Quant Trading Console）
 * - 深海蓝黑背景，玻璃拟态卡片
 * - 翡翠绿/琥珀金/天蓝/珊瑚红颜色编码
 * - JetBrains Mono等宽字体用于数据
 * - pill形标签导航，卡片入场动画
 */
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Header from "@/components/Header";
import ContractAddress from "@/components/ContractAddress";
import SingularityTab from "@/components/tabs/SingularityTab";
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
  trades: TradesTab,
  returns: ReturnsTab,
  buyback: BuybackTab,
  expenses: ExpensesTab,
  allocation: AllocationTab,
  donation: DonationTab,
};

export default function Home() {
  const [activeTab, setActiveTab] = useState("singularity");

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
          tabs={navTabs}
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
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-emerald-400"
                  >
                    <path
                      d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span className="text-xs text-muted-foreground">
                  奇点量化 AI交易实验室
                </span>
              </div>
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
