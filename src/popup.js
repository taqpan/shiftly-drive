// Popup JavaScript - User interface control
class ShiftlyDrivePopup {
  constructor() {
    this.contentDiv = document.getElementById('content');
    this.refreshBtn = document.getElementById('refreshBtn');
    this.init();
  }

  async init() {
    // Set up refresh button event
    this.refreshBtn.addEventListener('click', () => {
      this.loadFolderInfo(true);
    });

    // Load initial data
    await this.loadFolderInfo();
  }

  // Load folder information
  async loadFolderInfo(forceRefresh = false) {
    try {
      this.showLoading();

      // Get active tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];

      // Check if it's a Google Drive/Docs page
      if (!this.isGoogleDriveUrl(currentTab.url)) {
        this.showError('This page is not Google Drive or Google Docs.');
        return;
      }

      // Get current file information from content script
      const response = await chrome.tabs.sendMessage(currentTab.id, {
        type: 'GET_CURRENT_FILE'
      });

      if (!response || !response.fileId) {
        this.showError('Unable to detect the currently open file.\nPlease make sure the file is properly loaded.\n\nSupported URLs:\n• drive.google.com/file/d/[ID]\n• docs.google.com/document/d/[ID]\n• sheets.google.com/spreadsheets/d/[ID]\n• slides.google.com/presentation/d/[ID]');
        return;
      }

      // Get folder information from background script
      const folderResponse = await chrome.runtime.sendMessage({
        type: 'GET_FOLDER_INFO',
        fileId: response.fileId,
        forceRefresh: forceRefresh
      });

      if (!folderResponse.success) {
        if (folderResponse.error.includes('Authentication')) {
          this.showAuthRequired();
        } else {
          this.showError(`An error occurred: ${folderResponse.error}`);
        }
        return;
      }

      // Display folder information
      this.displayFolderInfo(folderResponse.data);

    } catch (error) {
      console.error('Error loading folder info:', error);
      this.showError(`An unexpected error occurred: ${error.message}`);
    }
  }

  // Check if URL is Google Drive/Docs
  isGoogleDriveUrl(url) {
    return url.includes('drive.google.com') ||
           url.includes('docs.google.com') ||
           url.includes('sheets.google.com') ||
           url.includes('slides.google.com');
  }

  // Show loading state
  showLoading() {
    this.contentDiv.innerHTML = `
      <div class="loading" id="loadingMsg">
        Loading...
      </div>
    `;
  }

  // Show error message
  showError(message) {
    this.contentDiv.innerHTML = `
      <div class="error">
        ${message.replace(/\n/g, '<br>')}
      </div>
    `;
  }

  // Show authentication required message
  showAuthRequired() {
    this.contentDiv.innerHTML = `
      <div class="auth-section">
        <p>Authentication is required to access Google Drive.</p>
        <button class="auth-button" id="authBtn">
          Authenticate with Google Account
        </button>
      </div>
    `;

    // Authentication button event
    document.getElementById('authBtn').addEventListener('click', async () => {
      try {
        document.getElementById('authBtn').disabled = true;
        document.getElementById('authBtn').textContent = 'Authenticating...';

        const authResponse = await chrome.runtime.sendMessage({
          type: 'AUTHENTICATE'
        });

        if (authResponse && authResponse.success) {
          // Reload folder information after successful authentication
          await this.loadFolderInfo();
        } else {
          const errorMsg = authResponse ?
            (authResponse.error || 'Unknown error') :
            'No response received';
          console.error('Authentication failed:', authResponse);
          this.showError(`Authentication failed: ${errorMsg}`);
        }
      } catch (error) {
        console.log('Authentication request failed:', error);
        this.showError(`Authentication request error: ${error.message || error.toString()}`);
      }
    });
  }

  // Display folder information
  displayFolderInfo(data) {
    if (!data || !data.file) {
      this.showError('Unable to retrieve file information.');
      return;
    }

    let html = `
      <div class="file-info">
        <div class="file-name">${this.escapeHtml(data.file.name)}</div>
        <div class="file-url">Current File</div>
      </div>
    `;

    if (data.folders && data.folders.length > 0) {
      html += `
        <div class="folders-section">
          <h3>📁 Parent Folders</h3>
          <ul class="folder-list">
      `;

      data.folders.forEach(folder => {
        html += `
          <li class="folder-item">
            <a href="${folder.url}" target="_blank" class="folder-link">
              <span class="folder-icon">📁</span>
              <span class="folder-name">${this.escapeHtml(folder.name)}</span>
            </a>
          </li>
        `;
      });

      html += `
          </ul>
        </div>
      `;
    } else {
      html += `
        <div class="no-folders">
          No parent folders found for this file.<br>
          This may be a root folder or shared file.
        </div>
      `;
    }

    this.contentDiv.innerHTML = html;

    // Set up click events for external links
    const folderLinks = this.contentDiv.querySelectorAll('.folder-link');
    folderLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: link.href });
        window.close(); // Close popup
      });
    });
  }

  // HTML escape
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  new ShiftlyDrivePopup();
});
