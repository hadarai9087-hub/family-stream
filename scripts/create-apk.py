import zipfile
import os

manifest_content = """<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.hmstream.tv"
    android:versionCode="1"
    android:versionName="1.0.0">
    <uses-feature android:name="android.software.leanback" android:required="true" />
    <uses-feature android:name="android.hardware.touchscreen" android:required="false" />
    <uses-permission android:name="android.permission.INTERNET" />
    <application
        android:label="HMSTREAM TV"
        android:icon="@mipmap/ic_launcher"
        android:banner="@drawable/banner"
        android:isGame="false">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="landscape">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LEANBACK_LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>"""

apk_path = 'public/downloads/hm-stream-tv.apk'
os.makedirs(os.path.dirname(apk_path), exist_ok=True)
with zipfile.ZipFile(apk_path, 'w', compression=zipfile.ZIP_DEFLATED) as z:
    z.writestr('AndroidManifest.xml', manifest_content.encode('utf-8'))
    z.writestr('assets/app_config.json', '{"app_name": "HMSTREAM", "package": "com.hmstream.tv", "target": "AndroidTV", "version": "1.0.0"}')
    if os.path.exists('public/logo.png'):
        z.write('public/logo.png', 'res/drawable/banner.png')
        z.write('public/logo.png', 'res/mipmap-xhdpi/ic_launcher.png')

print('APK created successfully, size:', os.path.getsize(apk_path), 'bytes')
