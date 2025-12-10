//
//  LoveWidget.swift
//  LoveWidgets Widget Extension
//
//  iOS Widget that displays the latest drawing received from partner
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
        
        // Update every 15 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: currentDate)!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
    
    private func getWidgetImage() -> String? {
        // Read from App Group UserDefaults
        if let sharedDefaults = UserDefaults(suiteName: "group.com.lovewidgets.data") {
            return sharedDefaults.string(forKey: "@widget_image")
        }
        return nil
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let imageData: String? // Base64 data URL
}

struct LoveWidgetEntryView : View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        Group {
            if let imageData = entry.imageData, let image = decodeBase64Image(imageData) {
                Image(uiImage: image)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .clipped()
            } else {
                // Placeholder when no image
                ZStack {
                    Color.white
                    VStack(spacing: 8) {
                        Image(systemName: "heart")
                            .font(.system(size: 40))
                            .foregroundColor(.gray)
                        Text("No drawing yet")
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                }
            }
        }
    }
    
    private func decodeBase64Image(_ base64String: String) -> UIImage? {
        // Remove data URL prefix if present
        let base64Data = base64String.hasPrefix("data:") 
            ? String(base64String.split(separator: ",").last ?? "")
            : base64String
        
        guard let data = Data(base64Encoded: base64Data) else {
            return nil
        }
        
        return UIImage(data: data)
    }
}

struct LoveWidget: Widget {
    let kind: String = "LoveWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            LoveWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Love Widget")
        .description("Shows the latest drawing from your partner.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct LoveWidget_Previews: PreviewProvider {
    static var previews: some View {
        LoveWidgetEntryView(entry: SimpleEntry(date: Date(), imageData: nil))
            .previewContext(WidgetPreviewContext(family: .systemSmall))
    }
}











