/**
 * Flash Guardian - Photosensitive Content Detector
 * Based on WCAG 2.1 Guidelines for Flash and Red Flash Thresholds
 *
 * Detection criteria:
 * - General Flash: 3+ flashes per second with luminance change > 10%
 * - Red Flash: 3+ flashes per second with saturated red transitions
 */

class FlashDetector {
  constructor(video) {
    this.video = video;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

    // Detection parameters (WCAG 2.1 compliant)
    this.LUMINANCE_THRESHOLD = 0.1; // 10% relative luminance change
    this.RED_THRESHOLD = 0.8; // Saturated red detection
    this.FLASH_FREQUENCY = 3; // 3 flashes per second
    this.DETECTION_WINDOW = 1000; // 1 second in milliseconds
    this.MIN_BRIGHTNESS = 0.05; // Ignore very dark frames (< 5% brightness)
    this.WARMUP_FRAMES = 10; // Skip first 10 frames to avoid false positives during video initialization

    // State tracking
    this.prevLuminance = null;
    this.prevRedSaturation = null;
    this.flashTimestamps = [];
    this.redFlashTimestamps = [];
    this.isAnalyzing = false;
    this.warningShown = false;
    this.frameCount = 0;
    this.skipFrames = 2; // Analyze every 3rd frame for performance
    this.analyzedFrameCount = 0; // Count of actual analyzed frames (after skipping)

    // Statistics
    this.totalFlashes = 0;
    this.maxFlashesPerSecond = 0;
  }

  /**
   * Calculate relative luminance of a frame
   * Uses sRGB color space formula from WCAG
   */
  calculateLuminance(imageData) {
    const data = imageData.data;
    let totalLuminance = 0;
    const pixelCount = data.length / 4;

    // Sample every 4th pixel for performance (still statistically significant)
    for (let i = 0; i < data.length; i += 16) {
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;

      // Convert to linear RGB
      const rLinear = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
      const gLinear = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
      const bLinear = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

      // Calculate relative luminance
      const luminance = 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
      totalLuminance += luminance;
    }

    return totalLuminance / (pixelCount / 4);
  }

  /**
   * Detect saturated red content in frame
   * Red flash is particularly dangerous for photosensitive users
   */
  calculateRedSaturation(imageData) {
    const data = imageData.data;
    let redSaturation = 0;
    const pixelCount = data.length / 4;

    for (let i = 0; i < data.length; i += 16) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Detect saturated red (high R, low G and B)
      if (r > 200 && g < 100 && b < 100) {
        redSaturation++;
      }
    }

    return redSaturation / (pixelCount / 4);
  }

  /**
   * Analyze a single frame for flash detection
   */
  analyzeFrame() {
    if (!this.video || this.video.paused || this.video.ended) {
      return;
    }

    // Skip frames for performance
    this.frameCount++;
    if (this.frameCount % this.skipFrames !== 0) {
      requestAnimationFrame(() => this.analyzeFrame());
      return;
    }

    try {
      // Capture current video frame
      this.canvas.width = Math.min(this.video.videoWidth, 640);
      this.canvas.height = Math.min(this.video.videoHeight, 360);
      this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

      const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      const currentTime = Date.now();

      // Calculate luminance and red saturation
      const currentLuminance = this.calculateLuminance(imageData);
      const currentRedSaturation = this.calculateRedSaturation(imageData);

      // Increment analyzed frame counter
      this.analyzedFrameCount++;

      // Skip warmup frames to avoid false positives during video initialization
      if (this.analyzedFrameCount <= this.WARMUP_FRAMES) {
        this.prevLuminance = currentLuminance;
        this.prevRedSaturation = currentRedSaturation;
        requestAnimationFrame(() => this.analyzeFrame());
        return;
      }

      // Ignore very dark frames (loading screens, fade to black, etc.)
      if (currentLuminance < this.MIN_BRIGHTNESS || (this.prevLuminance !== null && this.prevLuminance < this.MIN_BRIGHTNESS)) {
        this.prevLuminance = currentLuminance;
        this.prevRedSaturation = currentRedSaturation;
        requestAnimationFrame(() => this.analyzeFrame());
        return;
      }

      if (this.prevLuminance !== null) {
        // Check for general flash (luminance change)
        const luminanceChange = Math.abs(currentLuminance - this.prevLuminance);
        const relativeLuminanceChange = luminanceChange / Math.max(this.prevLuminance, 0.01);

        // Additional check: both current and previous luminance must be significant for a valid flash
        const bothFramesBright = currentLuminance > this.MIN_BRIGHTNESS && this.prevLuminance > this.MIN_BRIGHTNESS;
        const absoluteChangeSignificant = luminanceChange > 0.05; // At least 5% absolute change

        if (relativeLuminanceChange > this.LUMINANCE_THRESHOLD && bothFramesBright && absoluteChangeSignificant) {
          this.flashTimestamps.push(currentTime);
          this.totalFlashes++;
        }

        // Check for red flash
        const redChange = Math.abs(currentRedSaturation - this.prevRedSaturation);
        if (redChange > this.RED_THRESHOLD && bothFramesBright) {
          this.redFlashTimestamps.push(currentTime);
        }

        // Remove old timestamps outside detection window
        this.flashTimestamps = this.flashTimestamps.filter(
          t => currentTime - t <= this.DETECTION_WINDOW
        );
        this.redFlashTimestamps = this.redFlashTimestamps.filter(
          t => currentTime - t <= this.DETECTION_WINDOW
        );

        // Update max flashes per second
        this.maxFlashesPerSecond = Math.max(
          this.maxFlashesPerSecond,
          this.flashTimestamps.length
        );

        // Trigger warning if threshold exceeded
        if (this.flashTimestamps.length >= this.FLASH_FREQUENCY) {
          this.triggerWarning('general', this.flashTimestamps.length);
        } else if (this.redFlashTimestamps.length >= this.FLASH_FREQUENCY) {
          this.triggerWarning('red', this.redFlashTimestamps.length);
        }
      }

      this.prevLuminance = currentLuminance;
      this.prevRedSaturation = currentRedSaturation;

    } catch (error) {
      console.error('[Flash Guardian] Frame analysis error:', error);
    }

    // Continue analyzing
    if (this.isAnalyzing) {
      requestAnimationFrame(() => this.analyzeFrame());
    }
  }

  /**
   * Trigger warning overlay
   */
  triggerWarning(type, flashCount) {
    if (this.warningShown) return;

    this.warningShown = true;

    // Pause video immediately
    this.video.pause();

    // Report warning to popup
    console.log('[Flash Guardian] Sending warningIssued message to background');
    chrome.runtime.sendMessage({
      action: 'updateStats',
      stat: 'warningIssued'
    }).then(response => {
      console.log('[Flash Guardian] warningIssued message sent, response:', response);
    }).catch(error => {
      console.error('[Flash Guardian] Error sending warningIssued message:', error);
    });

    // Report flashes detected
    console.log('[Flash Guardian] Sending flashDetected message to background, count:', this.totalFlashes);
    chrome.runtime.sendMessage({
      action: 'updateStats',
      stat: 'flashDetected',
      count: this.totalFlashes
    }).then(response => {
      console.log('[Flash Guardian] flashDetected message sent, response:', response);
    }).catch(error => {
      console.error('[Flash Guardian] Error sending flashDetected message:', error);
    });

    // Dispatch custom event for warning UI
    const warningEvent = new CustomEvent('flashDetected', {
      detail: {
        type: type,
        flashCount: flashCount,
        maxFlashesPerSecond: this.maxFlashesPerSecond,
        totalFlashes: this.totalFlashes,
        timestamp: this.video.currentTime
      }
    });

    document.dispatchEvent(warningEvent);

    console.warn(`[Flash Guardian] ${type === 'red' ? 'Red flash' : 'Flash'} detected: ${flashCount} flashes in 1 second`);
  }

  /**
   * Reset detection state (used when seeking or resuming after warning)
   */
  resetDetectionState() {
    this.prevLuminance = null;
    this.prevRedSaturation = null;
    this.flashTimestamps = [];
    this.redFlashTimestamps = [];
    this.analyzedFrameCount = 0;
    console.log('[Flash Guardian] Detection state reset');
  }

  /**
   * Start detection
   */
  start() {
    if (this.isAnalyzing) return;

    this.isAnalyzing = true;
    this.warningShown = false;
    this.totalFlashes = 0;
    this.maxFlashesPerSecond = 0;
    this.resetDetectionState();

    console.log('[Flash Guardian] Started monitoring video');
    this.analyzeFrame();
  }

  /**
   * Stop detection
   */
  stop() {
    this.isAnalyzing = false;
    console.log('[Flash Guardian] Stopped monitoring video');
  }

  /**
   * Reset warning state (allow video to continue)
   */
  resetWarning() {
    this.warningShown = false;
    this.resetDetectionState();
  }
}

// Main execution
(function() {
  console.log('[Flash Guardian] Content script loaded');

  const detectors = new Map();

  /**
   * Initialize detector for a video element
   */
  function initializeDetector(video) {
    // Skip if already monitoring
    if (detectors.has(video)) return;

    // Wait for video metadata to load
    if (video.readyState < 2) {
      video.addEventListener('loadedmetadata', () => initializeDetector(video), { once: true });
      return;
    }

    const detector = new FlashDetector(video);
    detectors.set(video, detector);

    // Report video monitored to popup
    console.log('[Flash Guardian] Sending videoMonitored message to background');
    chrome.runtime.sendMessage({
      action: 'updateStats',
      stat: 'videoMonitored'
    }).then(response => {
      console.log('[Flash Guardian] videoMonitored message sent, response:', response);
    }).catch(error => {
      console.error('[Flash Guardian] Error sending videoMonitored message:', error);
    });

    // Start detection when video plays
    video.addEventListener('play', () => {
      detector.start();
    });

    // Stop detection when video pauses
    video.addEventListener('pause', () => {
      detector.stop();
    });

    // Reset detection state when seeking to avoid false positives
    video.addEventListener('seeking', () => {
      detector.resetDetectionState();
    });

    // Clean up when video ends
    video.addEventListener('ended', () => {
      detector.stop();
    });

    console.log('[Flash Guardian] Initialized detector for video:', video);
  }

  /**
   * Find and monitor all video elements
   */
  function findAndMonitorVideos() {
    const videos = document.querySelectorAll('video');
    console.log(`[Flash Guardian] Found ${videos.length} video(s) on page`);
    videos.forEach(video => initializeDetector(video));
  }

  // Initial scan
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', findAndMonitorVideos);
  } else {
    findAndMonitorVideos();
  }

  // Watch for dynamically added videos (e.g., YouTube/TikTok)
  const observer = new MutationObserver(() => {
    findAndMonitorVideos();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Create warning overlay when flash is detected
  document.addEventListener('flashDetected', (event) => {
    showWarningOverlay(event.detail);
  });

  /**
   * Create and show warning overlay
   */
  function showWarningOverlay(details) {
    // Check if overlay already exists
    let overlay = document.getElementById('flash-guardian-overlay');

    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'flash-guardian-overlay';
      overlay.innerHTML = `
        <div class="flash-guardian-content">
          <div class="flash-guardian-icon">⚠️</div>
          <h2>Photosensitive Warning</h2>
          <p class="flash-guardian-message">
            Rapid flashing content detected (<strong>${details.flashCount} flashes/second</strong>)
          </p>
          <p class="flash-guardian-info">
            This video may contain content that could trigger seizures in people with photosensitive epilepsy.
          </p>
          <div class="flash-guardian-stats">
            <div>Max flashes/sec: <strong>${details.maxFlashesPerSecond}</strong></div>
            <div>Total flashes: <strong>${details.totalFlashes}</strong></div>
            <div>Timestamp: <strong>${Math.floor(details.timestamp)}s</strong></div>
          </div>
          <div class="flash-guardian-buttons">
            <button id="flash-guardian-continue" class="fg-btn fg-btn-danger">
              Continue Anyway (Not Recommended)
            </button>
            <button id="flash-guardian-close" class="fg-btn fg-btn-primary">
              Close Video
            </button>
          </div>
          <p class="flash-guardian-wcag">
            Detection based on WCAG 2.1 Guidelines (≥3 flashes/second threshold)
          </p>
        </div>
      `;

      document.body.appendChild(overlay);

      // Add event listeners
      document.getElementById('flash-guardian-continue').addEventListener('click', () => {
        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
          const detector = detectors.get(video);
          if (detector) {
            detector.resetWarning();
            video.play();
          }
        });
        overlay.style.display = 'none';
      });

      document.getElementById('flash-guardian-close').addEventListener('click', () => {
        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
          video.pause();
          video.currentTime = 0;
        });
        overlay.style.display = 'none';

        // Optionally close the tab or go back
        // window.history.back();
      });
    } else {
      // Update existing overlay with new data
      overlay.querySelector('.flash-guardian-message').innerHTML =
        `Rapid flashing content detected (<strong>${details.flashCount} flashes/second</strong>)`;
      overlay.querySelector('.flash-guardian-stats').innerHTML = `
        <div>Max flashes/sec: <strong>${details.maxFlashesPerSecond}</strong></div>
        <div>Total flashes: <strong>${details.totalFlashes}</strong></div>
        <div>Timestamp: <strong>${Math.floor(details.timestamp)}s</strong></div>
      `;
      overlay.style.display = 'flex';
    }
  }
})();
