import crypto from "node:crypto";
import { ethers } from "ethers";
import { Indexer, MemData } from "@0gfoundation/0g-storage-ts-sdk";
import { config } from "@/lib/config";

interface UploadReceipt {
  rootHash: string;
  txHash: string;
}

export interface OgPersistenceResult {
  storageDocumentRoot: string | null;
  storageReportRoot: string | null;
  storageTxHash: string | null;
  storageKey: string | null;
  storageError: string | null;
  chainTxHash: string | null;
  chainBlock: number | null;
  chainError: string | null;
}

function getWallet() {
  if (!config.og.privateKey) {
    throw new Error("0G signer is not configured. Add OG_PRIVATE_KEY to enable testnet writes.");
  }
  const provider = new ethers.JsonRpcProvider(config.og.rpcUrl, config.og.chainId, {
    staticNetwork: true,
  });
  return new ethers.Wallet(config.og.privateKey, provider);
}

async function uploadBuffer(
  data: Uint8Array,
  wallet: ethers.Wallet,
  encryptionKey: Uint8Array,
): Promise<UploadReceipt> {
  const indexer = new Indexer(config.og.storageIndexer);
  const file = new MemData(data);
  const [, treeError] = await file.merkleTree();
  if (treeError) throw treeError;
  const [transaction, uploadError] = await indexer.upload(
    file,
    config.og.rpcUrl,
    wallet,
    {
      expectedReplica: 1,
      finalityRequired: true,
      encryption: { type: "aes256", key: encryptionKey },
    },
  );
  if (uploadError) throw uploadError;
  if ("rootHash" in transaction) {
    return { rootHash: transaction.rootHash, txHash: transaction.txHash };
  }
  if (!transaction.rootHashes[0] || !transaction.txHashes[0]) {
    throw new Error("0G Storage returned no upload receipt.");
  }
  return {
    rootHash: transaction.rootHashes[0],
    txHash: transaction.txHashes[0],
  };
}

async function anchorOnChain(
  wallet: ethers.Wallet,
  proof: {
    id: string;
    documentHash: string;
    proofScore: number;
    riskLevel: string;
    documentRoot: string | null;
    reportRoot: string | null;
  },
) {
  const envelope = {
    protocol: "ProofAI",
    version: 1,
    verificationId: proof.id,
    documentHash: proof.documentHash,
    proofScore: proof.proofScore,
    riskLevel: proof.riskLevel,
    documentRoot: proof.documentRoot,
    reportRoot: proof.reportRoot,
  };
  const transaction = await wallet.sendTransaction({
    to: wallet.address,
    data: ethers.hexlify(ethers.toUtf8Bytes(JSON.stringify(envelope))),
  });
  const receipt = await transaction.wait(1);
  if (!receipt) throw new Error("0G transaction was submitted but no receipt was returned.");
  return { txHash: transaction.hash, blockNumber: receipt.blockNumber };
}

export async function persistVerificationOn0G(input: {
  id: string;
  document: Buffer;
  documentHash: string;
  proofScore: number;
  riskLevel: string;
  report: Record<string, unknown>;
}): Promise<OgPersistenceResult> {
  const result: OgPersistenceResult = {
    storageDocumentRoot: null,
    storageReportRoot: null,
    storageTxHash: null,
    storageKey: null,
    storageError: null,
    chainTxHash: null,
    chainBlock: null,
    chainError: null,
  };

  let wallet: ethers.Wallet;
  try {
    wallet = getWallet();
    const network = await wallet.provider!.getNetwork();
    if (Number(network.chainId) !== config.og.chainId) {
      throw new Error(
        `Configured RPC returned chain ${network.chainId}; expected ${config.og.chainId}.`,
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "0G signer unavailable.";
    return { ...result, storageError: message, chainError: message };
  }

  if (config.og.storageEnabled) {
    try {
      const encryptionKey = crypto.randomBytes(32);
      const documentReceipt = await uploadBuffer(input.document, wallet, encryptionKey);
      const reportReceipt = await uploadBuffer(
        new TextEncoder().encode(JSON.stringify(input.report)),
        wallet,
        encryptionKey,
      );
      result.storageDocumentRoot = documentReceipt.rootHash;
      result.storageReportRoot = reportReceipt.rootHash;
      result.storageTxHash = reportReceipt.txHash;
      result.storageKey = encryptionKey.toString("hex");
    } catch (error) {
      result.storageError =
        error instanceof Error ? error.message : "0G Storage upload failed.";
    }
  } else {
    result.storageError = "0G Storage is disabled by configuration.";
  }

  try {
    const chainReceipt = await anchorOnChain(wallet, {
      id: input.id,
      documentHash: input.documentHash,
      proofScore: input.proofScore,
      riskLevel: input.riskLevel,
      documentRoot: result.storageDocumentRoot,
      reportRoot: result.storageReportRoot,
    });
    result.chainTxHash = chainReceipt.txHash;
    result.chainBlock = chainReceipt.blockNumber;
  } catch (error) {
    result.chainError =
      error instanceof Error ? error.message : "0G Chain transaction failed.";
  }

  return result;
}
