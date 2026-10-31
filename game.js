import { createSnakeWorld } from "./snake3d.js?v=3d1";

(() => {
  "use strict";

  const GRID_SIZE = 20;
  const START_SPEED = 165;
  // En 3D derrière la tête, la vitesse maximale est un peu plus douce qu'en 2D.
  const MIN_SPEED = 85;
  const STORAGE_KEYS = {
    best: "snake-massi-best",
    sound: "snake-massi-sound",
  };

  const DIRECTIONS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };

  const OPPOSITE = {
    up: "down",
    down: "up",
    left: "right",
    right: "left",
  };

  // Avec la caméra derrière la tête, on tourne à gauche ou à droite
  // par rapport au serpent (et non plus vers le haut ou le bas de l'écran).
  const TURN_LEFT = { up: "left", left: "down", down: "right", right: "up" };
  const TURN_RIGHT = { up: "right", right: "down", down: "left", left: "up" };

  const KEY_TURNS = {
    ArrowLeft: "left",
    ArrowRight: "right",
    q: "left",
    Q: "left",
    a: "left",
    A: "left",
    d: "right",
    D: "right",
  };

  const elements = {
    html: document.documentElement,
    canvas: document.querySelector("#gameCanvas"),
    boardFrame: document.querySelector("#boardFrame"),
    overlay: document.querySelector("#gameOverlay"),
    overlayKicker: document.querySelector("#overlayKicker"),
    overlayTitle: document.querySelector("#overlayTitle"),
    overlayMessage: document.querySelector("#overlayMessage"),
    primaryAction: document.querySelector("#primaryAction"),
    primaryActionLabel: document.querySelector("#primaryAction span"),
    shareButton: document.querySelector("#shareButton"),
    scoreValue: document.querySelector("#scoreValue"),
    bestValue: document.querySelector("#bestValue"),
    levelValue: document.querySelector("#levelValue"),
    statusText: document.querySelector("#statusText"),
    pauseButton: document.querySelector("#pauseButton"),
    pauseLabel: document.querySelector("#pauseLabel"),
    soundButton: document.querySelector("#soundButton"),
    installButton: document.querySelector("#installButton"),
    helpButton: document.querySelector("#helpButton"),
    helpDialog: document.querySelector("#helpDialog"),
    closeHelpButton: document.querySelector("#closeHelpButton"),
    dialogPlayButton: document.querySelector("#dialogPlayButton"),
    trackProgress: document.querySelector("#trackProgress"),
    stageClassic: document.querySelector("#stageClassic"),
    stageKichta: document.querySelector("#stageKichta"),
    stagePucci: document.querySelector("#stagePucci"),
    stageAmour: document.querySelector("#stageAmour"),
    modeWarning: document.querySelector("#modeWarning"),
    fireworksCanvas: document.querySelector("#fireworksCanvas"),
    milestonePortrait: document.querySelector("#milestonePortrait"),
    milestoneImage: document.querySelector("#milestoneImage"),
    milestoneImageSecondary: document.querySelector("#milestoneImageSecondary"),
    restartButton: document.querySelector("#restartButton"),
    toast: document.querySelector("#toast"),
    turnButtons: [...document.querySelectorAll("[data-turn]")],
    mapCanvas: document.querySelector("#mapCanvas"),
  };

  let world3d = null;
  let renderProgress = 1;
  let lastFrameAt = 0;
  const fireworksContext = elements.fireworksCanvas.getContext("2d");
  let bestScore = readStoredNumber(STORAGE_KEYS.best);
  let soundEnabled = readStoredValue(STORAGE_KEYS.sound, "on") !== "off";
  let game = createGame("idle");
  let overlayAction = "start";
  let boardSize = 600;
  let pixelRatio = 1;
  let lastStepAt = 0;
  let pointerStart = null;
  let installPrompt = null;
  let toastTimer = null;
  let audioContext = null;
  let fireworksAnimationId = null;
  let fireworksParticles = [];
  let fireworksColors = [];
  let fireworksWidth = 0;
  let fireworksHeight = 0;
  let fireworksStartedAt = 0;
  let fireworksLastFrameAt = 0;
  let nextFireworkAt = 0;

  function createGame(mode = "idle", score = 0) {
    const snake = [
      { x: 10, y: 11 },
      { x: 10, y: 12 },
      { x: 10, y: 13 },
      { x: 10, y: 14 },
    ];

    return {
      mode,
      snake,
      food: createFood(snake),
      direction: "up",
      directionQueue: [],
      score,
      directions: DIRECTIONS,
      previousSnake: null,
      lastEaten: null,
    };
  }

  function createFood(snake) {
    const occupied = new Set(snake.map((part) => `${part.x}:${part.y}`));
    const freeCells = [];

    for (let y = 0; y < GRID_SIZE; y += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        if (!occupied.has(`${x}:${y}`)) freeCells.push({ x, y });
      }
    }

    if (!freeCells.length) return null;
    return freeCells[randomInteger(freeCells.length)];
  }

  function randomInteger(maximum) {
    if (window.crypto?.getRandomValues) {
      const values = new Uint32Array(1);
      window.crypto.getRandomValues(values);
      return values[0] % maximum;
    }
    return Math.floor(Math.random() * maximum);
  }

  function readStoredValue(key, fallback) {
    try {
      return window.localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  }

  function readStoredNumber(key) {
    const value = Number.parseInt(readStoredValue(key, "0"), 10);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  function writeStoredValue(key, value) {
    try {
      window.localStorage.setItem(key, String(value));
    } catch {
      // Le stockage privé peut être désactivé : le jeu reste utilisable.
    }
  }

  function getLevel(score = game.score) {
    if (score >= 30) return "amour";
    if (score >= 20) return "pucci";
    if (score >= 10) return "kichta";
    return "classic";
  }

  function getSpeed() {
    const levelBoost = getLevel() === "pucci" ? 8 : 0;
    return Math.max(MIN_SPEED, START_SPEED - game.score * 3 - levelBoost);
  }

  function startNewGame() {
    game = createGame("playing");
    lastStepAt = performance.now();
    hideOverlay();
    updateInterface();
    focusBoard();
    playTone("start");
  }

  function continueAfterLoss() {
    const savedScore = game.score;
    game = createGame("playing", savedScore);
    lastStepAt = performance.now();
    hideOverlay(); updateInterface(); focusBoard(); playTone("start");
  }

  function resumeGame() {
    if (game.mode !== "paused" && game.mode !== "milestone") return;
    game.mode = "playing";
    lastStepAt = performance.now();
    hideOverlay();
    updateInterface();
    focusBoard();
  }

  function pauseGame() {
    if (game.mode !== "playing") return;
    game.mode = "paused";
    showOverlay({
      kicker: "PARTIE EN PAUSE",
      title: "RESPIRE<br><em>UN COUP</em>",
      message: "Ta partie t’attend. Reprends quand tu veux.",
      button: "REPRENDRE",
      action: "resume",
    });
    updateInterface();
  }

  function togglePause() {
    if (game.mode === "playing") pauseGame();
    else if (game.mode === "paused") resumeGame();
  }

  function finishGame() {
    game.mode = "game-over";
    game.directionQueue = [];
    updateBestScore();
    updateInterface();
    vibrate([45, 35, 90]);
    playTone("lose");
    showOverlay({
      kicker: game.score === bestScore && bestScore > 0 ? "NOUVEAU RECORD" : "PARTIE TERMINÉE",
      title: "BIEN<br><em>TENTÉ</em>",
      message: `Score atteint : ${formatScore(game.score)}. Continue au même score ou recommence.`,
      button: "CONTINUER",
      action: "continue-loss",
      restart: true,
      share: true,
    });
  }

  function activateMilestone(score) {
    game.mode = "milestone";
    game.directionQueue = [];
    const isPucci = score === 20;
    const isFinal = score === 30;

    if (isFinal) {
      game.mode = "victory"; updateBestScore();
      showOverlay({kicker:"NIVEAU 3 TERMINÉ",title:"KICHTA<br><em>♥ PUCCI</em>",message:"Victoire ! Les deux héros célèbrent leur amour sous les feux d’artifice.",button:"REJOUER",action:"restart",share:true,celebration:{image:"./assets/kichta-pucci-amour-3d-mobile.jpg",alt:"Kichta et Pucci s’embrassant dans un cœur lumineux",heart:true,colors:["#ff365d","#ff59c7","#fff06a","#ffffff"]}});
      updateInterface(); return;
    }

    vibrate(isPucci ? [35, 25, 35, 25, 80] : [35, 35, 60]);
    playTone(isPucci ? "pucci" : "milestone");
    showOverlay({
      kicker: `SCORE ${score}`,
      title: isPucci ? "MODE<br><em>PUCCI</em>" : "NIVEAU<br><em>KICHTA</em>",
      message: isPucci
        ? "Défi ultime débloqué : toutes les commandes sont maintenant inversées."
        : "Niveau Kichta atteint. Le serpent passe en noir et blanc et accélère.",
      button: "CONTINUER",
      action: "continue",
      celebration: isPucci
        ? {
            image: "./assets/chat-pucci.jpg",
            alt: "Chat noir et blanc célébrant le niveau Pucci",
            colors: ["#ff59c7", "#73f7ff", "#fff06a", "#ffffff", "#9b7bff"],
          }
        : {
            image: "./assets/chat-kichta.jpg",
            alt: "Chat tigré célébrant le niveau Kichta",
            colors: ["#caff59", "#86ff78", "#ffd166", "#ff6b7a", "#ffffff"],
          },
    });
    updateInterface();
  }

  function stepGame() {
    if (game.mode !== "playing") return;

    const queuedDirection = game.directionQueue.shift();
    if (queuedDirection) game.direction = queuedDirection;

    const movement = DIRECTIONS[game.direction];
    const head = game.snake[0];
    const newHead = { x: head.x + movement.x, y: head.y + movement.y };

    const hitWall =
      newHead.x < 0 ||
      newHead.x >= GRID_SIZE ||
      newHead.y < 0 ||
      newHead.y >= GRID_SIZE;

    if (hitWall) {
      finishGame();
      return;
    }

    const ateFood = game.food && newHead.x === game.food.x && newHead.y === game.food.y;
    const collisionBody = ateFood ? game.snake : game.snake.slice(0, -1);
    const hitBody = collisionBody.some((part) => part.x === newHead.x && part.y === newHead.y);

    if (hitBody) {
      finishGame();
      return;
    }

    game.previousSnake = game.snake.map((part) => ({ x: part.x, y: part.y }));
    game.snake.unshift(newHead);

    if (!ateFood) {
      game.snake.pop();
      return;
    }

    const eatenFood = game.food;
    game.score += 1;
    game.food = createFood(game.snake);
    game.lastEaten = eatenFood;
    updateBestScore();
    updateInterface();
    vibrate(18);
    playTone("eat");

    if (!game.food) {
      game.mode = "game-over";
      showOverlay({
        kicker: "PLATEAU TERMINÉ",
        title: "VICTOIRE<br><em>TOTALE</em>",
        message: `Incroyable : tu as rempli tout le plateau avec ${formatScore(game.score)} points.`,
        button: "REJOUER",
        action: "restart",
        share: true,
      });
      updateInterface();
      return;
    }

    if (game.score === 10 || game.score === 20 || game.score === 30) activateMilestone(game.score);
  }

  function updateBestScore() {
    if (game.score <= bestScore) return;
    bestScore = game.score;
    writeStoredValue(STORAGE_KEYS.best, bestScore);
  }

  function queueTurn(requestedTurn) {
    if (game.mode !== "playing" || (requestedTurn !== "left" && requestedTurn !== "right")) return;

    // Niveau Pucci : les commandes sont inversées.
    const turn = getLevel() === "pucci" ? (requestedTurn === "left" ? "right" : "left") : requestedTurn;
    if (game.directionQueue.length >= 2) return;
    const lastQueued = game.directionQueue.at(-1) ?? game.direction;
    game.directionQueue.push(turn === "left" ? TURN_LEFT[lastQueued] : TURN_RIGHT[lastQueued]);
    vibrate(7);
  }

  function updateInterface() {
    const level = getLevel();
    const levelNames = { classic: "CLASSIQUE", kichta: "KICHTA", pucci: "PUCCI", amour: "AMOUR" };
    const statusNames = {
      idle: "PRÊT",
      playing: "EN JEU",
      paused: "EN PAUSE",
      milestone: "NIVEAU DÉBLOQUÉ",
      victory: "VICTOIRE",
      "game-over": "TERMINÉ",
    };

    elements.html.dataset.gameState = game.mode;
    elements.html.dataset.level = level;
    elements.scoreValue.textContent = formatScore(game.score);
    elements.bestValue.textContent = formatScore(bestScore);
    elements.levelValue.textContent = levelNames[level];
    elements.statusText.textContent = statusNames[game.mode];
    elements.pauseButton.disabled = game.mode === "idle" || game.mode === "game-over" || game.mode === "milestone";
    elements.pauseLabel.textContent = game.mode === "paused" ? "Reprendre" : "Pause";
    elements.pauseButton.setAttribute("aria-label", game.mode === "paused" ? "Reprendre la partie" : "Mettre en pause");
    elements.trackProgress.style.width = `${Math.min(100, (game.score / 30) * 100)}%`;
    elements.modeWarning.hidden = !(level === "pucci" && game.mode === "playing");

    const stages = [elements.stageClassic, elements.stageKichta, elements.stagePucci, elements.stageAmour];
    const activeIndex = level === "classic" ? 0 : level === "kichta" ? 1 : level === "pucci" ? 2 : 3;
    stages.forEach((stage, index) => {
      stage.classList.toggle("is-active", index === activeIndex);
      stage.classList.toggle("is-complete", index < activeIndex);
    });
  }

  function showOverlay({ kicker, title, message, button, action, share = false, restart = false, celebration = null }) {
    overlayAction = action;
    elements.overlayKicker.textContent = kicker;
    elements.overlayTitle.innerHTML = title;
    elements.overlayMessage.textContent = message;
    elements.primaryActionLabel.textContent = button;
    elements.shareButton.hidden = !share;
    elements.restartButton.hidden = !restart;
    elements.overlay.classList.remove("is-hidden");
    configureCelebration(celebration);
  }

  function hideOverlay() {
    configureCelebration(null);
    elements.overlay.classList.add("is-hidden");
    elements.shareButton.hidden = true;
    elements.restartButton.hidden = true;
  }

  function configureCelebration(celebration) {
    stopFireworks();
    const isCelebrating = Boolean(celebration);
    elements.overlay.classList.toggle("is-celebrating", isCelebrating);
    elements.milestonePortrait.hidden = !isCelebrating;
    elements.milestonePortrait.style.removeProperty("background-image");

    if (!celebration) {
      elements.milestoneImage.removeAttribute("src");
      elements.milestoneImage.alt = "";
      return;
    }

    elements.milestoneImage.src = celebration.image;
    elements.milestoneImage.alt = celebration.alt;
    elements.milestoneImageSecondary.hidden = !celebration.secondaryImage;
    if (celebration.secondaryImage) elements.milestoneImageSecondary.src = celebration.secondaryImage;
    elements.milestonePortrait.classList.toggle("is-heart", Boolean(celebration.heart));
    if (celebration.heart) elements.milestonePortrait.style.backgroundImage = `url("${celebration.image}")`;
    startFireworks(celebration.colors);
  }

  function startFireworks(colors) {
    stopFireworks(false);
    fireworksColors = colors;
    fireworksParticles = [];
    fireworksStartedAt = performance.now();
    fireworksLastFrameAt = fireworksStartedAt;
    nextFireworkAt = fireworksStartedAt;
    elements.fireworksCanvas.hidden = false;
    resizeFireworksCanvas();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    launchFirework();
    launchFirework();
    fireworksAnimationId = window.requestAnimationFrame(animateFireworks);
  }

  function stopFireworks(hideCanvas = true) {
    if (fireworksAnimationId) window.cancelAnimationFrame(fireworksAnimationId);
    fireworksAnimationId = null;
    fireworksParticles = [];
    fireworksContext.clearRect(0, 0, fireworksWidth, fireworksHeight);
    if (hideCanvas) elements.fireworksCanvas.hidden = true;
  }

  function resizeFireworksCanvas() {
    const bounds = elements.overlay.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    fireworksWidth = Math.max(1, bounds.width);
    fireworksHeight = Math.max(1, bounds.height);
    elements.fireworksCanvas.width = Math.round(fireworksWidth * ratio);
    elements.fireworksCanvas.height = Math.round(fireworksHeight * ratio);
    fireworksContext.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function launchFirework() {
    if (!fireworksWidth || !fireworksHeight || !fireworksColors.length) return;

    const centerX = fireworksWidth * (0.14 + Math.random() * 0.72);
    const centerY = fireworksHeight * (0.12 + Math.random() * 0.44);
    const particleCount = fireworksWidth < 420 ? 28 : 40;
    const baseSpeed = Math.min(fireworksWidth, fireworksHeight) * 0.24;
    const color = fireworksColors[randomInteger(fireworksColors.length)];

    for (let index = 0; index < particleCount; index += 1) {
      const angle = (Math.PI * 2 * index) / particleCount + Math.random() * 0.08;
      const speed = baseSpeed * (0.55 + Math.random() * 0.65);
      const life = 0.72 + Math.random() * 0.55;
      fireworksParticles.push({
        x: centerX,
        y: centerY,
        previousX: centerX,
        previousY: centerY,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        life,
        maximumLife: life,
        size: 1.1 + Math.random() * 1.6,
        color,
      });
    }
  }

  function animateFireworks(timestamp) {
    const delta = Math.min(0.035, Math.max(0.001, (timestamp - fireworksLastFrameAt) / 1000));
    fireworksLastFrameAt = timestamp;

    if (timestamp - fireworksStartedAt < 9000 && timestamp >= nextFireworkAt) {
      launchFirework();
      if (Math.random() > 0.55) launchFirework();
      nextFireworkAt = timestamp + 280 + Math.random() * 300;
    }

    fireworksContext.clearRect(0, 0, fireworksWidth, fireworksHeight);
    fireworksContext.globalCompositeOperation = "lighter";
    const gravity = fireworksHeight * 0.22;

    fireworksParticles = fireworksParticles.filter((particle) => {
      particle.life -= delta;
      if (particle.life <= 0) return false;

      particle.previousX = particle.x;
      particle.previousY = particle.y;
      particle.velocityY += gravity * delta;
      particle.velocityX *= 0.992;
      particle.x += particle.velocityX * delta;
      particle.y += particle.velocityY * delta;

      const opacity = Math.max(0, particle.life / particle.maximumLife);
      fireworksContext.save();
      fireworksContext.globalAlpha = opacity;
      fireworksContext.strokeStyle = particle.color;
      fireworksContext.lineWidth = particle.size;
      fireworksContext.lineCap = "round";
      fireworksContext.shadowColor = particle.color;
      fireworksContext.shadowBlur = 8;
      fireworksContext.beginPath();
      fireworksContext.moveTo(particle.previousX, particle.previousY);
      fireworksContext.lineTo(particle.x, particle.y);
      fireworksContext.stroke();
      fireworksContext.restore();
      return true;
    });

    fireworksContext.globalCompositeOperation = "source-over";
    const shouldContinue = timestamp - fireworksStartedAt < 9000 || fireworksParticles.length > 0;
    fireworksAnimationId = shouldContinue ? window.requestAnimationFrame(animateFireworks) : null;
  }

  function handlePrimaryAction() {
    ensureAudioContext();
    if (overlayAction === "reload") window.location.reload();
    else if (overlayAction === "resume" || overlayAction === "continue") resumeGame();
    else if (overlayAction === "continue-loss") continueAfterLoss();
    else startNewGame();
  }

  function formatScore(score) {
    return String(score).padStart(3, "0");
  }

  function focusBoard() {
    window.setTimeout(() => elements.canvas.focus({ preventScroll: true }), 30);
  }

  function resizeCanvas() {
    const bounds = elements.boardFrame.getBoundingClientRect();
    boardSize = Math.max(1, Math.floor(bounds.width));
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    world3d?.resize(bounds.width, bounds.height, pixelRatio);
    if (!elements.fireworksCanvas.hidden) resizeFireworksCanvas();
  }

  function gameLoop(timestamp) {
    if (game.mode === "playing" && timestamp - lastStepAt >= getSpeed()) {
      stepGame();
      lastStepAt = timestamp;
    }
    // Avancement entre deux cases, pour un mouvement fluide en 3D.
    if (game.mode === "playing") renderProgress = Math.min(1, Math.max(0, (timestamp - lastStepAt) / getSpeed()));
    const delta = Math.min(0.05, Math.max(0, (timestamp - lastFrameAt) / 1000 || 0));
    lastFrameAt = timestamp;
    world3d?.render(game, getLevel(), renderProgress, timestamp, delta);
    window.requestAnimationFrame(gameLoop);
  }

  function ensureAudioContext() {
    if (!soundEnabled) return null;
    if (!audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      audioContext = new AudioContextClass();
    }
    if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
    return audioContext;
  }

  function tone(frequency, duration, volume, type = "sine", delay = 0) {
    const audio = ensureAudioContext();
    if (!audio) return;

    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const startAt = audio.currentTime + delay;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.02);
  }

  function playTone(name) {
    if (!soundEnabled) return;
    if (name === "eat") {
      tone(520, 0.08, 0.045, "square");
      tone(760, 0.09, 0.035, "square", 0.045);
    } else if (name === "start") {
      tone(360, 0.08, 0.035, "sine");
      tone(560, 0.11, 0.04, "sine", 0.07);
    } else if (name === "milestone") {
      tone(430, 0.15, 0.045, "triangle");
      tone(650, 0.17, 0.045, "triangle", 0.11);
      tone(870, 0.2, 0.045, "triangle", 0.22);
    } else if (name === "pucci") {
      tone(330, 0.18, 0.04, "sawtooth");
      tone(660, 0.2, 0.04, "sawtooth", 0.12);
      tone(990, 0.23, 0.035, "sawtooth", 0.24);
    } else if (name === "lose") {
      tone(250, 0.16, 0.04, "triangle");
      tone(180, 0.27, 0.04, "triangle", 0.13);
    }
  }

  function toggleSound() {
    soundEnabled = !soundEnabled;
    writeStoredValue(STORAGE_KEYS.sound, soundEnabled ? "on" : "off");
    elements.soundButton.setAttribute("aria-pressed", String(soundEnabled));
    elements.soundButton.setAttribute("aria-label", soundEnabled ? "Couper le son" : "Activer le son");
    if (soundEnabled) {
      ensureAudioContext();
      playTone("start");
    }
    showToast(soundEnabled ? "Son activé" : "Son coupé");
  }

  function vibrate(pattern) {
    if (navigator.vibrate) navigator.vibrate(pattern);
  }

  async function shareScore() {
    const text = `J’ai fait ${game.score} points sur Snake Massi. À toi de battre mon score !`;
    const data = { title: "Snake Massi", text, url: window.location.href };

    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }

      await navigator.clipboard.writeText(`${text} ${window.location.href}`);
      showToast("Lien et score copiés");
    } catch (error) {
      if (error?.name !== "AbortError") showToast("Partage indisponible sur ce navigateur");
    }
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 2200);
  }

  function openHelp() {
    if (game.mode === "playing") pauseGame();
    elements.helpDialog.showModal();
  }

  function closeHelp() {
    elements.helpDialog.close();
  }

  function handleDialogPlay() {
    closeHelp();
    if (game.mode === "paused") resumeGame();
    else if (game.mode === "milestone") resumeGame();
    else startNewGame();
  }

  function handleKeyDown(event) {
    const turn = KEY_TURNS[event.key];
    if (turn) {
      event.preventDefault();
      if (!event.repeat) queueTurn(turn);
      return;
    }
    if (["ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      return;
    }

    if (event.key === " " || event.key === "p" || event.key === "P") {
      event.preventDefault();
      togglePause();
    } else if (event.key === "Enter" && !elements.overlay.classList.contains("is-hidden")) {
      event.preventDefault();
      handlePrimaryAction();
    }
  }

  function handlePointerDown(event) {
    if (game.mode !== "playing" || event.target.closest("button")) return;
    pointerStart = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    try {
      elements.boardFrame.setPointerCapture?.(event.pointerId);
    } catch {
      // Sans capture, le geste reste reconnu.
    }
  }

  // Toucher la moitié gauche ou droite du jeu fait tourner le serpent.
  // Un glissement horizontal marche aussi.
  function handlePointerUp(event) {
    if (!pointerStart || pointerStart.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - pointerStart.x;
    const deltaY = event.clientY - pointerStart.y;
    pointerStart = null;

    if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 18) {
      const bounds = elements.boardFrame.getBoundingClientRect();
      queueTurn(event.clientX < bounds.left + bounds.width / 2 ? "left" : "right");
      return;
    }
    if (Math.abs(deltaX) > Math.abs(deltaY)) queueTurn(deltaX > 0 ? "right" : "left");
  }

  function bindEvents() {
    elements.primaryAction.addEventListener("click", handlePrimaryAction);
    elements.shareButton.addEventListener("click", shareScore);
    elements.restartButton.addEventListener("click", startNewGame);
    elements.pauseButton.addEventListener("click", togglePause);
    elements.soundButton.addEventListener("click", toggleSound);
    elements.helpButton.addEventListener("click", openHelp);
    elements.closeHelpButton.addEventListener("click", closeHelp);
    elements.dialogPlayButton.addEventListener("click", handleDialogPlay);
    elements.helpDialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeHelp();
    });

    elements.turnButtons.forEach((button) => {
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        ensureAudioContext();
        queueTurn(button.dataset.turn);
      });
    });

    elements.boardFrame.addEventListener("pointerdown", handlePointerDown);
    elements.boardFrame.addEventListener("pointerup", handlePointerUp);
    elements.boardFrame.addEventListener("pointercancel", () => {
      pointerStart = null;
    });
    elements.boardFrame.addEventListener("contextmenu", (event) => event.preventDefault());
    window.addEventListener("keydown", handleKeyDown, { passive: false });
    window.addEventListener("resize", resizeCanvas);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) pauseGame();
    });

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      installPrompt = event;
      elements.installButton.hidden = false;
    });

    elements.installButton.addEventListener("click", async () => {
      if (!installPrompt) return;
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      elements.installButton.hidden = true;
    });

    window.addEventListener("appinstalled", () => {
      elements.installButton.hidden = true;
      showToast("Snake Massi est installé");
    });
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js?v=3d1").catch(() => {
        // Le mode hors ligne est optionnel et ne bloque jamais le jeu.
      });
    });
  }

  function initialise() {
    elements.soundButton.setAttribute("aria-pressed", String(soundEnabled));
    elements.soundButton.setAttribute("aria-label", soundEnabled ? "Couper le son" : "Activer le son");
    bindEvents();
    try {
      world3d = createSnakeWorld({ canvas: elements.canvas, mapCanvas: elements.mapCanvas, gridSize: GRID_SIZE });
    } catch (error) {
      console.error(error);
      showOverlay({
        kicker: "3D INDISPONIBLE",
        title: "OUPS…",
        message: "Ton navigateur ne peut pas afficher la 3D (WebGL). Essaie avec Chrome, Safari ou Firefox à jour.",
        button: "RÉESSAYER",
        action: "reload",
      });
    }
    updateInterface();
    resizeCanvas();
    registerServiceWorker();

    if ("ResizeObserver" in window) {
      new ResizeObserver(resizeCanvas).observe(elements.boardFrame);
    }

    window.requestAnimationFrame(gameLoop);
  }

  // Mode test (ajouter ?debug à l'adresse) : accès à l'état du jeu dans la console.
  if (new URLSearchParams(window.location.search).has("debug")) {
    window.snakeMassi = {
      get game() {
        return game;
      },
      set game(value) {
        game = value;
      },
      createGame,
      stepGame,
      queueTurn,
      hideOverlay,
      updateInterface,
      getLevel,
    };
  }

  initialise();
})();
