// Risk Assessment Tool

interface RiskAssessment {
  protocol: string;
  overallRisk: "SAFE" | "CAUTION" | "HIGH_RISK";
  score: number; // 1-100, higher = safer
  factors: {
    tvlRisk: string;
    auditStatus: string;
    ageRisk: string;
    complexityRisk: string;
    apyRisk: string;
  };
  recommendation: string;
}

// Known protocol risk profiles (for demo reliability)
const KNOWN_PROTOCOLS: Record<string, Partial<RiskAssessment>> = {
  lido: {
    overallRisk: "SAFE",
    score: 92,
    factors: {
      tvlRisk: "Very Low — $14B+ TVL",
      auditStatus: "Multiple audits (Trail of Bits, Sigma Prime)",
      ageRisk: "Low — Operating since Dec 2020",
      complexityRisk: "Low — Simple liquid staking",
      apyRisk: "Low — Market-rate staking yield",
    },
    recommendation: "SAFE — Blue-chip liquid staking protocol with strong track record.",
  },
  aave: {
    overallRisk: "SAFE",
    score: 90,
    factors: {
      tvlRisk: "Very Low — $10B+ TVL",
      auditStatus: "Extensively audited (OpenZeppelin, Trail of Bits, others)",
      ageRisk: "Low — Operating since Jan 2020",
      complexityRisk: "Medium — Lending/borrowing with liquidation mechanics",
      apyRisk: "Low — Variable rates tied to utilization",
    },
    recommendation: "SAFE — Battle-tested lending protocol.",
  },
  pendle: {
    overallRisk: "CAUTION",
    score: 65,
    factors: {
      tvlRisk: "Medium — $800M TVL",
      auditStatus: "Audited (Ackee, Dedaub)",
      ageRisk: "Medium — Operating since Jun 2022",
      complexityRisk: "High — Yield tokenization, PT/YT mechanics",
      apyRisk: "High — Elevated APY from speculation on yield direction",
    },
    recommendation: "CAUTION — Complex yield tokenization. High APY driven by market speculation, not sustainable yield.",
  },
};

export async function assessRisk(
  protocol: string,
  apy?: string,
): Promise<RiskAssessment> {
  console.log(`🛡️ Assessing risk for ${protocol} (APY: ${apy ?? "unknown"})...`);

  const key = protocol.toLowerCase();
  const known = KNOWN_PROTOCOLS[key];

  if (known) {
    return {
      protocol,
      overallRisk: known.overallRisk!,
      score: known.score!,
      factors: known.factors!,
      recommendation: known.recommendation!,
    };
  }

  // Generic risk assessment based on APY
  const apyNum = parseFloat(apy ?? "0");
  let overallRisk: "SAFE" | "CAUTION" | "HIGH_RISK" = "CAUTION";
  let score = 50;

  if (apyNum > 25) {
    overallRisk = "HIGH_RISK";
    score = 25;
  } else if (apyNum > 10) {
    overallRisk = "CAUTION";
    score = 55;
  } else if (apyNum > 0) {
    overallRisk = "SAFE";
    score = 75;
  }

  return {
    protocol,
    overallRisk,
    score,
    factors: {
      tvlRisk: "Unknown — Protocol not in database",
      auditStatus: "Unknown — Requires manual verification",
      ageRisk: "Unknown",
      complexityRisk: "Unknown",
      apyRisk: apyNum > 15 ? "High — Unsustainably high APY" : "Normal",
    },
    recommendation: `${overallRisk} — Insufficient data for comprehensive assessment. Proceed with caution.`,
  };
}
