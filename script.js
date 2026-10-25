// === Read URL params ===
const params = new URLSearchParams(window.location.search);
const name = params.get("name") || "Mwithj";
let candleCount = parseInt(params.get("candles")) || 4;
candleCount = Math.min(Math.max(candleCount, 1), 30);

const birthdayText = document.getElementById("birthdayText");
birthdayText.innerHTML = `
  <div id="mainTitle">Happy Birthday, ${name}!</div>
  <div id="subTitle">Make a wish and blow out the candles! 🎂</div>
`;

const cake = document.getElementById("cake");
const blowBtn = document.getElementById("blowBtn");
const micBtn = document.getElementById("micBtn");
const statusHint = document.getElementById("statusHint");
const stage = document.getElementById("cakeStage");

const colors = [
  "green-candle",
  "purple-candle",
  "blue-candle",
  "yellow-candle",
];
const CAKE_VISUAL_WIDTH = 35;

function createCandles(count) {
  cake.innerHTML = "";
  const CANDLE_VISUAL_WIDTH = 2;
  const availableWidth = CAKE_VISUAL_WIDTH;
  const candlesPerRow = 6;
  const shiftAmount = 4;

  for (let i = 0; i < count; i++) {
    const candle = document.createElement("div");
    candle.classList.add("candle");
    const colorClass = colors[Math.floor(Math.random() * colors.length)];
    candle.classList.add(colorClass);

    const row = Math.floor(i / candlesPerRow);
    const col = i % candlesPerRow;
    const totalCandlesInRow = Math.min(
      candlesPerRow,
      count - row * candlesPerRow
    );
    const rowSpacing = availableWidth / (totalCandlesInRow + 1);

    const leftBase = rowSpacing * (col + 1) - CANDLE_VISUAL_WIDTH / 2 + 5;
    const rowShift = row % 2 === 0 ? 0 : shiftAmount;

    candle.style.position = "absolute";
    candle.style.top = `${10 + row * 3}px`;
    candle.style.left = `${leftBase - rowShift + 4}px`;

    cake.appendChild(candle);
  }
}

createCandles(candleCount);

// === Blow Out Logic (Cheer both Chimmys & snuff candles) ===
let candlesBlown = false;

function blowOutCandles() {
  if (candlesBlown) return;
  candlesBlown = true;

  // Cheer BOTH chimmys
  const chimmyWrappers = document.querySelectorAll(".chimmy-wrapper");
  chimmyWrappers.forEach((el) => el.classList.add("cheer"));

  const candles = document.querySelectorAll(".candle");
  candles.forEach((candle) => {
    const delay = Math.random() * 800;
    setTimeout(() => {
      candle.classList.add("blown");
    }, delay);
  });

  if (blowBtn) {
    blowBtn.disabled = true;
    blowBtn.textContent = "🎉 Wish Granted!";
  }

  if (statusHint) {
    statusHint.textContent = "✨ All candles blown out! ✨";
  }

  setTimeout(() => {
    const subTitle = document.getElementById("subTitle");
    if (subTitle) {
      subTitle.textContent = `Yayy! Wishing you the happiest birthday ever!! 🎉`;
    }
  }, 1000);
}

// === Direct Fallback: Click on button, cake, or anywhere on the stage ===
if (blowBtn) {
  blowBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    blowOutCandles();
  });
}

if (cake) {
  cake.addEventListener("click", blowOutCandles);
}

// === Robust Microphone Detection (Handles browser permission & unlock) ===
let audioContext = null;
let micStream = null;
let isMicListening = false;

async function startMicDetection() {
  if (candlesBlown) return;

  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (statusHint) {
        statusHint.textContent = "Microphone not supported on this browser. Tap 'Blow Candles' instead!";
      }
      return;
    }

    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });

    const source = audioContext.createMediaStreamSource(micStream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.2;
    source.connect(analyser);

    const freqData = new Uint8Array(analyser.frequencyBinCount);
    const timeData = new Uint8Array(analyser.fftSize);

    isMicListening = true;
    if (micBtn) {
      micBtn.textContent = "🎤 Mic Active";
      micBtn.classList.add("active");
    }
    if (statusHint) {
      statusHint.textContent = "Listening... Blow strongly into your mic! 💨";
    }

    function checkAudio() {
      if (candlesBlown) {
        // Stop audio tracks after blowing
        if (micStream) micStream.getTracks().forEach((track) => track.stop());
        return;
      }

      analyser.getByteFrequencyData(freqData);
      analyser.getByteTimeDomainData(timeData);

      // 1. Calculate overall Volume (RMS)
      let sumSquares = 0;
      for (let i = 0; i < timeData.length; i++) {
        const val = (timeData[i] - 128) / 128;
        sumSquares += val * val;
      }
      const rms = Math.sqrt(sumSquares / timeData.length);

      // 2. Frequency distribution (blowing into mic creates turbulence with broad energy)
      let totalFreqSum = 0;
      for (let i = 0; i < freqData.length; i++) {
        totalFreqSum += freqData[i];
      }
      const avgFreq = totalFreqSum / freqData.length;

      // Detection condition: strong air puff / wind noise
      if ((rms > 0.18 && avgFreq > 22) || rms > 0.45) {
        blowOutCandles();
        return;
      }

      requestAnimationFrame(checkAudio);
    }

    checkAudio();
  } catch (err) {
    console.warn("Microphone access failed or blocked:", err);
    if (statusHint) {
      statusHint.textContent = "Mic access blocked or unavailable. Tap 'Blow Candles' to blow!";
    }
    if (micBtn) {
      micBtn.textContent = "🎤 Mic Blocked";
    }
  }
}

// User-gesture triggers for microphone (browser requirement)
if (micBtn) {
  micBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    startMicDetection();
  });
}

// Try starting mic on any initial tap/click anywhere on the page
function firstUserInteraction() {
  if (!isMicListening && !candlesBlown) {
    startMicDetection();
  }
  window.removeEventListener("pointerdown", firstUserInteraction);
}
window.addEventListener("pointerdown", firstUserInteraction, { once: true });

// === Responsive Fit: Scale stage to fit any screen size ===
const STAGE_WIDTH = 1120;
const STAGE_HEIGHT = 620;

function fitStage() {
  const container = document.querySelector(".cake-container");
  if (!container) return;
  const padding = 24;
  const availableWidth = window.innerWidth - padding;
  const scale = Math.min(1, availableWidth / STAGE_WIDTH);

  if ("zoom" in document.documentElement.style) {
    container.style.zoom = scale;
  } else {
    container.style.transform = `scale(${scale})`;
    container.style.transformOrigin = "top center";
    container.style.marginBottom = `${-(1 - scale) * STAGE_HEIGHT}px`;
  }
}

fitStage();
window.addEventListener("resize", fitStage);