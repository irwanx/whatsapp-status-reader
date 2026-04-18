# 📱 WhatsApp Status Reader

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License"/>
  <img src="https://img.shields.io/badge/Python-%3E=3.11-blue" alt="Python"/>
  <img src="https://img.shields.io/badge/Powered_by-Neonize-25D366?logo=whatsapp&logoColor=white" alt="Neonize"/>
  <img src="https://img.shields.io/badge/Package_Manager-uv-black" alt="uv"/>
  <img src="https://img.shields.io/badge/Author-irwanx-blue" alt="Author"/>
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome"/>
</p>

<p align="center">
  <b>🇮🇩 Indonesia</b> · <a href="#english-version">🇬🇧 English</a>
</p>

---

Bot WhatsApp otomatis berbasis Python yang menandai status WhatsApp kontak sebagai "sudah dibaca" secara real-time menggunakan [Neonize](https://github.com/krypton-byte/neonize) — Python wrapper untuk [whatsmeow](https://github.com/tulir/whatsmeow).

> **Disclaimer:** Proyek ini bukan produk resmi WhatsApp/Meta. Gunakan dengan bijak dan sesuai ketentuan layanan WhatsApp.

---

## 🚀 Fitur

| Fitur | Keterangan |
|-------|------------|
| 👁️ Auto-read status | Menandai status WhatsApp sebagai dibaca secara otomatis |
| ⚡ Neonize + whatsmeow | Koneksi stabil berbasis Go bridge |
| 🔑 Pairing Code | Login via kode — **tanpa scan QR** |
| 🗄️ SQLite | Sesi login tersimpan, tidak perlu pairing ulang |
| 🐍 uv | Setup cepat tanpa ribet virtual environment manual |
| 📋 PM2 Ready | Log bersih dengan `flush=True`, siap dijalankan via PM2 |

---

## 📁 Struktur Folder

```
wsr-py/
├── main.py               # Entry point bot
├── db.sqlite3           # Database sesi (dibuat otomatis)
├── pyproject.toml       # Konfigurasi project & dependensi
├── uv.lock              # Lockfile dependensi
├── .python-version      # Versi Python
├── .gitignore
└── README.md
```

> `db.sqlite3` sudah masuk `.gitignore` — sesi login tidak akan ikut ter-commit.

---

## 📦 Prasyarat

- [Python](https://www.python.org/downloads/) `>= 3.11`
- [uv](https://docs.astral.sh/uv/getting-started/installation/)

### Install uv

**Windows (PowerShell):**
```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

**macOS / Linux:**
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

---

## 🛠️ Cara Menggunakan

### 1. Clone repositori

```bash
git clone https://github.com/irwanx/whatsapp-status-reader.git
cd whatsapp-status-reader
```

### 2. Install dependensi

```bash
uv sync
```

### 3. Jalankan bot

```bash
uv run main.py
```

**Pertama kali run** — bot akan meminta nomor HP:

```
Masukkan nomor HP (contoh: 628123456789): 628123456789
[19:04:26] 📱 Pair code: ABCD-1234
```

Masukkan kode tersebut di WhatsApp: **Setelan → Perangkat Tertaut → Tautkan Perangkat**.

Setelah berhasil:

```
[19:04:48] 🔗 Logged as 628123456789
[19:04:55] 👁️  Status dari 628987654321 ditandai dibaca
```

**Run berikutnya** — bot langsung konek tanpa pairing ulang.

---

## 🖥️ Menjalankan dengan PM2

Cocok untuk server/VPS agar bot berjalan terus di background.

### Install PM2

```bash
npm install -g pm2
```

### Jalankan bot via PM2

> **Pastikan sudah pairing dulu** (`uv run main.py`) sebelum pakai PM2, karena PM2 tidak bisa menerima input interaktif.

```bash
pm2 start "uv run main.py" --name wsr-bot
```

### Perintah PM2 berguna

```bash
pm2 logs wsr-bot       # lihat log real-time
pm2 status             # cek status bot
pm2 restart wsr-bot    # restart bot
pm2 stop wsr-bot       # stop bot
pm2 startup            # auto-start saat server reboot
pm2 save               # simpan konfigurasi PM2
```

---

## 🤝 Kontribusi

1. Fork repositori ini
2. Buat branch baru: `git checkout -b feat/nama-fitur`
3. Commit: `git commit -m "feat: tambah fitur X"`
4. Push: `git push origin feat/nama-fitur`
5. Buat Pull Request

---

## 📄 Lisensi

[MIT](LICENSE) © [irwanx](https://github.com/irwanx)

---

<a name="english-version"></a>

## 🇬🇧 English Version

A Python-based WhatsApp bot that automatically marks WhatsApp statuses as "read" in real-time using [Neonize](https://github.com/krypton-byte/neonize), a Python wrapper for [whatsmeow](https://github.com/tulir/whatsmeow).

> **Disclaimer:** This is not an official WhatsApp/Meta product. Use responsibly and in accordance with WhatsApp's Terms of Service.

### Features

| Feature | Description |
|---------|-------------|
| 👁️ Auto-read status | Automatically marks WhatsApp statuses as read |
| ⚡ Neonize + whatsmeow | Stable connection via Go bridge |
| 🔑 Pairing Code | Login via code — **no QR scan needed** |
| 🗄️ SQLite | Session persists, no re-pairing needed |
| 🐍 uv | Fast setup without manual venv hassle |
| 📋 PM2 Ready | Clean logs with `flush=True`, ready for PM2 |

### Project Structure

```
wsr-py/
├── main.py               # Bot entry point
├── db.sqlite3           # Session database (auto-created)
├── pyproject.toml       # Project config & dependencies
├── uv.lock              # Dependency lockfile
├── .python-version      # Python version pin
├── .gitignore
└── README.md
```

### Quick Start

```bash
git clone https://github.com/irwanx/whatsapp-status-reader.git
cd whatsapp-status-reader

uv sync
uv run main.py
```

On first run, enter your phone number (`628xxxxxxxx`) and enter the pairing code in WhatsApp: **Settings → Linked Devices → Link a Device**.

Subsequent runs will reuse the saved session automatically.

### Running with PM2

> Pair your account first (`uv run main.py`) before using PM2, since PM2 can't handle interactive input.

```bash
npm install -g pm2
pm2 start "uv run main.py" --name wsr-bot
pm2 logs wsr-bot
pm2 startup && pm2 save
```

### License

[MIT](LICENSE) © [irwanx](https://github.com/irwanx)
