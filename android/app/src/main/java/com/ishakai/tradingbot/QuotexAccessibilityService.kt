package com.ishakai.tradingbot

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
}