//
//  LoveWidgetBundle.swift
//  LoveWidget
//
//  Created by Harshil Jasoliya on 11/12/25.
//

import WidgetKit
import SwiftUI

@main
struct LoveWidgetBundle: WidgetBundle {
    var body: some Widget {
        LoveWidget()
        LoveWidgetLiveActivity()
    }
}
