// Options Page JavaScript
class OptionsPage {
  constructor() {
    this.authStatusDiv = document.getElementById('authStatus');
    this.authBtn = document.getElementById('authBtn');
    this.signOutBtn = document.getElementById('signOutBtn');
    this.clearCacheBtn = document.getElementById('clearCacheBtn');

    this.init();
  }

  async init() {
    // Set up event listeners
    this.authBtn.addEventListener('click', () => this.authenticate());
    this.signOutBtn.addEventListener('click', () => this.signOut());
    this.clearCacheBtn.addEventListener('click', () => this.clearCache());

    // Check initial state
    await this.checkAuthStatus();
  }

  async checkAuthStatus() {
    try {
      // Check saved token
      const result = await chrome.storage.local.get(['accessToken']);

      if (result.accessToken) {
        this.showAuthenticatedStatus();
      } else {
        this.showNotAuthenticatedStatus();
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      this.showNotAuthenticatedStatus();
    }
  }

  showAuthenticatedStatus() {
    this.authStatusDiv.className = 'auth-status authenticated';
    this.authStatusDiv.innerHTML = '<span class="status-icon">✅</span>Authenticated';

    this.authBtn.classList.add('hidden');
    this.signOutBtn.classList.remove('hidden');
  }

  showNotAuthenticatedStatus() {
    this.authStatusDiv.className = 'auth-status not-authenticated';
    this.authStatusDiv.innerHTML = '<span class="status-icon">❌</span>Not authenticated';

    this.authBtn.classList.remove('hidden');
    this.signOutBtn.classList.add('hidden');
  }

  async authenticate() {
    try {
      this.authBtn.disabled = true;
      this.authBtn.innerHTML = '<span class="loading"></span>Authenticating...';

      const response = await chrome.runtime.sendMessage({
        type: 'AUTHENTICATE'
      });

      if (response.success) {
        this.showAuthenticatedStatus();
        alert('Authentication completed!');
      } else {
        alert(`Authentication failed: ${response.error}`);
        this.showNotAuthenticatedStatus();
      }
    } catch (error) {
      console.error('Authentication error:', error);
      alert(`Authentication error: ${error.message}`);
      this.showNotAuthenticatedStatus();
    } finally {
      this.authBtn.disabled = false;
      this.authBtn.textContent = 'Authenticate with Google Account';
    }
  }

  async signOut() {
    if (confirm('Do you want to sign out? Authentication will be required to use again.')) {
      try {
        // Remove token from local storage
        await chrome.storage.local.remove(['accessToken']);

        // Also invalidate Chrome auth tokens
        try {
          await chrome.identity.clearAllCachedAuthTokens();
        } catch (e) {
          console.warn('Failed to clear cached tokens:', e);
        }

        this.showNotAuthenticatedStatus();
        alert('Signed out.');
      } catch (error) {
        console.error('Sign out error:', error);
        alert(`Sign out error: ${error.message}`);
      }
    }
  }

  async clearCache() {
    if (confirm('Clear cached folder information?')) {
      try {
        // Remove cached folder information
        const allData = await chrome.storage.local.get();
        const keysToRemove = Object.keys(allData).filter(key =>
          key.startsWith('folderInfo_')
        );

        if (keysToRemove.length > 0) {
          await chrome.storage.local.remove(keysToRemove);
        }

        alert(`Cleared ${keysToRemove.length} cache entries.`);
      } catch (error) {
        console.error('Clear cache error:', error);
        alert(`Cache clear error: ${error.message}`);
      }
    }
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  new OptionsPage();
});
