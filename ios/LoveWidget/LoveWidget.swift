//
//  LoveWidget.swift
//  LoveWidget
//
//  Created by Harshil Jasoliya on 11/12/25.
//

import WidgetKit
import SwiftUI

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), imageData: nil)
    }
    
    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let entry = SimpleEntry(date: Date(), imageData: getWidgetImage())
        completion(entry)
    }
    
    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        let currentDate = Date()
        let entry = SimpleEntry(date: currentDate, imageData: getWidgetImage())
        
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 5, to: currentDate)!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
    
    private func getWidgetImage() -> String? {
        if let sharedDefaults = UserDefaults(suiteName: "group.com.lovewidgets.data") {
            return sharedDefaults.string(forKey: "@widget_image")
        }
        return nil
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let imageData: String?
}

struct LoveWidgetEntryView : View {
    var entry: Provider.Entry
    
    var gradient: LinearGradient {
        LinearGradient(
            colors: [
                Color(red: 1.0, green: 0.9, blue: 0.95),
                Color(red: 0.98, green: 0.85, blue: 0.95)
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
    
    var body: some View {
        if let imageData = entry.imageData, 
           let image = decodeBase64Image(imageData) {
            Image(uiImage: image)
                .resizable()
                .aspectRatio(contentMode: .fill)
                .clipped()
        } else {
            VStack(spacing: 16) {
                HStack(spacing: 4) {
                    Text("✨")
                        .font(.system(size: 24))
                    Image(systemName: "heart.fill")
                        .font(.system(size: 44))
                        .foregroundColor(Color.pink.opacity(0.6))
                    Text("✨")
                        .font(.system(size: 24))
                }
                
                VStack(spacing: 8) {
                    Text("Your partner's")
                        .font(.system(size: 15, weight: .medium))
                        .foregroundColor(Color.pink.opacity(0.8))
                    Text("drawing will")
                        .font(.system(size: 15, weight: .medium))
                        .foregroundColor(Color.pink.opacity(0.8))
                    Text("appear here 💕")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(Color.pink)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }
    
    private func decodeBase64Image(_ base64String: String) -> UIImage? {
        let base64Data: String
        if base64String.hasPrefix("data:") {
            let components = base64String.components(separatedBy: ",")
            base64Data = components.count > 1 ? components[1] : base64String
        } else {
            base64Data = base64String
        }
        
        guard let data = Data(base64Encoded: base64Data, options: .ignoreUnknownCharacters) else {
            return nil
        }
        
        return UIImage(data: data)
    }
}

struct LoveWidget: Widget {
    let kind: String = "LoveWidget"
    
    var gradient: LinearGradient {
        LinearGradient(
            colors: [
                Color(red: 1.0, green: 0.9, blue: 0.95),
                Color(red: 0.98, green: 0.85, blue: 0.95)
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
    
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            if #available(iOS 17.0, *) {
                LoveWidgetEntryView(entry: entry)
                    .containerBackground(gradient, for: .widget)
            } else {
                LoveWidgetEntryView(entry: entry)
                    .padding()
                    .background(gradient)
            }
        }
        .configurationDisplayName("Partner Drawing")
        .description("Your partner's latest drawing appears here automatically 💕")
        .supportedFamilies([.systemSmall, .systemLarge])
    }
}
