# Expert application decisions

Administrators must enter a reason when declining. The applicant sees that reason after authenticating with their registered email and password; declined accounts cannot access the application. Existing saved decline notes also appear. Notes are never exposed through public registration endpoints.

The recipient is the email entered and verified during registration, saved with the expert application. The administrator does not need to type a recipient. Both approval and decline messages include the administrator's note when provided. The applicant's email is **not** the sender address. ID codes and photos are not included in decision emails.

Outgoing decision emails now use **ManGROOVES** as the display name when `SMTP_FROM` or `MAIL_FROM` contains only an email address. An explicitly configured name, such as `ManGROOVES Team <sender@example.com>`, is preserved. The verified sender mailbox remains the same. Recipients can see the actual address in email details; a display name does not mask it. A separate organization mailbox can keep a personal address out of future messages. Existing messages and Spam placement are not changed by the display name. Supabase Auth's registration-email sender name is configured separately in its email settings.

The sender-name update was deployed to the API on October 16, 2026. Six email tests passed, including compiled SMTP From headers, the unchanged sender envelope, the unchanged applicant recipient, custom names, and the Resend fallback. Edge runtime validation and post-deployment API access checks passed. No real emails were sent during testing or deployment; no APK update is required.

On web, mobile web, and APK 2.0.0+51, the completion message is:

> **Application submitted**
>
> Your expert application is under review.
>
> We'll email the decision and any admin note to **[registered email]**.
>
> Check your **Inbox and Spam folder** for updates.
>
> You can also sign in to check your application status.

This is an on-screen confirmation, not a claim that an email has already been sent. Decision emails are attempted when an administrator reviews the application. Registration verification codes still use Supabase Auth's email settings.

Decisions persist before attempting mail. The application review screen reports whether the provider accepted the message, sending failed, or sender setup is missing. **Retry email** retries unsuccessful deliveries. A sent message is not sent again by that action. Provider acceptance does not guarantee inbox delivery. Resend requests use a stable idempotency key for a decision; SMTP does not provide the same duplicate-send guarantee if a process stops after acceptance.

## Without a domain: Gmail SMTP

You confirmed that you do not own a domain. For the current application, an existing Gmail account can send through the SMTP adapter already included. No Resend domain or API key is needed for this option. Use a dedicated ManGROOVES Gmail account if available. Google applies sending limits; for a larger service, use an organization-owned domain and a transactional email provider.

1. Sign in to the Gmail account that will send ManGROOVES messages. Turn on **2-Step Verification** in [Google Account Security](https://myaccount.google.com/security).
2. Open [Google App Passwords](https://myaccount.google.com/apppasswords), name the connection `ManGROOVES`, and create an App Password. Use this generated password for the server; keep your normal Google password private. Some school/work accounts and Advanced Protection accounts do not offer App Passwords; ask the account administrator for a permitted SMTP sender in that case. [Google's instructions](https://support.google.com/accounts/answer/185833).
3. In your Supabase project, open **Edge Functions → Secrets** and save the following. Replace `your-sender@gmail.com` with the Gmail account from step 1:

   | Secret | Value |
   | --- | --- |
   | `SMTP_HOST` | `smtp.gmail.com` |
   | `SMTP_PORT` | `465` |
   | `SMTP_USER` | `your-sender@gmail.com` |
   | `SMTP_PASS` | The generated Google App Password, with display spaces removed |
   | `SMTP_FROM` | `ManGROOVES <your-sender@gmail.com>` |

4. Return to **Expert applications** and select **Retry email** for the intended applicant. Check that applicant's inbox and Spam folder. The registered applicant address is automatically used as the recipient, and the saved admin note is included. This setup does not send a new email just for completing the registration form.
5. To use the same Gmail sender for registration codes and password recovery, separately configure **Authentication → Email → SMTP Settings**: host `smtp.gmail.com`, port `465`, username equal to the Gmail address, password equal to the App Password, sender email equal to the Gmail address, and sender name `ManGROOVES`. Save and test registration/password recovery with an address you control.

The mail adapter prefers Resend if both `RESEND_API_KEY` and `MAIL_FROM` exist. If those were added with unusable placeholder values, remove that pair before using SMTP. Changing your Google Account password revokes App Passwords; create a replacement and update both Supabase settings when that happens. [Google Gmail SMTP settings](https://support.google.com/a/answer/176600), [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

## With your own domain: Resend

“Email sender is not connected” means the decision is saved, but the server does not have usable sender credentials. Registration messages and expert-decision messages use separate settings. The application cannot obtain a sender password from registration automatically.

1. **Prepare your domain.** You need a domain you own and access to its DNS settings. If your school or organization supplies a domain, ask its domain administrator to add the records for you. The project's `vercel.app` address and personal `gmail.com` addresses cannot be used as owned email domains. Your website can stay at its current Vercel address; this setup is for sending email.
2. **Verify the domain in Resend.** Sign in to [Resend → Domains](https://resend.com/domains), select **Add Domain**, and enter a sending subdomain such as `updates.your-domain.com` (replace this example with your real domain). At the provider that manages your DNS, add the exact names, types, values, and priorities shown by Resend for DKIM and SPF. Keep existing website and mailbox records. Follow the instructions for **sending**; receiving email is not required. Wait until Resend shows the domain as **Verified**. [Official domain verification guide](https://resend.com/docs/add-a-domain).
3. **Create the key.** Open [Resend → API Keys](https://resend.com/api-keys), choose **Create API Key**, name it `ManGROOVES`, select **Sending access**, and restrict it to your verified domain. Copy the generated key immediately; Resend shows its value only once. This is the Resend key, not a Supabase API key. [Official API key guide](https://resend.com/docs/create-an-api-key).
4. **Connect the application.** In this Supabase project's **Edge Functions → Secrets**, add and save:

   | Secret | Value |
   | --- | --- |
   | `RESEND_API_KEY` | Your Resend sending API key |
   | `MAIL_FROM` | `ManGROOVES <notifications@updates.your-domain.com>` (replace with your verified domain) |

   The domain after `@` must exactly match the domain verified in Resend. Keep the angle brackets and display name as shown, without surrounding quotes. Enter the key only in Supabase's secret value field, never in chat, SQL, browser code, or Flutter settings. These values belong to **Supabase**, where the email API runs, rather than Vercel. Saving production secrets does not require another website or APK build. [Supabase secret settings](https://supabase.com/docs/guides/functions/secrets).

5. **Check delivery.** Return to **Expert applications** and use **Retry email** for the intended applicant. Check the applicant's inbox/Spam folder and Resend's email log. Already-saved notes are included. No bulk retry is performed. If the provider accepts the message but it does not appear in the inbox, check the delivery/bounce status in Resend. Do not use the Resend testing sender for real applicants.

Version 2.0.0+47 sends decision notices through Resend's HTTPS API when these two secrets exist. It does not need SMTP settings for decision emails. [Resend API](https://resend.com/docs/api-reference/emails/send-email), [Supabase secrets](https://supabase.com/docs/guides/functions/secrets).

To use this same Resend sender for registration, configure **Authentication → Email → SMTP Settings** with host `smtp.resend.com`, port `465`, username `resend`, password equal to the Resend API key, and the same verified sender address. Auth configuration is separate from Edge Function secrets. [Resend's Supabase guide](https://resend.com/docs/send-with-supabase-smtp).

## Reuse another existing SMTP provider

Use the same verified sender and SMTP credentials already configured in Supabase **Authentication → Email → SMTP Settings**. Set these as Supabase Edge Function secrets through the project dashboard:

- `SMTP_HOST`: existing provider hostname
- `SMTP_PORT`: use `465` for implicit TLS (the default); Resend also supports `2465`. Hosted Edge Functions block ports `25` and `587`. A provider's alternative STARTTLS port such as `2587` can be used if supported.
- `SMTP_USER`: existing SMTP username
- `SMTP_PASS`: existing SMTP password
- `SMTP_FROM`: the same verified sender address (optionally `ManGROOVES <address>`)

Never put these values in client-config.json, Flutter defines, Git, or chat. TLS is required and certificates are checked. Outgoing mail contains the decision and administrator message, not the applicant's ID code or photo.

If registration uses Supabase's built-in sender, its SMTP credentials are not available for custom application mail. A verified custom SMTP sender must be configured for both registration and decisions. See [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp) and [SMTP transport settings](https://nodemailer.com/smtp).

The app rejects the blocked SMTP ports rather than attempting an unreachable connection. [Supabase outgoing-port restrictions](https://supabase.com/docs/guides/functions/limits).

Checked October 15, 2026: neither the Resend secret pair nor the required SMTP secrets were present in this project. Both adapters are tested with test doubles; real inbox delivery still needs the owner to configure a verified sender. In-system decline reasons work without email setup.

Updated October 16, 2026: the owner added the SMTP secrets, and their presence was confirmed without reading the values. The owner reported the admin status **Email sent to the applicant** after retrying. This indicates provider acceptance; receipt in the intended applicant's inbox was not independently verified. Version 2.0.0+49 removes setup instructions from the application-review page and uses the compact **Email sent** label.

After adding secrets, decline a dedicated test application with a harmless note, check delivery in the recipient inbox and provider logs, and confirm the admin status reads “Email sent to the applicant.” Use Retry email for an earlier decision only when appropriate; the release does not bulk-email old applicants.
