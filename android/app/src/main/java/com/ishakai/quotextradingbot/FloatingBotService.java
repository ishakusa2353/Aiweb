package com.ishakai.quotextradingbot;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.IBinder;
import android.util.DisplayMetrics;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

public class FloatingBotService extends Service {

    private WindowManager windowManager;
    private View bubbleView;
    private WindowManager.LayoutParams bubbleParams;
    private View hudOverlayView;
    private WindowManager.LayoutParams hudParams;
    private WebView hudWebView;
    private boolean isHudOpen = false;

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        startForegroundNotification();
        windowManager = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
        createFloatingBubble();
        createHudOverlay();
    }

    private void startForegroundNotification() {
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

            // Android 14+ (API 34+) and Android 15 compatibility
            if (Build.VERSION.SDK_INT >= 34) {
                try {
                    startForeground(1001, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
                } catch (Exception e) {
                    startForeground(1001, notification);
                }
            } else {
                startForeground(1001, notification);
            }
        }
    }

    private int dpToPx(int dp) {
        DisplayMetrics metrics = getResources().getDisplayMetrics();
        return Math.round(dp * (metrics.densityDpi / 160f));
    }

    private int getLayoutFlag() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            return WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
        } else {
            return WindowManager.LayoutParams.TYPE_PHONE;
        }
    }

    /**
     * 1. Compact Floating Bubble: Only 76dp x 76dp.
     * Takes up minimal space on screen edge.
     * Does NOT block phone touches anywhere else!
     */
    private void createFloatingBubble() {
        int bubbleSize = dpToPx(76);

        bubbleParams = new WindowManager.LayoutParams(
                bubbleSize,
                bubbleSize,
                getLayoutFlag(),
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE |
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT
        );

        bubbleParams.gravity = Gravity.TOP | Gravity.START;

        DisplayMetrics dm = getResources().getDisplayMetrics();
        bubbleParams.x = dm.widthPixels - bubbleSize - dpToPx(12);
        bubbleParams.y = dm.heightPixels / 3;

        // Custom Bubble View with Neon Circle Logo and Badge
        FrameLayout container = new FrameLayout(this);
        container.setBackgroundColor(Color.TRANSPARENT);

        // Circular background glow
        ImageView imgLogo = new ImageView(this);
        imgLogo.setImageResource(R.drawable.logo);
        int pad = dpToPx(4);
        imgLogo.setPadding(pad, pad, pad, pad);

        FrameLayout.LayoutParams imgParams = new FrameLayout.LayoutParams(
                dpToPx(62),
                dpToPx(62),
                Gravity.CENTER
        );
        container.addView(imgLogo, imgParams);

        // Status badge at bottom
        TextView txtBadge = new TextView(this);
        txtBadge.setText("ISHAK AI");
        txtBadge.setTextColor(Color.WHITE);
        txtBadge.setTextSize(8f);
        txtBadge.setBackgroundColor(0xCC00E5FF);
        txtBadge.setGravity(Gravity.CENTER);
        txtBadge.setPadding(dpToPx(4), dpToPx(1), dpToPx(4), dpToPx(1));

        FrameLayout.LayoutParams badgeParams = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT,
                Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL
        );
        container.addView(txtBadge, badgeParams);

        bubbleView = container;

        // Smooth Drag & Drop with Edge Snapping
        bubbleView.setOnTouchListener(new View.OnTouchListener() {
            private int initialX;
            private int initialY;
            private float initialTouchX;
            private float initialTouchY;
            private boolean isMoving = false;

            @Override
            public boolean onTouch(View v, MotionEvent event) {
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        initialX = bubbleParams.x;
                        initialY = bubbleParams.y;
                        initialTouchX = event.getRawX();
                        initialTouchY = event.getRawY();
                        isMoving = false;
                        return true;

                    case MotionEvent.ACTION_MOVE:
                        float dx = event.getRawX() - initialTouchX;
                        float dy = event.getRawY() - initialTouchY;
                        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                            isMoving = true;
                        }
                        if (isMoving) {
                            bubbleParams.x = initialX + (int) dx;
                            bubbleParams.y = initialY + (int) dy;
                            try {
                                windowManager.updateViewLayout(bubbleView, bubbleParams);
                            } catch (Exception ignored) {}
                        }
                        return true;

                    case MotionEvent.ACTION_UP:
                        if (!isMoving) {
                            // Single tap -> Open HUD / License Scanner
                            toggleHudOverlay();
                        } else {
                            // Snap to nearest screen edge (left or right)
                            DisplayMetrics d = getResources().getDisplayMetrics();
                            int screenW = d.widthPixels;
                            int bSize = dpToPx(76);
                            if (bubbleParams.x + (bSize / 2) > (screenW / 2)) {
                                bubbleParams.x = screenW - bSize - dpToPx(8);
                            } else {
                                bubbleParams.x = dpToPx(8);
                            }
                            try {
                                windowManager.updateViewLayout(bubbleView, bubbleParams);
                            } catch (Exception ignored) {}
                        }
                        return true;
                }
                return false;
            }
        });

        windowManager.addView(bubbleView, bubbleParams);
    }

    /**
     * 2. Full HUD & License Dialog Overlay:
     * Appears ONLY when user taps the circular robot icon.
     * When closed, disappears completely so phone touches are 100% free!
     */
    private void createHudOverlay() {
        hudParams = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT,
                getLayoutFlag(),
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL |
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.TRANSLUCENT
        );

        hudParams.gravity = Gravity.TOP | Gravity.START;

        FrameLayout hudContainer = new FrameLayout(this);
        hudContainer.setBackgroundColor(0x77000000); // Semi-transparent backdrop

        hudWebView = new WebView(this);
        hudWebView.setBackgroundColor(Color.TRANSPARENT);
        hudWebView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

        WebSettings settings = hudWebView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);

        hudWebView.setWebViewClient(new WebViewClient());

        hudWebView.addJavascriptInterface(new Object() {
            @JavascriptInterface
            public void executeAutoTrade(String direction) {
                QuotexAccessibilityService.executeTrade(direction);
            }

            @JavascriptInterface
            public void closeHud() {
                bubbleView.post(new Runnable() {
                    @Override
                    public void run() {
                        hideHudOverlay();
                    }
                });
            }

            @JavascriptInterface
            public void closeBot() {
                stopSelf();
            }

            @JavascriptInterface
            public void setFocusable(final boolean focusable) {
                hudOverlayView.post(new Runnable() {
                    @Override
                    public void run() {
                        if (focusable) {
                            hudParams.flags &= ~WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE;
                        } else {
                            hudParams.flags |= WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE;
                        }
                        if (isHudOpen && hudOverlayView.isAttachedToWindow()) {
                            windowManager.updateViewLayout(hudOverlayView, hudParams);
                        }
                    }
                });
            }
        }, "AndroidBridge");

        hudWebView.loadUrl("file:///android_asset/bot_overlay.html");

        hudContainer.addView(hudWebView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
        ));

        // Close HUD button at top-right
        TextView btnClose = new TextView(this);
        btnClose.setText("✕");
        btnClose.setTextColor(Color.WHITE);
        btnClose.setTextSize(18f);
        btnClose.setGravity(Gravity.CENTER);
        btnClose.setBackgroundColor(0xCCEF4444);
        int bP = dpToPx(8);
        btnClose.setPadding(bP, bP, bP, bP);
        btnClose.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                hideHudOverlay();
            }
        });

        FrameLayout.LayoutParams closeParams = new FrameLayout.LayoutParams(
                dpToPx(40),
                dpToPx(40),
                Gravity.TOP | Gravity.END
        );
        closeParams.topMargin = dpToPx(36);
        closeParams.rightMargin = dpToPx(16);
        hudContainer.addView(btnClose, closeParams);

        hudOverlayView = hudContainer;
    }

    private void toggleHudOverlay() {
        if (isHudOpen) {
            hideHudOverlay();
        } else {
            showHudOverlay();
        }
    }

    private void showHudOverlay() {
        if (isHudOpen) return;
        try {
            windowManager.addView(hudOverlayView, hudParams);
            isHudOpen = true;
            // Inform webview to show HUD / Dialog
            hudWebView.evaluateJavascript("if (typeof window.showMainDialog === 'function') window.showMainDialog();", null);
        } catch (Exception ignored) {}
    }

    private void hideHudOverlay() {
        if (!isHudOpen) return;
        try {
            windowManager.removeView(hudOverlayView);
            isHudOpen = false;
        } catch (Exception ignored) {}
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        hideHudOverlay();
        if (bubbleView != null && windowManager != null) {
            try {
                windowManager.removeView(bubbleView);
            } catch (Exception ignored) {}
            bubbleView = null;
        }
    }
}
