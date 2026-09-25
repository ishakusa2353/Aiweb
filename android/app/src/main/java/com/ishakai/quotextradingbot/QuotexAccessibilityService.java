package com.ishakai.quotextradingbot;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.GestureDescription;
import android.graphics.Path;
import android.os.Build;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import java.util.List;

public class QuotexAccessibilityService extends AccessibilityService {

    public static QuotexAccessibilityService instance = null;

    @Override
    public void onServiceConnected() {
        super.onServiceConnected();
        instance = this;
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        // Active window monitoring
    }

    @Override
    public void onInterrupt() {
        instance = null;
    }

    @Override
    public boolean onUnbind(android.content.Intent intent) {
        instance = null;
        return super.onUnbind(intent);
    }

    public static void executeTrade(String direction) {
        if (instance == null) return;
        instance.performClickForDirection(direction);
    }

    private void performClickForDirection(String direction) {
        try {
            AccessibilityNodeInfo root = getRootInActiveWindow();
            if (root == null) return;

            String textTarget = direction.equalsIgnoreCase("CALL") || direction.equalsIgnoreCase("UP") ? "UP" : "DOWN";
            List<AccessibilityNodeInfo> nodes = root.findAccessibilityNodeInfosByText(textTarget);

            if (nodes != null && !nodes.isEmpty()) {
                for (AccessibilityNodeInfo node : nodes) {
                    if (node.isClickable()) {
                        node.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                        return;
                    }
                    AccessibilityNodeInfo parent = node.getParent();
                    if (parent != null && parent.isClickable()) {
                        parent.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                        return;
                    }
                }
            }
        } catch (Exception ignored) {}
    }
}
