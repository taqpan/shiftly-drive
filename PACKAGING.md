# Shiftly Drive - Package Scripts

This directory contains utility scripts for packaging the Chrome extension.

## Available Scripts

### `package.sh`
Main packaging script that creates distributable packages.

**Usage:**
```bash
# Create development package
./package.sh dev

# Create release package  
./package.sh release

# Default (development)
./package.sh
```

**Features:**
- ✅ Automatic version detection from manifest.json
- ✅ Development and release mode support
- ✅ ZIP package creation
- ✅ File validation and warnings
- ✅ Size reporting
- ✅ Detailed package summary

### Development Mode (`dev`)
- Includes development files (.editorconfig, etc.)
- Creates DEV-README.md with installation instructions
- Suitable for personal testing

### Release Mode (`release`)
- Production-ready package
- OAuth client ID validation
- Creates RELEASE-NOTES.md
- Ready for Chrome Web Store submission

## Output

Packages are created in the `dist/` directory:
- `shiftly-drive-{mode}-{version}/` (unpacked folder)
- `shiftly-drive-{mode}-{version}.zip` (ZIP package)

## Next Steps

1. **Personal Testing**: Use `./package.sh dev` to create a test package
2. **Load Extension**: Use Chrome's "Load unpacked" with the generated folder
3. **Release Preparation**: Use `./package.sh release` when ready for Chrome Web Store
