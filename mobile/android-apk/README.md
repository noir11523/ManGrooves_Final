# ManGROOVES Android APK

This dependency-free Android shell displays the existing ManGROOVES PHP application in a secure WebView and adds Android runtime permission handling for location, camera capture, and image selection.

It is intentionally a thin client: PHP, MariaDB, verification, badges, analytics, and uploaded evidence remain on the ManGROOVES server. The APK cannot operate when that server is unreachable.

## Development server address

The packaged address is defined in `res/values/strings.xml`:

```xml
<string name="app_url" translatable="false">http://192.168.100.11/mangrooves_v2/public/</string>
```

For local testing, replace the IP if `ipconfig` reports a different Wi-Fi IPv4 address. Set the matching URL in the server copy at `C:\xampp\htdocs\mangrooves_v2\.env`:

```env
APP_URL=http://192.168.100.11/mangrooves_v2/public
```

The phone and computer must use the same Wi-Fi, Apache and MySQL must remain running, and Windows Firewall must allow Apache on private networks.

## Build

Android Studio's Java runtime, Android platform 36.1, and build-tools 36.1.0 are used directly; Gradle and Flutter are not required:

```powershell
cd C:\mangrooves_v2
.\mobile\android-apk\build.cmd
```

Output:

```text
mobile\android-apk\dist\ManGROOVES-debug.apk
```

## Install

Copy the APK to the Android phone, open it, allow installation from the chosen file-manager source when prompted, and select **Install**. Or enable USB debugging and run:

```powershell
& 'C:\Users\User\AppData\Local\Android\Sdk\platform-tools\adb.exe' install -r .\mobile\android-apk\dist\ManGROOVES-debug.apk
```

## Production release

Before public distribution:

1. Deploy ManGROOVES to a stable HTTPS domain.
2. Replace `app_url` with that HTTPS URL.
3. Disable cleartext traffic in `AndroidManifest.xml` and `res/xml/network_security_config.xml`.
4. Create a private release signing key and protect it outside the repository.
5. Increase `VersionCode`, select a production `VersionName`, and build/sign the release.

This local debug APK is for development and demonstration. It targets Android 10 (API 29) or newer and is not an iPhone package; iOS requires an Xcode build on macOS.

