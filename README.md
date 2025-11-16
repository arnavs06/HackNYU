# 🌿 EcoScan - Sustainable Fashion Scanner

> HackNYU Fall 2025 Project

A mobile app that scans clothing tags and provides instant eco-impact scores using AI, helping consumers make sustainable fashion choices.

## 🎯 What It Does

Like **Yuka for clothes** - scan any clothing tag with your phone camera and get:
- **Eco-Score** (0-100, A-F grade) 
- **Material analysis** (carbon footprint, water usage, microplastics)
- **Origin impact** (labor conditions, transportation)
- **AI explanation** powered by Gemini
- **5 sustainable alternatives** for each scanned item
- **Scan history & statistics**

## 🚀 Quick Start

### 1. Backend Setup (Python API Server)

```bash
cd analyze
pip install -r requirements.txt

# Configure API keys
cp .env.example .env
# Edit .env and add your API keys (GEMINI_API_KEY, LYKDAT_API_KEY)

# Start server
python api_server.py
```

**Server runs on**: `http://localhost:8000` • **API docs**: `http://localhost:8000/docs`

📖 **Detailed backend setup**: See [`analyze/README.md`](./analyze/README.md)

### 2. Frontend Setup (React Native Mobile App)

```bash
cd frontend
npm install

# Update API URL in src/services/api.ts if testing on physical device
# (Replace localhost with your computer's IP address)

npm start
```

Then press `a` for Android, `i` for iOS, or scan QR with Expo Go app!

📖 **Detailed frontend setup**: See [`frontend/README.md`](./frontend/README.md)

## 🏗️ Project Structure

```
HackNYU/
├── analyze/               # Backend API server + AI algorithms
│   ├── api_server.py      # FastAPI REST API 
│   ├── tagging.py         # Lykdat image tagging + Google Vision OCR
│   ├── ecoscore.py        # Eco-score calculation (0-100)
│   ├── similar_search.py  # Find sustainable product alternatives
│   └── README.md          # Backend documentation
├── frontend/              # React Native mobile app
│   ├── src/
│   │   ├── screens/       # Scanner, Results, History screens
│   │   ├── services/      # API client + Local storage
│   │   └── navigation/    # Tab navigation
│   └── README.md          # Frontend documentation
└── README.md              # This file (quick start)
```

## 🎨 Tech Stack

**Frontend**: React Native + Expo + TypeScript + AsyncStorage  
**Backend**: Python + FastAPI + Uvicorn  
**AI/APIs**: Google Gemini + Google Cloud Vision + Lykdat Fashion AI  
**Storage**: AsyncStorage (local) → Supabase (future for global search)

## 📊 How It Works

```
1. User captures tag image       → 📸
2. User captures clothing image   → 📸
3. Both sent to backend API      → POST /api/scan
4. Lykdat analyzes clothing      → Deep tagging (colors, items, labels)
5. Google Vision extracts tag text → OCR (material, origin, brand)
6. Gemini parses structured data → AI parsing to JSON
7. Calculate eco-score           → 0-100 score from impact ratings
8. Find similar products         → Lykdat global search
9. Score alternatives            → 5 sustainable options
10. Return to frontend           → Display results + save locally
```

## ✅ Current Status

**Core Scanning**: ✅ Fully integrated with real AI backend  
**Features Working**:
- Two-stage image capture (tag + clothing)
- Real-time AI processing (15-30 seconds)
- Eco-score calculation (0-100, A-F grade)
- Material & origin impact analysis
- 5 sustainable product alternatives per scan
- Local scan history with statistics
- Offline access to past scans

**TODO**:
- Deploy backend to production (Railway/Render)
- Add Supabase for global search database
- Update Search/Recommendations screens to use database

## 🧪 Testing

1. Start backend: `cd analyze && python api_server.py`
2. Start frontend: `cd frontend && npm start`
3. Open Scanner tab → capture tag image → capture clothing image
4. Wait 15-30 seconds for processing
5. View results with eco-score and alternatives
6. Check History tab to see saved scans

**Expected**: Backend logs "✅ Scan complete! Score: XX/100", frontend displays results

## 🔑 Required API Keys

Create `analyze/.env`:
```env
GEMINI_API_KEY=your_key_from_makersuite
LYKDAT_API_KEY=your_key_from_lykdat
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
```

**Get keys**:
- **Gemini**: https://makersuite.google.com/app/apikey
- **Lykdat**: Contact Lykdat for fashion API access
- **Google Cloud**: Create service account at https://console.cloud.google.com

⚠️ **Security**: Never commit `.env` or `*.json` credential files to git!

## 📖 Documentation

- **Backend details**: [`analyze/README.md`](./analyze/README.md) - API server, algorithms, configuration
- **Frontend details**: [`frontend/README.md`](./frontend/README.md) - App architecture, screens, services

## 🤝 Contributing

Built for HackNYU Fall 2025

## 📄 License

MIT