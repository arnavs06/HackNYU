# 📱 EcoScan Frontend - Mobile App

React Native mobile app for scanning clothing tags and viewing sustainability scores.

## 📋 What This Does

Mobile interface for EcoScan:
- **Two-stage camera capture** (tag photo + clothing photo)
- **Real-time API communication** with backend
- **Results display** with eco-scores, grades, and alternatives
- **Local storage** for scan history
- **Statistics dashboard** (average score, improvement trends)

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** (check: `node --version`)
- **Expo CLI**: `npm install -g expo-cli`
- **Expo Go app** on your phone (App Store / Google Play)
- **Backend running** at `http://localhost:8000`

### Installation

```bash
cd frontend
npm install
```

**Dependencies**: React Native, Expo, TypeScript, React Navigation, Axios, AsyncStorage

### Configuration

#### For Physical Device Testing:

1. Find your computer's IP address:
   ```powershell
   ipconfig  # Windows
   # Look for "IPv4 Address" under your network adapter
   ```

2. Update API URL in `src/services/api.ts`:
   ```typescript
   const API_BASE_URL = 'http://YOUR_IP:8000/api';
   // Example: 'http://192.168.1.100:8000/api'
   ```

#### For Emulator:
Keep default `http://localhost:8000/api`

### Running the App

```bash
npm start
```

**Options**:
- Press `a` → Open on Android emulator/device
- Press `i` → Open on iOS simulator (Mac only)
- Press `w` → Open in web browser
- **Scan QR code** with phone camera → Opens in Expo Go

### Testing on Your Phone

1. **Install Expo Go** (App Store / Google Play)
2. **Start backend**: `cd ../analyze && python api_server.py`
3. **Start frontend**: `npm start`
4. **Scan QR code** in terminal with phone camera
5. App opens in Expo Go

## 📱 App Architecture

```
frontend/
├── src/
│   ├── navigation/
│   │   └── AppNavigator.tsx       # Tab + Stack navigation
│   ├── screens/
│   │   ├── HomeScreen.tsx         # Landing page
│   │   ├── ScannerScreen.tsx      # Camera capture (2 stages)
│   │   ├── ResultsScreen.tsx      # Eco-score + alternatives
│   │   ├── HistoryScreen.tsx      # Scan history + stats
│   │   ├── SearchScreen.tsx       # Material database
│   │   ├── DatabaseScreen.tsx     # Browse database
│   │   ├── RecommendationsScreen.tsx  # Picks for you
│   │   └── AccountScreen.tsx      # User profile
│   ├── services/
│   │   ├── api.ts                 # Backend HTTP client
│   │   ├── mockApi.ts             # Mock data (legacy)
│   │   └── storage.ts             # AsyncStorage wrapper
│   ├── components/
│   │   └── SwipeableTab.tsx       # Custom tab component
│   └── types/
│       └── index.ts               # TypeScript interfaces
├── assets/                        # Images, fonts
├── App.tsx                        # Root component
├── package.json
└── README.md                      # This file/
│       └── index.ts               # TypeScript interfaces
├── assets/                        # Images, fonts
├── App.tsx                        # Root component
├── package.json
└── README.md                      # This file
```

## 🎯 Core Screens

### 1. ScannerScreen (✅ Fully Integrated)

**Two-stage workflow**:
1. User captures/selects **tag image** (clothing label)
2. User captures/selects **clothing image** (full garment)
3. Both images sent to backend via `POST /api/scan`
4. Shows loading state (15-30 seconds)
5. Navigates to ResultsScreen on success

**Key code**:
```typescript
const handleScanImages = async () => {
  const response = await apiService.scanClothingTag(
    tagImage!,
    clothingImage!,
    userId
  );
  await storageService.saveScan(response.data);
  navigation.navigate('Results', { scanResult: response.data });
};
```

**Uses**: `apiService`, `storageService`, Expo Camera

### 2. ResultsScreen (✅ Fully Integrated)

Displays scan results:
- **Eco-score** (0-100) with A-F grade
- **Material** (Cotton, Polyester, etc.)
- **Origin** (country of manufacture)
- **Brand** and product name
- **Impact flags** (microplastic, carbon, water, labor)
- **AI explanation** (why this score?)
- **5 sustainable alternatives** (title, brand, score, price)

**Key code**:
```typescript
scanResult.similarProducts?.map((product) => (
  <View key={product.id}>
    <Text>{product.title}</Text>
    <Text>Score: {product.ecoScore}/100</Text>
    <Text>${product.price} {product.currency}</Text>
  </View>
))
```

**Data source**: Route params from ScannerScreen

### 3. HistoryScreen (✅ Fully Integrated)

Shows scan history from local storage:
- List of past scans with scores
- Statistics (average score, total scans)
- Improvement trend calculation
- Tap to view full results

**Key code**:
```typescript
const loadHistory = async () => {
  const scans = await storageService.getScanHistory();
  const stats = await storageService.getUserStats();
  setScans(scans);
  setStats(stats);
};
```

**Uses**: `storageService` (AsyncStorage wrapper)

### 4. SearchScreen (⚠️ Mock Data)

Search materials database - **not yet integrated**.
- Currently uses `mockApiService.searchDatabase()`
- Future: Connect to Supabase for global material data

### 5. RecommendationsScreen (⚠️ Mock Data)

Personalized sustainable picks - **not yet integrated**.
- Currently uses `mockApiService.getRecommendations()`
- Future: Use scan history to generate picks

## 🔧 Services

### `api.ts` - Backend HTTP Client

**Base URL**: `http://10.253.68.183:8000/api` (update with your IP)

**Main function**:
```typescript
scanClothingTag(
  tagImageUri: string,
  clothingImageUri: string,
  userId?: string
): Promise<ScanResult>
```

**Process**:
1. Converts image URIs to files
2. Creates FormData with tag_image + clothing_image
3. Sends POST request to backend
4. Timeout: 300 seconds (5 minutes for testing)
5. Returns typed ScanResult

**Configuration**:
```typescript
const API_BASE_URL = 'http://YOUR_IP:8000/api';
axios.defaults.timeout = 300000; // 5 minutes
```

### `storage.ts` - Local Persistence

**AsyncStorage wrapper** for scan history.

**Key functions**:
- `saveScan(scan)`: Save scan result locally
- `getScanHistory(limit?)`: Get past scans
- `getUserStats()`: Calculate average score, total scans, trend

**Storage key**: `@ecoscan:scans`

**Data structure**:
```typescript
interface StoredScan extends ScanResult {
  id: string;
  userId: string;
  timestamp: string;
}
```

## 📊 TypeScript Interfaces

### `ScanResult` (Main response type)

```typescript
interface ScanResult {
  ecoScore: number;           // 0-100
  grade: string;              // A, B, C, D, F
  material: string;           // "Cotton", "Polyester", etc.
  origin: string;             // "China", "India", etc.
  brand?: string;
  productName?: string;
  impacts: {
    microplastic: number;     // 1-5 scale
    carbon: number;
    water: number;
    labor: number;
  };
  explanation: string;        // AI-generated
  certifications?: string[];  // ["GOTS", "Fair Trade"]
  similarProducts?: SimilarProduct[];
}
```

### `SimilarProduct`

```typescript
interface SimilarProduct {
  id: string;
  title: string;
  brand: string;
  material: string;
  ecoScore: number;
  grade: string;
  url: string;
  price: number;
  currency: string;
  description: string;
}
```

## 🧪 Testing

### Full Integration Test:

1. **Start backend**:
   ```bash
   cd ../analyze
   python api_server.py
   ```
   Wait for: `✓ Loaded environment variables`

2. **Start frontend**:
   ```bash
   npm start
   ```

3. **Open app** (Expo Go or emulator)

4. **Test scan flow**:
   - Tap "Scanner" tab
   - Capture/select tag image
   - Capture/select clothing image
   - Tap "Scan Images"
   - Wait 15-30 seconds
   - View results with alternatives

5. **Verify**:
   - Backend logs: `✅ Scan complete! Score: XX/100`
   - Results screen shows real data (not "Sample Product")
   - History tab shows saved scan
   - Stats update correctly

### Common Issues:

**"Network Error" / "Timeout"**
- ✅ Backend running? Check `http://YOUR_IP:8000/docs`
- ✅ Correct IP in `api.ts`?
- ✅ Phone and computer on same WiFi?
- ✅ Firewall blocking port 8000?

**"Cannot connect to backend"**
- Use computer's IP, not `localhost` (unless emulator)
- Verify: `ping YOUR_IP` from phone

**Images not uploading**
- Check image file size (< 10MB recommended)
- Verify permissions in Expo (camera, photo library)

## 🎨 UI/UX

**Navigation**:
- Bottom tab navigator (5 tabs)
- Stack navigator for scan flow
- Deep linking support

**Color scheme**:
- Green theme for eco-focus
- Gradient backgrounds
- Score-based color coding (A=green, F=red)

**Responsive**:
- Works on all screen sizes
- Adapts to iOS/Android platform differences
- Keyboard-aware inputs

## 🚀 Production Build

### Build with EAS (Expo Application Services):

1. **Install EAS CLI**:
   ```bash
   npm install -g eas-cli
   ```

2. **Login**:
   ```bash
   eas login
   ```

3. **Configure**:
   ```bash
   eas build:configure
   ```

4. **Build**:
   ```bash
   eas build --platform android
   eas build --platform ios
   ```

5. **Submit to stores**:
   ```bash
   eas submit --platform android
   eas submit --platform ios
   ```

### Update API URL for production:

```typescript
// src/services/api.ts
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-api.railway.app/api';
```

Set in EAS:
```bash
eas update --channel production
```

## 🛠️ Development

### Available Scripts:

```bash
npm start          # Start Expo dev server
npm run android    # Open on Android
npm run ios        # Open on iOS (Mac only)
npm run web        # Open in browser
npm test           # Run tests
npm run lint       # Lint TypeScript
```

### Hot Reload:
Changes to `.tsx` files reload automatically in Expo Go.

### Debugging:
- Shake device → Open developer menu
- Enable "Debug Remote JS" for Chrome DevTools
- Use `console.log()` → Shows in terminal

## 📦 Dependencies

**Core**:
- `react-native`: Mobile framework
- `expo`: Development platform
- `typescript`: Type safety

**Navigation**:
- `@react-navigation/native`
- `@react-navigation/bottom-tabs`
- `@react-navigation/stack`

**API & Storage**:
- `axios`: HTTP client
- `@react-native-async-storage/async-storage`: Local storage

**UI**:
- `expo-camera`: Camera access
- `expo-image-picker`: Gallery access
- `react-native-gesture-handler`: Touch gestures

## 🔐 Security

**No sensitive data in frontend**:
- API keys stored in backend only
- Local storage uses device encryption
- No hardcoded credentials

**Safe to commit**: All files in `frontend/` except `node_modules/`

## 🤝 Contributing

Part of HackNYU Fall 2025 project. See main [`../README.md`](../README.md) for overview
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
