#!/bin/bash

echo "=============================="
echo "VALKEA AI ROUTE KONTROL"
echo "=============================="

echo ""
echo "1) AI intent tipleri:"
grep -n "type.*job\|collection_query\|collection_paid\|daily_summary\|task_completed\|expense\|income" app/api/asistan/route.ts || true

echo ""
echo "2) Gelir insert noktalari:"
grep -n -A12 -B4 'from("income")' app/api/asistan/route.ts app/api/asistan/odeme/route.ts app/tahsilatlar/page.tsx app/bildirimler/page.tsx || true

echo ""
echo "3) Gider insert noktalari:"
grep -n -A12 -B4 'from("expenses")' app/api/asistan/route.ts app/gelir-gider/page.tsx || true

echo ""
echo "4) Tahsilat duplicate koruma:"
grep -R "income_created\|income_id" app/api/asistan app/tahsilatlar app/bildirimler 2>/dev/null || true

echo ""
echo "5) Build:"
npm run build

echo ""
echo "AI KONTROL BITTI"
