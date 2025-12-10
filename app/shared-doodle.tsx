/**
 * Shared Doodle Screen - Real-time collaborative drawing
 * Full-screen canvas with background images and clocks
 */

import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Trash2, Undo2, X, Image as ImageIcon, Clock, Menu, Check, Plus, Minus, Move, Paintbrush, Sparkles } from 'lucide-react-native';
import React, { useRef, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  GestureResponderEvent,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { useAuth } from '@/context/AuthContext';
import { getUserProfileFromFirestore } from '@/utils/pairing';
import {
  subscribeToSharedDoodle,
  subscribeToDoodleBackground,
  subscribeToDoodleClocks,
  addDoodlePath,
  clearSharedDoodle,
  undoLastPath,
  updateDoodleBackground,
  removeDoodleBackground,
  addDoodleClock,
  updateDoodleClock,
  deleteDoodleClock,
  DoodlePath,
  DoodleBackground,
  DoodleClock,
} from '@/utils/sharedDoodle';
import { storage } from '@/config/firebaseConfig';
import { useTheme } from '@/context/ThemeContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Color palette for drawing
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Boundary calculation functions for canvas pan/zoom
function getCanvasBounds(scale: number) {
  // When scale = 1.0, canvas fits exactly, so translation must be 0
  // When scale > 1.0, canvas is larger, so we can pan within limits
  
  if (scale <= 1.0) {
    // At 100% or less, no panning allowed - must be centered
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }
  
  const scaledWidth = SCREEN_WIDTH * scale;
  const scaledHeight = SCREEN_HEIGHT * scale;
  
  // Maximum translation: how far we can move before showing edges
  // The canvas center is at (SCREEN_WIDTH/2, SCREEN_HEIGHT/2)
  // We can translate up to half the difference between scaled and screen size
  const maxTranslateX = (scaledWidth - SCREEN_WIDTH) / 2;
  const maxTranslateY = (scaledHeight - SCREEN_HEIGHT) / 2;
  
  return {
    minX: -maxTranslateX,
    maxX: maxTranslateX,
    minY: -maxTranslateY,
    maxY: maxTranslateY,
  };
}

function clampTranslation(translateX: number, translateY: number, scale: number) {
  const bounds = getCanvasBounds(scale);
  return {
    x: Math.max(bounds.minX, Math.min(bounds.maxX, translateX)),
    y: Math.max(bounds.minY, Math.min(bounds.maxY, translateY)),
  };
}

export default function SharedDoodleScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { top, bottom } = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const { colors: themeColors } = useTheme();
  const colors = themeColors[colorScheme ?? 'light'];
  
  // Drawing state
  const [allPaths, setAllPaths] = useState<DoodlePath[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0].color);
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [isGlowEnabled, setIsGlowEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  
  // Background state
  const [background, setBackground] = useState<DoodleBackground | null>(null);
  const [isAdjustingBackground, setIsAdjustingBackground] = useState(false);
  const [backgroundScale, setBackgroundScale] = useState(1.0);
  const [backgroundTranslateX, setBackgroundTranslateX] = useState(0);
  const [backgroundTranslateY, setBackgroundTranslateY] = useState(0);
  
  // Clock state
  const [clocks, setClocks] = useState<DoodleClock[]>([]);
  const [selectedClock, setSelectedClock] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isDraggingClock, setIsDraggingClock] = useState(false); // Track if we're dragging a clock
  const isDraggingClockRef = useRef(false); // Ref for immediate access in handlers
  
  // Clock configuration state
  const [showClockConfig, setShowClockConfig] = useState(false);
  const [clockConfig, setClockConfig] = useState({
    font: 'SF Pro Display', // Main font (current default)
    bold: false,
    color: '#2D2A2B', // Default dark color
  });

  // Available clock fonts (Apple lockscreen-like, using system fonts)
  const clockFonts = [
    { name: 'SF Pro Display', value: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif-light' },
    { name: 'Helvetica Neue', value: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif' },
    { name: 'System', value: Platform.OS === 'ios' ? 'System' : 'Roboto' },
  ];

  // Available clock colors (Apple lockscreen-like)
  const clockColors = [
    { name: 'Black', value: '#2D2A2B' },
    { name: 'White', value: '#FFFFFF' },
    { name: 'Gray', value: '#8E8E93' },
    { name: 'Blue', value: '#007AFF' },
    { name: 'Pink', value: '#FF6B81' },
    { name: 'Purple', value: '#AF52DE' },
  ];
  
  // UI state
  const [showTools, setShowTools] = useState(false);
  const [isPanZoomMode, setIsPanZoomMode] = useState(false);
  const [showBrushOptions, setShowBrushOptions] = useState(false);
  const drawerAnim = useRef(new Animated.Value(0)).current;
  
  // Refs
  const isDrawing = useRef(false);
  const canvasRef = useRef<View>(null);
  const transformedContainerRef = useRef<View>(null);
  const containerMeasurements = useRef<{ x: number; y: number; width: number; height: number; scale: number } | null>(null);
  const currentPathStart = useRef<{ x: number; y: number } | null>(null);
  const isPanningBackground = useRef(false);
  const backgroundPanStart = useRef({ x: 0, y: 0, scale: 1.0, translateX: 0, translateY: 0 });
  const clockDragStart = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });
  const lastPathLength = useRef(0);
  
  // Pinch-to-zoom refs (for background)
  const isPinching = useRef(false);
  const pinchStartDistance = useRef(0);
  const pinchStartScale = useRef(1.0);
  const touches = useRef<{ [key: number]: { x: number; y: number } }>({});
  
  // Clock pinch-to-resize refs
  const isPinchingClock = useRef(false);
  const clockPinchStartDistance = useRef(0);
  const clockPinchStartSize = useRef(120);

  // Canvas zoom and pan state
  const [canvasScale, setCanvasScale] = useState(1.0);
  const [canvasTranslateX, setCanvasTranslateX] = useState(0);
  const [canvasTranslateY, setCanvasTranslateY] = useState(0);
  
  // Canvas zoom/pan refs
  const isPinchingCanvas = useRef(false);
  const canvasPinchStartDistance = useRef(0);
  const canvasPinchStartScale = useRef(1.0);
  const canvasPinchStartTranslate = useRef({ x: 0, y: 0 });
  const canvasPinchCenter = useRef({ x: 0, y: 0 });
  const isPanningCanvas = useRef(false);
  const canvasPanStart = useRef({ x: 0, y: 0, translateX: 0, translateY: 0 });
  const touchCountRef = useRef(0); // Track touch count for proper 2-finger detection
  const touchTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Delay for detecting second finger

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Animate drawer
  useEffect(() => {
    Animated.spring(drawerAnim, {
      toValue: (showTools || showClockConfig) ? 1 : 0,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, [showTools, showClockConfig]);

  // Load partner info
  useEffect(() => {
    async function loadPartner() {
      if (!user) return;
      
      try {
        const profile = await getUserProfileFromFirestore(user.uid);
        if (profile?.partnerId) {
          setPartnerId(profile.partnerId);
        } else {
          Alert.alert(
            'No Partner',
            'You need to connect with a partner to use Shared Doodle.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
        }
      } catch (error) {
        console.error('[SharedDoodle] Error loading partner:', error);
        Alert.alert('Error', 'Failed to load partner info.');
        router.back();
      }
    }
    loadPartner();
  }, [user]);

  // Subscribe to shared doodle paths
  useEffect(() => {
    if (!user || !partnerId) return;

    setIsLoading(true);
    const unsubscribe = subscribeToSharedDoodle(
      user.uid,
      partnerId,
      (paths) => {
        setAllPaths(paths);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, partnerId]);

  // Subscribe to background
  useEffect(() => {
    if (!user || !partnerId) return;

    const unsubscribe = subscribeToDoodleBackground(
      user.uid,
      partnerId,
      (bg) => {
        setBackground(bg);
        if (bg) {
          setBackgroundScale(bg.scale);
          setBackgroundTranslateX(bg.translateX);
          setBackgroundTranslateY(bg.translateY);
        }
      }
    );

    return () => unsubscribe();
  }, [user, partnerId]);

  // Subscribe to clocks
  useEffect(() => {
    if (!user || !partnerId) return;

    const unsubscribe = subscribeToDoodleClocks(
      user.uid,
      partnerId,
      (clocksList) => {
        setClocks(clocksList);
      }
    );

    return () => unsubscribe();
  }, [user, partnerId]);

  // Optimize path string (reduce precision to save space)
  function optimizePath(path: string): string {
    // Reduce decimal precision to save bytes
    return path.replace(/(\d+\.\d{3})\d+/g, '$1');
  }

  // Update container measurements whenever transform changes
  // Use measureLayout to get position relative to canvas container
  useEffect(() => {
    if (transformedContainerRef.current && canvasRef.current) {
      transformedContainerRef.current.measureLayout(
        canvasRef.current,
        (x, y, width, height) => {
          // x, y = position relative to canvas container after transforms
          // width, height = actual size after scale
          const actualScale = width / SCREEN_WIDTH;
          
          // The container starts at (0, 0) with size (SCREEN_WIDTH, SCREEN_HEIGHT)
          // After transform, it's at (x, y) with size (width, height)
          // The translation in canvas space = (measured position) / scale
          const actualTranslateX = x / actualScale;
          const actualTranslateY = y / actualScale;
          
          containerMeasurements.current = {
            x,
            y,
            width,
            height,
            scale: actualScale,
            translateX: actualTranslateX,
            translateY: actualTranslateY,
          };
        },
        () => {
          // Error callback - use fallback values
          containerMeasurements.current = null;
        }
      );
    }
  }, [canvasScale, canvasTranslateX, canvasTranslateY]);

  // Convert touch coordinates to SVG path using measured container position
  // Measure the actual screen position of the transformed container to calculate accurate coordinates
  function getPathFromPoints(x: number, y: number, isStart: boolean): string {
    let canvasX: number;
    let canvasY: number;
    
    // Use cached measurements if available, otherwise calculate from state
    if (containerMeasurements.current) {
      const m = containerMeasurements.current;
      // Convert touch coordinates to canvas coordinates using measured values
      // Touch is at (x, y) relative to parent
      // Container is at (m.x, m.y) with scale m.scale
      // Canvas coordinate = (touchX - containerX) / scale + containerTranslate
      canvasX = (x - m.x) / m.scale + m.translateX;
      canvasY = (y - m.y) / m.scale + m.translateY;
    } else {
      // Fallback to calculated values if measurements not available yet
      canvasX = (x - canvasTranslateX) / canvasScale;
      canvasY = (y - canvasTranslateY) / canvasScale;
    }
    
    // Clamp coordinates to valid canvas bounds (0 to SCREEN_WIDTH/HEIGHT)
    const clampedX = Math.max(0, Math.min(SCREEN_WIDTH, canvasX));
    const clampedY = Math.max(0, Math.min(SCREEN_HEIGHT, canvasY));
    
    // Round to reduce path size
    const roundedX = Math.round(clampedX);
    const roundedY = Math.round(clampedY);
    
    if (isStart) {
      return `M ${roundedX} ${roundedY}`;
    }
    return ` L ${roundedX} ${roundedY}`;
  }

  // Handle touch start
  function handleTouchStart(event: GestureResponderEvent) {
    if (!user || !partnerId) return;
    
    const nativeEvent = event.nativeEvent as any;
    const { locationX, locationY } = nativeEvent;
    
    // Get touch count from touches array if available
    const touchesArray = nativeEvent.touches || [];
    const touchCount = touchesArray.length || 1;
    
    console.log('[SharedDoodle] Touch start at:', locationX, locationY, 'touches:', touchCount, 'clocks:', clocks.length);
    
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
    if (isAdjustingBackground && background) {
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
    
    // Check if touching a clock FIRST (before drawing)
    // CRITICAL: Check clocks BEFORE starting to draw
    // Use current clocks state, not stale closure
    const currentClocks = clocks;
    let clockTouched = false;
    
    for (let i = currentClocks.length - 1; i >= 0; i--) {
      const clock = currentClocks[i];
      const clockX = clock.x * SCREEN_WIDTH;
      const clockY = clock.y * SCREEN_HEIGHT;
      const clockSize = clock.size;
      
      // Check if touch is within clock bounds (use larger hit area)
      const hitArea = clockSize * 1.5; // 150% of size for easier touch
      const dx = Math.abs(locationX - clockX);
      const dy = Math.abs(locationY - clockY);
      
      if (dx < hitArea / 2 && dy < hitArea / 2) {
        console.log('[SharedDoodle] ✅ Clock touched:', clock.id, 'clock at', clockX, clockY, 'touch at', locationX, locationY, 'distance:', dx, dy, 'hitArea:', hitArea);
        setSelectedClock(clock.id);
        
        // Check if this is a pinch gesture (2 touches) or single touch drag
        if (touchCount === 2) {
          // Pinch to resize clock
          const touchIds = Object.keys(touches.current).map(Number);
          if (touchIds.length >= 2) {
            const touch1 = touches.current[touchIds[0]];
            const touch2 = touches.current[touchIds[1]];
            clockPinchStartDistance.current = getDistance(touch1.x, touch1.y, touch2.x, touch2.y);
            clockPinchStartSize.current = clock.size;
            isPinchingClock.current = true;
            isDraggingClockRef.current = false;
            setIsDraggingClock(false);
          }
        } else {
          // Single touch - drag clock
          isDraggingClockRef.current = true;
          setIsDraggingClock(true);
          isPinchingClock.current = false;
          clockDragStart.current = { 
            x: locationX, 
            y: locationY,
            initialX: clock.x,
            initialY: clock.y,
          };
        }
        // CRITICAL: Prevent drawing immediately
        isDrawing.current = false;
        clockTouched = true;
        break; // Exit loop once we find a clock
      }
    }
    
    // Check for Pan/Zoom mode first (if enabled) - just pan on single touch
    // Boundary system will handle preventing pan at 100% zoom
    if (isPanZoomMode && !clockTouched && !isDraggingClockRef.current && touchCount === 1) {
      // Single touch = pan canvas (boundaries will prevent panning at 100% zoom)
      isPanningCanvas.current = true;
      isDrawing.current = false;
      canvasPanStart.current = {
        x: locationX,
        y: locationY,
        translateX: canvasTranslateX,
        translateY: canvasTranslateY,
      };
      return;
    }
    
    // Normal drawing mode (when pan/zoom mode is off)
    if (!isPanZoomMode && !clockTouched && !isDraggingClockRef.current) {
      // Single touch = draw
      isDrawing.current = true;
      currentPathStart.current = { x: locationX, y: locationY };
      const newPath = getPathFromPoints(locationX, locationY, true);
      setCurrentPath(newPath);
      lastPathLength.current = newPath.length;
    }
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
    if (isAdjustingBackground && background) {
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

    // Check if pinching clock to resize
    if (isPinchingClock.current && touchCount === 2 && selectedClock) {
      const clock = clocks.find(c => c.id === selectedClock);
      if (clock) {
        const touchIds = Object.keys(touches.current).map(Number);
        if (touchIds.length >= 2) {
          const touch1 = touches.current[touchIds[0]];
          const touch2 = touches.current[touchIds[1]];
          const currentDistance = getDistance(touch1.x, touch1.y, touch2.x, touch2.y);
          
          if (clockPinchStartDistance.current > 0) {
            const scaleFactor = currentDistance / clockPinchStartDistance.current;
            const newSize = Math.max(60, Math.min(300, clockPinchStartSize.current * scaleFactor));
            
            // Update clock size in state immediately for smooth resizing
            setClocks(prev => prev.map(c => 
              c.id === selectedClock ? { ...c, size: newSize } : c
            ));
          }
        }
      }
      isDrawing.current = false;
      return;
    }
    
    // Check for canvas zoom (pinch)
    if (isPinchingCanvas.current && touchCount === 2) {
      const touchIds = Object.keys(touches.current).map(Number);
      if (touchIds.length >= 2) {
        const touch1 = touches.current[touchIds[0]];
        const touch2 = touches.current[touchIds[1]];
        const currentDistance = getDistance(touch1.x, touch1.y, touch2.x, touch2.y);
        
        if (canvasPinchStartDistance.current > 0) {
          const scaleFactor = currentDistance / canvasPinchStartDistance.current;
          const newScale = Math.max(1.0, Math.min(5.0, canvasPinchStartScale.current * scaleFactor));
          
          // Calculate current center point
          const currentCenter = {
            x: (touch1.x + touch2.x) / 2,
            y: (touch1.y + touch2.y) / 2,
          };
          
          // Zoom towards the pinch center point
          // Adjust translation so the center point stays fixed during zoom
          const scaleChange = newScale / canvasPinchStartScale.current;
          let newTranslateX = currentCenter.x - (currentCenter.x - canvasPinchStartTranslate.current.x) * scaleChange;
          let newTranslateY = currentCenter.y - (currentCenter.y - canvasPinchStartTranslate.current.y) * scaleChange;
          
          // Clamp translation to boundaries
          const clamped = clampTranslation(newTranslateX, newTranslateY, newScale);
          newTranslateX = clamped.x;
          newTranslateY = clamped.y;
          
          // If zooming to 100%, center the canvas
          if (newScale <= 1.0) {
            newTranslateX = 0;
            newTranslateY = 0;
          }
          
          setCanvasScale(newScale);
          setCanvasTranslateX(newTranslateX);
          setCanvasTranslateY(newTranslateY);
        }
      }
      isDrawing.current = false;
      return;
    }
    
    // Check for canvas pan (in pan/zoom mode)
    // Pan/Zoom mode - handle panning (boundaries will prevent panning at 100% zoom)
    if (isPanZoomMode && isPanningCanvas.current && touchCount === 1) {
      const deltaX = locationX - canvasPanStart.current.x;
      const deltaY = locationY - canvasPanStart.current.y;
      const newTranslateX = canvasPanStart.current.translateX + deltaX;
      const newTranslateY = canvasPanStart.current.translateY + deltaY;
      
      // Clamp translation to boundaries
      const clamped = clampTranslation(newTranslateX, newTranslateY, canvasScale);
      setCanvasTranslateX(clamped.x);
      setCanvasTranslateY(clamped.y);
      isDrawing.current = false;
      return;
    }
    

    // Check if dragging clock using ref (immediate, not state)
    if (isDraggingClockRef.current) {
      // Handle clock drag
      const totalDeltaX = locationX - clockDragStart.current.x;
      const totalDeltaY = locationY - clockDragStart.current.y;
      
      const clock = clocks.find(c => c.id === selectedClock);
      if (clock && user && partnerId) {
        // Calculate new position from initial position + total delta
        const newX = Math.max(0, Math.min(1, clockDragStart.current.initialX + totalDeltaX / SCREEN_WIDTH));
        const newY = Math.max(0, Math.min(1, clockDragStart.current.initialY + totalDeltaY / SCREEN_HEIGHT));
        
        console.log('[SharedDoodle] Dragging clock:', selectedClock, 'new pos:', newX, newY);
        
        // Update clock position in state immediately for smooth dragging
        setClocks(prev => prev.map(c => 
          c.id === selectedClock ? { ...c, x: newX, y: newY } : c
        ));
      }
      // Prevent drawing when dragging clock
      isDrawing.current = false;
      return;
    }

    if (!isDrawing.current) return;
    
    // Use functional update to prevent race conditions when drawing quickly
    // This ensures each update uses the latest state value, preventing
    // multiple rapid touch events from overwriting each other's updates
    setCurrentPath(prev => {
      // CRITICAL: If path is empty, we must start with "M" (move to), not "L" (line to)
      // This prevents "UnexpectedData" errors from invalid SVG paths
      if (!prev || prev.trim().length === 0) {
        // Path was cleared/reset - start fresh with "M"
        return getPathFromPoints(locationX, locationY, true);
      }
      
      // Only add point if moved significantly (reduce path size)
      const path = getPathFromPoints(locationX, locationY, false);
      const newPath = prev + path;
      
      // Limit path length to prevent Firebase errors
      if (newPath.length > 5000) {
        // Path is too long - save current path and start new one
        // Use setTimeout to avoid calling async functions during state update
        setTimeout(() => {
          if (prev.length > 0) {
            handleTouchEnd();
            // Start new path at current location
            const newStartPath = getPathFromPoints(locationX, locationY, true);
            setCurrentPath(newStartPath);
            if (currentPathStart.current) {
              currentPathStart.current = { x: locationX, y: locationY };
            }
          }
        }, 0);
        return prev; // Keep previous path until it's saved
      }
      
      return newPath;
    });
  }

  // Handle touch end
  async function handleTouchEnd() {
    // Reset canvas zoom/pan state
    if (isPinchingCanvas.current) {
      isPinchingCanvas.current = false;
      canvasPinchStartDistance.current = 0;
      canvasPinchStartScale.current = canvasScale;
    }
    
    if (isPanningCanvas.current) {
      isPanningCanvas.current = false;
    }
    
    // Clear touch timeout
    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current);
      touchTimeoutRef.current = null;
    }
    
    touchCountRef.current = 0;
    
    // Reset background pinch state
    if (isPinching.current) {
      isPinching.current = false;
      pinchStartDistance.current = 0;
      pinchStartScale.current = backgroundScale;
    }
    
    // Reset pan state (but don't exit adjustment mode - user needs to press Apply)
    if (isPanningBackground.current && background) {
      isPanningBackground.current = false;
      // Don't exit adjustment mode or save - wait for Apply button
      return;
    }

    // Handle clock pinch-to-resize end
    if (isPinchingClock.current && selectedClock) {
      const clock = clocks.find(c => c.id === selectedClock);
      if (clock && user && partnerId) {
        // Save final clock size to Firestore
        await updateDoodleClock(user.uid, partnerId, selectedClock!, clock.x, clock.y, clock.size);
      }
      isPinchingClock.current = false;
      clockPinchStartDistance.current = 0;
      return;
    }

    if (isDraggingClockRef.current) {
      // Check if clock was dragged to trash area
      const clock = clocks.find(c => c.id === selectedClock);
      if (clock && user && partnerId) {
        // Get final touch position from clock's current position
        const finalClockX = clock.x * SCREEN_WIDTH;
        const finalClockY = clock.y * SCREEN_HEIGHT;
        
        const TRASH_AREA_Y = 120;
        const TRASH_AREA_SIZE = 100;
        const isInTrashArea = finalClockY < TRASH_AREA_Y && 
                              Math.abs(finalClockX - SCREEN_WIDTH / 2) < TRASH_AREA_SIZE / 2;
        
        if (isInTrashArea) {
          // Delete clock when dragged to trash
          console.log('[SharedDoodle] Clock dragged to trash, deleting:', selectedClock);
          await handleDeleteClock(selectedClock!);
          setSelectedClock(null);
          isDraggingClockRef.current = false;
          setIsDraggingClock(false);
          return;
        }
        
        // Save final clock position to Firestore
        await updateDoodleClock(user.uid, partnerId, selectedClock!, clock.x, clock.y, clock.size);
      }
      setSelectedClock(null);
      isDraggingClockRef.current = false;
      setIsDraggingClock(false);
      return;
    }

    if (!isDrawing.current || !user || !partnerId) return;
    
    isDrawing.current = false;
    
    if (currentPath.length > 0 && currentPathStart.current) {
      try {
        const optimizedPath = optimizePath(currentPath);
        await addDoodlePath(
          user.uid,
          partnerId,
          optimizedPath,
          selectedColor,
          strokeWidth,
          isGlowEnabled
        );
      } catch (error: any) {
        console.error('[SharedDoodle] Error saving path:', error);
        if (error?.message?.includes('payload size')) {
          Alert.alert('Error', 'Drawing is too large. Please draw smaller strokes.');
        } else {
          Alert.alert('Error', 'Failed to save drawing.');
        }
      }
    }
    
    setCurrentPath('');
    currentPathStart.current = null;
  }

  // Calculate distance between two points
  function getDistance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Pick background image (no preview/cropping - goes straight to canvas adjustment)
  async function handlePickBackground() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library.');
        return;
      }

      // Pick image without any editing/cropping - user will adjust on canvas
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // No preview/cropping
        quality: 0.3, // Aggressive compression
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const asset = result.assets[0];
      const finalUri = asset.uri;

      if (user && partnerId) {
        try {
          // Read the image file as base64 (same approach as canvas.tsx)
          // Store as data URL in Firestore to avoid Firebase Storage Blob issues in React Native
          console.log('[SharedDoodle] Converting image to data URL...');
          const base64Data = await FileSystem.readAsStringAsync(finalUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          // Create data URL (same format as canvas.tsx uses)
          const dataUrl = `data:image/jpeg;base64,${base64Data}`;
          console.log('[SharedDoodle] Image converted to data URL (length:', dataUrl.length, ')');
          
          // Use data URL directly (stored in Firestore, not Storage)
          // This avoids the Blob/ArrayBuffer issues with Firebase Storage in React Native
          const downloadUrl = dataUrl;
          
          // Reset to default position and scale
          setBackgroundScale(1.0);
          setBackgroundTranslateX(0);
          setBackgroundTranslateY(0);
          
          // Set background and immediately enter adjustment mode
          await updateDoodleBackground(
            user.uid,
            partnerId,
            downloadUrl, // Use Storage URL instead of base64
            1.0,
            0,
            0
          );
          setIsAdjustingBackground(true);
          setShowTools(false); // Close drawer
          backgroundPanStart.current = { x: 0, y: 0, scale: 1.0, translateX: 0, translateY: 0 };
          pinchStartScale.current = 1.0;
        } catch (uploadError: any) {
          console.error('[SharedDoodle] Error uploading image:', uploadError);
          Alert.alert('Upload Failed', uploadError?.message || 'Failed to upload image. Please try again.');
          return;
        }
      }
    } catch (error: any) {
      console.error('[SharedDoodle] Error picking background:', error);
      if (error?.message?.includes('longer than')) {
        Alert.alert('Image Too Large', 'Please select a smaller image.');
      } else {
        Alert.alert('Error', 'Failed to pick background image.');
      }
    }
  }

  // Start adjusting background
  function handleStartAdjustBackground() {
    if (!background) return;
    setIsAdjustingBackground(true);
    setShowTools(false); // Close drawer
    pinchStartScale.current = backgroundScale;
  }

  // Apply background adjustments
  async function handleApplyBackground() {
    if (!isAdjustingBackground || !background || !user || !partnerId) return;
    
    setIsAdjustingBackground(false);
    await updateDoodleBackground(
      user.uid,
      partnerId,
      background.imageUrl,
      backgroundScale,
      backgroundTranslateX,
      backgroundTranslateY
    );
  }

  // Remove background
  async function handleRemoveBackground() {
    if (!user || !partnerId) return;
    await removeDoodleBackground(user.uid, partnerId);
    setBackground(null);
    setIsAdjustingBackground(false);
  }

  // Open clock configuration panel
  function handleOpenClockConfig() {
    setShowClockConfig(true);
    setShowTools(false); // Close main tools drawer
    // Ensure drawer is visible
    Animated.spring(drawerAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }

  // Apply clock configuration and add to canvas
  async function handleApplyClock() {
    if (!user || !partnerId) return;
    
    await addDoodleClock(
      user.uid,
      partnerId,
      'digital',
      0.5, // Center X
      0.3, // Upper third
      120, // Size
      clockConfig.font,
      clockConfig.bold,
      clockConfig.color
    );
    
    // Reset config and close panel
    setShowClockConfig(false);
    setShowTools(false); // Close drawer
    setClockConfig({
      font: 'SF Pro Display',
      bold: false,
      color: '#2D2A2B',
    });
  }

  // Delete clock
  async function handleDeleteClock(clockId: string) {
    if (!user || !partnerId) return;
    await deleteDoodleClock(user.uid, partnerId, clockId);
  }

  // Undo last path
  async function handleUndo() {
    if (!user || !partnerId) return;
    await undoLastPath(user.uid, partnerId);
  }

  // Clear all
  async function handleClear() {
    if (!user || !partnerId) return;
    
    Alert.alert(
      'Clear Canvas',
      'This will clear all drawings and clocks for both you and your partner. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear drawings
              await clearSharedDoodle(user.uid, partnerId);
              // Clear all clocks
              const clocksToDelete = [...clocks];
              for (const clock of clocksToDelete) {
                await deleteDoodleClock(user.uid, partnerId, clock.id);
              }
            } catch (error) {
              console.error('[SharedDoodle] Error clearing:', error);
              Alert.alert('Error', 'Failed to clear canvas.');
            }
          },
        },
      ]
    );
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

  // Render Apple-style digital clock
  function renderClock(clock: DoodleClock) {
    const clockX = clock.x * SCREEN_WIDTH;
    const clockY = clock.y * SCREEN_HEIGHT;
    const size = clock.size;
    
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    
    const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    
    // Get font family from clock config or use default
    // Map display name to actual font family value
    const fontDisplayName = clock.font || 'SF Pro Display';
    const fontMap: { [key: string]: string } = {
      'SF Pro Display': Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif-light',
      'Helvetica Neue': Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
      'System': Platform.OS === 'ios' ? 'System' : 'Roboto',
    };
    const fontFamily = fontMap[fontDisplayName] || fontMap['SF Pro Display'];
    const fontWeight = clock.bold ? '600' : '300';
    const textColor = clock.color || colors.text;
    
    return (
      <View
        key={clock.id}
        style={{
          position: 'absolute',
          left: clockX - size / 2,
          top: clockY - size / 2,
          width: size * 1.5, // Larger hit area
          height: size * 1.5,
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none', // Don't intercept touches - let canvas handle them
        }}
      >
        <Text
          style={[
            {
              fontFamily,
              fontWeight,
              fontSize: size * 0.4,
              color: textColor,
              letterSpacing: 2,
            },
          ]}
        >
          {timeString}
        </Text>
      </View>
    );
  }

  const drawerTranslateY = drawerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar hidden />
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading shared canvas...
          </Text>
        </View>
      ) : (
        <>
          {/* Full Screen Canvas */}
          <View
            ref={canvasRef}
            style={styles.canvasContainer}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={handleTouchStart}
            onResponderMove={handleTouchMove}
            onResponderRelease={handleTouchEnd}
            onResponderTerminate={handleTouchEnd}
            onResponderTerminationRequest={() => false}
            collapsable={false}
          >
            {/* Zoom/Pan Container - Unified transform for both background and drawings (no parallax) */}
            <View
              ref={transformedContainerRef}
              style={[
                StyleSheet.absoluteFill,
                {
                  transform: [
                    { translateX: canvasTranslateX },
                    { translateY: canvasTranslateY },
                    { scale: canvasScale },
                  ],
                },
              ]}
            >
              {/* Background Image - Only background adjustment transform (no canvas transform) */}
              {background && (
                <Image
                  source={{ uri: background.imageUrl }}
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

              {/* SVG Drawing Layer - No transform (inherits from container) */}
              <Svg
                style={StyleSheet.absoluteFill}
                viewBox={`0 0 ${SCREEN_WIDTH} ${SCREEN_HEIGHT}`}
                width={SCREEN_WIDTH}
                height={SCREEN_HEIGHT}
              >
                {/* Render all saved paths */}
                {allPaths.flatMap((pathData) =>
                  renderPathWithGlow(
                    pathData.path,
                    pathData.color,
                    pathData.strokeWidth,
                    pathData.glow || false,
                    pathData.id
                  )
                )}
                
                {/* Render current stroke being drawn */}
                {currentPath.length > 0 &&
                  renderPathWithGlow(
                    currentPath,
                    selectedColor,
                    strokeWidth,
                    isGlowEnabled,
                    'current-path'
                  )}
              </Svg>
            </View>

            {/* Clocks - Render directly, but don't intercept touches */}
            {clocks.map(renderClock)}

            {/* Empty state hint */}
            {allPaths.length === 0 && currentPath.length === 0 && !background && clocks.length === 0 && (
              <View style={styles.emptyHint}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Draw together! ✏️
                </Text>
              </View>
            )}

            {/* Adjustment mode hint */}
            {isAdjustingBackground && (
              <View style={styles.adjustmentHint}>
                <Text style={[styles.adjustmentHintText, { color: colors.textSecondary }]}>
                  Pinch to zoom • Drag to move
                </Text>
              </View>
            )}

            {/* Pan/Zoom mode hint */}
            {isPanZoomMode && (
              <View style={styles.adjustmentHint}>
                <Text style={[styles.adjustmentHintText, { color: colors.textSecondary }]}>
                  Drag to pan • Use slider to zoom
                </Text>
              </View>
            )}
          </View>

          {/* Floating Close Button */}
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.cardBackground }]}
            onPress={() => router.back()}
          >
            <X size={20} color={colors.text} />
          </TouchableOpacity>

          {/* Trash Icon - Shows when dragging a clock */}
          {isDraggingClock && selectedClock && (
            <View style={styles.trashArea}>
              <View style={[styles.trashIcon, { backgroundColor: colors.error || '#FF4757' }]}>
                <Trash2 size={24} color="#FFFFFF" />
              </View>
            </View>
          )}

          {/* Floating Menu Button */}
          {!isAdjustingBackground && !showClockConfig && (
            <TouchableOpacity
              style={[styles.menuButton, { backgroundColor: colors.cardBackground }]}
              onPress={() => setShowTools(!showTools)}
            >
              <Menu size={20} color={colors.text} />
            </TouchableOpacity>
          )}

          {/* Apply Button - Only shown when adjusting background */}
          {isAdjustingBackground && (
            <TouchableOpacity
              style={[styles.applyButton, { backgroundColor: colors.tint }]}
              onPress={handleApplyBackground}
            >
              <Check size={20} color="#FFFFFF" />
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          )}

          {/* Pull-out Tool Drawer */}
          {!showClockConfig ? (
            <Animated.View
              style={[
                styles.drawer,
                {
                  backgroundColor: colors.cardBackground,
                  transform: [{ translateY: drawerTranslateY }],
                },
              ]}
            >
              {/* Brush Options - Show when brush button is active */}
              {showBrushOptions && (
                <>
                  {/* Color Picker */}
                  <View style={styles.colorPicker}>
                    {COLORS.map((colorOption) => {
                      const isSelected = selectedColor === colorOption.color;
                      const isWhite = colorOption.color === '#FFFFFF';
                      return (
                        <TouchableOpacity
                          key={colorOption.id}
                          style={[
                            styles.colorOption,
                            {
                              backgroundColor: colorOption.color,
                              borderColor: isSelected 
                                ? colors.tint 
                                : isWhite 
                                ? colors.border || '#E0E0E0' 
                                : 'transparent',
                              borderWidth: isSelected ? 3 : isWhite ? 1 : 0,
                            },
                          ]}
                          onPress={() => setSelectedColor(colorOption.color)}
                        />
                      );
                    })}
                  </View>

                  {/* Stroke Width Control */}
                  <View style={styles.strokeWidthControl}>
                    <Text style={[styles.strokeWidthLabel, { color: colors.text }]}>Size</Text>
                    <View style={styles.strokeWidthButtons}>
                      <TouchableOpacity
                        style={[styles.strokeWidthButton, { backgroundColor: colors.background }]}
                        onPress={() => setStrokeWidth(prev => Math.max(1, prev - 1))}
                        disabled={strokeWidth <= 1}
                      >
                        <Minus 
                          size={18} 
                          color={strokeWidth <= 1 ? colors.textSecondary : colors.text} 
                        />
                      </TouchableOpacity>
                      
                      <View style={[styles.strokeWidthDisplay, { backgroundColor: colors.background }]}>
                        <Text style={[styles.strokeWidthValue, { color: colors.text }]}>
                          {strokeWidth}
                        </Text>
                      </View>
                      
                      <TouchableOpacity
                        style={[styles.strokeWidthButton, { backgroundColor: colors.background }]}
                        onPress={() => setStrokeWidth(prev => Math.min(20, prev + 1))}
                        disabled={strokeWidth >= 20}
                      >
                        <Plus 
                          size={18} 
                          color={strokeWidth >= 20 ? colors.textSecondary : colors.text} 
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
                          backgroundColor: isGlowEnabled ? colors.tint : colors.background,
                          borderColor: isGlowEnabled ? colors.tint : colors.border || '#E0E0E0',
                        },
                      ]}
                      onPress={() => setIsGlowEnabled(!isGlowEnabled)}
                    >
                      <Sparkles 
                        size={20} 
                        color={isGlowEnabled ? '#FFFFFF' : colors.text} 
                      />
                      <Text
                        style={[
                          styles.glowButtonText,
                          { color: isGlowEnabled ? '#FFFFFF' : colors.text },
                        ]}
                      >
                        Glow
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* Zoom Slider - Show when pan/zoom mode is active */}
              {isPanZoomMode && (
                <View style={styles.zoomControl}>
                  <Text style={[styles.zoomLabel, { color: colors.text }]}>
                    Zoom: {Math.round(canvasScale * 100)}%
                  </Text>
                  <View style={styles.zoomSliderContainer}>
                    <Text style={[styles.zoomMinMax, { color: colors.textSecondary }]}>100%</Text>
                    <View 
                      style={styles.zoomSliderWrapper}
                      onLayout={(e) => {
                        // Store slider width for calculations
                      }}
                      onStartShouldSetResponder={() => true}
                      onMoveShouldSetResponder={() => true}
                      onResponderGrant={(e) => {
                        const { locationX } = e.nativeEvent;
                        const sliderWidth = e.nativeEvent.layout?.width || SCREEN_WIDTH - 160;
                        const percentage = Math.max(0, Math.min(1, locationX / sliderWidth));
                        const newScale = 1 + (percentage * 4); // 1.0 to 5.0
                        
                        // Clamp current translation to new scale boundaries
                        const clamped = clampTranslation(canvasTranslateX, canvasTranslateY, newScale);
                        
                        // If zooming to 100%, center the canvas
                        if (newScale <= 1.0) {
                          setCanvasScale(1.0);
                          setCanvasTranslateX(0);
                          setCanvasTranslateY(0);
                        } else {
                          setCanvasScale(newScale);
                          setCanvasTranslateX(clamped.x);
                          setCanvasTranslateY(clamped.y);
                        }
                      }}
                      onResponderMove={(e) => {
                        const { locationX } = e.nativeEvent;
                        const sliderWidth = e.nativeEvent.layout?.width || SCREEN_WIDTH - 160;
                        const percentage = Math.max(0, Math.min(1, locationX / sliderWidth));
                        const newScale = 1 + (percentage * 4);
                        
                        // Clamp current translation to new scale boundaries
                        const clamped = clampTranslation(canvasTranslateX, canvasTranslateY, newScale);
                        
                        // If zooming to 100%, center the canvas
                        if (newScale <= 1.0) {
                          setCanvasScale(1.0);
                          setCanvasTranslateX(0);
                          setCanvasTranslateY(0);
                        } else {
                          setCanvasScale(newScale);
                          setCanvasTranslateX(clamped.x);
                          setCanvasTranslateY(clamped.y);
                        }
                      }}
                    >
                      <View style={styles.zoomSliderTrack}>
                        <View 
                          style={[
                            styles.zoomSliderFill,
                            { 
                              width: `${((canvasScale - 1) / 4) * 100}%`,
                              backgroundColor: colors.tint 
                            }
                          ]} 
                        />
                        <View
                          style={[
                            styles.zoomSliderThumb,
                            {
                              left: `${((canvasScale - 1) / 4) * 100}%`,
                              backgroundColor: colors.tint
                            }
                          ]}
                        />
                      </View>
                    </View>
                    <Text style={[styles.zoomMinMax, { color: colors.textSecondary }]}>500%</Text>
                  </View>
                </View>
              )}

              {/* Tools */}
              <View style={styles.toolsRow}>
                <TouchableOpacity
                  style={[
                    styles.toolButton, 
                    { 
                      backgroundColor: showBrushOptions ? colors.tint : colors.background 
                    }
                  ]}
                  onPress={() => {
                    setShowBrushOptions(!showBrushOptions);
                    setIsPanZoomMode(false); // Disable pan/zoom when brush is selected
                  }}
                >
                  <Paintbrush size={20} color={showBrushOptions ? '#FFFFFF' : colors.text} />
                  <Text style={[
                    styles.toolLabel, 
                    { color: showBrushOptions ? '#FFFFFF' : colors.text }
                  ]}>
                    Brush
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.toolButton, 
                    { 
                      backgroundColor: isPanZoomMode ? colors.tint : colors.background 
                    }
                  ]}
                  onPress={() => {
                    setIsPanZoomMode(!isPanZoomMode);
                    setShowBrushOptions(false); // Disable brush when pan/zoom is selected
                  }}
                >
                  <Move size={20} color={isPanZoomMode ? '#FFFFFF' : colors.text} />
                  <Text style={[
                    styles.toolLabel, 
                    { color: isPanZoomMode ? '#FFFFFF' : colors.text }
                  ]}>
                    Pan/Zoom
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toolButton, { backgroundColor: colors.background }]}
                  onPress={background ? handleStartAdjustBackground : handlePickBackground}
                >
                  <ImageIcon size={20} color={colors.text} />
                  <Text style={[styles.toolLabel, { color: colors.text }]}>
                    {background ? 'Adjust' : 'Background'}
                  </Text>
                </TouchableOpacity>

                {background && (
                  <TouchableOpacity
                    style={[styles.toolButton, { backgroundColor: colors.background }]}
                    onPress={handleRemoveBackground}
                  >
                    <X size={20} color={colors.text} />
                    <Text style={[styles.toolLabel, { color: colors.text }]}>Remove</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.toolButton, { backgroundColor: colors.background }]}
                  onPress={handleOpenClockConfig}
                >
                  <Clock size={20} color={colors.text} />
                  <Text style={[styles.toolLabel, { color: colors.text }]}>Clock</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toolButton, { backgroundColor: colors.background }]}
                  onPress={handleUndo}
                >
                  <Undo2 size={20} color={colors.text} />
                  <Text style={[styles.toolLabel, { color: colors.text }]}>Undo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toolButton, { backgroundColor: colors.background }]}
                  onPress={handleClear}
                >
                  <Trash2 size={20} color={colors.text} />
                  <Text style={[styles.toolLabel, { color: colors.text }]}>Clear</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          ) : (
            <Animated.View
              style={[
                styles.drawer,
                {
                  backgroundColor: colors.cardBackground,
                  transform: [{ translateY: drawerTranslateY }],
                },
              ]}
            >
              {/* Clock Configuration Panel */}
              <View style={styles.clockConfigPanel}>
                <View style={styles.clockConfigHeader}>
                  <TouchableOpacity
                    onPress={() => setShowClockConfig(false)}
                    style={styles.backButton}
                  >
                    <X size={20} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={[styles.clockConfigTitle, { color: colors.text }]}>Clock Style</Text>
                  <View style={{ width: 40 }} />
                </View>

                {/* Clock Preview */}
                <View style={[styles.clockPreview, { backgroundColor: colors.background }]}>
                  <Text
                    style={[
                      {
                        fontFamily: clockFonts.find(f => f.name === clockConfig.font)?.value || clockFonts[0].value,
                        fontWeight: clockConfig.bold ? '600' : '300',
                        fontSize: 48,
                        color: clockConfig.color,
                        letterSpacing: 2,
                      },
                    ]}
                  >
                    {String(currentTime.getHours()).padStart(2, '0')}:{String(currentTime.getMinutes()).padStart(2, '0')}
                  </Text>
                </View>

                {/* Font Selection */}
                <View style={styles.configSection}>
                  <Text style={[styles.configSectionTitle, { color: colors.text }]}>Font</Text>
                  <View style={styles.fontOptions}>
                    {clockFonts.map((font) => (
                      <TouchableOpacity
                        key={font.name}
                        style={[
                          styles.fontOption,
                          {
                            backgroundColor: clockConfig.font === font.name ? colors.tint : colors.background,
                            borderColor: clockConfig.font === font.name ? colors.tint : colors.border,
                          },
                        ]}
                        onPress={() => setClockConfig({ ...clockConfig, font: font.name })}
                      >
                        <Text
                          style={[
                            styles.fontOptionText,
                            {
                              color: clockConfig.font === font.name ? '#FFFFFF' : colors.text,
                              fontFamily: font.value,
                            },
                          ]}
                        >
                          {font.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Bold Toggle */}
                <View style={styles.configSection}>
                  <Text style={[styles.configSectionTitle, { color: colors.text }]}>Weight</Text>
                  <TouchableOpacity
                    style={[
                      styles.boldToggle,
                      {
                        backgroundColor: clockConfig.bold ? colors.tint : colors.background,
                        borderColor: clockConfig.bold ? colors.tint : colors.border,
                      },
                    ]}
                    onPress={() => setClockConfig({ ...clockConfig, bold: !clockConfig.bold })}
                  >
                    <Text
                      style={[
                        styles.boldToggleText,
                        {
                          color: clockConfig.bold ? '#FFFFFF' : colors.text,
                          fontWeight: clockConfig.bold ? '600' : '300',
                        },
                      ]}
                    >
                      {clockConfig.bold ? 'Bold' : 'Regular'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Color Selection */}
                <View style={styles.configSection}>
                  <Text style={[styles.configSectionTitle, { color: colors.text }]}>Color</Text>
                  <View style={styles.colorOptions}>
                    {clockColors.map((colorOption) => (
                      <TouchableOpacity
                        key={colorOption.name}
                        style={[
                          styles.colorOptionButton,
                          {
                            backgroundColor: colorOption.value,
                            borderColor: clockConfig.color === colorOption.value ? colors.tint : 'transparent',
                            borderWidth: clockConfig.color === colorOption.value ? 3 : 0,
                          },
                        ]}
                        onPress={() => setClockConfig({ ...clockConfig, color: colorOption.value })}
                      >
                        {clockConfig.color === colorOption.value && (
                          <Check size={16} color={colorOption.value === '#FFFFFF' ? '#000000' : '#FFFFFF'} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Apply Button */}
                <TouchableOpacity
                  style={[styles.applyClockButton, { backgroundColor: colors.tint }]}
                  onPress={handleApplyClock}
                >
                  <Check size={20} color="#FFFFFF" />
                  <Text style={styles.applyClockButtonText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  canvasContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  backgroundImage: {
    position: 'absolute',
    width: SCREEN_WIDTH * 2,
    height: SCREEN_HEIGHT * 2,
    top: -SCREEN_HEIGHT / 2,
    left: -SCREEN_WIDTH / 2,
  },
  emptyHint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  adjustmentHint: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustmentHintText: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.7,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  menuButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  applyButton: {
    position: 'absolute',
    bottom: 100,
    left: '50%',
    marginLeft: -60,
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
  drawer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  colorPicker: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
  },
  strokeWidthControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  strokeWidthLabel: {
    fontSize: 14,
    fontWeight: '600',
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
    borderColor: 'transparent',
  },
  strokeWidthDisplay: {
    minWidth: 50,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  strokeWidthValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  glowControl: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
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
  zoomControl: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  zoomLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  zoomSliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  zoomMinMax: {
    fontSize: 12,
    minWidth: 50,
    textAlign: 'center',
  },
  zoomSliderWrapper: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  zoomSliderTrack: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    position: 'relative',
  },
  zoomSliderFill: {
    height: '100%',
    borderRadius: 2,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  zoomSliderThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: 'absolute',
    top: -8,
    marginLeft: -10,
  },
  toolsRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  toolButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
    minWidth: 80,
  },
  toolLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  appleClock: {
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif-light',
    fontWeight: '300',
    letterSpacing: 2,
  },
  trashArea: {
    position: 'absolute',
    top: 50,
    left: '50%',
    marginLeft: -40,
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  trashIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
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
  // Clock Configuration Panel
  clockConfigPanel: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  clockConfigHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockConfigTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  clockPreview: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    borderRadius: 16,
    marginBottom: 24,
  },
  configSection: {
    marginBottom: 24,
  },
  configSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  fontOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fontOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 100,
    alignItems: 'center',
  },
  fontOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  boldToggle: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  boldToggleText: {
    fontSize: 16,
    fontWeight: '500',
  },
  colorOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOptionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  applyClockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  applyClockButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
