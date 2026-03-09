const DEFAULT_DEAD_ADDRESS = "0x000000000000000000000000000000000000dead";
const TOKEN_TOTAL_SUPPLY = 1_000_000_000;
const DEFAULT_BUYBACK_WALLET_ADDRESS =
  "0xb495d301be067166e3cb9890d615508eb1c38186";

export const DEFAULT_CONTRACT_ADDRESS =
  "0x1094814045fe0c29023df28698ca539296cf7777";

export interface TokenMetrics {
  contractAddress: string;
  deadAddress: string;
  buybackWalletAddress: string;
  currentPriceUsd: string;
  marketCapUsd: string;
  burnedTotal: string;
  buybackWalletBalance: string;
  updatedAt: string;
}

interface ParsedPrice {
  display: string;
  numeric: number;
}

function normalizeAddress(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(normalized)) {
    throw new Error(`Invalid address: ${value}`);
  }
  return normalized;
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

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Request failed: ${response.status} ${response.statusText}`
    );
  }

  return response.text();
}

function parsePrice(geckoHtml: string): ParsedPrice {
  const displayMatch = geckoHtml.match(
    /id="pool-price-display"[\s\S]*?<span>\$([0-9]+(?:\.[0-9]+)?)<\/span>/i
  );

  const offerMatch = geckoHtml.match(
    /"priceCurrency":"USD","price":"([0-9]+(?:\.[0-9]+)?)"/i
  );

  const displayNumeric = displayMatch?.[1] ? Number(displayMatch[1]) : NaN;
  const offerNumeric = offerMatch?.[1] ? Number(offerMatch[1]) : NaN;
  const numeric = Number.isFinite(offerNumeric) ? offerNumeric : displayNumeric;

  if (!Number.isFinite(numeric)) {
    throw new Error("Unable to parse token price");
  }

  return {
    display: displayMatch?.[1]
      ? `$${displayMatch[1]}`
      : formatUsdFromNumber(numeric),
    numeric,
  };
}

function calculateMarketCap(priceNumeric: number): string {
  const marketCap = priceNumeric * TOKEN_TOTAL_SUPPLY;
  return `$${formatK(marketCap)}`;
}

function parseBurnedTotal(bscScanHtml: string): {
  integerValue: string;
} {
  const balanceMatch = bscScanHtml.match(
    /id="ContentPlaceHolder1_divFilteredHolderBalance"[\s\S]*?<h6[^>]*>\s*Balance\s*<\/h6>\s*([0-9,]+(?:\.[0-9]+)?)/i
  );

  if (!balanceMatch?.[1]) {
    throw new Error("Unable to parse dead address balance");
  }

  const rawValue = balanceMatch[1];
  const numericValue = Number(rawValue.replaceAll(",", ""));

  if (!Number.isFinite(numericValue)) {
    throw new Error("Dead address balance is not a valid number");
  }

  return {
    integerValue: formatIntegerWithoutDecimals(numericValue),
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

export async function fetchTokenMetrics(
  contractAddress: string,
  deadAddress = DEFAULT_DEAD_ADDRESS,
  buybackWalletAddress = DEFAULT_BUYBACK_WALLET_ADDRESS
): Promise<TokenMetrics> {
  const normalizedContractAddress = normalizeAddress(contractAddress);
  const normalizedDeadAddress = normalizeAddress(deadAddress);
  const normalizedBuybackWalletAddress = normalizeAddress(buybackWalletAddress);

  const geckoUrl = `https://www.geckoterminal.com/bsc/tokens/${normalizedContractAddress}`;
  const bscScanUrl = `https://bscscan.com/token/${normalizedContractAddress}?a=${normalizedDeadAddress}`;
  const buybackWalletUrl = `https://bscscan.com/address/${normalizedBuybackWalletAddress}`;

  const [geckoHtml, bscScanHtml, buybackWalletHtml] = await Promise.all([
    fetchHtml(geckoUrl),
    fetchHtml(bscScanUrl),
    fetchHtml(buybackWalletUrl),
  ]);

  const price = parsePrice(geckoHtml);
  const currentPriceUsd = price.display;
  const marketCapUsd = calculateMarketCap(price.numeric);
  const burnedTotal = parseBurnedTotal(bscScanHtml);
  const buybackWalletBalance = parseWalletBnbBalance(buybackWalletHtml);

  return {
    contractAddress: normalizedContractAddress,
    deadAddress: normalizedDeadAddress,
    buybackWalletAddress: normalizedBuybackWalletAddress,
    currentPriceUsd,
    marketCapUsd,
    burnedTotal: burnedTotal.integerValue,
    buybackWalletBalance,
    updatedAt: new Date().toISOString(),
  };
}
