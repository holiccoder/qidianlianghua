/**
 * DataCard - 数据展示卡片组件
 * 设计风格：深色玻璃拟态，带图标徽章和发光数字
 */
import { motion } from "framer-motion";
import {
  DollarSign, TrendingUp, TrendingDown, BarChart3, Wallet,
  Flame, Users, PieChart, Heart, Bot, Shield, Eye, RefreshCw,
  Activity, Coins, ArrowUpRight, ArrowDownRight, type LucideIcon
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  DollarSign, TrendingUp, TrendingDown, BarChart3, Wallet,
  Flame, Users, PieChart, Heart, Bot, Shield, Eye, RefreshCw,
  Activity, Coins, ArrowUpRight, ArrowDownRight,
};

const colorMap: Record<string, string> = {
  emerald: "bg-emerald-500/15 text-emerald-400",
  amber: "bg-amber-500/15 text-amber-400",
  blue: "bg-sky-500/15 text-sky-400",
  red: "bg-rose-500/15 text-rose-400",
  purple: "bg-purple-500/15 text-purple-400",
};

const glowMap: Record<string, string> = {
  emerald: "glow-emerald",
  amber: "glow-amber",
  blue: "glow-blue",
  red: "glow-red",
  purple: "text-purple-400",
};

interface DataCardProps {
  label: string;
  value: string;
  subtitle?: string;
  icon?: string;
  color?: "emerald" | "amber" | "blue" | "red" | "purple";
  delay?: number;
}

export default function DataCard({
  label,
  value,
  subtitle,
  icon = "DollarSign",
  color = "emerald",
  delay = 0,
}: DataCardProps) {
  const Icon = iconMap[icon] || DollarSign;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="glass-card p-5 relative group"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
      </div>
      <div className={`data-number text-2xl md:text-3xl ${glowMap[color]} mb-1`}>
        {value}
      </div>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      )}
    </motion.div>
  );
}
