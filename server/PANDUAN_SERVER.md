# Panduan Server GERCEP v0.4 (Kode Akses, Sinkron Data Otomatis, Log Akses)

Server GERCEP memakai **Google Sheet + Apps Script**. Server ini **tidak menyimpan data pelanggan**. Isinya hanya daftar petugas, kunci paket, sesi HP, dan log akses.

## A. Pasang server (sekali saja, ±15 menit)

1. Login ke akun Google admin, lalu buat **Google Sheet baru** bernama `GERCEP Admin`. **Jangan bagikan** Sheet ini ke siapa pun.
2. Di Sheet, buka menu **Extensions → Apps Script**. Hapus isi `Code.gs`, tempel seluruh isi file `Code.gs` dari folder ini, lalu klik **Save** 💾.
3. Kembali ke tab Sheet, lalu **refresh** halaman. Menu **GERCEP** akan muncul di bagian atas.
4. Klik **GERCEP → 1. Siapkan sheet**. Google akan meminta izin: pilih **Review permissions → pilih akun → Advanced → Go to … (unsafe) → Allow**. Peringatan ini muncul karena script dibuat sendiri, bukan dari toko aplikasi Google.
5. Pasang sebagai Web App:
   - Di Apps Script, klik **Deploy → New deployment**, lalu ikon ⚙️ → **Web app**.
   - Isi *Execute as*: **Me**, *Who has access*: **Anyone**, lalu klik **Deploy**.
   - Salin **Web app URL** (berakhiran `/exec`), lalu kirim ke Claude atau isi sendiri di `index.html` pada baris `const API_URL = '…'`.

> *Anyone* artinya alamat server bisa dihubungi aplikasi GERCEP dari HP mana pun, tetapi **tanpa kode akses yang valid, server tidak memberi apa-apa**.

## B. Daftarkan petugas

1. Buka sheet **PETUGAS**. Ganti baris `ADMIN GERCEP` dengan nama Bapak (PERAN tetap **ADMIN**).
2. Tambahkan petugas, satu orang per baris: isi **NAMA** dan **KETERANGAN** (vendor / no. HP). Kolom lain bisa dikosongkan.
3. Klik **GERCEP → 2. Buat kode akses**. Setiap petugas mendapat **ID** (P001, P002, …) dan **KODE_AKSES** (contoh `GRC-7K4P-2QX9`).
4. Kirim kode ke masing-masing petugas lewat **WA pribadi**, jangan lewat grup.

| Kolom | Isi |
|---|---|
| PERAN | `ADMIN` (bisa impor Excel & membuat paket) atau `PETUGAS` |
| STATUS | `AKTIF` / `NONAKTIF` |
| BERLAKU_SD | Opsional. Tanggal akhir akses (mis. akhir kontrak vendor) |
| KODE_DIPAKAI | Terisi otomatis: HP yang memakai kode + waktunya |

## C. Alur bulanan (update data)

1. **Admin** buka GERCEP di laptop → menu **Data** → pilih Excel DIL → klik **📤 Terbitkan ke petugas**.
2. Selesai. **HP petugas mengunduh data baru secara otomatis** saat GERCEP dibuka dengan internet (±13 MB per update). Petugas baru juga langsung mendapat data setelah memasukkan kode akses.

Paket tersimpan terenkripsi di folder Drive **GERCEP Paket (jangan dibagikan)**, satu folder dengan Sheet ini. Riwayat terbitan tercatat di sheet **PAKET**. Hanya versi terbaru dan satu versi sebelumnya yang disimpan; versi yang lebih lama dihapus otomatis.

> Cadangan manual tetap tersedia: admin bisa mengunduh file `.gercep`, dan petugas bisa memilihnya di menu Data.

## D. Pengelolaan sehari-hari

| Kebutuhan | Caranya |
|---|---|
| Petugas berhenti / pindah | Ubah STATUS jadi `NONAKTIF`. Data di HP-nya otomatis terhapus saat HP itu online lagi |
| Petugas ganti HP / kode bocor | Centang kolom **RESET** pada petugas tersebut → **GERCEP → 3. Reset kode petugas yang dicentang** → OK, lalu kirim kode baru |
| Melihat siapa mengakses apa | Buka sheet **LOG** → gunakan filter pada kolom NAMA, AKSI, atau IDPEL |
| Log makin banyak | Sekali saja: **GERCEP → Aktifkan arsip LOG otomatis (bulanan)**. Setiap tanggal 1, log bulan lalu dipindah ke file `GERCEP LOG yyyy-mm` di folder Drive yang sama |
| File paket bocor ke luar | **GERCEP → Buat kunci data baru**, lalu buat ulang & bagikan paket. Untuk mematikan paket lama, ubah STATUS kunci lama jadi `NONAKTIF` di sheet KUNCI (tersembunyi: klik kanan tab sheet → Unhide) |

**Arti kolom AKSI di LOG:** AKTIVASI (kode pertama kali dipakai), BUKA (aplikasi dibuka), CARI, NAVIGASI, PETA, SALIN, SALIN_IDPEL, KIRIM_WA, SEKITAR, DAFTAR, RUTE, SELESAI, IMPOR_PAKET, IMPOR_DIL, EKSPOR_PAKET, TERBITKAN_DATA, UNDUH_DATA, HAPUS_DATA, KELUAR, KODE_SALAH, KODE_DITOLAK (kode dicoba di HP lain), AKSES_DICABUT, RESET_KODE.

Log dari HP yang sedang offline dikirim otomatis saat HP kembali online. Karena itu WAKTU_HP (waktu kejadian) bisa lebih awal dari WAKTU_SERVER (waktu diterima).

## E. Catatan

- **Mengubah Code.gs di kemudian hari:** buka **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**. URL tetap sama.
- **Kuota email/server Apps Script** gratis untuk akun Google biasa. GERCEP tidak mengirim email, sehingga kuota yang terpakai hanya permintaan login dan log.
- **Batas keamanan:** enkripsi melindungi file paket yang beredar. Di HP yang sudah aktif, data bisa dibuka oleh pemegang HP tersebut. Karena itu, pastikan HP petugas memakai **kunci layar**, dan segera nonaktifkan atau reset kode bila HP hilang.
