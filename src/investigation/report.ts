import {
  type Action,
  array,
  bool,
  type CandidateReport,
  exact,
  type HistoricalComparison,
  type Hypothesis,
  type InvestigationReport,
  identifier,
  integer,
  member,
  type Observation,
  type Schedule,
  type ToolAction,
  type TraceEntry,
  textValue,
  traceConfidence,
  utc,
  validateAction,
  validateObservation,
  validateOwnerEvidence,
  validatePlannerFailureCode,
  validateRequest,
  validateSchedule,
  validateScope,
} from '../contracts.ts';
import {
  calculateSavings,
  isExpectedAwsCoverageLimit,
  rankCandidates,
  sameSchedule,
  schedulingConflict,
  schedulingProof,
  supportsTentativeWindow,
} from './policy.ts';

const strings = (value: unknown) => array(value, 100).map((v) => textValue(v));
const ids = (value: unknown) => {
  const values = array(value, 100).map(identifier);
  if (new Set(values).size !== values.length)
    throw new Error('Duplicate citation');
  return values;
};
const usable = (e: Observation) =>
  e.status === 'ok' || e.status === 'partial' || e.status === 'no_match';

function hypothesis(value: unknown): Hypothesis {
  const h = exact(value, ['window', 'state', 'evidence_ids', 'reason']);
  return {
    window: validateSchedule(h.window),
    state: member(h.state, [
      'proposed',
      'contradicted',
      'unresolved',
      'supported',
    ]),
    evidence_ids: ids(h.evidence_ids),
    reason: textValue(h.reason),
  };
}

function candidate(value: unknown): CandidateReport {
  const c = exact(value, [
    'instance_id',
    'selection_reason',
    'selection_evidence_ids',
    'proposed_window',
    'verdict',
    'explanation',
    'supporting_evidence_ids',
    'contradicting_evidence_ids',
    'hypotheses',
    'risks',
    'missing_checks',
    'assumptions',
    'next_human_actions',
    'estimated_monthly_savings',
    'savings_calculation',
  ]);
  if (
    c.estimated_monthly_savings !== null &&
    (typeof c.estimated_monthly_savings !== 'number' ||
      !Number.isFinite(c.estimated_monthly_savings) ||
      c.estimated_monthly_savings < 0)
  )
    throw new Error('Unsupported savings');
  return {
    instance_id: identifier(c.instance_id),
    selection_reason: textValue(c.selection_reason),
    selection_evidence_ids: ids(c.selection_evidence_ids),
    proposed_window:
      c.proposed_window === null ? null : validateSchedule(c.proposed_window),
    verdict: member(c.verdict, [
      'not_recommended',
      'needs_verification',
      'conditional_recommendation',
    ]),
    explanation: textValue(c.explanation),
    supporting_evidence_ids: ids(c.supporting_evidence_ids),
    contradicting_evidence_ids: ids(c.contradicting_evidence_ids),
    hypotheses: array(c.hypotheses, 20).map(hypothesis),
    risks: strings(c.risks),
    missing_checks: strings(c.missing_checks),
    assumptions: strings(c.assumptions),
    next_human_actions: strings(c.next_human_actions),
    estimated_monthly_savings: c.estimated_monthly_savings as number | null,
    savings_calculation:
      c.savings_calculation as CandidateReport['savings_calculation'],
  };
}

function traceEntry(value: unknown, investigation_id: string): TraceEntry {
  const t = exact(value, [
    'timestamp',
    'trace_id',
    'confidence',
    'retry_count',
    'step',
    'phase',
    'reason',
    'action',
    'status',
    'evidence_ids',
    'failure_code',
    'provider_error',
  ]);
  const metadata = [t.trace_id, t.confidence, t.retry_count];
  const legacy = metadata.every((v) => v === undefined);
  if (!legacy && metadata.some((v) => v === undefined))
    throw new Error('Incomplete trace metadata');
  const entry: TraceEntry = {
    timestamp: t.timestamp == null ? null : utc(t.timestamp),
    trace_id: legacy ? investigation_id : identifier(t.trace_id),
    confidence: legacy
      ? 'unassessed'
      : member(t.confidence, ['unassessed', 'insufficient', 'supported']),
    retry_count:
      legacy || t.retry_count === null ? null : integer(t.retry_count, 0, 3),
    step: integer(t.step, 0, 1000),
    phase: member(t.phase, ['planner', 'tool', 'evaluator', 'finish']),
    reason: textValue(t.reason),
    evidence_ids: ids(t.evidence_ids),
  };
  if (t.action !== undefined) entry.action = validateAction(t.action);
  if (t.failure_code !== undefined) {
    if (
      entry.phase !== 'planner' ||
      t.action !== undefined ||
      t.status !== undefined ||
      entry.evidence_ids.length
    )
      throw new Error('Invalid planner failure trace');
    entry.failure_code = validatePlannerFailureCode(t.failure_code);
  }
  if (t.status !== undefined)
    entry.status = member(t.status, [
      'ok',
      'no_match',
      'partial',
      'unavailable',
      'error',
    ] as const);
  if (t.provider_error !== undefined) {
    if (!entry.failure_code?.startsWith('model_http_'))
      throw new Error('Provider details require HTTP failure');
    const details = exact(t.provider_error, ['body', 'truncated']);
    entry.provider_error = {
      body: textValue(details.body, 2048),
      truncated: bool(details.truncated),
    };
  }
  return entry;
}

/** Runtime report boundary. Only registered, scoped observations may support current conclusions. */
export function validateReport(value: unknown): InvestigationReport {
  const r = exact(value, [
    'investigation_id',
    'goal',
    'decision_policy',
    'request',
    'started_at',
    'finished_at',
    'completion_status',
    'integration_mode',
    'planner',
    'discovery',
    'candidates',
    'evidence',
    'trace',
    'historical_context',
    'budget',
    'limitations',
    'stop_reason',
    'owner_evidence',
  ]);
  const investigation_id = identifier(r.investigation_id);
  const request = validateRequest(r.request);
  const started_at = utc(r.started_at);
  const finished_at = utc(r.finished_at);
  if (Date.parse(finished_at) < Date.parse(started_at))
    throw new Error('Invalid report times');
  const integration_mode = member(r.integration_mode, [
    'mock',
    'fixture',
    'live',
    'stub',
  ]);
  const p = exact(r.planner, ['mode', 'model']);
  const planner = {
    mode: member(p.mode, ['scripted', 'live']),
    model: p.model === null ? null : textValue(p.model, 128),
  };
  if ((planner.mode === 'scripted') !== (planner.model === null))
    throw new Error('Invalid planner label');
  const d = exact(r.discovery, ['discovered_count', 'candidate_limit', 'gaps']);
  const discovery = {
    discovered_count: integer(d.discovered_count, 0, 100),
    candidate_limit: integer(d.candidate_limit, 1, 3),
    gaps: strings(d.gaps),
  };
  const candidates = array(r.candidates, request.max_candidates).map(candidate);
  const decision_policy =
    r.decision_policy === undefined
      ? undefined
      : member(r.decision_policy, ['reject_or_defer']);
  if (
    decision_policy &&
    candidates.some((c) => c.verdict === 'conditional_recommendation')
  )
    throw new Error(
      'Unsupported conditional recommendation under reject-or-defer policy',
    );
  if (
    discovery.candidate_limit !== request.max_candidates ||
    new Set(candidates.map((c) => c.instance_id)).size !== candidates.length
  )
    throw new Error('Invalid candidate limit or duplicate');
  if (candidates.length > discovery.discovered_count)
    throw new Error('Undiscovered candidate');
  const evidence = array(r.evidence, 100).map((value) => {
    const o = exact(value, [
      'tool',
      'status',
      'source',
      'integration_mode',
      'scope',
      'observed_window',
      'collected_at',
      'coverage',
      'missing_fields',
      'metric_coverage',
      'units',
      'evidence_id',
      'data',
    ]);
    const scope = exact(o.scope, ['account_id', 'region', 'instance_id']);
    // Rebuild expected arguments independently of the response's account, region and period.
    const args: ToolAction['args'] = {
      account_id: request.account_id,
      region: request.region,
      window: request.window,
    };
    if (scope.instance_id !== undefined) {
      args.instance_id = identifier(scope.instance_id);
      if (!candidates.some((c) => c.instance_id === args.instance_id))
        throw new Error('Evidence outside candidate scope');
    }
    if (o.tool === 'get_ec2_operations') {
      const c = candidates.find((c) => c.instance_id === args.instance_id);
      if (c?.proposed_window) args.proposed_window = c.proposed_window;
    }
    const action = validateAction({
      type: 'tool',
      tool: o.tool,
      args,
      reason: 'Validate retrieved evidence scope',
    });
    if (action.type !== 'tool') throw new Error('Invalid evidence action');
    return validateObservation(value, action, {
      started_at,
      now: finished_at,
      mode: integration_mode,
    });
  });
  const inventory = evidence.find((e) => e.tool === 'list_ec2_instances');
  const billing = evidence.find((e) => e.tool === 'get_ec2_billing');
  if (
    inventory?.data &&
    'instances' in inventory.data &&
    ((decision_policy && (candidates.length > 0 || billing)) ||
      (billing?.data && 'costs' in billing.data))
  ) {
    const ranked = rankCandidates(
      inventory.data,
      billing?.data && 'costs' in billing.data ? billing.data : null,
      request.max_candidates,
      decision_policy === 'reject_or_defer',
    );
    if (
      candidates.length !== ranked.length ||
      candidates.some((c, i) => c.instance_id !== ranked[i])
    )
      throw new Error('Invalid ranked selection');
  }
  const registry = new Map(evidence.map((e) => [e.evidence_id, e]));
  if (registry.size !== evidence.length)
    throw new Error('Duplicate evidence ID');
  const evidenceById = (id: string): Observation => {
    const observation = registry.get(id);
    if (!observation) throw new Error('Unretrieved current citation');
    return observation;
  };
  const h = exact(r.historical_context, [
    'zetaris',
    'hmem',
    'context_ids',
    'comparisons',
    'limitations',
  ]);
  const historical_context = {
    zetaris: member(h.zetaris, [
      'not_configured',
      'not_queried',
      'ok',
      'unavailable',
    ]),
    hmem: member(h.hmem, [
      'not_configured',
      'not_queried',
      'ok',
      'unavailable',
    ]),
    ...(h.comparisons === undefined
      ? {}
      : {
          comparisons: array(h.comparisons, 30).map(
            (value): HistoricalComparison => {
              const c = exact(value, [
                'historical',
                'context_id',
                'record_id',
                'investigation_id',
                'recorded_at',
                'scope',
                'instance_id',
                'source_mode',
                'verdict',
                'proposed_window',
                'rejected_windows',
              ]);
              const scope = validateScope(
                exact(c.scope, ['account_id', 'region']),
              );
              const instance_id = identifier(c.instance_id);
              const source_mode = member(c.source_mode, [
                'mock',
                'fixture',
                'live',
                'stub',
              ]);
              const recorded_at = utc(c.recorded_at);
              const record_id = identifier(c.record_id);
              const context_id = identifier(c.context_id);
              if (
                c.historical !== true ||
                context_id !== `zetaris:${record_id}` ||
                scope.account_id !== request.account_id ||
                scope.region !== request.region ||
                !candidates.some(
                  (candidate) => candidate.instance_id === instance_id,
                ) ||
                source_mode !== integration_mode ||
                Date.parse(recorded_at) > Date.parse(started_at)
              )
                throw new Error('Invalid historical comparison');
              return {
                historical: true,
                context_id,
                record_id,
                investigation_id: identifier(c.investigation_id),
                recorded_at,
                scope,
                instance_id,
                source_mode,
                verdict: member(c.verdict, [
                  'not_recommended',
                  'needs_verification',
                  'conditional_recommendation',
                ]),
                proposed_window:
                  c.proposed_window === null
                    ? null
                    : validateSchedule(c.proposed_window),
                rejected_windows: array(c.rejected_windows, 8).map(
                  validateSchedule,
                ),
              };
            },
          ),
        }),
    context_ids: ids(h.context_ids),
    limitations: strings(h.limitations),
  };
  for (const id of historical_context.context_ids) {
    const service = id.startsWith('zetaris:')
      ? 'zetaris'
      : id.startsWith('hmem:')
        ? 'hmem'
        : null;
    if (!service || historical_context[service] !== 'ok' || registry.has(id))
      throw new Error('Invalid historical context citation');
  }
  const comparisons = historical_context.comparisons ?? [];
  if (new Set(comparisons.map((c) => c.context_id)).size !== comparisons.length)
    throw new Error('Duplicate historical comparison');
  for (const c of comparisons) {
    if (
      historical_context.zetaris !== 'ok' ||
      !historical_context.context_ids.includes(c.context_id)
    )
      throw new Error('Unretrieved historical comparison');
  }
  const cited = (citations: string[], instance?: string) => {
    for (const id of citations) {
      const e = registry.get(id);
      if (!e || historical_context.context_ids.includes(id))
        throw new Error('Unretrieved current citation');
      if (
        instance &&
        e.scope.instance_id !== undefined &&
        e.scope.instance_id !== instance
      )
        throw new Error('Cross-candidate citation');
    }
  };
  const trace = array(r.trace, 1000).map((t) =>
    traceEntry(t, investigation_id),
  );
  const retrieved = new Set<string>();
  const retrievalSteps = new Map<string, number>();
  const retrievalStep = (id: string): number => {
    const step = retrievalSteps.get(id);
    if (step === undefined) throw new Error('Citation precedes retrieval');
    return step;
  };
  const proposals: {
    action: Extract<Action, { type: 'propose' }>;
    step: number;
  }[] = [];
  const toolRetries = new Map<string, TraceEntry>();
  let plannerRetries = 0;
  let previousTimestamp = started_at;
  for (let i = 0; i < trace.length; i++) {
    const t = trace[i];
    if (t.timestamp != null) {
      if (
        Date.parse(t.timestamp) < Date.parse(previousTimestamp) ||
        Date.parse(t.timestamp) > Date.parse(finished_at)
      )
        throw new Error(
          'Trace timestamp outside ordered investigation interval',
        );
      previousTimestamp = t.timestamp;
    }
    if (t.trace_id !== investigation_id) throw new Error('Trace ID mismatch');
    if (t.retry_count !== null) {
      const expectedConfidence = traceConfidence(
        t.failure_code ? 'error' : t.status,
        t.evidence_ids.map(evidenceById),
      );
      if (t.confidence !== expectedConfidence)
        throw new Error('Unsupported trace confidence');
      if (t.phase === 'planner') {
        if (t.retry_count !== plannerRetries)
          throw new Error('Planner retry count mismatch');
        plannerRetries = t.failure_code ? plannerRetries + 1 : 0;
      } else if (t.phase === 'tool' && t.action?.type === 'tool') {
        const signature = JSON.stringify([t.action.tool, t.action.args]);
        const previous = toolRetries.get(signature);
        const expectedRetry = previous ? (previous.retry_count ?? 0) + 1 : 0;
        if (
          t.retry_count !== expectedRetry ||
          (previous &&
            previous.status !== 'error' &&
            previous.status !== 'unavailable')
        )
          throw new Error('Tool retry count mismatch');
        toolRetries.set(signature, t);
      } else if (t.retry_count !== 0) throw new Error('Unexpected retry count');
      if (
        t.phase === 'evaluator' &&
        t.evidence_ids.length === 2 &&
        t.evidence_ids.some(
          (id) => evidenceById(id).tool === 'list_ec2_instances',
        ) &&
        t.evidence_ids.some((id) => evidenceById(id).tool === 'get_ec2_billing')
      )
        plannerRetries = 0;
    } else if (t.confidence !== 'unassessed')
      throw new Error('Unknown legacy confidence');
    if (i > 0 && t.step <= trace[i - 1].step)
      throw new Error('Unordered trace');
    cited(t.evidence_ids);
    if (t.action?.type === 'tool') {
      const a = t.action.args;
      if (
        a.account_id !== request.account_id ||
        a.region !== request.region ||
        a.window.from !== request.window.from ||
        a.window.to !== request.window.to ||
        (a.instance_id !== undefined &&
          !candidates.some((c) => c.instance_id === a.instance_id))
      )
        throw new Error('Trace action outside request scope');
      const actionWindow = a.proposed_window;
      if (
        actionWindow &&
        !candidates.some(
          (c) =>
            c.instance_id === a.instance_id &&
            c.proposed_window &&
            sameSchedule(c.proposed_window, actionWindow),
        )
      )
        throw new Error('Trace window mismatch');
    }
    if (t.phase === 'tool' && t.evidence_ids.length) {
      if (t.action?.type !== 'tool' || t.evidence_ids.length !== 1)
        throw new Error('Unbound tool observation');
      const e = evidenceById(t.evidence_ids[0]);
      if (
        retrieved.has(e.evidence_id) ||
        e.tool !== t.action.tool ||
        e.status !== t.status ||
        e.scope.instance_id !== t.action.args.instance_id
      )
        throw new Error('Tool registration mismatch');
      const targetedWindow = t.action.args.proposed_window;
      if (
        e.tool === 'get_ec2_operations' &&
        targetedWindow &&
        !proposals.some(
          (p) =>
            sameSchedule(p.action.window, targetedWindow) &&
            p.action.evidence_ids.some(
              (id) =>
                evidenceById(id).scope.instance_id === e.scope.instance_id,
            ),
        )
      )
        throw new Error('Challenge preceded hypothesis');
      retrieved.add(e.evidence_id);
      retrievalSteps.set(e.evidence_id, t.step);
    }
    for (const id of t.evidence_ids)
      if (!retrieved.has(id)) throw new Error('Citation precedes retrieval');
    if (t.action?.type === 'propose') {
      cited(t.action.evidence_ids);
      for (const id of t.action.evidence_ids)
        if (!retrieved.has(id)) throw new Error('Hypothesis precedes evidence');
      proposals.push({ action: t.action, step: t.step });
    }
  }
  if (retrieved.size !== registry.size)
    throw new Error('Unregistered evidence');
  for (const c of candidates) {
    const expectedSavings = calculateSavings(request, c, evidence);
    if (
      c.estimated_monthly_savings !== (expectedSavings?.amount ?? null) ||
      JSON.stringify(c.savings_calculation) !==
        JSON.stringify(expectedSavings?.calculation ?? null)
    )
      throw new Error('Unsupported savings calculation');
    cited(c.selection_evidence_ids, c.instance_id);
    cited(c.supporting_evidence_ids, c.instance_id);
    cited(c.contradicting_evidence_ids, c.instance_id);
    const selected = c.selection_evidence_ids.map((id) => evidenceById(id));
    if (
      !selected.some(
        (e) =>
          usable(e) &&
          e.tool === 'list_ec2_instances' &&
          e.data &&
          'instances' in e.data &&
          e.data.instances.some(
            (i) => i.instance_id === c.instance_id && i.state === 'running',
          ),
      ) ||
      (!decision_policy &&
        !selected.some(
          (e) =>
            usable(e) &&
            e.tool === 'get_ec2_billing' &&
            e.data &&
            'costs' in e.data &&
            e.data.costs.some(
              (i) => i.instance_id === c.instance_id && i.compute_cost > 0,
            ),
        ))
    )
      throw new Error('Unsupported candidate selection');
    const proposedWindow = c.proposed_window;
    if (proposedWindow === null) {
      if (
        c.hypotheses.length ||
        c.verdict !== 'needs_verification' ||
        c.contradicting_evidence_ids.length
      )
        throw new Error('Missing proposed window');
      continue;
    }
    if (
      c.hypotheses.length !== 2 ||
      c.hypotheses[0].state !== 'proposed' ||
      c.hypotheses[1].state === 'proposed'
    )
      throw new Error('Missing hypothesis transition');
    const initial = c.hypotheses[0];
    const final = c.hypotheses[1];
    const proposal = proposals.find(
      (p) =>
        sameSchedule(p.action.window, proposedWindow) &&
        p.action.evidence_ids.some((id) => initial.evidence_ids.includes(id)),
    );
    if (!proposal) throw new Error('Missing proposal trace');
    if (
      proposal.action.evidence_ids.length !== initial.evidence_ids.length ||
      initial.evidence_ids.some(
        (id) => !proposal.action.evidence_ids.includes(id),
      )
    )
      throw new Error('Proposal citation mismatch');
    for (const h of c.hypotheses) {
      cited(h.evidence_ids, c.instance_id);
      if (!sameSchedule(h.window, proposedWindow))
        throw new Error('Hypothesis window changed');
    }
    if (
      !initial.evidence_ids.some((id) => {
        const e = evidenceById(id);
        return (
          e.tool === 'get_ec2_metrics' &&
          usable(e) &&
          supportsTentativeWindow(e) &&
          e.scope.instance_id === c.instance_id &&
          e.data &&
          'suggested_window' in e.data &&
          (decision_policy === 'reject_or_defer' ||
            (e.data.average_cpu_percent <= 10 &&
              e.data.peak_cpu_percent <= 20)) &&
          sameSchedule(e.data.suggested_window, proposedWindow) &&
          retrievalStep(id) < proposal.step
        );
      })
    )
      throw new Error('Unsupported initial hypothesis');
    if (c.verdict === 'not_recommended') {
      if (
        final.state !== 'contradicted' ||
        !c.contradicting_evidence_ids.length ||
        !final.evidence_ids.some((id) =>
          c.contradicting_evidence_ids.includes(id),
        )
      )
        throw new Error('Unsupported rejection');
      for (const id of new Set([
        ...c.contradicting_evidence_ids,
        ...final.evidence_ids,
      ])) {
        const e = evidenceById(id);
        if (
          e.scope.instance_id !== c.instance_id ||
          !schedulingConflict(
            request,
            proposedWindow,
            e,
            decision_policy === 'reject_or_defer',
          ) ||
          retrievalStep(id) <= proposal.step
        )
          throw new Error('Invalid contradictory evidence');
      }
    } else if (c.verdict === 'conditional_recommendation') {
      const proof = schedulingProof(request, c, evidence);
      if (
        !proof ||
        final.state !== 'supported' ||
        c.contradicting_evidence_ids.length ||
        proof.some(
          (e) =>
            !final.evidence_ids.includes(e.evidence_id) ||
            !c.supporting_evidence_ids.includes(e.evidence_id) ||
            (e.tool !== 'get_ec2_metrics' &&
              retrievalStep(e.evidence_id) <= proposal.step),
        )
      )
        throw new Error('Unsupported conditional recommendation');
    } else if (
      final.state !== 'unresolved' ||
      c.contradicting_evidence_ids.length
    )
      throw new Error('Invalid unresolved verdict');
  }
  const b = exact(r.budget, [
    'discovery_attempts',
    'candidate_attempts',
    'planner_calls',
    'elapsed_ms',
  ]);
  const budget = {
    discovery_attempts: integer(b.discovery_attempts, 0, 8),
    candidate_attempts: integer(
      b.candidate_attempts,
      0,
      12 * request.max_candidates,
    ),
    planner_calls: integer(b.planner_calls, 0, 2 + 7 * request.max_candidates),
    elapsed_ms: integer(b.elapsed_ms, 0, Number.MAX_SAFE_INTEGER),
  };
  const toolAttempts = trace.filter((t) => t.phase === 'tool');
  if (
    toolAttempts.some(
      (t) => t.action?.type !== 'tool' || t.status === undefined,
    )
  )
    throw new Error('Unbound tool attempt');
  for (const c of candidates)
    if (
      toolAttempts.filter(
        (t) =>
          t.action?.type === 'tool' &&
          t.action.args.instance_id === c.instance_id,
      ).length > 12
    )
      throw new Error('Candidate tool budget exceeded');
  const discoveryAttempts = toolAttempts.filter(
    (t) =>
      t.action?.type === 'tool' &&
      (t.action.tool === 'list_ec2_instances' ||
        t.action.tool === 'get_ec2_billing'),
  ).length;
  if (
    budget.discovery_attempts !== discoveryAttempts ||
    budget.candidate_attempts !== toolAttempts.length - discoveryAttempts
  )
    throw new Error('Tool attempt count mismatch');
  // New runs bootstrap inventory in trusted code. Legacy reports still carry
  // a planner selection for it and retain their original call-count checks.
  const automaticInventory =
    trace[0]?.phase === 'evaluator' &&
    trace[0].action?.type === 'tool' &&
    trace[0].action.tool === 'list_ec2_instances';
  if (
    budget.planner_calls < trace.filter((t) => t.phase === 'planner').length ||
    budget.planner_calls <
      toolAttempts.filter((t) => t.retry_count === null || t.retry_count === 0)
        .length -
        (automaticInventory ? 1 : 0)
  )
    throw new Error('Planner call count mismatch');
  const completion_status = member(r.completion_status, [
    'complete',
    'partial',
    'failed',
  ]);
  if (
    completion_status === 'complete' &&
    candidates.some((c) => c.verdict === 'needs_verification')
  )
    throw new Error('Unresolved complete report');
  return {
    investigation_id,
    goal: member(r.goal, ['evaluate_ec2_off_hours_scheduling']),
    ...(decision_policy ? { decision_policy } : {}),
    request,
    started_at,
    finished_at,
    completion_status,
    integration_mode,
    planner,
    discovery,
    candidates,
    evidence,
    trace,
    historical_context,
    budget,
    limitations: strings(r.limitations),
    stop_reason: textValue(r.stop_reason),
    ...(r.owner_evidence === undefined
      ? {}
      : {
          owner_evidence: validateOwnerEvidence(
            r.owner_evidence,
            request,
            started_at,
          ),
        }),
  };
}

const citations = (values: string[]) =>
  values.length ? `[${values.join(', ')}]` : '(none)';
const schedule = (value: Schedule | null) =>
  value
    ? `${String(value.start_hour_utc).padStart(2, '0')}:00–${String(value.end_hour_utc).padStart(2, '0')}:00 UTC daily`
    : 'none established';

/** Wrap prose without truncating evidence gaps or human-approval conditions. */
function summaryLine(lines: string[], label: string, value: string) {
  let line = `${label}:`;
  for (const word of value.split(/\s+/)) {
    if (line.length + word.length + 1 > 96) {
      lines.push(line);
      line = `  ${word}`;
    } else line += ` ${word}`;
  }
  lines.push(line);
}

function renderSummary(r: InvestigationReport): string {
  const lines = [`Cloud Cost Investigator — ${r.completion_status}`];
  const verdicts = {
    conditional_recommendation: 'CONDITIONAL RECOMMENDATION',
    not_recommended: 'NOT RECOMMENDED',
    needs_verification: 'NEEDS VERIFICATION',
  };
  for (const c of r.candidates) {
    lines.push('', `${verdicts[c.verdict]} — ${c.instance_id}`);
    summaryLine(lines, 'Window', schedule(c.proposed_window));
    summaryLine(lines, 'Why', c.explanation);
    const decisiveIds =
      c.verdict === 'not_recommended'
        ? c.contradicting_evidence_ids
        : c.supporting_evidence_ids;
    const observations = r.evidence.filter((e) =>
      c.verdict === 'needs_verification'
        ? e.scope.instance_id === c.instance_id ||
          (!e.scope.instance_id && e.status === 'partial')
        : decisiveIds.includes(e.evidence_id),
    );
    if (observations.length)
      summaryLine(
        lines,
        'Evidence',
        observations
          .map((e) => `${e.tool} (${e.status}) [${e.evidence_id}]`)
          .join('; '),
      );
    const metrics = r.evidence.find(
      (e) =>
        e.tool === 'get_ec2_metrics' && e.scope.instance_id === c.instance_id,
    );
    if (metrics?.metric_coverage?.length)
      summaryLine(
        lines,
        'Metric samples',
        metrics.metric_coverage
          .map(
            (m) =>
              `${m.field} ${m.returned_points}/${m.expected_points} at ${m.period_seconds}s`,
          )
          .join('; '),
      );
    if (c.next_human_actions.length)
      summaryLine(lines, 'Next', c.next_human_actions[0]);
    if (c.missing_checks.some(isExpectedAwsCoverageLimit))
      summaryLine(
        lines,
        'Source coverage',
        'AWS operational reads cover SSM maintenance and ELBv2 targets only; other workload jobs, consumers and owner clearance remain unverified.',
      );
    for (const check of c.missing_checks.filter(
      (check) => !isExpectedAwsCoverageLimit(check),
    ))
      summaryLine(lines, 'Missing / next check', check);

    if (!r.decision_policy)
      summaryLine(
        lines,
        'Savings',
        c.savings_calculation && c.estimated_monthly_savings !== null
          ? `${c.estimated_monthly_savings.toFixed(2)} ${c.savings_calculation.currency} for ${c.savings_calculation.period.from.slice(0, 10)} → ${c.savings_calculation.period.to.slice(0, 10)} (conditional${r.integration_mode === 'mock' ? '; synthetic estimate' : ''})`
          : 'unknown',
      );
  }
  if (!r.candidates.length) {
    lines.push(
      '',
      r.completion_status === 'failed'
        ? 'INVESTIGATION FAILED — no candidate verdict'
        : r.completion_status === 'partial'
          ? 'INVESTIGATION INCOMPLETE — no candidate verdict'
          : 'NO ELIGIBLE CANDIDATES',
    );
    for (const gap of r.discovery.gaps.slice(0, 2))
      summaryLine(lines, 'Discovery gap', gap);
    const failure = r.trace.filter((t) => t.failure_code).at(-1);
    if (failure)
      summaryLine(
        lines,
        'Failure',
        `${failure.phase}: ${failure.failure_code}`,
      );
  }
  lines.push('');
  summaryLine(
    lines,
    'Mode',
    `${r.integration_mode.toUpperCase()}${r.integration_mode === 'mock' ? ' (synthetic data; no AWS calls)' : ''}; planner: ${r.planner.mode}${r.planner.model ? ` (${r.planner.model})` : ''}`,
  );
  summaryLine(
    lines,
    'Scope',
    `account=${r.request.account_id} region=${r.request.region}`,
  );
  summaryLine(
    lines,
    'Observed',
    `${r.request.window.from} → ${r.request.window.to}`,
  );
  summaryLine(lines, 'Stopped', r.stop_reason);
  if (
    r.historical_context.zetaris !== 'not_configured' ||
    r.historical_context.hmem !== 'not_configured'
  )
    summaryLine(
      lines,
      'Historical context',
      `Zetaris ${r.historical_context.zetaris}; H-MEM ${r.historical_context.hmem} (not current evidence)`,
    );
  lines.push(
    'Read-only. Any infrastructure change requires human review and approval.',
    'Use --verbose for full evidence and trace, or --json for report data.',
  );
  return `${lines.join('\n')}\n`;
}

/** Existing programmatic callers retain the full report; the CLI selects its mode. */
export function renderReport(
  value: InvestigationReport,
  { verbose = true }: { verbose?: boolean } = {},
): string {
  const r = validateReport(value);
  if (!verbose) return renderSummary(r);
  const lines = [
    `Cloud Cost Investigator — ${r.completion_status}`,
    `Investigation: ${r.investigation_id}`,
    `Goal: ${r.goal}`,
    `Current evidence: ${r.integration_mode.toUpperCase()}${r.integration_mode === 'mock' ? ' (synthetic data; no AWS calls)' : ''}`,
    `Planner: ${r.planner.mode}${r.planner.model ? ` (${r.planner.model})` : ' (deterministic; no model calls)'}`,
    `Scope: account=${r.request.account_id} region=${r.request.region}`,
    `Observed: ${r.request.window.from} → ${r.request.window.to}`,
    `Run: ${r.started_at} → ${r.finished_at}`,
    `Discovery: ${r.discovery.discovered_count} discovered instances; candidate limit ${r.discovery.candidate_limit}`,
    ...r.discovery.gaps.map((v) => `Discovery gap: ${v}`),
  ];
  for (const c of r.candidates) {
    lines.push(
      '',
      `Instance ${c.instance_id}: ${c.verdict}`,
      `Selected: ${c.selection_reason} ${citations(c.selection_evidence_ids)}`,
      `Proposed shutdown: ${schedule(c.proposed_window)}`,
      `Finding: ${c.explanation}`,
      `Supporting evidence: ${citations(c.supporting_evidence_ids)}`,
      `Contradicting evidence: ${citations(c.contradicting_evidence_ids)}`,
    );
    for (const h of c.hypotheses)
      lines.push(
        `Hypothesis ${h.state}: ${schedule(h.window)} — ${h.reason} ${citations(h.evidence_ids)}`,
      );
    if (c.verdict === 'not_recommended')
      lines.push(`Rejected shutdown window: ${schedule(c.proposed_window)}`);
    for (const [label, values] of [
      ['Risk', c.risks],
      ['Missing check', c.missing_checks],
      ['Assumption', c.assumptions],
      ['Next human action', c.next_human_actions],
    ] as const) {
      for (const v of values) lines.push(`${label}: ${v}`);
    }
    lines.push(
      c.savings_calculation
        ? `Estimated monthly savings: ${c.estimated_monthly_savings} ${c.savings_calculation.currency}; ${c.savings_calculation.period.from} → ${c.savings_calculation.period.to}; ${c.savings_calculation.eligible_days} days × avoided daily hours = ${c.savings_calculation.avoided_hours} hours × ${c.savings_calculation.hourly_compute_rate}/hour (rounded down). ${citations(c.savings_calculation.evidence_ids)}`
        : r.decision_policy
          ? 'Estimated monthly savings: null (not produced by reject-or-defer policy)'
          : 'Estimated monthly savings: null (unsupported marginal-cost and scheduling assumptions)',
    );
  }
  if (r.owner_evidence?.length) {
    lines.push(
      '',
      'Owner statements — unverified supporting context; not clearance or infrastructure approval:',
    );
    for (const e of r.owner_evidence)
      lines.push(
        `${e.instance_id}: ${e.topic}; attributed to ${e.owner}; asserted ${e.asserted_at}; applies ${e.valid_window.from} → ${e.valid_window.to}; reference: ${e.source_ref}`,
        `  ${e.statement}`,
      );
  }
  lines.push('', 'Retrieved current evidence:');
  for (const e of r.evidence) {
    lines.push(
      `${e.evidence_id}: ${e.tool} status=${e.status} source=${e.source} mode=${e.integration_mode}`,
      `  Scope: ${JSON.stringify(e.scope)}; observed=${e.observed_window.from} → ${e.observed_window.to}; collected=${e.collected_at}`,
      `  Coverage: complete=${e.coverage.complete} authoritative=${e.coverage.authoritative}; units=${e.units}; missing=${e.missing_fields.join(', ') || 'none'}`,
      `  Observation: ${JSON.stringify(e.data)}`,
      ...(e.metric_coverage ?? []).map(
        (c) =>
          `  ${c.field}: ${c.returned_points}/${c.expected_points} samples (${((100 * c.returned_points) / c.expected_points).toFixed(1)}%); period=${c.period_seconds}s; first=${c.first_sample_at ?? 'none'}; last=${c.last_sample_at ?? 'none'}`,
      ),
    );
  }
  lines.push('', 'Decision trace:');
  for (const t of r.trace) {
    lines.push(
      `${t.step}. ${t.phase}${t.status ? ` (${t.status})` : ''}${t.failure_code ? ` [${t.failure_code}]` : ''}: ${t.reason} ${citations(t.evidence_ids)}${t.provider_error ? ` Provider: ${t.provider_error.body}${t.provider_error.truncated ? ' [truncated]' : ''}` : ''}`,
    );
    lines.push(
      `  timestamp=${t.timestamp ?? 'unknown'}; trace_id=${t.trace_id}; confidence=${t.confidence}; retry_count=${t.retry_count ?? 'unknown'}`,
    );
    if (t.action) lines.push(`  Validated action: ${JSON.stringify(t.action)}`);
  }
  lines.push(
    '',
    `Historical context: Zetaris ${r.historical_context.zetaris.replace('_', ' ')}; H-MEM ${r.historical_context.hmem.replace('_', ' ')}; historical IDs ${citations(r.historical_context.context_ids)}.`,
  );
  for (const c of r.historical_context.comparisons ?? [])
    lines.push(
      `Historical comparison ${c.context_id}: instance=${c.instance_id}, recorded=${c.recorded_at}, mode=${c.source_mode}; previous verdict=${c.verdict}; proposed=${schedule(c.proposed_window)}; rejected=${c.rejected_windows.map(schedule).join('; ') || 'none'}. Historical only; current verdict requires fresh evidence.`,
    );
  for (const v of r.historical_context.limitations)
    lines.push(`History limitation: ${v}`);
  for (const v of r.limitations) lines.push(`Limitation: ${v}`);
  lines.push(
    `Budget: discovery=${r.budget.discovery_attempts}; candidate=${r.budget.candidate_attempts}; planner=${r.budget.planner_calls}; elapsed=${r.budget.elapsed_ms}ms`,
    `Stopped: ${r.stop_reason}`,
    'Infrastructure access is read-only. Any eventual change requires human review and approval.',
  );
  return `${lines.join('\n')}\n`;
}
