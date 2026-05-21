const { execSync } = require("child_process");

console.log("🛠 Valkea stabilizasyon başlıyor...");

execSync(`node scripts/valkea-check.js`, { stdio: "inherit" });

console.log("✅ Stabilizasyon kontrolü tamam.");
console.log("Not: Bu script veri silmez, sadece kontrol/build yapar.");
