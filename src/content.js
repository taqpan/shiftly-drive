// Content Script - Operates on Google Drive pages
class DriveFileDetector {
  constructor() {
    this.currentFileId = null;
    this.init();
  }

  init() {
    // Wait for page to fully load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.setupDetection();
      });
    } else {
      this.setupDetection();
    }
  }

  setupDetection() {
    // Monitor URL changes (SPA support)
    this.observeUrlChanges();

    // Get file ID on initial load (try after short delay)
    setTimeout(() => this.detectCurrentFile(), 500);

    // Additional periodic check to ensure detection
    setTimeout(() => this.detectCurrentFile(), 2000);
  }

  // Monitor URL changes (Google Drive is SPA)
  observeUrlChanges() {
    let lastUrl = location.href;

    // Improved URL change detection
    const checkUrlChange = () => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        // Wait a bit after URL change for page update
        setTimeout(() => this.detectCurrentFile(), 1500);
      }
    };

    // Monitor DOM changes with MutationObserver
    new MutationObserver(checkUrlChange).observe(document, {
      subtree: true,
      childList: true
    });

    // Also detect browser back/forward with popstate event
    window.addEventListener('popstate', checkUrlChange);
  }

  // Detect current file ID
  detectCurrentFile() {
    const fileId = this.extractFileIdFromUrl();

    // If not found in URL, try extracting from DOM elements
    let finalFileId = fileId;
    if (!finalFileId) {
      finalFileId = this.extractFileIdFromDOM();
    }

    if (finalFileId && finalFileId !== this.currentFileId) {
      this.currentFileId = finalFileId;
      this.notifyFileChange(finalFileId);
    }
  }

  // Extract file ID from DOM elements (fallback)
  extractFileIdFromDOM() {
    // Try to get file ID from Google Drive data attributes
    try {
      // Look for selected file DOM element
      const selectedElement = document.querySelector('[data-id]');
      if (selectedElement) {
        const dataId = selectedElement.getAttribute('data-id');
        if (dataId && dataId.length > 20) { // Check if it looks like a file ID
          return dataId;
        }
      }

      // Get file ID from meta tag (Docs etc.)
      const metaTag = document.querySelector('meta[property="og:url"]');
      if (metaTag) {
        const content = metaTag.getAttribute('content');
        const match = content.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match) {
          return match[1];
        }
      }
    } catch (error) {
      // Ignore errors during DOM search
    }

    return null;
  }

  // Extract file ID from URL
  extractFileIdFromUrl() {
    const url = window.location.href;

    // Google Drive: https://drive.google.com/file/d/{fileId}/view
    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9-_]+)/);
    if (driveMatch) {
      return driveMatch[1];
    }

    // Google Docs, Sheets, Slides: https://docs.google.com/document/d/{fileId}/edit
    const docsMatch = url.match(/docs\.google\.com\/(?:document|spreadsheets|presentation)\/d\/([a-zA-Z0-9-_]+)/);
    if (docsMatch) {
      return docsMatch[1];
    }

    // File selected in Google Drive folder: ?selected={fileId}
    const urlParams = new URLSearchParams(window.location.search);
    const selectedFileId = urlParams.get('selected');
    if (selectedFileId && selectedFileId.length > 10) { // Check if file ID, not folder ID
      return selectedFileId;
    }

    // Google Drive My Drive URL: also detect selected files from various Drive URLs
    if (url.includes('drive.google.com/drive')) {
      // Also detect file ID from URL fragment (#)
      const hashMatch = window.location.hash.match(/\/([a-zA-Z0-9-_]{25,})/);
      if (hashMatch) {
        return hashMatch[1];
      }
    }

    return null;
  }

  // Notify background script of file change
  notifyFileChange(fileId) {
    chrome.runtime.sendMessage({
      type: 'FILE_DETECTED',
      fileId: fileId,
      url: window.location.href
    });
  }

  // Get current file ID (called from popup etc.)
  getCurrentFileId() {
    return this.currentFileId;
  }
}

// Initialize content script
const detector = new DriveFileDetector();

// Handle messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_CURRENT_FILE') {
    // Try real-time re-detection
    detector.detectCurrentFile();

    sendResponse({
      fileId: detector.getCurrentFileId(),
      url: window.location.href
    });
  }
});

// Content script loaded
