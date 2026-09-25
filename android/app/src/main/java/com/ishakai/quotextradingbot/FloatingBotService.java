package com.ishakai.quotextradingbot;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.IBinder;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

public class FloatingBotService extends Service {

    private WindowManager windowManager;
    private FrameLayout overlayContainer;
    private WebView webView;
    private WindowManager.LayoutParams params;

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        startNotification();
        createFloatingOverlay();
    }

    private void startNotification() {
        String channelId = "ishak_bot_service_channel";
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    channelId,
                    "Ishak AI Trading Bot Service",
                    NotificationManager.IMPORTANCE_LOW
            );
            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
            Notification notification = new Notification.Builder(this, channelId)
                    .setContentTitle("Ishak AI Pro Bot Active")
                    .setContentText("স্ক্রিনে বটের ফ্লোটিং লগো সক্রিয় আছে")
                    .setSmallIcon(R.drawable.ic_launcher)
                    .build();
            startForeground(1001, notification);
        }
    }

    private void createFloatingOverlay() {
        windowManager = (WindowManager) getSystemService(Context.WINDOW_SERVICE);

        int layoutFlag;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            layoutFlag = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
        } else {
            layoutFlag = WindowManager.LayoutParams.TYPE_PHONE;
        }

        // Full screen transparent overlay allowing touches to pass to underlying apps
        params = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT,
                layoutFlag,
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL |
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN |
                WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH,
                PixelFormat.TRANSLUCENT
        );

        params.gravity = Gravity.TOP | Gravity.START;

        overlayContainer = new FrameLayout(this);
        overlayContainer.setBackgroundColor(Color.TRANSPARENT);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.TRANSPARENT);
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);

        webView.setWebViewClient(new WebViewClient());

        webView.addJavascriptInterface(new Object() {
            @JavascriptInterface
            public void executeAutoTrade(String direction) {
                QuotexAccessibilityService.executeTrade(direction);
            }

            @JavascriptInterface
            public void closeBot() {
                stopSelf();
            }

            @JavascriptInterface
            public void setFocusable(final boolean focusable) {
                overlayContainer.post(new Runnable() {
                    @Override
                    public void run() {
                        if (focusable) {
                            params.flags &= ~WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE;
                        } else {
                            params.flags |= WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE;
                        }
                        if (overlayContainer.isAttachedToWindow()) {
                            windowManager.updateViewLayout(overlayContainer, params);
                        }
                    }
                });
            }
        }, "AndroidBridge");

        webView.loadUrl("file:///android_asset/bot_overlay.html");

        overlayContainer.addView(webView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
        ));

        windowManager.addView(overlayContainer, params);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (overlayContainer != null && windowManager != null) {
            try {
                windowManager.removeView(overlayContainer);
            } catch (Exception ignored) {}
            overlayContainer = null;
        }
    }
}
