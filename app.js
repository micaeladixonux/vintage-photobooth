// ========== CONSTANTS ==========
const COLORS = [
  { id: 'white', bg: '#ffffff', text: '#1a1a1a' },
  { id: 'black', bg: '#1a1a1a', text: '#ffffff' },
  { id: 'cream', bg: '#f5f0e6', text: '#1a1a1a' },
  { id: 'pink', bg: '#ffd4e5', text: '#1a1a1a' },
  { id: 'mint', bg: '#d4f5e9', text: '#1a1a1a' },
  { id: 'lavender', bg: '#e8e0f0', text: '#1a1a1a' },
];

const EFFECTS = [
  { id: 'none', label: '○', name: 'Original', filter: '' },
  { id: 'faded', label: '◐', name: 'Faded', filter: 'contrast(0.75) brightness(1.15)' },
  { id: 'contrast', label: '●', name: 'Bold', filter: 'contrast(1.5) brightness(0.95)' },
  { id: 'soft', label: '◎', name: 'Soft', filter: 'contrast(0.85) brightness(1.2) blur(0.4px)' },
];

const STICKERS = ['✨', '💫', '🌸', '💕', '⭐', '🦋', '🌙', '☁️', '🎀', '💗', '🌷', '🍓'];

const DRAW_COLORS = ['#1a1a1a', '#6b4423', '#c0392b', '#2980b9', '#27ae60', '#8e44ad', '#f39c12', '#ffffff'];
const DRAW_SIZES = [2, 4, 6];

const STATUS_MESSAGES = ['Get ready!', 'Nice! One more...', 'Last one!'];
const ENCOURAGEMENTS = ['Beautiful!', 'Perfect!', 'Love it!'];

// ========== STATE ==========
const state = {
  photos: [],
  frameColor: COLORS[0],
  effect: EFFECTS[0],
  stream: null,
  selectedSticker: null,
  placedStickers: [],
  drawColor: DRAW_COLORS[0],
  drawSize: DRAW_SIZES[1],
  isDrawing: false,
  drawMode: false,
  drawHistory: [],
  drawCtx: null,
  drawCtxMobile: null,
  lastX: 0,
  lastY: 0,
  currentTool: 'colors',
  isMobile: window.innerWidth <= 768
};

// ========== DOM HELPERS ==========
const $ = id => document.getElementById(id);
const video = $('video');
const canvas = $('canvas');
const ctx = canvas.getContext('2d');

// ========== AUDIO ==========
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new AudioCtx();
  }
}

function playBeep(freq = 800, duration = 0.15) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function playShutterSound() {
  if (!audioCtx) return;
  const bufferSize = audioCtx.sampleRate * 0.1;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.05));
  }
  const source = audioCtx.createBufferSource();
  const gain = audioCtx.createGain();
  source.buffer = buffer;
  gain.gain.value = 0.4;
  source.connect(gain);
  gain.connect(audioCtx.destination);
  source.start();
}

function playPrintSound() {
  if (!audioCtx) return;
  const duration = 0.5;
  const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * duration, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / audioCtx.sampleRate;
    const motor = Math.sin(t * 120 * Math.PI * 2) * 0.2;
    const noise = (Math.random() - 0.5) * 0.1;
    let env = t < 0.05 ? t / 0.05 : t > duration - 0.1 ? (duration - t) / 0.1 : 1;
    data[i] = (motor + noise) * env;
  }
  const source = audioCtx.createBufferSource();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  source.buffer = buffer;
  filter.type = 'lowpass';
  filter.frequency.value = 500;
  gain.gain.value = 0.2;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  source.start();
}

// ========== SCREEN MANAGEMENT ==========
function showScreen(screenName) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(screenName).classList.add('active');
}

// ========== COLOR MANAGEMENT ==========
function renderColors(containerId) {
  const container = $(containerId);
  if (!container) return;
  container.innerHTML = '';
  COLORS.forEach(c => {
    const btn = document.createElement('button');
    btn.className = `color-opt ${state.frameColor.id === c.id ? 'selected' : ''}`;
    btn.style.backgroundColor = c.bg;
    if (c.id === 'white' || c.id === 'cream') {
      btn.style.border = '1px solid #e0ddd8';
    }
    btn.onclick = () => selectFrameColor(c);
    container.appendChild(btn);
  });
}

function selectFrameColor(c) {
  state.frameColor = c;
  
  // Update all color option buttons
  document.querySelectorAll('.color-opt').forEach(btn => {
    btn.classList.remove('selected');
    if (btn.style.backgroundColor === c.bg || btn.style.backgroundColor === hexToRgb(c.bg)) {
      btn.classList.add('selected');
    }
  });
  
  // Update desktop strip
  const strip = $('photoStrip');
  if (strip) {
    strip.style.backgroundColor = c.bg;
    $('stripFooter').style.color = c.text;
  }
  
  // Update mobile strip
  const stripMobile = $('photoStripMobile');
  if (stripMobile) {
    stripMobile.style.backgroundColor = c.bg;
    $('stripFooterMobile').style.color = c.text;
  }
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `rgb(${r}, ${g}, ${b})`;
  }
  return hex;
}

// ========== EFFECTS ==========
function renderEffects(containerId = 'enhancement-grid') {
  const grid = $(containerId);
  if (!grid) return;
  grid.innerHTML = '';
  
  const isMobileGrid = containerId === 'mobileEffects';
  
  EFFECTS.forEach(e => {
    const btn = document.createElement('button');
    btn.className = `${isMobileGrid ? 'effect-btn' : 'enhancement-btn'} ${state.effect.id === e.id ? 'selected' : ''}`;
    btn.innerHTML = `
      <span class="${isMobileGrid ? 'effect-icon' : 'enhancement-icon'}">${e.label}</span>
      <span class="${isMobileGrid ? 'effect-name' : 'enhancement-name'}">${e.name}</span>
    `;
    btn.onclick = () => {
      state.effect = e;
      updateStripPhotos();
      updateStripPhotosMobile();
      renderEffects('enhancement-grid');
      renderEffects('mobileEffects');
    };
    grid.appendChild(btn);
  });
}

// ========== STICKERS ==========
function renderStickers(containerId = 'stickerGrid') {
  const grid = $(containerId);
  if (!grid) return;
  grid.innerHTML = '';
  
  STICKERS.forEach(s => {
    const btn = document.createElement('button');
    btn.className = `sticker-btn ${state.selectedSticker === s ? 'selected' : ''}`;
    btn.textContent = s;
    btn.onclick = () => {
      state.selectedSticker = state.selectedSticker === s ? null : s;
      state.drawMode = false;
      renderStickers('stickerGrid');
      renderStickers('mobileStickerGrid');
      updateDrawMode();
    };
    grid.appendChild(btn);
  });
}

function placeSticker(e, stripId, stickersContainerId) {
  if (!state.selectedSticker) return;
  
  const strip = $(stripId);
  const container = $(stickersContainerId);
  if (!strip || !container) return;
  
  const rect = strip.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  const sticker = document.createElement('div');
  sticker.className = 'placed-sticker';
  sticker.textContent = state.selectedSticker;
  sticker.style.left = x + 'px';
  sticker.style.top = y + 'px';
  sticker.style.transform = 'translate(-50%, -50%)';
  sticker.style.pointerEvents = 'auto';
  
  sticker.onclick = (ev) => {
    ev.stopPropagation();
    sticker.remove();
    state.placedStickers = state.placedStickers.filter(s => s.el !== sticker);
  };
  
  container.appendChild(sticker);
  state.placedStickers.push({ el: sticker, container: stickersContainerId });
}

function clearStickers() {
  $('stickersContainer').innerHTML = '';
  $('stickersContainerMobile').innerHTML = '';
  state.placedStickers = [];
}

// ========== DRAWING ==========
function renderDrawControls(colorsId = 'drawColors', sizesId = 'drawSizes') {
  const colorsEl = $(colorsId);
  if (colorsEl) {
    colorsEl.innerHTML = '';
    DRAW_COLORS.forEach(c => {
      const btn = document.createElement('button');
      btn.className = `draw-color ${state.drawColor === c ? 'selected' : ''}`;
      btn.style.background = c;
      if (c === '#ffffff') btn.style.border = '1px solid #ccc';
      btn.onclick = () => {
        state.drawColor = c;
        renderDrawControls('drawColors', 'drawSizes');
        renderDrawControls('mobileDrawColors', 'mobileDrawSizes');
      };
      colorsEl.appendChild(btn);
    });
  }

  const sizesEl = $(sizesId);
  if (sizesEl) {
    sizesEl.innerHTML = '';
    DRAW_SIZES.forEach(s => {
      const btn = document.createElement('button');
      btn.className = `draw-size ${state.drawSize === s ? 'selected' : ''}`;
      const dot = document.createElement('div');
      dot.className = 'size-dot';
      dot.style.width = s + 4 + 'px';
      dot.style.height = s + 4 + 'px';
      btn.appendChild(dot);
      btn.onclick = () => {
        state.drawSize = s;
        renderDrawControls('drawColors', 'drawSizes');
        renderDrawControls('mobileDrawColors', 'mobileDrawSizes');
      };
      sizesEl.appendChild(btn);
    });
  }
}

function updateDrawMode() {
  // Desktop
  const container = $('canvasContainer');
  if (container) {
    if (state.drawMode) {
      container.classList.add('active');
    } else {
      container.classList.remove('active');
    }
  }
  
  // Mobile
  const containerMobile = $('canvasContainerMobile');
  if (containerMobile) {
    if (state.drawMode) {
      containerMobile.classList.add('active');
    } else {
      containerMobile.classList.remove('active');
    }
  }
}

function initDrawCanvas() {
  // Desktop canvas
  const drawCanvas = $('drawCanvas');
  const strip = $('photoStrip');
  if (drawCanvas && strip) {
    drawCanvas.width = strip.offsetWidth;
    drawCanvas.height = strip.offsetHeight;
    state.drawCtx = drawCanvas.getContext('2d');
    state.drawCtx.lineCap = 'round';
    state.drawCtx.lineJoin = 'round';
  }
  
  // Mobile canvas
  const drawCanvasMobile = $('drawCanvasMobile');
  const stripMobile = $('photoStripMobile');
  if (drawCanvasMobile && stripMobile) {
    drawCanvasMobile.width = stripMobile.offsetWidth;
    drawCanvasMobile.height = stripMobile.offsetHeight;
    state.drawCtxMobile = drawCanvasMobile.getContext('2d');
    state.drawCtxMobile.lineCap = 'round';
    state.drawCtxMobile.lineJoin = 'round';
  }
}

function getSketchyPoints(x1, y1, x2, y2) {
  const points = [];
  const dist = Math.sqrt((x2-x1)**2 + (y2-y1)**2);
  const steps = Math.max(1, Math.floor(dist / 3));
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const jitterAmount = state.drawSize * 0.3;
    const jx = (Math.random() - 0.5) * jitterAmount;
    const jy = (Math.random() - 0.5) * jitterAmount;
    points.push({
      x: x1 + (x2 - x1) * t + jx,
      y: y1 + (y2 - y1) * t + jy
    });
  }
  return points;
}

function drawSketchyLine(drawCtx, x1, y1, x2, y2) {
  if (!drawCtx) return;
  const points = getSketchyPoints(x1, y1, x2, y2);
  
  drawCtx.strokeStyle = state.drawColor;
  drawCtx.lineWidth = state.drawSize;
  drawCtx.globalAlpha = 0.7 + Math.random() * 0.3;
  
  drawCtx.beginPath();
  drawCtx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    drawCtx.lineTo(points[i].x, points[i].y);
  }
  drawCtx.stroke();
  drawCtx.globalAlpha = 1;
}

function saveDrawState() {
  const drawCanvas = $('drawCanvas');
  if (drawCanvas) {
    state.drawHistory.push(drawCanvas.toDataURL());
    if (state.drawHistory.length > 20) state.drawHistory.shift();
  }
}

function undoDraw() {
  if (state.drawHistory.length > 0) {
    // Clear both canvases
    if (state.drawCtx) {
      state.drawCtx.clearRect(0, 0, $('drawCanvas').width, $('drawCanvas').height);
    }
    if (state.drawCtxMobile) {
      state.drawCtxMobile.clearRect(0, 0, $('drawCanvasMobile').width, $('drawCanvasMobile').height);
    }
    
    if (state.drawHistory.length > 1) {
      state.drawHistory.pop();
      const img = new Image();
      img.onload = () => {
        if (state.drawCtx) state.drawCtx.drawImage(img, 0, 0);
        if (state.drawCtxMobile) state.drawCtxMobile.drawImage(img, 0, 0);
      };
      img.src = state.drawHistory[state.drawHistory.length - 1];
    } else {
      state.drawHistory.pop();
    }
  }
}

function clearDrawing() {
  if (state.drawCtx) {
    state.drawCtx.clearRect(0, 0, $('drawCanvas').width, $('drawCanvas').height);
  }
  if (state.drawCtxMobile) {
    state.drawCtxMobile.clearRect(0, 0, $('drawCanvasMobile').width, $('drawCanvasMobile').height);
  }
  state.drawHistory = [];
}

// ========== CAMERA ==========
async function startCamera() {
  try {
    initAudio();
    $('error').classList.add('hidden');
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false
    });
    video.srcObject = state.stream;
    showScreen('capture');
    renderColors('colorOptions');
    updateProgress();
    $('captureStatus').textContent = 'Press the button to start';
  } catch (err) {
    $('error').textContent = err.name === 'NotAllowedError' 
      ? 'Camera access denied. Please allow camera access.'
      : 'Could not access camera. Please try again.';
    $('error').classList.remove('hidden');
  }
}

function stopCamera() {
  if (state.stream) {
    state.stream.getTracks().forEach(t => t.stop());
    state.stream = null;
  }
}

function capturePhoto() {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  ctx.save();
  ctx.scale(-1, 1);
  ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
  ctx.restore();

  // B&W conversion with contrast
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const gray = d[i] * 0.299 + d[i+1] * 0.587 + d[i+2] * 0.114;
    const adj = ((gray / 255 - 0.5) * 1.15 + 0.5) * 255;
    d[i] = d[i+1] = d[i+2] = adj;
  }
  ctx.putImageData(img, 0, 0);

  // Vignette
  const grad = ctx.createRadialGradient(
    canvas.width/2, canvas.height/2, canvas.height * 0.3,
    canvas.width/2, canvas.height/2, canvas.height * 0.8
  );
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  return canvas.toDataURL('image/jpeg', 0.9);
}

// ========== PHOTO CAPTURE SEQUENCE ==========
function startAutoCapture() {
  $('captureBtn').disabled = true;
  $('captureBtn').style.opacity = '0.3';
  $('captureStatus').textContent = STATUS_MESSAGES[0];
  
  takeNextPhoto();
}

function takeNextPhoto() {
  const photoIndex = state.photos.length;
  $('captureStatus').textContent = STATUS_MESSAGES[photoIndex] || 'Smile!';
  
  let count = 3;
  const box = $('countdownBox');
  const num = $('countdownNum');
  
  box.classList.remove('hidden');
  num.textContent = count;
  num.style.animation = 'none';
  num.offsetHeight;
  num.style.animation = 'countPop 1s ease-out';
  playBeep();

  const timer = setInterval(() => {
    count--;
    if (count > 0) {
      num.textContent = count;
      num.style.animation = 'none';
      num.offsetHeight;
      num.style.animation = 'countPop 1s ease-out';
      playBeep();
    } else {
      clearInterval(timer);
      box.classList.add('hidden');

      playShutterSound();
      $('flash').classList.remove('hidden');
      setTimeout(() => $('flash').classList.add('hidden'), 300);

      const photo = capturePhoto();
      state.photos.push(photo);
      updateMiniPreviews();
      updateProgress();

      $('captureStatus').textContent = ENCOURAGEMENTS[state.photos.length - 1] || 'Great!';

      if (state.photos.length >= 3) {
        $('captureStatus').textContent = 'All done! ✨';
        setTimeout(() => {
          stopCamera();
          prepareResult();
          showScreen('result');
        }, 800);
      } else {
        setTimeout(() => {
          takeNextPhoto();
        }, 1000);
      }
    }
  }, 1000);
}

function updateProgress() {
  const n = state.photos.length + 1;
  $('photoNum').textContent = Math.min(n, 3);
  document.querySelectorAll('.dot').forEach((dot, i) => {
    dot.classList.remove('done', 'active');
    if (i + 1 < n) dot.classList.add('done');
    else if (i + 1 === n) dot.classList.add('active');
  });
}

function updateMiniPreviews() {
  const container = $('miniPreviews');
  container.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const div = document.createElement('div');
    div.className = 'mini-preview' + (state.photos[i] ? '' : ' empty');
    if (state.photos[i]) {
      const img = document.createElement('img');
      img.src = state.photos[i];
      div.appendChild(img);
    }
    container.appendChild(div);
  }
}

// ========== RESULT SCREEN ==========
function prepareResult() {
  // Desktop
  renderColors('review-colors');
  renderEffects('enhancement-grid');
  renderStickers('stickerGrid');
  renderDrawControls('drawColors', 'drawSizes');
  updateStripPhotos();
  
  // Mobile
  renderColors('mobileColors');
  renderEffects('mobileEffects');
  renderStickers('mobileStickerGrid');
  renderDrawControls('mobileDrawColors', 'mobileDrawSizes');
  updateStripPhotosMobile();
  
  // Set initial frame color
  selectFrameColor(state.frameColor);
  
  // Clear decorations
  clearStickers();
  clearDrawing();
  
  // Init canvases after a short delay
  setTimeout(() => initDrawCanvas(), 100);
  
  // Show tool options
  setMobileTool('colors');

  // Flash effect - desktop
  const flashWindow = document.querySelector('.result-camera .flash-window');
  if (flashWindow) {
    flashWindow.classList.remove('flashing');
    void flashWindow.offsetWidth;
    flashWindow.classList.add('flashing');
  }
  
  // Flash effect - mobile
  const mobileFlashWindow = document.querySelector('.mobile-flash-window');
  if (mobileFlashWindow) {
    mobileFlashWindow.classList.remove('flashing');
    void mobileFlashWindow.offsetWidth;
    mobileFlashWindow.classList.add('flashing');
  }

  $('flash').classList.remove('hidden');
  setTimeout(() => $('flash').classList.add('hidden'), 300);
  
  setTimeout(() => playPrintSound(), 400);
}

function updateStripPhotos() {
  const container = $('stripPhotos');
  if (!container) return;
  container.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const div = document.createElement('div');
    div.className = 'strip-photo';
    if (state.effect.filter) div.style.filter = state.effect.filter;
    
    const img = document.createElement('img');
    img.src = photo;
    img.alt = `Photo ${i + 1}`;
    div.appendChild(img);
    container.appendChild(div);
  });
}

function updateStripPhotosMobile() {
  const container = $('stripPhotosMobile');
  if (!container) return;
  container.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const div = document.createElement('div');
    div.className = 'strip-photo';
    if (state.effect.filter) div.style.filter = state.effect.filter;
    
    const img = document.createElement('img');
    img.src = photo;
    img.alt = `Photo ${i + 1}`;
    div.appendChild(img);
    container.appendChild(div);
  });
}

// ========== MOBILE TOOLBAR ==========
function setMobileTool(tool) {
  state.currentTool = tool;
  state.drawMode = tool === 'draw';
  state.selectedSticker = tool === 'stickers' ? state.selectedSticker : null;
  
  // Update toolbar buttons
  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tool === tool);
  });
  
  // Show/hide tool options
  $('toolOptions').classList.remove('hidden');
  $('optColors').classList.toggle('hidden', tool !== 'colors');
  $('optStickers').classList.toggle('hidden', tool !== 'stickers');
  $('optDraw').classList.toggle('hidden', tool !== 'draw');
  $('optEffects').classList.toggle('hidden', tool !== 'effects');
  
  // Update draw mode
  updateDrawMode();
  
  // Update sticker rendering
  if (tool !== 'stickers') {
    renderStickers('stickerGrid');
    renderStickers('mobileStickerGrid');
  }
}

// ========== DOWNLOAD ==========
async function download() {
  try {
    const pad = 14;
    const photoW = 200;
    const photoH = photoW * 0.75;
    const gap = 8;
    const footerH = 40;
    const totalH = pad + photoH * 3 + gap * 2 + footerH + pad;
    const totalW = photoW + pad * 2;

    const c = document.createElement('canvas');
    c.width = totalW * 2;
    c.height = totalH * 2;
    const cx = c.getContext('2d');
    cx.scale(2, 2);

    cx.fillStyle = state.frameColor.bg;
    cx.fillRect(0, 0, totalW, totalH);

    // Draw photos
    for (let i = 0; i < state.photos.length; i++) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = state.photos[i];
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        setTimeout(() => reject(new Error('Image load timeout')), 5000);
      });
      
      if (state.effect.filter) cx.filter = state.effect.filter;
      cx.drawImage(img, pad, pad + i * (photoH + gap), photoW, photoH);
      cx.filter = 'none';
    }

    // Draw stickers from both containers
    const drawStickersFrom = (stripId) => {
      const strip = $(stripId);
      if (!strip) return;
      const rect = strip.getBoundingClientRect();
      const scaleX = totalW / rect.width;
      const scaleY = totalH / rect.height;
      
      const stickers = strip.querySelectorAll('.placed-sticker');
      stickers.forEach(stickerEl => {
        const x = parseFloat(stickerEl.style.left) * scaleX;
        const y = parseFloat(stickerEl.style.top) * scaleY;
        cx.font = '28px sans-serif';
        cx.textAlign = 'center';
        cx.textBaseline = 'middle';
        cx.fillText(stickerEl.textContent, x, y);
      });
    };
    
    drawStickersFrom('photoStrip');
    drawStickersFrom('photoStripMobile');

    // Draw drawing canvas
    const drawCanvas = $('drawCanvas');
    if (drawCanvas && drawCanvas.width > 0 && drawCanvas.height > 0) {
      try {
        cx.drawImage(drawCanvas, 0, 0, totalW, totalH);
      } catch (e) {
        console.warn('Could not draw desktop canvas:', e);
      }
    }
    
    const drawCanvasMobile = $('drawCanvasMobile');
    if (drawCanvasMobile && drawCanvasMobile.width > 0 && drawCanvasMobile.height > 0) {
      try {
        cx.drawImage(drawCanvasMobile, 0, 0, totalW, totalH);
      } catch (e) {
        console.warn('Could not draw mobile canvas:', e);
      }
    }

    // Draw footer text
    cx.fillStyle = state.frameColor.text;
    cx.font = '14px system-ui';
    cx.textAlign = 'center';
    cx.textBaseline = 'alphabetic';
    cx.fillText('snaptime', totalW / 2, totalH - pad - 8);

    // Create download link
    const dataUrl = c.toDataURL('image/png', 0.95);
    const link = document.createElement('a');
    link.download = `snaptime-${Date.now()}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Download error:', error);
    alert('Could not download image. Please try again.');
  }
}

// ========== RESET ==========
function reset() {
  state.photos = [];
  state.effect = EFFECTS[0];
  state.placedStickers = [];
  state.selectedSticker = null;
  state.drawMode = false;
  state.currentTool = 'colors';
  stopCamera();
  updateMiniPreviews();
  updateProgress();
  $('captureBtn').disabled = false;
  $('captureBtn').style.opacity = '1';
  $('captureStatus').textContent = '';
  showScreen('welcome');
}

// ========== DRAWING EVENT HANDLERS ==========
function setupDrawingEvents(canvasId, ctxGetter) {
  const drawCanvas = $(canvasId);
  if (!drawCanvas) return;
  
  const getCtx = () => ctxGetter();
  
  drawCanvas.onmousedown = (e) => {
    if (!state.drawMode) return;
    state.isDrawing = true;
    const rect = e.target.getBoundingClientRect();
    state.lastX = e.clientX - rect.left;
    state.lastY = e.clientY - rect.top;
    saveDrawState();
  };

  drawCanvas.onmousemove = (e) => {
    if (!state.isDrawing || !state.drawMode) return;
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    drawSketchyLine(getCtx(), state.lastX, state.lastY, x, y);
    state.lastX = x;
    state.lastY = y;
  };

  drawCanvas.onmouseup = () => state.isDrawing = false;
  drawCanvas.onmouseleave = () => state.isDrawing = false;

  drawCanvas.ontouchstart = (e) => {
    if (!state.drawMode) return;
    e.preventDefault();
    state.isDrawing = true;
    const rect = e.target.getBoundingClientRect();
    const touch = e.touches[0];
    state.lastX = touch.clientX - rect.left;
    state.lastY = touch.clientY - rect.top;
    saveDrawState();
  };

  drawCanvas.ontouchmove = (e) => {
    if (!state.isDrawing || !state.drawMode) return;
    e.preventDefault();
    const rect = e.target.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    drawSketchyLine(getCtx(), state.lastX, state.lastY, x, y);
    state.lastX = x;
    state.lastY = y;
  };

  drawCanvas.ontouchend = () => state.isDrawing = false;
}

// ========== EVENT LISTENERS ==========
function initEventListeners() {
  // Main buttons
  $('startBtn').onclick = startCamera;
  $('captureBtn').onclick = startAutoCapture;
  $('downloadBtn').onclick = download;
  $('resetBtn').onclick = reset;
  $('clearStickers').onclick = clearStickers;

  // Desktop tabs
  $('tabStickers').onclick = () => {
    $('tabStickers').classList.add('active');
    $('tabDraw').classList.remove('active');
    $('stickerPanel').classList.remove('hidden');
    $('drawPanel').classList.add('hidden');
    state.drawMode = false;
    updateDrawMode();
  };

  $('tabDraw').onclick = () => {
    $('tabDraw').classList.add('active');
    $('tabStickers').classList.remove('active');
    $('drawPanel').classList.remove('hidden');
    $('stickerPanel').classList.add('hidden');
    state.drawMode = true;
    state.selectedSticker = null;
    renderStickers('stickerGrid');
    updateDrawMode();
  };

  // Desktop drawing controls
  $('undoDraw').onclick = undoDraw;
  $('clearDraw').onclick = clearDrawing;

  // Desktop strip click for stickers
  $('photoStrip').onclick = (e) => {
    if (state.selectedSticker && !state.drawMode) {
      placeSticker(e, 'photoStrip', 'stickersContainer');
    }
  };

  // Mobile toolbar
  $('toolColor').onclick = () => setMobileTool('colors');
  $('toolSticker').onclick = () => setMobileTool('stickers');
  $('toolDraw').onclick = () => setMobileTool('draw');
  $('toolEffect').onclick = () => setMobileTool('effects');
  
  // Mobile buttons
  if ($('mobileDownloadBtn')) $('mobileDownloadBtn').onclick = download;
  if ($('mobileResetBtn')) $('mobileResetBtn').onclick = reset;
  $('mobileClearStickers').onclick = clearStickers;
  $('mobileUndoDraw').onclick = undoDraw;
  $('mobileClearDraw').onclick = clearDrawing;
  
  // Mobile strip click for stickers
  $('photoStripMobile').onclick = (e) => {
    if (state.selectedSticker && !state.drawMode) {
      placeSticker(e, 'photoStripMobile', 'stickersContainerMobile');
    }
  };

  // Setup drawing on both canvases
  setupDrawingEvents('drawCanvas', () => state.drawCtx);
  setupDrawingEvents('drawCanvasMobile', () => state.drawCtxMobile);
  
  // Handle resize
  window.addEventListener('resize', () => {
    state.isMobile = window.innerWidth <= 768;
  });
}

// ========== INITIALIZATION ==========
function init() {
  initEventListeners();
  renderColors('colorOptions');
  updateMiniPreviews();
}

// Start app when DOM is ready
document.addEventListener('DOMContentLoaded', init);
