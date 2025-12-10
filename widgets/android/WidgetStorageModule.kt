package com.lovewidgets.app.widget

import android.content.Context
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

/**
 * Native module to save widget data to SharedPreferences
 * This ensures the widget can read the data reliably
 */
class WidgetStorageModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "WidgetStorageModule"
    }

    @ReactMethod
    fun saveWidgetData(key: String, value: String, promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences("love_widget_prefs", Context.MODE_PRIVATE)
            prefs.edit().putString(key, value).apply()
            
            // Trigger widget update
            val intent = android.content.Intent(android.appwidget.AppWidgetManager.ACTION_APPWIDGET_UPDATE)
            intent.setPackage(reactApplicationContext.packageName)
            reactApplicationContext.sendBroadcast(intent)
            
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SAVE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getWidgetData(key: String, promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences("love_widget_prefs", Context.MODE_PRIVATE)
            val value = prefs.getString(key, null)
            promise.resolve(value)
        } catch (e: Exception) {
            promise.reject("GET_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun reloadWidget(promise: Promise) {
        try {
            val intent = android.content.Intent(android.appwidget.AppWidgetManager.ACTION_APPWIDGET_UPDATE)
            intent.setPackage(reactApplicationContext.packageName)
            reactApplicationContext.sendBroadcast(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("RELOAD_ERROR", e.message, e)
        }
    }
}











