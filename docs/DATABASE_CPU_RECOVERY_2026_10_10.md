# Database CPU recovery — October 10, 2026

The production database had an infinite retry loop in PostgREST 14.18. The
application's `app_commit` function used SQLSTATE `40001` for expected-version
conflicts. PostgREST treated these as transient serialization failures and
replayed the same outdated request internally, so the API never got the chance
to read current versions and retry correctly.

The initial diagnostics showed 589 million request-setup statements, a 12 MB
database, and 96.2% CPU utilization. Ordinary application reads averaged about
2.3 ms. Data size and missing indexes were not the cause.

## Applied fix

- Migration `202610100001_bounded_transaction_conflicts.sql` changes the two
  application conflict exceptions to `PT409`, which returns HTTP 409 immediately.
- The database adapter retries the complete read/compute/commit operation at
  most eight times, with a short increasing delay and jitter. It retains `40001`
  compatibility during deployment and for actual serialization failures.
- Atomic writes, expected-version checks, the transaction lock, and database
  access permissions remain in place.
- The API was deployed first, followed by the migration. No restart, session
  termination, data deletion, or compute upgrade was needed.

## Verification

- 70 unit/behavior tests and 67 API integration checks passed.
- Edge Function type check and HTTP runtime smoke test passed.
- A live, write-free stale-version probe returned HTTP 409 / `PT409` in 711 ms.
- Live API configuration and website summary requests returned successfully.
- All 219 application records retained the same combined data fingerprint.
- CPU fell from 96.2% (18:02–18:03 Manila time) to 1.3% (18:05–18:06).
  The earlier interval had 198,418 rollbacks; the recovery interval had just
  one, from the deliberate write-free conflict probe.

The original function definition and diagnostic snapshots are in the ignored
`tmp/cpu-*.json` files. CPU utilization was measured using deltas of
`node_cpu_seconds_total` from Supabase's Metrics API, rather than the historical
dashboard average. Dashboard charts can continue showing the earlier incident
until their selected time window moves past it.

Supabase documents this behavior in
[SQLSTATE 40001 in an RPC function causes infinite retries](https://supabase.com/docs/guides/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b).
