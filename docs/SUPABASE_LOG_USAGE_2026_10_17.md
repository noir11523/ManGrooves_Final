# Supabase log usage check — October 17, 2026

The supplied organization usage screenshots show approximately 59.43 GB of log ingestion, with the large daily bars concentrated around October 6–10. Log ingestion and query are labeled Upcoming. The database, storage, egress, function invocation and active-user meters shown remain within their allowances.

Supabase's current announcement says Upcoming log meters are informational during the soft-launch grace period. Existing organizations as of September 25, 2026 have a grace period through early 2027; newer organizations currently also have a grace period, whose future end date may differ. Do not infer an immediate charge or service shutdown from this meter alone.

## Read-only production findings

- The live `app_commit` function uses `PT409` and no longer contains `40001`. The previously deployed October 10 transaction-conflict fix remains present.
- `log_statement=ddl`, `log_min_messages=warning`, `log_min_duration_statement=-1`, `log_duration=off`, `log_connections=off`, `log_disconnections=off`, `pgaudit.log=none`; no role/database logging overrides were found.
- Auto-explain's duration threshold is 10 seconds. No unusually verbose logging setting was found that warranted changing it blindly.
- The rollback counter stayed at 589,627,332 across the database checks, approximately 97 seconds apart. At 17:51:43 Manila time, there were no active API queries older than one minute. The cumulative counter includes the older incident; it is not evidence of a current retry storm.
- The separate CPU metrics sample returned unchanged cached counters and therefore did not yield a usable CPU rate. No current CPU percentage is claimed.
- Source inspection found only a concise unexpected-server-error console log in the API; no per-request console payload dumps or SQL RAISE LOG/NOTICE statements in the searched application sources.

The spike's timing is consistent with the earlier retry incident documented in `DATABASE_CPU_RECOVERY_2026_10_10.md`. This is an inference, not a confirmed breakdown of the historical 59.43 GB by source. Historical log events were not downloaded or scanned across the billing period.

## Appropriate next step

Keep the existing normal logging configuration and inspect new daily ingestion over the next 24–48 hours. The current-period usage total does not decrease when new log generation falls; each billing cycle has its own usage total. Deleting application records does not remedy the historical logging spike. A paid upgrade is not needed solely in response to an Upcoming informational meter.

No application data, credentials, billing plan, logging settings or database functions were modified during this audit. No app rebuild or deployment was required.

## Official sources

- https://supabase.com/changelog/logs-usage-based-pricing
- https://supabase.com/docs/guides/platform/manage-your-usage/logs-ingest
- https://supabase.com/docs/guides/database/postgres/postgres-log-config
- https://supabase.com/docs/guides/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b
