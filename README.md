# Snaptime — Vintage Photobooth

A beautiful, mobile-first vintage photobooth web app. Take 3 photos, get a vintage strip with stickers and effects!

## Features

- 📷 **Real-time B&W camera capture** - See yourself in black & white before taking photos
- 🎞️ **3-photo strip** - Classic photobooth format
- ⏱️ **Automatic capture** - Just tap once, the app takes all 3 photos automatically
- 🎨 **6 frame colors** - Choose your favorite background
- ✨ **12 cute stickers** - Decorate your photos
- ✏️ **Sketchy pencil drawing** - Draw on your photos with a hand-drawn effect
- 🖼️ **4 photo effects** - Original, Faded, Bold, Soft
- 🔊 **Sound effects** - Countdown beeps, shutter click, and print sound
- 📱 **Mobile-optimized** - Perfect for in-app usage

## File Structure

```
vintage-photobooth/
├── index.html    # HTML structure
├── styles.css    # All styles
├── app.js        # All JavaScript logic
├── vercel.json   # Vercel deployment config
└── README.md     # This file
```

## Local Development

Open `index.html` directly in your browser, or use a local server:

```bash
# Python 3
python3 -m http.server 8000

# Node.js
npx http-server -p 8000
```

Then open `http://localhost:8000`

## Deployment (GitHub + Vercel)

### 1. Create GitHub Repository

```bash
cd /Users/micaeladixon/Music/vintage-photobooth
git init
git add .
git commit -m "Initial commit"
```

Go to https://github.com/new and create a new repository, then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/snaptime-photobooth.git
git branch -M main
git push -u origin main
```

### 2. Deploy to Vercel

1. Go to https://vercel.com
2. Sign in with GitHub
3. Click "Add New Project"
4. Import your `snaptime-photobooth` repository
5. Click "Deploy"

Your app will be live in ~30 seconds at `https://snaptime-photobooth.vercel.app`

## Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Safari (iOS 12+, macOS 10.14+)
- ✅ Firefox (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

**Note:** Camera access requires HTTPS in production.

---

Made with ❤️ for capturing memories
