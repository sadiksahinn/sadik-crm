#!/bin/bash

echo "=============================="
echo "VALKEA STABILIZASYON KONTROL"
echo "=============================="
echo ""

echo "1) Git durumu:"
git status --short
echo ""

echo "2) Son commit:"
git log --oneline -1
echo ""

echo "3) Kritik route dosyalari:"
for file in \
  app/page.tsx \
  app/asistan/page.tsx \
  app/gelir-gider/page.tsx \
  app/tahsilatlar/page.tsx \
  app/bildirimler/page.tsx \
  app/takvim/page.tsx \
  app/musteriler/page.tsx \
  app/profil/page.tsx \
  app/admin/page.tsx \
  app/api/asistan/route.ts
do
  if [ -f "$file" ]; then
    echo "OK  - $file"
  else
    echo "YOK - $file"
  fi
done
echo ""

echo "4) Riskli kelime taramasi:"
grep -R "truncate table\|drop table\|delete from" app components 2>/dev/null || echo "Riskli veri silme komutu bulunmadi."
echo ""

echo "5) Eski renk / koyu tema kalintilari:"
grep -R "fuchsia\|purple\|bg-black\|bg-slate-950\|prefers-color-scheme" app components 2>/dev/null || echo "Belirgin eski tema kalintisi bulunmadi."
echo ""

echo "6) user_id kullanimi kontrol:"
grep -R "from(\"income\")\|from(\"expenses\")\|from(\"payment_tracking\")\|from(\"customers\")" app 2>/dev/null
echo ""

echo "7) OpenAI env kontrol:"
if grep -q "OPENAI_API_KEY" .env.local 2>/dev/null; then
  echo "OK - OPENAI_API_KEY localde var"
else
  echo "UYARI - .env.local icinde OPENAI_API_KEY yok"
fi
echo ""

echo "8) Build testi basliyor..."
npm run build

echo ""
echo "=============================="
echo "KONTROL BITTI"
echo "=============================="
