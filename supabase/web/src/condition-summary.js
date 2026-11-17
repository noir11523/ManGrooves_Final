import {esc} from './ui.js';

export function conditionScore(report) {
  const summary = report.condition_score_summary;
  const score = summary ? summary.score : report.health_score;
  const complete = score != null;
  const missing = (summary?.checks ?? []).filter(check => check.points == null).map(check => check.name);
  const note = complete && report.suggested_health === 'Unknown'
    ? 'Recorded condition is Unknown. Choose Correction.'
    : !complete ? (missing.length ? `Not scored: ${missing.join(', ')}.` : 'No total was saved for this report.') : '';
  return `<div class="condition-total"><div><strong>Total condition score</strong><span class="condition-total-value">${complete ? `${esc(score)} / 6` : 'Incomplete'}</span></div><p>Suggested condition: <strong>${esc(report.suggested_health??'Unknown')}</strong></p>${report.final_health?`<p>Final condition: <strong>${esc(report.final_health)}</strong></p>`:''}<p>Leaf color + pests + roots · up to 2 points each</p><small>6 Healthy · 3–5 Stressed · 0–2 At Risk</small>${note ? `<p>${esc(note)}</p>` : ''}</div>`;
}
