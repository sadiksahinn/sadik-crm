const { execSync } = require("child_process");
const fs = require("fs");

console.log("🔎 Valkea sistem kontrolü başlıyor...\n");

const files = [
  "app/page.tsx",
  "app/asistan/page.tsx",
  "app/gelir-gider/page.tsx",
  "app/tahsilatlar/page.tsx",
  "app/bildirimler/page.tsx",
  "app/takvim/page.tsx",
  "app/musteriler/page.tsx",
  "app/profil/page.tsx",
  "app/admin/page.tsx",
  "app/api/asistan/route.ts",
];

for (const file of files) {
  console.log(fs.existsSync(file) ? `✅ ${file}` : `❌ ${file}`);
}

console.log("\n🚨 Riskli komut kontrolü:");
try {
  const risk = execSync(`grep -R "truncate table\\|drop table\\|delete from" app components 2>/dev/null || true`, { encoding: "utf8" });
  console.log(risk.trim() || "✅ Riskli veri silme komutu yok.");
} catch {}

console.log("\n🏗 Build kontrolü:");
execSync("npm run build", { stdio: "inherit" });

console.log("\n✅ Valkea kontrol tamam.");
