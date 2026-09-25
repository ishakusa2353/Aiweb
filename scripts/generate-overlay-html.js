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
