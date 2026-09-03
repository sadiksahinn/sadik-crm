# Valkea kullanım denetimi

## 31 Ağustos 2026 — doğrulanan kapsam

- Harcama listesi ve düzenleme penceresinde kullanıcı onaylı silme eklendi.
- Görsel/PDF mevcut kayıt sorgusu başarısızsa tekrar kontrolünü atlamaz.
- Gelir ve gider aynı tarih/tutar/isimde olsa da birbirini tekrar saymaz.
- Bilinen işyeri varsa genel işlem adı (Gider, Market alışverişi vb.) yerine işyeri kullanılır.
- Belge önizlemesinde işlem adı kullanıcı tarafından düzenlenebilir.
- `node scripts/test-document-finance.cjs`: 10 kontrol geçti.
- Üretim derlemesi geçti. Bunlar oturum açılmış uçtan uca test yerine geçmez.

## Öncelik sırasıyla kalan işler

1. Test hesabında görsel/PDF yükle → alanları düzelt → kaydet → yeniden yükle → tekrar sonucunu kontrol et.
2. Aynı gün/tutar/işyerinde iki gerçek işlem ve farklı kart senaryolarını incele; şüpheli eşleşmeyi sessizce atlamak yerine kullanıcıya sor.
3. Eksik tarih, para transferi, iade, kart borcu ve banka kredisi sınıflandırmasını doğrula; borç girişini kazanç sayma.
4. Kısmen başarısız toplu kayıtların sonucunu ayrı göster; başarılı kayıtları yeniden denemede çoğaltma.
5. Giriş, oturum yenileme, profil yüklenmesi ve bağlantı hatalarını test hesabında denetle.
6. Telefon genişliklerinde belge önizlemesi, klavye, düzenleme/silme pencereleri ve alt menü taşmalarını test et.
7. Kart, hesap, fatura ve rapor toplamlarını ortak örnek veriyle karşılaştır; transfer ve kart ödemelerinde çift sayım olmadığını doğrula.

## Canlı kullanıcı verisi sınırı

Son görsellerdeki eksik hareketler ve eski Market/Gider kaydı henüz kullanıcı hesabına erişilerek karşılaştırılmadı veya değiştirilmedi. Hesap erişimi olmadan tamamlandı olarak raporlanmayacak.
