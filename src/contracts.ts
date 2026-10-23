export interface InvestigationRequest {
  instanceId: string;
  objective: "cost_review";
  window: {
    from: string;
    to: string;
  };
}

export interface Evidence {
  id: string;
  instanceId: string;
  kind: "inventory" | "billing" | "utilization" | "schedule" | "deployment";
  source: string;
  observedAt: string;
  collectedAt: string;
  synthetic: boolean;
  data: Record<string, unknown>;
}

export interface InvestigationReport {
  instanceId: string;
  verdict: "optimization_candidate" | "needs_verification" | "not_recommended";
  explanation: string;
  estimatedMonthlySavingsUsd: number | null;
  savingsAssumptions: string[];
  evidenceIds: string[];
  risks: string[];
  missingEvidence: string[];
  recommendedNextSteps: string[];
}
