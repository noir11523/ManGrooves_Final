# Email codes for ManGROOVES

The website is live at https://mangrooves-php.vercel.app. Registration now has three steps on web and Flutter: **Account details → Verify email → Complete profile**. Enter your first name, last name, email, and matching passwords, accept the privacy notice, then choose **Continue** to send the code. Enter the six-digit code and choose **Verify code**. Then choose your role and barangay, add an optional phone number, and finish. Experts also enter their ID code and wait for administrator approval. **Change email** returns to the first step without clearing other details; a different address needs a new code. **Resend code** becomes available after one minute.

**Retested on 2026-10-03 after updating the Google app password:** the live registration-code endpoint returned HTTP 200 with `ok: true` and `Code sent. Check your email and Spam folder.` Gmail SMTP uses `smtp.gmail.com:587`; the Vercel Site URL and numeric-code templates are applied. Codes use six digits and expire after ten minutes. The send request succeeded; actual inbox receipt and entry of the code still need user confirmation.

The earlier failure was Gmail SMTP `535 5.7.8 Username and Password not accepted`. The sender created a new Google app password and saved it privately in Supabase before the successful retest. If sending fails again, inspect [Auth logs](https://supabase.com/dashboard/project/rsjwlhqzzvtakcbrzqgi/logs/auth-logs). Share only error text, never passwords, tokens, or verification codes.

## Connect Gmail for a small pilot

Use a Gmail account dedicated to ManGROOVES. Gmail is a pilot option; a transactional email provider is preferable as usage grows.

1. Sign in to that Google account and turn on **2-Step Verification** under **Security**.
2. Open [Google App passwords](https://myaccount.google.com/apppasswords). Create one named **ManGROOVES**. Some managed or protected accounts do not support app passwords; see [Google's instructions](https://support.google.com/accounts/answer/185833).
3. Open [this project's SMTP settings](https://supabase.com/dashboard/project/rsjwlhqzzvtakcbrzqgi/auth/smtp) and enable **Custom SMTP**.
4. Enter these settings and save:

| Field | Value |
| --- | --- |
| Sender email | Your chosen Gmail address |
| Sender name | ManGROOVES |
| Host | smtp.gmail.com |
| Port | 587 |
| Username | The same full Gmail address |
| Password | The Google app password, without spaces |

Enter the app password directly in Supabase. Never send it in chat or put it in the repository. Use the app password, not your normal Google password. Google's [SMTP documentation](https://developers.google.com/workspace/gmail/imap/imap-smtp) documents TLS on port 587.

## Apply the prepared codes

These templates are already applied to this project. For another installation, in Supabase **Authentication > Email > Templates**, copy the complete local HTML into the matching template and save:

| Template | Local file |
| --- | --- |
| Confirm signup | [confirmation.html](../supabase/templates/confirmation.html) |
| Magic Link | [confirmation.html](../supabase/templates/confirmation.html) |
| Reset Password | [recovery.html](../supabase/templates/recovery.html) |

Keep `{{ .Token }}` unchanged. The live Email settings already use confirmation and signup enabled, code length **6**, and expiry **600 seconds**. The Site URL is `https://mangrooves-php.vercel.app`. These values match the app and `supabase/config.toml`.

Test registration with an email you own, then test **Forgot password** for that account. Check Inbox and Spam. Delivery is verified only after a real code arrives and works. The same setup serves the website and Supabase APK.

Already using an SMTP provider? Use its host, port, username, password and verified sender instead of the Gmail values. See [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp) and [email templates](https://supabase.com/docs/guides/auth/auth-email-templates).
