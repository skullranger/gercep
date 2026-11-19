# GERCEP – Geolokasi Rumah Pelanggan Cepat (prototipe v0.1)

Aplikasi HP (PWA) PLN UP3 Ciputat untuk mencari tikor pelanggan dari IDPEL secara offline.

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
3. Buka aplikasi → menu **Data** → pilih file paket `.gz` dari kantor.

## Alur update data (di kantor)
1. Export DIL ke CSV/TXT. Baris pertama harus berisi judul kolom (IDPEL, NAMA, ALAMAT, NOBANG, KETNOBANG, RT, RW, NAMA_KELURAHAN, NAMA_KECAMATAN, TARIF, DAYA, JENISLAYANAN, KOORDINAT_X, KOORDINAT_Y, KET_KDPEMBMETER, STATUS_DIL). Kolom wajib: IDPEL, KOORDINAT_X, KOORDINAT_Y.
   - Pemisah boleh Tab, titik koma, atau koma.
   - Pastikan kolom IDPEL berformat **Text**. Excel kadang mengubah IDPEL menjadi format ilmiah seperti 5,43603E+11. Baris seperti itu akan ditolak dan dihitung di ringkasan.
2. Di laptop kantor, buka aplikasi → **Data** → isi *Tanggal data* → pilih file CSV.
3. Periksa ringkasan impor (jumlah valid, duplikat, tikor kosong, luar wilayah). Ringkasan ini tidak berisi data pelanggan.
4. Klik **Unduh paket data (.gz)**. Ukurannya sekitar 10 MB untuk ±500 ribu pelanggan.
5. Bagikan file .gz ke petugas lewat jalur internal yang aman, lalu petugas mengimpornya di menu Data.

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
- File paket .gz berisi data pribadi pelanggan. Jangan diunggah ke tempat publik atau grup umum.
- Gunakan aplikasi ini setelah mendapat persetujuan atasan/TI sesuai kebijakan PLN dan UU PDP.
- Rencana tahap berikutnya: PIN aplikasi, enkripsi paket dengan password, dan data otomatis terkunci setelah kedaluwarsa.

## Belum ada di prototipe
- PIN/login dan enkripsi paket
- Update otomatis dari server kantor (saat ini lewat file)
- Laporan koreksi tikor dari lapangan
- Peta offline (navigasi memakai Google Maps)
