import path from "node:path";

const numberFromEnv = (name: string, fallback: number) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

export const config = {
  dataDir: process.env.PROOFAI_DATA_DIR
    ? path.resolve(/* turbopackIgnore: true */ process.env.PROOFAI_DATA_DIR)
    : path.join(process.cwd(), "data"),
  maxUploadBytes: numberFromEnv("MAX_UPLOAD_BYTES", 4 * 1024 * 1024),
  database: {
    url: process.env.TURSO_DATABASE_URL?.trim() || null,
    authToken: process.env.TURSO_AUTH_TOKEN?.trim() || null,
  },
  security: {
    masterKey: process.env.PROOFAI_MASTER_KEY?.trim() || null,
    rateLimitSalt: process.env.PROOFAI_RATE_LIMIT_SALT?.trim() || null,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY?.trim() || null,
    model: process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini",
  },
  compute: {
    apiKey: process.env.OG_COMPUTE_API_KEY?.trim() || null,
    baseUrl:
      process.env.OG_COMPUTE_BASE_URL?.trim() ||
      "https://router-api-testnet.integratenetwork.work/v1",
    model: process.env.OG_COMPUTE_MODEL?.trim() || "qwen-2.5-72b-instruct",
  },
  og: {
    privateKey: process.env.OG_PRIVATE_KEY?.trim() || null,
    rpcUrl: process.env.OG_RPC_URL?.trim() || "https://evmrpc-testnet.0g.ai",
    chainId: numberFromEnv("OG_CHAIN_ID", 16602),
    storageIndexer:
      process.env.OG_STORAGE_INDEXER?.trim() ||
      "https://indexer-storage-testnet-turbo.0g.ai",
    chainExplorer:
      process.env.OG_CHAIN_EXPLORER?.trim() ||
      "https://chainscan-galileo.0g.ai",
    storageExplorer:
      process.env.OG_STORAGE_EXPLORER?.trim() ||
      "https://storagescan-galileo.0g.ai",
    storageEnabled: process.env.OG_STORAGE_ENABLED !== "false",
    proofContractAddress: process.env.OG_PROOF_CONTRACT_ADDRESS?.trim() || null,
  },
} as const;

export function getIntegrationStatus() {
  return {
    ai: Boolean(config.compute.apiKey || config.openai.apiKey),
    aiProvider: config.compute.apiKey
      ? "0G Compute"
      : config.openai.apiKey
        ? "OpenAI"
        : "Local checks",
    chain: Boolean(config.og.privateKey),
    registry: Boolean(config.og.proofContractAddress),
    storage: Boolean(config.og.privateKey) && config.og.storageEnabled,
    network: "0G Galileo Testnet",
    chainId: config.og.chainId,
    chainExplorer: config.og.chainExplorer,
    storageExplorer: config.og.storageExplorer,
  };
}
