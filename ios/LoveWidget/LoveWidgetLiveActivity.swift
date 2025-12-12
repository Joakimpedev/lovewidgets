//
//  LoveWidgetLiveActivity.swift
//  LoveWidget
//
//  Created by Harshil Jasoliya on 11/12/25.
//

import ActivityKit
import WidgetKit
import SwiftUI

struct LoveWidgetAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Dynamic stateful properties about your activity go here!
        var emoji: String
    }

    // Fixed non-changing properties about your activity go here!
    var name: String
}

struct LoveWidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: LoveWidgetAttributes.self) { context in
            // Lock screen/banner UI goes here
            VStack {
                Text("Hello \(context.state.emoji)")
            }
            .activityBackgroundTint(Color.cyan)
            .activitySystemActionForegroundColor(Color.black)

        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI goes here.  Compose the expanded UI through
                // various regions, like leading/trailing/center/bottom
                DynamicIslandExpandedRegion(.leading) {
                    Text("Leading")
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("Trailing")
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text("Bottom \(context.state.emoji)")
                    // more content
                }
            } compactLeading: {
                Text("L")
            } compactTrailing: {
                Text("T \(context.state.emoji)")
            } minimal: {
                Text(context.state.emoji)
            }
            .widgetURL(URL(string: "http://www.apple.com"))
            .keylineTint(Color.red)
        }
    }
}

extension LoveWidgetAttributes {
    fileprivate static var preview: LoveWidgetAttributes {
        LoveWidgetAttributes(name: "World")
    }
}

extension LoveWidgetAttributes.ContentState {
    fileprivate static var smiley: LoveWidgetAttributes.ContentState {
        LoveWidgetAttributes.ContentState(emoji: "😀")
     }
     
     fileprivate static var starEyes: LoveWidgetAttributes.ContentState {
         LoveWidgetAttributes.ContentState(emoji: "🤩")
     }
}

#Preview("Notification", as: .content, using: LoveWidgetAttributes.preview) {
   LoveWidgetLiveActivity()
} contentStates: {
    LoveWidgetAttributes.ContentState.smiley
    LoveWidgetAttributes.ContentState.starEyes
}
