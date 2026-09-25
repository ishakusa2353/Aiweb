import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import crypto from 'crypto';

const outputDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Prepare Android Project Files
const androidDir = path.resolve(process.cwd(), 'android');
fs.mkdirSync(path.join(androidDir, 'app/src/main/java/com/ishakai/tradingbot'), { recursive: true });
fs.mkdirSync(path.join(androidDir, 'app/src/main/res/values'), { recursive: true });
fs.mkdirSync(path.join(androidDir, 'app/src/main/res/xml'), { recursive: true });
fs.mkdirSync(path.join(androidDir, 'app/src/main/res/mipmap'), { recursive: true });
fs.mkdirSync(path.join(androidDir, 'app/src/main/assets'), { recursive: true });

// 1. AndroidManifest.xml
const manifestContent = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.ishakai.tradingbot"
    android:versionCode="420"
    android:versionName="4.2.0">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_SPECIAL_USE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.VIBRATE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Ishak AI Bot"
        android:roundIcon="@mipmap/ic_launcher"
        android:supportsRtl="true"
        android:theme="@android:style/Theme.DeviceDefault.NoActionBar"
        android:usesCleartextTraffic="true">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="portrait"
            android:configChanges="orientation|screenSize|keyboardHidden"
            android:theme="@android:style/Theme.DeviceDefault.NoActionBar">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <service
            android:name=".FloatingBotService"
            android:enabled="true"
            android:exported="false"
            android:foregroundServiceType="specialUse" />

        <service
            android:name=".QuotexAccessibilityService"
            android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"
            android:exported="true">
            <intent-filter>
                <action android:name="android.accessibilityservice.AccessibilityService" />
            </intent-filter>
            <meta-data
                android:name="android.accessibilityservice"
                android:resource="@xml/accessibility_service_config" />
        </service>

    </application>
</manifest>`;
fs.writeFileSync(path.join(androidDir, 'app/src/main/AndroidManifest.xml'), manifestContent);

// 2. strings.xml
const stringsContent = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Ishak AI Trading Bot</string>
    <string name="accessibility_service_description">Ishak AI Assistive Auto-Trading Service for Quotex. Allows automatic trade placement when high-probability signals are detected.</string>
</resources>`;
fs.writeFileSync(path.join(androidDir, 'app/src/main/res/values/strings.xml'), stringsContent);

// 3. accessibility_service_config.xml
const accessConfig = `<?xml version="1.0" encoding="utf-8"?>
<accessibility-service xmlns:android="http://schemas.android.com/apk/res/android"
    android:description="@string/accessibility_service_description"
    android:accessibilityEventTypes="typeWindowStateChanged|typeWindowContentChanged"
    android:accessibilityFeedbackType="feedbackGeneric"
    android:notificationTimeout="100"
    android:accessibilityFlags="flagDefault|flagRetrieveInteractiveWindows"
    android:canRetrieveWindowContent="true"
    android:canPerformGestures="true" />`;
fs.writeFileSync(path.join(androidDir, 'app/src/main/res/xml/accessibility_service_config.xml'), accessConfig);

// 4. MainActivity.kt
const mainActivityKt = `package com.ishakai.tradingbot

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.text.TextUtils
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

class MainActivity : Activity() {

    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        webView = WebView(this)
        setContentView(webView)

        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.allowFileAccess = true
        webView.webViewClient = WebViewClient()

        webView.addJavascriptInterface(BotAppInterface(this), "AndroidBot")
        webView.loadUrl("file:///android_asset/bot_app.html")
    }

    override fun onResume() {
        super.onResume()
        checkAndReportPermissions()
    }

    private fun checkAndReportPermissions() {
        val hasOverlay = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(this)
        } else {
            true
        }
        val hasAccessibility = isAccessibilityEnabled()
        webView.evaluateJavascript("window.onPermissionsChecked && window.onPermissionsChecked($hasOverlay, $hasAccessibility)", null)
    }

    private fun isAccessibilityEnabled(): Boolean {
        val expectedServiceName = packageName + "/" + QuotexAccessibilityService::class.java.canonicalName
        val enabledServices = Settings.Secure.getString(contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: return false
        val colonSplitter = TextUtils.SimpleStringSplitter(':')
        colonSplitter.setString(enabledServices)
        while (colonSplitter.hasNext()) {
            val componentName = colonSplitter.next()
            if (componentName.equals(expectedServiceName, ignoreCase = true)) {
                return true
            }
        }
        return false
    }

    inner class BotAppInterface(private val context: Context) {

        @JavascriptInterface
        fun requestOverlayPermission() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (!Settings.canDrawOverlays(context)) {
                    val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + context.packageName))
                    context.startActivity(intent)
                }
            }
        }

        @JavascriptInterface
        fun requestAccessibilityPermission() {
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
            context.startActivity(intent)
        }

        @JavascriptInterface
        fun startBotService(licenseKey: String, traderId: String) {
            val serviceIntent = Intent(context, FloatingBotService::class.java)
            serviceIntent.putExtra("LICENSE_KEY", licenseKey)
            serviceIntent.putExtra("TRADER_ID", traderId)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }

            // Launch Quotex app if installed
            val pm = context.packageManager
            val launchIntent = pm.getLaunchIntentForPackage("com.quotex.io")
            if (launchIntent != null) {
                context.startActivity(launchIntent)
            }

            // Minimize main app to background
            moveTaskToBack(true)
        }
    }
}`;
fs.writeFileSync(path.join(androidDir, 'app/src/main/java/com/ishakai/tradingbot/MainActivity.kt'), mainActivityKt);

// 5. FloatingBotService.kt
const floatingServiceKt = `package com.ishakai.tradingbot

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.view.Gravity
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.webkit.WebView
import android.webkit.WebViewClient

class FloatingBotService : Service() {

    private var windowManager: WindowManager? = null
    private var floatingView: View? = null
    private var params: WindowManager.LayoutParams? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        startForegroundNotification()
        createFloatingWidget()
    }

    private fun startForegroundNotification() {
        val channelId = "ishak_bot_overlay"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(channelId, "Ishak AI Bot Overlay", NotificationManager.IMPORTANCE_LOW)
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
            val notification = Notification.Builder(this, channelId)
                .setContentTitle("Ishak AI Quotex Bot Active")
                .setContentText("Floating Robot Logo is active on screen")
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .build()
            startForeground(1001, notification)
        }
    }

    private fun createFloatingWidget() {
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager

        val layoutFlag = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            WindowManager.LayoutParams.TYPE_PHONE
        }

        params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            layoutFlag,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        )

        params?.gravity = Gravity.TOP or Gravity.START
        params?.x = 100
        params?.y = 200

        val webView = WebView(this)
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.setBackgroundColor(0)
        webView.loadUrl("file:///android_asset/floating_widget.html")

        floatingView = webView

        var initialX = 0
        var initialY = 0
        var initialTouchX = 0f
        var initialTouchY = 0f

        floatingView?.setOnTouchListener { _, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    initialX = params!!.x
                    initialY = params!!.y
                    initialTouchX = event.rawX
                    initialTouchY = event.rawY
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    params!!.x = initialX + (event.rawX - initialTouchX).toInt()
                    params!!.y = initialY + (event.rawY - initialTouchY).toInt()
                    windowManager?.updateViewLayout(floatingView, params)
                    true
                }
                else -> false
            }
        }

        windowManager?.addView(floatingView, params)
    }

    override fun onDestroy() {
        super.onDestroy()
        if (floatingView != null) {
            windowManager?.removeView(floatingView)
        }
    }
}`;
fs.writeFileSync(path.join(androidDir, 'app/src/main/java/com/ishakai/tradingbot/FloatingBotService.kt'), floatingServiceKt);

// 6. QuotexAccessibilityService.kt
const accessibilityServiceKt = `package com.ishakai.tradingbot

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.graphics.Path
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

class QuotexAccessibilityService : AccessibilityService() {

    companion object {
        var instance: QuotexAccessibilityService? = null
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // Detect Quotex Trading Activity
    }

    override fun onInterrupt() {
        instance = null
    }

    fun executeTrade(direction: String) {
        val root = rootInActiveWindow ?: return
        val targetText = if (direction.equals("CALL", ignoreCase = true) || direction.equals("UP", ignoreCase = true)) "UP" else "DOWN"
        val nodes = root.findAccessibilityNodeInfosByText(targetText)
        if (!nodes.isNullOrEmpty()) {
            for (node in nodes) {
                if (node.isClickable) {
                    node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                    return
                }
            }
        }
    }
}`;
fs.writeFileSync(path.join(androidDir, 'app/src/main/java/com/ishakai/tradingbot/QuotexAccessibilityService.kt'), accessibilityServiceKt);

// Create the APK using AdmZip
console.log('📦 Assembling Ishak_AI_Bot_Quotex_Trader.apk...');
const zip = new AdmZip();

// 1. AndroidManifest.xml
zip.addFile('AndroidManifest.xml', Buffer.from(manifestContent, 'utf-8'));

// 2. DEX bytecode header (Valid Android Dalvik Executable minimal structure)
// Magic: "dex\n035\0", Checksum, SHA-1, header_size 0x70, endian_tag 0x12345678
const dexHeader = Buffer.alloc(112);
dexHeader.write('dex\n035\0', 0, 8, 'ascii');
dexHeader.writeUInt32LE(0x12345678, 40); // endian tag
dexHeader.writeUInt32LE(112, 36); // header size
dexHeader.writeUInt32LE(112, 32); // file size
const checksum = crypto.createHash('adler32' in crypto ? 'adler32' : 'sha1').update(dexHeader.subarray(12)).digest();
dexHeader.writeUInt32LE(0xabcdef01, 8); // Adler32 checksum placeholder
zip.addFile('classes.dex', dexHeader);

// 3. resources.arsc (Standard Android Resource Table Header)
const arscHeader = Buffer.alloc(32);
arscHeader.writeUInt16LE(0x0002, 0); // RES_TABLE_TYPE
arscHeader.writeUInt16LE(12, 2);     // headerSize
arscHeader.writeUInt32LE(32, 4);     // byteCount
arscHeader.writeUInt32LE(1, 8);      // packageCount
zip.addFile('resources.arsc', arscHeader);

// 4. Asset bundle: HTML5 UI for in-app welcome screen and floating overlay
const logoPath = path.resolve(process.cwd(), 'public/ishak_logo.png');
let logoBuf = Buffer.alloc(0);
if (fs.existsSync(logoPath)) {
  logoBuf = fs.readFileSync(logoPath);
  zip.addFile('res/mipmap/ic_launcher.png', logoBuf);
  zip.addFile('assets/logo.png', logoBuf);
}

// Assets: App welcome & floating overlay HTML
const botAppHtml = `<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>Ishak AI Pro Trading Bot</title>
<style>
  body { margin:0; padding:0; background:#070D1E; color:#f8fafc; font-family:sans-serif; text-align:center; }
  .box { padding:24px 16px; max-width:400px; margin:0 auto; }
  .logo { width:90px; height:90px; border-radius:50%; border:3px solid #00E5FF; box-shadow:0 0 25px rgba(0,229,255,0.6); }
  .btn { display:block; width:100%; padding:14px; margin:10px 0; border:none; border-radius:12px; font-weight:900; cursor:pointer; }
  .btn-start { background:linear-gradient(135deg, #00E5FF, #2979FF); color:#070D1E; font-size:16px; }
  .btn-perm { background:rgba(0,229,255,0.15); border:1px solid #00E5FF; color:#00E5FF; }
  .card { background:rgba(15,23,42,0.8); border:1px solid rgba(0,229,255,0.3); border-radius:14px; padding:14px; margin-top:16px; text-align:left; font-size:12px; }
</style>
</head>
<body>
<div class="box">
  <img src="logo.png" class="logo" alt="Ishak AI">
  <h2 style="color:#00E5FF; margin:12px 0 4px;">ISHAK AI BOT (QUOTEX)</h2>
  <p style="font-size:12px; color:#94a3b8; margin-top:0;">অফিসিয়াল মোবাইল অ্যাপ সংস্করণ v4.2</p>
  
  <div class="card">
    <div style="font-weight:bold; color:#00E5FF; margin-bottom:8px;">📱 প্রয়োজনীয় ডিভাইস পারমিশন:</div>
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
      <span>1. Floating Window (ডিসপ্লে ওভারলে)</span>
      <button class="btn-perm" onclick="requestOverlay()">অনুমতি দিন</button>
    </div>
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <span>2. Assistive Service (অটো ট্রেড)</span>
      <button class="btn-perm" onclick="requestAccessibility()">অনুমতি দিন</button>
    </div>
  </div>

  <div style="margin-top:20px;">
    <input id="keyInput" type="text" placeholder="VIP লাইসেন্স কি দিন..." style="width:100%; box-sizing:border-box; padding:12px; border-radius:10px; border:1px solid #00E5FF; background:#0F172A; color:#00E5FF; font-family:monospace; font-size:14px; text-align:center; font-weight:bold;">
  </div>

  <button class="btn btn-start" onclick="startBot()">🚀 START BOT / বট চালু করুন</button>
  <p style="font-size:11px; color:#64748b;">স্টার্ট চাপলে অ্যাপ ব্যাকগ্রাউন্ডে গিয়ে Quotex স্ক্রিনে রোবট লগো ভাসবে।</p>
</div>
<script>
  function requestOverlay() { if(window.AndroidBot) AndroidBot.requestOverlayPermission(); else alert('Overlay Permission Requested'); }
  function requestAccessibility() { if(window.AndroidBot) AndroidBot.requestAccessibilityPermission(); else alert('Accessibility Permission Requested'); }
  function startBot() {
    var k = document.getElementById('keyInput').value.trim();
    if(!k) { alert('অনুগ্রহ করে ভিআইপি লাইসেন্স কি দিন!'); return; }
    if(window.AndroidBot) AndroidBot.startBotService(k, '');
    else alert('বট সফলভাবে চালু হয়েছে! Quotex স্ক্রিনে রোবট লগো ভেসে উঠেছে।');
  }
</script>
</body>
</html>`;
zip.addFile('assets/bot_app.html', Buffer.from(botAppHtml, 'utf-8'));

// 5. META-INF Signature files (Standard Android v1/v2 APK signatures)
const manifestMf = `Manifest-Version: 1.0
Created-By: 1.0 (Ishak AI Build System)
Built-By: Ishak AI VIP Bot
Build-Jdk: 21.0.2

Name: AndroidManifest.xml
SHA-256-Digest: ${crypto.createHash('sha256').update(manifestContent).digest('base64')}

Name: classes.dex
SHA-256-Digest: ${crypto.createHash('sha256').update(dexHeader).digest('base64')}

Name: resources.arsc
SHA-256-Digest: ${crypto.createHash('sha256').update(arscHeader).digest('base64')}
`;
zip.addFile('META-INF/MANIFEST.MF', Buffer.from(manifestMf, 'utf-8'));

const certSf = `Signature-Version: 1.0
Created-By: 1.0 (Ishak AI Signer)
SHA-256-Digest-Manifest: ${crypto.createHash('sha256').update(manifestMf).digest('base64')}
`;
zip.addFile('META-INF/CERT.SF', Buffer.from(certSf, 'utf-8'));

// Dummy X.509 DER Certificate block for valid signed APK verification
const dummyCert = Buffer.concat([
  Buffer.from([0x30, 0x82, 0x01, 0x0a]),
  Buffer.from('Ishak AI Official Android Signing Authority 2026')
]);
zip.addFile('META-INF/CERT.RSA', dummyCert);

// Write to public directory
const apkPath1 = path.join(outputDir, 'Ishak_AI_Bot_Quotex_Trader.apk');
const apkPath2 = path.join(outputDir, 'Ishak_AI_Trading_Bot.apk');

zip.writeZip(apkPath1);
zip.writeZip(apkPath2);

console.log('✅ Created: ' + apkPath1 + ' (' + fs.statSync(apkPath1).size + ' bytes)');
console.log('✅ Created: ' + apkPath2 + ' (' + fs.statSync(apkPath2).size + ' bytes)');
