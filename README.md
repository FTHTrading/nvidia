# NVIDIA Work Desk | nil33.com

> High-Performance Omnimodal Physical AI & Voice Control Suite powered by NVIDIA NIM API & Nemotron 3.5.

Deployed live at **[nil33.com](https://nil33.com)** and **[FTHTrading.github.io/nvidia](https://fthtrading.github.io/nvidia/)**.

---

## ⚡ Features

- **NVIDIA NIM API Load Balancer**: Active 4-key round-robin rotation with zero-downtime rate-limit failover across `nvapi-*` keys.
- **Voice Control Studio**: Real-time hands-free speech recognition (STT) and text-to-speech audio reader (TTS) with live waveform visualization.
- **Physical AI & Cosmos 3 Studio**: Controls for world generation prompts, resolution tiers (720p/480p/256p), 2D bounding box grounding, and temporal localization.
- **Nemotron 3.5 Reasoning Chain**: Real-time streaming visualizer for `<think>` reasoning tokens.
- **Dual Runtime**: Operates both as a standalone static web application on GitHub Pages (`nil33.com`) and as a local Node.js Express server on `http://localhost:3000/`.

---

## 🚀 Quickstart (Local Development)

```bash
git clone https://github.com/FTHTrading/nvidia.git
cd nvidia
npm install
npm run dev
```

Open `http://localhost:3000/` in your browser.

---

## 🌐 GitHub Pages & Custom Domain Setup

- Custom domain target: `nil33.com`
- Primary branch: `main`
- Host: GitHub Pages with CNAME enabled.

---

© 2026 FTH Trading. All Rights Reserved.
