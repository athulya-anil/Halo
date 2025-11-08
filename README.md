# ⚠️ Flash Guardian

**Real-time photosensitive epilepsy protection for web videos**

Flash Guardian is a Chrome browser extension that detects and warns users about potentially dangerous flashing content in online videos. Built to comply with WCAG 2.1 accessibility guidelines, it helps protect people with photosensitive epilepsy from content that could trigger seizures.

## 🎯 The Problem

- **1 in 4,000 people** have photosensitive epilepsy
- Flashing lights and rapidly changing images can trigger seizures
- Most video platforms (YouTube, TikTok, Twitter, Instagram) lack built-in protection
- Content warnings are rare and often ignored

## ✨ Features

- **Real-time Flash Detection**: Analyzes video frames as they play using Canvas API
- **WCAG 2.1 Compliant**: Detects general flashes (≥3/second) and dangerous red flashes
- **Automatic Protection**: Pauses videos immediately when dangerous content is detected
- **Universal Coverage**: Works on YouTube, TikTok, Twitter/X, Instagram, Twitch
- **Privacy-First**: All analysis happens locally in your browser - no data sent anywhere
- **Smart Detection**: Warmup period and brightness filtering prevent false positives
- **Customizable Settings**: Enable/disable features and view session statistics

## 🔬 How It Works

### Detection Algorithm

Flash Guardian uses a scientifically-based approach aligned with WCAG 2.1 standards:

1. **Frame Capture**: Uses Canvas API to capture video frames every ~100ms
2. **Warmup Period**: Skips first 10 frames to avoid false positives during video initialization
3. **Luminance Analysis**: Calculates relative luminance using sRGB color space formulas (WCAG 2.1)
4. **Brightness Filtering**: Ignores very dark frames (<5% brightness) to prevent loading screen false positives
5. **Change Detection**: Tracks significant frame-to-frame brightness changes (>10% relative + >5% absolute)
6. **Flash Counting**: Counts flashes within 1-second sliding windows
7. **Warning Trigger**: Alerts when ≥3 flashes detected per second

### Red Flash Detection

Saturated red flashing is particularly dangerous:
- Detects pixels with high red values (R>200) and low green/blue (G,B<100)
- Tracks rapid transitions in/out of saturated red
- Triggers warning if red flash frequency exceeds threshold

### Performance Optimizations

- **Frame Skipping**: Analyzes every 3rd frame to reduce CPU usage
- **Downscaling**: Processes frames at max 640x360 resolution
- **Pixel Sampling**: Samples every 4th pixel for luminance calculation
- **Efficient Storage**: Background service worker manages statistics

## 📦 Installation

### Chrome/Edge (Developer Mode)

1. **Download the extension**
   ```bash
   git clone <repository-url>
   cd flash-guardian
   ```

2. **Open Chrome Extensions**
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)

3. **Load the extension**
   - Click "Load unpacked"
   - Select the `flash-guardian` folder
   - Extension icon should appear in your toolbar

4. **Reload after installation**
   - After loading, click the reload icon on the extension card
   - Refresh any open YouTube/video pages

## 🚀 Usage

### Normal Browsing

1. **Browse normally** - Flash Guardian runs automatically on supported sites
2. **Watch videos** - Detection starts when any video begins playing
3. **Get warnings** - If flashing is detected (≥3 flashes/second):
   - Video pauses immediately
   - Warning overlay appears showing:
     - Flash frequency (flashes per second)
     - Total flashes detected
     - Timestamp where flashing occurred
   - Choose to "Continue Anyway" or "Close Video"

### Settings & Statistics

Click the Flash Guardian icon in your toolbar to access:
- **Enable Protection**: Turn detection on/off
- **Auto-Pause Videos**: Automatically pause when flashing is detected
- **Sensitivity**: Medium (WCAG 2.1 standard - ≥3 flashes/second)
- **Session Statistics**:
  - Videos Monitored
  - Warnings Issued
  - Flashes Detected
- **Reset Statistics**: Clear session data for testing

### Console Logging

Open DevTools (F12) → Console to see detection activity:
```
[Flash Guardian] Content script loaded
[Flash Guardian] Found 1 video(s) on page
[Flash Guardian] Initialized detector for video
[Flash Guardian] Started monitoring video
[Flash Guardian] Detection state reset
```

## 🧪 Testing the Extension

### Using the Local Test Page

1. **Generate test videos** (first time only):
   ```bash
   cd tests
   pip install opencv-python numpy
   python generate_test_video.py
   ```

2. **Open test page**:
   - Open `test.html` in your browser
   - OR serve locally: `python3 -m http.server 8000`
   - Navigate to `http://localhost:8000/test.html`

3. **Test videos included**:
   - **Safe Control (1 Hz)** - Should NOT trigger ❌
   - **Borderline (2 Hz)** - Should NOT trigger ❌
   - **Dangerous (3 Hz)** - Should trigger ✅
   - **Very Dangerous (5 Hz)** - Should trigger ✅
   - **Extreme (10 Hz)** - Should trigger ✅
   - **Red Flash Test (4 Hz)** - Should trigger ✅
   - **Gradient Flash (5 Hz)** - Should trigger ✅
   - **Checkerboard (6 Hz)** - Should trigger ✅

### Testing on YouTube

Search YouTube for:
- "Colors epilepsy warning" - Known test video
- "Photosensitive epilepsy warning test"
- "Screen flash test"

⚠️ **Warning**: These videos contain actual flashing content. Do NOT watch if you are photosensitive!

### Debugging

If extension isn't working:
1. Check `chrome://extensions/` - ensure extension is enabled
2. Click "Errors" button on extension card to see any JavaScript errors
3. Open DevTools Console (F12) on the video page
4. Look for `[Flash Guardian]` messages
5. Click "Inspect views: service worker" under extension to see background logs
6. Try reloading the extension and refreshing the page

## 📊 Technical Details

### Architecture

```
flash-guardian/
├── manifest.json              # Extension configuration (Manifest V3)
├── popup.html                # Settings/statistics UI
├── scripts/
│   ├── background.js         # Service worker (message handling, stats)
│   ├── detector.js           # Core flash detection algorithm ⭐
│   └── popup.js              # Settings logic
├── styles/
│   └── overlay.css           # Warning overlay styles
├── tests/
│   ├── generate_test_video.py
│   └── test_videos/          # Generated test videos
└── test.html                 # Local test page
```

### Key Files

**detector.js** - Core flash detection logic:
- `FlashDetector` class with Canvas-based frame analysis
- WCAG 2.1 compliant luminance calculations
- Warmup period and brightness filtering
- Statistics tracking via chrome.runtime.sendMessage

**background.js** - Service worker:
- Handles messages from content scripts
- Manages chrome.storage.sync for statistics
- Initializes default settings on install

**popup.js** - Extension popup:
- Real-time statistics display (refreshes every second)
- Settings toggles
- Reset statistics functionality

### Supported Platforms

| Platform | Status | Notes |
|----------|--------|-------|
| YouTube | ✅ Full support | Primary testing platform |
| TikTok | ✅ Full support | HTML5 video elements |
| Twitter/X | ✅ Full support | Native videos |
| Instagram | ✅ Full support | HTML5 videos |
| Twitch | ✅ Full support | Live streams and VODs |
| Any HTML5 video | ✅ Full support | Universal compatibility |

### Browser Compatibility

| Browser | Manifest V3 | Canvas API | Chrome Storage |
|---------|-------------|------------|----------------|
| Chrome 88+ | ✅ | ✅ | ✅ |
| Edge 88+ | ✅ | ✅ | ✅ |
| Firefox* | ⚠️ MV2 | ✅ | ✅ |
| Safari | ❌ | ✅ | ⚠️ |

*Firefox support would require converting to Manifest V2 or waiting for V3 support

## 🛡️ Privacy & Security

- **No external requests**: All processing happens locally
- **No data collection**: Extension doesn't track or store user behavior
- **No permissions abuse**: Only requires `activeTab` and `storage` permissions
- **Open source**: Code is fully auditable
- **WCAG compliant**: Follows accessibility best practices

## 🔧 Development

### Recent Improvements

✅ **Fixed false positives** (v1.0.0):
- Added 10-frame warmup period
- Minimum brightness threshold (5%)
- Absolute + relative luminance change requirements
- Seeking event handler to reset detection state

✅ **Added background service worker**:
- Proper message handling in Manifest V3
- Statistics persistence across sessions

✅ **Improved UX**:
- Removed verbose info text from popup
- Added reset statistics button
- Real-time statistics updates

### Future Enhancements

Potential improvements:
- [ ] Adjustable sensitivity levels (Low/Medium/High)
- [ ] Pattern detection (stripes, checkerboards, spirals)
- [ ] Pre-scan mode (analyze video before playing)
- [ ] Export detection logs
- [ ] Community reporting system
- [ ] Mobile browser support
- [ ] Chrome Web Store publishing

## 📚 References

- [WCAG 2.1 Three Flashes or Below Threshold](https://www.w3.org/WAI/WCAG21/Understanding/three-flashes-or-below-threshold.html)
- [Epilepsy Foundation: Photosensitivity](https://www.epilepsy.com/what-is-epilepsy/seizure-triggers/photosensitivity)
- [Canvas API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)

## 🤝 Contributing

Contributions welcome! Areas for improvement:
1. Additional test videos with edge cases
2. Pattern detection algorithms
3. UI/UX improvements
4. Performance optimizations
5. Documentation updates

**Important**: Always test with caution and include warnings for photosensitive users.

## ⚖️ License

MIT License - feel free to use, modify, and distribute.

## ⚠️ Disclaimer

Flash Guardian is a tool to help protect photosensitive users, but it **cannot guarantee 100% detection accuracy**. Users with photosensitive epilepsy should:
- Consult medical professionals about trigger management
- Use this extension as an additional safety layer, not sole protection
- Be cautious with unfamiliar content
- Report dangerous content to platform moderators

## 💡 Credits

Built with the mission of making the internet more accessible and safer for everyone, especially those with invisible disabilities.

---

**Built for accessibility**

*Protecting users one frame at a time*
