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

Sebuah bot WhatsApp otomatis berbasis Python yang membaca dan memantau status WhatsApp secara efisien menggunakan [Neonize](https://github.com/krypton-byte/neonize) — Python wrapper untuk [whatsmeow](https://github.com/tulir/whatsmeow).

> **Disclaimer:** Proyek ini bukan produk resmi WhatsApp/Meta. Gunakan dengan bijak dan sesuai ketentuan layanan WhatsApp.

---

## 📝 Deskripsi

**WhatsApp Status Reader** memungkinkan Anda memantau status WhatsApp kontak secara otomatis tanpa perlu membuka aplikasi secara manual. Bot ini berjalan di background dan menandai status sebagai "sudah dibaca" secara real-time.

Cocok untuk:
- Memantau status teman/keluarga secara otomatis
- Dasar untuk integrasi atau proyek WhatsApp automation pribadi

---

## 🚀 Fitur Utama

| Fitur | Keterangan |
|-------|------------|
| ✅ Auto-read status | Membaca status WhatsApp secara otomatis tanpa interaksi manual |
| ⚡ Neonize + whatsmeow | Koneksi stabil berbasis Go bridge yang battle-tested |
| 🔑 Pairing Code | Login mudah via pairing code — tanpa scan QR |
| 🗄️ SQLite WAL | Database ringan dengan mode WAL untuk performa concurrency |
| 🐍 Python + uv | Setup cepat tanpa ribet virtual environment manual |
| 🔇 Clean output | Log bersih, hanya menampilkan info yang relevan |

---

## 📁 Struktur Folder

```
whatsapp-status-reader/
├── main.py              # Entry point utama bot
├── wsr-bot.db           # Database SQLite (dibuat otomatis saat pertama run)
├── pyproject.toml       # Konfigurasi project & dependensi (uv)
├── uv.lock              # Lockfile dependensi
├── .python-version      # Versi Python yang digunakan
├── .gitignore
└── README.md
```

> `wsr-bot.db` sudah masuk `.gitignore` — sesi login kamu tidak akan ikut ter-commit.

---

## 📦 Prasyarat

Pastikan sudah terinstal:

- [Git](https://git-scm.com/downloads)
- [Python](https://www.python.org/downloads/) `>= 3.11`
- [uv](https://docs.astral.sh/uv/getting-started/installation/) — fast Python package & project manager

### Instalasi uv

**Windows (PowerShell):**
```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

**macOS / Linux:**
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Panduan lengkap: [https://docs.astral.sh/uv/getting-started/installation/](https://docs.astral.sh/uv/getting-started/installation/)

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

uv akan otomatis membuat virtual environment dan menginstal semua dependensi yang dibutuhkan.

### 3. Jalankan bot

```bash
uv run main.py
```

**Pertama kali run:**
Bot akan meminta nomor HP kamu (format: `628xxxxxxxx`). Setelah dimasukkan, kamu akan menerima **pairing code** di notifikasi WhatsApp. Masukkan kode tersebut di perangkat WhatsApp kamu.

```
Masukkan nomor HP (contoh: 628xxxxxxxx): 6281234567890
[*] Memanggil client.connect()...
⚡ Bot sudah online!
✅ Status dari 6281234567890 otomatis dibaca
```

**Run berikutnya:**
Bot langsung terhubung tanpa perlu pairing ulang — sesi tersimpan di `wsr-bot.db`.

---

## 🤝 Kontribusi

Kontribusi sangat welcome! Berikut cara berkontribusi:

1. Fork repositori ini
2. Buat branch baru: `git checkout -b feat/nama-fitur`
3. Commit perubahan: `git commit -m "feat: tambah fitur X"`
4. Push ke branch: `git push origin feat/nama-fitur`
5. Buat Pull Request

Untuk perubahan besar, buka Issue terlebih dahulu untuk diskusi.

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah **MIT License** — lihat file [LICENSE](LICENSE) untuk detail.

---

<a name="english-version"></a>

## 🇬🇧 English Version

**WhatsApp Status Reader** is a Python-based WhatsApp bot that automatically reads and monitors WhatsApp statuses in real-time using [Neonize](https://github.com/krypton-byte/neonize), a Python wrapper for [whatsmeow](https://github.com/tulir/whatsmeow).

> **Disclaimer:** This is not an official WhatsApp/Meta product. Use responsibly and in accordance with WhatsApp's Terms of Service.

### Key Features

| Feature | Description |
|---------|-------------|
| ✅ Auto-read status | Automatically reads WhatsApp statuses without manual interaction |
| ⚡ Neonize + whatsmeow | Stable connection via battle-tested Go bridge |
| 🔑 Pairing Code | Easy login via pairing code — no QR scan needed |
| 🗄️ SQLite WAL | Lightweight DB with WAL mode for concurrency performance |
| 🐍 Python + uv | Fast setup without manual virtual environment hassle |

### Project Structure

```
whatsapp-status-reader/
├── main.py              # Bot entry point
├── wsr-bot.db           # SQLite database (auto-created on first run)
├── pyproject.toml       # Project config & dependencies (uv)
├── uv.lock              # Dependency lockfile
├── .python-version      # Python version pin
├── .gitignore
└── README.md
```

### Quick Start

```bash
# Clone
git clone https://github.com/irwanx/whatsapp-status-reader.git
cd whatsapp-status-reader

# Install uv (if not installed)
# Windows:  powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
# macOS/Linux: curl -LsSf https://astral.sh/uv/install.sh | sh

# Install dependencies
uv sync

# Run
uv run main.py
```

On first run, enter your phone number (`628xxxxxxxx`) and enter the pairing code sent to your WhatsApp. Subsequent runs will reuse the saved session automatically.

### Contributing

PRs are welcome! Please open an Issue first for major changes. Follow the same branch naming convention: `feat/`, `fix/`, `docs/`.

### License

[MIT](LICENSE) © [irwanx](https://github.com/irwanx)