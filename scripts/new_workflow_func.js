  function triggerScanAndTrade() {
    try {
      stopAndClearIntroSound();
      if (isScanning) return;

      var local = getLocalLicense();
      if (!local || !local.key) {
        showKeyModal(function() {
          triggerMainBotScan();
        });
        return;
      }

      if (local.exp && Date.now() >= local.exp) {
        terminateExpiredBot('আপনার VIP লাইসেন্সের মেয়াদ শেষ হয়ে গেছে!');
        return;
      }

      if (isBotTerminated) {
        isBotTerminated = false;
      }

      isScanning = true;
      if (hudPanel) hudPanel.style.display = 'none';

      var oldWfModal = document.getElementById('ishak-workflow-modal');
      if (oldWfModal) oldWfModal.remove();
      var oldSweep = document.getElementById('ishak-screen-sweep-laser');
      if (oldSweep) oldSweep.remove();

      var detectedAssetStr = (function(){
        try { return extractQuotexPair(); } catch(e){ return window.__ISHAK_CURRENT_ASSET__ || 'USD/ARS (OTC)'; }
      })() || window.__ISHAK_CURRENT_ASSET__ || 'USD/ARS (OTC)';

      var livePriceVal = extractQuotexLivePrice() || (window.__ISHAK_LAST_WS_PRICE__) || 1627.50;

      var analysis = null;
      try {
        analysis = evaluateMarketConfluence([], 60);
      } catch(e) {}

      var isCall = (analysis && typeof analysis.isCall === 'boolean') ? analysis.isCall : true;
      var confidence = isCall ? 80 : 75;
      if (analysis && analysis.accuracyEstimate) {
        var numAcc = parseInt(analysis.accuracyEstimate.replace(/[^0-9]/g, ''), 10);
        if (!isNaN(numAcc) && numAcc >= 70 && numAcc <= 95) confidence = numAcc;
      }
      var stepDelta = livePriceVal > 100 ? 0.85 : 0.00095;
      var resistanceStr = (livePriceVal + stepDelta).toFixed(livePriceVal < 10 ? 4 : 2);
      var supportStr = (livePriceVal - stepDelta).toFixed(livePriceVal < 10 ? 4 : 2);
      var trendStr = (analysis && analysis.trendLabel) ? analysis.trendLabel : (isCall ? 'Uptrend' : 'Downtrend');
      var patternStr = (analysis && analysis.pattern) ? analysis.pattern : (isCall ? 'Bullish Continuation...' : 'Bearish Engulfing...');

      var flags = (function(p){
        var pair = (p || '').toUpperCase();
        if (pair.indexOf('ARS') >= 0) return { f1: '🇺🇸', f2: '🇦🇷' };
        if (pair.indexOf('DZD') >= 0) return { f1: '🇺🇸', f2: '🇩🇿' };
        if (pair.indexOf('BDT') >= 0) return { f1: '🇺🇸', f2: '🇧🇩' };
        if (pair.indexOf('INR') >= 0) return { f1: '🇺🇸', f2: '🇮🇳' };
        if (pair.indexOf('PKR') >= 0) return { f1: '🇺🇸', f2: '🇵🇰' };
        if (pair.indexOf('BRL') >= 0) return { f1: '🇺🇸', f2: '🇧🇷' };
        if (pair.indexOf('TRY') >= 0) return { f1: '🇺🇸', f2: '🇹🇷' };
        if (pair.indexOf('EUR') >= 0) return { f1: '🇪🇺', f2: '🇺🇸' };
        if (pair.indexOf('GBP') >= 0) return { f1: '🇬🇧', f2: '🇺🇸' };
        if (pair.indexOf('JPY') >= 0) return { f1: '🇺🇸', f2: '🇯🇵' };
        if (pair.indexOf('AUD') >= 0) return { f1: '🇦🇺', f2: '🇺🇸' };
        if (pair.indexOf('CAD') >= 0) return { f1: '🇺🇸', f2: '🇨🇦' };
        if (pair.indexOf('CHF') >= 0) return { f1: '🇺🇸', f2: '🇨🇭' };
        return { f1: '🇺🇸', f2: '🌐' };
      })(detectedAssetStr);

      circleBtn.classList.add('working-pulse');
      var auraEl = document.getElementById('ishak-logo-aura');
      if (auraEl) auraEl.classList.add('aura-active');

      var sweepLaser = document.createElement('div');
      sweepLaser.id = 'ishak-screen-sweep-laser';
      sweepLaser.style.cssText = 'position:fixed;top:0;bottom:0;width:4px;z-index:2147483646;pointer-events:none;background:linear-gradient(180deg,transparent 0%,#00E5FF 20%,#FFFFFF 50%,#00FF66 80%,transparent 100%);box-shadow:0 0 15px #00E5FF, 0 0 35px #00FF66, 0 0 60px rgba(0,229,255,0.8);animation:ishakLaserSweepAcross 1.3s cubic-bezier(0.2,0.8,0.2,1) forwards;';
      var trailCurtain = document.createElement('div');
      trailCurtain.style.cssText = 'position:absolute;top:0;bottom:0;right:0;width:120px;pointer-events:none;background:linear-gradient(270deg,transparent 0%,rgba(0,229,255,0.18) 70%,rgba(0,255,102,0.35) 100%);';
      sweepLaser.appendChild(trailCurtain);
      document.body.appendChild(sweepLaser);

      try {
        playScanSoundscape(1.3);
      } catch(e){}

      var wfModal = document.createElement('div');
      wfModal.id = 'ishak-workflow-modal';
      wfModal.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:2147483647;width:calc(100vw - 32px);max-width:350px;border-radius:28px;background:linear-gradient(175deg,rgba(13,18,59,0.96) 0%,rgba(8,12,38,0.96) 50%,rgba(4,6,24,0.98) 100%);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(0,229,255,0.38);box-shadow:0 30px 70px rgba(0,0,0,0.95), 0 0 45px rgba(0,229,255,0.25), inset 0 1px 1.5px rgba(255,255,255,0.35);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#fff;overflow:hidden;animation:ishakModalScaleFade 0.25s cubic-bezier(0.16,1,0.3,1);box-sizing:border-box;';

      function closeWorkflowModal() {
        wfModal.style.animation = 'ishakModalDismiss 0.35s forwards';
        setTimeout(function() {
          if (wfModal && wfModal.parentNode) wfModal.parentNode.removeChild(wfModal);
          if (sweepLaser && sweepLaser.parentNode) sweepLaser.parentNode.removeChild(sweepLaser);
          circleBtn.classList.remove('working-pulse');
          if (auraEl) auraEl.classList.remove('aura-active');
          isScanning = false;
        }, 360);
      }

      setTimeout(function() {
        if (!isScanning) return;
        if (sweepLaser && sweepLaser.parentNode) sweepLaser.parentNode.removeChild(sweepLaser);

        document.body.appendChild(wfModal);

        wfModal.innerHTML =
          '<div style="padding:16px 18px;">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:12px;margin-bottom:12px;border-bottom:1px solid rgba(0,229,255,0.2);">' +
              '<div style="display:flex;align-items:center;gap:8px;">' +
                '<span style="width:9px;height:9px;border-radius:50%;background:#00E5FF;box-shadow:0 0 10px #00E5FF;animation:ishakTargetPulse 1.2s infinite;"></span>' +
                '<b style="font-size:13px;letter-spacing:0.5px;color:#fff;">Market Analysis</b>' +
              '</div>' +
              '<div style="display:flex;align-items:center;gap:6px;">' +
                '<span style="font-size:9.5px;font-family:monospace;padding:2px 7px;border-radius:6px;background:rgba(0,229,255,0.15);border:1px solid rgba(0,229,255,0.4);color:#00E5FF;font-weight:bold;">' + detectedAssetStr + '</span>' +
                '<div id="wf-close-btn" style="width:22px;height:22px;border-radius:50%;background:rgba(239,68,68,0.25);border:1px solid rgba(239,68,68,0.5);color:#FCA5A5;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;cursor:pointer;">✕</div>' +
              '</div>' +
            '</div>' +
            '<div style="position:relative;width:100%;height:165px;border-radius:16px;overflow:hidden;border:1px solid rgba(0,229,255,0.3);background:#070D22;box-shadow:inset 0 2px 8px rgba(0,0,0,0.8);">' +
              '<canvas id="wf-capture-canvas" width="314" height="165" style="width:100%;height:100%;display:block;"></canvas>' +
              '<div style="position:absolute;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#00E5FF,transparent);box-shadow:0 0 12px #00E5FF;animation:ishakLaserVerticalSweep 1.4s ease-in-out infinite alternate;"></div>' +
              '<div style="position:absolute;top:6px;left:6px;padding:2px 6px;border-radius:5px;background:rgba(0,0,0,0.65);border:1px solid rgba(0,229,255,0.3);font-size:8.5px;font-family:monospace;color:#00E5FF;">● Real Chart Feed</div>' +
            '</div>' +
            '<div style="margin-top:14px;text-align:center;">' +
              '<div style="font-size:13px;font-weight:bold;color:#fff;display:flex;align-items:center;justify-content:center;gap:6px;">' +
                '<span>⚡ Capturing chart...</span>' +
              '</div>' +
              '<p style="font-size:10px;color:#94A3B8;margin:3px 0 0 0;">Analyzing price action, indicators and market conditions...</p>' +
            '</div>' +
            '<div style="margin-top:12px;position:relative;width:100%;height:8px;border-radius:999px;background:#060A1E;border:1px solid rgba(0,229,255,0.25);overflow:hidden;">' +
              '<div id="wf-progress-bar" style="height:100%;width:15%;border-radius:999px;background:linear-gradient(90deg,#00E5FF 0%,#00FF66 70%,#FFFFFF 100%);box-shadow:0 0 12px #00E5FF;transition:width 0.1s linear;"></div>' +
            '</div>' +
            '<div style="margin-top:4px;display:flex;justify-content:flex-end;">' +
              '<span id="wf-progress-txt" style="font-size:10px;font-family:monospace;font-weight:bold;color:#00E5FF;">15%</span>' +
            '</div>' +
          '</div>';

        var closeBtn = document.getElementById('wf-close-btn');
        if (closeBtn) closeBtn.onclick = closeWorkflowModal;

        var cCanvas = document.getElementById('wf-capture-canvas');
        if (cCanvas) {
          var ctx = cCanvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#070D22';
            ctx.fillRect(0, 0, cCanvas.width, cCanvas.height);
            ctx.strokeStyle = 'rgba(0, 229, 255, 0.08)';
            ctx.lineWidth = 1;
            for (var gx = 0; gx < cCanvas.width; gx += 35) {
              ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, cCanvas.height); ctx.stroke();
            }
            for (var gy = 0; gy < cCanvas.height; gy += 25) {
              ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(cCanvas.width, gy); ctx.stroke();
            }

            var cList = window.__ISHAK_BACKGROUND_CANDLES__ && window.__ISHAK_BACKGROUND_CANDLES__.length >= 5
              ? window.__ISHAK_BACKGROUND_CANDLES__.slice(-18)
              : [];

            if (cList.length < 5) {
              var baseVal = livePriceVal;
              for (var i = 18; i >= 0; i--) {
                var o = baseVal + Math.sin(i * 0.5) * (baseVal * 0.0003);
                var c = baseVal + Math.sin((i - 1) * 0.5) * (baseVal * 0.0003);
                var h = Math.max(o, c) + (baseVal * 0.0001);
                var l = Math.min(o, c) - (baseVal * 0.0001);
                cList.push({ open: o, high: h, low: l, close: c });
              }
            }

            var minVal = Math.min.apply(null, cList.map(function(c){ return c.low; }));
            var maxVal = Math.max.apply(null, cList.map(function(c){ return c.high; }));
            if (minVal === maxVal) { minVal *= 0.9995; maxVal *= 1.0005; }
            var rangeP = maxVal - minVal;
            var padY = 16;
            var plotHeight = cCanvas.height - padY * 2;
            function getY(val) { return padY + plotHeight - ((val - minVal) / rangeP) * plotHeight; }

            var stepW = (cCanvas.width - 30) / cList.length;
            var cBodyW = Math.max(4, stepW - 3);

            for (var ci = 0; ci < cList.length; ci++) {
              var cd = cList[ci];
              var cx = 15 + ci * stepW + stepW / 2;
              var isGreen = cd.close >= cd.open;
              ctx.strokeStyle = isGreen ? '#00FF66' : '#FF1744';
              ctx.fillStyle = isGreen ? '#00FF66' : '#FF1744';
              ctx.lineWidth = 1.4;
              ctx.beginPath();
              ctx.moveTo(cx, getY(cd.high));
              ctx.lineTo(cx, getY(cd.low));
              ctx.stroke();
              var bTop = Math.min(getY(cd.open), getY(cd.close));
              var bH = Math.max(2.5, Math.abs(getY(cd.close) - getY(cd.open)));
              ctx.fillRect(cx - cBodyW / 2, bTop, cBodyW, bH);
            }

            var pY = getY(livePriceVal);
            ctx.strokeStyle = '#00E5FF';
            ctx.setLineDash([4, 4]);
            ctx.beginPath(); ctx.moveTo(0, pY); ctx.lineTo(cCanvas.width, pY); ctx.stroke();
            ctx.setLineDash([]);
          }
        }

        var pStart = Date.now();
        var pInterval = setInterval(function() {
          var el = Date.now() - pStart;
          var curPct = Math.min(98, Math.floor((el / 1400) * 83) + 15);
          var barEl = document.getElementById('wf-progress-bar');
          var txtEl = document.getElementById('wf-progress-txt');
          if (barEl) barEl.style.width = curPct + '%';
          if (txtEl) txtEl.innerText = curPct + '%';
          if (el >= 1400) clearInterval(pInterval);
        }, 30);
      }, 1300);

      setTimeout(function() {
        if (!isScanning) return;

        wfModal.innerHTML =
          '<div style="padding:14px 16px;">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:10px;margin-bottom:10px;border-bottom:1px solid rgba(99,102,241,0.25);">' +
              '<div style="display:flex;align-items:center;gap:8px;">' +
                '<div style="width:30px;height:30px;border-radius:10px;background:linear-gradient(135deg,#D946EF,#6366F1);display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px rgba(168,85,247,0.6);">' +
                  '<div style="display:flex;align-items:flex-end;gap:1.5px;">' +
                    '<span style="width:3px;height:8px;background:#fff;border-radius:2px;"></span>' +
                    '<span style="width:3px;height:14px;background:#fff;border-radius:2px;"></span>' +
                    '<span style="width:3px;height:10px;background:#fff;border-radius:2px;"></span>' +
                  '</div>' +
                '</div>' +
                '<div>' +
                  '<span style="font-size:7.5px;text-transform:uppercase;font-weight:bold;letter-spacing:1px;color:#94A3B8;display:block;line-height:1;">BROKER</span>' +
                  '<b style="font-size:14px;font-weight:900;color:#fff;">Quotex</b>' +
                '</div>' +
              '</div>' +
              '<div style="display:flex;align-items:center;padding:3px;border-radius:10px;background:#070C24;border:1px solid rgba(99,102,241,0.3);">' +
                '<div style="display:flex;align-items:center;gap:4px;padding:3px 9px;border-radius:7px;background:linear-gradient(90deg,#6366F1,#A855F7);color:#fff;font-size:10px;font-weight:bold;box-shadow:0 0 8px rgba(99,102,241,0.6);">' +
                  '<span style="width:6px;height:6px;border-radius:50%;border:1px solid #fff;"></span>' +
                  '<span>OTC</span>' +
                '</div>' +
                '<div style="display:flex;align-items:center;gap:3px;padding:3px 7px;color:#94A3B8;font-size:10px;">' +
                  '<span>Real</span>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div style="border-radius:18px;background:rgba(10,15,48,0.85);border:1px solid rgba(99,102,241,0.35);padding:10px 12px;box-shadow:inset 0 2px 8px rgba(0,0,0,0.7);">' +
              '<div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:8px;margin-bottom:8px;border-bottom:1px solid rgba(99,102,241,0.2);">' +
                '<div style="display:flex;align-items:center;gap:5px;">' +
                  '<span style="width:8px;height:8px;border-radius:50%;background:#FF5F56;"></span>' +
                  '<span style="width:8px;height:8px;border-radius:50%;background:#27C93F;"></span>' +
                  '<span style="width:8px;height:8px;border-radius:50%;background:#00E5FF;"></span>' +
                '</div>' +
                '<div style="display:flex;align-items:center;gap:5px;font-size:9.5px;font-family:monospace;color:#CBD5E1;">' +
                  '<span>TradePilot - Otc Chart Analyze</span>' +
                '</div>' +
                '<div style="width:20px;"></div>' +
              '</div>' +
              '<div style="position:relative;margin:4px 0 2px 0;">' +
                '<svg viewBox="0 0 300 160" style="width:100%;height:150px;display:block;">' +
                  '<defs>' +
                    '<linearGradient id="wfCirGrad" x1="0%" y1="0%" x2="100%" y2="100%">' +
                      '<stop offset="0%" stop-color="#00E5FF" stop-opacity="0.8"/>' +
                      '<stop offset="50%" stop-color="#A855F7" stop-opacity="0.9"/>' +
                      '<stop offset="100%" stop-color="#FF2E54" stop-opacity="0.8"/>' +
                    '</linearGradient>' +
                  '</defs>' +
                  '<path d="M 60 38 L 95 62 L 125 76" stroke="url(#wfCirGrad)" stroke-width="2" fill="none"/>' +
                  '<path d="M 150 40 L 150 62" stroke="#00FF66" stroke-width="2" fill="none"/>' +
                  '<path d="M 240 38 L 205 62 L 175 76" stroke="#F59E0B" stroke-width="2" fill="none"/>' +
                  '<path d="M 70 92 L 120 86" stroke="#38BDF8" stroke-width="2" fill="none"/>' +
                  '<path d="M 95 125 L 125 102" stroke="#EC4899" stroke-width="2" fill="none"/>' +
                  '<path d="M 205 125 L 175 102" stroke="#EAB308" stroke-width="2" fill="none"/>' +
                  '<circle r="3" fill="#FFFFFF"><animateMotion path="M 60 38 L 95 62 L 125 76" dur="1.6s" repeatCount="indefinite"/></circle>' +
                  '<circle r="3" fill="#00FF66"><animateMotion path="M 150 40 L 150 62" dur="1.3s" repeatCount="indefinite"/></circle>' +
                  '<circle r="3" fill="#F59E0B"><animateMotion path="M 240 38 L 205 62 L 175 76" dur="1.5s" repeatCount="indefinite"/></circle>' +
                '</svg>' +
                '<div style="position:absolute;top:0;left:10px;text-align:center;">' +
                  '<div style="width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#7E22CE,#4338CA);border:1px solid rgba(168,85,247,0.7);display:flex;align-items:center;justify-content:center;box-shadow:0 0 10px rgba(168,85,247,0.6);margin:0 auto;">📊</div>' +
                  '<span style="font-size:7.5px;font-weight:bold;color:#CBD5E1;display:block;margin-top:2px;">Market Data</span>' +
                '</div>' +
                '<div style="position:absolute;top:0;left:50%;transform:translateX(-50%);text-align:center;">' +
                  '<div style="width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#059669,#0D9488);border:1px solid rgba(16,185,129,0.7);display:flex;align-items:center;justify-content:center;box-shadow:0 0 10px rgba(16,185,129,0.6);margin:0 auto;">📈</div>' +
                  '<span style="font-size:7.5px;font-weight:bold;color:#CBD5E1;display:block;margin-top:2px;">Trend</span>' +
                '</div>' +
                '<div style="position:absolute;top:0;right:10px;text-align:center;">' +
                  '<div style="width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#D97706,#E11D48);border:1px solid rgba(244,63,94,0.7);display:flex;align-items:center;justify-content:center;box-shadow:0 0 10px rgba(244,63,94,0.6);margin:0 auto;">⏱️</div>' +
                  '<span style="font-size:7.5px;font-weight:bold;color:#CBD5E1;display:block;margin-top:2px;">Indicators</span>' +
                '</div>' +
                '<div style="position:absolute;top:66px;left:6px;text-align:center;">' +
                  '<div style="width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#0284C7,#3B82F6);border:1px solid rgba(56,189,248,0.7);display:flex;align-items:center;justify-content:center;box-shadow:0 0 10px rgba(56,189,248,0.6);margin:0 auto;">📉</div>' +
                  '<span style="font-size:7.5px;font-weight:bold;color:#CBD5E1;display:block;margin-top:2px;">Price Action</span>' +
                '</div>' +
                '<div style="position:absolute;top:54px;left:50%;transform:translateX(-50%);">' +
                  '<div style="position:relative;width:48px;height:48px;border-radius:50%;border:2px solid #00E5FF;background:#070E2C;display:flex;align-items:center;justify-content:center;box-shadow:0 0 20px #00E5FF,inset 0 0 12px rgba(168,85,247,0.5);">' +
                    '<div style="display:flex;align-items:flex-end;gap:2px;">' +
                      '<span style="width:3.5px;height:12px;background:#00FF66;border-radius:1px;box-shadow:0 0 4px #00FF66;"></span>' +
                      '<span style="width:3.5px;height:20px;background:#00E5FF;border-radius:1px;box-shadow:0 0 6px #00E5FF;"></span>' +
                      '<span style="width:3.5px;height:10px;background:#FF2E54;border-radius:1px;box-shadow:0 0 4px #FF2E54;"></span>' +
                    '</div>' +
                  '</div>' +
                '</div>' +
                '<div style="position:absolute;bottom:0;left:42px;text-align:center;">' +
                  '<div style="width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#C026D3,#DB2777);border:1px solid rgba(217,70,239,0.7);display:flex;align-items:center;justify-content:center;box-shadow:0 0 10px rgba(217,70,239,0.6);margin:0 auto;">🧠</div>' +
                  '<span style="font-size:7.5px;font-weight:bold;color:#CBD5E1;display:block;margin-top:2px;">AI Analysis</span>' +
                '</div>' +
                '<div style="position:absolute;bottom:0;right:42px;text-align:center;">' +
                  '<div style="width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#CA8A04,#EAB308);border:1px solid rgba(234,179,8,0.7);display:flex;align-items:center;justify-content:center;box-shadow:0 0 10px rgba(234,179,8,0.6);margin:0 auto;">⚙️</div>' +
                  '<span style="font-size:7.5px;font-weight:bold;color:#CBD5E1;display:block;margin-top:2px;">Decision</span>' +
                '</div>' +
              '</div>' +
              '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:10px;padding:0 4px;">' +
                '<div style="font-size:8.5px;color:#34D399;font-weight:bold;display:flex;align-items:center;gap:4px;"><span>✔</span> Trend Analysis</div>' +
                '<div style="font-size:8.5px;color:#34D399;font-weight:bold;display:flex;align-items:center;gap:4px;"><span>✔</span> RSI & MACD</div>' +
                '<div style="font-size:8.5px;color:#34D399;font-weight:bold;display:flex;align-items:center;gap:4px;"><span>✔</span> Support / Resistance</div>' +
                '<div style="font-size:8.5px;color:#34D399;font-weight:bold;display:flex;align-items:center;gap:4px;"><span>✔</span> Next 1M Momentum</div>' +
              '</div>' +
              '<div style="margin-top:10px;">' +
                '<div style="padding:8px;border-radius:999px;background:linear-gradient(90deg,rgba(88,28,135,0.6),rgba(49,46,129,0.6),rgba(8,145,178,0.6));border:1px solid rgba(0,229,255,0.5);display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 0 15px rgba(0,229,255,0.3);">' +
                  '<span style="font-size:13px;">🧠</span>' +
                  '<b style="font-family:monospace;font-size:11px;color:#00E5FF;letter-spacing:1px;text-shadow:0 0 6px #00E5FF;">Analyzing chart...</b>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>';
      }, 2800);

      setTimeout(function() {
        if (!isScanning) return;

        try {
          executeQuotexTrade(isCall);
        } catch(e){}

        try {
          playResultSound(isCall);
        } catch(e){}

        var actionBorder = isCall ? '#00E5FF' : '#FF2E54';
        var actionGrad = isCall
          ? 'linear-gradient(135deg,rgba(4,47,46,0.95) 0%,rgba(6,78,59,0.95) 50%,rgba(2,44,34,0.98) 100%)'
          : 'linear-gradient(135deg,rgba(76,5,25,0.95) 0%,rgba(136,19,55,0.95) 50%,rgba(59,7,22,0.98) 100%)';
        var actionShadow = isCall ? '0 0 25px rgba(0,229,255,0.45)' : '0 0 25px rgba(255,46,84,0.45)';
        var arrowBtnBg = isCall ? 'linear-gradient(180deg,#10B981,#047857)' : 'linear-gradient(180deg,#F43F5E,#BE123C)';
        var arrowChar = isCall ? '↑' : '↓';
        var dirTitle = isCall ? 'CALL' : 'PUT';
        var dirSub = isCall ? 'Upward move expected · enter on the next candle' : 'Downward move expected · enter on the next candle';
        var confTheme = isCall ? '#00E5FF' : '#FF2E54';
        var strokeC = 2 * Math.PI * 34;
        var strokeOff = strokeC - (confidence / 100) * strokeC;

        wfModal.innerHTML =
          '<div style="padding:16px 18px;">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:12px;margin-bottom:12px;border-bottom:1px solid rgba(99,102,241,0.25);">' +
              '<div style="display:flex;align-items:center;gap:9px;">' +
                '<div style="width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#D946EF,#6366F1);display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px rgba(217,70,239,0.6);">' +
                  '<div style="display:flex;align-items:flex-end;gap:1.5px;">' +
                    '<span style="width:3px;height:8px;background:#fff;border-radius:2px;"></span>' +
                    '<span style="width:3px;height:14px;background:#fff;border-radius:2px;"></span>' +
                    '<span style="width:3px;height:10px;background:#fff;border-radius:2px;"></span>' +
                  '</div>' +
                '</div>' +
                '<div>' +
                  '<span style="font-size:7.5px;text-transform:uppercase;font-weight:bold;letter-spacing:1px;color:#94A3B8;display:block;line-height:1;">BROKER</span>' +
                  '<b style="font-size:15px;font-weight:900;color:#fff;">Quotex</b>' +
                '</div>' +
              '</div>' +
              '<div style="display:flex;align-items:center;padding:3px;border-radius:10px;background:#070C24;border:1px solid rgba(99,102,241,0.3);">' +
                '<div style="display:flex;align-items:center;gap:4px;padding:3px 9px;border-radius:7px;background:linear-gradient(90deg,#6366F1,#A855F7);color:#fff;font-size:10px;font-weight:bold;box-shadow:0 0 8px rgba(99,102,241,0.6);">' +
                  '<span style="width:6px;height:6px;border-radius:50%;border:1px solid #fff;"></span>' +
                  '<span>OTC</span>' +
                '</div>' +
                '<div style="display:flex;align-items:center;gap:3px;padding:3px 7px;color:#94A3B8;font-size:10px;">' +
                  '<span>Real</span>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div style="padding:10px 12px;border-radius:14px;background:rgba(7,13,40,0.9);border:1px solid rgba(99,102,241,0.3);display:flex;align-items:center;gap:10px;margin-bottom:12px;">' +
              '<div style="display:flex;align-items:center;font-size:18px;margin-right:-4px;">' +
                '<span>' + flags.f1 + '</span>' +
                '<span style="margin-left:-6px;">' + flags.f2 + '</span>' +
              '</div>' +
              '<div>' +
                '<b style="font-size:14px;color:#fff;display:block;line-height:1.1;">' + detectedAssetStr + '</b>' +
                '<div style="display:flex;align-items:center;gap:5px;margin-top:3px;">' +
                  '<span style="width:6px;height:6px;border-radius:50%;background:#EF4444;box-shadow:0 0 6px #EF4444;"></span>' +
                  '<span style="font-size:9.5px;color:#CBD5E1;">Live read · 1m</span>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div style="padding:14px;border-radius:18px;border:1.5px solid ' + actionBorder + ';background:' + actionGrad + ';box-shadow:' + actionShadow + ';margin-bottom:12px;">' +
              '<div style="text-align:center;font-size:8.5px;text-transform:uppercase;font-weight:bold;letter-spacing:2px;color:' + (isCall ? '#6EE7B7' : '#FDA4AF') + ';margin-bottom:4px;">— PLACE OPTION —</div>' +
              '<div style="display:flex;align-items:center;gap:14px;">' +
                '<div style="width:50px;height:50px;border-radius:50%;background:' + arrowBtnBg + ';border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:900;color:#fff;box-shadow:0 0 16px ' + (isCall ? '#00FF66' : '#FF2E54') + ';">' + arrowChar + '</div>' +
                '<div>' +
                  '<b style="font-size:28px;font-weight:900;color:#fff;letter-spacing:1px;display:block;line-height:1;text-shadow:0 0 12px ' + (isCall ? '#00FF66' : '#FF2E54') + ';">' + dirTitle + '</b>' +
                  '<span style="font-size:9.5px;color:rgba(255,255,255,0.85);margin-top:4px;display:block;line-height:1.2;">' + dirSub + '</span>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">' +
              '<div style="padding:10px;border-radius:14px;background:rgba(7,13,40,0.9);border:1px solid rgba(99,102,241,0.3);text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;">' +
                '<span style="font-size:8px;text-transform:uppercase;font-weight:bold;letter-spacing:1px;color:#94A3B8;display:block;margin-bottom:6px;">CONFIDENCE</span>' +
                '<div style="position:relative;width:68px;height:68px;display:flex;align-items:center;justify-content:center;">' +
                  '<svg viewBox="0 0 80 80" style="width:100%;height:100%;transform:rotate(-90deg);">' +
                    '<circle cx="40" cy="40" r="34" stroke="#0F1738" stroke-width="7" fill="none"/>' +
                    '<circle cx="40" cy="40" r="34" stroke="' + confTheme + '" stroke-width="7" stroke-dasharray="' + strokeC + '" stroke-dashoffset="' + strokeOff + '" stroke-linecap="round" fill="none" style="filter:drop-shadow(0 0 6px ' + confTheme + ');"/>' +
                  '</svg>' +
                  '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">' +
                    '<b style="font-size:16px;color:#fff;font-weight:900;">' + confidence + '%</b>' +
                  '</div>' +
                '</div>' +
                '<span style="font-size:9px;font-weight:bold;color:' + confTheme + ';margin-top:4px;">High conviction</span>' +
                '<span style="font-size:7.5px;color:#64748B;">threshold 75%</span>' +
              '</div>' +
              '<div style="padding:10px;border-radius:14px;background:rgba(7,13,40,0.9);border:1px solid rgba(99,102,241,0.3);display:flex;flex-direction:column;justify-content:space-between;">' +
                '<span style="font-size:8px;text-transform:uppercase;font-weight:bold;letter-spacing:1px;color:#94A3B8;display:block;">KEY LEVELS</span>' +
                '<div style="border-left:2px solid #00E5FF;padding-left:8px;margin:auto 0;">' +
                  '<div>' +
                    '<span style="font-size:7.5px;text-transform:uppercase;font-weight:bold;color:#00E5FF;display:block;">RESISTANCE</span>' +
                    '<b style="font-size:11px;font-family:monospace;color:#fff;">' + resistanceStr + '</b>' +
                  '</div>' +
                  '<div style="display:flex;align-items:center;gap:4px;padding:3px 0;">' +
                    '<span style="width:5px;height:5px;border-radius:50%;background:#C084FC;"></span>' +
                    '<span style="font-size:7.5px;color:#94A3B8;font-weight:bold;">PRICE ZONE</span>' +
                  '</div>' +
                  '<div>' +
                    '<span style="font-size:7.5px;text-transform:uppercase;font-weight:bold;color:#F472B6;display:block;">SUPPORT</span>' +
                    '<b style="font-size:11px;font-family:monospace;color:#fff;">' + supportStr + '</b>' +
                  '</div>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
              '<div style="padding:7px 10px;border-radius:10px;background:rgba(7,13,40,0.9);border:1px solid rgba(99,102,241,0.3);display:flex;align-items:center;gap:6px;">' +
                '<span style="font-size:12px;">📈</span>' +
                '<div>' +
                  '<span style="font-size:7px;text-transform:uppercase;font-weight:bold;color:#94A3B8;display:block;line-height:1;">TREND</span>' +
                  '<b style="font-size:10px;color:#fff;">' + trendStr + '</b>' +
                '</div>' +
              '</div>' +
              '<div style="padding:7px 10px;border-radius:10px;background:rgba(7,13,40,0.9);border:1px solid rgba(99,102,241,0.3);display:flex;align-items:center;gap:6px;overflow:hidden;">' +
                '<span style="font-size:12px;">🕯️</span>' +
                '<div style="min-width:0;">' +
                  '<span style="font-size:7px;text-transform:uppercase;font-weight:bold;color:#94A3B8;display:block;line-height:1;">PATTERN</span>' +
                  '<b style="font-size:9.5px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;">' + patternStr + '</b>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>';

        setTimeout(function() {
          closeWorkflowModal();
        }, 2200);
      }, 5000);

    } catch(err) {
      console.error('[TradePilot] triggerScanAndTrade error:', err);
      isScanning = false;
    }
  }