import fs from 'fs';
import path from 'path';

const loaderPath = path.resolve(process.cwd(), 'public/loader.js');
const rawLoader = fs.readFileSync(loaderPath, 'utf-8');

// Strip "javascript:(function(){" at start and "})();" at end
let jsCode = rawLoader.trim();
if (jsCode.startsWith('javascript:')) {
  jsCode = jsCode.substring('javascript:'.length).trim();
}
if (jsCode.startsWith('(function(){')) {
  jsCode = jsCode.substring('(function(){'.length);
}
if (jsCode.endsWith('})();')) {
  jsCode = jsCode.substring(0, jsCode.length - 5);
} else if (jsCode.endsWith('})()')) {
  jsCode = jsCode.substring(0, jsCode.length - 4);
}

// Enhance with Android Bridge hooks
const androidBridgeHooks = `
  // 🤖 Android Native Bridge Hook for Input focus & Auto-Trade
  document.addEventListener('focusin', function(e) {
    if (window.AndroidBridge && window.AndroidBridge.setFocusable) {
      window.AndroidBridge.setFocusable(true);
    }
  });
  document.addEventListener('focusout', function(e) {
    if (window.AndroidBridge && window.AndroidBridge.setFocusable) {
      window.AndroidBridge.setFocusable(false);
    }
  });

  // Quotex Accessibility Auto-Trade Call
  var origExecuteTrade = window.executeTradeClick;
  window.executeTradeClick = function(dir) {
    if (window.AndroidBridge && window.AndroidBridge.executeAutoTrade) {
      window.AndroidBridge.executeAutoTrade(dir);
    }
    if (typeof origExecuteTrade === 'function') origExecuteTrade(dir);
  };

  // Close HUD hook when any dialog close button is clicked
  document.addEventListener('click', function(e) {
    setTimeout(function() {
      var openModals = document.querySelectorAll('.ishak-dialog-modal, #k-modal, #m-modal, #t-modal, #ishak-opt-modal, #maint-modal');
      var hud = document.getElementById('ishak-hud-panel');
      var hudVisible = hud && hud.style.display !== 'none';
      if (openModals.length === 0 && !hudVisible) {
        if (window.AndroidBridge && window.AndroidBridge.closeHud) {
          window.AndroidBridge.closeHud();
        }
      }
    }, 150);
  }, true);

  // Close when clicking outside any modal card (on backdrop)
  document.addEventListener('click', function(e) {
    if (e.target === document.body || e.target === document.documentElement) {
      var openModals = document.querySelectorAll('.ishak-dialog-modal, #k-modal, #m-modal, #t-modal, #ishak-opt-modal');
      for (var i = 0; i < openModals.length; i++) {
        openModals[i].remove();
      }
      if (window.AndroidBridge && window.AndroidBridge.closeHud) {
        window.AndroidBridge.closeHud();
      }
    }
  });

  // Function called by Android Native Service when the floating bubble is tapped
  window.showMainDialog = function() {
    checkMaintenanceStatus().then(function(isMaint) {
      if (isMaint) {
        if (typeof showMaintenanceModal === 'function') showMaintenanceModal();
        return;
      }
      var local = typeof getLocalLicense === 'function' ? getLocalLicense() : null;
      if (!local || !local.key) {
        if (typeof showKeyModal === 'function') {
          showKeyModal(function() {
            if (typeof showSettingsHub === 'function') showSettingsHub();
          });
        }
        return;
      }
      if (typeof showSettingsHub === 'function') {
        showSettingsHub();
      } else if (typeof showKeyModal === 'function') {
        showKeyModal();
      }
    });
  };
`;

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>Ishak AI Bot Overlay</title>
<style>
  html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    background-color: transparent !important;
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
  }
  /* In native overlay mode, the Android service provides the high-performance draggable floating bubble.
     We hide the web wrap bubble so it doesn't double-render, while all dialogs, menus, and HUD scan remain 100% identical! */
  #ishak-trade-wrap {
    display: none !important;
  }
  .ishak-dialog-modal {
    box-shadow: 0 0 50px rgba(0, 229, 255, 0.4), 0 20px 60px rgba(0, 0, 0, 0.95) !important;
  }
</style>
</head>
<body>
<script>
${androidBridgeHooks}

${jsCode}
</script>
</body>
</html>`;

const targetFile = path.resolve(process.cwd(), 'android/app/src/main/assets/bot_overlay.html');
fs.writeFileSync(targetFile, htmlContent, 'utf-8');
console.log('✅ Generated bot_overlay.html: ' + fs.statSync(targetFile).size + ' bytes');
