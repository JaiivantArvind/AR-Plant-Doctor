# 🌿 AR Plant Doctor

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?style=flat&logo=express&logoColor=white)](https://expressjs.com/)
[![A-Frame](https://img.shields.io/badge/A--Frame-1.4.0-EF2D5E?style=flat&logo=aframe&logoColor=white)](https://aframe.io/)
[![AR.js](https://img.shields.io/badge/AR.js-3.x-orange?style=flat)](https://ar-js-org.github.io/AR.js-Docs/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

An Augmented Reality (AR) houseplant health monitoring and care management web application. Point your smartphone or webcam at a custom plant marker to view real-time watering schedules, urgency status, sunlight requirements, and care tips rendered in 3D directly above the pot.

---

## ✨ Features

- 📱 **Real-Time AR Overlays**: 3D informational HUD cards hover over physical plant markers showing watering countdowns, urgency colors, sunlight guidelines, and care tips.
- 🎨 **Auto-Generated Pattern Markers**: Custom, high-contrast AR pattern markers generated server-side for any plant (existing and new) with official 195-line, 4-orientation ARToolKit `.patt` encoding.
- 📊 **Care Analytics & Dashboard**: Centralized dashboard for managing your plant collection, tracking 30-day watering history via Chart.js, and logging watering events with a single click.
- 🖨 **Integrated Marker Print Studio**: Clean, print-ready layouts with proper quiet zones to easily print and attach markers to plant pots.
- 🔔 **Overdue Care Alerts**: Browser service worker background checks alerting you when plants need immediate watering.
- ⚡ **Zero External Marker Downloads**: Entire marker training and descriptor synthesis runs locally and automatically on server startup or plant creation.

---

## 🛠 Tech Stack

| Layer | Technology |
| :--- | :--- |
| **AR & 3D Engine** | [A-Frame](https://aframe.io/) (1.4.0) + [AR.js](https://github.com/AR-js-org/AR.js) (Master Build) |
| **Frontend UI** | HTML5, CSS3, Modern ES6+ JavaScript, Chart.js |
| **Backend Server** | [Node.js](https://nodejs.org/) with [Express](https://expressjs.com/) |
| **Marker Synthesis** | [node-canvas](https://github.com/Automattic/node-canvas) (ARToolKit BGR 16x16 4-angle rotation encoder) |
| **Persistence** | Lightweight JSON data store (`plants.json`) |
| **PWA & Offline** | Service Workers (`dashboard/sw.js`) |

---

## 📂 Project Structure

```text
ARVR/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions CI/CD deployment workflow
├── assets/
│   └── icons/                  # Printable marker PNG images (marker-1.png, ...)
├── dashboard/
│   ├── dashboard.css           # Care dashboard styling
│   ├── dashboard.js            # Plant management, analytics & print logic
│   ├── index.html              # Web management dashboard interface
│   └── sw.js                   # Service worker for background notifications
├── markers/                    # Pre-trained ARToolKit pattern descriptors (marker-1.patt, ...)
├── app.js                      # Core AR event handling and overlay rendering logic
├── index.html                  # Main AR camera application entry point
├── style.css                   # Main AR overlay styling and loader animation
├── plants.json                 # JSON database of plants and care records
├── server.js                   # Express server and marker training backend
├── run_app.py                  # Cross-platform helper launcher (Server + ngrok tunnel)
├── run_app.bat                 # Windows one-click launcher
├── package.json                # Project dependencies and run scripts
├── .gitignore                  # Git ignore rules for node_modules and cache
└── README.md                   # Project documentation
```

---

## 🚀 Quick Start

### ⚡ One-Click Launch (Windows — Recommended)

The easiest way to run the application on Windows is using the included **`run_app.bat`** launcher. It handles all first-time setup automatically on any new system:

1. Double-click **`run_app.bat`** (or run `.\run_app.bat` in your terminal).
2. The launcher will automatically:
   - ✅ Detect and configure **Node.js** in your PATH.
   - ✅ Run **`npm install`** automatically if dependencies are not yet installed.
   - ✅ Free port **3000** if occupied.
   - ✅ Generate any missing pattern marker descriptors (`.patt` and `.png`).
   - ✅ Start the **Express backend server**.
   - ✅ Launch an **HTTPS tunnel** for mobile camera testing.
   - ✅ Automatically open the **Care Dashboard** and **AR Camera** in your default web browser.

---

### 💻 Manual / Cross-Platform Setup (macOS / Linux / Windows)

If you prefer to run manually or are on macOS/Linux:

#### 1. Prerequisites
- **Node.js** (v18.0.0 or higher) — [Download here](https://nodejs.org/)
- A webcam or smartphone camera

#### 2. Installation
Clone the repository and install the dependencies:
```bash
git clone https://github.com/JaiivantArvind/AR-Plant-Doctor.git
cd AR-Plant-Doctor
npm install
```

#### 3. Running the Server
Start the local server:
```bash
npm start
```
*(Alternatively, run `python run_app.py` for automated browser launch and tunnel setup).*

#### 4. Accessing the Application
- **AR Camera View**: Open [http://localhost:3000](http://localhost:3000)
- **Care Dashboard**: Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

> [!TIP]
> **Mobile Phone Testing**: Mobile browsers (iOS Safari and Android Chrome) require a secure HTTPS context to grant camera permissions. Use a secure tunnel:
> ```bash
> npx localtunnel --port 3000
> # or
> npx ngrok http 3000
> ```
> Open the generated `https://...` link on your phone's browser to scan markers directly!

---

## 📖 How It Works

### Marker Detection & AR Tracking
1. The AR scene is configured with `patternRatio: 0.75`, matching the border-to-inner ratio of the auto-generated marker templates.
2. The server generates a $512 \times 512$ high-contrast marker containing the plant's unique identifier and an orientation accent shape.
3. The server's pattern encoder samples the inner area in BGR color channels across 4 rotational angles ($0^\circ, -90^\circ, -180^\circ, -270^\circ$), generating standard 195-line `.patt` files.
4. When the camera recognizes a marker, `app.js` pulls the latest plant information from `/api/plants`, calculates watering urgency, and positions the floating status card.

### Dynamic Plant Addition
- When a new plant is added through the **Plant Management** tab on the dashboard, the backend creates its custom `.patt` and `.png` marker files on the fly.
- The AR camera view polls for newly added plants and dynamically registers new `<a-marker>` nodes without requiring a page reload.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
