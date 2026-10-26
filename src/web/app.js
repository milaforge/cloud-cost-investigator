const $ = (id) => document.getElementById(id);
const isDemo = () => $('mode').value === 'demo';
const reports = {};
let active = null;
let candidateIndex = 0;
let loading = false;
let decisionKey = '';
const labels = {
  conditional_recommendation: 'Conditional recommendation',
  not_recommended: 'Not recommended',
  needs_verification: 'Needs verification',
};
const modes = {
  mock: 'Synthetic evidence',
  fixture: 'Fixture evidence',
  live: 'Live-source evidence',
  stub: 'Stub evidence',
};
const node = (tag, text, className) => {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (className) el.className = className;
  return el;
};
const human = (value) => value.replaceAll('_', ' ');
function buttonBusy(button, busy, label) {
  if (button.getAttribute('aria-busy') === String(busy)) return;
  if (busy) {
    button.dataset.idleLabel = button.textContent;
    button.textContent = label;
  } else if (button.dataset.idleLabel !== undefined) {
    button.textContent = button.dataset.idleLabel;
    delete button.dataset.idleLabel;
  }
  button.setAttribute('aria-busy', String(busy));
}
const toastDuration = 10_000;
let toastTimer;
let toastCountdown;
function dismissToast() {
  clearTimeout(toastTimer);
  toastCountdown?.cancel();
  toastCountdown = null;
  if (document.activeElement === $('dismiss-toast')) $('mode').focus();
  $('toast').hidden = true;
  $('toast-message').textContent = '';
}
function showToast(message) {
  dismissToast();
  $('toast').hidden = false;
  $('toast-message').textContent = message;
  toastCountdown = $('toast-countdown').animate(
    [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }],
    {
      duration: toastDuration,
      easing: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'steps(10, end)'
        : 'linear',
      fill: 'forwards',
    },
  );
  toastTimer = setTimeout(dismissToast, toastDuration);
}
$('dismiss-toast').addEventListener('click', () => {
  dismissToast();
  $(isDemo() ? 'scenario' : 'run-investigate').focus();
});
let infoId = 0;
function info(label, text, symbol = 'i', className = 'info-button') {
  const wrapper = node('span', undefined, 'info');
  const button = node('button', symbol, className);
  button.type = 'button';
  button.setAttribute('aria-label', label);
  const tip = node('span', text, 'tooltip');
  tip.id = `info-${++infoId}`;
  tip.setAttribute('role', 'tooltip');
  button.setAttribute('aria-describedby', tip.id);
  let hideTimer;
  const show = () => {
    clearTimeout(hideTimer);
    tip.hidden = false;
    const rect = button.getBoundingClientRect();
    const left = Math.max(
      16,
      Math.min(rect.left - 100, window.innerWidth - tip.offsetWidth - 16),
    );
    const top =
      rect.bottom + tip.offsetHeight + 12 > window.innerHeight
        ? rect.top - tip.offsetHeight - 8
        : rect.bottom + 8;
    tip.style.left = `${left}px`;
    tip.style.top = `${Math.max(8, top)}px`;
  };
  const hide = () => {
    clearTimeout(hideTimer);
    tip.hidden = true;
  };
  tip.hidden = true;
  wrapper.addEventListener('pointerenter', show);
  wrapper.addEventListener('pointerleave', () => {
    if (document.activeElement !== button) hideTimer = setTimeout(hide, 120);
  });
  button.addEventListener('focus', show);
  button.addEventListener('blur', hide);
  button.addEventListener('click', show);
  wrapper.append(button, tip);
  return wrapper;
}
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape')
    for (const tip of document.querySelectorAll('.tooltip')) tip.hidden = true;
});
function clockTime(value) {
  const time = node('time', `${value.slice(11, 23)} UTC`);
  time.dateTime = value;
  time.title = value;
  return time;
}
const verdicts = {
  conditional_recommendation: [
    'Shutdown conditionally recommended',
    'For this window · human approval required',
    '✓',
  ],
  not_recommended: [
    'Shutdown not recommended for this window',
    'Evaluated window rejected · see cited conflict',
    '×',
  ],
  needs_verification: ['Recommendation withheld', 'More evidence needed', '?'],
};
const toolTitles = {
  list_ec2_instances: 'Discover instances',
  get_ec2_billing: 'Check compute spend',
  get_ec2_metrics: 'Find potential off-hours windows',
  get_ec2_operations: 'Check scheduled jobs',
  get_ec2_dependencies: 'Check dependencies',
};
const schedule = (w) =>
  w
    ? `${String(w.start_hour_utc).padStart(2, '0')}:00–${String(w.end_hour_utc).padStart(2, '0')}:00 UTC`
    : 'No window established';
function disclosure(title, children) {
  const el = node('details');
  el.append(node('summary', title), ...children);
  return el;
}
function list(items) {
  const el = node('ul');
  for (const item of items) el.append(node('li', item));
  return el;
}
function facts(value) {
  const dl = node('dl');
  for (const [key, item] of Object.entries(value)) {
    dl.append(
      node('dt', human(key)),
      node(
        'dd',
        typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item),
      ),
    );
  }
  return dl;
}
function citations(ids) {
  const group = node('span', undefined, 'citations');
  const report = reports[active];
  for (const id of ids) {
    const observation = report.evidence.find((e) => e.evidence_id === id);
    const button = node(
      'button',
      human(observation.tool.replace('get_ec2_', '').replace('list_ec2_', '')),
      'citation',
    );
    button.type = 'button';
    button.title = id;
    button.addEventListener('click', () => {
      $('evidence-body').replaceChildren(
        node(
          'p',
          `${human(observation.tool)} · ${human(observation.status)}`,
          'eyebrow',
        ),
        facts(observation.data ?? { finding: 'No usable data returned' }),
        ...coverageDetails(observation),
        disclosure('Source and coverage', [
          facts(
            Object.fromEntries(
              Object.entries(observation).filter(([key]) => key !== 'data'),
            ),
          ),
        ]),
      );
      $('evidence').showModal();
    });
    group.append(button);
  }
  return group;
}
function coverageDetails(observation) {
  const result = [];
  if (observation.metric_coverage?.length) {
    result.push(
      node('h4', 'Metric coverage'),
      list(
        observation.metric_coverage.map(
          (c) =>
            `${c.field}: ${c.returned_points.toLocaleString()}/${c.expected_points.toLocaleString()} samples (${((100 * c.returned_points) / c.expected_points).toFixed(1)}%)`,
        ),
      ),
    );
  }
  if (observation.metric_coverage?.length)
    result.push(
      disclosure('Intervals & sample timestamps (UTC)', [
        list(
          observation.metric_coverage.map(
            (c) =>
              `${c.field}: ${c.period_seconds / 60}-minute intervals; first ${c.first_sample_at ?? 'none'}; last ${c.last_sample_at ?? 'none'}`,
          ),
        ),
      ]),
    );
  const optional =
    observation.tool === 'list_ec2_instances'
      ? (observation.data?.instances ?? []).filter(
          (i) => i.missing_metadata?.length,
        )
      : [];
  if (optional.length)
    result.push(
      node(
        'p',
        'Optional metadata missing; resource discovery coverage is assessed separately.',
        'hint',
      ),
      list(
        optional.map(
          (i) => `${i.instance_id}: ${i.missing_metadata.join(', ')}`,
        ),
      ),
    );
  return result;
}
function timeline(candidate, report) {
  const section = node('section', undefined, 'schedule');
  section.append(
    node('h3', 'Proposed shutdown'),
    node('p', `${schedule(candidate.proposed_window)} · daily`),
  );
  if (!candidate.proposed_window) return section;
  const observations = report.evidence.filter(
    (e) => e.scope.instance_id === candidate.instance_id && e.data?.jobs,
  );
  const jobs = observations.flatMap((e) =>
    e.data.jobs.map((job) => ({ ...job, evidence: e.evidence_id })),
  );
  const rows = [
    {
      label: 'Shutdown window',
      window: candidate.proposed_window,
      className: 'window',
    },
    ...jobs.map((j) => ({
      label: `${j.critical ? 'Critical job' : 'Job'}: ${j.job_id}`,
      window: j.window,
      className: 'job',
      evidence: j.evidence,
    })),
  ];
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 720 ${rows.length * 34 + 24}`);
  svg.setAttribute('aria-hidden', 'true');
  rows.forEach((row, i) => {
    const rect = document.createElementNS(svg.namespaceURI, 'rect');
    rect.setAttribute('x', String(row.window.start_hour_utc * 30));
    rect.setAttribute('y', String(i * 34 + 3));
    rect.setAttribute(
      'width',
      String((row.window.end_hour_utc - row.window.start_hour_utc) * 30),
    );
    rect.setAttribute('height', '18');
    rect.setAttribute('rx', '4');
    rect.setAttribute('class', row.className);
    svg.append(rect);
    if (i > 0) {
      const p = node('p', `${row.label} · ${schedule(row.window)}`);
      p.append(citations([row.evidence]));
      section.append(p);
    }
  });
  const axis = node('div', undefined, 'axis');
  for (const label of ['00:00', '12:00', '24:00 UTC'])
    axis.append(node('span', label));
  section.append(svg, axis);
  return section;
}
function render(focusCandidate = false) {
  syncDecisionForm();
  for (const button of document.querySelectorAll('[data-view]')) {
    button.disabled = !canShowView(button.dataset.view);
    button.title = button.disabled
      ? 'Run an investigation or load a live report first.'
      : '';
  }
  const r = reports[active];
  $('live-learning-result').replaceChildren(
    !isDemo() && r
      ? facts({
          investigation_id: r.investigation_id,
          hmem: r.historical_context.hmem,
          limitations: r.historical_context.limitations,
        })
      : node(
          'p',
          'Run a live investigation or load a live report to inspect its memory status.',
          'hint',
        ),
  );
  for (const button of document.querySelectorAll('[data-report]'))
    button.setAttribute(
      'aria-pressed',
      String(button.dataset.report === active),
    );
  const root = $('report');
  root.replaceChildren();
  root.setAttribute('aria-busy', 'false');
  if (!r) {
    const empty = node('div', undefined, 'empty-report');
    const selected = $('scenario').value;
    const live = !isDemo();
    empty.append(
      node(
        'h2',
        live
          ? 'Ready for live evidence'
          : selected
            ? 'Scenario selected'
            : 'Choose a scenario to begin',
      ),
      node(
        'p',
        live
          ? 'Run an investigation to load evidence for your AWS scope.'
          : selected
            ? 'Waiting for this scenario preview. Restart the local server if it does not appear.'
            : 'No scenario is selected. Choose one above or open an A/B preview.',
        'muted',
      ),
    );
    root.append(empty);
    return;
  }
  const meta = node('div', undefined, 'report-meta');
  const mode = node(
    'span',
    `${modes[r.integration_mode]} · ${r.planner.mode === 'scripted' ? 'Scripted planner' : 'Model planner'}`,
    'mode',
  );
  mode.append(
    info(
      'About this investigation',
      `${r.planner.mode === 'scripted' ? 'Scripted planner · no model calls' : r.planner.model}. Account ${r.request.account_id}, ${r.request.region}. Observed ${r.request.window.from} to ${r.request.window.to}.`,
    ),
  );
  const runTime = node('span', undefined, 'run-time');
  runTime.append(
    node('span', `${r.started_at.slice(0, 10)} · `),
    clockTime(r.started_at),
    node('span', ' → '),
    clockTime(r.finished_at),
  );
  const zetaris = r.historical_context.zetaris;
  const historyStatus = node(
    'span',
    `Zetaris history: ${human(zetaris)}`,
    'mode',
  );
  historyStatus.append(
    info(
      'Zetaris history status',
      'Historical decision records are queried only for discovered instances when selected. They do not replace current evidence. Browser investigations do not append records.',
    ),
  );
  meta.append(mode, historyStatus, runTime);
  root.append(meta);
  if (r.completion_status !== 'complete')
    root.append(
      node(
        'p',
        `Investigation ${r.completion_status}: ${r.stop_reason === 'metrics_evidence_incomplete' ? 'Stopped at the utilization evidence gate. Incomplete metrics prevented a supported UTC window; targeted jobs and dependency checks were not reached.' : human(r.stop_reason)}`,
        'notice',
      ),
    );
  if (r.discovery.gaps.length) {
    const gaps = disclosure('Discovery gaps', [list(r.discovery.gaps)]);
    gaps.open = r.completion_status !== 'complete' && !r.candidates.length;
    root.append(gaps);
  }
  if (r.candidates.length > 1) {
    const label = node('label', 'Instance ', 'candidate-select');
    const select = node('select');
    r.candidates.forEach((c, i) => {
      const option = node('option', `${c.instance_id} · ${labels[c.verdict]}`);
      option.value = String(i);
      select.append(option);
    });
    select.value = String(candidateIndex);
    select.addEventListener('change', () => {
      candidateIndex = Number(select.value);
      render(true);
    });
    label.append(select);
    root.append(label);
    if (focusCandidate) select.focus();
  }
  const c = r.candidates[candidateIndex];
  const layout = node('div', undefined, 'report-layout');
  if (c) {
    const card = node('article', undefined, `decision ${c.verdict}`);
    const [headline, qualifier, symbol] = verdicts[c.verdict];
    const top = node('div', undefined, 'decision-top');
    const icon = node('span', symbol, 'verdict-icon');
    icon.setAttribute('aria-hidden', 'true');
    top.append(node('span', 'FINAL VERDICT', 'eyebrow'), icon);
    card.append(
      top,
      node('h2', headline),
      node('p', qualifier, 'verdict-qualifier'),
      node('p', c.instance_id, 'instance-id'),
    );
    const reason = node('div', undefined, 'decision-reason');
    reason.append(
      node('p', c.explanation, 'explanation'),
      citations([
        ...new Set([
          ...c.contradicting_evidence_ids,
          ...c.supporting_evidence_ids,
        ]),
      ]),
    );
    card.append(reason);
    const metrics = node('div', undefined, 'decision-metrics');
    const window = node('div');
    window.append(
      node('span', 'Proposed window', 'metric-label'),
      node('strong', schedule(c.proposed_window)),
    );
    const savings = node('div');
    const savingsLabel = node('span', 'Monthly savings', 'metric-label');
    savingsLabel.append(
      info(
        'About savings',
        'Conditional compute-only estimate, not realized savings. Retained resource costs are excluded. No estimate is shown without adequate pricing and scheduling evidence.',
      ),
    );
    savings.append(
      savingsLabel,
      node(
        'strong',
        c.estimated_monthly_savings === null
          ? 'Not estimated'
          : `${c.estimated_monthly_savings.toFixed(2)} ${c.savings_calculation.currency}`,
      ),
    );
    metrics.append(window, savings);
    card.append(metrics);
    const next = node('div', undefined, 'next-action');
    next.append(node('h3', 'Next action'), list(c.next_human_actions));
    card.append(next);
    if (
      r.completion_status === 'complete' &&
      c.verdict === 'conditional_recommendation'
    ) {
      const decide = node(
        'button',
        isDemo()
          ? 'Explore follow-through demo'
          : 'Record your decision in Zetaris',
      );
      decide.type = 'button';
      decide.addEventListener('click', () => {
        showView('followup');
        if (!isDemo()) $('decision-choice').focus();
      });
      card.append(decide);
    }
    if (c.missing_checks.length) {
      const pending = node('div', undefined, 'pending-checks');
      pending.append(
        node('span', `${c.missing_checks.length} checks remain unverified`),
        info('Unverified checks', c.missing_checks.join(' ')),
      );
      card.append(pending);
    }
    layout.append(card);
  } else {
    const empty = node('article');
    empty.append(
      node(
        'h2',
        r.completion_status === 'complete'
          ? 'No eligible candidates found'
          : r.completion_status === 'failed'
            ? 'Investigation failed — required checks could not complete'
            : 'No candidate conclusion available',
      ),
    );
    if (r.completion_status !== 'complete') {
      const gaps = r.evidence.filter(
        (e) =>
          ['partial', 'unavailable', 'error'].includes(e.status) ||
          e.missing_fields.length,
      );
      if (gaps.length)
        empty.append(
          node('h3', 'Evidence checks needing attention'),
          list(
            gaps.map(
              (e) =>
                `${e.tool} · ${human(e.status)}${e.missing_fields.length ? ` · ${e.missing_fields.join(', ')}` : ''}`,
            ),
          ),
        );
    }
    layout.append(empty);
  }

  const journey = node('section', undefined, 'journey');
  const heading = node('div', undefined, 'section-heading');
  const title = node('h2', 'How it got there');
  title.append(
    info(
      'About timeline timestamps',
      'Times show when cited evidence was collected, not when reasoning occurred. Individual reasoning steps have no recorded timestamps. The full trace below preserves every step.',
    ),
  );
  heading.append(node('p', 'THE INVESTIGATION', 'eyebrow'), title);
  journey.append(heading);
  const steps = node('ol', undefined, 'journey-steps');
  const relevant = r.trace.filter((t) => {
    if (t.phase === 'finish') return false;
    // Proposals have no instance field; only instance-scoped citations can
    // attribute them to this candidate. Unattributed attempts stay in the full trace.
    if (
      t.action?.type === 'propose' &&
      c &&
      !t.evidence_ids.some((id) =>
        r.evidence.some(
          (e) => e.evidence_id === id && e.scope.instance_id === c.instance_id,
        ),
      )
    )
      return false;
    if (
      t.action?.args?.instance_id &&
      c &&
      t.action.args.instance_id !== c.instance_id
    )
      return false;
    if (
      t.evidence_ids.length &&
      c &&
      !t.evidence_ids.some((id) => {
        const e = r.evidence.find((item) => item.evidence_id === id);
        return (
          e && (!e.scope.instance_id || e.scope.instance_id === c.instance_id)
        );
      })
    )
      return false;
    return (
      t.phase === 'tool' ||
      t.action?.type === 'propose' ||
      (t.phase === 'evaluator' &&
        t.evidence_ids.some((id) => c?.contradicting_evidence_ids.includes(id)))
    );
  });
  relevant.forEach((t, index) => {
    const step = node('li', undefined, 'journey-step');
    const number = node(
      'span',
      String(index + 1).padStart(2, '0'),
      'step-number',
    );
    const body = node('div', undefined, 'step-body');
    const isConflict = t.phase === 'evaluator';
    const isProposal = t.action?.type === 'propose';
    const heading = node(
      'h3',
      isConflict
        ? 'Reject the proposed window'
        : isProposal
          ? 'Propose a shutdown window'
          : (toolTitles[t.action?.tool] ?? human(t.phase)),
    );
    heading.append(info(`Details for step ${t.step}`, t.reason));
    const stamp = node('div', undefined, 'step-time');
    const observed =
      t.phase === 'tool'
        ? r.evidence.find((e) => t.evidence_ids.includes(e.evidence_id))
        : null;
    if (observed)
      stamp.append(
        clockTime(observed.collected_at),
        node('span', ' · collected'),
      );
    else stamp.append(node('span', `Trace step ${t.step} · time not recorded`));
    body.append(heading, stamp);
    if (isProposal)
      body.append(
        node(
          'p',
          `${schedule(t.action.window)} · pending checks`,
          'step-summary',
        ),
      );
    else if (isConflict) {
      body.append(
        node(
          'p',
          'Current evidence contradicts the hypothesis.',
          'step-summary',
        ),
      );
      step.classList.add('conflict-step');
    } else if (t.status)
      body.append(node('span', human(t.status), `step-status ${t.status}`));
    if (observed) body.append(...coverageDetails(observed));
    if (observed?.missing_fields.length)
      body.append(
        node(
          'p',
          `Missing evidence: ${observed.missing_fields.join(', ')}`,
          'notice',
        ),
      );
    if (t.failure_code) body.append(node('p', human(t.failure_code), 'notice'));
    if (t.evidence_ids.length) body.append(citations(t.evidence_ids));
    step.append(number, body);
    steps.append(step);
  });
  const finalStep = node(
    'li',
    undefined,
    `journey-step final-step ${c?.verdict ?? 'needs_verification'}`,
  );
  const finalBody = node('div', undefined, 'step-body');
  finalBody.append(
    node('h3', c ? labels[c.verdict] : 'Investigation finished'),
    clockTime(r.finished_at),
    node('span', ' · run finished', 'step-time'),
  );
  finalStep.append(node('span', '•', 'step-number'), finalBody);
  steps.append(finalStep);
  journey.append(steps);
  layout.append(journey);
  root.append(layout);

  const details = node('section', undefined, 'report-details');
  if (c) {
    details.append(
      disclosure('Window, assumptions & remaining checks', [
        timeline(c, r),
        node('h3', 'Candidate selection'),
        node('p', c.selection_reason),
        citations(c.selection_evidence_ids),
        node('h3', 'Unverified checks'),
        list(c.missing_checks),
        node('h3', 'Risks & assumptions'),
        list([...c.risks, ...c.assumptions]),
        ...c.hypotheses.map((h) => {
          const step = node('div', undefined, 'step');
          step.append(
            node('h3', `${human(h.state)} · ${schedule(h.window)}`),
            node('p', h.reason),
            citations(h.evidence_ids),
          );
          return step;
        }),
        ...(c.savings_calculation
          ? [disclosure('Estimate assumptions', [facts(c.savings_calculation)])]
          : []),
      ]),
    );
  }
  if (r.owner_evidence?.length) {
    const statements = r.owner_evidence.map((e) => {
      const section = node('section');
      section.append(
        node('h3', `${e.instance_id} · ${human(e.topic)}`),
        node('p', `Attributed to ${e.owner} · asserted ${e.asserted_at}`),
        node('p', e.statement),
        node(
          'p',
          `Scope: ${e.account_id} / ${e.region}. Applies ${e.valid_window.from} → ${e.valid_window.to}. Reference: ${e.source_ref}`,
          'hint',
        ),
      );
      return section;
    });
    details.append(
      disclosure(
        `Owner evidence · ${statements.length} unverified statement(s)`,
        [
          node(
            'p',
            'Supporting context only. Owner identity is not verified. These statements do not satisfy safety checks or authorize infrastructure changes.',
            'notice',
          ),
          ...statements,
        ],
      ),
    );
  }
  if (r.limitations.length)
    details.append(
      disclosure(`Run limitations (${r.limitations.length})`, [
        list(r.limitations),
      ]),
    );
  const trace = r.trace.map((t) => {
    const step = node('div', undefined, 'step');
    step.append(
      node(
        'h3',
        `${t.step}. ${human(t.phase)}${t.action?.tool ? ` · ${t.action.tool}` : ''}${t.status ? ` · ${human(t.status)}` : ''}`,
      ),
      node('p', t.reason),
      node(
        'p',
        `trace_id: ${t.trace_id} · confidence: ${human(t.confidence)} · retry_count: ${t.retry_count ?? 'unknown'}`,
      ),
      citations(t.evidence_ids),
    );
    if (t.action) step.append(disclosure('Action details', [facts(t.action)]));
    if (t.failure_code) step.append(node('p', t.failure_code));
    return step;
  });
  details.append(
    disclosure(`Full investigation trace · ${r.trace.length} steps`, trace),
    disclosure('Historical context', [
      node(
        'p',
        'Past context is not current evidence or scheduling clearance.',
      ),
      facts(r.historical_context),
    ]),
    disclosure('Run details & export', [
      downloadButton(r, `investigation-${r.investigation_id}.json`),
      facts({
        investigation_id: r.investigation_id,
        started_at: r.started_at,
        finished_at: r.finished_at,
        ...r.budget,
        stop_reason: r.stop_reason,
      }),
      node('h3', 'Retrieved evidence'),
      citations(r.evidence.map((e) => e.evidence_id)),
    ]),
  );
  root.append(details);
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    for (const [index, el] of [
      ...root.querySelectorAll('.decision, .journey-step'),
    ].entries())
      el.animate(
        [
          { opacity: 0, transform: 'translateY(10px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        {
          duration: 360,
          delay: Math.min(index * 55, 440),
          fill: 'backwards',
          easing: 'cubic-bezier(.2,.8,.2,1)',
        },
      );
  }
}
async function loadReport(file) {
  if (isDemo() || !file || loading) return;
  if (file.size > 2 * 1024 * 1024) {
    $('message').textContent =
      'Report exceeds 2 MiB. Your current report is unchanged.';
    return;
  }
  loading = true;
  $('mode').disabled = true;
  $('load').disabled = true;
  $('message').textContent = 'Validating report…';
  try {
    const response = await fetch('/api/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: await file.text(),
      signal: AbortSignal.timeout(10000),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    if ((result.integration_mode === 'live') === isDemo()) {
      $('message').textContent =
        `Switch to ${result.integration_mode === 'live' ? 'Live' : 'Demo'} mode to load this report. Your current report is unchanged.`;
      return;
    }
    reports.loaded = result;
    dismissToast();
    $('loaded').textContent = 'Loaded report';
    active = 'loaded';
    candidateIndex = 0;
    $('loaded').hidden = false;
    render();
    $('message').textContent =
      'Report loaded. Validation checks consistency, not authenticity of the supplied evidence.';
  } catch {
    $('message').textContent =
      'Could not load report. Choose a valid single investigation JSON report. Your current report is unchanged.';
  } finally {
    loading = false;
    $('mode').disabled = submitted || currentJob?.status === 'running';
    $('load').disabled = false;
    $('file').value = '';
  }
}
for (const button of document.querySelectorAll('[data-report]'))
  button.addEventListener('click', () => {
    if (isDemo() === (button.dataset.report === 'loaded')) return;
    if (isDemo()) return selectScenario(button.dataset.report);
    dismissToast();
    active = button.dataset.report;
    if (['A', 'B'].includes(active)) $('scenario').value = active;
    $('message').textContent = '';
    candidateIndex = 0;
    render();
  });
$('load').addEventListener('click', () => {
  if (!isDemo()) $('file').click();
});
$('file').addEventListener('change', () => loadReport($('file').files[0]));
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => {
  e.preventDefault();
  if (isDemo()) return;
  if (e.dataTransfer.files.length !== 1) {
    $('message').textContent = 'Choose one report at a time.';
    return;
  }
  loadReport(e.dataTransfer.files[0]);
});
$('close-evidence').addEventListener('click', () => $('evidence').close());
let currentJob = null;
let submitted = false;
let submittingKind = null;
let polling = null;
let appliedJob = null;
const runButtons = ['run-investigate', 'save-decision'];
function syncRunButtonLoading() {
  const kind = submitted
    ? submittingKind
    : currentJob?.status === 'running' && jobMatchesMode(currentJob)
      ? currentJob.kind
      : null;
  buttonBusy($('run-investigate'), kind === 'investigate', 'Investigating…');
  if (kind === 'investigate')
    $('run-investigate').textContent = submitted
      ? 'Checking configuration…'
      : 'Investigating…';
  buttonBusy($('save-decision'), kind === 'decision', 'Saving decision…');
}
async function selectScenario(scenario) {
  dismissToast();
  if (!isDemo()) return;
  $('scenario').value = scenario;
  active = reports[scenario] ? scenario : null;
  candidateIndex = 0;
  $('message').textContent = '';
  render();
  if (!scenario || active) return;
  $('report').setAttribute('aria-busy', 'true');
  $('message').textContent = 'Preparing synthetic preview…';
  try {
    const response = await fetch(
      `/api/demos?scenario=${encodeURIComponent(scenario)}`,
      {
        signal: AbortSignal.timeout(125000),
      },
    );
    if (!response.ok) throw new Error();
    Object.assign(reports, await response.json());
    if (!isDemo() || $('scenario').value !== scenario) return;
    active = scenario;
    $('message').textContent = '';
    render();
  } catch {
    if (!isDemo() || $('scenario').value !== scenario) return;
    $('report').setAttribute('aria-busy', 'false');
    $('message').textContent =
      'Could not load preview. Select the scenario again to retry.';
  }
}
$('scenario').addEventListener('change', () =>
  selectScenario($('scenario').value),
);
function canShowView(view) {
  return (
    view === 'investigate' ||
    isDemo() ||
    reports[active]?.integration_mode === 'live'
  );
}
function showView(view) {
  if (!canShowView(view)) return;
  dismissToast();
  for (const name of ['investigate', 'learn', 'followup'])
    $(`view-${name}`).hidden = name !== view;
  for (const button of document.querySelectorAll('[data-view]'))
    button.setAttribute('aria-pressed', String(button.dataset.view === view));
}
for (const button of document.querySelectorAll('[data-view]'))
  button.addEventListener('click', () => showView(button.dataset.view));
function setMode() {
  const demo = isDemo();
  for (const element of document.querySelectorAll('[data-demo-only]'))
    element.hidden = !demo;
  for (const element of document.querySelectorAll('[data-live-only]'))
    element.hidden = demo;
  $('live-evidence').hidden = demo;
  $('decision-ack').checked = false;
  $('scenario').value = '';
  $('loaded').hidden = true;
  if ($('evidence').open) $('evidence').close();
  $('message').textContent = '';
  dismissToast();
  active = null;
  candidateIndex = 0;
  showView('investigate');
  render();
  // Switching mode is not a request to open a prior completed result.
  if (currentJob?.status === 'complete') appliedJob = currentJob.request_id;
  paintJob(currentJob);
  if (!demo) loadConfiguration();
}
$('mode').addEventListener('change', setMode);
function showReport(report) {
  if (isDemo() || report.integration_mode !== 'live') return;
  reports.loaded = report;
  $('loaded').textContent = 'Run result';
  active = 'loaded';
  candidateIndex = 0;
  $('loaded').hidden = false;
  showView('investigate');
  render();
  $('message').textContent =
    'Investigation result. Inspect evidence and trace below.';
  $('report').scrollIntoView({ block: 'start' });
}
function downloadButton(value, filename) {
  const button = node('button', 'Download JSON');
  button.type = 'button';
  button.addEventListener('click', () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }),
    );
    const link = node('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  return button;
}
function decisionTarget() {
  const report = reports[active];
  if (isDemo() || report?.integration_mode !== 'live') return null;
  const candidate = report?.candidates[candidateIndex];
  return report?.completion_status === 'complete' &&
    candidate?.verdict === 'conditional_recommendation'
    ? { report, candidate }
    : null;
}
function syncDecisionForm() {
  const target = decisionTarget();
  const key = target
    ? `${target.report.investigation_id}:${target.candidate.instance_id}`
    : '';
  if (key === decisionKey) return;
  decisionKey = key;
  $('decision-form').reset();
  $('decision-review-field').hidden = true;
  $('decision-review').required = false;
  $('decision-fields').disabled =
    !target || submitted || currentJob?.status === 'running';
  $('save-decision').disabled = $('decision-fields').disabled;
  $('decision-receipt').replaceChildren();
  $('decision-context').textContent = target
    ? `${modes[target.report.integration_mode]} · Account ${target.report.request.account_id} · ${target.report.request.region} · ${target.candidate.instance_id} · Daily ${schedule(target.candidate.proposed_window)} UTC. Investigation ${target.report.investigation_id}.`
    : 'Run an investigation or load a report, then select a completed conditional recommendation in Investigate.';
}
function renderDecisionReceipt(receipt) {
  const record = receipt.decision.record;
  const event = JSON.parse(record.summary_json);
  $('decision-receipt').replaceChildren(
    node('h3', 'Saved to Zetaris'),
    node('p', 'Recommendation and decision readback verified.', 'mode'),
    node(
      'p',
      `${modes[record.source_mode]} · ${record.account_id} · ${record.region} · ${record.instance_id}`,
    ),
    node(
      'p',
      `${human(event.kind)} by ${event.actor} · ${record.recorded_at_utc}`,
    ),
    node('p', event.reason),
    ...(event.kind === 'deferred'
      ? [node('p', `Review due: ${event.review_at}`)]
      : []),
    node('p', 'No infrastructure change was executed.', 'hint'),
    disclosure('Zetaris storage receipt', [
      facts({
        recommendation_record_id: receipt.recommendation.record.record_id,
        decision_record_id: record.record_id,
        investigation_id: record.investigation_id,
      }),
      downloadButton(receipt, 'zetaris-decision-receipt.json'),
    ]),
  );
}
$('decision-choice').addEventListener('change', () => {
  const deferred = $('decision-choice').value === 'deferred';
  $('decision-review-field').hidden = !deferred;
  $('decision-review').required = deferred;
});
$('decision-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (submitted || currentJob?.status === 'running') return;
  const target = decisionTarget();
  if (!target || !$('decision-form').reportValidity()) return;
  const decision = {
    kind: $('decision-choice').value,
    actor: $('decision-actor').value.trim(),
    reason: $('decision-reason').value.trim(),
  };
  if (!decision.reason) {
    showToast('Enter a reason for your decision.');
    return;
  }
  if (decision.kind === 'deferred') {
    const date = new Date(`${$('decision-review').value}Z`);
    if (!Number.isFinite(+date) || +date <= Date.now()) {
      showToast('Choose a future UTC review date.');
      $('decision-review').focus();
      return;
    }
    decision.review_at = date.toISOString();
  }
  $('decision-receipt').replaceChildren();
  await submitRun({
    request_id: crypto.randomUUID(),
    kind: 'decision',
    real_services: true,
    allow_append: $('decision-ack').checked,
    report: target.report,
    instance_id: target.candidate.instance_id,
    decision,
  });
});
function renderEvents(events) {
  const root = $('run-events');
  root.closest('.event-panel').hidden = events.length === 0;
  const statuses = {
    ok: ['✓', 'event-ok', 'Complete'],
    no_match: ['○', 'event-neutral', 'No match'],
    partial: ['⚠', 'event-warning', 'Partial — evidence incomplete'],
    unavailable: ['✕', 'event-not-ok', 'Unavailable'],
    error: ['✕', 'event-not-ok', 'Failed'],
  };
  const groups = [];
  let current = null;
  for (const value of events) {
    const text = String(value);
    const planner = /^Planner call (\d+) started$/.exec(text);
    const phase = /^\[warm-demo\] (cold|warm|changed):/.exec(text);
    if (planner || (phase && current?.key !== `phase-${phase[1]}`)) {
      current = {
        key: planner ? `planner-${planner[1]}` : `phase-${phase[1]}`,
        title: planner
          ? `Planner call ${planner[1]}`
          : `${human(phase[1])} run`,
        events: planner ? [] : [text],
      };
      groups.push(current);
    } else if (current) current.events.push(text);
    else groups.push({ events: [text] });
  }
  $('event-count').textContent = `${events.length}`;
  const tree = document.createDocumentFragment();
  for (const group of groups) {
    if (!group.key) {
      const line = node('div', group.events[0], 'event-leaf event-context');
      tree.append(line);
      continue;
    }
    const branch = node('div', undefined, 'event-branch');
    const heading = node('div', undefined, 'event-branch-heading');
    heading.append(node('span', group.title, 'event-title'));
    const children = node('div', undefined, 'event-children');
    for (const entry of group.events) {
      const step = /^(\d+)\. (.*)$/.exec(entry);
      const line = node('div', undefined, 'event-leaf');
      if (step) line.append(node('span', `${step[1]}. `, 'event-step'));
      const parts = (step ? step[2] : entry).split(' · ');
      const metadata = parts.filter((part) =>
        /^(trace_id|confidence|retry_count)=/.test(part),
      );
      const visible = parts.filter((part) => !metadata.includes(part));
      for (const [index, part] of visible.entries()) {
        if (index) line.append(document.createTextNode(' · '));
        if (Object.hasOwn(statuses, part)) {
          const status = statuses[part];
          line.append(
            info(status[2], status[2], status[0], `event-result ${status[1]}`),
          );
        } else line.append(document.createTextNode(part));
      }
      if (metadata.length)
        line.append(
          document.createTextNode(' '),
          info('Trace metadata', metadata.join(' · ')),
        );
      children.append(line);
    }
    branch.append(heading, children);
    tree.append(branch);
  }
  root.replaceChildren(tree);
}
function jobMatchesMode(job) {
  return (
    !isDemo() &&
    job.source_mode === 'live' &&
    ['investigate', 'decision'].includes(job.kind)
  );
}
function paintJob(job) {
  $('mode').disabled =
    loading || submitted || (!isDemo() && job?.status === 'running');
  if (!job) {
    currentJob = null;
    syncRunButtonLoading();
    $('decision-fields').disabled = submitted || !decisionTarget();
    $('run-state').hidden = true;
    $('cancel-run').hidden = true;
    $('view-last-result').hidden = true;
    renderEvents([]);
    $('run-events').dataset.events = '[]';
    runButtons.forEach((id) => {
      $(id).disabled =
        submitted || (id === 'save-decision' && !decisionTarget());
    });
    return;
  }
  currentJob = job;
  syncRunButtonLoading();
  const running = job.status === 'running';
  $('run-state').hidden = !jobMatchesMode(job);
  $('decision-fields').disabled = running || submitted || !decisionTarget();
  runButtons.forEach((id) => {
    $(id).disabled =
      running || submitted || (id === 'save-decision' && !decisionTarget());
  });
  $('cancel-run').hidden = !running || !jobMatchesMode(job);
  $('view-last-result').hidden =
    job.status !== 'complete' || !job.result || !jobMatchesMode(job);
  const status = `${human(job.kind)} · ${job.status}${job.error ? ` — ${job.error}` : ''}${running ? ` · ${job.activity || job.events.at(-1) || 'Starting worker…'}` : ''}`;
  if ($('run-status').textContent !== status)
    $('run-status').textContent = status;
  if (JSON.stringify(job.events) !== $('run-events').dataset.events) {
    renderEvents(job.events);
    $('run-events').dataset.events = JSON.stringify(job.events);
  }
  if (
    job.status === 'complete' &&
    job.result &&
    jobMatchesMode(job) &&
    appliedJob !== job.request_id
  ) {
    appliedJob = job.request_id;
    if (job.kind === 'investigate') showReport(job.result);
    else if (job.kind === 'decision') {
      renderDecisionReceipt(job.result);
      showView('followup');
    }
    const complete =
      job.kind === 'investigate'
        ? job.result.completion_status === 'complete'
        : job.kind === 'decision' || job.result.passed;
    $('run-status').textContent =
      job.kind === 'investigate' && job.result.completion_status === 'failed'
        ? `Investigate · Failed — ${human(job.result.stop_reason)}; inspect discovery gaps`
        : job.kind === 'decision'
          ? 'Saved to Zetaris — recommendation and decision readback verified'
          : `${human(job.kind)} · ${complete ? 'Finished' : 'Finished with incomplete or failed checks — inspect the result'}`;
  }
}
async function pollJob() {
  clearTimeout(polling);
  try {
    const response = await fetch('/api/job', {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error();
    const job = await response.json();
    // A completed prior run is available on demand, never the initial selection.
    if (!currentJob && !appliedJob && job?.status === 'complete')
      appliedJob = job.request_id;
    paintJob(job);
    if (job?.status === 'running') polling = setTimeout(pollJob, 500);
  } catch {
    $('run-state').hidden = isDemo();
    $('run-status').textContent =
      'Connection lost. The run may still be active. Reconnecting without restarting it…';
    runButtons.forEach((id) => {
      $(id).disabled = true;
    });
    polling = setTimeout(pollJob, 2000);
  }
}
async function startRun(kind) {
  if (
    isDemo() ||
    kind !== 'investigate' ||
    submitted ||
    currentJob?.status === 'running'
  )
    return;
  const body = {
    request_id: crypto.randomUUID(),
    kind,
    evidence: 'aws',
    real_services: true,
    allow_append: false,
  };
  await submitRun(body);
}
async function submitRun(body) {
  if (
    isDemo() ||
    (body.kind !== 'investigate' && body.kind !== 'decision') ||
    (body.kind === 'investigate' && body.evidence !== 'aws') ||
    (body.kind === 'decision' && body.report?.integration_mode !== 'live')
  )
    return;
  submitted = true;
  submittingKind = body.kind;
  syncRunButtonLoading();
  $('mode').disabled = true;
  runButtons.forEach((id) => {
    $(id).disabled = true;
  });
  $('decision-fields').disabled = true;
  try {
    const response = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    const result = await response.json();
    if (!response.ok) {
      paintJob(currentJob);
      showToast(result.error);
      $(
        body.kind === 'investigate' ? 'run-investigate' : 'save-decision',
      ).focus();
      return;
    }
    paintJob(result);
    polling = setTimeout(pollJob, 100);
  } catch {
    $('run-state').hidden = false;
    $('run-status').textContent =
      'Start could not be confirmed. Checking server state; the action will not be resubmitted.';
    polling = setTimeout(pollJob, 500);
  } finally {
    submitted = false;
    submittingKind = null;
    syncRunButtonLoading();
    $('mode').disabled = loading || currentJob?.status === 'running';
    $('decision-fields').disabled =
      currentJob?.status === 'running' || !decisionTarget();
    runButtons.forEach((id) => {
      $(id).disabled =
        currentJob?.status === 'running' ||
        (id === 'save-decision' && !decisionTarget());
    });
  }
}
$('run-investigate').addEventListener('click', () => startRun('investigate'));
$('view-last-result').addEventListener('click', () => {
  if (currentJob?.status !== 'complete' || !jobMatchesMode(currentJob)) return;
  appliedJob = null;
  paintJob(currentJob);
});
$('cancel-run').addEventListener('click', async () => {
  if (currentJob?.status !== 'running' || !jobMatchesMode(currentJob)) return;
  $('cancel-run').disabled = true;
  $('cancel-run').textContent = 'Stopping…';
  try {
    const response = await fetch('/api/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: currentJob.request_id }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error();
    paintJob(await response.json());
  } catch {
    $('run-status').textContent =
      'Stop could not be confirmed. Reconnecting; no new action was submitted.';
  } finally {
    $('cancel-run').disabled = false;
    $('cancel-run').textContent = 'Stop run';
  }
  polling = setTimeout(pollJob, 500);
});
async function loadConfiguration() {
  return fetch('/api/config')
    .then((r) => r.json())
    .then((config) => {
      $('followup-config').textContent =
        config.zetaris && config.zetaris_append
          ? 'Zetaris is configured for saving decisions. Connectivity is verified when you save.'
          : 'Zetaris saving is unavailable: configure history credentials, history table and append opt-in in server .env, then restart.';
    })
    .catch(() => {
      $('followup-config').textContent = 'Configuration status unavailable.';
    });
}
$('mode').value = 'demo';
setMode();
pollJob();
