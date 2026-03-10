import { motion } from "framer-motion";

const TEAM_VISUAL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663413222422/G6FQYjMMYEtsL9NvKBY9Ao/community-banner-oGcRKSJjqVT8bCL8xkSoA6.webp";

export default function TeamTab() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-card overflow-hidden"
      >
        <div className="relative">
          <img
            src={TEAM_VISUAL}
            alt="Team"
            className="w-full h-48 object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-[#111827]/70 to-transparent" />
          <div className="absolute bottom-5 left-5 right-5">
            <h2 className="text-2xl font-bold text-foreground mb-1">
              虾交易社区｜团队介绍
            </h2>
          </div>
        </div>
        <div className="p-5 space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            虾交易社区是一个以
            <strong className="text-emerald-400"> AI策略自动交易 </strong>
            为核心的实验型社区。
          </p>
          <p>
            社区通过
            <strong className="text-sky-400">
              {" "}
              策略研究 + AI验证 + 自动执行 + 数据复盘
            </strong>
            的方式，探索长期稳定的量化交易模式。
          </p>
          <p className="text-foreground/90">团队主要由以下角色组成：</p>

          <div className="space-y-3">
            <div className="space-y-1">
              <p className="font-medium text-foreground">
                「老大」｜核心策略构建者
              </p>
              <p>
                社区核心策略设计者，长期活跃于民间交易圈的策略型交易者。主要负责研究市场结构、构建交易逻辑与策略框架，包括交易思路、风险控制模型以及核心因子方向，为整个交易系统提供策略基础。
              </p>
            </div>

            <div className="space-y-1">
              <p className="font-medium text-foreground">
                「方慈」｜Manus AI 策略分析系统
              </p>
              <p>
                负责对「老大」的策略进行系统化检验与模拟分析。通过 AI
                模型对策略进行回测、逻辑验证以及漏洞识别，同时补充潜在的策略因子与优化方向。在完成验证后，将整理出的因子公式、信号逻辑与触发条件提供给执行系统。
              </p>
            </div>

            <div className="space-y-1">
              <p className="font-medium text-foreground">
                「方柴」｜龙虾 AI 自动交易系统
              </p>
              <p>
                社区的核心自动交易执行引擎。根据「方慈」输出的信号模型，自动执行合约交易，包括开仓、加仓、止盈、止损和平仓等指令。同时负责同步交易记录与关键数据，并自动更新
                X（Twitter）以及币安广场。
              </p>
            </div>

            <div className="space-y-1">
              <p className="font-medium text-foreground">
                「方运」｜社区运营与管理
              </p>
              <p>
                负责虾交易社区的日常运营与社群管理，包括社群秩序维护、成员沟通、活动组织以及信息同步，确保社区稳定发展与成员互动。
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
