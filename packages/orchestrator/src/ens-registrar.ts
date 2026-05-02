// ENS Subname Registration — Creates subnames under agent-mesh.eth on Sepolia
// Uses the server's private key (owner of agent-mesh.eth) to call setSubnodeRecord

import { ethers } from "ethers";

const SEPOLIA_RPC = "https://ethereum-sepolia-rpc.publicnode.com";
const ENS_REGISTRY = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";
const PUBLIC_RESOLVER = "0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5";
const PARENT_DOMAIN = "agent-mesh.eth";

// ENS Registry ABI (only functions we need)
const ENS_REGISTRY_ABI = [
  "function setSubnodeRecord(bytes32 node, bytes32 label, address owner, address resolver, uint64 ttl) external",
  "function owner(bytes32 node) view returns (address)",
];

// Public Resolver ABI for setting text records
const RESOLVER_ABI = [
  "function setText(bytes32 node, string key, string value) external",
];

/**
 * Create an ENS subname under agent-mesh.eth and set text records.
 * Returns the transaction hash.
 */
export async function createEnsSubname(params: {
  label: string; // e.g. "gas-optimizer"
  ownerAddress: string; // Address that will own the subname
  endpoint?: string; // MCP/HTTP endpoint URL
  description?: string; // Tool description
  price?: string; // USDC price per call
}): Promise<{ txHash: string; ensName: string }> {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY env var required for ENS registration");
  }

  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const wallet = new ethers.Wallet(privateKey, provider);

  const registry = new ethers.Contract(ENS_REGISTRY, ENS_REGISTRY_ABI, wallet);

  // Compute namehash for parent (agent-mesh.eth)
  const parentNode = ethers.namehash(PARENT_DOMAIN);

  // Compute labelhash for the subname
  const labelHash = ethers.keccak256(ethers.toUtf8Bytes(params.label));

  // Create the subname: setSubnodeRecord(parentNode, labelHash, owner, resolver, ttl)
  const tx = await registry.setSubnodeRecord(
    parentNode,
    labelHash,
    params.ownerAddress,
    PUBLIC_RESOLVER,
    0, // ttl
  );
  await tx.wait();

  // Set text records on the resolver
  const resolver = new ethers.Contract(PUBLIC_RESOLVER, RESOLVER_ABI, wallet);
  const fullName = `${params.label}.${PARENT_DOMAIN}`;
  const subnameNode = ethers.namehash(fullName);

  // Set text records in parallel
  const textRecordTxs: Promise<ethers.TransactionResponse>[] = [];

  if (params.endpoint) {
    textRecordTxs.push(resolver.setText(subnameNode, "url", params.endpoint));
  }
  if (params.description) {
    textRecordTxs.push(
      resolver.setText(subnameNode, "description", params.description),
    );
  }
  if (params.price) {
    textRecordTxs.push(
      resolver.setText(subnameNode, "x402.price", `${params.price} USDC`),
    );
  }

  // Wait for all text record txs (sequential to avoid nonce issues)
  for (const txPromise of textRecordTxs) {
    const textTx = await txPromise;
    await textTx.wait();
  }

  return { txHash: tx.hash, ensName: fullName };
}
