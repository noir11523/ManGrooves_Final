# ManGROOVES Flutter client

This is the native Android/iOS client for the ManGROOVES PHP and MariaDB
system. Guardians can register, monitor sites, submit GPS/photo observations,
link follow-ups, view reports and badges, and edit their profile. Experts and
administrators can verify reports and view role-appropriate analytics. Experts
receive health summaries and high-risk results; computed survival metrics remain
restricted to system administrators.

## Server configuration

The server URL is intentionally not displayed in the normal mobile interface.
It is a technical build setting, not user-facing account information.

The current local pilot address is:

```text
http://192.168.100.15/mangrooves_v2/public/mobile-api
```

Build for a different local computer address from the repository root:

```powershell
.\mobile\flutter_app\build-apk.ps1 `
  -ApiBaseUrl 'http://YOUR-PC-IP/mangrooves_v2/public/mobile-api'
```

For production Android and iPhone builds, use the public HTTPS endpoint:

```text
https://YOUR-DOMAIN/mobile-api
```

Hiding the URL in the GUI does not disable the connection. The compiled URL
remains in the application configuration and all API calls continue to use it.
If the local computer's IP address changes, rebuild the APK with the new
address. An existing installation may retain a previously saved server value in
encrypted app storage; clearing app data resets it to the URL compiled into the
APK.

See `docs/MOBILE_INSTALLATION.md` for Android installation and Mac/iPhone build
steps.
