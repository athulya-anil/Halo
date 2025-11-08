/**
 * Flash Guardian Popup Script
 * Handles settings and statistics display
 */

// Load settings from storage
chrome.storage.sync.get(['enabled', 'autoPause', 'stats'], (data) => {
  // Set toggle states
  document.getElementById('enableToggle').checked = data.enabled !== false;
  document.getElementById('autoPauseToggle').checked = data.autoPause !== false;

  // Update status display
  updateStatusDisplay(data.enabled !== false);

  // Display statistics
  if (data.stats) {
    document.getElementById('videosMonitored').textContent = data.stats.videosMonitored || 0;
    document.getElementById('warningsIssued').textContent = data.stats.warningsIssued || 0;
    document.getElementById('flashesDetected').textContent = data.stats.flashesDetected || 0;
  }
});

// Handle enable/disable toggle
document.getElementById('enableToggle').addEventListener('change', (e) => {
  const enabled = e.target.checked;

  chrome.storage.sync.set({ enabled }, () => {
    updateStatusDisplay(enabled);

    // Notify content scripts
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: enabled ? 'enable' : 'disable'
        });
      }
    });
  });
});

// Handle auto-pause toggle
document.getElementById('autoPauseToggle').addEventListener('change', (e) => {
  chrome.storage.sync.set({ autoPause: e.target.checked });
});

/**
 * Update status display based on enabled state
 */
function updateStatusDisplay(enabled) {
  const statusDiv = document.getElementById('status');

  if (enabled) {
    statusDiv.classList.remove('disabled');
    statusDiv.querySelector('h2').innerHTML = `
      <span class="status-indicator"></span>
      Protection Active
    `;
    statusDiv.querySelector('p').textContent = 'Monitoring videos for flashing content';
  } else {
    statusDiv.classList.add('disabled');
    statusDiv.querySelector('h2').innerHTML = `
      <span class="status-indicator"></span>
      Protection Disabled
    `;
    statusDiv.querySelector('p').textContent = 'Flash detection is currently off';
  }
}

// Refresh statistics every second while popup is open
setInterval(() => {
  chrome.storage.sync.get(['stats'], (data) => {
    if (data.stats) {
      document.getElementById('videosMonitored').textContent = data.stats.videosMonitored || 0;
      document.getElementById('warningsIssued').textContent = data.stats.warningsIssued || 0;
      document.getElementById('flashesDetected').textContent = data.stats.flashesDetected || 0;
    }
  });
}, 1000);

// Reset statistics button
document.getElementById('resetStats').addEventListener('click', () => {
  chrome.storage.sync.set({
    stats: {
      videosMonitored: 0,
      warningsIssued: 0,
      flashesDetected: 0
    }
  }, () => {
    document.getElementById('videosMonitored').textContent = '0';
    document.getElementById('warningsIssued').textContent = '0';
    document.getElementById('flashesDetected').textContent = '0';
  });
});
