# Build the mobile connection fix on another computer

This package contains mobile app source changes, not an installable APK.
It does not change the PHP website, database, Apache or Windows firewall.

1. On the computer with Flutter and Android tools, use the current
   `noir11523/ManGrooves_Final` repository. Preserve any local edits first.
2. Extract `ManGROOVES-App-Connection-Fix.zip` into the repository root,
   allowing the included `mobile/flutter_app/...` files to replace their
   corresponding files. The package is not a complete standalone project.
3. Open PowerShell in the repository root and run:

   ```powershell
   .\mobile\flutter_app\build-apk.cmd -ApiBaseUrl "http://192.168.213.53/mangrooves_v2/public/mobile-api"
   ```

   The script resolves packages, analyzes the app, runs the Flutter tests,
   and builds release version 1.1.14 (build 16). It stops if a check fails.
   If needed, pass `-FlutterSdk`, `-AndroidSdk`, or `-JavaHome` with the
   installed tool folders. These folders are SDKs, not the app's `dist` folder.

4. Transfer the newly generated
   `mobile/flutter_app/dist/ManGROOVES-Flutter.apk` to the phone and install it.
   Build on the original build computer to reuse its Android signing key.
5. Keep Apache and MySQL running on the server laptop. Open the updated app.
   If necessary, tap the small sliders icon below the sign-in buttons to open
   the **Server connection** popup, enter `192.168.213.53`, and tap
   **Check and connect** before signing in.

The IP above was verified on the server laptop during this repair. If its
Wi-Fi address changes, use its current IPv4 address from `ipconfig`. You can
update the address in the installed app without another rebuild. The app
only saves a server after its configuration endpoint identifies ManGROOVES.

## Phone reachability check

Open this URL in the phone browser:

```text
http://192.168.213.53/mangrooves_v2/public/mobile-api/configuration.php
```

It should return JSON containing `"ok":true` and
`"api_id":"org.mangrooves.mobile-api"`. If the phone cannot open it, a network
or firewall issue remains; app source changes cannot bypass that restriction.
The endpoint responded from the laptop, but phone reachability has not yet
been confirmed.

## Verification status

The updated build script passed PowerShell syntax checks. Regression tests
cover manual address selection, remembered ports, API identity checks, session
separation and the connection screen. Flutter analysis, those tests and the
APK build must run on the build computer because this laptop lacks the tools.
The older APKs beside this ZIP do not contain these fixes.
