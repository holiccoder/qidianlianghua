import { execFile } from "node:child_process";

const DEFAULT_DEAD_ADDRESS = "0x000000000000000000000000000000000000dead";
const DEFAULT_BUYBACK_WALLET_ADDRESS =
  "0xb495d301be067166e3cb9890d615508eb1c38186";
const UNKNOWN_WALLET_BALANCE = "--";
const UNAVAILABLE_TOKEN_METRIC_VALUE = "--";
const COINGECKO_API_BASE_URL = "https://api.coingecko.com/api/v3";
const FETCH_TIMEOUT_MS = 12_000;
const CURL_TIMEOUT_SECONDS = 25;
const CURL_MAX_BUFFER_BYTES = 20 * 1024 * 1024;
const REQUEST_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

export const DEFAULT_CONTRACT_ADDRESS =
  "0x1094814045fe0c29023df28698ca539296cf7777";

export interface TokenMetrics {
  contractAddress: string;
  deadAddress: string;
  buybackWalletAddress: string;
  currentPriceUsd: string;
  marketCapUsd: string;
  burnedTotal: string;
  taxWalletBalance: string;
  buybackWalletBalance: string;
  buybackBurnWalletBalance: string;
  updatedAt: string;
}

export interface WalletBalanceMetrics {
  taxWalletBalance: string;
  buybackWalletBalance: string;
  buybackBurnWalletBalance: string;
}

export function createUnavailableTokenMetrics(): TokenMetrics {
  return {
    contractAddress: "",
    deadAddress: DEFAULT_DEAD_ADDRESS,
    buybackWalletAddress: DEFAULT_BUYBACK_WALLET_ADDRESS,
    currentPriceUsd: UNAVAILABLE_TOKEN_METRIC_VALUE,
    marketCapUsd: UNAVAILABLE_TOKEN_METRIC_VALUE,
    burnedTotal: UNAVAILABLE_TOKEN_METRIC_VALUE,
    taxWalletBalance: UNKNOWN_WALLET_BALANCE,
    buybackWalletBalance: UNKNOWN_WALLET_BALANCE,
    buybackBurnWalletBalance: UNKNOWN_WALLET_BALANCE,
    updatedAt: new Date().toISOString(),
  };
}

interface FetchTokenMetricsOptions {
  deadAddress?: string;
  taxWalletAddress?: string;
  buybackWalletAddress?: string;
  buybackBurnWalletAddress?: string;
  proxyUrl?: string;
}

interface FetchTextOptions {
  accept: string;
  proxyUrl?: string;
}

interface CoinGeckoContractResponse {
  id?: string;
  market_data?: {
    max_supply?: number | null;
    circulating_supply?: number | null;
    current_price?: {
      usd?: number | null;
    };
    market_cap?: {
      usd?: number | null;
    };
  };
}

type CoinGeckoSimplePriceResponse = Record<
  string,
  {
    usd?: number;
    usd_market_cap?: number;
  }
>;

function normalizeAddress(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(normalized)) {
    throw new Error(`Invalid address: ${value}`);
  }
  return normalized;
}

function normalizeOptionalAddress(value?: string): string | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  try {
    return normalizeAddress(value);
  } catch {
    return undefined;
  }
}

function normalizeOptionalProxyUrl(value?: string): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

function formatK(value: number): string {
  const formatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatter.format(value / 1_000)}K`;
}

function formatIntegerWithoutDecimals(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Math.trunc(value));
}

function formatBnbBalance(value: number): string {
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value)} BNB`;
}

function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]*>/g, "");
}

function formatUsdFromNumber(value: number): string {
  const normalized = value.toFixed(16).replace(/0+$/, "").replace(/\.$/, "");
  return `$${normalized}`;
}

function execFileText(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      {
        encoding: "utf8",
        maxBuffer: CURL_MAX_BUFFER_BYTES,
      },
      (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(stdout);
      }
    );
  });
}

async function fetchTextWithCurl(
  url: string,
  options: FetchTextOptions
): Promise<string> {
  const args = [
    "-fsSL",
    "--max-time",
    String(CURL_TIMEOUT_SECONDS),
    "-H",
    `Accept: ${options.accept}`,
    "-H",
    `User-Agent: ${REQUEST_USER_AGENT}`,
  ];

  if (options.proxyUrl) {
    args.push("-x", options.proxyUrl);
  }

  args.push(url);

  return execFileText("curl", args);
}

async function fetchText(
  url: string,
  options: FetchTextOptions
): Promise<string> {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => {
    timeoutController.abort();
  }, FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: timeoutController.signal,
      headers: {
        Accept: options.accept,
        "User-Agent": REQUEST_USER_AGENT,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Request failed: ${response.status} ${response.statusText}`
      );
    }

    return response.text();
  } catch (error) {
    if (!options.proxyUrl) {
      throw error;
    }

    return fetchTextWithCurl(url, options);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchJson<T>(
  url: string,
  proxyUrl?: string,
  accept = "application/json"
): Promise<T> {
  const content = await fetchText(url, { accept, proxyUrl });

  try {
    return JSON.parse(content) as T;
  } catch {
    throw new Error(`Unable to parse JSON response from ${url}`);
  }
}

function parseCoinGeckoCoinId(contractData: CoinGeckoContractResponse): string {
  const coinId = contractData.id?.trim();

  if (!coinId) {
    throw new Error("Unable to resolve CoinGecko coin id from contract");
  }

  return coinId;
}

function parseCoinGeckoBurnedTotal(
  contractData: CoinGeckoContractResponse
): string {
  const maxSupply = Number(contractData.market_data?.max_supply);
  const circulatingSupply = Number(
    contractData.market_data?.circulating_supply
  );

  if (!Number.isFinite(maxSupply) || !Number.isFinite(circulatingSupply)) {
    throw new Error("Unable to parse CoinGecko supply data");
  }

  const burnedAmount = Math.max(0, maxSupply - circulatingSupply);

  return formatIntegerWithoutDecimals(burnedAmount);
}

function parseCoinGeckoPriceAndMarketCap(
  coinId: string,
  contractData: CoinGeckoContractResponse,
  simplePriceData: CoinGeckoSimplePriceResponse
): {
  currentPriceUsd: string;
  marketCapUsd: string;
} {
  const simplePayload = simplePriceData[coinId];
  const simplePriceUsd = Number(simplePayload?.usd);
  const simpleMarketCapUsd = Number(simplePayload?.usd_market_cap);

  const fallbackPriceUsd = Number(contractData.market_data?.current_price?.usd);
  const fallbackMarketCapUsd = Number(
    contractData.market_data?.market_cap?.usd
  );

  const resolvedPriceUsd = Number.isFinite(simplePriceUsd)
    ? simplePriceUsd
    : fallbackPriceUsd;
  const resolvedMarketCapUsd = Number.isFinite(simpleMarketCapUsd)
    ? simpleMarketCapUsd
    : fallbackMarketCapUsd;

  if (!Number.isFinite(resolvedPriceUsd)) {
    throw new Error("Unable to parse CoinGecko current price");
  }

  if (!Number.isFinite(resolvedMarketCapUsd)) {
    throw new Error("Unable to parse CoinGecko market cap");
  }

  return {
    currentPriceUsd: formatUsdFromNumber(resolvedPriceUsd),
    marketCapUsd: `$${formatK(resolvedMarketCapUsd)}`,
  };
}

function parseWalletBnbBalance(addressHtml: string): string {
  const sectionMatch = addressHtml.match(
    /BNB Balance[\s\S]*?<div[^>]*class=['"][^'"]*d-flex[^'"]*['"][^>]*>([\s\S]*?)<\/div>/i
  );

  if (!sectionMatch?.[1]) {
    throw new Error("Unable to parse wallet BNB balance section");
  }

  const sectionText = stripHtmlTags(sectionMatch[1])
    .replace(/\s+/g, " ")
    .trim();

  const balanceMatch = sectionText.match(/([0-9][0-9,]*(?:\.[0-9]+)?)\s*BNB/i);

  if (!balanceMatch?.[1]) {
    throw new Error("Unable to parse wallet BNB balance value");
  }

  const numericBalance = Number(balanceMatch[1].replaceAll(",", ""));

  if (!Number.isFinite(numericBalance)) {
    throw new Error("Wallet BNB balance is not a valid number");
  }

  return formatBnbBalance(numericBalance);
}

async function fetchWalletBnbBalance(
  address?: string,
  proxyUrl?: string
): Promise<string> {
  if (!address) {
    return UNKNOWN_WALLET_BALANCE;
  }

  try {
    const addressHtml = await fetchText(
      `https://bscscan.com/address/${address}`,
      {
        accept: "text/html,application/xhtml+xml",
        proxyUrl,
      }
    );
    return parseWalletBnbBalance(addressHtml);
  } catch {
    return UNKNOWN_WALLET_BALANCE;
  }
}

export async function fetchWalletBalanceMetrics({
  taxWalletAddress,
  buybackWalletAddress = DEFAULT_BUYBACK_WALLET_ADDRESS,
  buybackBurnWalletAddress,
  proxyUrl,
}: Pick<
  FetchTokenMetricsOptions,
  | "taxWalletAddress"
  | "buybackWalletAddress"
  | "buybackBurnWalletAddress"
  | "proxyUrl"
> = {}): Promise<WalletBalanceMetrics> {
  const normalizedTaxWalletAddress = normalizeOptionalAddress(taxWalletAddress);
  const normalizedBuybackWalletAddress =
    normalizeOptionalAddress(buybackWalletAddress) ||
    DEFAULT_BUYBACK_WALLET_ADDRESS;
  const normalizedBuybackBurnWalletAddress = normalizeOptionalAddress(
    buybackBurnWalletAddress
  );
  const normalizedProxyUrl = normalizeOptionalProxyUrl(proxyUrl);

  const [taxWalletBalance, buybackWalletBalance, buybackBurnWalletBalance] =
    await Promise.all([
      fetchWalletBnbBalance(normalizedTaxWalletAddress, normalizedProxyUrl),
      fetchWalletBnbBalance(normalizedBuybackWalletAddress, normalizedProxyUrl),
      fetchWalletBnbBalance(
        normalizedBuybackBurnWalletAddress,
        normalizedProxyUrl
      ),
    ]);

  return {
    taxWalletBalance,
    buybackWalletBalance,
    buybackBurnWalletBalance,
  };
}

function buildCoinGeckoContractUrl(contractAddress: string): string {
  return `${COINGECKO_API_BASE_URL}/coins/binance-smart-chain/contract/${contractAddress}`;
}

function buildCoinGeckoSimplePriceUrl(coinId: string): string {
  const encodedCoinId = encodeURIComponent(coinId);
  return `${COINGECKO_API_BASE_URL}/simple/price?ids=${encodedCoinId}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true`;
}

async function fetchCoinGeckoContractData(
  contractAddress: string,
  proxyUrl?: string
): Promise<CoinGeckoContractResponse> {
  return fetchJson<CoinGeckoContractResponse>(
    buildCoinGeckoContractUrl(contractAddress),
    proxyUrl
  );
}

async function fetchCoinGeckoSimplePriceData(
  coinId: string,
  proxyUrl?: string
): Promise<CoinGeckoSimplePriceResponse> {
  return fetchJson<CoinGeckoSimplePriceResponse>(
    buildCoinGeckoSimplePriceUrl(coinId),
    proxyUrl
  );
}

export async function fetchTokenMetrics(
  contractAddress: string,
  {
    deadAddress = DEFAULT_DEAD_ADDRESS,
    taxWalletAddress,
    buybackWalletAddress = DEFAULT_BUYBACK_WALLET_ADDRESS,
    buybackBurnWalletAddress,
    proxyUrl,
  }: FetchTokenMetricsOptions = {}
): Promise<TokenMetrics> {
  const normalizedContractAddress = normalizeAddress(contractAddress);
  const normalizedDeadAddress = normalizeAddress(deadAddress);
  const normalizedTaxWalletAddress = normalizeOptionalAddress(taxWalletAddress);
  const normalizedBuybackWalletAddress =
    normalizeOptionalAddress(buybackWalletAddress) ||
    DEFAULT_BUYBACK_WALLET_ADDRESS;
  const normalizedBuybackBurnWalletAddress = normalizeOptionalAddress(
    buybackBurnWalletAddress
  );
  const normalizedProxyUrl = normalizeOptionalProxyUrl(proxyUrl);

  const coinGeckoContractData = await fetchCoinGeckoContractData(
    normalizedContractAddress,
    normalizedProxyUrl
  );
  const coinId = parseCoinGeckoCoinId(coinGeckoContractData);

  const [coinGeckoSimplePriceData, walletBalanceMetrics] = await Promise.all([
    fetchCoinGeckoSimplePriceData(coinId, normalizedProxyUrl),
    fetchWalletBalanceMetrics({
      taxWalletAddress: normalizedTaxWalletAddress,
      buybackWalletAddress: normalizedBuybackWalletAddress,
      buybackBurnWalletAddress: normalizedBuybackBurnWalletAddress,
      proxyUrl: normalizedProxyUrl,
    }),
  ]);

  const { currentPriceUsd, marketCapUsd } = parseCoinGeckoPriceAndMarketCap(
    coinId,
    coinGeckoContractData,
    coinGeckoSimplePriceData
  );
  const burnedTotal = parseCoinGeckoBurnedTotal(coinGeckoContractData);

  return {
    contractAddress: normalizedContractAddress,
    deadAddress: normalizedDeadAddress,
    buybackWalletAddress: normalizedBuybackWalletAddress,
    currentPriceUsd,
    marketCapUsd,
    burnedTotal,
    taxWalletBalance: walletBalanceMetrics.taxWalletBalance,
    buybackWalletBalance: walletBalanceMetrics.buybackWalletBalance,
    buybackBurnWalletBalance: walletBalanceMetrics.buybackBurnWalletBalance,
    updatedAt: new Date().toISOString(),
  };
}
