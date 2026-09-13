# Flutter mobile installation

ManGROOVES now has a proper Flutter client in `mobile/flutter_app`. Android and iOS share the same Dart screens and call the existing PHP/MariaDB system through the bearer-token JSON API in `public/mobile-api`.

Local testing notice (September 12, 2026): the updated APK is built, but the last
live check found an InnoDB recovery-log error preventing XAMPP MySQL from starting.
Registration and reporting require database recovery first. See
[Mobile release verification](MOBILE_RELEASE_VERIFICATION.md#current-local-database-blocker).

## Current Android APK

The installable release-mode pilot APK is:

```text
mobile/flutter_app/dist/ManGROOVES-Flutter.apk
```

Its initial local PHP API address is:

```text
http://192.168.100.12/mangrooves_v2/public/mobile-api
```

Before testing, start Apache and MySQL in XAMPP. The Android phone and computer must be connected to the same router or non-guest local network. The computer may use Ethernet while the phone uses Wi-Fi.

The technical server URL is intentionally hidden from the normal app screens so guardians see a clean interface. The current pilot APK first tries:

```text
http://192.168.100.12/mangrooves_v2/public/mobile-api
```

If that address changes, the local pilot app searches the phone's private LAN subnet for an endpoint identifying itself as the ManGROOVES API and remembers the address it finds. This product identifier is not server authentication; use LAN discovery only on a trusted development network and HTTPS hosting for public use. Discovery can recover normal router-assigned IP changes without rebuilding. The registration screen also provides **Retry connection** after a failed attempt.

Discovery cannot bypass network separation: it will not work if XAMPP is stopped, the phone uses mobile data or guest Wi-Fi, the router blocks device-to-device traffic, or a VPN blocks local-network access.

To install manually:

1. Copy `ManGROOVES-Flutter.apk` to the Android phone.
2. Open it from Files or Downloads.
3. Allow installs from that file-manager source if Android asks.
4. Tap **Install**, then **Open**.
5. Grant camera access when taking a photo. Grant precise location access for GPS capture, or select a manual map pin without GPS permission.

### Registration and manual pins (version 1.1.5, build 7)

Install the updated APK over the older pilot app; editing PHP or refreshing the
website does not update an APK already installed on a phone.

To register:

1. Open **Create guardian account** from the sign-in screen.
2. Enter your name, a valid email address, barangay, and matching passwords; accept the privacy notice.
3. Tap **Create guardian account** once and wait for the server response.
4. On success, the app signs you in and opens **Dashboard**. The registration page is removed, so Back does not reopen it.
5. If the server rejects the details or cannot be reached, the form remains with your entries and an error. Correct the error and retry. If an earlier version already created your account, use **Sign in** instead of registering it again.

To choose the pin manually:

1. Open **Observe** and stay on the **Site** step.
2. Tap **Choose location on map** under the GPS button.
3. Tap your actual field site, or drag the map underneath the centered pin.
4. Check the coordinates and tap **Use this location**.
5. Back on the report, confirm the **Manual pin** coordinates. Use **Adjust pin on map** to change them, or **Capture GPS location** to replace them with a GPS reading.
6. Add the photo, sitio name, living count, health checklist, and species traits, then submit normally.

Opening the map does not silently select its default center. Canceling leaves
your previous selection unchanged. Manual pins do not require GPS permission or
invent a GPS accuracy measurement. Pins outside the account's configured barangay
monitoring area are rejected; choose only the actual location of the observation.
Map imagery needs internet (or previously cached tiles). **Enter coordinates instead**
lets you provide known field coordinates if the tiles cannot load. Report submission
still requires a connection to the PHP backend.

### Accurate live location

**Use my live location** does not read a server IP address. It asks the device
through the browser or native operating-system location service. A desktop or
laptop without a GPS sensor may only return a broad Wi-Fi/network estimate such
as `±50000 m`. Version 1.1.5 refuses GPS readings worse than `±100 m` instead
of saving that estimate. It listens for improved high-accuracy updates for up to
30 seconds.

For the most accurate result, use the native Flutter app on a GPS-equipped phone,
enable **Precise location**, and stand outdoors with a clear sky view. On the web,
live geolocation requires HTTPS (except the browser's special localhost case).
If an acceptable GPS fix is unavailable, select the actual observation point
using **Place pin manually**; never use an inaccurate automatic estimate.

USB installation is also available when USB debugging is enabled:

```powershell
& 'C:\Users\User\AppData\Local\Android\Sdk\platform-tools\adb.exe' install -r .\mobile\flutter_app\dist\ManGROOVES-Flutter.apk
```

The current release APK uses the Flutter development signing key and is intended for direct pilot installation. Configure a private release keystore before Play Store distribution.

## Rebuild Android

For classmates outside your local network, deploy the PHP backend and database to
hosting first. Follow `docs/ONLINE_HOSTING.md`, then use `build-apk.ps1 -Online`
with the real HTTPS API URL. An online build ignores stored LAN addresses and does
not scan local networks. The current downloadable pilot APK is still local-only.

Flutter is installed at `C:\src\flutter`. From the repository root:

```powershell
.\mobile\flutter_app\build-apk.cmd -ApiBaseUrl 'http://YOUR-PC-IP/mangrooves_v2/public/mobile-api'
```

For an Android emulator, the PC loopback alias is `10.0.2.2`:

```powershell
.\mobile\flutter_app\build-apk.cmd -ApiBaseUrl 'http://10.0.2.2/mangrooves_v2/public/mobile-api'
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

1. Register a unique guardian, confirm the app opens Dashboard without the registration form remaining in Back history, and verify the account appears in web administration.
2. Sign out, sign in, close the app, reopen it, and verify secure session restoration.
3. Capture a camera photo, precise GPS location, species traits, and every required health answer.
4. Submit a report and confirm it appears in both the Flutter Reports tab and PHP expert dashboard.
5. Verify the report in the PHP dashboard, refresh Flutter, and confirm the status and expert feedback.
6. Deny location permission, choose a manual pin, submit a second photo report, and verify the saved coordinates. Reopen the picker, move the map, and cancel to check that the old selection remains. Then grant GPS permission and check GPS capture again.
7. Turn the PHP server off temporarily and verify connection errors are understandable; then restart it.
8. Test on at least one small Android phone and one current iPhone before release.

The older Android WebView wrapper has been retired. The PWA remains available as a browser-installable fallback, while new mobile development uses `mobile/flutter_app`.

See `docs/MOBILE_RELEASE_VERIFICATION.md` for the exact clean-build hash, automated test results, verified APK metadata, and the remaining physical-device and store-signing gates.
