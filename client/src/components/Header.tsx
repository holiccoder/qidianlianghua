/**
 * Header - 顶部导航栏
 * 设计风格：左侧LOGO + 标签栏靠左，右侧社交链接（Telegram、X、币安广场）
 */
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  FileText,
  TrendingUp,
  RefreshCw,
  Receipt,
  PieChart,
  Heart,
  Info,
  Menu,
  X,
  Zap,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

const env = import.meta.env as Record<string, string | undefined>;

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  FileText,
  TrendingUp,
  RefreshCw,
  Receipt,
  PieChart,
  Heart,
  Info,
  Zap,
  Users,
};

interface Tab {
  id: string;
  label: string;
  icon: string;
}

interface HeaderProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

/* Telegram SVG icon */
function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

/* X (Twitter) SVG icon */
function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/* Binance Square SVG icon */
function BinanceIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0L7.172 4.828l1.414 1.414L12 2.828l3.414 3.414 1.414-1.414L12 0zM4.828 7.172L0 12l4.828 4.828 1.414-1.414L2.828 12l3.414-3.414-1.414-1.414zM19.172 7.172l-1.414 1.414L21.172 12l-3.414 3.414 1.414 1.414L24 12l-4.828-4.828zM12 8.828L8.828 12 12 15.172 15.172 12 12 8.828zM12 21.172l-3.414-3.414-1.414 1.414L12 24l4.828-4.828-1.414-1.414L12 21.172z" />
    </svg>
  );
}

interface PublicSettingsResponse {
  socialTelegramUrl?: string;
  socialXUrl?: string;
  socialBinanceUrl?: string;
}

export default function Header({ tabs, activeTab, onTabChange }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [socialConfig, setSocialConfig] = useState(() => ({
    socialTelegramUrl: env.VITE_SOCIAL_TELEGRAM_URL?.trim() || "#",
    socialXUrl: env.VITE_SOCIAL_X_URL?.trim() || "#",
    socialBinanceUrl: env.VITE_SOCIAL_BINANCE_URL?.trim() || "#",
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

        setSocialConfig(previous => ({
          socialTelegramUrl:
            payload.socialTelegramUrl?.trim() || previous.socialTelegramUrl,
          socialXUrl: payload.socialXUrl?.trim() || previous.socialXUrl,
          socialBinanceUrl:
            payload.socialBinanceUrl?.trim() || previous.socialBinanceUrl,
        }));
      } catch {
        // Keep fallback links when request fails.
      }
    }

    void loadSettings();

    return () => {
      isDisposed = true;
    };
  }, []);

  const socialLinks = [
    {
      name: "Telegram",
      href: socialConfig.socialTelegramUrl,
      icon: TelegramIcon,
      showLabel: true,
    },
    {
      name: "X",
      href: socialConfig.socialXUrl,
      icon: XIcon,
      showLabel: false,
    },
    {
      name: "币安广场",
      href: socialConfig.socialBinanceUrl,
      icon: BinanceIcon,
      showLabel: true,
    },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0b1120]/90 backdrop-blur-xl">
      <div className="container">
        <div className="relative flex items-center justify-between h-16">
          {/* Left side: Logo + Nav tabs */}
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-9 h-9 rounded-lg overflow-hidden border border-emerald-500/30 bg-emerald-500/10">
                <img
                  src="/logo.png"
                  alt="虾交易 Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="leading-tight">
                <h1 className="text-sm font-bold text-foreground tracking-tight">
                  虾交易
                </h1>
                <p className="text-[10px] text-muted-foreground">
                  AI交易实验室
                </p>
              </div>
            </div>

            {/* Desktop Navigation - pill tabs, next to logo */}
            <nav className="hidden lg:flex lg:absolute lg:left-1/2 lg:-translate-x-1/2 items-center gap-1 bg-white/[0.04] rounded-xl p-1 border border-white/[0.06]">
              {tabs.map(tab => {
                const Icon = iconMap[tab.icon] || LayoutDashboard;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "text-emerald-400"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-emerald-500/10 border border-emerald-500/20 rounded-lg"
                        transition={{
                          type: "spring",
                          bounce: 0.2,
                          duration: 0.6,
                        }}
                      />
                    )}
                    <Icon className="w-3.5 h-3.5 relative z-10" />
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right side: Social links */}
          <div className="hidden lg:flex items-center gap-2">
            {socialLinks.map(link => {
              const SocialIcon = link.icon;
              return (
                <a
                  key={link.name}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-all duration-200"
                  title={link.name}
                >
                  <SocialIcon className="w-4 h-4" />
                  {link.showLabel ? (
                    <span className="text-xs font-medium">{link.name}</span>
                  ) : null}
                </a>
              );
            })}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-muted-foreground hover:text-foreground"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden pb-4 border-t border-white/[0.06] pt-3 space-y-3"
          >
            {/* Tab navigation */}
            <div className="grid grid-cols-4 gap-2">
              {tabs.map(tab => {
                const Icon = iconMap[tab.icon] || LayoutDashboard;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      onTabChange(tab.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
            {/* Social links in mobile */}
            <div className="flex items-center justify-center gap-4 pt-2 border-t border-white/[0.06]">
              {socialLinks.map(link => {
                const SocialIcon = link.icon;
                return (
                  <a
                    key={link.name}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-all"
                    title={link.name}
                  >
                    <SocialIcon className="w-4 h-4" />
                    {link.showLabel ? (
                      <span className="text-xs font-medium">{link.name}</span>
                    ) : null}
                  </a>
                );
              })}
            </div>
          </motion.nav>
        )}
      </div>
    </header>
  );
}
