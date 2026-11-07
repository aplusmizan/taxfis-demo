# AplusMizan · KDV-1 Kontrol ve Luca Aktarım

Mali müşavirlik ofisi için tek sayfalık (HTML/JS) KDV-1 kontrol ve Luca gider aktarım uygulaması.
Yayındaki sürüm claude.ai üzerinde çalışır (veritabanı, dosya indirme ve fotoğraf okuma claude.ai tarafından sağlanır).
Bilgisayarda doğrudan açılan `kdv-kontrol.html` kopyası **boş açılır**; yalnızca kaynak/yedek amaçlıdır.

## Yapı
- `src/oto-core.js` — kontrol motoru (beyan, mizan/muavin, fatura listeleri, gider pusulası, Z/POS karşılaştırması)
- `src/oto-xl.js` — kontrol Excel çıktısı
- `src/oto-ui.js` — kontrol ekranı, zorunlu dosya paketi, sonraki ay GİB onayı
- `src/oto-aktar.js` — geçmiş kayıtlardan öğrenme ve öneri motoru (Node ile de çalışır)
- `src/oto-aktar-ui.js` — Aktarım sekmesi, fiş fotoğrafı okuma, Luca CSV üretimi
- `src/kdv-kontrol.shell.html` — sayfa iskeleti
- `build.py` — parçaları birleştirip `kdv-kontrol.html` üretir: `python3 build.py`

## Kural defteri (uygulamada uygulanan kurallar)
- Kontrol, dosya paketi tamamlanmadan başlamaz; **sonraki ay GİB sorgusu onayı** zorunlu.
- Önceki aya ait belge: Evrak Tarihi = belgenin tarihi, Kayıt Tarihi = işlendiği ayın ilk günü (KDVK 29/3, aynı takvim yılı).
- Binek otomobil gideri: %70 gider ve KDV indirimi, %30 KKEG; %30'a düşen KDV indirilemez, maliyete eklenir.
- 12.000 TL (2026, KDV hariç birim bedel) üstü **mal** demirbaştır; hizmet (bakım/onarım) içeriğe göre yorumlanır, gider kalacaksa gerekçe zorunlu.
- Nihai tüketiciye (11111111111) kesilmiş e-Arşiv, bilgi/avans fişleri ve mükellef adına e-Arşivin fiş kopyası aktarılmaz.
- KDV dışı vergiler (ÖİV, ÖTV, enerji fonu…) ayrı, KDV'siz gider satırı olarak aktarılır.

## Luca Hızlı Fiş "Excel Aktarım" biçimi (03.11.2026'da denenerek bulundu)
- Dosya **CSV**, ayraç `;`, kodlama **Windows-1254**, ondalık virgül, tarih `gg/aa/yyyy`.
- **36 sütun**: Luca şablonundaki 37 sütundan **PLAKA NO yok** (varsa sonraki her sütun bir sola kayar).
- İŞLEM = `Gider` (büyük harf değil); KATEGORİ ör. `Defter Fişleri`, BELGE TÜRÜ ör. `Diğer Alışlar`.
- SOYADI ÜNVAN'da özel karakter olamaz (nokta, parantez, Türkçe harf yok); uzun ünvan ADI DEVAMI'na bölünür.
- KAYIT ALT TÜRÜ Luca'nın kendi listesinden olmalı (Defter-Beyan listesiyle birebir aynı değil).
- FAALİYET KODU firmanın 6 haneli kodu (firma kartında tutulur).
