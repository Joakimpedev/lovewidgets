/**
 * Drawing Canvas Screen for LoveWidgets
 * Full-screen drawing experience using react-native-svg
 * Captures and uploads drawings to Firebase
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Check, Image as ImageIcon, Minus, Paintbrush, Plus, Send, Sparkles, Trash2, Undo2, X } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  GestureResponderEvent,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';

import { RewardPopup } from '@/components/RewardPopup';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { waterSharedGarden } from '@/utils/gardenState';
import { convertImageToDataUrl, sendLetter } from '@/utils/letters';
import { getUserProfileFromFirestore } from '@/utils/pairing';
import { processWidgetUpdateReward } from '@/utils/rewards';
import { getOnboardingState } from '@/utils/storage';
import { saveToWidget } from '@/utils/widgetStorage';

// Color palette for drawing (same as shared doodle)
const COLORS = [
  { id: 'black', color: '#2D2A2B' },
  { id: 'white', color: '#FFFFFF' },
  { id: 'red', color: '#FF4757' },
  { id: 'purple', color: '#9B59B6' },
  { id: 'pink', color: '#FF6B81' },
  { id: 'blue', color: '#3498DB' },
  { id: 'green', color: '#2ECC71' },
  { id: 'orange', color: '#FF9500' },
];

// Type for a single drawn line
interface DrawnLine {
  path: string;
  color: string;
  strokeWidth: number;
  glow?: boolean;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CANVAS_SIZE = Math.min(SCREEN_WIDTH - 32, 600); // Square canvas, max 600px

export default function CanvasScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { top, bottom } = useSafeAreaInsets();
  const isOnboarding = params.onboarding === 'true';
  
  // Drawing state
  const [lines, setLines] = useState<DrawnLine[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0].color);
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [isGlowEnabled, setIsGlowEnabled] = useState(false);
  const [showBrushOptions, setShowBrushOptions] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showRewardPopup, setShowRewardPopup] = useState(false);
  const [rewardWater, setRewardWater] = useState(0);
  
  // Background state
  const [backgroundImageUri, setBackgroundImageUri] = useState<string | null>(null);
  const [isAdjustingBackground, setIsAdjustingBackground] = useState(false);
  const [backgroundScale, setBackgroundScale] = useState(1.0);
  const [backgroundTranslateX, setBackgroundTranslateX] = useState(0);
  const [backgroundTranslateY, setBackgroundTranslateY] = useState(0);
  
  // Refs
  const isDrawing = useRef(false);
  const canvasRef = useRef<View>(null);
  const isPinching = useRef(false);
  const pinchStartDistance = useRef(0);
  const pinchStartScale = useRef(1.0);
  const isPanningBackground = useRef(false);
  const backgroundPanStart = useRef({ x: 0, y: 0, scale: 1.0, translateX: 0, translateY: 0 });
  const touches = useRef<{ [key: number]: { x: number; y: number } }>({});

  // Calculate distance between two points
  function getDistance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Convert touch coordinates to SVG path (adjusted for centered square canvas)
  function getPathFromPoints(x: number, y: number, isStart: boolean): string {
    // Adjust coordinates relative to the canvas container
    const containerX = x;
    const containerY = y;
    
    if (isStart) {
      return `M ${containerX} ${containerY}`;
    }
    return ` L ${containerX} ${containerY}`;
  }

  // Handle touch start
  function handleTouchStart(event: GestureResponderEvent) {
    const nativeEvent = event.nativeEvent as any;
    const { locationX, locationY } = nativeEvent;
    const touchesArray = nativeEvent.touches || [];
    const touchCount = touchesArray.length || 1;

    // Track all touches for pinch detection
    touches.current = {};
    if (touchesArray.length > 0) {
      for (let i = 0; i < touchesArray.length; i++) {
        const touch = touchesArray[i];
        const id = touch.identifier !== undefined ? touch.identifier : i;
        touches.current[id] = { 
          x: touch.locationX !== undefined ? touch.locationX : locationX, 
          y: touch.locationY !== undefined ? touch.locationY : locationY 
        };
      }
    } else {
      touches.current[0] = { x: locationX, y: locationY };
    }

    // If adjusting background, check for pinch or pan
    if (isAdjustingBackground && backgroundImageUri) {
      if (touchCount === 2) {
        // Pinch gesture - calculate initial distance
        const touchIds = Object.keys(touches.current).map(Number);
        if (touchIds.length >= 2) {
          const touch1 = touches.current[touchIds[0]];
          const touch2 = touches.current[touchIds[1]];
          pinchStartDistance.current = getDistance(touch1.x, touch1.y, touch2.x, touch2.y);
          pinchStartScale.current = backgroundScale;
          isPinching.current = true;
          isPanningBackground.current = false;
        }
      } else {
        // Single touch - pan gesture
        isPanningBackground.current = true;
        isPinching.current = false;
        backgroundPanStart.current = {
          x: locationX,
          y: locationY,
          scale: backgroundScale,
          translateX: backgroundTranslateX,
          translateY: backgroundTranslateY,
        };
      }
      return;
    }

    // Normal drawing mode
    isDrawing.current = true;
    const newPath = getPathFromPoints(locationX, locationY, true);
    setCurrentPath(newPath);
  }

  // Handle touch move
  function handleTouchMove(event: GestureResponderEvent) {
    const nativeEvent = event.nativeEvent as any;
    const { locationX, locationY } = nativeEvent;
    const touchesArray = nativeEvent.touches || [];
    const touchCount = touchesArray.length || 1;

    // Update touch positions
    if (touchesArray.length > 0) {
      for (let i = 0; i < touchesArray.length; i++) {
        const touch = touchesArray[i];
        const id = touch.identifier !== undefined ? touch.identifier : i;
        if (touches.current[id] !== undefined) {
          touches.current[id] = { 
            x: touch.locationX !== undefined ? touch.locationX : locationX, 
            y: touch.locationY !== undefined ? touch.locationY : locationY 
          };
        }
      }
    } else if (touches.current[0]) {
      touches.current[0] = { x: locationX, y: locationY };
    }

    // If adjusting background, handle pinch or pan
    if (isAdjustingBackground && backgroundImageUri) {
      if (isPinching.current && touchCount === 2) {
        // Pinch-to-zoom gesture
        const touchIds = Object.keys(touches.current).map(Number);
        if (touchIds.length >= 2) {
          const touch1 = touches.current[touchIds[0]];
          const touch2 = touches.current[touchIds[1]];
          const currentDistance = getDistance(touch1.x, touch1.y, touch2.x, touch2.y);
          
          if (pinchStartDistance.current > 0) {
            const scaleFactor = currentDistance / pinchStartDistance.current;
            const newScale = Math.max(0.5, Math.min(5.0, pinchStartScale.current * scaleFactor));
            setBackgroundScale(newScale);
          }
        }
        return;
      } else if (isPanningBackground.current && touchCount === 1) {
        // Handle background pan (single touch)
        const deltaX = locationX - backgroundPanStart.current.x;
        const deltaY = locationY - backgroundPanStart.current.y;
        setBackgroundTranslateX(backgroundPanStart.current.translateX + deltaX);
        setBackgroundTranslateY(backgroundPanStart.current.translateY + deltaY);
        return;
      }
    }

    if (!isDrawing.current) return;
    
    setCurrentPath(prev => prev + getPathFromPoints(locationX, locationY, false));
  }

  // Handle touch end
  function handleTouchEnd() {
    // Reset background pinch state
    if (isPinching.current) {
      isPinching.current = false;
      pinchStartDistance.current = 0;
      pinchStartScale.current = backgroundScale;
    }
    
    // Reset pan state
    if (isPanningBackground.current) {
      isPanningBackground.current = false;
    }

    if (!isDrawing.current) return;
    
    isDrawing.current = false;
    
    // Only save if there's actually a path drawn
    if (currentPath.length > 0) {
      setLines(prev => [...prev, {
        path: currentPath,
        color: selectedColor,
        strokeWidth: strokeWidth,
        glow: isGlowEnabled,
      }]);
    }
    setCurrentPath('');
  }

  // Pick background image
  async function handlePickBackground() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.3,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const asset = result.assets[0];
      const finalUri = asset.uri;

      // Convert to data URL for storage
      const base64Data = await FileSystem.readAsStringAsync(finalUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const dataUrl = `data:image/jpeg;base64,${base64Data}`;

      // Reset to default position and scale
      setBackgroundImageUri(dataUrl);
      setBackgroundScale(1.0);
      setBackgroundTranslateX(0);
      setBackgroundTranslateY(0);
      setIsAdjustingBackground(true);
      setShowBrushOptions(false);
    } catch (error: any) {
      console.error('[Canvas] Error picking background:', error);
      Alert.alert('Error', 'Failed to pick background image.');
    }
  }

  // Apply background adjustments
  function handleApplyBackground() {
    setIsAdjustingBackground(false);
  }

  // Remove background
  function handleRemoveBackground() {
    setBackgroundImageUri(null);
    setIsAdjustingBackground(false);
    setBackgroundScale(1.0);
    setBackgroundTranslateX(0);
    setBackgroundTranslateY(0);
  }

  // Undo last line
  function handleUndo() {
    setLines(prev => prev.slice(0, -1));
  }

  // Clear all lines
  function handleClear() {
    setLines([]);
    setCurrentPath('');
  }

  // Cancel and go back
  function handleCancel() {
    router.back();
  }

  // Send the drawing
  async function handleSend() {
    console.log('[Canvas] Send button pressed');
    
    if (!user) {
      console.log('[Canvas] No user logged in');
      Alert.alert('Error', 'You must be logged in to send a letter.');
      return;
    }

    if (!canvasRef.current) {
      console.log('[Canvas] Canvas ref not ready');
      Alert.alert('Error', 'Canvas not ready. Please try again.');
      return;
    }

    setIsSending(true);

    try {
      // 1. Get user's partner ID from Firestore
      console.log('[Canvas] Fetching user profile...');
      const profile = await getUserProfileFromFirestore(user.uid);
      console.log('[Canvas] Profile:', profile);
      
      if (!profile?.partnerId) {
        console.log('[Canvas] No partner connected');
        Alert.alert(
          'No Partner Connected',
          'You need to connect with a partner before sending letters. Go to Profile to connect.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Go to Profile', onPress: () => router.replace('/(tabs)/settings') },
          ]
        );
        setIsSending(false);
        return;
      }

      // 2. Capture the canvas as an image
      // Use JPEG format and lower quality when background image is present to avoid Firebase size limits (~1MB)
      // JPEG compresses much better than PNG for photos/backgrounds
      const captureQuality = backgroundImageUri ? 0.4 : 0.7; // Lower quality for images with backgrounds
      const captureFormat = backgroundImageUri ? 'jpg' : 'png'; // JPEG for backgrounds (better compression), PNG for drawings
      console.log('[Canvas] Capturing canvas with format:', captureFormat, 'quality:', captureQuality, backgroundImageUri ? '(with background)' : '(drawing only)');
      const uri = await captureRef(canvasRef, {
        format: captureFormat,
        quality: captureQuality,
        result: 'tmpfile', // Explicitly request a file URI
      });
      console.log('[Canvas] Captured URI:', uri);

      if (!uri) {
        throw new Error('Failed to capture canvas - no URI returned');
      }

      // 3. Convert image to base64 data URL (for both Firestore and widget storage)
      console.log('[Canvas] Converting image to data URL...');
      const imageUrl = await convertImageToDataUrl(uri);

      // 4. Save to widget storage (before sending to Firestore)
      // NOTE: For testing, sender's widget also updates. For production, only receiver's widget should update.
      // The receiver's widget is updated automatically in letters.tsx when they receive the letter.
      // To disable sender widget updates, set UPDATE_SENDER_WIDGET = false in utils/widgetStorage.ts
      console.log('[Canvas] Saving to widget storage (sender side - for testing)...');
      try {
        await saveToWidget(imageUrl, true); // Pass true to indicate this is from sender
        console.log('[Canvas] ✅ Widget storage updated!');
      } catch (error: any) {
        console.warn('[Canvas] ⚠️ Widget storage failed (non-critical):', error?.message || error);
        // Don't show alert - this is expected if widget isn't set up yet
      }

      // 5. Upload and create letter in Firestore
      console.log('[Canvas] Sending widget update...');
      const letterId = await sendLetter(uri, user.uid, profile.partnerId);
      console.log('[Canvas] Widget update sent successfully! ID:', letterId);

      // 6. Process widget update reward (check if first time today, award water)
      const waterAwarded = await processWidgetUpdateReward(user.uid);
      
      // 7. Check if this is first reward for onboarding
      let isFirstReward = false;
      if (isOnboarding) {
        const onboardingState = await getOnboardingState();
        if (onboardingState && !onboardingState.hasReceivedStarterBudget) {
          isFirstReward = true;
        }
      }
      
      // 8. Show reward popup
      if (waterAwarded) {
        setRewardWater(1);
        setShowRewardPopup(true);
        // Wait for popup to show before navigating
        await new Promise(resolve => setTimeout(resolve, 2500));
      } else {
        // Just show "Sent!" message without reward
        setRewardWater(0);
        setShowRewardPopup(true);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // 9. If first reward, navigate back to home with param to trigger Step 3
      if (isFirstReward && waterAwarded) {
        router.replace('/(tabs)?onboardingReward=widget');
        return; // Don't continue to letters tab
      }

      // 10. Water the garden (widget updates also count as watering)
      console.log('[Canvas] Watering garden...');
      await waterSharedGarden(user.uid, profile.partnerId);
      console.log('[Canvas] Garden watered!');

      // 11. Navigate to letters tab (unless onboarding)
      if (!isFirstReward || (isFirstReward && !waterAwarded)) {
        console.log('[Canvas] Navigating to letters tab...');
        router.replace('/(tabs)/letters');
        console.log('[Canvas] Navigation command sent');
      } else {
        console.log('[Canvas] Skipping navigation (onboarding first reward)');
      }
      
    } catch (error: any) {
      console.error('[Canvas] Error sending letter:', error);
      console.error('[Canvas] Error details:', error?.message, error?.code);
      Alert.alert(
        'Send Failed',
        `Could not send your letter: ${error?.message || 'Unknown error'}. Please check your connection and try again.`
      );
    } finally {
      setIsSending(false);
    }
  }

  // Helper function to render a path with optional glow effect
  function renderPathWithGlow(
    path: string,
    color: string,
    strokeWidth: number,
    hasGlow: boolean,
    key: string
  ) {
    if (!hasGlow) {
      // Normal path without glow
      return (
        <Path
          key={key}
          d={path}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    }

    // Glow effect: render multiple layers with increasing size and decreasing opacity
    // More layers with smoother transitions for a more natural feathered glow
    const glowLayers = [
      { width: strokeWidth * 4, opacity: 0.08 },   // Outermost glow
      { width: strokeWidth * 3, opacity: 0.15 },   // Outer glow
      { width: strokeWidth * 2.5, opacity: 0.22 }, // Outer-middle glow
      { width: strokeWidth * 2, opacity: 0.3 },    // Middle glow
      { width: strokeWidth * 1.5, opacity: 0.4 },   // Inner glow
    ];

    // Return array of Path elements (glow layers + main path)
    return [
      // Render glow layers first (behind)
      ...glowLayers.map((layer, index) => (
        <Path
          key={`${key}-glow-${index}`}
          d={path}
          stroke={color}
          strokeWidth={layer.width}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={layer.opacity}
        />
      )),
      // Render main path on top
      <Path
        key={`${key}-main`}
        d={path}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={1}
      />,
    ];
  }

  const hasDrawing = lines.length > 0 || currentPath.length > 0;

  // Calculate padding with safe area insets
  const headerPaddingTop = top + 12;
  const toolbarPaddingBottom = bottom + 16;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header - with safe area top padding */}
      <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleCancel}
          activeOpacity={0.7}
          disabled={isSending}
        >
          <X size={24} color={Colors.light.text} />
          <Text style={styles.headerButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Update Widget</Text>
        
        <TouchableOpacity
          style={[
            styles.headerButton,
            styles.sendButton,
            (!hasDrawing || isSending) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!hasDrawing || isSending}
          activeOpacity={0.7}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={[
                styles.sendButtonText,
                !hasDrawing && styles.sendButtonTextDisabled,
              ]}>
                Send
              </Text>
              <Send size={18} color={hasDrawing ? '#FFFFFF' : Colors.light.textSecondary} />
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Canvas Area - Square canvas in the middle */}
      {/* This is the view we capture with view-shot */}
      <View style={styles.canvasWrapper}>
        <View
          ref={canvasRef}
          style={styles.canvasContainer}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={handleTouchStart}
          onResponderMove={handleTouchMove}
          onResponderRelease={handleTouchEnd}
          onResponderTerminate={handleTouchEnd}
          collapsable={false} // Required for view-shot on Android
        >
          {/* Background Image */}
          {backgroundImageUri && (
            <Image
              source={{ uri: backgroundImageUri }}
              style={[
                styles.backgroundImage,
                {
                  transform: [
                    { translateX: backgroundTranslateX },
                    { translateY: backgroundTranslateY },
                    { scale: backgroundScale },
                  ],
                },
              ]}
              resizeMode="cover"
            />
          )}

          <Svg 
            style={styles.canvas}
            viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
          >
            {/* Render all completed lines */}
            {lines.flatMap((line, index) =>
              renderPathWithGlow(
                line.path,
                line.color,
                line.strokeWidth,
                line.glow || false,
                `line-${index}`
              )
            )}
            
            {/* Render current line being drawn */}
            {currentPath.length > 0 &&
              renderPathWithGlow(
                currentPath,
                selectedColor,
                strokeWidth,
                isGlowEnabled,
                'current-path'
              )}
          </Svg>

          {/* Empty state hint */}
          {!hasDrawing && !backgroundImageUri && (
            <View style={styles.emptyHint} pointerEvents="none">
              <Text style={styles.emptyHintText}>Draw something beautiful ✨</Text>
            </View>
          )}

          {/* Adjustment mode hint */}
          {isAdjustingBackground && (
            <View style={styles.adjustmentHint} pointerEvents="none">
              <Text style={styles.adjustmentHintText}>
                Pinch to zoom • Drag to move
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Apply Button - Only shown when adjusting background */}
      {isAdjustingBackground && (
        <View style={styles.applyButtonContainer}>
          <TouchableOpacity
            style={[styles.applyButton, { backgroundColor: Colors.light.tint }]}
            onPress={handleApplyBackground}
          >
            <Check size={20} color="#FFFFFF" />
            <Text style={styles.applyButtonText}>Apply</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom Toolbar - with safe area bottom padding */}
      <View style={[styles.toolbar, { paddingBottom: toolbarPaddingBottom }]}>
        {/* Brush Options - Show when brush button is active */}
        {showBrushOptions && (
          <View style={styles.brushOptionsContainer}>
            {/* Color Picker */}
            <View style={styles.colorPicker}>
              {COLORS.map((colorOption) => {
                const isSelected = selectedColor === colorOption.color;
                const isWhite = colorOption.color === '#FFFFFF';
                return (
                  <TouchableOpacity
                    key={colorOption.id}
                    style={[
                      styles.colorButton,
                      {
                        backgroundColor: colorOption.color,
                        borderColor: isSelected 
                          ? Colors.light.tint 
                          : isWhite 
                          ? Colors.light.border 
                          : 'transparent',
                        borderWidth: isSelected ? 3 : isWhite ? 1 : 0,
                      },
                    ]}
                    onPress={() => setSelectedColor(colorOption.color)}
                    activeOpacity={0.8}
                    disabled={isSending}
                  />
                );
              })}
            </View>

            {/* Stroke Width Control */}
            <View style={styles.strokeWidthControl}>
              <Text style={styles.strokeWidthLabel}>Size</Text>
              <View style={styles.strokeWidthButtons}>
                <TouchableOpacity
                  style={[styles.strokeWidthButton, { backgroundColor: '#FFFFFF' }]}
                  onPress={() => setStrokeWidth(prev => Math.max(1, prev - 1))}
                  disabled={strokeWidth <= 1 || isSending}
                >
                  <Minus 
                    size={18} 
                    color={strokeWidth <= 1 ? Colors.light.textSecondary : Colors.light.text} 
                  />
                </TouchableOpacity>
                
                <View style={[styles.strokeWidthDisplay, { backgroundColor: '#FFFFFF' }]}>
                  <Text style={styles.strokeWidthValue}>
                    {strokeWidth}
                  </Text>
                </View>
                
                <TouchableOpacity
                  style={[styles.strokeWidthButton, { backgroundColor: '#FFFFFF' }]}
                  onPress={() => setStrokeWidth(prev => Math.min(20, prev + 1))}
                  disabled={strokeWidth >= 20 || isSending}
                >
                  <Plus 
                    size={18} 
                    color={strokeWidth >= 20 ? Colors.light.textSecondary : Colors.light.text} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Glow Toggle */}
            <View style={styles.glowControl}>
              <TouchableOpacity
                style={[
                  styles.glowButton,
                  {
                    backgroundColor: isGlowEnabled ? Colors.light.tint : '#FFFFFF',
                    borderColor: isGlowEnabled ? Colors.light.tint : Colors.light.border,
                  },
                ]}
                onPress={() => setIsGlowEnabled(!isGlowEnabled)}
                disabled={isSending}
              >
                <Sparkles 
                  size={20} 
                  color={isGlowEnabled ? '#FFFFFF' : Colors.light.text} 
                />
                <Text
                  style={[
                    styles.glowButtonText,
                    { color: isGlowEnabled ? '#FFFFFF' : Colors.light.text },
                  ]}
                >
                  Glow
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Main Toolbar Row */}
        <View style={styles.mainToolbarRow}>
          {/* Brush Toggle Button */}
          <TouchableOpacity
            style={[
              styles.brushToggleButton,
              {
                backgroundColor: showBrushOptions ? Colors.light.tint : '#FFFFFF',
              },
            ]}
            onPress={() => {
              setShowBrushOptions(!showBrushOptions);
              setIsAdjustingBackground(false);
            }}
            disabled={isSending || isAdjustingBackground}
            activeOpacity={0.7}
          >
            <Paintbrush 
              size={20} 
              color={showBrushOptions ? '#FFFFFF' : Colors.light.text} 
            />
            <Text
              style={[
                styles.brushToggleText,
                { color: showBrushOptions ? '#FFFFFF' : Colors.light.text },
              ]}
            >
              Brush
            </Text>
          </TouchableOpacity>

          {/* Background Image Button */}
          <TouchableOpacity
            style={[
              styles.toolButton,
              {
                backgroundColor: backgroundImageUri ? Colors.light.tint : '#FFFFFF',
              },
            ]}
            onPress={backgroundImageUri ? handleRemoveBackground : handlePickBackground}
            disabled={isSending || isAdjustingBackground}
            activeOpacity={0.7}
          >
            {backgroundImageUri ? (
              <X
                size={22}
                color="#FFFFFF"
              />
            ) : (
              <ImageIcon
                size={22}
                color={Colors.light.text}
              />
            )}
          </TouchableOpacity>

          {/* Tool Buttons */}
          <View style={styles.toolButtons}>
            <TouchableOpacity
              style={[styles.toolButton, (lines.length === 0 || isSending) && styles.toolButtonDisabled]}
              onPress={handleUndo}
              disabled={lines.length === 0 || isSending || isAdjustingBackground}
              activeOpacity={0.7}
            >
              <Undo2
                size={22}
                color={lines.length > 0 ? Colors.light.text : Colors.light.textSecondary}
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.toolButton, (!hasDrawing || isSending) && styles.toolButtonDisabled]}
              onPress={handleClear}
              disabled={!hasDrawing || isSending || isAdjustingBackground}
              activeOpacity={0.7}
            >
              <Trash2
                size={22}
                color={hasDrawing ? Colors.light.error : Colors.light.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Loading Overlay */}
      {isSending && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.light.tint} />
            <Text style={styles.loadingText}>Updating widget...</Text>
          </View>
        </View>
      )}

      {/* Reward Popup */}
      <RewardPopup
        visible={showRewardPopup}
        message="Sent!"
        waterReward={rewardWater}
        coinReward={0}
        onClose={() => setShowRewardPopup(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  headerButtonText: {
    fontSize: 16,
    color: Colors.light.text,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.light.text,
  },
  sendButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    minWidth: 90,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.light.border,
  },
  sendButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sendButtonTextDisabled: {
    color: Colors.light.textSecondary,
  },

  // Canvas Wrapper - Centers square canvas
  canvasWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.background,
  },
  // Canvas - White background, square for widget
  canvasContainer: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    backgroundColor: '#FFFFFF',
    position: 'relative',
    overflow: 'hidden',
  },
  canvas: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    backgroundColor: 'transparent',
  },
  backgroundImage: {
    position: 'absolute',
    width: CANVAS_SIZE * 2,
    height: CANVAS_SIZE * 2,
    top: -CANVAS_SIZE / 2,
    left: -CANVAS_SIZE / 2,
  },
  emptyHint: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    marginTop: -10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHintText: {
    fontSize: 18,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  adjustmentHint: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustmentHintText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.textSecondary,
    opacity: 0.7,
  },
  applyButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 24,
    paddingBottom: 24,
  },
  applyButton: {
    width: 120,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Toolbar
  toolbar: {
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: Colors.light.background,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  
  // Brush Options Container
  brushOptionsContainer: {
    marginBottom: 16,
    gap: 16,
  },
  
  // Color Picker
  colorPicker: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  colorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
  },
  
  // Stroke Width Control
  strokeWidthControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  strokeWidthLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    minWidth: 40,
  },
  strokeWidthButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  strokeWidthButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  strokeWidthDisplay: {
    minWidth: 50,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  strokeWidthValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  
  // Glow Control
  glowControl: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    minWidth: 120,
  },
  glowButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Main Toolbar Row
  mainToolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brushToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    minWidth: 100,
    justifyContent: 'center',
  },
  brushToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Tool Buttons
  toolButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  toolButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  toolButtonDisabled: {
    opacity: 0.5,
  },

  // Loading Overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.text,
  },
});
