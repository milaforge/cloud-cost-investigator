const $ = (id) => document.getElementById(id);
const reports = {};
let active = null;
let candidateIndex = 0;
let loading = false;
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
const toastDuration = 10_000;
let toastTimer;
let toastCountdown;
function dismissToast() {
  clearTimeout(toastTimer);
  toastCountdown?.cancel();
  toastCountdown = null;
  if (document.activeElement === $('dismiss-toast')) $('scenario').focus();
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
  $('scenario').focus();
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
  const r = reports[active];
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
    const live = $('source').value === 'aws';
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
            ? 'Run investigation to load this scenario’s evidence, verdict and steps.'
            : 'No scenario is selected. Choose one above, open a preview, or load your own report.',
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
  if (!file || loading) return;
  if (file.size > 2 * 1024 * 1024) {
    $('message').textContent =
      'Report exceeds 2 MiB. Your current report is unchanged.';
    return;
  }
  loading = true;
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
    $('load').disabled = false;
    $('file').value = '';
  }
}
for (const button of document.querySelectorAll('[data-report]'))
  button.addEventListener('click', () => {
    dismissToast();
    active = button.dataset.report;
    if (['A', 'B'].includes(active)) $('scenario').value = active;
    $('message').textContent = '';
    candidateIndex = 0;
    render();
  });
$('load').addEventListener('click', () => $('file').click());
$('file').addEventListener('change', () => loadReport($('file').files[0]));
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => {
  e.preventDefault();
  if (e.dataTransfer.files.length !== 1) {
    $('message').textContent = 'Choose one report at a time.';
    return;
  }
  loadReport(e.dataTransfer.files[0]);
});
$('close-evidence').addEventListener('click', () => $('evidence').close());
fetch('/api/demos', { signal: AbortSignal.timeout(10000) })
  .then((r) => {
    if (!r.ok) throw new Error();
    return r.json();
  })
  .then((data) => {
    Object.assign(reports, data);
    render();
    $('message').textContent = '';
  })
  .catch(() => {
    $('report').setAttribute('aria-busy', 'false');
    $('message').textContent =
      'Could not load demonstrations. Restart the local server or load a report.';
  });

let currentJob = null;
let submitted = false;
let polling = null;
let appliedJob = null;
const runButtons = ['run-investigate', 'run-learn', 'run-followup'];
$('scenario').addEventListener('change', () => {
  dismissToast();
  active = null;
  candidateIndex = 0;
  $('message').textContent = '';
  render();
});
function showView(view) {
  dismissToast();
  for (const name of ['investigate', 'learn', 'followup'])
    $(`view-${name}`).hidden = name !== view;
  for (const button of document.querySelectorAll('[data-view]'))
    button.setAttribute('aria-pressed', String(button.dataset.view === view));
}
for (const button of document.querySelectorAll('[data-view]'))
  button.addEventListener('click', () => showView(button.dataset.view));
$('source').addEventListener('change', () => {
  const aws = $('source').value === 'aws';
  $('aws-scope').hidden = !aws;
  $('scenario').disabled = aws;
  dismissToast();
  active = null;
  render();
});
function showReport(report) {
  reports.loaded = report;
  $('loaded').textContent = 'Run result';
  active = 'loaded';
  candidateIndex = 0;
  $('loaded').hidden = false;
  showView('investigate');
  render();
  $('message').textContent =
    'Generated by this demonstration. Inspect evidence and trace below.';
  $('report').scrollIntoView({ block: 'start' });
}
function inspectButton(report, label = 'Inspect report') {
  const button = node('button', label);
  button.type = 'button';
  button.addEventListener('click', () => showReport(report));
  return button;
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
function checkList(checks) {
  return disclosure('Verification checks', [
    list(
      Object.entries(checks).map(
        ([key, passed]) => `${passed ? 'PASS' : 'FAIL'} · ${human(key)}`,
      ),
    ),
  ]);
}
function renderLearning(result) {
  const root = $('learning-result');
  root.replaceChildren(
    node(
      'h3',
      result.passed
        ? 'Learning proof passed'
        : 'Learning proof incomplete — inspect failed checks',
    ),
  );
  root.append(
    node(
      'p',
      `Synthetic evidence · Planner: ${result.planner_mode} · Real local H-MEM`,
      'mode',
    ),
  );
  const grid = node('div', undefined, 'phase-grid');
  for (const { phase, report } of result.runs) {
    const card = node('article', undefined, 'phase-card');
    const checks = report.evidence
      .filter((e) =>
        ['get_ec2_operations', 'get_ec2_dependencies'].includes(e.tool),
      )
      .map((e) => human(e.tool.replace('get_ec2_', '')));
    card.append(
      node('h3', human(phase)),
      node(
        'p',
        report.candidates[0]
          ? labels[report.candidates[0].verdict]
          : 'No conclusion',
      ),
      node(
        'p',
        `${report.budget.planner_calls} planner calls · ${report.budget.discovery_attempts + report.budget.candidate_attempts} tools · ${report.budget.elapsed_ms} ms`,
        'hint',
      ),
      node('p', `Checks: ${checks.join(' → ') || 'None retrieved'}`, 'hint'),
      inspectButton(report),
    );
    grid.append(card);
  }
  root.append(
    grid,
    node(
      'p',
      `Learned check: ${result.learned_lesson?.summary.lesson?.check ? human(result.learned_lesson.summary.lesson.check) : 'Not established'}`,
    ),
  );
  if (result.comparison)
    root.append(
      node(
        'p',
        `Warm versus cold: ${result.comparison.tool_calls_saved} fewer tool calls; ${result.comparison.planner_calls_saved} fewer planner calls. Wall-clock improvement: ${result.comparison.faster_wall_clock ? 'yes' : 'no'}.`,
      ),
    );
  root.append(
    node(
      'p',
      'This designed example does not establish a general speedup. Every current verdict still requires fresh evidence.',
      'hint',
    ),
    checkList(result.checks),
    disclosure('Method and provenance', [
      node('p', result.methodology),
      downloadButton(result, 'learning-demo.json'),
      node('p', result.cleanup),
      facts({
        learned_lesson: result.learned_lesson,
        correction: result.correction,
      }),
    ]),
  );
}
function renderFollowup(result) {
  const root = $('followup-result');
  root.replaceChildren(
    node(
      'h3',
      result.passed
        ? 'Follow-through proof passed'
        : 'Follow-through proof incomplete',
    ),
  );
  root.append(
    node(
      'p',
      'Configured Zetaris append/readback · Synthetic evidence · Scripted planner · Fictional decisions',
      'mode',
    ),
  );
  const grid = node('div', undefined, 'phase-grid');
  for (const [title, text, report] of [
    [
      'Deferred → Reviewed',
      'A due decision is retrieved. New dependency evidence rejects the previously recommended window.',
      result.reports[2],
    ],
    [
      'Accepted → Outcome reported',
      'A fictional operator-reported rollback is retained. It is not verified execution or measured savings.',
      result.reports[1],
    ],
  ]) {
    const card = node('article', undefined, 'phase-card');
    card.append(node('h3', title), node('p', text), inspectButton(report));
    grid.append(card);
  }
  root.append(
    grid,
    node('p', `Synthetic account: ${result.scope.account_id}`, 'hint'),
    checkList(result.checks),
    disclosure('Stored decisions and receipts', [
      facts({ before: result.before, after: result.after }),
    ]),
    disclosure('Method and limits', [node('p', result.methodology)]),
  );
}
function renderEvents(events) {
  const root = $('run-events');
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
      for (const [index, part] of parts.entries()) {
        if (index) line.append(document.createTextNode(' · '));
        if (Object.hasOwn(statuses, part)) {
          const status = statuses[part];
          line.append(
            info(status[2], status[2], status[0], `event-result ${status[1]}`),
          );
        } else line.append(document.createTextNode(part));
      }
      children.append(line);
    }
    branch.append(heading, children);
    tree.append(branch);
  }
  root.replaceChildren(tree);
}
function paintJob(job) {
  if (!job) {
    currentJob = null;
    runButtons.forEach((id) => {
      $(id).disabled = submitted;
    });
    return;
  }
  currentJob = job;
  $('run-state').hidden = false;
  const running = job.status === 'running';
  runButtons.forEach((id) => {
    $(id).disabled = running || submitted;
  });
  $('cancel-run').hidden = !running;
  $('view-last-result').hidden = job.status !== 'complete' || !job.result;
  $('run-status').textContent =
    `${human(job.kind)} · ${job.status}${job.error ? ` — ${job.error}` : ''}${running && job.events.length ? ` · ${job.events.at(-1)}` : ''}`;
  renderEvents(job.events);
  if (
    job.status === 'complete' &&
    job.result &&
    appliedJob !== job.request_id
  ) {
    appliedJob = job.request_id;
    if (job.kind === 'investigate') showReport(job.result);
    else if (job.kind === 'learn') {
      renderLearning(job.result);
      showView('learn');
    } else {
      renderFollowup(job.result);
      showView('followup');
    }
    const complete =
      job.kind === 'investigate'
        ? job.result.completion_status === 'complete'
        : job.result.passed;
    $('run-status').textContent =
      job.kind === 'investigate' && job.result.completion_status === 'failed'
        ? `Investigate · Failed — ${human(job.result.stop_reason)}; inspect discovery gaps`
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
    $('run-state').hidden = false;
    $('run-status').textContent =
      'Connection lost. The run may still be active. Reconnecting without restarting it…';
    runButtons.forEach((id) => {
      $(id).disabled = true;
    });
    polling = setTimeout(pollJob, 2000);
  }
}
async function startRun(kind) {
  if (submitted || currentJob?.status === 'running') return;
  const real =
    kind === 'followup'
      ? $('append-ack').checked
      : kind === 'learn'
        ? $('learn-model').checked
        : $('real-investigate').checked;
  const planner =
    kind === 'followup'
      ? 'scripted'
      : kind === 'learn'
        ? $('learn-model').checked
          ? 'model'
          : 'scripted'
        : $('planner').value;
  const evidence = kind === 'investigate' ? $('source').value : 'mock';
  if (kind === 'investigate' && evidence === 'mock' && !$('scenario').value) {
    showToast('Choose a scenario before running an investigation.');
    $('scenario').focus();
    return;
  }
  if (
    (planner === 'model' ||
      evidence === 'aws' ||
      kind === 'followup' ||
      (kind === 'investigate' && $('investigate-history').checked)) &&
    !real
  ) {
    $('run-state').hidden = false;
    $('run-status').textContent =
      'Select the explicit real-service acknowledgment before running this action.';
    return;
  }
  let ownerEvidence;
  if (kind === 'investigate' && $('owner-evidence-enabled').checked) {
    for (const input of $('owner-evidence-fields').querySelectorAll(
      'input, textarea',
    )) {
      if (!input.reportValidity()) return;
    }
    const from = `${$('owner-from').value}T00:00:00.000Z`;
    const to = `${$('owner-to').value}T00:00:00.000Z`;
    if (
      Date.parse(to) <= Date.parse(from) ||
      Date.parse(to) - Date.parse(from) > 90 * 86400000
    ) {
      showToast(
        'Owner evidence needs an increasing UTC date range of at most 90 days.',
      );
      return;
    }
    ownerEvidence = [
      {
        account_id: evidence === 'aws' ? $('account').value.trim() : 'demo',
        region: evidence === 'aws' ? $('region').value.trim() : 'us-east-1',
        instance_id: $('owner-instance').value.trim(),
        owner: $('owner-name').value.trim(),
        topic: $('owner-topic').value,
        statement: $('owner-statement').value.trim(),
        source_ref: $('owner-reference').value.trim(),
        asserted_at: new Date().toISOString(),
        valid_window: { from, to },
      },
    ];
  }
  submitted = true;
  runButtons.forEach((id) => {
    $(id).disabled = true;
  });
  $('run-state').hidden = false;
  $('run-status').textContent = 'Starting…';
  const body = {
    request_id: crypto.randomUUID(),
    ...(ownerEvidence ? { owner_evidence: ownerEvidence } : {}),
    kind,
    planner,
    evidence,
    // The existing transport requires this field; these other workflows ignore it.
    scenario:
      kind === 'investigate' && evidence === 'mock' ? $('scenario').value : 'A',
    account: evidence === 'aws' ? $('account').value.trim() : 'demo',
    region: evidence === 'aws' ? $('region').value.trim() : 'us-east-1',
    max_candidates:
      evidence === 'aws'
        ? Number($('candidate-limit').value)
        : kind === 'investigate' && $('scenario').value === 'mixed'
          ? 3
          : 1,
    real_services: real,
    allow_append: kind === 'followup' && $('append-ack').checked,
    history: kind === 'investigate' && $('investigate-history').checked,
  };
  try {
    const response = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    const result = await response.json();
    if (!response.ok) {
      $('run-status').textContent = result.error;
      return;
    }
    paintJob(result);
    polling = setTimeout(pollJob, 100);
  } catch {
    $('run-status').textContent =
      'Start could not be confirmed. Checking server state; the action will not be resubmitted.';
    polling = setTimeout(pollJob, 500);
  } finally {
    submitted = false;
    runButtons.forEach((id) => {
      $(id).disabled = currentJob?.status === 'running';
    });
  }
}
for (const id of ['account', 'region', 'source', 'scenario']) {
  $(id).addEventListener('change', () => {
    $('owner-evidence-enabled').checked = false;
    $('owner-evidence-fields').hidden = true;
  });
}
$('owner-evidence-enabled').addEventListener('change', () => {
  $('owner-evidence-fields').hidden = !$('owner-evidence-enabled').checked;
});
for (const kind of ['investigate', 'learn', 'followup'])
  $(`run-${kind}`).addEventListener('click', () => startRun(kind));
$('view-last-result').addEventListener('click', () => {
  if (currentJob?.status !== 'complete') return;
  appliedJob = null;
  paintJob(currentJob);
});
$('cancel-run').addEventListener('click', async () => {
  if (!currentJob) return;
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
  }
  polling = setTimeout(pollJob, 500);
});
fetch('/api/config')
  .then((r) => r.json())
  .then((config) => {
    $('service-status').textContent =
      `Model configuration: ${config.model ? 'present, unverified' : 'missing or invalid'}. Zetaris history: ${config.zetaris ? 'configured, unverified' : 'missing'}. AWS uses the server credential chain; the account ID is a scope check.`;
    $('followup-config').textContent =
      `Zetaris configuration: ${config.zetaris ? 'present, unverified' : 'missing'}. Server append opt-in: ${config.zetaris_append ? 'enabled' : 'disabled'}. Configure server .env and restart if needed.`;
  })
  .catch(() => {
    $('service-status').textContent = 'Could not read configuration status.';
    $('followup-config').textContent = 'Configuration status unavailable.';
  });
pollJob();
