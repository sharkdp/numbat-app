#!/bin/bash
if grep -E 'DEVELOPMENT_TEAM = "[^"]+";' src-tauri/gen/apple/numbat-app.xcodeproj/project.pbxproj 2>/dev/null | grep -v 'DEVELOPMENT_TEAM = "";' > /dev/null; then
    echo "ERROR: DEVELOPMENT_TEAM contains personal ID. Set to empty string."
    exit 1
fi
