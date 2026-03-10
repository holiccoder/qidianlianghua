/**
 * DonationTab - 捐款页面
 * 展示捐款总额和历史记录
 */
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import DataCard from "../DataCard";
import { donationData } from "@/lib/data";
import { Heart, CheckCircle2 } from "lucide-react";

const DONATION_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663413222422/G6FQYjMMYEtsL9NvKBY9Ao/donation-visual-JxXfwDNMZGFeP6x8QRWfYB.webp";

interface DonationRecordRow {
  id: string;
  time: string;
  amount: number;
}

interface PublicSettingsResponse {
  donationTotal?: string;
  donationTarget?: string;
}

function parseAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replaceAll(",", "").replace(/[^0-9+.-]/g, ""));
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function toTimestamp(time: string): number {
  const parsed = new Date(time.replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function normalizeDonationRows(payload: unknown): DonationRecordRow[] {
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
        time?: unknown;
        amount?: unknown;
      };

      if (typeof raw.time !== "string") {
        return null;
      }

      const amount = parseAmount(raw.amount);

      if (amount === null) {
        return null;
      }

      return {
        id: String(raw.id ?? `donation-${index}`),
        time: raw.time,
        amount,
      };
    })
    .filter((item): item is DonationRecordRow => Boolean(item))
    .sort((a, b) => toTimestamp(b.time) - toTimestamp(a.time));
}

function formatAmount(value: number): string {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export default function DonationTab() {
  const [records, setRecords] = useState<DonationRecordRow[]>([]);
  const [donationTotal, setDonationTotal] = useState(
    donationData.totalDonation
  );
  const [donationTarget, setDonationTarget] = useState(
    donationData.donationTarget
  );

  useEffect(() => {
    let isDisposed = false;

    async function loadDonations() {
      try {
        const response = await fetch("/api/donations");
        if (!response.ok) {
          return;
        }

        const payload = await response.json();

        if (isDisposed) {
          return;
        }

        setRecords(normalizeDonationRows(payload));
      } catch {
        // Keep current records when request fails.
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

        const nextDonationTotal = payload.donationTotal?.trim();
        if (nextDonationTotal) {
          setDonationTotal(nextDonationTotal);
        }

        const nextDonationTarget = payload.donationTarget?.trim();
        if (nextDonationTarget) {
          setDonationTarget(nextDonationTarget);
        }
      } catch {
        // Keep fallback donation settings when request fails.
      }
    }

    void loadDonations();
    void loadPublicSettings();

    return () => {
      isDisposed = true;
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* 捐款视觉 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0 }}
        className="glass-card overflow-hidden"
      >
        <div className="relative h-48 overflow-hidden">
          <img
            src={DONATION_IMG}
            alt="慈善捐助"
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-[#111827]/60 to-transparent" />
          <div className="absolute bottom-4 left-5">
            <h3 className="text-lg font-bold text-foreground">慈善捐助</h3>
            <p className="text-sm text-muted-foreground mt-1">
              10% 合约收益用于慈善捐助
            </p>
          </div>
        </div>
      </motion.div>

      {/* 捐款概览 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DataCard
          label="捐款总金额"
          value={donationTotal}
          icon="Heart"
          color="red"
          delay={0.1}
        />
        <DataCard
          label="捐助对象"
          value={donationTarget}
          icon="Users"
          color="amber"
          delay={0.15}
        />
      </div>

      {/* 捐款记录 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="glass-card overflow-hidden"
      >
        <div className="p-5 border-b border-white/[0.06]">
          <h3 className="text-base font-semibold text-foreground">捐款记录</h3>
          <p className="text-xs text-muted-foreground mt-1">
            所有捐款记录公开透明
          </p>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {records.length === 0 ? (
            <div className="p-5 text-sm text-muted-foreground">
              暂无捐款记录
            </div>
          ) : (
            records.map((record, index) => (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.25 + index * 0.05 }}
                className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                    <Heart className="w-4 h-4 text-rose-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {formatAmount(record.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {record.time} · {donationTarget}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                  <CheckCircle2 className="w-3 h-3" />
                  已完成
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
