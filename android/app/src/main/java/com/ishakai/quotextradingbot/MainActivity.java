package com.ishakai.quotextradingbot;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.text.TextUtils;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

public class MainActivity extends Activity {

    private TextView txtOverlayStatus;
    private TextView txtAccessibilityStatus;
    private Button btnOverlayPerm;
    private Button btnAccessibilityPerm;
    private Button btnStartBot;
    private Button btnStopBot;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        txtOverlayStatus = findViewById(R.id.txtOverlayStatus);
        txtAccessibilityStatus = findViewById(R.id.txtAccessibilityStatus);
        btnOverlayPerm = findViewById(R.id.btnOverlayPerm);
        btnAccessibilityPerm = findViewById(R.id.btnAccessibilityPerm);
        btnStartBot = findViewById(R.id.btnStartBot);
        btnStopBot = findViewById(R.id.btnStopBot);

        btnOverlayPerm.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                requestOverlayPermission();
            }
        });

        btnAccessibilityPerm.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                requestAccessibilityPermission();
            }
        });

        btnStartBot.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                startFloatingBot();
            }
        });

        btnStopBot.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                stopFloatingBot();
            }
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        updatePermissionUI();
    }

    private boolean hasOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return Settings.canDrawOverlays(this);
        }
        return true;
    }

    private boolean isAccessibilityServiceEnabled() {
        String expectedServiceName = getPackageName() + "/" + QuotexAccessibilityService.class.getCanonicalName();
        String enabledServices = Settings.Secure.getString(getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
        if (enabledServices == null) return false;

        TextUtils.SimpleStringSplitter splitter = new TextUtils.SimpleStringSplitter(':');
        splitter.setString(enabledServices);
        while (splitter.hasNext()) {
            String serviceName = splitter.next();
            if (serviceName.equalsIgnoreCase(expectedServiceName)) {
                return true;
            }
        }
        return false;
    }

    private void updatePermissionUI() {
        boolean overlayOk = hasOverlayPermission();
        boolean accessOk = isAccessibilityServiceEnabled();

        if (overlayOk) {
            txtOverlayStatus.setText("অনুমোদিত ✅ (Active)");
            txtOverlayStatus.setTextColor(0xFF00FF66);
            btnOverlayPerm.setText("অনুমোদিত");
            btnOverlayPerm.setEnabled(false);
            btnOverlayPerm.setAlpha(0.6f);
        } else {
            txtOverlayStatus.setText("অনুমতি প্রয়োজন ⚠️");
            txtOverlayStatus.setTextColor(0xFFFF5252);
            btnOverlayPerm.setText("অনুমতি দিন");
            btnOverlayPerm.setEnabled(true);
            btnOverlayPerm.setAlpha(1.0f);
        }

        if (accessOk) {
            txtAccessibilityStatus.setText("অনুমোদিত ✅ (Active)");
            txtAccessibilityStatus.setTextColor(0xFF00FF66);
            btnAccessibilityPerm.setText("অনুমোদিত");
            btnAccessibilityPerm.setEnabled(false);
            btnAccessibilityPerm.setAlpha(0.6f);
        } else {
            txtAccessibilityStatus.setText("অনুমতি প্রয়োজন (ঐচ্ছিক/অটো ট্রেড) ⚠️");
            txtAccessibilityStatus.setTextColor(0xFFFFD600);
            btnAccessibilityPerm.setText("অনুমতি দিন");
            btnAccessibilityPerm.setEnabled(true);
            btnAccessibilityPerm.setAlpha(1.0f);
        }
    }

    private void requestOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(this)) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:" + getPackageName()));
                startActivity(intent);
            } else {
                Toast.makeText(this, "Floating Overlay Permission already granted!", Toast.LENGTH_SHORT).show();
            }
        }
    }

    private void requestAccessibilityPermission() {
        Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
        startActivity(intent);
        Toast.makeText(this, "তালিকা থেকে 'Ishak AI Bot' নির্বাচন করে On করুন", Toast.LENGTH_LONG).show();
    }

    private void startFloatingBot() {
        if (!hasOverlayPermission()) {
            Toast.makeText(this, "অনুগ্রহ করে প্রথমে Floating Window পারমিশন দিন!", Toast.LENGTH_LONG).show();
            requestOverlayPermission();
            return;
        }

        Intent serviceIntent = new Intent(this, FloatingBotService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent);
        } else {
            startService(serviceIntent);
        }

        Toast.makeText(this, "🚀 Ishak AI বট চালু হয়েছে! স্ক্রিনে রোবট লগো ভাসছে।", Toast.LENGTH_SHORT).show();

        // Move this activity to back so user is immediately on their screen / Quotex app!
        moveTaskToBack(true);
    }

    private void stopFloatingBot() {
        Intent serviceIntent = new Intent(this, FloatingBotService.class);
        stopService(serviceIntent);
        Toast.makeText(this, "বট স্ক্রিন থেকে সরানো হয়েছে।", Toast.LENGTH_SHORT).show();
    }
}
