// Background Script - Communicates with Google Drive API
class ShiftlyDriveBackground {
  constructor() {
    this.accessToken = null;
    this.init();
  }

  init() {
    // Extension installation
    chrome.runtime.onInstalled.addListener(() => {
      // Initialize on extension installation
    });

    // Handle messages from content script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Enable async response
    });
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case 'FILE_DETECTED':
          // Process when file is detected
          await this.cacheFileInfo(message.fileId);
          sendResponse({ success: true });
          break;

        case 'GET_FOLDER_INFO':
          // Get folder information
          const folderInfo = await this.getFolderInfo(message.fileId);
          sendResponse({ success: true, data: folderInfo });
          break;

        case 'AUTHENTICATE':
          // Authentication process
          const authResult = await this.authenticate();
          sendResponse({ success: authResult.success, token: authResult.token, error: authResult.error });
          break;
          const storageCheck = await this.checkStorageStatus();
          sendResponse({ success: true, data: storageCheck });
          break;

        case 'TEST_DRIVE_ACCESS':
          // Drive API アクセステスト
          const driveAccessTest = await this.testDriveAccess();
          sendResponse({ success: driveAccessTest.success, data: driveAccessTest });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      console.error('Error type:', typeof error);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });

      const errorMessage = error.message || error.toString() || 'Unknown error occurred';
      sendResponse({
        success: false,
        error: errorMessage,
        errorDetails: error.toString()
      });
    }
  }

  // Google OAuth Authentication
  async authenticate() {
    try {
      // Check Chrome Identity API availability
      if (!chrome.identity) {
        throw new Error('Chrome Identity API is not available');
      }

      const tokenResponse = await chrome.identity.getAuthToken({
        interactive: true,
        scopes: ['https://www.googleapis.com/auth/drive.readonly']
      });

      // If token is an object, get the token property
      const token = typeof tokenResponse === 'object' && tokenResponse.token ?
        tokenResponse.token : tokenResponse;

      if (!token) {
        throw new Error('No access token received from Google');
      }

      this.accessToken = token;

      // Save token
      await this.saveTokenToStorage(token);

      return { success: true, token: token };
    } catch (error) {
      // Return error information
      const errorMessage = error.message || error.toString() || 'Unknown authentication error';
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // Get saved token
  async getSavedToken() {
    try {
      const result = await chrome.storage.local.get(['accessToken']);

      if (result.accessToken) {
        // If token is an object, get the token property
        const token = typeof result.accessToken === 'object' && result.accessToken !== null ?
          result.accessToken.token : result.accessToken;

        return token;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  // Save token to storage
  async saveTokenToStorage(token) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ accessToken: token }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }  // Get access token (authenticate if not already authenticated)
  async getAccessToken() {
    if (!this.accessToken) {
      this.accessToken = await this.getSavedToken();
    }

    if (!this.accessToken) {
      const authResult = await this.authenticate();
      if (!authResult.success) {
        throw new Error('Authentication required');
      }
    }

    return this.accessToken;
  }

  // Cache file information
  async cacheFileInfo(fileId) {
    try {
      const folderInfo = await this.getFolderInfo(fileId);
      await this.saveFolderInfoToCache(fileId, folderInfo);
    } catch (error) {
      console.error('Failed to cache file info:', error);
    }
  }

  // Get folder information using Google Drive API
  async getFolderInfo(fileId) {
    console.log('Getting folder info for file ID:', fileId);
    const token = await this.getAccessToken();

    try {
      // ファイル情報を取得
      const apiUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,parents,webViewLink`;
      console.log('API request URL:', apiUrl);
      console.log('Using token (first 20 chars):', token ? token.substring(0, 20) + '...' : 'No token');

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('API response status:', response.status);
      console.log('API response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
          console.error('API error response:', errorText);
        } catch (textError) {
          console.error('Could not read error response:', textError);
        }

        console.error('Full response details:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          headers: Object.fromEntries(response.headers.entries())
        });

        if (response.status === 401) {
          // トークンが無効な場合、再認証
          this.accessToken = null;
          await chrome.storage.local.remove(['accessToken']);
          throw new Error('Authentication expired. Please re-authenticate.');
        }
        if (response.status === 404) {
          throw new Error(`File not found or access denied. File ID: ${fileId}\nAPI Response: ${errorText}`);
        }
        if (response.status === 403) {
          throw new Error(`Access forbidden. File ID: ${fileId}\nPossible causes:\n- File is private\n- API quota exceeded\n- Insufficient permissions\nAPI Response: ${errorText}`);
        }
        throw new Error(`API request failed: ${response.status} ${response.statusText}\nAPI Response: ${errorText}`);
      }

      const fileData = await response.json();

      // 親フォルダの情報も取得
      const folders = [];
      if (fileData.parents && fileData.parents.length > 0) {
        for (const parentId of fileData.parents) {
          const folderResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files/${parentId}?fields=id,name,webViewLink`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );

          if (folderResponse.ok) {
            const folderData = await folderResponse.json();
            folders.push({
              id: folderData.id,
              name: folderData.name,
              url: folderData.webViewLink
            });
          }
        }
      }

      return {
        file: {
          id: fileData.id,
          name: fileData.name,
          url: fileData.webViewLink
        },
        folders: folders
      };

    } catch (error) {
      console.error('Error fetching folder info:', error);
      throw error;
    }
  }

  // Save folder information to cache
  async saveFolderInfoToCache(fileId, folderInfo) {
    return new Promise((resolve) => {
      const cacheKey = `folderInfo_${fileId}`;
      chrome.storage.local.set({
        [cacheKey]: {
          data: folderInfo,
          timestamp: Date.now()
        }
      }, resolve);
    });
  }

  // Get folder information from cache
  async getFolderInfoFromCache(fileId) {
    return new Promise((resolve) => {
      const cacheKey = `folderInfo_${fileId}`;
      chrome.storage.local.get([cacheKey], (result) => {
        const cached = result[cacheKey];
        if (cached && (Date.now() - cached.timestamp) < 300000) { // 5-minute cache
          resolve(cached.data);
        } else {
          resolve(null);
        }
      });
    });
  }
}

// Initialize background script
const shiftlyDrive = new ShiftlyDriveBackground();
