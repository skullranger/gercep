/**
 * GERCEP – Server kode akses & log akses (Google Apps Script)
 * Dipasang di Google Sheet "GERCEP Admin": Extensions → Apps Script → tempel seluruh isi file ini.
 * Server ini TIDAK menyimpan data pelanggan. Isinya hanya daftar petugas, kunci paket, sesi, dan log akses.
 */
const CFG = {
  AKSES_HARI: 30,      // akses offline berlaku sekian hari sejak terakhir online
  MAKS_GAGAL_JAM: 10   // batas salah kode per HP per jam
};
const SH = {
  PETUGAS: ['ID', 'NAMA', 'KETERANGAN', 'PERAN', 'STATUS', 'BERLAKU_SD', 'KODE_AKSES', 'KODE_DIPAKAI'],
  LOG:     ['WAKTU_SERVER', 'WAKTU_HP', 'ID', 'NAMA', 'DEVICE_ID', 'AKSI', 'IDPEL', 'DETAIL'],
  SESI:    ['TOKEN_HASH', 'ID', 'DEVICE_ID', 'PERANGKAT', 'DIBUAT', 'TERAKHIR', 'STATUS'],
  KUNCI:   ['VERSI', 'KUNCI', 'DIBUAT', 'STATUS']
};
const P = { ID: 0, NAMA: 1, KET: 2, PERAN: 3, STATUS: 4, BERLAKU: 5, KODE: 6, DIPAKAI: 7 }; // kolom PETUGAS (0-based)

/* ===== Menu di Google Sheet ===== */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('GERCEP')
    .addItem('1. Siapkan sheet', 'setup')
    .addItem('2. Buat kode akses (petugas yang belum punya)', 'buatKodeAkses')
    .addItem('3. Reset kode petugas di baris terpilih', 'resetKode')
    .addSeparator()
    .addItem('Buat kunci data baru', 'menuBuatKunci')
    .addToUi();
}

function setup() {
  const ss = SpreadsheetApp.getActive();
  Object.keys(SH).forEach(function (n) {
    let s = ss.getSheetByName(n);
    if (!s) s = ss.insertSheet(n);
    if (s.getLastRow() === 0) {
      s.appendRow(SH[n]);
      s.setFrozenRows(1);
      s.getRange(1, 1, 1, SH[n].length).setFontWeight('bold').setBackground('#1f2a36').setFontColor('#ffd200');
    }
  });
  const p = ss.getSheetByName('PETUGAS');
  p.getRange('F:F').setNumberFormat('dd/mm/yyyy');
  if (p.getLastRow() === 1) p.appendRow(['', 'ADMIN GERCEP', 'Ganti dengan nama admin', 'ADMIN', 'AKTIF', '', '', '']);
  ss.getSheetByName('LOG').getRange('G:G').setNumberFormat('@');
  if (ss.getSheetByName('KUNCI').getLastRow() === 1) buatKunci_();
  ['SESI', 'KUNCI'].forEach(function (n) { ss.getSheetByName(n).hideSheet(); });
  const def = ss.getSheetByName('Sheet1') || ss.getSheetByName('Sheet 1');
  if (def && def.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(def);
  SpreadsheetApp.getUi().alert('Sheet GERCEP siap.\n\nIsi sheet PETUGAS: NAMA, KETERANGAN (vendor/no. HP), PERAN (ADMIN/PETUGAS), STATUS (AKTIF/NONAKTIF).\nLalu klik menu GERCEP → 2. Buat kode akses.');
}

function buatKodeAkses() {
  const s = sh_('PETUGAS'), v = s.getDataRange().getValues();
  let n = 0, maxId = 0;
  v.slice(1).forEach(function (r) { const m = /^P(\d+)$/.exec(String(r[P.ID])); if (m) maxId = Math.max(maxId, +m[1]); });
  for (let i = 1; i < v.length; i++) {
    const r = v[i];
    if (!String(r[P.NAMA]).trim()) continue;
    if (!String(r[P.ID]).trim()) { maxId++; s.getRange(i + 1, P.ID + 1).setValue('P' + String(maxId).padStart(3, '0')); }
    if (!String(r[P.PERAN]).trim()) s.getRange(i + 1, P.PERAN + 1).setValue('PETUGAS');
    if (!String(r[P.STATUS]).trim()) s.getRange(i + 1, P.STATUS + 1).setValue('AKTIF');
    if (!String(r[P.KODE]).trim()) { s.getRange(i + 1, P.KODE + 1).setValue(kodeBaru_()); s.getRange(i + 1, P.DIPAKAI + 1).setValue(''); n++; }
  }
  ui_('Kode akses dibuat untuk ' + n + ' petugas.\n\nKirim kode ke masing-masing petugas lewat WA pribadi. Satu kode hanya bisa dipakai di satu HP.');
}

function resetKode() {
  const s = SpreadsheetApp.getActiveSheet();
  if (s.getName() !== 'PETUGAS') return ui_('Buka sheet PETUGAS lalu klik baris petugas yang ingin di-reset.');
  const row = s.getActiveRange().getRow();
  if (row < 2) return ui_('Pilih baris petugas (bukan judul).');
  const id = String(s.getRange(row, P.ID + 1).getValue()), nama = String(s.getRange(row, P.NAMA + 1).getValue());
  s.getRange(row, P.KODE + 1).setValue(kodeBaru_());
  s.getRange(row, P.DIPAKAI + 1).setValue('');
  cabutSesi_(id);
  catat_(id, nama, '', 'RESET_KODE', '', 'oleh admin', '');
  ui_('Kode baru untuk ' + nama + ' sudah dibuat. HP lama otomatis keluar saat online berikutnya.');
}

function menuBuatKunci() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.alert('Buat kunci data baru?',
    'Paket data berikutnya akan memakai kunci baru. Paket lama tetap bisa dibuka selama kuncinya masih AKTIF.\n\n' +
    'Untuk mematikan paket lama (misalnya ada yang bocor), ubah STATUS kunci lama menjadi NONAKTIF di sheet KUNCI (tersembunyi).',
    ui.ButtonSet.OK_CANCEL);
  if (r !== ui.Button.OK) return;
  const ver = buatKunci_();
  ui.alert('Kunci versi ' + ver + ' dibuat.\n\nDi GERCEP (akun ADMIN): Data → Sinkron sekarang → impor ulang Excel DIL → unduh paket baru.');
}

/* ===== Endpoint ===== */
function doGet() { return out_({ ok: true, app: 'GERCEP', waktu: new Date() }); }

function doPost(e) {
  let q;
  try { q = JSON.parse(e.postData.contents); } catch (err) { return out_({ ok: false, msg: 'Permintaan tidak valid.' }); }
  const lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (err) { return out_({ ok: false, msg: 'Server sibuk, coba lagi.' }); }
  try {
    switch (q.action) {
      case 'activate': return out_(activate_(q));
      case 'refresh':  return out_(refresh_(q));
      case 'log':      return out_(terimaLog_(q));
      case 'logout':   return out_(logout_(q));
      default:         return out_({ ok: false, msg: 'Aksi tidak dikenal.' });
    }
  } catch (err) {
    return out_({ ok: false, msg: 'Server error: ' + err.message });
  } finally {
    lock.releaseLock();
  }
}

/* ===== Aktivasi dengan kode akses ===== */
function activate_(q) {
  const dev = String(q.deviceId || '').slice(0, 60);
  if (!dev) return { ok: false, msg: 'Perangkat tidak dikenali.' };
  const cache = CacheService.getScriptCache(), ck = 'gagal_' + dev;
  const gagal = Number(cache.get(ck) || 0);
  if (gagal >= CFG.MAKS_GAGAL_JAM) return { ok: false, msg: 'Terlalu banyak kode salah. Coba lagi 1 jam lagi.' };
  const kode = normKode_(q.code);
  const s = sh_('PETUGAS'), v = s.getDataRange().getValues();
  let idx = -1;
  if (kode.length >= 8) for (let i = 1; i < v.length; i++) if (normKode_(v[i][P.KODE]) === kode) { idx = i; break; }
  if (idx < 0) {
    cache.put(ck, String(gagal + 1), 3600);
    catat_('', '', dev, 'KODE_SALAH', '', '', '');
    return { ok: false, msg: 'Kode akses salah. Periksa kembali kode dari admin.' };
  }
  const u = petugasDariBaris_(v[idx]);
  if (!aktif_(u)) return { ok: false, msg: 'Akses ' + u.nama + ' tidak aktif. Hubungi admin GERCEP.' };
  const dipakai = String(v[idx][P.DIPAKAI] || '');
  if (dipakai && dipakai.split(' ')[0] !== dev) {
    catat_(u.id, u.nama, dev, 'KODE_DITOLAK', '', 'kode sudah dipakai di HP lain', '');
    return { ok: false, msg: 'Kode ini sudah dipakai di HP lain. Minta admin untuk reset kode.' };
  }
  s.getRange(idx + 1, P.DIPAKAI + 1).setValue(dev + ' · ' + Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy HH:mm'));
  const token = Utilities.getUuid() + Utilities.getUuid();
  const perangkat = aman_(String(q.perangkat || '').slice(0, 200));
  sh_('SESI').appendRow([hash_(token), u.id, aman_(dev), perangkat, new Date(), new Date(), 'AKTIF']);
  catat_(u.id, u.nama, dev, 'AKTIVASI', '', perangkat, '');
  return paketSesi_(u, token);
}

function refresh_(q) {
  const se = cariSesi_(q.token);
  if (!se || se.status !== 'AKTIF') return { ok: false, revoked: true, msg: 'Akses di HP ini sudah tidak berlaku. Masukkan kode akses baru dari admin.' };
  const u = cariPetugas_(se.id);
  if (!aktif_(u)) {
    sh_('SESI').getRange(se.row, 7).setValue('DICABUT');
    catat_(se.id, u ? u.nama : '', se.dev, 'AKSES_DICABUT', '', '', '');
    return { ok: false, revoked: true, msg: 'Akses Anda sudah dinonaktifkan admin.' };
  }
  sh_('SESI').getRange(se.row, 6).setValue(new Date());
  return paketSesi_(u, q.token);
}

function logout_(q) {
  const se = cariSesi_(q.token);
  if (se) {
    sh_('SESI').getRange(se.row, 7).setValue('KELUAR');
    const u = cariPetugas_(se.id);
    catat_(se.id, u ? u.nama : '', se.dev, 'KELUAR', '', '', '');
  }
  return { ok: true };
}

/* ===== Log akses ===== */
function terimaLog_(q) {
  const se = cariSesi_(q.token);
  if (!se) return { ok: false, revoked: true, msg: 'Akses di HP ini sudah tidak berlaku.' };
  const u = cariPetugas_(se.id), nama = u ? u.nama : '';
  const ev = (Array.isArray(q.events) ? q.events : []).slice(0, 500);
  if (ev.length) {
    const now = new Date();
    const data = ev.map(function (x) {
      const id = String(x.i || '').replace(/\D/g, '').slice(0, 12);
      return [now, aman_(String(x.t || '').slice(0, 30)), se.id, nama, aman_(se.dev),
              aman_(String(x.a || '').slice(0, 30)), id ? "'" + id : '', aman_(String(x.d || '').slice(0, 300))];
    });
    const s = sh_('LOG');
    s.getRange(s.getLastRow() + 1, 1, data.length, data[0].length).setValues(data);
  }
  const masihAktif = se.status === 'AKTIF' && aktif_(u);
  return masihAktif ? { ok: true, n: ev.length } : { ok: true, n: ev.length, revoked: true, msg: 'Akses Anda sudah dinonaktifkan admin.' };
}

/* ===== Pembantu ===== */
function paketSesi_(u, token) {
  let end = new Date(Date.now() + CFG.AKSES_HARI * 86400000);
  if (u.berlaku) { const b = new Date(u.berlaku); b.setHours(23, 59, 59); if (b < end) end = b; }
  const keys = rows_('KUNCI')
    .filter(function (r) { return String(r[3]).toUpperCase() === 'AKTIF' && r[1]; })
    .map(function (r) { return { ver: Number(r[0]), key: String(r[1]) }; });
  return { ok: true, token: token, id: u.id, nama: u.nama, peran: u.peran, berlakuSd: end.toISOString(), keys: keys };
}
function petugasDariBaris_(r) {
  return { id: String(r[P.ID]).trim(), nama: String(r[P.NAMA] || '').trim(), peran: String(r[P.PERAN] || 'PETUGAS').trim().toUpperCase(),
           status: String(r[P.STATUS] || '').trim().toUpperCase(), berlaku: r[P.BERLAKU] instanceof Date ? r[P.BERLAKU] : null };
}
function cariPetugas_(id) {
  const v = rows_('PETUGAS');
  for (let i = 0; i < v.length; i++) if (String(v[i][P.ID]).trim() === id) return petugasDariBaris_(v[i]);
  return null;
}
function aktif_(u) {
  if (!u || !u.id || u.status !== 'AKTIF') return false;
  if (u.berlaku) { const b = new Date(u.berlaku); b.setHours(23, 59, 59); if (b < new Date()) return false; }
  return true;
}
function cariSesi_(token) {
  if (!token) return null;
  const h = hash_(String(token)), v = sh_('SESI').getDataRange().getValues();
  for (let i = 1; i < v.length; i++) {
    if (v[i][0] === h) return { row: i + 1, id: String(v[i][1]), dev: String(v[i][2] || ''), status: String(v[i][6]).toUpperCase() };
  }
  return null;
}
function cabutSesi_(id) {
  const s = sh_('SESI'), v = s.getDataRange().getValues();
  for (let i = 1; i < v.length; i++) if (String(v[i][1]) === id && String(v[i][6]).toUpperCase() === 'AKTIF') s.getRange(i + 1, 7).setValue('DICABUT');
}
function buatKunci_() {
  const s = sh_('KUNCI'), last = s.getLastRow();
  const ver = last < 2 ? 1 : Number(s.getRange(last, 1).getValue()) + 1;
  s.appendRow([ver, Utilities.base64Encode(acak_()), new Date(), 'AKTIF']);
  return ver;
}
function kodeBaru_() { // 8 karakter acak tanpa huruf/angka yang mirip (0/O, 1/I/L)
  const abc = '23456789ABCDEFGHJKMNPQRSTUVWXYZ', d = acak_();
  let k = '';
  for (let i = 0; i < 8; i++) k += abc[((d[i] & 255) % abc.length)];
  return 'GRC-' + k.slice(0, 4) + '-' + k.slice(4);
}
function normKode_(k) { return String(k || '').toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/^GRC/, ''); }
function catat_(id, nama, dev, aksi, idpel, detail, waktuHp) {
  sh_('LOG').appendRow([new Date(), aman_(waktuHp || ''), id || '', nama || '', aman_(dev || ''), aksi, idpel ? "'" + idpel : '', aman_(detail || '')]);
}
function aman_(s) { s = String(s == null ? '' : s); return /^[=+\-@]/.test(s) ? "'" + s : s; } // cegah teks dibaca sebagai rumus
function ui_(m) { SpreadsheetApp.getUi().alert(m); }
function sh_(n) { return SpreadsheetApp.getActive().getSheetByName(n); }
function rows_(n) { const v = sh_(n).getDataRange().getValues(); v.shift(); return v; }
function acak_() { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + Utilities.getUuid() + Date.now()); }
function hash_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)
    .map(function (b) { return ((b + 256) % 256).toString(16).padStart(2, '0'); }).join('');
}
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
