//
//  LoveWidget.swift
//  LoveWidgets Widget Extension
//
//  Bulletproof "Hello World" to test installation.
//

import WidgetKit
import SwiftUI

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date())
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let entry = SimpleEntry(date: Date())
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        let entry = SimpleEntry(date: Date())
        let timeline = Timeline(entries: [entry], policy: .atEnd)
        completion(timeline)
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
}

struct LoveWidgetEntryView : View {
    var entry: Provider.Entry

    var body: some View {
        ZStack {
            Color.pink.opacity(0.2)
            Text("IT WORKS!")
                .font(.largeTitle)
                .fontWeight(.bold)
                .foregroundColor(.pink)
        }
    }
}

@main
struct LoveWidget: Widget {
    let kind: String = "LoveWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            LoveWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Debug Widget")
        .description("If you can see this, the installation worked.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}