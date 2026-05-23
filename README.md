# 📺 Stream Banner Manager & Analytics Overlay

*Created with opencode & polished by bluebrad*

A self-contained, ultra-responsive local overlay manager and exposure analytics suite for **OBS Studio**. Manage, cycle, and track the exact exposure times and loading performance of your sponsors, alerts, and video banners in real time.

---

## 🚀 Key Features

*   **🖥️ Professional Dark-Mode Dashboard:** A gorgeous, modern web controller styled with Tailwind CSS to manage your rotation libraries.
*   **📂 Drag-and-Drop Uploader:** Supports instant uploads for `PNG`, `JPG`, `GIF`, `WEBP`, `SVG`, `MP4`, and `WEBM` files, storing them securely in your local folder.
*   **📐 Custom Pixel-Precise Ratios:** Lock your overlay container's aspect ratio to any exact pixel dimensions (e.g., `1200x300` banner, `300x250` square block, or standard `16:9` widescreen).
*   **📊 Live Chart.js Analytics:** Plot live exposure loops over time with interactive, colored line graphs. Track **total loops (views)**, **exact display duration (on-screen minutes)**, and **average asset loading speeds** for each individual banner.
*   **🔄 Double-Buffered Seamless Transitions:** Dual absolute layout containers pre-render and pre-play assets in the background, executing glitch-free hardware-accelerated animations (Fade, Horizontal Slide, Vertical Slide, Zoom, and Cut) with zero white/gray flashes.
*   **🎬 Smart Video-Ended Rotation:** Keeps slideshows perfectly synced. If a slide is an MP4 or WebM video, the overlay will automatically wait for the video to play to completion before executing the next transition.
*   **🛠️ OBS Self-Diagnostic Screen:** If the local server is turned off, OBS displays a prominent error box on your scene instead of remaining blank, letting you know exactly how to fix it. Includes uncaught JavaScript error reporting inside the OBS viewport.

---

## 📂 Project Architecture

```
stream-banner/
├── media/                  # Stores uploaded video loops and images (SVGs, PNGs, etc.)
├── public/                 # Served overlay files
│   ├── dashboard.html      # Stream Controller & Chart.js Analytics Panel
│   └── obs.html           # Transparent double-buffered OBS viewport with diagnostics
├── server.js               # Core Node.js server (Express + WebSockets + Multer)
├── settings.json           # Holds active configuration and media ordering states
├── tracking.json           # Local database for view counters, durations, and load latency
└── Start-Stream-Banner-Manager.bat # Windows double-click automatic startup script
```

---

## ⚙️ Quick Installation

### **Prerequisites**
You must have **Node.js** installed on your system.
*   👉 Download and install the latest stable version from [Node.js Official Website](https://nodejs.org/).

### **How to Run**
1.  Download or clone this repository into a folder on your computer.
2.  Unzip into a folder where you would like this to run from and unpack node_modules.zip 
3.  Double-click **`Start-Stream-Banner-Manager.bat`**.
4.  The console will launch, auto-install required dependencies if needed, bind port `3000`, and automatically open your default browser to the **Stream Controller Dashboard**.

*Note: Keep the terminal window open while streaming! It runs the local server that streams your assets directly into OBS.*

---

## 🎥 Setting Up in OBS Studio

1.  Open your **OBS Studio** software.
2.  Inside your active Scene, click the **`+`** icon to add a new Source and select **`Browser`**.
3.  Choose your loading method:
    *   **Option A (Recommended):** In the **URL** box, paste the following link:
        ```
        http://localhost:3000/public/obs.html
        ```
    *   **Option B (Local File):** Tick the **"Local file"** checkbox, click **Browse**, and navigate to select **`public/obs.html`** in this folder.
4.  Set your desired **Width** and **Height** (e.g., `1920` and `1080` for standard fullscreen graphics, or `728` and `90` for leaderboard banners).
5.  If you make changes to the file or layout and OBS doesn't show them, open the source properties, scroll down, and click **`Refresh cache of current page`**.
6.  Click **OK**.

---

## 🛠️ Built With

*   **Backend:** Node.js, [Express](https://expressjs.com/) (Web Server), [Multer](https://github.com/expressjs/multer) (Multipart File Handler), and `ws` (High-performance WebSockets).
*   **Frontend UI:** Vanilla JavaScript, [Tailwind CSS CDN](https://tailwindcss.com/) (Modern Dark Layout), and [FontAwesome CDN](https://fontawesome.com/) (Icon Elements).
*   **Analytics Charts:** [Chart.js](https://www.chartjs.org/) (Interactive Vector Line Graphs).

---

## See the demo video
* https://youtu.be/EXoSnSLBUtw 
