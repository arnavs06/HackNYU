# 🔧 EcoScan Backend - Analysis API

Python FastAPI server that powers EcoScan's clothing sustainability analysis.

## 📋 What This Does

Provides REST API endpoint for analyzing clothing:
- **Deep tagging** clothing images with Lykdat fashion AI
- **OCR extraction** from clothing tags using Google Cloud Vision
- **AI parsing** with Google Gemini to structure data
- **Eco-score calculation** (0-100) based on material & origin impact
- **Similar product search** to find 5 sustainable alternatives

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd analyze
pip install -r requirements.txt
```

**Required packages**: `fastapi`, `uvicorn`, `google-generativeai`, `google-cloud-vision`, `requests`, `pillow`, `python-dotenv`, `python-multipart`

### 2. Configure API Keys

```bash
cp .env.example .env
```

Edit `.env` and add your keys:

```env
GEMINI_API_KEY=AIzaSy...
LYKDAT_API_KEY=your_lykdat_key
GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\service-account.json
```

**Get API keys**:
- **Gemini**: https://makersuite.google.com/app/apikey (Google AI Studio)
- **Lykdat**: Contact Lykdat for fashion API access
- **Google Cloud Vision**: Create service account at https://console.cloud.google.com
  - Go to IAM & Admin → Service Accounts → Create
  - Grant "Cloud Vision API User" role
  - Create JSON key → Download as `message.json`
  - Set path in `GOOGLE_APPLICATION_CREDENTIALS`

### 3. Start Server

```bash
python api_server.py
```

**Server runs on**: `http://localhost:8000`  
**API docs**: `http://localhost:8000/docs` (interactive Swagger UI)

## 📡 API Endpoints

### `POST /api/scan`

Analyze clothing from tag + clothing images.

**Request** (multipart/form-data):
```
tag_image: File (clothing tag photo)
clothing_image: File (full clothing item photo)
user_id: string (optional)
```

**Response** (JSON):
```json
{
  "ecoScore": 50,
  "grade": "C",
  "material": "Cotton (Organic)",
  "origin": "India",
  "brand": "H&M Conscious",
  "productName": "Organic Cotton T-Shirt",
  "impacts": {
    "microplastic": 1,
    "carbon": 3,
    "water": 2,
    "labor": 2
  },
  "explanation": "This organic cotton...",
  "certifications": ["GOTS", "Fair Trade"],
  "similarProducts": [
    {
      "id": "prod_123",
      "title": "Patagonia Organic Tee",
      "ecoScore": 85,
      "grade": "A",
      "price": 45.00,
      "currency": "USD"
    }
  ]
}
```

**Testing with curl**:
```bash
curl -X POST "http://localhost:8000/api/scan" \
  -F "tag_image=@tag.jpg" \
  -F "clothing_image=@clothing.jpg" \
  -F "user_id=test_user"
```

## 📁 Module Structure

### Core Modules

- **`api_server.py`** (380 lines)
  - FastAPI REST API server
  - `POST /api/scan` endpoint
  - Image processing and response transformation
  - Error handling and logging

- **`tagging.py`**
  - `tag_image_to_tag_metadata()`: Google Vision OCR for tag text
  - `tag_image_to_image_metadata()`: Lykdat deep tagging for clothing
  - Extracts material, origin, brand, colors, items

- **`ecoscore.py`**
  - `compute_eco_score()`: Calculate 0-100 score
  - Material impact: Cotton=3, Polyester=5, Organic=1
  - Origin impact: China=3, Bangladesh=4, Fair Trade=2
  - Formula: `100 - ((material_impact + origin_impact) * 10)`

- **`similar_search.py`**
  - `search_similar_products()`: Find alternatives using Lykdat
  - Returns 5 similar products ranked by eco-score
  - Filters by category, color, style

- **`base.py`**
  - Data classes: `ProductMetadata`, `EcoScore`, `ScoredProduct`
  - Type definitions for internal data flow

- **`helper.py`**
  - Utility functions: `get_env()`, `safe_get()`, `load_image()`
  - Environment variable access

- **`load_env.py`**
  - Loads `.env` file at module import
  - Validates required API keys

## 🔐 Security

### DO NOT COMMIT:
- ❌ `.env` - Contains API keys
- ❌ `*.json` - Google Cloud service account credentials
- ❌ `__pycache__/` - Python bytecode

### Safe to commit:
- ✅ `.env.example` - Template with placeholder values
- ✅ `.gitignore` - Protects sensitive files
- ✅ `*.py` - Source code
- ✅ `requirements.txt` - Dependencies

**Before pushing**:
```bash
# Verify sensitive files are ignored
git check-ignore .env message.json

# Should output:
# .env
# message.json
```

## 🧪 Testing

### Run the server:
```bash
python api_server.py
```

**Expected output**:
```
✓ Loaded environment variables
INFO:     Started server process
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Test with frontend:
1. Start this backend: `python api_server.py`
2. Start frontend: `cd ../frontend && npm start`
3. Scan images in mobile app
4. Backend logs: `📸 Processing scan for user: anonymous`
5. Backend logs: `✅ Scan complete! Score: XX/100`

### Verify processing time:
- Typical scan: 15-30 seconds
- Lykdat API: 5-10s
- Google Vision OCR: 2-5s
- Gemini parsing: 3-8s
- Eco-score + alternatives: 5-10s

## 🚀 Production Deployment

### Deploy to Railway/Render:

1. Add environment variables in dashboard:
   - `GEMINI_API_KEY`
   - `LYKDAT_API_KEY`
   - `GOOGLE_APPLICATION_CREDENTIALS` (paste JSON content)

2. Update frontend API URL:
   ```typescript
   // frontend/src/services/api.ts
   const API_BASE_URL = 'https://your-app.railway.app/api'
   ```

3. Deploy:
   ```bash
   git push railway main
   ```

### Health check:
```bash
curl https://your-app.railway.app/
# Returns: {"message": "EcoScan API is running"}
```

## 🛠️ Troubleshooting

**ModuleNotFoundError: No module named 'analyze'**
- ✅ Fixed: All imports use relative imports (`from tagging` not `from analyze.tagging`)
- Run from analyze directory: `cd analyze && python api_server.py`

**LYKDAT_API_KEY not found**
- Check `.env` file exists in `analyze/` directory
- Verify key is set: `LYKDAT_API_KEY=your_key`
- Restart server after editing `.env`

**Google Cloud Vision errors**
- Verify service account JSON exists
- Check path in `GOOGLE_APPLICATION_CREDENTIALS` is absolute
- Enable Cloud Vision API in Google Cloud Console

**Frontend timeout (300s)**
- Normal for first scan (cold start)
- Subsequent scans: 15-30s
- Check backend logs for actual processing time

## 📊 API Response Time

| Stage | Time | 
|-------|------|
| Image upload | 1-2s |
| Lykdat tagging | 5-10s |
| Google Vision OCR | 2-5s |
| Gemini AI parsing | 3-8s |
| Eco-score calculation | <1s |
| Similar product search | 5-10s |
| **Total** | **15-30s** |

## 🤝 Contributing

Part of HackNYU Fall 2025 project. See main [`../README.md`](../README.md) for overview.
