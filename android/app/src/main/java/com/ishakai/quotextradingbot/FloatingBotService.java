package com.ishakai.quotextradingbot;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
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
import android.widget.TextView;

public class FloatingBotService extends Service {

    private WindowManager windowManager;
    private View bubbleView;
    private WindowManager.LayoutParams bubbleParams;
    private View hudOverlayView;
    private WindowManager.LayoutParams hudParams;
    private WebView hudWebView;
    private boolean isHudOpen = false;
    private Handler mainHandler;

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        mainHandler = new Handler(Looper.getMainLooper());
        startForegroundNotification();
        windowManager = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
        createFloatingBubble();
        createHudOverlay();
    }

    private void startForegroundNotification() {
        try {
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

                Notification.Builder builder = new Notification.Builder(this, channelId)
                        .setContentTitle("Ishak AI Pro Bot Active")
                        .setContentText("স্ক্রিনে বটের ফ্লোটিং লগো সক্রিয় আছে")
                        .setSmallIcon(R.drawable.ic_launcher);

                Notification notification = builder.build();

                // Android 14+ (API 34+) and Android 15 compatibility
                if (Build.VERSION.SDK_INT >= 34) {
                    try {
                        // 0x40000000 = FOREGROUND_SERVICE_TYPE_SPECIAL_USE
                        startForeground(1001, notification, 0x40000000);
                    } catch (Throwable t) {
                        try {
                            startForeground(1001, notification);
                        } catch (Throwable ignored) {}
                    }
                } else {
                    startForeground(1001, notification);
                }
            }
        } catch (Throwable e) {
            // Notification setup fallback
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
     * 1. Compact Floating Bubble: STRICTLY 76dp x 76dp.
     * Uses FLAG_NOT_FOCUSABLE | FLAG_NOT_TOUCH_MODAL without FLAG_LAYOUT_NO_LIMITS.
     * This guarantees 100% of the screen outside this 76dp icon is completely free to touch!
     * Solves the screen freeze on Android 8 (Oreo) and all other versions!
     */
    private void createFloatingBubble() {
        int bubbleSize = dpToPx(76);

        bubbleParams = new WindowManager.LayoutParams(
                bubbleSize,
                bubbleSize,
                getLayoutFlag(),
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE |
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
                PixelFormat.TRANSLUCENT
        );

        bubbleParams.gravity = Gravity.TOP | Gravity.START;

        DisplayMetrics dm = getResources().getDisplayMetrics();
        bubbleParams.x = dm.widthPixels - bubbleSize - dpToPx(12);
        bubbleParams.y = dm.heightPixels / 3;

        // Custom Bubble View with Neon Circle Logo and Badge
        FrameLayout container = new FrameLayout(this);
        container.setBackgroundColor(Color.TRANSPARENT);

        // Circular background glow with cyan border matching public/loader.js
        GradientDrawable circleBg = new GradientDrawable();
        circleBg.setShape(GradientDrawable.OVAL);
        circleBg.setColor(0xEE0B132B); // Dark navy cyber base
        circleBg.setStroke(dpToPx(2), 0xFF00E5FF); // Neon cyan border

        FrameLayout circleView = new FrameLayout(this);
        circleView.setBackground(circleBg);
        int circleSize = dpToPx(66);
        FrameLayout.LayoutParams circleParams = new FrameLayout.LayoutParams(
                circleSize,
                circleSize,
                Gravity.CENTER
        );
        container.addView(circleView, circleParams);

        // Center Ishak AI Robot Logo
        ImageView imgLogo = new ImageView(this);
        imgLogo.setImageResource(R.drawable.logo);
        int pad = dpToPx(7);
        imgLogo.setPadding(pad, pad, pad, pad);
        circleView.addView(imgLogo, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT,
                Gravity.CENTER
        ));

        // Status badge at bottom matching public/loader.js
        TextView txtBadge = new TextView(this);
        txtBadge.setText("ISHAK AI");
        txtBadge.setTextColor(Color.WHITE);
        txtBadge.setTextSize(7.5f);
        txtBadge.setGravity(Gravity.CENTER);

        GradientDrawable badgeBg = new GradientDrawable();
        badgeBg.setColor(0xEE070D1E);
        badgeBg.setCornerRadius(dpToPx(4));
        badgeBg.setStroke(dpToPx(1), 0xFF00E5FF);
        txtBadge.setBackground(badgeBg);
        txtBadge.setPadding(dpToPx(5), dpToPx(1), dpToPx(5), dpToPx(1));

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
                        if (Math.abs(dx) > 12 || Math.abs(dy) > 12) {
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
                            // Single tap -> Open HUD / License / Settings Dialog
                            showHudOverlay();
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
     * Added ONLY when the user taps the floating bubble.
     * When closed, it is completely removed from WindowManager, releasing all touches!
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
        hudContainer.setBackgroundColor(0x77000000); // Semi-transparent dark cyber backdrop

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
                mainHandler.post(new Runnable() {
                    @Override
                    public void run() {
                        hideHudOverlay();
                    }
                });
            }

            @JavascriptInterface
            public void closeBot() {
                mainHandler.post(new Runnable() {
                    @Override
                    public void run() {
                        stopSelf();
                    }
                });
            }

            @JavascriptInterface
            public void setFocusable(final boolean focusable) {
                mainHandler.post(new Runnable() {
                    @Override
                    public void run() {
                        if (focusable) {
                            hudParams.flags &= ~WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE;
                        } else {
                            hudParams.flags |= WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE;
                        }
                        if (isHudOpen && hudOverlayView != null && hudOverlayView.isAttachedToWindow()) {
                            try {
                                windowManager.updateViewLayout(hudOverlayView, hudParams);
                            } catch (Exception ignored) {}
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

        // Circular close button at top-right
        TextView btnClose = new TextView(this);
        btnClose.setText("✕");
        btnClose.setTextColor(Color.WHITE);
        btnClose.setTextSize(16f);
        btnClose.setGravity(Gravity.CENTER);

        GradientDrawable closeBg = new GradientDrawable();
        closeBg.setShape(GradientDrawable.OVAL);
        closeBg.setColor(0xDDFF1744); // Bright red
        closeBg.setStroke(dpToPx(1), Color.WHITE);
        btnClose.setBackground(closeBg);

        btnClose.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                hideHudOverlay();
            }
        });

        int closeSize = dpToPx(38);
        FrameLayout.LayoutParams closeParams = new FrameLayout.LayoutParams(
                closeSize,
                closeSize,
                Gravity.TOP | Gravity.END
        );
        closeParams.topMargin = dpToPx(34);
        closeParams.rightMargin = dpToPx(16);
        hudContainer.addView(btnClose, closeParams);

        hudOverlayView = hudContainer;
    }

    private void showHudOverlay() {
        if (isHudOpen || hudOverlayView == null) return;
        try {
            windowManager.addView(hudOverlayView, hudParams);
            isHudOpen = true;
            // Trigger dialog in webview
            hudWebView.evaluateJavascript("if (typeof window.showMainDialog === 'function') window.showMainDialog();", null);
        } catch (Exception ignored) {}
    }

    private void hideHudOverlay() {
        if (!isHudOpen || hudOverlayView == null) return;
        try {
            windowManager.removeView(hudOverlayView);
            isHudOpen = false;
        } catch (Exception ignored) {}
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // When user swipes away / closes the app from Recents, remove floating logo and stop service!
        super.onTaskRemoved(rootIntent);
        stopSelf();
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
