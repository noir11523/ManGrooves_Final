# Flutter mobile installation

ManGROOVES now has a proper Flutter client in `mobile/flutter_app`. Android and iOS share the same Dart screens and call the existing PHP/MariaDB system through the bearer-token JSON API in `public/mobile-api`.

## Current Android APK

The installable release-mode pilot APK is:

```text
mobile/flutter_app/dist/ManGROOVES-Flutter.apk
```

It was built for the local PHP API at:

```text
http://192.168.100.15/mangrooves_v2/public/mobile-api
```

Before testing, start Apache and MySQL in XAMPP. The Android phone and computer must be connected to the same Wi-Fi.

The technical server URL is intentionally hidden from the normal app screens so guardians see a clean interface. Hiding it does not disable the connection: the app still uses the URL compiled into the APK. The current pilot APK uses:

```text
http://192.168.100.15/mangrooves_v2/public/mobile-api
```

If the computer's IPv4 address changes, rebuild the APK with the new address using the command below. The server address belongs in this installation guide, not in the guardian profile screen.

To install manually:

1. Copy `ManGROOVES-Flutter.apk` to the Android phone.
2. Open it from Files or Downloads.
3. Allow installs from that file-manager source if Android asks.
4. Tap **Install**, then **Open**.
5. Grant camera and precise location access when submitting a report.

USB installation is also available when USB debugging is enabled:

```powershell
& 'C:\Users\User\AppData\Local\Android\Sdk\platform-tools\adb.exe' install -r .\mobile\flutter_app\dist\ManGROOVES-Flutter.apk
```

The current release APK uses the Flutter development signing key and is intended for direct pilot installation. Configure a private release keystore before Play Store distribution.

## Rebuild Android

Flutter is installed at `C:\src\flutter`. From the repository root:

```powershell
.\mobile\flutter_app\build-apk.ps1 -ApiBaseUrl 'http://YOUR-PC-IP/mangrooves_v2/public/mobile-api'
```

For an Android emulator, the PC loopback alias is `10.0.2.2`:

```powershell
.\mobile\flutter_app\build-apk.ps1 -ApiBaseUrl 'http://10.0.2.2/mangrooves_v2/public/mobile-api'
```

The normal sign-in and profile screens do not display the server address. This is intentional for the clean release interface.

## iPhone and IPA

The iOS Flutter project is already generated in `mobile/flutter_app/ios` with camera, photo-library, location, and local-network permission descriptions. The same login, dashboard, reports, secure token storage, camera, GPS, and submission code is compiled for iOS.

Apple requires the final IPA to be compiled and signed on macOS. On a Mac:

1. Install the current stable Flutter SDK and Xcode.
2. Copy or clone this repository to the Mac.
3. Run `flutter doctor -v` and resolve the Xcode/CocoaPods or Swift Package Manager checks.
4. Open `mobile/flutter_app/ios/Runner.xcworkspace` in Xcode.
5. Select your Apple Developer team and use a unique bundle ID, such as `org.mangrooves.mobile`.
6. Connect an iPhone and run the `Runner` target to complete physical-device acceptance testing.
7. Build the signed archive:

   ```bash
   cd mobile/flutter_app
   flutter pub get
   flutter build ipa --release \
     --dart-define=API_BASE_URL=https://your-production-domain.example/mobile-api
   ```

The IPA will be under `build/ios/ipa`. A production iPhone build must use an HTTPS PHP address. Remove the temporary arbitrary-load allowance from `ios/Runner/Info.plist` after moving the server to HTTPS.

## Backend setup

Fresh installations receive the `mobile_api_tokens` table through `database/schema.sql`. For an existing database, import once:

```powershell
& 'C:\xampp\mysql\bin\mysql.exe' --host=127.0.0.1 --port=4306 --user=root --database=mangrooves_db --execute="SOURCE C:/mangrooves_v2/database/mobile_api.sql;"
```

The Flutter app never stores the PHP password or database credentials. It stores only a revocable API token in Android encrypted storage or the iOS Keychain. Password changes, account suspension, logout, expiry, or a session-version reset invalidate access.

## Physical-device acceptance checklist

Run these checks separately on Android and iPhone before public distribution:

1. Register a unique guardian and verify it appears in the web administration screen.
2. Sign out, sign in, close the app, reopen it, and verify secure session restoration.
3. Capture a camera photo, precise GPS location, species traits, and every required health answer.
4. Submit a report and confirm it appears in both the Flutter Reports tab and PHP expert dashboard.
5. Verify the report in the PHP dashboard, refresh Flutter, and confirm the status and expert feedback.
6. Deny and then grant camera/location permissions to confirm recovery messages.
7. Turn the PHP server off temporarily and verify connection errors are understandable; then restart it.
8. Test on at least one small Android phone and one current iPhone before release.

The older `mobile/android-apk` WebView wrapper and the PWA remain as legacy fallbacks. New mobile development should use `mobile/flutter_app`.

See `docs/MOBILE_RELEASE_VERIFICATION.md` for the exact clean-build hash, automated test results, verified APK metadata, and the remaining physical-device and store-signing gates.
