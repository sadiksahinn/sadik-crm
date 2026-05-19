#!/bin/bash

echo "VALKEA UI / STABILIZATION FIX"

# PROFIL
sed -i '' 's/bg-slate-950 text-white rounded-2xl p-4 font-black/bg-gradient-to-r from-[#61aebd] to-[#e5ab53] text-white rounded-2xl p-4 font-black/g' app/profil/page.tsx

# GELIR GIDER
sed -i '' 's/bg-slate-950 text-white rounded-2xl p-4 font-black/bg-gradient-to-r from-[#61aebd] to-[#e5ab53] text-white rounded-2xl p-4 font-black/g' app/gelir-gider/page.tsx

# ASISTAN USER MESSAGE
sed -i '' 's/ml-auto bg-slate-950 text-white/ml-auto bg-gradient-to-br from-[#61aebd] to-[#e5ab53] text-white/g' app/asistan/page.tsx

# ANA SAYFA ESKI FUCHSIA TEMIZLE
sed -i '' 's/from-blue-100 via-fuchsia-100 to-orange-100/from-[#61aebd]\\/10 via-white to-[#e5ab53]\\/10/g' app/page.tsx

echo ""
echo "BUILD TEST"
npm run build

echo ""
echo "DONE"
