import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { apiService } from '../services/api';
import { storageService } from '../services/storage';

type ScannerScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Scanner'>;

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraRef, setCameraRef] = useState<CameraView | null>(null);
  const [stage, setStage] = useState<1 | 2>(1); // 1 = tag scan, 2 = clothing photo
  const [tagImage, setTagImage] = useState<string | null>(null);
  const [clothingImage, setClothingImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const navigation = useNavigation<ScannerScreenNavigationProp>();

  useEffect(() => {
    requestPermission();
  }, []);

  const handleTakePicture = async () => {
    if (!cameraRef) return;

    try {
      const photo = await cameraRef.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (photo?.uri) {
        if (stage === 1) {
          setTagImage(photo.uri);
        } else {
          setClothingImage(photo.uri);
        }
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take picture. Please try again.');
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        if (stage === 1) {
          setTagImage(result.assets[0].uri);
        } else {
          setClothingImage(result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleContinueToStage2 = () => {
    if (tagImage) {
      setStage(2);
    }
  };

  const handleRetakeStage1 = () => {
    setTagImage(null);
  };

  const handleRetakeStage2 = () => {
    setClothingImage(null);
  };

  const handleBackToStage1 = () => {
    setStage(1);
    setClothingImage(null);
  };

  const handleScanImages = async () => {
    if (!tagImage || !clothingImage) return;

    setIsProcessing(true);

    try {
      console.log('🔍 Starting scan with real backend API...');
      
      // Get user ID for tracking
      const userId = await storageService.getUserId();
      console.log('👤 Using user ID:', userId);
      
      // Send both tag and clothing images to backend with user ID
      const response = await apiService.scanClothingTag(tagImage, clothingImage, userId);

      if (response.success && response.data) {
        console.log('✅ Scan complete! Score:', response.data.ecoScore.score);
        
        // Add clothing image URI to scan result for local storage
        const scanWithImage = {
          ...response.data,
          imageUri: clothingImage, // Store clothing image URI
        };
        
        // Save scan to local storage for history
        try {
          await storageService.saveScan(scanWithImage);
          console.log('💾 Scan saved to history');
        } catch (storageError) {
          console.warn('Failed to save scan to history:', storageError);
          // Don't block user flow if storage fails
        }
        
        // Navigate to results screen
        navigation.navigate('Results', { scanResult: scanWithImage });
        
        // Reset state for next scan
        setTagImage(null);
        setClothingImage(null);
        setStage(1);
      } else {
        Alert.alert('Scan Failed', response.error || 'Unable to scan the images. Please try again.');
      }
    } catch (error: any) {
      console.error('❌ Scan error:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to process images. Make sure the backend server is running.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#778873" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Camera permission is required to scan tags</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Stage 1: Tag image captured
  if (stage === 1 && tagImage) {
    return (
      <View style={styles.container}>
        <View style={styles.stageIndicator}>
          <View style={styles.stageIndicatorActive}>
            <Text style={styles.stageIndicatorText}>1</Text>
          </View>
          <View style={styles.stageIndicatorLine} />
          <View style={styles.stageIndicatorInactive}>
            <Text style={styles.stageIndicatorTextInactive}>2</Text>
          </View>
        </View>
        
        <Image source={{ uri: tagImage }} style={styles.preview} />
        
        <View style={styles.previewInfo}>
          <Ionicons name="checkmark-circle" size={32} color="#A1BC98" />
          <Text style={styles.previewTitle}>Tag Captured!</Text>
          <Text style={styles.previewSubtext}>Now let's take a photo of the clothing item</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.retakeButton} onPress={handleRetakeStage1}>
            <Text style={styles.buttonText}>Retake Tag</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.continueButton} onPress={handleContinueToStage2}>
            <Text style={styles.buttonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color="#F1F3E0" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Stage 2: Both images captured, ready to scan
  if (stage === 2 && clothingImage) {
    return (
      <View style={styles.container}>
        <View style={styles.stageIndicator}>
          <View style={styles.stageIndicatorComplete}>
            <Ionicons name="checkmark" size={16} color="#fff" />
          </View>
          <View style={styles.stageIndicatorLine} />
          <View style={styles.stageIndicatorActive}>
            <Text style={styles.stageIndicatorText}>2</Text>
          </View>
        </View>

        <ScrollView 
          contentContainerStyle={styles.previewBothContainer}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          decelerationRate="fast"
        >
          <View style={styles.bothImagesContainer}>
            <View style={styles.imagePreviewSmall}>
              <Image source={{ uri: tagImage }} style={styles.previewImageSmall} />
              <Text style={styles.imageLabel}>Clothing Tag</Text>
            </View>
            <View style={styles.imagePreviewSmall}>
              <Image source={{ uri: clothingImage }} style={styles.previewImageSmall} />
              <Text style={styles.imageLabel}>Clothing Item</Text>
            </View>
          </View>
        </ScrollView>

        {isProcessing ? (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color="#778873" />
            <Text style={styles.processingText}>Analyzing your clothing...</Text>
            <Text style={styles.processingSubtext}>
              Extracting material, origin, and eco-impact data
            </Text>
          </View>
        ) : (
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.retakeButton} onPress={handleRetakeStage2}>
              <Text style={styles.buttonText}>Retake Item</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.backButton} onPress={handleBackToStage1}>
              <Text style={styles.buttonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.scanButton} onPress={handleScanImages}>
              <Text style={styles.buttonText}>Analyze</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // Camera view for current stage
  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        ref={(ref) => setCameraRef(ref)}
      >
        <View style={styles.overlay}>
          {/* Stage Indicator */}
          <View style={styles.cameraStageIndicator}>
            <View style={[styles.stageDot, stage === 1 && styles.stageDotActive]} />
            <View style={[styles.stageDot, stage === 2 && styles.stageDotActive]} />
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>
              {stage === 1 ? 'Position clothing tag in frame' : 'Capture the full clothing item'}
            </Text>
            <Text style={styles.subtitle}>
              {stage === 1 
                ? 'Make sure the text is clear and readable' 
                : 'Show the entire garment for better analysis'}
            </Text>
          </View>

          <View style={styles.frame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>

          <View style={styles.controls}>
            <TouchableOpacity style={styles.galleryButton} onPress={handlePickImage}>
              <Ionicons name="images" size={28} color="#F1F3E0" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.captureButton} onPress={handleTakePicture}>
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>

            <View style={styles.placeholder} />
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F3E0',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'space-between',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.8,
    textAlign: 'center',
  },
  frame: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 40,
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#A1BC98',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#A1BC98',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#778873',
  },
  galleryButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(161, 188, 152, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: 50,
  },
  preview: {
    flex: 1,
    resizeMode: 'contain',
    backgroundColor: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: '#F1F3E0',
  },
  button: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#778873',
    marginHorizontal: 8,
    alignItems: 'center',
  },
  retakeButton: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#A1BC98',
    marginHorizontal: 8,
    alignItems: 'center',
  },
  scanButton: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#778873',
    marginHorizontal: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  continueButton: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#778873',
    marginHorizontal: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  backButton: {
    flex: 0.7,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#A1BC98',
    marginHorizontal: 8,
    alignItems: 'center',
  },
  stageIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: '#F1F3E0',
  },
  stageIndicatorActive: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#778873',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stageIndicatorInactive: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D2DCB6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stageIndicatorComplete: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#A1BC98',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stageIndicatorText: {
    color: '#F1F3E0',
    fontSize: 18,
    fontWeight: 'bold',
  },
  stageIndicatorTextInactive: {
    color: '#778873',
    fontSize: 18,
    fontWeight: 'bold',
  },
  stageIndicatorLine: {
    width: 40,
    height: 3,
    backgroundColor: '#D2DCB6',
    marginHorizontal: 8,
  },
  cameraStageIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
    gap: 12,
  },
  stageDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  stageDotActive: {
    backgroundColor: '#A1BC98',
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  previewInfo: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#F1F3E0',
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#778873',
    marginTop: 12,
    marginBottom: 8,
  },
  previewSubtext: {
    fontSize: 14,
    color: '#778873',
    textAlign: 'center',
    opacity: 0.8,
  },
  previewBothContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    backgroundColor: '#F1F3E0',
  },
  bothImagesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    padding: 20,
  },
  imagePreviewSmall: {
    alignItems: 'center',
  },
  previewImageSmall: {
    width: 150,
    height: 200,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  imageLabel: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#778873',
  },
  processingContainer: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#F1F3E0',
  },
  processingText: {
    color: '#778873',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  processingSubtext: {
    color: '#778873',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.7,
  },
  permissionText: {
    color: '#778873',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 40,
  },
});
