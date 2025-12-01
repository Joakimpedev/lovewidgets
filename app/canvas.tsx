/**
 * Drawing Canvas Screen for LoveWidgets
 * Full-screen drawing experience using react-native-svg
 * Captures and uploads drawings to Firebase
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  GestureResponderEvent,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Svg, { Path } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import { Undo2, Trash2, Send, X } from 'lucide-react-native';
import { Dimensions } from 'react-native';

import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { sendLetter, convertImageToDataUrl } from '@/utils/letters';
import { getUserProfileFromFirestore } from '@/utils/pairing';
import { waterSharedGarden } from '@/utils/gardenState';
import { saveToWidget } from '@/utils/widgetStorage';

// Color palette for drawing
const COLORS = [
  { id: 'black', color: '#2D2A2B' },
  { id: 'red', color: '#FF4757' },
  { id: 'blue', color: '#3498DB' },
  { id: 'pink', color: '#FF6B81' },
];

// Type for a single drawn line
interface DrawnLine {
  path: string;
  color: string;
  strokeWidth: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CANVAS_SIZE = Math.min(SCREEN_WIDTH - 32, 600); // Square canvas, max 600px

export default function CanvasScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { top, bottom } = useSafeAreaInsets();
  
  // Drawing state
  const [lines, setLines] = useState<DrawnLine[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0].color);
  const [strokeWidth] = useState(4);
  const [isSending, setIsSending] = useState(false);
  
  // Refs
  const isDrawing = useRef(false);
  const canvasRef = useRef<View>(null);

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
    isDrawing.current = true;
    const { locationX, locationY } = event.nativeEvent;
    const newPath = getPathFromPoints(locationX, locationY, true);
    setCurrentPath(newPath);
  }

  // Handle touch move
  function handleTouchMove(event: GestureResponderEvent) {
    if (!isDrawing.current) return;
    
    const { locationX, locationY } = event.nativeEvent;
    setCurrentPath(prev => prev + getPathFromPoints(locationX, locationY, false));
  }

  // Handle touch end
  function handleTouchEnd() {
    if (!isDrawing.current) return;
    
    isDrawing.current = false;
    
    // Only save if there's actually a path drawn
    if (currentPath.length > 0) {
      setLines(prev => [...prev, {
        path: currentPath,
        color: selectedColor,
        strokeWidth: strokeWidth,
      }]);
    }
    setCurrentPath('');
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
      console.log('[Canvas] Capturing canvas...');
      const uri = await captureRef(canvasRef, {
        format: 'png',
        quality: 0.9,
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
      console.log('[Canvas] Saving to widget storage...');
      try {
        await saveToWidget(imageUrl);
        console.log('[Canvas] Widget storage updated!');
      } catch (error) {
        console.error('[Canvas] Error saving to widget storage:', error);
        // Don't fail the whole operation if widget storage fails
      }

      // 5. Upload and create letter in Firestore
      console.log('[Canvas] Sending widget update...');
      const letterId = await sendLetter(uri, user.uid, profile.partnerId);
      console.log('[Canvas] Widget update sent successfully! ID:', letterId);

      // 6. Water the garden (widget updates also count as watering)
      console.log('[Canvas] Watering garden...');
      await waterSharedGarden(user.uid, profile.partnerId);
      console.log('[Canvas] Garden watered!');

      // 7. Navigate to letters tab
      router.replace('/(tabs)/letters');
      
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

      {/* Canvas Area - Takes remaining space with white background */}
      {/* This is the view we capture with view-shot */}
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
        <Svg 
          style={styles.canvas}
          viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
        >
          {/* Render all completed lines */}
          {lines.map((line, index) => (
            <Path
              key={index}
              d={line.path}
              stroke={line.color}
              strokeWidth={line.strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          
          {/* Render current line being drawn */}
          {currentPath ? (
            <Path
              d={currentPath}
              stroke={selectedColor}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
        </Svg>

        {/* Empty state hint */}
        {!hasDrawing && (
          <View style={styles.emptyHint} pointerEvents="none">
            <Text style={styles.emptyHintText}>Draw something beautiful ✨</Text>
          </View>
        )}
      </View>

      {/* Bottom Toolbar - with safe area bottom padding */}
      <View style={[styles.toolbar, { paddingBottom: toolbarPaddingBottom }]}>
        {/* Color Picker */}
        <View style={styles.colorPicker}>
          {COLORS.map((colorOption) => (
            <TouchableOpacity
              key={colorOption.id}
              style={[
                styles.colorButton,
                { backgroundColor: colorOption.color },
                selectedColor === colorOption.color && styles.colorButtonSelected,
              ]}
              onPress={() => setSelectedColor(colorOption.color)}
              activeOpacity={0.8}
              disabled={isSending}
            />
          ))}
        </View>

        {/* Tool Buttons */}
        <View style={styles.toolButtons}>
          <TouchableOpacity
            style={[styles.toolButton, (lines.length === 0 || isSending) && styles.toolButtonDisabled]}
            onPress={handleUndo}
            disabled={lines.length === 0 || isSending}
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
            disabled={!hasDrawing || isSending}
            activeOpacity={0.7}
          >
            <Trash2
              size={22}
              color={hasDrawing ? Colors.light.error : Colors.light.textSecondary}
            />
          </TouchableOpacity>
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

  // Canvas - White background, square for widget
  canvasContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  canvas: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    backgroundColor: '#FFFFFF',
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

  // Toolbar
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: Colors.light.background,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  
  // Color Picker
  colorPicker: {
    flexDirection: 'row',
    gap: 12,
  },
  colorButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorButtonSelected: {
    borderColor: Colors.light.tint,
    transform: [{ scale: 1.1 }],
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
