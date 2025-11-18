# 🌿 (1st Place) HackNYU Fall 2025 Project 🎉🏆

> EcoScan - Sustainbility Track HackNYU Fall '25

A mobile app that scans clothing tags and provides instant eco-impact scores using AI, helping consumers make sustainable fashion choices.

## 🎯 The Problem

The fashion industry is the **second-largest polluter globally**, responsible for 10% of global carbon emissions. Yet when shopping, consumers have no way to assess the environmental impact of their clothing. Tags show fabric and origin, but not sustainability data. **We need transparency at the point of purchase.**

## 💡 Our Solution

**EcoScan** - Like Yuka for clothes. Scan any clothing tag with your phone camera and instantly get:

- **Eco-Score (0-100, A-F grade)** - Clear sustainability rating
- **Material analysis** - Carbon footprint, water usage, microplastics
- **Origin impact** - Labor conditions, transportation emissions
- **AI-powered explanation** - Gemini explains why this score
- **5 sustainable alternatives** - Real products from real retailers with better scores
- **Personalized picks** - AI recommends products based on your scan history
- **Progress tracking** - Monitor your sustainability improvement over time

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

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      MOBILE APP (React Native)                  │
├─────────────────────────────────────────────────────────────────┤
│  📱 Scanner    │  📊 Results   │  📚 History   │  ⭐ Picks     │
│  Two-stage     │  Eco-score    │  Scan stats   │  Personalized │
│  camera        │  Alternatives │  Progress     │  recommends   │
└────────────┬────────────────────────────────────────────────────┘
             │ HTTPS POST (multipart/form-data)
             │ /api/scan: tag_image + clothing_image
             │ /api/picks: scan_history + reference_image
             ▼
┌─────────────────────────────────────────────────────────────────┐
│              BACKEND API (Python FastAPI)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────── SCAN PIPELINE ───────────────────┐  │
│  │                                                            │  │
│  │  CLOTHING IMAGE          TAG IMAGE                        │  │
│  │       │                      │                            │  │
│  │       ▼                      ▼                            │  │
│  │  ┌─────────┐          ┌──────────┐                       │  │
│  │  │ Lykdat  │          │  Google  │                       │  │
│  │  │ Deep    │          │  Cloud   │                       │  │
│  │  │ Tag API │          │  Vision  │                       │  │
│  │  │         │          │   OCR    │                       │  │
│  │  └────┬────┘          └────┬─────┘                       │  │
│  │       │                    │                              │  │
│  │       │ (If Lykdat fails)  │                             │  │
│  │       │  ┌──────────────┐  │                             │  │
│  │       └──│ Fallback:    │  │                             │  │
│  │          │ Vision OCR + │  │                             │  │
│  │          │ Gemini Parse │  │                             │  │
│  │          └──────┬───────┘  │                             │  │
│  │                 │           │                             │  │
│  │                 └───────────┘                             │  │
│  │                      │                                    │  │
│  │                      ▼                                    │  │
│  │       ┌──────────────────────┐                           │  │
│  │       │  Combined Deep Tag   │                           │  │
│  │       │     Metadata         │                           │  │
│  │       │ (Clothing + Tag OCR) │                           │  │
│  │       └──────────┬───────────┘                           │  │
│  │                  │                                        │  │
│  │         ┌────────┴────────┐                              │  │
│  │         ▼                 ▼                              │  │
│  │  ┌───────────┐   ┌─────────────────┐                    │  │
│  │  │ Eco-Score │   │ Lykdat Global   │                    │  │
│  │  │Calculator │   │ Search (Reverse │                    │  │
│  │  │  (0-100)  │   │  Image Lookup)  │                    │  │
│  │  └───────────┘   └────────┬────────┘                    │  │
│  │                           │                              │  │
│  │                           ▼                              │  │
│  │                  ┌──────────────┐                        │  │
│  │                  │ ~40 Similar  │                        │  │
│  │                  │  Products    │                        │  │
│  │                  └──────┬───────┘                        │  │
│  │                         │                                │  │
│  │                         ▼                                │  │
│  │              ┌────────────────────┐                      │  │
│  │              │ Deep Tag Each      │                      │  │
│  │              │ Product (~40x)     │                      │  │
│  │              └────────┬───────────┘                      │  │
│  │                       │                                  │  │
│  │                       ▼                                  │  │
│  │              ┌────────────────────┐                      │  │
│  │              │ Calculate Eco-Score│                      │  │
│  │              │ For Each (~40x)    │                      │  │
│  │              └────────┬───────────┘                      │  │
│  │                       │                                  │  │
│  │                       ▼                                  │  │
│  │              ┌────────────────────┐                      │  │
│  │              │ Return Alternatives│                      │  │
│  │              │ with Eco-Scores    │                      │  │
│  │              └────────────────────┘                      │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌──────────────────────── PICKS PIPELINE ──────────────────┐ │
│  │                                                           │ │
│  │  SCAN HISTORY (JSON)     REFERENCE IMAGE                 │ │
│  │       │                      │                           │ │
│  │       ▼                      │                           │ │
│  │  ┌─────────────┐             │                           │ │
│  │  │   Gemini    │             │                           │ │
│  │  │  Analysis   │             │                           │ │
│  │  │  - Common   │             │                           │ │
│  │  │    materials│             │                           │ │
│  │  │  - Avg score│             │                           │ │
│  │  │  - Style    │             │                           │ │
│  │  └──────┬──────┘             │                           │ │
│  │         │                    │                           │ │
│  │         ▼                    ▼                           │ │
│  │  ┌────────────────────────────────┐                     │ │
│  │  │  Select Best Representative    │                     │ │
│  │  │  Scan from History             │                     │ │
│  │  └────────────┬───────────────────┘                     │ │
│  │               │                                          │ │
│  │               ▼                                          │ │
│  │  ┌──────────────────────┐                               │ │
│  │  │ Lykdat Global Search │                               │ │
│  │  │ (Reference Image)    │                               │ │
│  │  └──────────┬───────────┘                               │ │
│  │             │                                            │ │
│  │             ▼                                            │ │
│  │  ┌──────────────────────┐                               │ │
│  │  │ Filter by User       │                               │ │
│  │  │ Preferences:         │                               │ │
│  │  │ - Material match     │                               │ │
│  │  │ - Score >= avg×0.9   │                               │ │
│  │  └──────────┬───────────┘                               │ │
│  │             │                                            │ │
│  │             ▼                                            │ │
│  │  ┌──────────────────────┐                               │ │
│  │  │ Return Top 10 Picks  │                               │ │
│  │  └──────────────────────┘                               │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                          │
                   ┌──────▼──────┐
                   │  Supabase   │
                   │ PostgreSQL  │
                   │ Cloud Sync  │
                   └─────────────┘
```

### Algorithm Deep Dive

#### **Scan Algorithm** (`POST /api/scan`)

**Inputs:** 
- `clothing_image` - Photo of full clothing item
- `tag_image` - Photo of clothing tag

**Process:**

1. **Clothing Image → Lykdat Deep Tag API**
   - Primary: Lykdat analyzes clothing image
   - Extracts: item type, colors, patterns, visible brands
   - Returns: Structured JSON with visual metadata
   - **Fallback (if Lykdat fails):** 
     * Google Cloud Vision OCR on clothing image
     * Gemini 2.5-flash parses visual elements
     * Generates equivalent structured metadata

2. **Tag Image → Google Cloud Vision OCR**
   - Extracts text from clothing tag
   - Captures: material composition, origin country, care instructions, brand

3. **Combine Metadata**
   - Merge clothing deep tag (or fallback) + tag OCR
   - Result: Complete product profile
   ```json
   {
     "item_type": "t-shirt",
     "colors": ["blue", "white"],
     "material": "80% organic cotton, 20% recycled polyester",
     "origin": "Portugal",
     "brand": "Patagonia",
     "certifications": ["GOTS"]
   }
   ```

4. **Generate Eco-Score**
   - Input: Combined deep tag metadata
   - Calculate material impact (1-5 scale):
     * Natural fibers (cotton, linen, hemp): 1-2
     * Synthetics (polyester, nylon): 4-5
   - Calculate origin impact (labor + transport)
   - Apply certification bonuses
   - Output: 0-100 score with A-F grade

5. **Reverse Image Search**
   - Use combined metadata for Lykdat Global Search
   - Query returns ~40 similar products from retailers
   - Each product includes: title, brand, price, URL

6. **Deep Tag Alternatives (~40x)**
   - For each of ~40 products:
     * Fetch product page HTML
     * Parse with Gemini for material/origin
     * Calculate eco-score

7. **Return Alternatives**
   - Return all alternatives with eco-scores
   - Frontend displays with direct product links

**Output:**
```json
{
  "ecoScore": 75,
  "grade": "B",
  "material": "80% organic cotton, 20% recycled polyester",
  "origin": "Portugal",
  "similarProducts": [
    {
      "title": "Similar Organic Tee",
      "ecoScore": 85,
      "url": "https://...",
      "price": "32.00",
      "currency": "USD"
    },
    // ... ~40 alternatives with eco-scores
  ]
}
```

#### **Picks Algorithm** (`POST /api/picks`)

**Inputs:**
- `scan_history` - JSON array of user's past scans
- `reference_image` - Optional reference image from best scan

**Process:**

1. **Gemini History Analysis**
   - Send full scan history to Gemini 2.5-flash
   - Extract patterns:
     ```json
     {
       "common_materials": ["organic cotton", "linen"],
       "average_eco_score": 72.5,
       "style_summary": "User prefers natural materials...",
       "preferred_countries": ["Portugal", "USA"]
     }
     ```

2. **Select Best Representative Scan**
   - Score each scan from history:
     * Material match with user's common materials: +30 points
     * Above-average eco-score: +20 points
     * Recency (recent scans): +10 points
   - Pick highest-scoring scan as reference

3. **Lykdat Global Search**
   - Use reference scan's image for similarity search
   - Returns products matching visual style
   - Processes ~15 candidates

4. **Filter by User Preferences**
   - Keep products where:
     * Material matches common_materials → +10 points
     * Eco-score >= user's average × 0.9
     * Not already in user's history

5. **Rank & Return**
   - Sort by match score
   - Return top 10 personalized picks
   - Each with direct product URL

**Output:**
```json
{
  "picks": [
    {
      "title": "Hemp Blend T-Shirt",
      "ecoScore": 88,
      "material": "55% hemp, 45% organic cotton",
      "url": "https://...",
      "matchReason": "Matches your preference for natural fibers"
    }
  ],
  "analysis": {
    "common_materials": ["organic cotton", "linen"],
    "average_eco_score": 72.5
  }
}
```

### Tech Stack Details

**Frontend**
- React Native + Expo (iOS/Android from one codebase)
- TypeScript (type safety)
- React Navigation (tab + stack navigation)
- Axios (HTTP client)
- AsyncStorage → Supabase (local-first, cloud-synced storage)
- expo-camera + expo-image-picker (image capture)

**Backend**
- Python 3.10+ + FastAPI (async REST API)
- Uvicorn (ASGI server)
- Google Gemini 2.5-flash (AI parsing & analysis)
- Google Cloud Vision (OCR)
- Lykdat Fashion AI (image tagging & product search)
- Supabase (PostgreSQL cloud database)

## 🗂️ Project Structure

```
HackNYU/
├── analyze/                       # Backend API server
│   ├── api_server.py              # FastAPI app with endpoints
│   ├── tagging.py                 # Lykdat + Google Vision integration
│   ├── ecoscore.py                # Eco-score calculation algorithm
│   ├── similar_search.py          # Product search & alternatives
│   ├── base.py                    # Data models (ProductMetadata, EcoScore)
│   ├── helper.py                  # Utility functions
│   ├── requirements.txt           # Python dependencies
│   └── README.md                  # Backend documentation
├── frontend/                      # React Native mobile app
│   ├── src/
│   │   ├── screens/
│   │   │   ├── HomeScreen.tsx            # Landing page
│   │   │   ├── ScannerScreen.tsx         # Two-stage camera capture
│   │   │   ├── ResultsScreen.tsx         # Eco-score & alternatives
│   │   │   ├── RecommendationsScreen.tsx # Personalized picks (AI-driven)
│   │   │   ├── RecommendationDetailScreen.tsx # Pick details & alternatives
│   │   │   ├── HistoryScreen.tsx         # Scan history with stats
│   │   │   ├── SearchScreen.tsx          # Search scanned items
│   │   │   ├── DatabaseScreen.tsx        # Browse material database
│   │   │   └── AccountScreen.tsx         # User profile
│   │   ├── services/
│   │   │   ├── api.ts             # Backend HTTP client
│   │   │   ├── storage.ts         # AsyncStorage + Supabase wrapper
│   │   │   └── supabase.ts        # Supabase client config
│   │   ├── components/
│   │   │   └── SwipeableTab.tsx   # Swipeable tab navigation
│   │   ├── navigation/
│   │   │   └── AppNavigator.tsx   # Tab + Stack navigation setup
│   │   └── types/
│   │       └── index.ts           # TypeScript interfaces
│   ├── package.json               # Node.js dependencies
│   └── README.md                  # Frontend documentation
└── README.md                      # This file
```

## ✨ Key Features

### 1. Two-Stage Scanning
- Capture clothing tag (for material/origin data)
- Capture full clothing item (for visual analysis)
- Real-time processing with loading states

### 2. AI-Powered Analysis
- **Lykdat Deep Tagging**: Identifies clothing type, colors, brands, labels
- **Google Vision OCR**: Extracts text from clothing tags
- **Gemini Parsing**: Structures data into JSON (material, origin, certifications)
- **Eco-Score Algorithm**: Calculates 0-100 score based on:
  - Material impact (microplastics, biodegradability, carbon)
  - Origin impact (labor conditions, transportation)
  - Certifications (GOTS, Fair Trade, B-Corp)

### 3. Sustainable Alternatives
- For each scan, find 5 real sustainable products
- Ranked by eco-score and material matching
- Direct links to purchase from real retailers
- Clickable product cards with "View Product" buttons

### 4. Personalized Picks
- AI analyzes your entire scan history with Gemini
- Identifies your common materials and average eco-score
- Uses smart rotation through your best scans as reference images
- Recommends products matching your style but with better sustainability
- Only refreshes on new scans (not on navigation)

### 5. Progress Tracking
- Scan history with local + cloud storage
- Statistics: Total scans, average score, improvement trend
- Compare recent vs. older scans to see if you're getting more sustainable
- Offline access to all past scans

## 📊 How It Works - Deep Dive

### Scanning Flow
```
1. 📸 Tag Capture → User photographs clothing tag
2. 📸 Clothing Capture → User photographs full item
3. ⬆️  Upload → Both images sent via multipart/form-data to POST /api/scan
4. 🔍 Lykdat Deep Tagging → Analyzes clothing image
   - Detects item type (shirt, pants, dress)
   - Extracts colors, patterns, style
   - Identifies visible brand labels
5. 📝 Google Vision OCR → Extracts text from tag
   - Material composition (e.g., "80% cotton, 20% polyester")
   - Country of origin (e.g., "Made in Bangladesh")
   - Care instructions, brand name
6. 🤖 Gemini Parsing → Structures raw data into JSON
   {
     "material": "80% organic cotton, 20% recycled polyester",
     "origin": "Portugal",
     "certifications": ["GOTS", "Fair Trade"],
     "brand": "Patagonia"
   }
7. 📊 Eco-Score Calculation
   - Material impact: 1-5 scale (lower = better)
     * Natural fibers (cotton, linen, hemp): 1-2
     * Synthetics (polyester, nylon): 4-5
   - Origin impact: Labor conditions + transport distance
   - Certifications: Boost score (GOTS, Fair Trade, B-Corp)
   - Final score: 0-100 with A-F grade
8. 🔎 Similar Product Search → Lykdat finds alternatives
   - Global search across fashion retailers
   - Filters by material type and style
   - Returns ~15 candidates
9. ⚖️  Filter & Rank Alternatives
   - Calculate eco-score for each product
   - Prioritize: eco-score >= user's avg × 0.9
   - Material matching gets bonus points
   - Return top 5 with product links
10. 💾 Storage → Save to AsyncStorage + Supabase
    - Local-first (works offline)
    - Cloud sync for cross-device access
11. 📱 Display Results
    - Show eco-score with color-coded badge
    - AI-generated explanation
    - Improvement tips
    - 5 clickable sustainable alternatives
```

### Personalized Picks Flow
```
1. 📊 Check Scan Count → Need 3+ scans minimum
2. 📚 Load History → Get last 20 scans from Supabase/local
3. 🤖 Gemini Analysis → Analyze full history
   - Extract common materials user buys
   - Calculate average eco-score
   - Identify style preferences
4. 🎯 Smart Reference Selection
   - Filter high-scoring scans (≥60)
   - Use rotation algorithm: scanCount % highScoringCount
   - Different reference image on each new scan = variety
5. 🔍 Lykdat Search → Find similar items to reference
6. ⚖️  Filter by Preferences
   - Must match common materials (+30 points)
   - Must be >= user's avg score × 0.9
   - Prioritize recent scans
7. 📱 Display Picks
   - Show 10 personalized recommendations
   - Each with "View Product" link
   - Only refresh on new scans (tracked via persistent storage)
```

## ✅ Current Status - Fully Functional

**Core Features**: ✅ All working with production AI APIs

### Implemented & Working
- ✅ Two-stage camera capture (tag + clothing)
- ✅ Real-time AI processing (15-30 seconds per scan)
- ✅ Lykdat fashion AI deep tagging
- ✅ Google Cloud Vision OCR extraction
- ✅ Gemini 2.5-flash AI parsing & analysis
- ✅ Eco-score calculation (0-100, A-F grade)
- ✅ Material & origin impact analysis
- ✅ 5 sustainable alternatives per scan with real product links
- ✅ Personalized picks based on scan history
- ✅ Smart rotation algorithm for variety in recommendations
- ✅ Scan history with cloud sync (Supabase)
- ✅ Statistics dashboard (total scans, avg score, improvement trend)
- ✅ Offline-first with AsyncStorage + cloud sync
- ✅ Only refreshes picks on new scans (not on navigation)
- ✅ Direct product links to retailers

### Known Limitations
- ⚠️ Lykdat API has rate limits (deep tagging quota)
- ⚠️ Backend runs locally (not deployed to production)
- ⚠️ Search screen uses mock data (Supabase catalog not fully populated)

### Future Enhancements
- 🔄 Deploy backend to Railway/Render/AWS
- 🔄 Build global product catalog in Supabase
- 🔄 Add user authentication
- 🔄 Social features (share scans, compare with friends)
- 🔄 Carbon footprint calculator for wardrobe
- 🔄 Brand sustainability ratings database

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
