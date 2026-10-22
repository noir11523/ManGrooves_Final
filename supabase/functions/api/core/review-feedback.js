// Keep older clients and saved notes readable while new forms use one field.
export function reviewFeedback(report = {}) {
  const feedback = String(report.expert_feedback ?? '').trim();
  const legacy = String(report.follow_up_note ?? '').trim();
  return [feedback, legacy && !feedback.includes(legacy) ? legacy : ''].filter(Boolean).join('\n\n');
}
