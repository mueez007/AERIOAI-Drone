
# 🚁 AERIOAI — Mission Intelligence Platform

> **AI-Powered Autonomous Drone for Surveillance, Object Detection, Smart Payload Delivery & Emergency Response**

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-teal.svg)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org)
[![Flutter](https://img.shields.io/badge/Flutter-3.x-blue.svg)](https://flutter.dev)
[![YOLOv8](https://img.shields.io/badge/YOLOv8-nano-green.svg)](https://ultralytics.com)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📖 Overview

**AERIOAI** is an AI-powered autonomous drone platform that combines **computer vision**, **natural language processing**, and **autonomous flight control** into a unified command center. It enables real-time aerial surveillance, intelligent object detection & classification, scene understanding, voice-controlled mission queries, and automated report generation.

Built for **final-year engineering projects**, **research demonstrations**, and **startup prototyping**.

---

## 🧠 Key Features

### 🎯 Core Capabilities
- **Live Video Surveillance** — Real-time MJPEG/WebRTC camera feed from drone
- **AI Object Detection** — YOLOv8n running locally on Raspberry Pi for real-time detection
- **Scene Understanding** — Google Gemini 2.5 for deep scene analysis, threat assessment & summarization
- **Voice Assistant** — Groq Whisper STT + ElevenLabs TTS for natural voice conversations with the drone
- **AI Copilot** — Chat interface to query missions, analyze images, and compare flights
- **Mission Intelligence** — Automatic mission scoring, threat analysis, coverage metrics
- **Vehicle Number Plate Recognition** — OCR-based ANPR (when image quality permits)

### 📊 Mission Management
- **Mission Sessions** — Every flight is a session with full data capture
- **Mission Knowledge Base** — Queryable history: *"Show all missions with trucks detected"*
- **Mission Compare** — Side-by-side AI-powered comparison of multiple missions
- **PDF Report Generation** — Auto-generated professional mission reports
- **Mission Intelligence Score** — Coverage %, Threat %, Detection Accuracy %, Success %

### 🎛️ Command Center (Web Dashboard)
- **Dark/Light Mode** — Cybersecurity SOC / Defense-tech themed UI
- **Live Telemetry Panel** — GPS, altitude, speed, attitude, battery
- **Media Vault** — Photo & video gallery with AI analysis per media item
- **System Health Dashboard** — CPU, RAM, disk, services status
- **AI Copilot Chat** — Text + Voice interface
- **Responsive Design** — Works on desktop, tablet, mobile

### 📱 Mobile App (Android APK)
- Flutter-based mobile client
- Live camera view, telemetry, AI chat, mission control
- Connects directly to Raspberry Pi over same WiFi

---

## 🏗️ Architecture
┌─────────────────────────────────────────────────────────┐
│ AERIOAI Platform │
├─────────────────────────────────────────────────────────┤
│ Raspberry Pi 4 (4GB) — On-Device Compute │
│ ┌──────────┐ ┌──────────┐ ┌──────────────────────┐ │
│ │ Camera │ │ YOLOv8n │ │ FastAPI Backend │ │
│ │ (CSI) │ │ (Local) │ │ (Python 3.11+) │ │
│ └────┬─────┘ └────┬─────┘ └──────────┬───────────┘ │
│ │ │ │ │
│ ┌────┴─────────────┴───────────────────┴───────────┐ │
│ │ PostgreSQL / SQLite │ │
│ │ Media Storage │ │
│ └──────────────────────────────────────────────────┘ │
│ │
│ Cloud AI Services (Internet Required) │
│ ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│ │ Gemini │ │ Groq │ │ ElevenLabs TTS │ │
│ │ 2.5 │ │ Whisper │ │ │ │
│ └──────────┘ └──────────┘ └──────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ Clients │
│ ┌──────────────┐ ┌──────────────┐ │
│ │ Next.js Web │ │ Flutter APK │ │
│ │ (TypeScript) │ │ (Dart) │ │
│ └──────────────┘ └──────────────┘ │
│ Both connect to Pi over same WiFi network │
└─────────────────────────────────────────────────────────┘

text

---

## 🛠️ Tech Stack

### Hardware
| Component | Model |
|-----------|-------|
| Single Board Computer | Raspberry Pi 4 (4GB) |
| Flight Controller | SpeedyBee F405 V5 (INAV) |
| GPS Module | BN-880 |
| Camera | Raspberry Pi CSI Camera |
| ESC | 55A 4-in-1 |
| Motors | 4114-11 320KV Brushless |
| Audio | USB Microphone + USB Speaker |

### Software
| Layer | Technology |
|-------|-----------|
| **Backend API** | Python 3.11+, FastAPI, Uvicorn |
| **Database** | SQLite (v1.0) / PostgreSQL (migration-ready) |
| **ORM** | SQLAlchemy 2.0 |
| **Auth** | JWT + bcrypt + Role-Based Access Control |
| **AI — Edge** | YOLOv8n (Ultralytics) |
| **AI — Cloud Vision** | Google Gemini 2.5 Flash |
| **AI — Cloud Voice** | Groq Whisper + Groq LLM (Llama 3.3) |
| **AI — Cloud TTS** | ElevenLabs |
| **Frontend Web** | Next.js 15, TypeScript, Tailwind CSS |
| **Mobile App** | Flutter 3.x, Dart |
| **FC Protocol** | MSP over USB |
| **Streaming** | MJPEG (v1), WebRTC (architected) |
| **Reports** | ReportLab (PDF), CSV export |

---

## 📁 Project Structure
aerioai/
├── backend/ # FastAPI Backend
│ ├── main.py # App entry point
│ ├── config.py # Settings from .env
│ ├── requirements.txt # Python dependencies
│ ├── api/ # Route handlers
│ │ ├── auth.py # Login, register, JWT
│ │ ├── camera.py # Capture, stream, media CRUD
│ │ ├── telemetry.py # FC data endpoints + WebSocket
│ │ ├── mission.py # Mission CRUD, compare, query
│ │ ├── chat.py # AI copilot, voice, scene analysis
│ │ └── system.py # Health dashboard, audit logs
│ ├── core/ # Business logic
│ │ ├── database.py # SQLAlchemy connection
│ │ ├── models.py # Database models (7 tables)
│ │ └── security.py # JWT, bcrypt, RBAC
│ ├── services/ # External integrations
│ │ ├── camera_service.py # Pi camera / webcam / mock
│ │ ├── fc_service.py # MSP flight controller
│ │ ├── yolo_service.py # YOLOv8n detection
│ │ ├── gemini_service.py # Gemini scene analysis
│ │ ├── groq_service.py # Groq chat + transcription
│ │ └── tts_service.py # ElevenLabs TTS
│ ├── schemas/ # Pydantic models
│ └── utils/ # Storage, PDF generator
│
├── frontend/ # Next.js Web Dashboard
│ ├── src/
│ │ ├── app/ # 8 pages (App Router)
│ │ ├── components/
│ │ │ ├── layout/ # Sidebar, Navbar, ThemeToggle
│ │ │ ├── dashboard/ # LiveFeed, Telemetry, Mission, AI
│ │ │ ├── copilot/ # ChatWindow, MessageBubble
│ │ │ ├── media/ # MediaCard, MediaGrid, MediaViewer
│ │ │ ├── missions/ # MissionCard, MissionCompare
│ │ │ └── ui/ # Button, Card, Badge, Modal, Loader
│ │ ├── hooks/ # useTelemetry, useCamera, useMission, useTheme
│ │ ├── lib/ # API client, constants, utils
│ │ └── types/ # TypeScript interfaces
│ └── .env.local # Frontend environment config
│
├── database/
│ └── schema.sql # PostgreSQL schema reference
├── media/ # Stored photos, videos, reports
│ ├── photos/
│ ├── videos/
│ ├── reports/
│ └── audio/
├── scripts/ # Setup & launch scripts
│ ├── setup_pi.sh
│ ├── start_backend.sh
│ └── start_frontend.sh
├── docs/ # Documentation
│ ├── architecture.md
│ ├── api_endpoints.md
│ └── setup_guide.md
├── .env.example # Environment template
└── README.md # This file

text

---

## 🚀 Quick Start

### Prerequisites
- **Python 3.11+** with pip
- **Node.js 20+** with npm
- **Raspberry Pi 4** (for deployment) or Mac/PC (for development)
- **Gemini API Key** ([Get here](https://aistudio.google.com/apikey))
- **Groq API Key** ([Get here](https://console.groq.com/keys))
- **ElevenLabs API Key** ([Get here](https://elevenlabs.io/api)) — Optional for TTS

### 1. Clone & Setup Backend

```bash
# Clone repository
git clone https://github.com/yourusername/aerioai.git
cd aerioai

# Setup backend
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your API keys:
#   GEMINI_API_KEY=your_key
#   GROQ_API_KEY=your_key
#   ELEVENLABS_API_KEY=your_key  (optional)

# Run backend
python main.py
# or: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
API available at: http://localhost:8000 | Docs: http://localhost:8000/docs

2. Setup Frontend
bash
cd ../frontend
npm install

# Configure API URL
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Run development server
npm run dev
Dashboard available at: http://localhost:3000

3. Deploy to Raspberry Pi
bash
# On Raspberry Pi
git clone https://github.com/yourusername/aerioai.git
cd aerioai/backend

# Install dependencies
pip install -r requirements.txt

# Edit .env for Pi
# CAMERA_SOURCE=csi
# FC_MODE=msp

# Run
python main.py
4. Connect Mobile App
Build Flutter APK from mobile/ directory

Connect phone to same WiFi as Pi

Open app — it auto-connects to http://<pi-ip>:8000

🔐 Environment Variables
Backend (backend/.env)
Variable	Description	Default
DATABASE_URL	SQLite or PostgreSQL URL	sqlite:///./aerioai.db
JWT_SECRET_KEY	Secret for JWT tokens	Change in production!
GEMINI_API_KEY	Google Gemini API key	—
GROQ_API_KEY	Groq API key	—
ELEVENLABS_API_KEY	ElevenLabs API key (TTS)	—
CAMERA_SOURCE	webcam, csi, or mock	mock
FC_MODE	msp or mock	mock
FC_PORT	Serial port for FC	/dev/ttyUSB0
Frontend (frontend/.env.local)
Variable	Description	Default
NEXT_PUBLIC_API_URL	Backend API URL	http://localhost:8000
📡 API Endpoints
Authentication
Method	Endpoint	Description
POST	/api/auth/register	Register new user
POST	/api/auth/login	Login, get JWT token
GET	/api/auth/me	Get current user info
Camera
Method	Endpoint	Description
POST	/api/camera/capture	Capture photo
POST	/api/camera/record/start	Start video recording
POST	/api/camera/record/stop	Stop video recording
GET	/api/camera/photos	List photos
GET	/api/camera/videos	List videos
GET	/api/camera/stream	MJPEG live stream
DELETE	/api/camera/{id}	Delete media
Telemetry
Method	Endpoint	Description
GET	/api/telemetry	Full telemetry snapshot
GET	/api/telemetry/gps	GPS data
GET	/api/telemetry/battery	Battery status
GET	/api/telemetry/attitude	Roll/Pitch/Yaw
WS	/api/telemetry/ws	Real-time WebSocket
Missions
Method	Endpoint	Description
POST	/api/missions	Create mission
GET	/api/missions	List missions
GET	/api/missions/{id}	Get mission details
POST	/api/missions/{id}/start	Start mission
POST	/api/missions/{id}/complete	Complete mission
POST	/api/missions/compare	Compare missions (AI)
POST	/api/missions/query	AI query over missions
AI Chat
Method	Endpoint	Description
POST	/api/chat/message	Text chat with AI
POST	/api/chat/voice	Voice command (audio in)
POST	/api/chat/analyze-scene	Deep scene analysis
GET	/api/chat/startup-announcement	Generate startup voice
System
Method	Endpoint	Description
GET	/api/system/health	Full system health
GET	/api/system/stats	Dashboard statistics
GET	/api/system/audit-logs	Audit trail (admin)
🎨 UI Theme
AERIOAI features a Cybersecurity Command Center theme:

Mode	Background	Accent	Style
Dark	#0A0A0A / #101827	#00FFFF (Cyan)	Defense-tech, SOC
Light	#F4F6F9 / #FFFFFF	#0066CC (Blue)	Clean aerospace
Glass morphism effects

Glow borders and shadows

Scan line animations

Live pulse indicators

Monospace font for data

Smooth page transitions

🔮 Roadmap
v1.0 (Current) ✅
FastAPI backend with 6 route modules

SQLite database with 7 tables

YOLOv8n local object detection

Gemini 2.5 scene analysis

Groq voice + chat

ElevenLabs TTS

Next.js dashboard (8 pages)

Dark/Light theme

Mission sessions & knowledge base

PDF report generation

AI Copilot chat interface

System health monitoring

v1.1 (Planned)
WebRTC live streaming

PostgreSQL migration

Redis caching layer

Flutter APK production build

Cloudflare Tunnel for remote access

Spline 3D drone model in dashboard

Push notifications (Firebase)

v2.0 (Future)
Multi-drone support

Real-time video AI analysis

Face detection (anonymized)

Crowd estimation

Fire/smoke detection

Geofencing alerts

Enterprise user management

👨‍💻 Development
Development Mode (Laptop)
bash
# Terminal 1: Backend
cd backend
python main.py

# Terminal 2: Frontend
cd frontend
npm run dev
Backend: http://localhost:8000

Frontend: http://localhost:3000

API Docs: http://localhost:8000/docs

Production Mode (Raspberry Pi)
bash
# Start backend
cd ~/aerioai/backend
uvicorn main:app --host 0.0.0.0 --port 8000 &

# Start frontend
cd ~/aerioai/frontend
npm run build
npm start -- --port 3000 &
🧪 Testing
bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm run lint
npm run build  # Verifies no build errors
📄 License
This project is licensed under the MIT License — see the LICENSE file for details.

🙏 Acknowledgments
Ultralytics YOLO — Object detection

Google Gemini — Scene understanding

Groq — Fast LLM inference

ElevenLabs — Natural TTS

INAV — Flight control firmware

FastAPI — Backend framework

Next.js — Frontend framework

Tailwind CSS — Styling

📞 Contact
Developer: Mohammed Huzaif Mueez

Project: AERIOAI — Mission Intelligence Platform

<p align="center"> <b>🚁 AERIOAI — Intelligence in the Sky 🚁</b> </p>