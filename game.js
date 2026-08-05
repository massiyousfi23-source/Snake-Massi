(() => {
  "use strict";

  const GRID_SIZE = 20;
  const START_SPEED = 165;
  const MIN_SPEED = 72;
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

  const KEY_DIRECTIONS = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    z: "up",
    Z: "up",
    w: "up",
    W: "up",
    s: "down",
    S: "down",
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
    modeWarning: document.querySelector("#modeWarning"),
    toast: document.querySelector("#toast"),
    directionButtons: [...document.querySelectorAll("[data-direction]")],
  };

  const context = elements.canvas.getContext("2d");
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
  let particles = [];

  function createGame(mode = "idle") {
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
      score: 0,
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
    if (score >= 20) return "pucci";
    if (score >= 10) return "kichta";
    return "classic";
  }

  function getSpeed() {
    const levelBoost = getLevel() === "pucci" ? 8 : 0;
    return Math.max(MIN_SPEED, START_SPEED - game.score * 3 - levelBoost);
  }

  function startNewGame() {
    particles = [];
    game = createGame("playing");
    lastStepAt = performance.now();
    hideOverlay();
    updateInterface();
    focusBoard();
    playTone("start");
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
      message: `Score final : ${formatScore(game.score)}. Encore une partie pour aller plus loin.`,
      button: "RÉESSAYER",
      action: "restart",
      share: true,
    });
  }

  function activateMilestone(score) {
    game.mode = "milestone";
    game.directionQueue = [];
    const isPucci = score === 20;

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

    game.snake.unshift(newHead);

    if (!ateFood) {
      game.snake.pop();
      return;
    }

    const eatenFood = game.food;
    game.score += 1;
    game.food = createFood(game.snake);
    spawnParticles(eatenFood);
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

    if (game.score === 10 || game.score === 20) activateMilestone(game.score);
  }

  function updateBestScore() {
    if (game.score <= bestScore) return;
    bestScore = game.score;
    writeStoredValue(STORAGE_KEYS.best, bestScore);
  }

  function queueDirection(requestedDirection) {
    if (game.mode !== "playing" || !DIRECTIONS[requestedDirection]) return;

    const level = getLevel();
    const actualDirection = level === "pucci" ? OPPOSITE[requestedDirection] : requestedDirection;
    const lastQueued = game.directionQueue.at(-1) ?? game.direction;

    if (actualDirection === lastQueued || actualDirection === OPPOSITE[lastQueued]) return;
    if (game.directionQueue.length >= 2) return;

    game.directionQueue.push(actualDirection);
    vibrate(7);
  }

  function updateInterface() {
    const level = getLevel();
    const levelNames = { classic: "CLASSIQUE", kichta: "KICHTA", pucci: "PUCCI" };
    const statusNames = {
      idle: "PRÊT",
      playing: "EN JEU",
      paused: "EN PAUSE",
      milestone: "NIVEAU DÉBLOQUÉ",
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
    elements.trackProgress.style.width = `${Math.min(100, (game.score / 20) * 100)}%`;
    elements.modeWarning.hidden = !(level === "pucci" && game.mode === "playing");

    const stages = [elements.stageClassic, elements.stageKichta, elements.stagePucci];
    const activeIndex = level === "classic" ? 0 : level === "kichta" ? 1 : 2;
    stages.forEach((stage, index) => {
      stage.classList.toggle("is-active", index === activeIndex);
      stage.classList.toggle("is-complete", index < activeIndex);
    });
  }

  function showOverlay({ kicker, title, message, button, action, share = false }) {
    overlayAction = action;
    elements.overlayKicker.textContent = kicker;
    elements.overlayTitle.innerHTML = title;
    elements.overlayMessage.textContent = message;
    elements.primaryActionLabel.textContent = button;
    elements.shareButton.hidden = !share;
    elements.overlay.classList.remove("is-hidden");
  }

  function hideOverlay() {
    elements.overlay.classList.add("is-hidden");
    elements.shareButton.hidden = true;
  }

  function handlePrimaryAction() {
    ensureAudioContext();
    if (overlayAction === "resume" || overlayAction === "continue") resumeGame();
    else startNewGame();
  }

  function formatScore(score) {
    return String(score).padStart(3, "0");
  }

  function focusBoard() {
    window.setTimeout(() => elements.canvas.focus({ preventScroll: true }), 30);
  }

  function resizeCanvas() {
    const bounds = elements.canvas.getBoundingClientRect();
    const nextSize = Math.max(1, Math.floor(bounds.width));
    const nextRatio = Math.min(window.devicePixelRatio || 1, 2.5);

    boardSize = nextSize;
    pixelRatio = nextRatio;
    elements.canvas.width = Math.round(boardSize * pixelRatio);
    elements.canvas.height = Math.round(boardSize * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    draw(performance.now());
  }

  function gameLoop(timestamp) {
    if (game.mode === "playing" && timestamp - lastStepAt >= getSpeed()) {
      stepGame();
      lastStepAt = timestamp;
    }

    draw(timestamp);
    window.requestAnimationFrame(gameLoop);
  }

  function draw(timestamp) {
    const cell = boardSize / GRID_SIZE;
    const level = getLevel();
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, boardSize, boardSize);

    drawBoard(level, cell);
    if (game.food) drawFood(game.food, cell, timestamp, level);
    drawSnake(cell, timestamp, level);
    drawParticles(cell, timestamp);
  }

  function drawBoard(level, cell) {
    const gradient = context.createRadialGradient(
      boardSize * 0.5,
      boardSize * 0.42,
      boardSize * 0.08,
      boardSize * 0.5,
      boardSize * 0.5,
      boardSize * 0.78,
    );

    if (level === "pucci") {
      gradient.addColorStop(0, "#190a17");
      gradient.addColorStop(1, "#070407");
    } else if (level === "kichta") {
      gradient.addColorStop(0, "#151a16");
      gradient.addColorStop(1, "#060806");
    } else {
      gradient.addColorStop(0, "#0b1b10");
      gradient.addColorStop(1, "#050a07");
    }

    context.fillStyle = gradient;
    context.fillRect(0, 0, boardSize, boardSize);
    context.beginPath();
    context.strokeStyle = level === "pucci" ? "rgba(255, 102, 196, 0.065)" : "rgba(190, 255, 199, 0.055)";
    context.lineWidth = Math.max(0.5, 1 / pixelRatio);

    for (let index = 1; index < GRID_SIZE; index += 1) {
      const position = Math.round(index * cell) + 0.5;
      context.moveTo(position, 0);
      context.lineTo(position, boardSize);
      context.moveTo(0, position);
      context.lineTo(boardSize, position);
    }
    context.stroke();
  }

  function drawFood(food, cell, timestamp, level) {
    const pulse = 1 + Math.sin(timestamp / 170) * 0.08;
    const centerX = (food.x + 0.5) * cell;
    const centerY = (food.y + 0.53) * cell;
    const radius = cell * 0.28 * pulse;
    const foodColor = level === "pucci" ? "#ff63c7" : "#ff5b67";

    context.save();
    context.shadowColor = foodColor;
    context.shadowBlur = cell * 0.65;
    context.fillStyle = foodColor;
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.fill();

    context.shadowBlur = 0;
    context.strokeStyle = "#baff76";
    context.lineWidth = Math.max(1.5, cell * 0.08);
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(centerX + cell * 0.02, centerY - radius * 0.75);
    context.quadraticCurveTo(centerX + cell * 0.1, centerY - cell * 0.48, centerX + cell * 0.28, centerY - cell * 0.35);
    context.stroke();
    context.restore();
  }

  function drawSnake(cell, timestamp, level) {
    for (let index = game.snake.length - 1; index >= 0; index -= 1) {
      const segment = game.snake[index];
      const isHead = index === 0;
      const inset = cell * (isHead ? 0.09 : 0.13);
      const x = segment.x * cell + inset;
      const y = segment.y * cell + inset;
      const size = cell - inset * 2;
      const color = snakeColor(index, timestamp, level);

      context.save();
      context.fillStyle = color;
      context.shadowColor = color;
      context.shadowBlur = isHead ? cell * 0.6 : cell * 0.18;
      roundedRectangle(x, y, size, size, cell * (isHead ? 0.28 : 0.22));
      context.fill();

      if (isHead) drawEyes(x, y, size, cell, level);
      context.restore();
    }
  }

  function snakeColor(index, timestamp, level) {
    if (level === "pucci") {
      const hue = (timestamp / 18 + index * 24) % 360;
      return `hsl(${hue} 94% 65%)`;
    }

    if (level === "kichta") {
      const lightness = Math.max(42, 92 - index * 2.6);
      return `hsl(130 6% ${lightness}%)`;
    }

    const lightness = Math.max(42, 69 - index * 1.15);
    return `hsl(${118 + Math.min(index, 16)} 88% ${lightness}%)`;
  }

  function drawEyes(x, y, size, cell, level) {
    const eyeRadius = Math.max(1.2, cell * 0.07);
    const near = 0.3;
    const far = 0.7;
    let eyes;

    if (game.direction === "up") eyes = [[near, 0.28], [far, 0.28]];
    else if (game.direction === "down") eyes = [[near, 0.72], [far, 0.72]];
    else if (game.direction === "left") eyes = [[0.28, near], [0.28, far]];
    else eyes = [[0.72, near], [0.72, far]];

    context.shadowBlur = 0;
    context.fillStyle = level === "kichta" ? "#070a08" : "#051007";
    for (const [positionX, positionY] of eyes) {
      context.beginPath();
      context.arc(x + size * positionX, y + size * positionY, eyeRadius, 0, Math.PI * 2);
      context.fill();
    }
  }

  function roundedRectangle(x, y, width, height, radius) {
    const safeRadius = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + safeRadius, y);
    context.arcTo(x + width, y, x + width, y + height, safeRadius);
    context.arcTo(x + width, y + height, x, y + height, safeRadius);
    context.arcTo(x, y + height, x, y, safeRadius);
    context.arcTo(x, y, x + width, y, safeRadius);
    context.closePath();
  }

  function spawnParticles(point) {
    const color = getLevel() === "pucci" ? "#ff6cc9" : "#ff6571";
    for (let index = 0; index < 12; index += 1) {
      const angle = (Math.PI * 2 * index) / 12 + Math.random() * 0.25;
      const speed = 1.2 + Math.random() * 1.4;
      particles.push({
        x: point.x + 0.5,
        y: point.y + 0.5,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        bornAt: performance.now(),
        color,
      });
    }
  }

  function drawParticles(cell, timestamp) {
    particles = particles.filter((particle) => timestamp - particle.bornAt < 520);

    for (const particle of particles) {
      const age = (timestamp - particle.bornAt) / 1000;
      const opacity = Math.max(0, 1 - age / 0.52);
      const x = (particle.x + particle.velocityX * age) * cell;
      const y = (particle.y + particle.velocityY * age) * cell;

      context.save();
      context.globalAlpha = opacity;
      context.fillStyle = particle.color;
      context.shadowColor = particle.color;
      context.shadowBlur = cell * 0.28;
      context.beginPath();
      context.arc(x, y, Math.max(1.2, cell * 0.07 * opacity), 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
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
    const direction = KEY_DIRECTIONS[event.key];
    if (direction) {
      event.preventDefault();
      queueDirection(direction);
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
    elements.boardFrame.setPointerCapture?.(event.pointerId);
  }

  function handlePointerUp(event) {
    if (!pointerStart || pointerStart.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - pointerStart.x;
    const deltaY = event.clientY - pointerStart.y;
    pointerStart = null;

    if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 18) return;
    if (Math.abs(deltaX) > Math.abs(deltaY)) queueDirection(deltaX > 0 ? "right" : "left");
    else queueDirection(deltaY > 0 ? "down" : "up");
  }

  function bindEvents() {
    elements.primaryAction.addEventListener("click", handlePrimaryAction);
    elements.shareButton.addEventListener("click", shareScore);
    elements.pauseButton.addEventListener("click", togglePause);
    elements.soundButton.addEventListener("click", toggleSound);
    elements.helpButton.addEventListener("click", openHelp);
    elements.closeHelpButton.addEventListener("click", closeHelp);
    elements.dialogPlayButton.addEventListener("click", handleDialogPlay);
    elements.helpDialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeHelp();
    });

    elements.directionButtons.forEach((button) => {
      button.addEventListener("click", () => queueDirection(button.dataset.direction));
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
      navigator.serviceWorker.register("./sw.js").catch(() => {
        // Le mode hors ligne est optionnel et ne bloque jamais le jeu.
      });
    });
  }

  function initialise() {
    elements.soundButton.setAttribute("aria-pressed", String(soundEnabled));
    elements.soundButton.setAttribute("aria-label", soundEnabled ? "Couper le son" : "Activer le son");
    bindEvents();
    updateInterface();
    resizeCanvas();
    registerServiceWorker();

    if ("ResizeObserver" in window) {
      new ResizeObserver(resizeCanvas).observe(elements.boardFrame);
    }

    window.requestAnimationFrame(gameLoop);
  }

  initialise();
})();
