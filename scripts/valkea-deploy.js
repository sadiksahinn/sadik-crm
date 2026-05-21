const { execSync } = require("child_process");

const msg = process.argv.slice(2).join(" ") || "Valkea auto deploy";

console.log("🏗 Build alınıyor...");
execSync("npm run build", { stdio: "inherit" });

console.log("📦 Git hazırlanıyor...");
execSync("git add .", { stdio: "inherit" });

try {
  execSync(`git commit -m "${msg.replace(/"/g, "'")}"`, { stdio: "inherit" });
} catch {
  console.log("ℹ️ Commitlenecek değişiklik yok.");
}

console.log("🚀 Push yapılıyor...");
execSync("git push", { stdio: "inherit" });

console.log("✅ Deploy push tamam.");
