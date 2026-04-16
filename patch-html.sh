#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  FLOWCHECK V3 — Direct index.html patcher
#  Run from ~/Desktop/FlowCheck:
#  chmod +x patch-html.sh && ./patch-html.sh
# ═══════════════════════════════════════════════════════════════

FILE="public/index.html"

echo "🔍 Checking file exists..."
if [ ! -f "$FILE" ]; then
  echo "❌ $FILE not found. Run from ~/Desktop/FlowCheck"
  exit 1
fi

echo "📦 Backing up..."
cp "$FILE" "${FILE}.backup"

# ── 1. Make Safe to Spend the HERO number ──
echo "💰 Upgrading Safe to Spend..."
# Change font-size from 14px to 26px and add Syne font
sed -i '' 's|id="hero-safe-spend" style="font-size:14px;font-weight:700;color:#4ade80;margin-top:2px;cursor:pointer"|id="hero-safe-spend" style="font-size:26px;font-weight:800;color:#4ade80;margin-top:2px;cursor:pointer;font-family:Syne,sans-serif;letter-spacing:-1.5px;text-shadow:0 0 20px rgba(52,211,153,.25)"|g' "$FILE"

# ── 2. Make SAFE TO SPEND label more prominent ──
echo "🏷️ Upgrading STS label..."
sed -i '' 's|font-size:9px;font-weight:700;letter-spacing:.1em;color:rgba(255,255,255,.28)">SAFE TO SPEND|font-size:9px;font-weight:800;letter-spacing:.12em;color:rgba(52,211,153,.55)">SAFE TO SPEND|g' "$FILE"

# ── 3. Add patch-v3 CSS before </head> ──
echo "🎨 Adding V3 CSS..."
if ! grep -q "patch-v3.css" "$FILE"; then
  sed -i '' 's|<link rel="stylesheet" href="/css/patch-visual.css">|<link rel="stylesheet" href="/css/patch-visual.css">\
<link rel="stylesheet" href="/css/patch-v3.css">|' "$FILE"
  echo "   ✓ patch-v3.css added"
else
  echo "   ⏭ patch-v3.css already present"
fi

# ── 4. Add patch-v3 JS after patch-delete-account ──
echo "⚡ Adding V3 JS..."
if ! grep -q "patch-v3.js" "$FILE"; then
  sed -i '' 's|<script src="/js/patch-delete-account.js"></script>|<script src="/js/patch-delete-account.js"></script>\
<script src="/js/patch-v3.js"></script>|' "$FILE"
  echo "   ✓ patch-v3.js added"
else
  echo "   ⏭ patch-v3.js already present"
fi

# ── 5. Add patch-dashboard.js (was missing!) ──
echo "📊 Adding missing patch-dashboard.js..."
if ! grep -q "patch-dashboard.js" "$FILE"; then
  sed -i '' 's|<script src="/js/app-copilot.js"></script>|<script src="/js/app-copilot.js"></script>\
<script src="/js/patch-dashboard.js"></script>|' "$FILE"
  echo "   ✓ patch-dashboard.js added"
else
  echo "   ⏭ patch-dashboard.js already present"
fi

# ── 6. Upgrade dash-greeting font ──
echo "👋 Upgrading greeting..."
sed -i '' 's|id="dash-greeting" style="font-size:22px;font-weight:800|id="dash-greeting" style="font-size:24px;font-weight:800;font-family:Syne,sans-serif;letter-spacing:-0.8px|g' "$FILE"

# ── 7. Make net worth number bigger ──
echo "📈 Upgrading net worth..."
sed -i '' 's|id="nw-n" style="font-size:|id="nw-n" style="font-family:Syne,sans-serif;letter-spacing:-2px;font-size:|g' "$FILE"

# ── 8. Verify results ──
echo ""
echo "✅ Verification:"
grep -c "patch-v3.css" "$FILE" | xargs -I{} echo "   patch-v3.css: {} reference(s)"
grep -c "patch-v3.js" "$FILE" | xargs -I{} echo "   patch-v3.js: {} reference(s)"
grep -c "patch-dashboard.js" "$FILE" | xargs -I{} echo "   patch-dashboard.js: {} reference(s)"
grep "hero-safe-spend" "$FILE" | grep -o "font-size:[^;]*" | head -1 | xargs -I{} echo "   Safe-to-spend size: {}"

echo ""
echo "🚀 Done! Now run:"
echo "   git add ."
echo "   git commit -m 'V3 direct HTML upgrades'"
echo "   git push origin main"
