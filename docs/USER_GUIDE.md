# User guide

## Coastal Guardian

### Create an account

1. Open the landing page and choose **Create guardian account**.
2. Enter your full name, email, optional phone number, barangay, and a password of 8 to 72 characters.
3. Read and accept the privacy notice.
4. Submit the form. Public registration creates a guardian account only.

### Submit an initial report

1. Choose **Submit report** from the dashboard.
2. In **Location & photo**, select an existing cluster or a new observation site. Use **Capture my location**, then verify the pin. You may move the map pin if GPS is unavailable or visibly inaccurate.
3. Take or choose a clear photo showing the mangrove and its condition. GPS accuracy is captured automatically when GPS is used; a manual pin has no accuracy reading. Enter the living mangroves counted during this visit; a new site requires at least one to establish its survival baseline, while an established site may record zero. The sitio and remarks are optional.
4. In **Health observations**, compare the site with the visual guides and select the most accurate choices. Leaf color, pests, and roots produce the 0–6 suggestion; other answers remain visible to the expert.
5. In **Species traits**, choose the observed root, leaf, and bark traits. Review the ranked suggestion and health result.
6. Confirm the declaration and submit. The report enters the expert queue as `pending`.

### Submit a follow-up

1. Open an overdue or due-soon card on the dashboard, or select a verified report in the follow-up list.
2. Choose **Submit follow-up**. The parent report and cluster are prefilled.
3. Capture a fresh location/photo and complete the same observation steps.
4. Submit. Follow-ups are separate records so the cluster timeline remains intact.

### Review feedback, maps, and rewards

- **My reports** shows pending, verified, and rejected records. Open a report to see observations, expert classification, feedback, and verification history. Photo evidence is private: a guardian can view only photos attached to their own reports, while authorized experts and administrators can view evidence for review.
- **Explore** searches local, common, and scientific species names and filters cluster markers.
- **Badges** shows earned and locked milestones. An earned badge opens a printable certificate.
- **Notifications** records expert decisions, attention flags, follow-up reminders, and awards.
- **Settings** updates profile details and changes the password.

## Scientific Expert

1. Sign in with an expert account.
2. Open **Verification queue** and filter pending or historical reports.
3. Open a report and inspect its photo, map, coordinates, guardian remarks, every checklist answer, system health score, and ranked species suggestion.
4. Choose one action:
   - **Confirm** accepts the system suggestion.
   - **Correct & verify** records the expert's health/species/rarity override.
   - **Reject** requires a clear reason for the guardian.
5. Add coaching feedback and optionally mark a verified site as **Needs attention**.
6. Submit once. The transaction updates the report, cluster/timeline, 30-day follow-up date, notification, audit trail, and eligible badges together.
7. Use **Analytics** and maps to review verified health summaries, monitoring volume, and high-risk sites. Computed survival rates, PDF export, and the server-side static chart generator are restricted to system administrators.

## System Administrator

Administrators can use every expert workflow plus:

- **Users**: securely create expert/administrator accounts, search users, change roles, suspend/activate accounts, open eligible guardian certificates, or delete unused accounts. Public self-registration remains guardian-only. An active account must be suspended before deletion. The application prevents self-demotion/self-suspension, removal of the last active administrator, and deletion where retained environmental records require the account.
- **Species**: add, edit, activate, or retire taxonomy and observable traits.
- **Badges**: configure name, metric, threshold, description, icon, and active state.
- **Clusters**: review generated sites and chronological evidence.
- **Audit logs**: filter authentication, verification, and administration actions by user, action, entity, and date.
- **Analytics**: filter by dates, barangay, and species; inspect survival/health/growth/high-risk indicators; regenerate all-time static Python snapshots; and use **Print / Save as PDF** for an official filtered report. Static all-time snapshots are screen-only and are excluded from printed filtered reports.

## Sign out on shared devices

Always use **Sign out**. Sessions also expire after 30 minutes of inactivity by default.
