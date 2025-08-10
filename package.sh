#!/bin/bash

# Shiftly Drive Chrome Extension Package Script
# Usage: ./package.sh [dev|release]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default mode
MODE="${1:-dev}"

echo -e "${BLUE}🚀 Shiftly Drive - Chrome Extension Package Script${NC}"
echo -e "${BLUE}================================================${NC}"

# Validate mode
if [[ "$MODE" != "dev" && "$MODE" != "release" ]]; then
    echo -e "${RED}❌ Error: Invalid mode '$MODE'. Use 'dev' or 'release'${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Mode: $MODE${NC}"

# Get version from manifest.json
VERSION=$(grep -o '"version": "[^"]*"' manifest.json | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+')
echo -e "${YELLOW}📋 Version: $VERSION${NC}"

# Create output directory
OUTPUT_DIR="dist"
PACKAGE_NAME="shiftly-drive-${MODE}-${VERSION}"
PACKAGE_DIR="$OUTPUT_DIR/$PACKAGE_NAME"

echo -e "${YELLOW}🗂️  Creating package directory: $PACKAGE_DIR${NC}"
mkdir -p "$PACKAGE_DIR"

# Clean previous build
if [ -d "$PACKAGE_DIR" ]; then
    rm -rf "$PACKAGE_DIR"/*
fi

echo -e "${YELLOW}📂 Copying files...${NC}"

# Copy essential files
cp manifest.json "$PACKAGE_DIR/"
cp README.md "$PACKAGE_DIR/"
cp LICENSE "$PACKAGE_DIR/"

# Copy source files
mkdir -p "$PACKAGE_DIR/src"
cp src/*.js "$PACKAGE_DIR/src/"
cp src/*.html "$PACKAGE_DIR/src/"

# Copy icons
mkdir -p "$PACKAGE_DIR/icons"
cp icons/*.png "$PACKAGE_DIR/icons/"
cp icons/*.svg "$PACKAGE_DIR/icons/"

# Handle different modes
if [ "$MODE" = "dev" ]; then
    echo -e "${YELLOW}🔧 Development mode: Including development files${NC}"

    # Copy development files if they exist
    if [ -f ".editorconfig" ]; then
        cp .editorconfig "$PACKAGE_DIR/"
    fi

    if [ -f "manifest.example.json" ]; then
        cp manifest.example.json "$PACKAGE_DIR/"
    fi

    # Create development note
    cat > "$PACKAGE_DIR/DEV-README.md" << EOF
# Development Version

This is a development version of Shiftly Drive.

## Installation
1. Open chrome://extensions/
2. Enable Developer mode
3. Click "Load unpacked"
4. Select this folder

## OAuth Setup
Make sure to update the oauth2.client_id in manifest.json with your own Google Cloud Console credentials.

Built on: $(date)
EOF

elif [ "$MODE" = "release" ]; then
    echo -e "${YELLOW}🎯 Release mode: Production package${NC}"

    # Verify OAuth client ID is not the development one
    DEV_CLIENT_ID="978304882897-1k8e823iaqh5ee1jf62hd2hp29et6sbn.apps.googleusercontent.com"
    CURRENT_CLIENT_ID=$(grep -o '"client_id": "[^"]*"' manifest.json | grep -o '[^"]*\.apps\.googleusercontent\.com')

    if [ "$CURRENT_CLIENT_ID" = "$DEV_CLIENT_ID" ]; then
        echo -e "${RED}⚠️  Warning: Using development OAuth client ID${NC}"
        echo -e "${YELLOW}   Please update manifest.json with production credentials before release${NC}"
    fi

    # Create release note
    cat > "$PACKAGE_DIR/RELEASE-NOTES.md" << EOF
# Shiftly Drive v${VERSION}

## Release Package

This is a release package of Shiftly Drive Chrome Extension.

**Important**: This package is ready for Chrome Web Store submission.

## Contents
- All source files
- Icons in multiple sizes (16px, 48px, 128px, 256px, 512px)
- Manifest v3 configuration
- Documentation

Built on: $(date)
EOF
fi

# Create ZIP package
ZIP_NAME="${PACKAGE_NAME}.zip"
echo -e "${YELLOW}📦 Creating ZIP package: $OUTPUT_DIR/$ZIP_NAME${NC}"

cd "$OUTPUT_DIR"
zip -r "$ZIP_NAME" "$PACKAGE_NAME" > /dev/null
cd ..

# Calculate file sizes
PACKAGE_SIZE=$(du -sh "$PACKAGE_DIR" | cut -f1)
ZIP_SIZE=$(du -sh "$OUTPUT_DIR/$ZIP_NAME" | cut -f1)

# Show summary
echo -e "${GREEN}✅ Package created successfully!${NC}"
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}📁 Package folder: $PACKAGE_DIR ($PACKAGE_SIZE)${NC}"
echo -e "${GREEN}📦 ZIP package: $OUTPUT_DIR/$ZIP_NAME ($ZIP_SIZE)${NC}"
echo -e "${GREEN}🏷️  Version: $VERSION${NC}"
echo -e "${GREEN}🎯 Mode: $MODE${NC}"

# Show next steps
echo -e "\n${BLUE}📋 Next Steps:${NC}"
if [ "$MODE" = "dev" ]; then
    echo -e "${BLUE}1. Test the extension by loading unpacked from: $PACKAGE_DIR${NC}"
    echo -e "${BLUE}2. Verify OAuth authentication works${NC}"
    echo -e "${BLUE}3. Test on various Google Drive/Docs pages${NC}"
else
    echo -e "${BLUE}1. Review the package contents in: $PACKAGE_DIR${NC}"
    echo -e "${BLUE}2. Test the extension thoroughly${NC}"
    echo -e "${BLUE}3. Upload $OUTPUT_DIR/$ZIP_NAME to Chrome Web Store${NC}"
    echo -e "${BLUE}4. Prepare promotional images and screenshots${NC}"
fi

# Show package contents
echo -e "\n${YELLOW}📋 Package Contents:${NC}"
find "$PACKAGE_DIR" -type f | sort | sed 's|^|  |'

echo -e "\n${GREEN}🎉 Packaging complete!${NC}"
