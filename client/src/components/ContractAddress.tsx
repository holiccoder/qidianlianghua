import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { contractAddress } from "@/lib/data";

const bscScanUrl = `https://bscscan.com/address/${contractAddress}`;

export default function ContractAddress() {
  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(contractAddress);
      toast.success("合约地址已复制到剪贴板");
    } catch {
      toast.error("复制失败，请手动复制");
    }
  }

  return (
    <section className="glass-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-white whitespace-nowrap text-center lg:px-2">
          奇点量化 CA
        </p>

        <div className="w-fit max-w-full rounded-lg border border-white/[0.08] bg-black/20 px-3 py-2">
          <p className="font-mono text-xs sm:text-sm text-emerald-300 break-all">
            {contractAddress}
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 shrink-0">
          <button
            type="button"
            onClick={copyAddress}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.12] px-3 py-2 text-xs font-medium text-foreground hover:bg-white/[0.06] transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            复制
          </button>
          <a
            href={bscScanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-500/15 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            BscScan
          </a>
        </div>
      </div>
    </section>
  );
}
