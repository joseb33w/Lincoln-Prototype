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
  bestSession: loadBestSession()
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
  battleLog.innerHTML = '';
  updateLanePressure();
  hideOverlay(resultOverlay);
}

function clearArenaUnits() {
  arena.querySelectorAll('.unit, .projectile').forEach(function (el) {
    el.remove();
  });
}

function getCard(id) {
  return allCards.find(function (card) {
    return card.id === id;
  });
}

function getHandCards() {
  return state.playerDeck.map(getCard);
}

function getNextCard() {
  const nextId = state.playerDeck[state.nextDeckIndex % state.playerDeck.length];
  return getCard(nextId);
}

function cycleDeck(playedCardId) {
  state.playerDeck.shift();
  state.playerDeck.push(playedCardId);
  state.nextDeckIndex = 0;
}

function bindLaneDrops() {
  dropLanes.forEach(function (lane) {
    lane.tabIndex = 0;

    lane.addEventListener('dragover', function (event) {
      event.preventDefault();
      lane.classList.add('drag-over');
    });

    lane.addEventListener('dragleave', function () {
      lane.classList.remove('drag-over');
    });

    lane.addEventListener('drop', function (event) {
      event.preventDefault();
      lane.classList.remove('drag-over');
      const cardId = event.dataTransfer.getData('text/plain');
      if (cardId) {
        deployPlayer(cardId, lane.dataset.lane);
      }
    });

    lane.addEventListener('click', function () {
      if (state.selectedTouchCardId) {
        deployPlayer(state.selectedTouchCardId, lane.dataset.lane);
      }
    });
  });
}

function showOverlay(overlay) {
  overlay.classList.add('active');
  overlay.setAttribute('aria-hidden', 'false');
  appRoot.classList.add('dimmed');
  document.body.classList.add('overlay-open');
}

function hideOverlay(overlay) {
  overlay.classList.remove('active');
  overlay.setAttribute('aria-hidden', 'true');
  const anyOverlayOpen = [startOverlay, instructionsOverlay, pauseOverlay, resultOverlay].some(function (item) {
    return item.classList.contains('active');
  });
  appRoot.classList.toggle('dimmed', anyOverlayOpen);
  document.body.classList.toggle('overlay-open', anyOverlayOpen);
}

function togglePause() {
  if (state.over || state.countdownActive || startOverlay.classList.contains('active') || instructionsOverlay.classList.contains('active')) {
    return;
  }
  if (state.paused) {
    resumeFromPause();
  } else {
    state.paused = true;
    showOverlay(pauseOverlay);
    setStatus('Match paused');
  }
}

function resumeFromPause() {
  hideOverlay(pauseOverlay);
  if (!state.over) {
    state.paused = false;
    setStatus('Battle live');
  }
}

function restartMatch() {
  hideOverlay(pauseOverlay);
  hideOverlay(resultOverlay);
  startBattleFlow();
}

function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  soundToggleBtn.textContent = 'Sound: ' + (state.soundEnabled ? 'On' : 'Off');
  toast('Sound ' + (state.soundEnabled ? 'enabled' : 'muted') + '.', 'success');
}

function renderCards() {
  cardsEl.innerHTML = '';
  getHandCards().forEach(function (card, index) {
    const isAffordable = state.elixir >= card.cost;
    const cardEl = document.createElement('article');
    cardEl.className = 'card' + (isAffordable ? '' : ' unaffordable') + (state.selectedTouchCardId === card.id ? ' selected' : '');
    cardEl.draggable = true;
    cardEl.tabIndex = 0;
    cardEl.innerHTML = `
      <div class="card-top">
        <div>
          <h3>${card.name}</h3>
          <p>${card.description}</p>
        </div>
        <div class="card-cost">${card.cost}</div>
      </div>
      <div class="card-meta">
        <span>Damage ${card.damage}</span>
        <span>HP ${card.hp}</span>
      </div>
      <div class="card-footer">
        <div class="card-label">${card.label}</div>
        <div class="deploy-row">
          <button class="secondary-btn" data-action="select">Select</button>
          <button data-action="left">Left</button>
          <button data-action="right">Right</button>
        </div>
      </div>
    `;

    cardEl.addEventListener('dragstart', function (event) {
      state.draggingCardId = card.id;
      event.dataTransfer.setData('text/plain', card.id);
    });

    cardEl.addEventListener('dragend', function () {
      state.draggingCardId = null;
    });

    cardEl.addEventListener('click', function (event) {
      const action = event.target.dataset.action;
      if (!action) return;
      if (action === 'select') {
        toggleTouchSelection(card.id);
        return;
      }
      deployPlayer(card.id, action);
    });

    cardEl.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleTouchSelection(card.id);
      }
    });

    if (index === 0) {
      cardEl.classList.add('recommended');
    }

    cardsEl.appendChild(cardEl);
  });
  nextCardLabel.textContent = getNextCard().name;
}

function toggleTouchSelection(cardId) {
  state.selectedTouchCardId = state.selectedTouchCardId === cardId ? null : cardId;
  const selectedCard = state.selectedTouchCardId ? getCard(state.selectedTouchCardId) : null;
  selectedCardLabel.textContent = selectedCard ? selectedCard.name : 'None';
  renderCards();
}

function deployPlayer(cardId, lane) {
  if (state.paused || state.over || state.countdownActive) return;
  const card = getCard(cardId);
  if (!card) return;
  if (state.elixir < card.cost) {
    toast('Not enough elixir for ' + card.name + '.', 'warning');
    return;
  }
  state.elixir -= card.cost;
  state.cardsPlayed += 1;
  spawnUnit('player', card, lane);
  cycleDeck(cardId);
  state.selectedTouchCardId = null;
  selectedCardLabel.textContent = 'None';
  updateHud();
  renderCards();
  updateLaneAdvice(lane, 'player');
  log('You deployed ' + card.name + ' to the ' + lane + ' lane.');
  playSound('deploy');
}

function enemyPlay() {
  if (state.paused || state.over) return;
  const affordable = allCards.filter(function (card) {
    return card.cost <= 6;
  });
  const card = affordable[Math.floor(Math.random() * affordable.length)];
  const lane = Math.random() > 0.5 ? 'left' : 'right';
  state.enemyCardsPlayed += 1;
  spawnUnit('enemy', card, lane);
  updateLaneAdvice(lane, 'enemy');
  log('Enemy deployed ' + card.name + ' to the ' + lane + ' lane.');
}

function spawnUnit(side, card, lane) {
  const laneEl = document.querySelector('.' + lane + '-lane');
  if (!laneEl) return;
  const unit = {
    id: state.nextUnitId++,
    side: side,
    lane: lane,
    cardId: card.id,
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
    y: side === 'player' ? 84 : 16,
    attackCooldown: 0,
    stunnedFor: 0,
    el: null,
    hpFill: null
  };

  const el = document.createElement('div');
  el.className = 'unit ' + side + ' ' + card.id;
  el.innerHTML = `<span>${card.label}</span><div class="hp-shell"><div class="hp-fill"></div></div>`;
  laneEl.appendChild(el);
  unit.el = el;
  unit.hpFill = el.querySelector('.hp-fill');
  state.units.push(unit);
  positionUnit(unit);
  updateLanePressure();
}

function positionUnit(unit) {
  if (!unit.el) return;
  unit.el.style.left = unit.x + '%';
  unit.el.style.top = unit.y + '%';
  unit.hpFill.style.width = Math.max(0, (unit.hp / unit.maxHp) * 100) + '%';
}

function tick() {
  if (state.paused || state.over) return;
  state.elixir = Math.min(state.maxElixir, state.elixir + 0.045);
  updateHud();
  updateUnits();
  updateProjectiles();
  cleanupUnits();
  updateLanePressure();
}

function updateUnits() {
  state.units.forEach(function (unit) {
    if (unit.stunnedFor > 0) {
      unit.stunnedFor -= 0.12;
      unit.el.classList.add('stunned');
      return;
    }
    unit.el.classList.remove('stunned');
    unit.attackCooldown = Math.max(0, unit.attackCooldown - 0.12);
    const target = findTarget(unit);
    if (target) {
      const distance = Math.abs(target.y - unit.y);
      if (distance <= unit.range) {
        attackTarget(unit, target);
      } else {
        moveToward(unit, target.y);
      }
    } else {
      const towerTarget = getTowerTarget(unit);
      if (towerTarget.distance <= unit.range) {
        attackTower(unit, towerTarget.key);
      } else {
        moveToward(unit, towerTarget.y);
      }
    }
    positionUnit(unit);
  });
}

function moveToward(unit, targetY) {
  const direction = unit.side === 'player' ? -1 : 1;
  const speedBoost = unit.dashRange && Math.abs(targetY - unit.y) <= unit.dashRange ? unit.dashSpeed : unit.speed;
  unit.el.classList.toggle('dashing', speedBoost === unit.dashSpeed && speedBoost !== 0);
  unit.y += direction * speedBoost;
  if (direction === -1) {
    unit.y = Math.max(targetY, unit.y);
  } else {
    unit.y = Math.min(targetY, unit.y);
  }
}

function findTarget(unit) {
  const enemies = state.units.filter(function (other) {
    return other.side !== unit.side && other.lane === unit.lane;
  });
  if (!enemies.length) return null;
  enemies.sort(function (a, b) {
    return Math.abs(a.y - unit.y) - Math.abs(b.y - unit.y);
  });
  return enemies[0];
}

function attackTarget(unit, target) {
  if (unit.attackCooldown > 0) return;
  unit.attackCooldown = unit.attackRate;
  unit.el.classList.add('attacking');
  setTimeout(function () {
    if (unit.el) unit.el.classList.remove('attacking');
  }, 120);
  if (unit.projectile) {
    spawnProjectile(unit, target);
  } else {
    damageUnit(target, unit.damage, unit);
  }
  playSound('hit');
}

function spawnProjectile(unit, target) {
  const laneEl = document.querySelector('.' + unit.lane + '-lane');
  const projectile = {
    id: state.nextProjectileId++,
    side: unit.side,
    lane: unit.lane,
    x: unit.x,
    y: unit.y,
    speed: unit.projectileSpeed || 3,
    damage: unit.damage,
    splashRadius: unit.splashRadius,
    targetId: target.id,
    source: unit,
    el: document.createElement('div')
  };
  projectile.el.className = 'projectile ' + unit.side;
  laneEl.appendChild(projectile.el);
  state.projectiles.push(projectile);
  positionProjectile(projectile);
}

function positionProjectile(projectile) {
  projectile.el.style.left = projectile.x + '%';
  projectile.el.style.top = projectile.y + '%';
}

function updateProjectiles() {
  state.projectiles = state.projectiles.filter(function (projectile) {
    const target = state.units.find(function (unit) {
      return unit.id === projectile.targetId;
    });
    if (!target) {
      projectile.el.remove();
      return false;
    }
    const dy = target.y - projectile.y;
    if (Math.abs(dy) <= projectile.speed) {
      projectile.y = target.y;
      positionProjectile(projectile);
      damageUnit(target, projectile.damage, projectile.source, projectile.splashRadius);
      projectile.el.remove();
      return false;
    }
    projectile.y += Math.sign(dy) * projectile.speed;
    positionProjectile(projectile);
    return true;
  });
}

function damageUnit(target, amount, attacker, splashRadius) {
  target.hp -= amount;
  if (attacker && attacker.stunDuration) {
    target.stunnedFor = attacker.stunDuration;
  }
  if (splashRadius) {
    state.units.forEach(function (unit) {
      if (unit.side !== target.side || unit.id === target.id || unit.lane !== target.lane) return;
      if (Math.abs(unit.y - target.y) <= splashRadius * 0.3) {
        unit.hp -= Math.round(amount * 0.45);
      }
    });
  }
  if (target.hp <= 0) {
    target.hp = 0;
    target.el.classList.add('defeated');
  }
  positionUnit(target);
}

function getTowerTarget(unit) {
  const isPlayer = unit.side === 'player';
  const towers = isPlayer ? state.enemyTowers : state.playerTowers;
  const primaryKey = towers[unit.lane] > 0 ? unit.lane : 'king';
  return {
    key: primaryKey,
    y: isPlayer ? (primaryKey === 'king' ? 20 : 12) : (primaryKey === 'king' ? 80 : 88),
    distance: Math.abs((isPlayer ? (primaryKey === 'king' ? 20 : 12) : (primaryKey === 'king' ? 80 : 88)) - unit.y)
  };
}

function attackTower(unit, key) {
  if (unit.attackCooldown > 0) return;
  unit.attackCooldown = unit.attackRate;
  const targetPool = unit.side === 'player' ? state.enemyTowers : state.playerTowers;
  targetPool[key] = Math.max(0, targetPool[key] - unit.damage);
  playSound('tower');
  updateHud();
  checkForGameOver();
}

function cleanupUnits() {
  state.units = state.units.filter(function (unit) {
    if (unit.hp > 0) {
      return true;
    }
    setTimeout(function () {
      if (unit.el) unit.el.remove();
    }, 150);
    return false;
  });
}

function stepTimer() {
  if (state.paused || state.over) return;
  state.timeLeft -= 1;
  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    finishMatch();
  }
  updateHud();
}

function finishMatch() {
  if (state.over) return;
  state.over = true;
  state.paused = true;
  clearLoops();

  const playerTotal = state.playerTowers.left + state.playerTowers.right + state.playerTowers.king;
  const enemyTotal = state.enemyTowers.left + state.enemyTowers.right + state.enemyTowers.king;
  const outcome = playerTotal === enemyTotal ? 'Draw' : playerTotal > enemyTotal ? 'Victory' : 'Defeat';
  state.lastOutcome = outcome;
  saveBestSession(outcome, playerTotal, enemyTotal);
  updateBestSessionUi();

  resultTitle.textContent = outcome;
  resultOutcome.textContent = outcome;
  resultSummary.textContent = outcome === 'Victory'
    ? 'You protected more tower health than the enemy.'
    : outcome === 'Defeat'
      ? 'The enemy fortress held stronger this round.'
      : 'Both sides finished with equal tower health.';
  resultPlayerHp.textContent = String(playerTotal);
  resultEnemyHp.textContent = String(enemyTotal);
  resultCardsPlayed.textContent = String(state.cardsPlayed);
  resultTime.textContent = formatTime(120 - state.timeLeft);
  bestResultText.textContent = state.bestSession ? state.bestSession.label : 'No record yet';
  showOverlay(resultOverlay);
  log('Match finished with a ' + outcome + '.');
}

function checkForGameOver() {
  if (state.enemyTowers.king <= 0 || state.playerTowers.king <= 0) {
    finishMatch();
  }
}

function updateHud() {
  timerEl.textContent = formatTime(state.timeLeft);
  const elixirPercent = (state.elixir / state.maxElixir) * 100;
  elixirFill.style.width = elixirPercent + '%';
  elixirText.textContent = Math.floor(state.elixir) + ' / ' + state.maxElixir;
  nextCardLabel.textContent = getNextCard().name;
  updateTowerBar('playerLeft', state.playerTowers.left, towerMax.left);
  updateTowerBar('playerRight', state.playerTowers.right, towerMax.right);
  updateTowerBar('playerKing', state.playerTowers.king, towerMax.king);
  updateTowerBar('enemyLeft', state.enemyTowers.left, towerMax.left);
  updateTowerBar('enemyRight', state.enemyTowers.right, towerMax.right);
  updateTowerBar('enemyKing', state.enemyTowers.king, towerMax.king);
}

function updateTowerBar(prefix, value, max) {
  document.getElementById(prefix + 'Hp').style.width = (value / max) * 100 + '%';
  document.getElementById(prefix + 'Text').textContent = String(Math.round(value));
}

function updateLaneAdvice(lane, side) {
  laneAdvice.textContent = (side === 'player' ? 'You are pressuring the ' : 'Enemy pressure rising on the ') + lane + ' lane';
}

function updateLanePressure() {
  const left = laneBalance('left');
  const right = laneBalance('right');
  leftLanePressure.textContent = left;
  rightLanePressure.textContent = right;
}

function laneBalance(lane) {
  const playerPower = state.units.filter(function (unit) {
    return unit.side === 'player' && unit.lane === lane;
  }).length;
  const enemyPower = state.units.filter(function (unit) {
    return unit.side === 'enemy' && unit.lane === lane;
  }).length;
  if (playerPower === enemyPower) return 'Balanced';
  return playerPower > enemyPower ? 'Player edge' : 'Enemy edge';
}

function setStatus(text) {
  statusPill.textContent = text;
}

function rotateTip(force) {
  if (!force && state.tipIndex === 0) {
    tipText.textContent = tipRotation[0];
    return;
  }
  state.tipIndex = (state.tipIndex + 1) % tipRotation.length;
  tipText.textContent = tipRotation[state.tipIndex];
}

function log(message) {
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = message;
  battleLog.prepend(entry);
  while (battleLog.children.length > 6) {
    battleLog.removeChild(battleLog.lastChild);
  }
}

function toast(message, tone) {
  const item = document.createElement('div');
  item.className = 'toast ' + (tone || 'success');
  item.textContent = message;
  toastStack.appendChild(item);
  setTimeout(function () {
    item.remove();
  }, 2400);
}

function formatTime(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return minutes + ':' + seconds;
}

function playSound(type) {
  if (!state.soundEnabled) return;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    audioCtx = new AudioContextClass();
  }
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const frequencies = {
    deploy: 440,
    hit: 320,
    tower: 220,
    tick: 660
  };
  osc.frequency.value = frequencies[type] || 300;
  osc.type = type === 'tower' ? 'square' : 'sine';
  gain.gain.value = 0.03;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.08);
}

function loadBestSession() {
  try {
    const raw = localStorage.getItem('lincolnPrototypeBestSession');
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function saveBestSession(outcome, playerTotal, enemyTotal) {
  const score = playerTotal - enemyTotal;
  const currentBest = state.bestSession;
  if (!currentBest || score > currentBest.score) {
    state.bestSession = {
      label: outcome + ' (' + score + ')',
      score: score
    };
    localStorage.setItem('lincolnPrototypeBestSession', JSON.stringify(state.bestSession));
  }
}

function updateBestSessionUi() {
  bestSessionLabel.textContent = state.bestSession ? state.bestSession.label : 'No record yet';
}

init();