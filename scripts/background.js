/**
 * Flash Guardian Background Service Worker
 * Handles message passing and statistics tracking
 */

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Flash Guardian Background] Received message:', request);

  if (request.action === 'updateStats') {
    chrome.storage.sync.get(['stats'], (data) => {
      const stats = data.stats || {
        videosMonitored: 0,
        warningsIssued: 0,
        flashesDetected: 0
      };

      console.log('[Flash Guardian Background] Current stats:', stats);
      console.log('[Flash Guardian Background] Update type:', request.stat);

      // Update stats based on the request
      if (request.stat === 'videoMonitored') {
        stats.videosMonitored++;
        console.log('[Flash Guardian Background] Incremented videosMonitored to:', stats.videosMonitored);
      }
      if (request.stat === 'warningIssued') {
        stats.warningsIssued++;
        console.log('[Flash Guardian Background] Incremented warningsIssued to:', stats.warningsIssued);
      }
      if (request.stat === 'flashDetected') {
        stats.flashesDetected += request.count || 1;
        console.log('[Flash Guardian Background] Incremented flashesDetected by', request.count || 1, 'to:', stats.flashesDetected);
      }

      // Save updated stats
      chrome.storage.sync.set({ stats }, () => {
        console.log('[Flash Guardian Background] Stats saved:', stats);
        sendResponse({ success: true, stats });
      });
    });

    return true; // Keep message channel open for async response
  }
});

// Initialize default settings on install (first time only)
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Flash Guardian] onInstalled event:', details.reason);

  if (details.reason === 'install') {
    // First time installation - set defaults
    chrome.storage.sync.set({
      enabled: true,
      autoPause: true,
      stats: {
        videosMonitored: 0,
        warningsIssued: 0,
        flashesDetected: 0
      }
    });
    console.log('[Flash Guardian] Extension installed with default settings');
  } else if (details.reason === 'update') {
    // Extension updated - preserve existing stats, ensure settings exist
    chrome.storage.sync.get(['enabled', 'autoPause', 'stats'], (data) => {
      const updates = {};
      if (data.enabled === undefined) updates.enabled = true;
      if (data.autoPause === undefined) updates.autoPause = true;
      if (!data.stats) {
        updates.stats = {
          videosMonitored: 0,
          warningsIssued: 0,
          flashesDetected: 0
        };
      }
      if (Object.keys(updates).length > 0) {
        chrome.storage.sync.set(updates);
      }
      console.log('[Flash Guardian] Extension updated, settings preserved');
    });
  }
});
