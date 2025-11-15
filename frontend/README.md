# 🌿 EcoScan Frontend

Mobile app for scanning clothing tags and getting eco-impact scores using React Native + Expo + TypeScript.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your phone (for testing)
- iOS Simulator (Mac) or Android Emulator (optional)

### Installation

```bash
cd frontend
npm install
```

### Running the App

```bash
# Start Expo development server
npm start

# Or specific platforms:
npm run android  # Android emulator/device
npm run ios      # iOS simulator (Mac only)
npm run web      # Web browser
```

### Testing on Your Phone

1. Install **Expo Go** app from App Store or Google Play
2. Run `npm start` 
3. Scan the QR code with your phone's camera
4. The app will open in Expo Go

## 📱 App Structure

```
src/
├── navigation/
│   └── AppNavigator.tsx      # React Navigation setup
├── screens/
│   ├── HomeScreen.tsx         # Landing page with features
│   ├── ScannerScreen.tsx      # Camera/scanner (Step 1)
│   ├── ResultsScreen.tsx      # Display eco-score (Step 7)
│   └── HistoryScreen.tsx      # Scan history & stats
├── services/
│   ├── api.ts                 # Real API service (for backend)
│   └── mockApi.ts             # Mock API (for testing without backend)
├── types/
│   └── index.ts               # TypeScript definitions
└── components/                # Reusable components
```

## 🔄 Workflow Implementation

### ✅ Completed Steps

1. **Step 1: Scan Tag** (`ScannerScreen.tsx`)
   - Camera integration with expo-camera
   - Image picker for gallery photos
   - Capture preview and retake functionality

2. **Step 2: Send to Backend** (`api.ts`)
   - API service with axios
   - Image upload as multipart/form-data
   - Error handling and interceptors
   - Mock service for testing

3. **Step 7: Display Results** (`ResultsScreen.tsx`)
   - Eco-score with color-coded grades
   - Material and country display
   - Impact flags
   - AI explanation
   - Improvement tips
   - Share functionality

4. **History Feature** (`HistoryScreen.tsx`)
   - List of all scans
   - User statistics (average score, total scans, improvement)
   - Pull-to-refresh
   - Click to view details

## 🔌 Connecting to Backend

Currently using **Mock API** for testing. To connect to real backend:

1. Update `src/services/api.ts`:
```typescript
const API_BASE_URL = 'http://YOUR_BACKEND_URL:8000/api';
```

2. In your screens, replace:
```typescript
import { mockApiService } from '../services/mockApi';
// with
import { apiService } from '../services/api';
```

3. Make sure your backend is running and accessible

### API Endpoints Expected

```
POST   /api/scan              - Upload image, get scan result
GET    /api/history/:userId   - Get scan history
GET    /api/scan/:scanId      - Get single scan details
DELETE /api/scan/:scanId      - Delete scan
GET    /api/stats/:userId     - Get user statistics
```

## 🧪 Mock API

The `mockApi.ts` generates realistic fake data for testing:
- Random materials (polyester, cotton, linen, etc.)
- Random countries with labor risk levels
- Calculated eco-scores (0-100)
- AI-like explanations
- Improvement tips

Perfect for UI development and demos without backend!

## 📦 Key Dependencies

- **expo**: ~52.0.28 - React Native framework
- **expo-camera**: Latest - Camera access
- **expo-image-picker**: Latest - Gallery access
- **axios**: Latest - HTTP client
- **@react-navigation/native**: Latest - Navigation
- **react-native-screens**: Latest - Native screen optimization
- **react-native-safe-area-context**: Latest - Safe area handling

## 🎨 Design System

### Colors
- Primary: `#667eea` (Purple)
- Success: `#48bb78` (Green)
- Warning: `#ed8936` (Orange)
- Danger: `#f56565` (Red)
- Background: `#f7fafc` (Light Gray)

### Score Grading
- A (80-100): Green `#48bb78`
- B (60-79): Yellow `#ecc94b`
- C (40-59): Orange `#ed8936`
- D (20-39): Red `#f56565`
- F (0-19): Dark Red `#c53030`

## 🔧 Development Tips

### Debugging
```bash
# Clear cache if having issues
npm start -- --clear

# View logs
npm start -- --dev-client
```

### Camera Testing
- **Physical device recommended** for best camera experience
- Simulators have limited camera support
- Use image picker as fallback for testing

### TypeScript
All types are defined in `src/types/index.ts`. The app is fully typed!

## 📱 Features Checklist

- ✅ Camera scanning with framing overlay
- ✅ Image preview and confirmation
- ✅ Loading states during processing
- ✅ Eco-score visualization
- ✅ Material and country display
- ✅ Impact flags with severity colors
- ✅ AI explanation text
- ✅ Improvement tips
- ✅ Scan history with stats
- ✅ Pull-to-refresh
- ✅ Share results
- ✅ Responsive design
- ✅ Error handling
- ⏳ User authentication (TODO)
- ⏳ Offline mode (TODO)

## 🚀 Next Steps

1. **Connect to Backend**
   - Update API URLs
   - Test real Gemini Vision responses
   - Verify scoring algorithm

2. **Add Authentication**
   - User sign up/login
   - Secure API requests
   - User profile management

3. **Enhance Features**
   - Alternative product suggestions
   - Brand database integration
   - Social sharing improvements
   - Educational content

4. **Polish**
   - Add animations
   - Improve error messages
   - Optimize performance
   - Add accessibility features

## 📄 License

HackNYU Fall 2025 Project

---

Built with ❤️ using Expo + React Native + TypeScript
