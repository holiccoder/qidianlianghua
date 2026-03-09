import { useState, useEffect, useCallback } from 'react';

export const WALLET_ADDRESS = '0xb495D301be067166e3cb9890D615508eB1C38186';
export const CONTRACT_ADDRESS = '0x1094814045fe0c29023df28698ca539296cf7777';
const DEAD_ADDRESS = '0x000000000000000000000000000000000000dead';

// drpc.org supports eth_getLogs with up to 10000 block range on free tier
const LOG_RPC_URLS = [
  'https://bsc.drpc.org',
  'https://bsc-rpc.publicnode.com',
];

// Binance nodes for simple queries (balance, block number)
const BALANCE_RPC_ENDPOINTS = [
  'https://bsc-dataseed.binance.org:443',
  'https://bsc-dataseed1.defibit.io:443',
  'https://bsc.drpc.org',
];

// ERC20 Transfer event topic
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

export interface BurnRecord {
  time: string;
  txHash: string;
  burnAmount: string;
  burnAmountRaw: number;
  blockNumber: number;
  timestamp: number;
}

export interface WalletInfo {
  bnbBalance: string;
  loading: boolean;
  error?: string;
  lastUpdated: Date;
}

function padAddress(address: string): string {
  return '0x' + address.slice(2).toLowerCase().padStart(64, '0');
}

export function formatTokenAmount(amount: number): string {
  if (amount >= 1e9) return (amount / 1e9).toFixed(1) + 'B';
  if (amount >= 1e6) return (amount / 1e6).toFixed(1) + 'M';
  if (amount >= 1e3) return (amount / 1e3).toFixed(1) + 'K';
  return amount.toFixed(0);
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

async function rpcCall(url: string, method: string, params: unknown[]): Promise<unknown> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
      signal: controller.signal,
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message || 'RPC error');
    return data.result;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function balanceRpcCall(method: string, params: unknown[]): Promise<unknown> {
  for (const url of BALANCE_RPC_ENDPOINTS) {
    try {
      return await rpcCall(url, method, params);
    } catch {
      continue;
    }
  }
  throw new Error('All RPC endpoints failed');
}

async function logRpcCall(method: string, params: unknown[]): Promise<unknown> {
  for (const url of LOG_RPC_URLS) {
    try {
      return await rpcCall(url, method, params);
    } catch {
      continue;
    }
  }
  throw new Error('All log RPC endpoints failed');
}

export function useWalletInfo() {
  const [walletInfo, setWalletInfo] = useState<WalletInfo>({
    bnbBalance: '0',
    loading: true,
    lastUpdated: new Date(),
  });

  const fetchBalance = useCallback(async () => {
    try {
      const result = await balanceRpcCall('eth_getBalance', [WALLET_ADDRESS, 'latest']);
      const balanceInWei = BigInt(result as string);
      const balanceInBNB = Number(balanceInWei) / 1e18;
      setWalletInfo({
        bnbBalance: balanceInBNB.toFixed(4),
        loading: false,
        lastUpdated: new Date(),
      });
    } catch (error) {
      console.error('Error fetching balance:', error);
      setWalletInfo(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to fetch balance',
      }));
    }
  }, []);

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  return { walletInfo, refreshBalance: fetchBalance };
}

export function useBurnRecords() {
  const [records, setRecords] = useState<BurnRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalBurned, setTotalBurned] = useState(0);

  const fetchBurnRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current block number
      const currentBlockHex = await balanceRpcCall('eth_blockNumber', []) as string;
      const currentBlock = parseInt(currentBlockHex, 16);

      // drpc.org free tier: max 10000 blocks per query
      // BSC: ~1 block per 3 seconds, so 9999 blocks ≈ 8.3 hours
      // 12 batches ≈ 4 days of data
      const batchSize = 9999;
      const numBatches = 12;
      const allLogs: Array<{
        transactionHash: string;
        blockNumber: string;
        data: string;
        topics: string[];
      }> = [];

      const walletPadded = padAddress(WALLET_ADDRESS);
      const deadPadded = padAddress(DEAD_ADDRESS);

      for (let i = 0; i < numBatches; i++) {
        const toBlock = currentBlock - (i * batchSize);
        const fromBlock = toBlock - batchSize;

        if (fromBlock < 0) break;

        try {
          const logs = await logRpcCall('eth_getLogs', [{
            fromBlock: '0x' + fromBlock.toString(16),
            toBlock: '0x' + toBlock.toString(16),
            address: CONTRACT_ADDRESS,
            topics: [
              TRANSFER_TOPIC,
              walletPadded,
              deadPadded,
            ],
          }]) as Array<{
            transactionHash: string;
            blockNumber: string;
            data: string;
            topics: string[];
          }>;

          if (logs && logs.length > 0) {
            allLogs.push(...logs);
          }
        } catch (err) {
          console.warn(`Batch ${i} failed:`, err);
          continue;
        }

        // Small delay between batches to avoid rate limiting
        if (i < numBatches - 1) {
          await new Promise(r => setTimeout(r, 300));
        }
      }

      if (allLogs.length === 0) {
        setRecords([]);
        setTotalBurned(0);
        setLoading(false);
        return;
      }

      // Get block timestamps for unique blocks
      const blockMap = new Map<string, number>();
      const uniqueBlockNums = Array.from(new Set(allLogs.map(l => l.blockNumber)));

      // Fetch timestamps in parallel (limit concurrency to 5)
      const batchTimestampSize = 5;
      for (let i = 0; i < uniqueBlockNums.length; i += batchTimestampSize) {
        const batch = uniqueBlockNums.slice(i, i + batchTimestampSize);
        await Promise.allSettled(
          batch.map(async (blockNum) => {
            try {
              const block = await logRpcCall('eth_getBlockByNumber', [blockNum, false]) as {
                timestamp: string;
              } | null;
              if (block) {
                blockMap.set(blockNum, parseInt(block.timestamp, 16));
              }
            } catch {
              // Use approximate timestamp based on block number
              const blockDiff = currentBlock - parseInt(blockNum, 16);
              const approxTimestamp = Math.floor(Date.now() / 1000) - (blockDiff * 3);
              blockMap.set(blockNum, approxTimestamp);
            }
          })
        );
        // Delay between batches
        if (i + batchTimestampSize < uniqueBlockNums.length) {
          await new Promise(r => setTimeout(r, 300));
        }
      }

      // Process logs into records
      let totalBurnedAmount = 0;
      const processedRecords: BurnRecord[] = allLogs.map(log => {
        const blockNumber = parseInt(log.blockNumber, 16);
        const timestamp = blockMap.get(log.blockNumber) || (() => {
          const blockDiff = currentBlock - blockNumber;
          return Math.floor(Date.now() / 1000) - (blockDiff * 3);
        })();
        const tokenAmount = log.data === '0x' ? 0 : Number(BigInt(log.data)) / 1e18;
        totalBurnedAmount += tokenAmount;

        return {
          time: formatDate(timestamp),
          txHash: log.transactionHash,
          burnAmount: formatTokenAmount(tokenAmount),
          burnAmountRaw: tokenAmount,
          blockNumber,
          timestamp,
        };
      });

      // Sort newest first
      processedRecords.sort((a, b) => b.timestamp - a.timestamp);

      setRecords(processedRecords);
      setTotalBurned(totalBurnedAmount);
    } catch (err) {
      console.error('Error fetching burn records:', err);
      setError('获取销毁记录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBurnRecords();
    const interval = setInterval(fetchBurnRecords, 60000);
    return () => clearInterval(interval);
  }, [fetchBurnRecords]);

  return { records, loading, error, refresh: fetchBurnRecords, totalBurned };
}
