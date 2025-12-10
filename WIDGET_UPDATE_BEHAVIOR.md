# Widget Update Behavior Configuration

## Current Behavior

The widget update system supports two modes:

### Testing Mode (Current - Both Widgets Update)
- **Sender's widget**: Updates when User A sends a drawing ✅
- **Receiver's widget**: Updates when User B receives the drawing ✅

This allows you to test widgets on both phones simultaneously.

### Production Mode (One-Way Only)
- **Sender's widget**: Does NOT update ❌
- **Receiver's widget**: Updates when receiving the drawing ✅

This is the intended production behavior - only the receiver sees the new drawing on their widget.

## Configuration

To switch between modes, edit `utils/widgetStorage.ts`:

```typescript
// Line 15: Change this flag
const UPDATE_SENDER_WIDGET = true;  // Testing mode (both update)
const UPDATE_SENDER_WIDGET = false; // Production mode (receiver only)
```

## How It Works

1. **When User A sends a drawing** (`app/canvas.tsx`):
   - Calls `saveToWidget(imageUrl, true)` - `true` indicates sender
   - If `UPDATE_SENDER_WIDGET = true`: Updates User A's widget
   - If `UPDATE_SENDER_WIDGET = false`: Skips User A's widget update

2. **When User B receives a drawing** (`app/(tabs)/letters.tsx`):
   - Calls `saveToWidget(imageUrl, false)` - `false` indicates receiver
   - Always updates User B's widget (regardless of flag)

## Testing

1. Set `UPDATE_SENDER_WIDGET = true` in `utils/widgetStorage.ts`
2. User A sends a drawing → Both widgets update
3. User B receives the drawing → User B's widget updates (already done)
4. Both users can see the widget on their phones for testing

## Production

1. Set `UPDATE_SENDER_WIDGET = false` in `utils/widgetStorage.ts`
2. User A sends a drawing → Only User B's widget will update
3. User B receives the drawing → User B's widget updates
4. Only the receiver sees new drawings on their widget

## Notes

- The receiver's widget always updates (this is the intended behavior)
- The sender's widget update is optional (for testing convenience)
- Changing the flag requires rebuilding the app for native code changes to take effect

