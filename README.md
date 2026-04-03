# 📱 WhatsApp Status Reader

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E=20.0.0-brightgreen)](https://nodejs.org/)
[![Baileys](https://img.shields.io/badge/Powered_by-Baileys-blue)](https://github.com/WhiskeySockets/Baileys)
[![Author](https://img.shields.io/badge/Author-wsr-blue)](https://github.com/irwanx)

Selamat datang di repositori **WhatsApp Status Reader** — sebuah bot WhatsApp otomatis yang dirancang untuk membaca dan memantau status WhatsApp secara efisien.

---

## 📝 Deskripsi

**WhatsApp Status Reader** adalah bot berbasis Node.js yang memungkinkan Anda memantau status WhatsApp teman, keluarga, atau kontak lainnya secara otomatis. Tanpa perlu membuka aplikasi WhatsApp secara manual, bot ini akan menampilkan informasi status terbaru langsung ke terminal Anda.

Solusi ini cocok bagi Anda yang ingin:

- Tetap update dengan status teman tanpa harus membuka setiap satu per satu.
- Membuat sistem pemantauan atau integrasi WhatsApp pribadi.

---

## 🚀 Fitur Utama

- ✅ **Pemantauan Status Otomatis**  
  Bot akan membaca status WhatsApp secara real-time tanpa interaksi manual.

- ⚙️ **Integrasi dengan Baileys**  
  Memanfaatkan pustaka [Baileys](https://github.com/WhiskeySockets/Baileys) untuk koneksi yang stabil dan handal dengan WhatsApp Web.

- 🟢 **Mudah Digunakan & Ringan**  
  Dirancang agar developer dapat langsung menjalankan bot sesuai kasus penggunaan.

---

## 📦 Prasyarat

Pastikan Anda telah menginstal:

- [Git](https://git-scm.com/downloads)
- [Node.js](https://nodejs.org/en/download) – disarankan versi terbaru LTS

---

## 🛠️ Cara Menggunakan

### 1. Klon Repositori ini

```bash
git clone https://github.com/irwanx/whatsapp-status-reader.git
```

### 2. Persiapan Awal

- **Masuk ke Direktori Repositori:**:

  ```bash
  cd whatsapp-status-reader
  ```

- **Instal Dependensi**:

  ```bash
  pnpm install
  # atau
  npm install
  # atau
  yarn install
  ```

- **Konfigurasi Awal**

  Edit file `config.js` sesuai kebutuhan.

### 3. Menjalankan Bot

- **Mode Pairing Code**

  ```bash
  pnpm start
  # atau
  npm start
  ```

- **Mode QR Code**

  ```bash
  pnpm qr
  # atau
  npm run qr
  ```

### 4. Menjalankan dengan PM2 (Production)

```bash
# Start dengan nama default (wsr)
pm2 start

# Start dengan nama custom
pm2 start --name irwanx

# Cek status
pm2 status

# Lihat logs
pm2 logs wsr
# atau
pm2 logs irwanx

# Restart
pm2 restart wsr

# Stop
pm2 stop wsr

# Hapus dari PM2
pm2 delete wsr
```

## 🤝 Kontribusi

Kontribusi sangat terbuka! Jika Anda ingin menambahkan fitur baru, memperbaiki bug, atau meningkatkan dokumentasi, silakan buat Pull Request atau buka Issue terlebih dahulu

## 📄Lisensi

Proyek ini dilisensikan di bawah Lisensi MIT - lihat file [LISENSI](LICENSE) untuk detailnya.
