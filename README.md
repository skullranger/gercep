# GERCEP – Geolokasi Rumah Pelanggan Cepat (v0.3)

Aplikasi HP (PWA) PLN UP3 Ciputat untuk mencari tikor pelanggan dari IDPEL secara offline.

## Akses & keamanan (v0.3)
- Petugas masuk dengan **kode akses** dari admin, cukup sekali per HP. Tidak perlu PIN atau email.
- Paket data berformat **.gercep** dan terenkripsi (AES-256). Paket hanya bisa dibuka di GERCEP oleh petugas yang aktif.
- Setiap aksi (cari, navigasi, salin, kirim WA, impor) dicatat ke sheet **LOG** atas nama petugas, dan dikirim saat HP online.
- Admin bisa menonaktifkan atau me-reset kode petugas dari Google Sheet. Panduan lengkapnya ada di `server/PANDUAN_SERVER.md`.

## Isi folder
| File | Fungsi |
|---|---|
| index.html | Seluruh aplikasi (tampilan + logika) |
| sw.js | Service worker, supaya aplikasi bisa dibuka tanpa internet |
| manifest.json, icon-192.png, icon-512.png | Supaya bisa di-install ke layar utama HP |

Data pelanggan TIDAK ada di folder ini. Data diimpor terpisah dan tersimpan hanya di HP masing-masing.

## Cara mencoba di laptop
1. Buka folder ini, jalankan: `python -m http.server 8000`
2. Buka `http://localhost:8000` di Chrome.

## Cara pasang di HP petugas
Aplikasi harus dibuka lewat **HTTPS** agar GPS, mode offline, dan install berfungsi.
1. Upload isi folder ini ke hosting statis HTTPS (misalnya Netlify Drop, GitHub Pages, atau server internal kantor yang sudah HTTPS).
2. Buka link-nya di **Chrome Android**, lalu pilih menu ⋮ → **Tambahkan ke layar utama / Instal aplikasi**.
3. Buka aplikasi → menu **Data** → masukkan kode akses → pilih file paket `.gercep` dari admin.

## Alur update data (di kantor)
1. Siapkan file DIL dalam format **Excel (.xlsx)** atau CSV/TXT. Harus ada baris judul kolom (baris kop di atasnya boleh) (IDPEL, NAMA, ALAMAT, NOBANG, KETNOBANG, RT, RW, NAMA_KELURAHAN, NAMA_KECAMATAN, TARIF, DAYA, JENISLAYANAN, KOORDINAT_X, KOORDINAT_Y, KET_KDPEMBMETER, STATUS_DIL). Kolom wajib: IDPEL, KOORDINAT_X, KOORDINAT_Y.
   - Pemisah boleh Tab, titik koma, atau koma.
   - Paling aman pakai .xlsx langsung (data diambil dari sheet pertama). Kalau pakai CSV, pastikan kolom IDPEL berformat **Text**, karena Excel bisa mengubahnya menjadi 5,43603E+11 (baris seperti itu ditolak dan dihitung di ringkasan).
   - Uji: file Excel 41 MB / 498.610 baris selesai diimpor ±9 detik di laptop, paket hasilnya ±9,5 MB.
2. Di laptop kantor, buka https://skullranger.github.io/gercep/ → **Data** → isi *Tanggal data* → pilih file Excel/CSV.
3. Periksa ringkasan impor (jumlah valid, duplikat, tikor kosong, luar wilayah). Ringkasan ini tidak berisi data pelanggan.
4. Klik **Unduh paket data (.gercep)**. Ukurannya sekitar 10 MB untuk ±500 ribu pelanggan.
5. Bagikan file .gercep ke petugas lewat jalur internal yang aman, lalu petugas mengimpornya di menu Data.

## Pengaturan (bagian atas script di index.html)
- `BBOX`: batas perkiraan wilayah UP3 Ciputat untuk menandai tikor "di luar wilayah". Sesuaikan dengan batas sebenarnya.
- `STALE_DAYS`: data yang lebih tua dari jumlah hari ini memunculkan peringatan (default 60).
- Setiap kali index.html diubah, naikkan `CACHE` di sw.js (mis. `gercep-app-v2`) supaya HP mengambil versi baru.

## Hasil uji (data dummy 498.610 baris, Chrome desktop)
- Ukuran paket: 10,4 MB
- Menyusun index saat aplikasi dibuka: ±0,1 detik (+ dekompresi; buka ulang total ±0,5 detik)
- Cari IDPEL 12 digit: <1 ms · 4 digit akhir: ±5 ms · nama/alamat: ±20 ms

Di HP kelas menengah, perkiraan waktunya beberapa kali lebih lambat. Ini perlu diuji langsung di HP petugas.

## Keamanan
- File paket .gercep terenkripsi, tetapi tetap bagikan hanya ke petugas terdaftar.
- Gunakan aplikasi ini setelah mendapat persetujuan atasan/TI sesuai kebijakan PLN dan UU PDP.
- Rencana tahap berikutnya: PIN aplikasi, enkripsi paket dengan password, dan data otomatis terkunci setelah kedaluwarsa.

## Belum ada di prototipe
- PIN/login dan enkripsi paket
- Update otomatis dari server kantor (saat ini lewat file)
- Laporan koreksi tikor dari lapangan
- Peta offline (navigasi memakai Google Maps)
