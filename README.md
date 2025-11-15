# 🌿 EcoScan - Sustainable Fashion Scanner

> HackNYU Fall 2025 Project

A mobile app that scans clothing tags and provides instant eco-impact scores using AI, helping consumers make sustainable fashion choices.

## 🎯 The Idea

Like **Yuka for clothes** - scan any clothing tag with your phone camera and get:
- **Eco-Score** (0-100, A-F grade)
- **Material analysis** (carbon footprint, water usage, microplastics)
- **Origin impact** (labor conditions, transportation)
- **AI explanation** of why this score
- **Improvement tips** for better choices

## 🏗️ Tech Stack

- **Frontend**: React Native + Expo + TypeScript ✅
- **Backend**: Python + FastAPI ⏳
- **Database**: Supabase (PostgreSQL) ⏳
- **AI**: Google Gemini (Vision + Text) ⏳

## 📁 Project Structure

```
HackNYU/
├── workflow.html          # Visual workflow diagram
├── frontend/              # ✅ Mobile app (COMPLETE)
│   ├── src/
│   │   ├── screens/       # Home, Scanner, Results, History
│   │   ├── services/      # API + Mock data
│   │   ├── navigation/    # React Navigation
│   │   └── types/         # TypeScript definitions
│   └── README.md
└── backend/               # ⏳ API server (TODO)
    └── (to be created)
```

## 🚀 Quick Start

### Test the Frontend NOW

```bash
cd frontend
npm install
npm start
```

Then scan QR code with **Expo Go** app on your phone!

📱 See `QUICK_START.md` for detailed instructions.

## ✅ What's Built

### Frontend (Complete!)
- ✅ Camera scanning with framing overlay
- ✅ Image preview and confirmation
- ✅ Results screen with eco-scores
- ✅ Impact flags and AI explanations
- ✅ Scan history with statistics
- ✅ Mock API for testing without backend
- ✅ Full TypeScript typing
- ✅ Error handling and loading states

### Backend (Next Steps)
- ⏳ FastAPI server setup
- ⏳ Gemini Vision API integration (extract material + country)
- ⏳ Scoring algorithm (calculate eco-impact)
- ⏳ Gemini Text API (generate explanations)
- ⏳ Supabase database (store scans + rules)
- ⏳ RESTful API endpoints

## 📊 Workflow

```
1. User scans clothing tag → 📸
2. Send image to backend → 📤
3. Gemini Vision extracts info → 🔍
4. Calculate eco-score → 📊
5. Generate AI explanation → 💬
6. Save to database → 💾
7. Display results in app → 📱
```

**Steps 1, 2, 7**: ✅ Complete  
**Steps 3, 4, 5, 6**: ⏳ Backend needed

See `workflow.html` for visual diagram!

## 📚 Documentation

- **`QUICK_START.md`** - Test the app in 2 minutes
- **`SETUP_COMPLETE.md`** - Frontend setup details
- **`PROJECT_STRUCTURE.md`** - Full architecture
- **`frontend/README.md`** - Frontend documentation
- **`workflow.html`** - Visual workflow (open in browser)

## 🎨 Features Demo

### Scanner Screen
<img src="docs/scanner-demo.jpg" width="300" alt="Scanner">

- Live camera with overlay
- Gallery picker option
- Image preview
- Loading state

### Results Screen
<img src="docs/results-demo.jpg" width="300" alt="Results">

- Color-coded eco-score
- Material and origin info
- Impact flags
- AI explanation
- Improvement tips

### History Screen
<img src="docs/history-demo.jpg" width="300" alt="History">

- All past scans
- Statistics dashboard
- Pull to refresh

## 🔧 Development

### Frontend
```bash
cd frontend
npm start        # Start Expo dev server
npm run android  # Open on Android
npm run ios      # Open on iOS (Mac only)
```

### Backend (Coming Soon)
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## 🌟 MVP Features

- [x] Mobile app with camera
- [x] Scan clothing tags
- [x] Display eco-scores
- [x] Show material impact
- [x] Scan history
- [ ] Real Gemini AI integration
- [ ] Database persistence
- [ ] User authentication

## 🏆 Hackathon Demo Ready

**You can demo the app RIGHT NOW!**

The frontend works with realistic mock data:
- Scan any tag with camera
- Get instant eco-scores
- View explanations
- Check history

Perfect for UI/UX presentation while backend is built!

## 🤝 Team

Built for HackNYU Fall 2025

## 📄 License

MIT License

---

**Current Status**: Frontend Complete ✅ | Backend In Progress ⏳

**Next Step**: Build FastAPI backend with Gemini integration

See `SETUP_COMPLETE.md` for detailed status!