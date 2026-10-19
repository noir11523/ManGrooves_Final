# Working on ManGROOVES from two laptops

You can edit this project in VS Code on either laptop. GitHub transfers source code between the laptops. The publish script sends a prepared release to Vercel and deploys the Supabase API. Supabase already holds the shared accounts, reports and photos.

Saving a file, pushing code and publishing a release are separate actions:

| Action | What it updates |
| --- | --- |
| Save a file in VS Code | Files on that laptop |
| Commit and push to GitHub | The shared source repository |
| Pull on the other laptop | That laptop's source files |
| Run the project's publish command | The live Vercel website and Supabase Edge API |
| Apply a Supabase migration | Database structure/functions |
| Build and install a new APK | Flutter code running on a phone |
| Create/edit a record through the cloud website or app | Shared Supabase data |

The repository is `https://github.com/noir11523/ManGrooves_Final.git`. The working branch is currently `main`. The Vercel production website is `https://mangrooves-php.vercel.app`, and the Supabase project reference is `rsjwlhqzzvtakcbrzqgi`.

The current Vercel configuration intentionally skips source-only Git deployments because this repository must be packaged first. A GitHub push alone does not publish this website. Use the project command below.

**1. Save the current work before moving to another laptop.**

This workspace had uncommitted changes when this guide was prepared on October 19, 2026. Review the changes in VS Code's Source Control panel, stage the intended source files, commit, and push. Include new source files required by the changes. Review loose photos and other unrelated files separately.

The `.gitignore` excludes database backups, private exports, credentials, dependency folders and generated build output. Keep those exclusions. The configuration and APK artifacts described below need separate setup on the other laptop.

**2. Set up the other laptop once.**

Install VS Code, Git, Node.js compatible with the project tools, and PHP. XAMPP supplies PHP; the cloud preview does not require starting Apache or MySQL. For Flutter development, also install Flutter, Android Studio/Android SDK, and the Dart/Flutter VS Code extensions.

Use a GitHub account with access to the existing repository. In a terminal, clone it into your preferred development folder:

```powershell
git clone https://github.com/noir11523/ManGrooves_Final.git
cd ManGrooves_Final
npm.cmd --prefix supabase ci
npm.cmd --prefix vercel ci
npm.cmd --prefix supabase run configure
```

The configure command asks for the existing Supabase Project URL and **public publishable/anon key**. Use the same project as this laptop. It creates matching, ignored `supabase/client-config.json` and `mobile/flutter_app/supabase-config.json` files. It does not create or change the cloud project. You can also copy the current public configuration file privately and run:

```powershell
npm.cmd --prefix supabase run configure -- --file supabase/client-config.json
```

Use Supabase/Vercel logins with permission to the existing projects when deploying. SMTP settings and mail secrets already stored in Supabase remain there; normal code editing does not require copying them onto a classmate's laptop.

**3. Run the cloud website locally.**

The website packager includes the current APK and verifies its version/checksum. For web-only development, copy the matching three release files from the current publishing laptop into the same paths on the other laptop:

- `mobile/flutter_app/dist/ManGROOVES-Supabase.apk`
- `mobile/flutter_app/dist/ManGROOVES-Supabase.apk.json`
- `mobile/flutter_app/dist/ManGROOVES-Supabase.apk.sha256`

They must match the version in `mobile/flutter_app/pubspec.yaml`. Alternatively, prepare them with the existing APK build script after installing the Android toolchain.

From the project root:

```powershell
.\scripts\start.cmd
```

Open `http://127.0.0.1:8086` and keep the terminal open. Restart the launcher after source changes to rebuild the prepared website. If PHP is installed elsewhere, pass its actual path, for example:

```powershell
.\scripts\start.cmd -PhpBin 'D:\xampp\php\php.exe'
```

This local preview uses the **shared Supabase data**. A report submitted here is also visible to the live website and app under their normal access rules. The old XAMPP `/mangrooves_v2/public` address uses the separate legacy MySQL backend.

**4. Transfer your edits whenever you switch laptops.**

Before starting work, with a clean working tree on `main`:

```powershell
git pull --ff-only origin main
```

When finished, review and stage the intended files in VS Code, commit with a description, and push. On the other laptop, pull again. If Git reports conflicting or diverged work, preserve both sets of changes and resolve the merge; do not force-push to discard another person's work. When both people edit at the same time, use separate branches and merge reviewed changes through GitHub.

GitHub documents this transfer in [Getting changes from a remote repository](https://docs.github.com/en/get-started/using-git/getting-changes-from-a-remote-repository).

**5. Publish the finished changes.**

For the current setup, use one designated publishing laptop. This keeps the Vercel project connection, session-encryption key and Android signing certificate consistent while both laptops can contribute code through GitHub.

On that laptop, sign in once to the authorized existing projects:

```powershell
& .\vercel\node_modules\.bin\vercel.cmd login
& .\supabase\node_modules\.bin\supabase.cmd login
```

Pull the reviewed source. If Flutter changed, increment the build number in `mobile/flutter_app/pubspec.yaml`, then build the APK:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\mobile\flutter_app\build-apk.ps1 -Backend supabase -SkipClean
```

For website-only changes, the existing matching release APK can be reused. Publish from the project root:

```powershell
npm.cmd --prefix vercel run publish
```

This project's script packages the website, publishes to Vercel, configures the allowed website origins, deploys the Supabase `api` function and checks the public pages/download. Publishing does not push source changes to GitHub or apply database migrations. See [the project publishing guide](VERCEL_PHP.md#publish), [Vercel's CLI documentation](https://vercel.com/docs/cli/deploy), and [Supabase function deployment](https://supabase.com/docs/guides/functions/deploy).

Database structure changes belong in `supabase/migrations`. Review pending migrations and apply them to the linked existing Supabase project separately. `database/mobile_api.sql` belongs to the legacy MySQL application; editing it does not update the live Supabase database.

For an intentional, reviewed Supabase schema update, link the existing project once and check the pending changes before pushing them:

```powershell
& .\supabase\node_modules\.bin\supabase.cmd link --project-ref rsjwlhqzzvtakcbrzqgi
& .\supabase\node_modules\.bin\supabase.cmd db push --linked --dry-run
& .\supabase\node_modules\.bin\supabase.cmd db push --linked
```

**Android updates across laptops.** The current release configuration uses the publishing laptop's development signing certificate. A different laptop normally has a different certificate, so its APK may fail to install over the existing app. Continue using the designated publishing laptop, or deliberately configure the same private signing identity on both machines before switching publishers. Android explains the matching-certificate requirement in [Sign your app](https://developer.android.com/studio/publish/app-signing). If moving website publication too, preserve `vercel/.local-key` through a private transfer to keep the same session-encryption key; the current publish script creates a new key when this file is absent. Signing keys and session keys stay outside GitHub.
