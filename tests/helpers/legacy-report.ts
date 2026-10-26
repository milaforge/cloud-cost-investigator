import type { InvestigationReport } from '../../src/contracts.ts';
import {
  calculateSavings,
  schedulingProof,
} from '../../src/investigation/policy.ts';
import { validateReport } from '../../src/investigation/report.ts';

/** Historical-format fixture for legacy decision/outcome compatibility tests only.
 * Never used by the application or current scenario exports. */
export function legacyRecommendation(
  input: InvestigationReport,
): InvestigationReport {
  const report = structuredClone(input);
  delete report.decision_policy;
  const c = report.candidates[0];
  const proof = schedulingProof(report.request, c, report.evidence);
  if (!proof || !c.proposed_window)
    throw new Error('Legacy fixture requires complete technical evidence');
  c.verdict = 'conditional_recommendation';
  c.supporting_evidence_ids = proof.map((o) => o.evidence_id);
  c.missing_checks = [];
  c.explanation =
    'Historical-format synthetic conditional recommendation; human approval required.';
  c.hypotheses[1] = {
    window: c.proposed_window,
    state: 'supported',
    evidence_ids: c.supporting_evidence_ids,
    reason: c.explanation,
  };
  const savings = calculateSavings(report.request, c, report.evidence);
  c.estimated_monthly_savings = savings?.amount ?? null;
  c.savings_calculation = savings?.calculation ?? null;
  report.completion_status = 'complete';
  return validateReport(report);
}
