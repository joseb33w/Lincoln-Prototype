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
  hoverLane: null,
  lastClashText: 'Waiting',
  combatTempo: 'Normal Pulse'
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
const selectedCardLabel = document.getElementById('selectedCardLabel');
const laneAdvice = document.getElementById('laneAdvice');
const bestSessionLabel = document.getElementById('bestSessionLabel');
const tipText = document.getElementById('tipText');
const countdownBanner = document.getElementById('countdownBanner');
const leftLanePressure = document.getElementById('leftLanePressure');
const rightLanePressure = document.getElementById('rightLanePressure');
const toastStack = document.getElementById('toastStack');
const startOverlay = document.getElementById('startOverlay');
const pauseOverlay = document.getElementById('pauseOverlay');
const resultOverlay = document.getElementById('resultOverlay');
const startBattleBtn = document.getElementById('startBattleBtn');
const pauseBtn = document.getElementById('pauseBtn');
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
const cameraModeLabel = document.getElementById('cameraModeLabel');
const tempoLabel = document.getElementById('tempoLabel');
const lastClashLabel = document.getElementById('lastClashLabel');
const dropLanes = Array.from(document.querySelectorAll('.drop-lane'));

let gameLoop = null;
let timerLoop = null;
let enemyLoop = null;
let audioCtx = null;
let tipInterval = null;
let cameraResetTimeout = null;

function init() {
  bindLaneDrops();
  bindUi();
  renderCards();
  updateHud();
  updateBestSessionUi();
  updateInteractionHud();
  rotateTip();
  setStatus('Press Start Battle to begin');
  log('Welcome to Lincoln Prototype. Start the match when you are ready.');
  clearLoops();
  startTipLoop();
}

function bindUi() {
  startBattleBtn.addEventListener('click', startBattleFlow);
  pauseBtn.addEventListener('click', togglePause);
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

function startTipLoop() {
  if (tipInterval) {
    clearInterval(tipInterval);
  }
  tipInterval = setInterval(function () {
    if (!state.paused && !state.over) {
      rotateTip();
    }
  }, 5000);
}

function handleArenaParallax(event) {
  const rect = arena.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width - 0.5;
  const y = (event.clientY - rect.top) / rect.height - 0.5;
  const rotateX = 12 - y * 10;
  const rotateY = x * 10;
  const scale = 1.01 + Math.abs(x) * 0.02;
  arena.style.transform = 'rotateX(' + rotateX.toFixed(2) + 'deg) rotateY(' + rotateY.toFixed(2) + 'deg) scale(' + scale.toFixed(3) + ')';
  cameraModeLabel.textContent = 'Tracking ' + (x < 0 ? 'Left' : 'Right') + ' Flank';
}

function resetArenaParallax() {
  arena.style.transform = 'rotateX(12deg) rotateY(0deg) scale(1)';
  if (!state.over) {
    cameraModeLabel.textContent = state.paused ? 'Standby View' : 'Tracking Cursor';
  }
}

function handleKeydown(event) {
  const key = event.key.toLowerCase();
  if (key === 'escape') {
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

function startBattleFlow() {
  hideOverlay(startOverlay);
  resetState();
  renderCards();
  updateHud();
  clearArenaUnits();
  cameraModeLabel.textContent = 'Standby View';
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
      pulseArena('Fight ignition');
      return;
    }

    clearInterval(countdownInterval);
    countdownBanner.classList.remove('visible');
    state.countdownActive = false;
    state.paused = false;
    beginLoops();
    setStatus('Battle live');
    cameraModeLabel.textContent = 'Tracking Cursor';
    log('Match started. Drag a card into a lane or tap-select one on mobile, then tap a glowing lane.');
    toast('Battle started. Good luck.', 'success');
  }, 700);
}

function togglePause() {
  if (state.over || state.countdownActive) {
    return;
  }
  if (state.paused) {
    resumeFromPause();
  } else {
    state.paused = true;
    cameraModeLabel.textContent = 'Standby View';
    showOverlay(pauseOverlay);
    setStatus('Match paused');
  }
}

function resumeFromPause() {
  if (state.over) {
    return;
  }
  hideOverlay(pauseOverlay);
  state.paused = false;
  cameraModeLabel.textContent = 'Tracking Cursor';
  setStatus('Battle live');
}

function restartMatch() {
  hideOverlay(pauseOverlay);
  hideOverlay(resultOverlay);
  showOverlay(startOverlay);
  resetState();
  clearArenaUnits();
  renderCards();
  updateHud();
  updateInteractionHud();
  setStatus('Press Start Battle to begin');
  log('Match reset. Start again when ready.');
}

function resetState() {
  clearLoops();
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
  state.countdownActive = false;
  state.resultOpen = false;
  state.hoverLane = null;
  state.lastClashText = 'Waiting';
  state.combatTempo = 'Normal Pulse';
}

function beginLoops() {
  clearLoops();
  gameLoop = setInterval(updateGame, 1000 / 30);
  timerLoop = setInterval(function () {
    if (state.paused || state.over) {
      return;
    }
    state.timeLeft -= 1;
    updateHud();
    if (state.timeLeft <= 0) {
      finishMatch();
    }
  }, 1000);
  enemyLoop = setInterval(function () {
    if (state.paused || state.over) {
      return;
    }
    enemyDeploy();
  }, 1800);
}

function clearLoops() {
  clearInterval(gameLoop);
  clearInterval(timerLoop);
  clearInterval(enemyLoop);
}

function bindLaneDrops() {
  dropLanes.forEach(function (laneEl) {
    laneEl.addEventListener('dragover', function (event) {
      event.preventDefault();
      laneEl.classList.add('drag-over');
    });
    laneEl.addEventListener('dragleave', function () {
      laneEl.classList.remove('drag-over');
    });
    laneEl.addEventListener('drop', function (event) {
      event.preventDefault();
      laneEl.classList.remove('drag-over');
      if (!state.draggingCardId) {
        return;
      }
      deployPlayer(state.draggingCardId, laneEl.dataset.lane);
    });
    laneEl.addEventListener('click', function () {
      if (state.selectedTouchCardId) {
        deployPlayer(state.selectedTouchCardId, laneEl.dataset.lane);
      }
    });
  });
}

function getHandCards() {
  return state.playerDeck.map(function (cardId) {
    return allCards.find(function (card) {
      return card.id === cardId;
    });
  });
}

function renderCards() {
  cardsEl.innerHTML = '';
  getHandCards().forEach(function (card, index) {
    const cardEl = document.createElement('button');
    cardEl.className = 'card';
    cardEl.type = 'button';
    cardEl.draggable = true;
    cardEl.dataset.cardId = card.id;
    if (state.selectedTouchCardId === card.id) {
      cardEl.classList.add('selected');
    }
    cardEl.innerHTML = [
      '<div class="card-header"><strong>' + card.name + '</strong><span class="card-cost">' + card.cost + '</span></div>',
      '<div class="card-meta"><span class="card-badge">' + card.label + '</span><span>' + card.abilityLabel + '</span></div>',
      '<p>' + card.description + '</p>',
      '<div class="card-footer"><span>HP ' + card.hp + '</span><span>DMG ' + card.damage + '</span></div>'
    ].join('');

    cardEl.addEventListener('dragstart', function () {
      if (state.paused || state.over) {
        return;
      }
      state.draggingCardId = card.id;
      highlightRecommendedLane(card.id);
    });

    cardEl.addEventListener('dragend', function () {
      state.draggingCardId = null;
      clearLaneHighlights();
    });

    cardEl.addEventListener('click', function () {
      toggleTouchSelection(card.id);
      state.selectedKeyboardCardIndex = index;
    });

    cardsEl.appendChild(cardEl);
  });
}

function toggleTouchSelection(cardId) {
  if (state.selectedTouchCardId === cardId) {
    state.selectedTouchCardId = null;
    clearLaneHighlights();
  } else {
    state.selectedTouchCardId = cardId;
    highlightRecommendedLane(cardId);
  }
  updateSelectedCardLabel();
  renderCards();
}

function updateSelectedCardLabel() {
  if (!state.selectedTouchCardId) {
    selectedCardLabel.textContent = 'None';
    return;
  }
  const card = allCards.find(function (item) {
    return item.id === state.selectedTouchCardId;
  });
  selectedCardLabel.textContent = card ? card.name : 'None';
}

function highlightRecommendedLane(cardId) {
  clearLaneHighlights();
  const recommendedLane = recommendLane(cardId);
  const laneEl = dropLanes.find(function (item) {
    return item.dataset.lane === recommendedLane;
  });
  if (laneEl) {
    laneEl.classList.add('recommended', 'touch-target');
  }
  laneAdvice.textContent = recommendedLane === 'left' ? 'Enemy left lane is softer right now' : 'Enemy right lane is softer right now';
}

function clearLaneHighlights() {
  dropLanes.forEach(function (laneEl) {
    laneEl.classList.remove('recommended', 'touch-target', 'drag-over');
  });
  laneAdvice.textContent = 'Open the battle with either lane';
}

function recommendLane() {
  const leftPressure = state.enemyTowers.left - state.playerTowers.left;
  const rightPressure = state.enemyTowers.right - state.playerTowers.right;
  return leftPressure <= rightPressure ? 'left' : 'right';
}

function deployPlayer(cardId, lane) {
  if (state.paused || state.over) {
    return;
  }
  const card = allCards.find(function (item) {
    return item.id === cardId;
  });
  if (!card) {
    return;
  }
  if (state.elixir < card.cost) {
    toast('Not enough elixir for ' + card.name, 'warning');
    return;
  }
  state.elixir -= card.cost;
  state.cardsPlayed += 1;
  spawnUnit(card, 'player', lane);
  rotateDeck(cardId);
  state.selectedTouchCardId = null;
  state.draggingCardId = null;
  updateSelectedCardLabel();
  renderCards();
  clearLaneHighlights();
  updateHud();
  const laneTitle = lane === 'left' ? 'left lane' : 'right lane';
  log('You deployed ' + card.name + ' into the ' + laneTitle + '.');
  toast(card.name + ' deployed to ' + laneTitle + '.', 'success');
  pulseArena('Player drop in ' + laneTitle);
  playSound('deploy');
}

function enemyDeploy() {
  const affordableCards = allCards.filter(function (card) {
    return card.cost <= Math.min(state.maxElixir, 7);
  });
  const card = affordableCards[Math.floor(Math.random() * affordableCards.length)];
  const lane = Math.random() > 0.5 ? 'left' : 'right';
  state.enemyCardsPlayed += 1;
  spawnUnit(card, 'enemy', lane);
  log('Enemy deployed ' + card.name + ' into the ' + lane + ' lane.');
  pulseArena('Enemy push on ' + lane);
}

function rotateDeck(cardId) {
  const currentIndex = state.playerDeck.indexOf(cardId);
  if (currentIndex === -1) {
    return;
  }
  state.playerDeck.splice(currentIndex, 1);
  state.nextDeckIndex = (state.nextDeckIndex + 1) % defaultDeckOrder.length;
  state.playerDeck.push(defaultDeckOrder[state.nextDeckIndex]);
}

function spawnUnit(card, side, lane) {
  const laneEl = document.querySelector('.' + lane + '-lane');
  if (!laneEl) {
    return;
  }
  const unitEl = document.createElement('div');
  unitEl.className = 'unit ' + side + ' spawn-flare';
  unitEl.innerHTML = '<span class="unit-label">' + card.label + '</span>';
  laneEl.appendChild(unitEl);

  const unit = {
    id: state.nextUnitId++,
    cardId: card.id,
    name: card.name,
    side: side,
    lane: lane,
    hp: card.hp,
    maxHp: card.hp,
    damage: card.damage,
    speed: card.speed,
    range: card.range,
    attackRate: card.attackRate,
    projectile: card.projectile,
    projectileSpeed: card.projectileSpeed || 0,
    splashRadius: card.splashRadius || 0,
    dashRange: card.dashRange || 0,
    dashSpeed: card.dashSpeed || 0,
    stunDuration: card.stunDuration || 0,
    x: 50,
    y: side === 'player' ? 82 : 18,
    targetId: null,
    attackCooldown: 0,
    stunTimer: 0,
    el: unitEl
  };

  state.units.push(unit);
  updateUnitPosition(unit);
}

function updateGame() {
  if (state.paused || state.over) {
    return;
  }

  state.elixir = Math.min(state.maxElixir, state.elixir + 0.015);
  updateHud();
  updateLanePressure();
  updateCombatTempo();

  state.units.forEach(function (unit) {
    if (unit.stunTimer > 0) {
      unit.stunTimer -= 1 / 30;
      return;
    }

    if (unit.attackCooldown > 0) {
      unit.attackCooldown -= 1 / 30;
    }

    const target = findTarget(unit);
    if (target) {
      const distance = Math.abs(unit.y - target.y);
      if (distance <= unit.range) {
        attackTarget(unit, target);
      } else {
        moveUnitToward(unit, target.y);
      }
    } else {
      advanceUnit(unit);
    }

    updateUnitPosition(unit);
  });

  updateProjectiles();
  cleanupUnits();
  checkWinCondition();
}

function moveUnitToward(unit, targetY) {
  const direction = unit.side === 'player' ? -1 : 1;
  let step = unit.speed * 0.55;
  const distance = Math.abs(unit.y - targetY);
  if (unit.dashRange && distance <= unit.dashRange && unit.attackCooldown <= 0) {
    step = unit.dashSpeed * 0.22;
    unit.el.classList.add('dashing');
  } else {
    unit.el.classList.remove('dashing');
  }
  unit.y += direction * step;
}

function advanceUnit(unit) {
  unit.el.classList.remove('dashing');
  const direction = unit.side === 'player' ? -1 : 1;
  unit.y += direction * unit.speed * 0.4;
  const towerTarget = getTowerTarget(unit.side === 'player' ? 'enemy' : 'player', unit.lane);
  if ((unit.side === 'player' && unit.y <= 16) || (unit.side === 'enemy' && unit.y >= 84)) {
    damageTower(towerTarget.side, towerTarget.key, unit.damage);
    unit.hp = 0;
    createImpact(unit.el.parentElement, 50, unit.side === 'player' ? 16 : 84, unit.side);
    registerClash(unit.name + ' crashed into ' + towerTarget.key + ' tower');
  }
}

function findTarget(unit) {
  const enemies = state.units.filter(function (other) {
    return other.side !== unit.side && other.lane === unit.lane && other.hp > 0;
  });
  if (!enemies.length) {
    return null;
  }
  enemies.sort(function (a, b) {
    return Math.abs(unit.y - a.y) - Math.abs(unit.y - b.y);
  });
  return enemies[0];
}

function attackTarget(unit, target) {
  if (unit.attackCooldown > 0) {
    return;
  }
  unit.attackCooldown = unit.attackRate;
  unit.el.classList.add('attacking');
  setTimeout(function () {
    unit.el.classList.remove('attacking');
  }, 120);

  if (unit.projectile) {
    spawnProjectile(unit, target);
  } else {
    applyDamage(unit, target, unit.damage);
  }

  if (unit.stunDuration) {
    target.stunTimer = Math.max(target.stunTimer, unit.stunDuration);
  }

  registerClash(unit.name + ' hit ' + target.name + ' in ' + unit.lane + ' lane');
  pulseArena(unit.name + ' attack');
  playSound('hit');
}

function spawnProjectile(unit, target) {
  const projectileEl = document.createElement('div');
  projectileEl.className = 'projectile ' + (unit.side === 'enemy' ? 'enemy' : '');
  unit.el.parentElement.appendChild(projectileEl);
  const projectile = {
    id: state.nextProjectileId++,
    side: unit.side,
    lane: unit.lane,
    damage: unit.damage,
    splashRadius: unit.splashRadius,
    speed: unit.projectileSpeed || 3,
    x: unit.x,
    y: unit.y,
    targetId: target.id,
    el: projectileEl
  };
  state.projectiles.push(projectile);
  updateProjectilePosition(projectile);
}

function updateProjectiles() {
  state.projectiles.forEach(function (projectile) {
    const target = state.units.find(function (unit) {
      return unit.id === projectile.targetId && unit.hp > 0;
    });
    if (!target) {
      projectile.done = true;
      return;
    }
    const dy = target.y - projectile.y;
    const step = Math.sign(dy) * Math.min(Math.abs(dy), projectile.speed);
    projectile.y += step;
    updateProjectilePosition(projectile);
    if (Math.abs(dy) <= projectile.speed) {
      applyDamage({ splashRadius: projectile.splashRadius, side: projectile.side }, target, projectile.damage);
      createImpact(projectile.el.parentElement, target.x, target.y, projectile.side);
      projectile.done = true;
    }
  });

  state.projectiles = state.projectiles.filter(function (projectile) {
    if (projectile.done) {
      projectile.el.remove();
      return false;
    }
    return true;
  });
}

function applyDamage(source, target, damage) {
  target.hp -= damage;
  target.el.classList.add('hit-flash');
  setTimeout(function () {
    target.el.classList.remove('hit-flash');
  }, 220);
  createImpact(target.el.parentElement, target.x, target.y, source.side);
  if (source.splashRadius) {
    state.units.forEach(function (unit) {
      if (unit.side === target.side && unit.id !== target.id && unit.lane === target.lane && Math.abs(unit.y - target.y) <= source.splashRadius) {
        unit.hp -= Math.round(damage * 0.45);
        unit.el.classList.add('hit-flash');
        setTimeout(function () {
          unit.el.classList.remove('hit-flash');
        }, 220);
      }
    });
  }
}

function cleanupUnits() {
  state.units = state.units.filter(function (unit) {
    if (unit.hp <= 0) {
      unit.el.remove();
      return false;
    }
    return true;
  });
}

function updateUnitPosition(unit) {
  unit.el.style.left = unit.x + '%';
  unit.el.style.top = unit.y + '%';
}

function updateProjectilePosition(projectile) {
  projectile.el.style.left = projectile.x + '%';
  projectile.el.style.top = projectile.y + '%';
}

function createImpact(parent, x, y, side) {
  if (!parent) {
    return;
  }
  const ring = document.createElement('div');
  ring.className = 'impact-ring ' + (side === 'enemy' ? 'enemy' : '');
  ring.style.left = x + '%';
  ring.style.top = y + '%';
  parent.appendChild(ring);
  setTimeout(function () {
    ring.remove();
  }, 450);
}

function damageTower(side, key, amount) {
  const towerSet = side === 'player' ? state.playerTowers : state.enemyTowers;
  towerSet[key] = Math.max(0, towerSet[key] - amount);
  updateHud();
  pulseArena((side === 'player' ? 'Player' : 'Enemy') + ' ' + key + ' tower hit');
}

function getTowerTarget(side, lane) {
  return { side: side, key: lane };
}

function updateHud() {
  timerEl.textContent = formatTime(state.timeLeft);
  elixirFill.style.width = (state.elixir / state.maxElixir * 100) + '%';
  elixirText.textContent = Math.floor(state.elixir * 10) / 10 + ' / ' + state.maxElixir;
  updateHealthBar('playerLeft', state.playerTowers.left, towerMax.left);
  updateHealthBar('playerRight', state.playerTowers.right, towerMax.right);
  updateHealthBar('playerKing', state.playerTowers.king, towerMax.king);
  updateHealthBar('enemyLeft', state.enemyTowers.left, towerMax.left);
  updateHealthBar('enemyRight', state.enemyTowers.right, towerMax.right);
  updateHealthBar('enemyKing', state.enemyTowers.king, towerMax.king);
}

function updateHealthBar(prefix, value, max) {
  const fill = document.getElementById(prefix + 'Hp');
  const text = document.getElementById(prefix + 'Text');
  fill.style.width = Math.max(0, value / max * 100) + '%';
  text.textContent = Math.round(value);
}

function updateLanePressure() {
  const leftScore = state.playerTowers.left - state.enemyTowers.left;
  const rightScore = state.playerTowers.right - state.enemyTowers.right;
  leftLanePressure.textContent = pressureLabel(leftScore);
  rightLanePressure.textContent = pressureLabel(rightScore);
}

function pressureLabel(score) {
  if (score > 220) {
    return 'You control';
  }
  if (score < -220) {
    return 'Enemy surge';
  }
  return 'Balanced';
}

function updateCombatTempo() {
  const activeUnits = state.units.length;
  if (activeUnits >= 8) {
    state.combatTempo = 'High Intensity';
    arena.classList.add('combat-boost');
  } else if (activeUnits >= 4) {
    state.combatTempo = 'Rising Pressure';
    arena.classList.add('combat-boost');
  } else {
    state.combatTempo = 'Normal Pulse';
    arena.classList.remove('combat-boost');
  }
  tempoLabel.textContent = state.combatTempo;
}

function updateInteractionHud() {
  tempoLabel.textContent = state.combatTempo;
  lastClashLabel.textContent = state.lastClashText;
}

function registerClash(text) {
  state.lastClashText = text;
  lastClashLabel.textContent = text;
}

function pulseArena(reason) {
  registerClash(reason);
  arena.classList.add('combat-boost');
  clearTimeout(cameraResetTimeout);
  cameraResetTimeout = setTimeout(function () {
    if (state.combatTempo === 'Normal Pulse') {
      arena.classList.remove('combat-boost');
    }
  }, 260);
}

function checkWinCondition() {
  if (state.playerTowers.king <= 0 || state.enemyTowers.king <= 0) {
    finishMatch();
  }
}

function finishMatch() {
  if (state.over) {
    return;
  }
  state.over = true;
  state.paused = true;
  clearLoops();
  const playerHp = state.playerTowers.left + state.playerTowers.right + state.playerTowers.king;
  const enemyHp = state.enemyTowers.left + state.enemyTowers.right + state.enemyTowers.king;
  const victory = enemyHp < playerHp;
  state.lastOutcome = victory ? 'Victory' : 'Defeat';
  maybeSaveBestSession(victory, playerHp, enemyHp);
  showResults(victory, playerHp, enemyHp);
  cameraModeLabel.textContent = 'Cinematic Freeze';
}

function showResults(victory, playerHp, enemyHp) {
  resultTitle.textContent = victory ? 'Victory' : 'Defeat';
  resultSummary.textContent = victory ? 'You controlled the arena and broke through.' : 'The enemy fortress held stronger this round.';
  resultOutcome.textContent = victory ? 'Victory' : 'Defeat';
  resultPlayerHp.textContent = String(playerHp);
  resultEnemyHp.textContent = String(enemyHp);
  resultCardsPlayed.textContent = String(state.cardsPlayed);
  resultTime.textContent = formatTime(state.timeLeft);
  bestResultText.textContent = state.bestSession ? state.bestSession.label : 'No record yet';
  showOverlay(resultOverlay);
}

function maybeSaveBestSession(victory, playerHp, enemyHp) {
  const score = playerHp - enemyHp;
  if (!state.bestSession || score > state.bestSession.score) {
    state.bestSession = {
      score: score,
      label: (victory ? 'Victory' : 'Defeat') + ' · ' + score + ' spread'
    };
    localStorage.setItem('lincolnPrototypeBestSession', JSON.stringify(state.bestSession));
    updateBestSessionUi();
  }
}

function loadBestSession() {
  try {
    const raw = localStorage.getItem('lincolnPrototypeBestSession');
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function updateBestSessionUi() {
  bestSessionLabel.textContent = state.bestSession ? state.bestSession.label : 'No record yet';
}

function rotateTip() {
  tipText.textContent = tipRotation[state.tipIndex % tipRotation.length];
  state.tipIndex += 1;
}

function setStatus(text) {
  statusPill.textContent = text;
}

function log(text) {
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = text;
  battleLog.prepend(entry);
  while (battleLog.children.length > 12) {
    battleLog.removeChild(battleLog.lastChild);
  }
}

function toast(text, variant) {
  const item = document.createElement('div');
  item.className = 'toast ' + (variant || 'success');
  item.textContent = text;
  toastStack.appendChild(item);
  setTimeout(function () {
    item.remove();
  }, 2200);
}

function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  soundToggleBtn.textContent = 'Sound: ' + (state.soundEnabled ? 'On' : 'Off');
}

function playSound(type) {
  if (!state.soundEnabled) {
    return;
  }
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  oscillator.connect(gain);
  gain.connect(audioCtx.destination);
  oscillator.type = type === 'hit' ? 'square' : 'sine';
  oscillator.frequency.value = type === 'tick' ? 660 : type === 'deploy' ? 440 : 220;
  gain.gain.value = 0.03;
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.08);
}

function showOverlay(overlay) {
  overlay.classList.add('active');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.classList.add('overlay-open');
  appRoot.classList.add('dimmed');
}

function hideOverlay(overlay) {
  overlay.classList.remove('active');
  overlay.setAttribute('aria-hidden', 'true');
  if (!document.querySelector('.screen-overlay.active')) {
    document.body.classList.remove('overlay-open');
    appRoot.classList.remove('dimmed');
  }
}

function clearArenaUnits() {
  document.querySelectorAll('.unit, .projectile, .impact-ring').forEach(function (node) {
    node.remove();
  });
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(Math.max(totalSeconds, 0) / 60);
  const seconds = Math.max(totalSeconds, 0) % 60;
  return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
}

init();
