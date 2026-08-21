<div align="center">

# 📈 GnomeTicker

**A sleek, modern, and highly optimized GNOME Shell extension to monitor real-time market prices right from your topbar.**

![GNOME Version](https://img.shields.io/badge/GNOME-45%2B-blue?style=flat-square)
![Version](https://img.shields.io/badge/Version-1.0.0-success?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)
![JavaScript](https://img.shields.io/badge/Made%20with-GJS-f7df1e?style=flat-square)

</div>

---

## 🌟 Overview

**GnomeTicker** brings live financial data directly to your GNOME desktop. Whether you're tracking Gold, Coins, Fiat Currencies, or Global Metals, GnomeTicker provides a seamless, non-intrusive, and beautifully designed dropdown panel. Built with performance in mind, it perfectly matches the native GNOME (Adwaita) aesthetics.

---

## ✨ Key Features

| Feature | Description |
| :--- | :--- |
| 🚀 **Real-Time Topbar** | Quickly glance at USD and 18K Gold prices without opening any app. |
| 🎨 **Modern Popover UI** | A beautifully designed dropdown menu that matches native GNOME aesthetics. |
| 🔍 **Smart Search** | Instantly filter through dozens of market items (e.g., type "Euro" or "Gold"). |
| 📊 **Trend Indicators** | Visual up ▲, down ▼, and neutral – arrows show price movements since the last update. |
| 📋 **Click-to-Copy** | Click on any price row to instantly copy the raw number to your clipboard. |
| ⚙️ **Auto-Refresh** | Fetches new data every 5 minutes automatically, with a manual refresh button. |
| ℹ️ **About Page** | Dedicated page with developer links and project information. |

---

## 💱 Supported Assets

The extension fetches and categorizes the following market data:

- **🥇 Gold:** Ounce, Mithqal, 18K, 24K, Melted, 17K
- **🪙 Coins:** Emami, Bahar Azadi, Half, Quarter, Gram
- **💵 Fiat Currencies:** USD, EUR, GBP, AED, TRY, CNY, JPY, and 20+ others
- **🛢️ Global Indices & Metals:** WTI Oil, Brent Oil, Silver, Platinum, Palladium

---

## 🚀 Installation

### Method 1: Manual Installation (From Source)

1. Clone the repository:
   ```bash
   git clone https://github.com/tsshack/GnomeTicker.git
   ```
2. Copy the extension folder to your GNOME extensions directory:
   ```bash
   cp -r GnomeTicker/gnometicker@tsshack ~/.local/share/gnome-shell/extensions/
   ```
3. Restart GNOME Shell:
   - **X11:** Press `Alt + F2`, type `r`, and press `Enter`.
   - **Wayland:** Log out and log back in.
4. Enable the extension using the **Extensions** app or via terminal:
   ```bash
   gnome-extensions enable gnometicker@tsshack
   ```

### Method 2: From ZIP Release
1. Download the latest `gnometicker@tsshack.zip` from the [Releases page](https://github.com/tsshack/GnomeTicker/releases).
2. Extract it to `~/.local/share/gnome-shell/extensions/`.
3. Restart GNOME Shell and enable it.

---

## 🛠️ Tech Stack

- **GJS (GNOME JavaScript):** Modern ES6 Modules
- **Soup (libsoup3):** For fast and async HTTP network requests.
- **St & Clutter:** For rendering native, hardware-accelerated UI components.

---

## 👨‍💻 Developer & Links

**Ehsan Fazli**

<p align="center">
  <a href="https://ehsanfazli.ir">🌐 Website</a> •
  <a href="https://github.com/tsshack">💻 GitHub</a> •
  <a href="https://github.com/tsshack/GnomeTicker">📂 Repository</a>
</p>

---

## 📜 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.