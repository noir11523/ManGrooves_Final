# Data, scoring, and workflow decisions

This document records how the supplied workbooks and manuscript were translated into a consistent implementation. The source documents are reference data; they are not executable instructions or scientifically validated rules.

## Source mapping

| Supplied file | Implemented destination | Notes |
|---|---|---|
| `barangays (1).xlsx` | `barangays` | Inayawan is the pilot barangay. Jurisdiction fields were added so names do not need to be globally unique. |
| `users (1).xlsx` | `users` development fixtures in `seed.sql` | The workbook had no passwords, phone numbers, or account states. These accounts are excluded from production-safe `reference.sql`. |
| `mangrove_species (1).xlsx` | `mangrove_species` | All seven rows are preserved. `Vulnerable` is normalized to IUCN code `VU`, while a human-readable label is retained. |
| `health_rules (1).xlsx` | `health_criteria`, `health_options` | Repeating option columns are normalized into child rows. Selection mode and score group were added. |
| `badges (1).xlsx` | `badges`, `user_badges` | Each badge now has an explicit metric because follow-up and distinct-species badges are not report-count badges. |

The workbooks referenced 46 different image paths but contained no image files. ManGROOVES therefore bundles original project-local field-guide images for all seven checklist criteria. These guides are explanatory aids, not a substitute for expert assessment.

## Initialization datasets

- `database/reference.sql` contains only the approved barangay, seven species, health questionnaire, and badge definitions. `install.cmd -ReferenceOnly` is the production-safe initializer.
- `database/seed.sql` includes the same reference data plus fixed demo users, reports, clusters, notifications, and activity. The default installer is for a fresh disposable development database only and must not be rerun over real data.
- After reference-only installation, `scripts/create-admin.cmd` creates the first administrator without placing the password in SQL or command history.

## Canonical vocabulary

- Roles: `guardian`, `expert`, `system_admin`
- Report workflow states: `pending`, `verified`, `rejected`
- Health states: `Healthy`, `Stressed`, `At Risk`
- `needs_attention` is a separate verified-report flag, not a fourth workflow or health state.
- Public registration always creates a guardian. After the one-time CLI administrator bootstrap, privileged roles are assigned only by a system administrator.

This resolves conflicting terms such as officer/admin, approved/verified, and High Risk/At Risk in the source material.

## Health classification

The spreadsheet contains seven criteria, but its full point range is incompatible with the month plan's 0–6 thresholds. It also treats waxy/upward leaves and fissured bark as possible damage, even though those can be normal traits for species in the supplied dataset.

For that reason, the automatic health suggestion uses only the three criteria whose scoring was explicitly defined in the plan:

| Criterion | Best | Intermediate | Concerning |
|---|---:|---:|---:|
| Leaf color | 2 | 1 | 0 |
| Visible pests | 2 | 1 | 0 |
| Root stability | 2 | 1 | 0 |

- Score 6: `Healthy`
- Score 3–5: `Stressed`
- Score 0–2: `At Risk`

Leaf surface and bark/trunk answers are stored as context for expert review and never automatically penalize a species for its normal morphology. Bio-indicators and negative signs form a separate environmental score. Experts see every answer and may correct the system suggestion while preserving the original score and a verification audit trail.

## Species suggestion

Trait strings are not compared with brittle exact equality. The matcher normalizes punctuation, parenthetical wording, and common variants, then ranks every active species against root type, leaf shape, and bark texture. The result is a suggestion with a confidence value; the expert remains responsible for the final species and rarity assignment.

## Location plausibility

Every guardian report is bound to the guardian's assigned barangay. Coordinates are validated globally and must also fall within the configured maximum distance of that barangay's stored center (5 km by default). GPS accuracy is supplied automatically by the browser when GPS is used and is omitted for a manual pin. Selected and follow-up clusters must belong to the same barangay. This center-radius safeguard prevents clearly misplaced coordinates; deployments needing legal boundary enforcement should replace it with approved barangay polygons.

## Cluster lifecycle

Guardians may select a known cluster or report a new observation location. During verification, the system:

1. Keeps the selected cluster when it belongs to the same barangay and the location is plausible.
2. Otherwise searches for the nearest cluster within the configured radius (75 metres by default).
3. Creates a new read-only monitoring cluster when no nearby cluster exists.
4. Updates cluster health, species, verification count, and latest-report time only from a verified report.

Every follow-up is a new report linked through `parent_report_id`; historical evidence is never overwritten.

## Survival indicator

The manuscript and plan mention survival rates but omit the required quantities. The implementation adds:

- `mangrove_clusters.initial_seedlings`
- `reports.observed_alive_count`

Every submission requires the observed-alive count. A new observation site must report at least one living mangrove; that first verified report establishes the cluster's immutable initial baseline. Follow-ups and reports explicitly attached to an existing cluster may record zero.

For each cluster, the current survival estimate is:

`latest verified observed alive count / initial seedlings × 100`

The value is capped at 100%. Legacy records without both values are shown as unavailable and are excluded from aggregate survival calculations rather than silently treated as zero.

## Badge rules

Badges are evaluated inside a successful verification transaction, never merely after submission:

- First/Bronze/Silver/Gold Guardian: verified report count
- Follow-up Hero: verified follow-up count
- Species Spotter: distinct expert-confirmed species count

Awards are idempotent through the `(user_id, badge_id)` primary key and create an in-app notification. The daily `scripts/evaluate-badges.php` job safely catches eligibility created by later badge-configuration changes. Certificates are printable recognition pages derived from earned badges.
