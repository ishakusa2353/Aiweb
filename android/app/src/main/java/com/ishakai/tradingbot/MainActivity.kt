package com.ishakai.tradingbot

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
}