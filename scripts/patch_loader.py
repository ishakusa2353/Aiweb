import sys

def main():
    patch_file = 'scripts/new_workflow_func.js'
    with open(patch_file, 'r', encoding='utf-8') as f:
        new_func = f.read()

    extra_css = """  var extraWfCss = '#ishak-screen-sweep-laser { pointer-events: none; }' +
    '@keyframes ishakLaserSweepAcross { 0% { left: -10px; opacity: 0; } 15% { opacity: 1; } 85% { opacity: 1; } 100% { left: 100vw; opacity: 0; } }' +
    '@keyframes ishakLaserVerticalSweep { 0% { top: 5%; opacity: 0.6; } 50% { top: 90%; opacity: 1; } 100% { top: 5%; opacity: 0.6; } }' +
    '@keyframes ishakModalScaleFade { 0% { opacity: 0; transform: translate(-50%, -50%) scale(0.92); } 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); } }' +
    '@keyframes ishakModalDismiss { 0% { opacity: 1; transform: translate(-50%, -50%) scale(1); } 100% { opacity: 0; transform: translate(-50%, -50%) scale(0.85); filter: blur(6px); } }' +
    '.working-pulse { animation: ishakBotPulse 1s infinite alternate; }' +
    '@keyframes ishakBotPulse { 0% { box-shadow: 0 0 15px #00E5FF, 0 0 30px rgba(0,229,255,0.4); } 100% { box-shadow: 0 0 35px #00E5FF, 0 0 70px rgba(0,229,255,0.8); transform: scale(1.06); } }';
  var extraStyleEl = document.createElement('style');
  extraStyleEl.textContent = extraWfCss;
  document.head.appendChild(extraStyleEl);
"""

    for filename in ['public/loader.js', 'loader.js']:
        with open(filename, 'r', encoding='utf-8') as f:
            content = f.read()

        # 1. Add extra style element right after document.head.appendChild(styleTag)
        css_anchor = "document.head.appendChild(styleTag);"
        if "extraWfCss" not in content and css_anchor in content:
            content = content.replace(css_anchor, css_anchor + "\n" + extra_css)

        # 2. Replace triggerScanAndTrade block
        target_start = "function triggerScanAndTrade()"
        target_end = "// 💓 CONTINUOUS EXPIRY & MAINTENANCE HEARTBEAT"

        idx1 = content.find(target_start)
        idx2 = content.find(target_end)
        if idx1 >= 0 and idx2 >= 0:
            content = content[:idx1] + new_func + "\n\n  " + content[idx2:]
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Successfully patched {filename}")
        else:
            print(f"Failed to find indices in {filename}: idx1={idx1}, idx2={idx2}")

if __name__ == '__main__':
    main()
