# Shiftly Drive

A Google Chrome browser extension that provides a quick UI to open the folder containing the currently opened Google Drive file in your browser.

## Features

- **Folder Detection**: Automatically detects parent folders of currently opened Google Drive files or Google Docs files
- **One-Click Access**: Access detected folders with a single click
- **Google Drive API Integration**: Retrieves accurate folder information
- **OAuth Authentication**: Secure Google account authentication

## Supported Sites

- Google Drive (drive.google.com)
- Google Docs (docs.google.com)
- Google Sheets (sheets.google.com)
- Google Slides (slides.google.com)

## Installation

### Development Version Installation

1. Clone or download this repository
2. Open `chrome://extensions/` in Chrome
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select this project folder

### Google Cloud Console Setup

To use the extension, you need to set up OAuth authentication in Google Cloud Console:

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Google Drive API
3. Create OAuth 2.0 credentials:
   - Application type: Chrome extension
   - Application ID: Your Chrome extension ID (available at chrome://extensions/)
4. Update `oauth2.client_id` in `manifest.json`

## How to Use

1. Open a file in Google Drive or Google Docs
2. Click the Shiftly Drive icon in the browser toolbar
3. Click on the displayed parent folder links
4. The parent folder opens in a new tab

## Project Structure

```
shiftly-drive/
├── manifest.json          # Chrome extension configuration
├── README.md             # Project documentation
└── src/
    ├── background.js     # Service worker (API communication)
    ├── content.js        # Content script (URL analysis)
    ├── popup.html        # Main UI (HTML)
    ├── popup.js          # Main UI (JavaScript)
    ├── options.html      # Settings page (HTML)
    └── options.js        # Settings page (JavaScript)
```

## Technologies Used

- **Chrome Extensions Manifest V3**: Latest extension format
- **Google Drive API v3**: File and folder information retrieval
- **Chrome Identity API**: OAuth authentication
- **Vanilla JavaScript**: No external dependencies

## API Permissions

- `identity`: Google account authentication
- `storage`: Cache folder information
- `activeTab`: Access current tab URL

## Development

### Prerequisites

- Google Chrome
- Google Cloud Console account
- Basic understanding of JavaScript and Chrome extensions

### Local Development

1. Make changes to the source code
2. Reload the extension at `chrome://extensions/`
3. Test functionality on Google Drive/Docs pages

## License

MIT License

## Contributing

Bug reports and feature suggestions are welcome through Issues. Pull requests are also appreciated.

## Privacy

This extension:
- Only requests read-only access to your Google Drive
- Caches folder information locally for 5 minutes
- Does not send data to external servers
- Operates entirely within your browser and Google's services
