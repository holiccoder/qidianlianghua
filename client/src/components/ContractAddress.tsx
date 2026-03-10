import { Copy, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { contractAddress as defaultContractAddress } from "@/lib/data";

interface PublicSettingsResponse {
  tokenContractAddress?: string;
}

export default function ContractAddress() {
  const [resolvedContractAddress, setResolvedContractAddress] = useState(
    defaultContractAddress
  );

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

        const nextValue =
          typeof payload.tokenContractAddress === "string"
            ? payload.tokenContractAddress.trim()
            : "";
        setResolvedContractAddress(nextValue);
      } catch {
        // Keep fallback address when request fails.
      }
    }

    void loadSettings();

    return () => {
      isDisposed = true;
    };
  }, []);

  const hasContractAddress = resolvedContractAddress.length > 0;
  const bscScanUrl = hasContractAddress
    ? `https://bscscan.com/address/${resolvedContractAddress}`
    : "#";

  async function copyAddress() {
    if (!hasContractAddress) {
      toast.error("当前未设置合约地址");
      return;
    }

    try {
      await navigator.clipboard.writeText(resolvedContractAddress);
      toast.success("合约地址已复制到剪贴板");
    } catch {
      toast.error("复制失败，请手动复制");
    }
  }

  return (
    <section className="glass-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-white whitespace-nowrap text-center lg:px-2">
          虾交易 CA
        </p>

        <div className="w-fit max-w-full rounded-lg border border-white/[0.08] bg-black/20 px-3 py-2">
          <p className="font-mono text-xs sm:text-sm text-emerald-300 break-all">
            {hasContractAddress ? resolvedContractAddress : ""}
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 shrink-0">
          <button
            type="button"
            onClick={copyAddress}
            disabled={!hasContractAddress}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.12] px-3 py-2 text-xs font-medium text-foreground hover:bg-white/[0.06] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Copy className="w-3.5 h-3.5" />
            复制
          </button>
          {hasContractAddress ? (
            <a
              href={bscScanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-500/15 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              BscScan
            </a>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.12] px-3 py-2 text-xs font-medium text-muted-foreground">
              <ExternalLink className="w-3.5 h-3.5" />
              BscScan
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
