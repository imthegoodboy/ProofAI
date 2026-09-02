import fs from "node:fs/promises";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { ethers } from "ethers";

const rpcUrl = process.env.OG_RPC_URL || "https://evmrpc-testnet.0g.ai";
const expectedChainId = Number(process.env.OG_CHAIN_ID || 16602);
let privateKey = process.env.OG_PRIVATE_KEY;

if (!privateKey) {
  const prompt = readline.createInterface({ input, output });
  privateKey = (await prompt.question("Galileo deployer private key: ")).trim();
  prompt.close();
}

const [abiText, bytecodeText] = await Promise.all([
  fs.readFile("contracts/artifacts/contracts_ProofRegistry_sol_ProofRegistry.abi", "utf8"),
  fs.readFile("contracts/artifacts/contracts_ProofRegistry_sol_ProofRegistry.bin", "utf8"),
]);
const provider = new ethers.JsonRpcProvider(rpcUrl, expectedChainId, { staticNetwork: true });
const wallet = new ethers.Wallet(privateKey, provider);
const [network, balance] = await Promise.all([
  provider.getNetwork(),
  provider.getBalance(wallet.address),
]);
if (Number(network.chainId) !== expectedChainId) {
  throw new Error(`RPC returned chain ${network.chainId}; expected ${expectedChainId}.`);
}
if (balance === 0n) throw new Error(`Deployer ${wallet.address} has no Galileo 0G.`);

console.log(`Deploying from ${wallet.address} with ${ethers.formatEther(balance)} 0G.`);
const factory = new ethers.ContractFactory(JSON.parse(abiText), `0x${bytecodeText.trim()}`, wallet);
const registry = await factory.deploy(wallet.address);
console.log(`Deployment transaction: ${registry.deploymentTransaction()?.hash}`);
await registry.waitForDeployment();
console.log(`ProofRegistry address: ${await registry.getAddress()}`);
