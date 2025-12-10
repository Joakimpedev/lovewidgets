package com.lovewidgets.app.widget

import com.lovewidgets.app.R
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import android.widget.RemoteViews

/**
 * LoveWidget - Android Home Screen Widget
 * Displays the latest widget image from SharedPreferences
 */
class LoveWidget : AppWidgetProvider() {

    companion object {
        const val ACTION_UPDATE_WIDGET = "com.lovewidgets.app.widget.UPDATE"
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        
        // Handle custom update action
        if (intent.action == ACTION_UPDATE_WIDGET || intent.action == AppWidgetManager.ACTION_APPWIDGET_UPDATE) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(
                android.content.ComponentName(context, LoveWidget::class.java)
            )
            if (appWidgetIds.isNotEmpty()) {
                onUpdate(context, appWidgetManager, appWidgetIds)
            }
        }
    }
    
    /**
     * Manually trigger widget update (can be called from React Native)
     */
    fun updateWidget(context: Context) {
        val appWidgetManager = AppWidgetManager.getInstance(context)
        val appWidgetIds = appWidgetManager.getAppWidgetIds(
            android.content.ComponentName(context, LoveWidget::class.java)
        )
        if (appWidgetIds.isNotEmpty()) {
            onUpdate(context, appWidgetManager, appWidgetIds)
        }
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        // Update all widget instances
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    private fun updateAppWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        // Create RemoteViews for the widget layout
        val views = RemoteViews(context.packageName, R.layout.widget_layout)

        try {
            // Get SharedPreferences (matches the name used in widgetStorage.ts)
            val prefs = context.getSharedPreferences("love_widget_prefs", Context.MODE_PRIVATE)
            
            // Read the image data (key matches WIDGET_STORAGE_KEY from widgetStorage.ts)
            val imageData = prefs.getString("@widget_image", null)
            
            android.util.Log.d("LoveWidget", "Reading SharedPreferences: love_widget_prefs")
            android.util.Log.d("LoveWidget", "Key: @widget_image")
            android.util.Log.d("LoveWidget", "Data found: ${!imageData.isNullOrEmpty()}")
            android.util.Log.d("LoveWidget", "Data length: ${imageData?.length ?: 0}")

            if (!imageData.isNullOrEmpty()) {
                // Decode Base64 to Bitmap
                val bitmap = decodeBase64ToBitmap(imageData)
                
                if (bitmap != null) {
                    // Set the bitmap to the ImageView
                    views.setImageViewBitmap(R.id.widget_image, bitmap)
                    android.util.Log.d("LoveWidget", "Widget updated with image successfully (${bitmap.width}x${bitmap.height})")
                } else {
                    // Failed to decode, show placeholder
                    views.setImageViewResource(R.id.widget_image, android.R.drawable.ic_menu_gallery)
                    android.util.Log.w("LoveWidget", "Failed to decode bitmap from data (length: ${imageData.length})")
                }
            } else {
                // No image data, show placeholder
                views.setImageViewResource(R.id.widget_image, android.R.drawable.ic_menu_gallery)
                android.util.Log.d("LoveWidget", "No image data found in SharedPreferences")
                
                // Debug: List all keys in SharedPreferences
                val allKeys = prefs.all.keys
                android.util.Log.d("LoveWidget", "All SharedPreferences keys: ${allKeys.joinToString()}")
            }
        } catch (e: Exception) {
            // Error reading data, show placeholder
            views.setImageViewResource(R.id.widget_image, android.R.drawable.ic_menu_gallery)
            android.util.Log.e("LoveWidget", "Error updating widget: ${e.message}", e)
            android.util.Log.e("LoveWidget", "Stack trace: ${e.stackTrace.joinToString("\n")}")
        }

        // Update the widget
        appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    /**
     * Decode Base64 string to Bitmap
     * Handles both data URLs (data:image/png;base64,...) and plain base64
     */
    private fun decodeBase64ToBitmap(base64String: String): Bitmap? {
        return try {
            // Remove data URL prefix if present
            val base64Data = if (base64String.startsWith("data:")) {
                base64String.substring(base64String.indexOf(",") + 1)
            } else {
                base64String
            }

            // Decode Base64 to byte array
            val imageBytes = Base64.decode(base64Data, Base64.DEFAULT)
            
            // Convert byte array to Bitmap
            BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
        } catch (e: Exception) {
            null
        }
    }
}

