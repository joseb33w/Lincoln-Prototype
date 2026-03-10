const allCards = [
  {
    id: 'knight',
    name: 'Knight',
    cost: 3,
    hp: 260,
    damage: 90,
    speed: 1.1,
    label: 'K',
    range: 10,
    attackRate: 0.9,
    projectile: false,
    abilityLabel: 'Shock stun',
    stunDuration: 0.9,
    description: 'Balanced melee fighter that briefly stuns enemies on hit.'
  },
  {
    id: 'archer',
    name: 'Archer',
    cost: 2,
    hp: 180,
    damage: 70,
    speed: 1.15,
    label: 'A',
    range: 28,
    attackRate: 1.05,
    projectile: true,
    projectileSpeed: 3.4,
    description: 'Fast ranged unit that fires glowing arrows from distance.',
    abilityLabel: 'True projectile shots'
  },
  {
    id: 'giant',
    name: 'Giant',
    cost: 5,
    hp: 520,
    damage: 140,
    speed: 0.7,
    label: 'G',
    range: 12,
    attackRate: 1.15,
    projectile: true,
    projectileSpeed: 2.6,
    splashRadius: 16,
    description: 'Slow tank that hurls splash blasts to crush clustered enemies.',
    abilityLabel: 'Splash blast'
  },
  {
    id: 'miniPekka',
    name: 'Mini Bot',
    cost: 4,
    hp: 240,
    damage: 180,
    speed: 1,
    label: 'M',
    range: 10,
    attackRate: 0.95,
    projectile: false,
    dashRange: 24,
    dashSpeed: 10,
    description: 'Heavy striker that dashes into close targets for burst pressure.',
    abilityLabel: 'Dash strike'
  }
];

const towerMax = {
  left: 1400,
  right: 1400,
  king: 2400
};

const defaultDeckOrder = ['knight', 'archer', 'giant', 'miniPekka'];
const tipRotation = [
  'Open with a low-cost card so you do not starve your elixir bar.',
  'If one enemy lane is heavier, pressure the opposite lane to split their attention.',
  'Giant is best when you already have lane control and enough elixir to support it.',
  'Mini Bot is strongest when it can dash into a damaged unit or tower.',
  'Archer is your safest answer when you need steady ranged pressure.'
];

const state = {
  timeLeft: 120,
  elixir: 5,
  maxElixir: 10,
  units: [],
  projectiles: [],
  nextUnitId: 1,
  nextProjectileId: 1,
  over: false,
  paused: true,
  soundEnabled: true,
  playerDeck: [...defaultDeckOrder],
  nextDeckIndex: 0,
  draggingCardId: null,
  selectedTouchCardId: null,
  selectedKeyboardCardIndex: null,
  playerTowers: { left: 1400, right: 1400, king: 2400 },
  enemyTowers: { left: 1400, right: 1400, king: 2400 },
  cardsPlayed: 0,
  enemyCardsPlayed: 0,
  lastOutcome: null,
  countdownActive: false,
  resultOpen: false,
  tipIndex: 0,
  bestSession: loadBestSession(),
  hoverLane: null
};

const arena = document.getElementById('arena');
const appRoot = document.getElementById('appRoot');
const cardsEl = document.getElementById('cards');
const battleLog = document.getElementById('battleLog');
const timerEl = document.getElementById('timer');
const elixirFill = document.getElementById('elixirFill');
const elixirText = document.getElementById('elixirText');
const restartBtn = document.getElementById('restartBtn');
const soundToggleBtn = document.getElementById('soundToggleBtn');
const statusPill = document.getElementById('statusPill');
const nextCardLabel = document.getElementById('nextCardLabel');
const selectedCardLabel = document.getElementById('selectedCardLabel');
const laneAdvice = document.getElementById('laneAdvice');
const bestSessionLabel = document.getElementById('bestSessionLabel');
const tipText = document.getElementById('tipText');
const countdownBanner = document.getElementById('countdownBanner');
const leftLanePressure = document.getElementById('leftLanePressure');
const rightLanePressure = document.getElementById('rightLanePressure');
const toastStack = document.getElementById('toastStack');
const startOverlay = document.getElementById('startOverlay');
const instructionsOverlay = document.getElementById('instructionsOverlay');
const pauseOverlay = document.getElementById('pauseOverlay');
const resultOverlay = document.getElementById('resultOverlay');
const startBattleBtn = document.getElementById('startBattleBtn');
const howToPlayBtn = document.getElementById('howToPlayBtn');
const closeInstructionsBtn = document.getElementById('closeInstructionsBtn');
const backFromInstructionsBtn = document.getElementById('backFromInstructionsBtn');
const playFromInstructionsBtn = document.getElementById('playFromInstructionsBtn');
const pauseBtn = document.getElementById('pauseBtn');
const tipsBtn = document.getElementById('tipsBtn');
const resumeBtn = document.getElementById('resumeBtn');
const restartFromPauseBtn = document.getElementById('restartFromPauseBtn');
const playAgainBtn = document.getElementById('playAgainBtn');
const closeResultsBtn = document.getElementById('closeResultsBtn');
const resultTitle = document.getElementById('resultTitle');
const resultSummary = document.getElementById('resultSummary');
const resultOutcome = document.getElementById('resultOutcome');
const resultPlayerHp = document.getElementById('resultPlayerHp');
const resultEnemyHp = document.getElementById('resultEnemyHp');
const resultCardsPlayed = document.getElementById('resultCardsPlayed');
const resultTime = document.getElementById('resultTime');
const bestResultText = document.getElementById('bestResultText');
const dropLanes = Array.from(document.querySelectorAll('.drop-lane'));
const quickTipChips = Array.from(document.querySelectorAll('.quick-tip-chip'));

let gameLoop = null;
let timerLoop = null;
let enemyLoop = null;
let audioCtx = null;

function init() {
  bindLaneDrops();
  bindUi();
  renderCards();
  updateHud();
  updateBestSessionUi();
  rotateTip();
  setStatus('Press Start Battle to begin');
  log('Welcome to Lincoln Prototype. Start the match when you are ready.');
  clearLoops();
}

function bindUi() {
  startBattleBtn.addEventListener('click', startBattleFlow);
  howToPlayBtn.addEventListener('click', openInstructions);
  closeInstructionsBtn.addEventListener('click', closeInstructions);
  backFromInstructionsBtn.addEventListener('click', closeInstructions);
  playFromInstructionsBtn.addEventListener('click', function () {
    closeInstructions();
    startBattleFlow();
  });
  instructionsOverlay.addEventListener('click', function (event) {
    if (event.target === instructionsOverlay) {
      closeInstructions();
    }
  });
  quickTipChips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      toast(chip.textContent, 'success');
    });
  });
  pauseBtn.addEventListener('click', togglePause);
  tipsBtn.addEventListener('click', function () {
    rotateTip(true);
    toast(tipText.textContent, 'success');
  });
  resumeBtn.addEventListener('click', resumeFromPause);
  restartFromPauseBtn.addEventListener('click', restartMatch);
  playAgainBtn.addEventListener('click', restartMatch);
  closeResultsBtn.addEventListener('click', function () {
    hideOverlay(resultOverlay);
  });
  restartBtn.addEventListener('click', restartMatch);
  soundToggleBtn.addEventListener('click', toggleSound);
  document.addEventListener('keydown', handleKeydown);
  arena.addEventListener('pointermove', handleArenaParallax);
  arena.addEventListener('pointerleave', resetArenaParallax);
}

function handleArenaParallax(event) {
  const rect = arena.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width - 0.5;
  const y = (event.clientY - rect.top) / rect.height - 0.5;
  arena.style.transform = 'rotateX(' + (10 - y * 8).toFixed(2) + 'deg) rotateY(' + (x * 8).toFixed(2) + 'deg)';
}

function resetArenaParallax() {
  arena.style.transform = 'rotateX(10deg) rotateY(0deg)';
}

function handleKeydown(event) {
  const key = event.key.toLowerCase();
  if (key === 'escape') {
    if (instructionsOverlay.classList.contains('active')) {
      closeInstructions();
      return;
    }
    if (resultOverlay.classList.contains('active')) {
      hideOverlay(resultOverlay);
      return;
    }
    if (pauseOverlay.classList.contains('active')) {
      resumeFromPause();
      return;
    }
  }
  if (key === 'p') {
    togglePause();
    return;
  }
  if (key === 'm') {
    toggleSound();
    return;
  }
  if (['1', '2', '3', '4'].includes(key)) {
    const index = Number(key) - 1;
    const card = getHandCards()[index];
    if (card) {
      state.selectedKeyboardCardIndex = index;
      toggleTouchSelection(card.id);
      toast(card.name + ' selected. Press L or R to deploy.', 'success');
    }
    return;
  }
  if (key === 'l' || key === 'r') {
    const lane = key === 'l' ? 'left' : 'right';
    if (state.selectedTouchCardId) {
      deployPlayer(state.selectedTouchCardId, lane);
    }
  }
}

function openInstructions() {
  rotateTip(true);
  hideOverlay(startOverlay);
  showOverlay(instructionsOverlay);
  setStatus('Reading instructions');
}

function closeInstructions() {
  hideOverlay(instructionsOverlay);
  showOverlay(startOverlay);
  setStatus('Press Start Battle to begin');
}

function startBattleFlow() {
  hideOverlay(instructionsOverlay);
  hideOverlay(startOverlay);
  resetState();
  renderCards();
  updateHud();
  clearArenaUnits();
  startCountdown();
}

function startCountdown() {
  state.paused = true;
  state.countdownActive = true;
  let count = 3;
  countdownBanner.textContent = String(count);
  countdownBanner.classList.add('visible');
  setStatus('Battle starts in 3');

  const countdownInterval = setInterval(function () {
    count -= 1;
    if (count > 0) {
      countdownBanner.textContent = String(count);
      setStatus('Battle starts in ' + count);
      playSound('tick');
      return;
    }

    if (count === 0) {
      countdownBanner.textContent = 'Fight!';
      setStatus('Fight!');
      playSound('deploy');
      return;
    }

    clearInterval(countdownInterval);
    countdownBanner.classList.remove('visible');
    state.countdownActive = false;
    state.paused = false;
    beginLoops();
    setStatus('Battle live');
    log('Match started. Drag a card into a lane or tap-select one on mobile, then tap a glowing lane.');
    toast('Battle started. Good luck.', 'success');
  }, 800);
}

function beginLoops() {
  clearLoops();
  gameLoop = setInterval(tick, 120);
  timerLoop = setInterval(stepTimer, 1000);
  enemyLoop = setInterval(enemyPlay, 2200);
}

function clearLoops() {
  [gameLoop, timerLoop, enemyLoop].forEach(function (loop) {
    if (loop) clearInterval(loop);
  });
}

function resetState() {
  state.timeLeft = 120;
  state.elixir = 5;
  state.units = [];
  state.projectiles = [];
  state.nextUnitId = 1;
  state.nextProjectileId = 1;
  state.over = false;
  state.paused = true;
  state.playerDeck = [...defaultDeckOrder];
  state.nextDeckIndex = 0;
  state.draggingCardId = null;
  state.selectedTouchCardId = null;
  state.selectedKeyboardCardIndex = null;
  state.playerTowers = { left: 1400, right: 1400, king: 2400 };
  state.enemyTowers = { left: 1400, right: 1400, king: 2400 };
  state.cardsPlayed = 0;
  state.enemyCardsPlayed = 0;
  state.lastOutcome = null;
  state.resultOpen = false;
  state.hoverLane = null;
  resetArenaParallax();
}

function bindLaneDrops() {
  dropLanes.forEach(function (laneEl) {
    laneEl.addEventListener('dragover', function (event) {
      event.preventDefault();
      laneEl.classList.add('drag-over');
      state.hoverLane = laneEl.dataset.lane;
    });
    laneEl.addEventListener('dragleave', function () {
      laneEl.classList.remove('drag-over');
      state.hoverLane = null;
    });
    laneEl.addEventListener('drop', function (event) {
      event.preventDefault();
      laneEl.classList.remove('drag-over');
      state.hoverLane = null;
      const cardId = event.dataTransfer.getData('text/plain') || state.draggingCardId;
      if (cardId) deployPlayer(cardId, laneEl.dataset.lane);
    });
    laneEl.addEventListener('click', function () {
      if (state.selectedTouchCardId) {
        deployPlayer(state.selectedTouchCardId, laneEl.dataset.lane);
      } else {
        toast('Select a card first, then tap a lane.', 'info');
      }
    });
    laneEl.addEventListener('pointerenter', function () {
      state.hoverLane = laneEl.dataset.lane;
      updateLaneAdvice();
    });
    laneEl.addEventListener('pointerleave', function () {
      state.hoverLane = null;
      updateLaneAdvice();
    });
  });
}

function updateLaneAdvice() {
  if (state.hoverLane) {
    laneAdvice.textContent = 'Deploying pressure to the ' + state.hoverLane + ' lane';
    return;
  }
  laneAdvice.textContent = 'Open the battle with either lane';
}

function renderCards() {
  if (!cardsEl) return;
  const hand = getHandCards();
  cardsEl.innerHTML = hand.map(function (card) {
    const selected = state.selectedTouchCardId === card.id ? ' selected' : '';
    return '<button class="card' + selected + '" data-card-id="' + card.id + '" draggable="true">'
      + '<strong>' + card.name + '</strong>'
      + '<span>Cost: ' + card.cost + '</span>'
      + '<span>' + card.description + '</span>'
      + '<span>Ability: ' + card.abilityLabel + '</span>'
      + '</button>';
  }).join('');

  Array.from(cardsEl.querySelectorAll('.card')).forEach(function (cardEl) {
    const cardId = cardEl.dataset.cardId;
    cardEl.addEventListener('click', function () {
      toggleTouchSelection(cardId);
    });
    cardEl.addEventListener('dragstart', function (event) {
      state.draggingCardId = cardId;
      event.dataTransfer.setData('text/plain', cardId);
    });
    cardEl.addEventListener('dragend', function () {
      state.draggingCardId = null;
      dropLanes.forEach(function (laneEl) {
        laneEl.classList.remove('drag-over');
      });
    });
  });
}

function getHandCards() {
  return defaultDeckOrder.map(function (id) {
    return allCards.find(function (card) { return card.id === id; });
  });
}

function toggleTouchSelection(cardId) {
  state.selectedTouchCardId = state.selectedTouchCardId === cardId ? null : cardId;
  const selectedCard = allCards.find(function (card) { return card.id === state.selectedTouchCardId; });
  selectedCardLabel.textContent = selectedCard ? selectedCard.name : 'None';
  renderCards();
}

function deployPlayer(cardId, lane) {
  const card = allCards.find(function (item) { return item.id === cardId; });
  if (!card) return;
  if (state.elixir < card.cost) {
    toast('Not enough elixir for ' + card.name + '.', 'error');
    return;
  }
  state.elixir -= card.cost;
  state.cardsPlayed += 1;
  state.selectedTouchCardId = null;
  selectedCardLabel.textContent = 'None';
  laneAdvice.textContent = 'Pressure sent to the ' + lane + ' lane';
  playSound('deploy');
  renderCards();
  updateHud();
  log('You deployed ' + card.name + ' into the ' + lane + ' lane.');
}

function enemyPlay() {}
function tick() {}
function stepTimer() {}
function clearArenaUnits() {}
function updateHud() {
  if (elixirFill) {
    elixirFill.style.width = (state.elixir / state.maxElixir * 100) + '%';
  }
  if (elixirText) {
    elixirText.textContent = state.elixir + ' / ' + state.maxElixir;
  }
  updateLaneAdvice();
}
function updateBestSessionUi() {
  if (bestSessionLabel) {
    bestSessionLabel.textContent = state.bestSession || 'No record yet';
  }
}
function rotateTip(force) {
  state.tipIndex = force ? (state.tipIndex + 1) % tipRotation.length : state.tipIndex;
  if (tipText) tipText.textContent = tipRotation[state.tipIndex];
}
function setStatus(text) {
  if (statusPill) statusPill.textContent = text;
}
function log(text) {
  if (battleLog) {
    battleLog.innerHTML = '<p>' + text + '</p>' + battleLog.innerHTML;
  }
}
function toast(text, type) {
  if (!toastStack) return;
  const el = document.createElement('div');
  el.className = 'toast ' + (type || 'info');
  el.textContent = text;
  toastStack.appendChild(el);
  setTimeout(function () {
    el.remove();
  }, 2200);
}
function togglePause() {
  if (state.over || state.countdownActive) return;
  if (pauseOverlay.classList.contains('active')) {
    resumeFromPause();
    return;
  }
  showOverlay(pauseOverlay);
}
function resumeFromPause() {
  hideOverlay(pauseOverlay);
}
function restartMatch() {
  hideOverlay(pauseOverlay);
  hideOverlay(resultOverlay);
  startBattleFlow();
}
function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  if (soundToggleBtn) soundToggleBtn.textContent = 'Sound: ' + (state.soundEnabled ? 'On' : 'Off');
}
function playSound() {}
function showOverlay(overlay) {
  if (!overlay) return;
  overlay.classList.add('active');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.classList.add('overlay-open');
  appRoot.classList.add('dimmed');
}
function hideOverlay(overlay) {
  if (!overlay) return;
  overlay.classList.remove('active');
  overlay.setAttribute('aria-hidden', 'true');
  const anyOpen = [startOverlay, instructionsOverlay, pauseOverlay, resultOverlay].some(function (item) {
    return item.classList.contains('active');
  });
  if (!anyOpen) {
    document.body.classList.remove('overlay-open');
    appRoot.classList.remove('dimmed');
  }
}
function loadBestSession() {
  try {
    return localStorage.getItem('lincolnBestSession') || '';
  } catch (error) {
    return '';
  }
}

init();
