// Contract Audit Tool

interface AuditResult {
  protocol: string;
  chain: string;
  audited: boolean;
  auditors: string[];
  knownVulnerabilities: string[];
  lastAuditDate: string;
  verdict: "PASS" | "WARNINGS" | "FAIL";
}

const KNOWN_AUDITS: Record<string, AuditResult> = {
  lido: {
    protocol: "Lido",
    chain: "Ethereum",
    audited: true,
    auditors: ["Trail of Bits", "Sigma Prime", "Quantstamp"],
    knownVulnerabilities: [],
    lastAuditDate: "2024-03",
    verdict: "PASS",
  },
  aave: {
    protocol: "Aave V3",
    chain: "Ethereum",
    audited: true,
    auditors: ["OpenZeppelin", "Trail of Bits", "SigmaPrime", "ABDK"],
    knownVulnerabilities: [],
    lastAuditDate: "2024-06",
    verdict: "PASS",
  },
  compound: {
    protocol: "Compound V3",
    chain: "Ethereum",
    audited: true,
    auditors: ["OpenZeppelin", "ChainSecurity"],
    knownVulnerabilities: [],
    lastAuditDate: "2023-11",
    verdict: "PASS",
  },
  pendle: {
    protocol: "Pendle",
    chain: "Ethereum",
    audited: true,
    auditors: ["Ackee", "Dedaub"],
    knownVulnerabilities: ["Minor: Rounding in YT calculations (patched)"],
    lastAuditDate: "2024-01",
    verdict: "WARNINGS",
  },
};

export async function auditContract(
  protocol: string,
  chain?: string,
): Promise<AuditResult> {
  console.log(`📋 Checking audit status for ${protocol} on ${chain ?? "Ethereum"}...`);

  const key = protocol.toLowerCase();
  const known = KNOWN_AUDITS[key];

  if (known) {
    return { ...known, chain: chain ?? known.chain };
  }

  return {
    protocol,
    chain: chain ?? "Ethereum",
    audited: false,
    auditors: [],
    knownVulnerabilities: ["Unable to verify audit status"],
    lastAuditDate: "N/A",
    verdict: "FAIL",
  };
}
