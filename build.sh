#!/bin/bash

set -euo pipefail

BUILD_BUNDLE=false
BUILD_IOS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -b|--bundle)
            BUILD_BUNDLE=true
            shift
            ;;
        -i|--ios)
            BUILD_IOS=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -b, --bundle    Build AAB (Android App Bundle) instead of APK"
            echo "  -i, --ios       Build iOS app (requires macOS + Xcode)"
            echo "  -h, --help      Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

if [ "$BUILD_IOS" = true ]; then
    if [[ "$(uname)" != "Darwin" ]]; then
        echo "ERROR: iOS builds require macOS"
        exit 1
    fi

    echo "Building iOS app..."
    cargo tauri ios build

    IPA_PATH="src-tauri/gen/apple/build/arm64/Numbat.ipa"
    if [ -f "$IPA_PATH" ]; then
        cp "$IPA_PATH" ./numbat.ipa
        echo ""
        echo "IPA created: $(realpath "./numbat.ipa")"
        echo ""
        echo "Install with Sideloadly or AltStore."
    else
        echo ""
        echo "ERROR: IPA not found at $IPA_PATH"
        exit 1
    fi
else
    export JAVA_HOME="/usr/lib/jvm/java-17-openjdk"
    export ANDROID_HOME="$HOME/Android/Sdk"
    export NDK_HOME="$HOME/Android/Sdk/ndk/26.1.10909125"

    if [ -f "$HOME/.numbat-signing.env" ]; then
        source "$HOME/.numbat-signing.env"
    else
        echo "ERROR: Missing signing config. Create ~/.numbat-signing.env with:"
        echo '  export KEYSTORE_PATH="/path/to/keystore"'
        echo '  export KEYSTORE_PASSWORD="your_password"'
        echo '  export KEY_ALIAS="numbat"'
        echo '  export KEY_PASSWORD="your_password"'
        exit 1
    fi

    if [ "$BUILD_BUNDLE" = true ]; then
        cargo tauri android build --target aarch64
        BUNDLE_PATH="src-tauri/gen/android/app/build/outputs/bundle/universalRelease/app-universal-release.aab"
        cp "$BUNDLE_PATH" ./numbat.aab
        echo ""
        echo "Signed release AAB: $(realpath "./numbat.aab")"
    else
        cargo tauri android build --target aarch64 --apk true
        APK_PATH="src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk"
        cp "$APK_PATH" ./numbat.apk
        echo ""
        echo "Signed release APK: $(realpath "./numbat.apk")"
    fi
fi
