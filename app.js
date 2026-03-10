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
const dropLanes = Array.from(document.querySelectorAll('.drop-lane'));

let gameLoop = null;
let timerLoop = null;
let enemyLoop = null;
let audioCtx = null;
let tipInterval = null;

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
  arena.style.transform = 'rotateX(' + (10 - y * 8).toFixed(2) + 'deg) rotateY(' + (x * 8).toFixed(2) + 'deg)';
}

function resetArenaParallax() {
  arena.style.transform = 'rotateX(10deg) rotateY(0deg)';
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
}

function beginLoops() {
  clearLoops();
  gameLoop = setInterval(updateGame, 1000 / 30);
  timerLoop = setInterval(function () {
    if (state.paused || state.over) {
      return;
    }
    state.timeLeft -= 1;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      finishMatch();
    }
    updateHud();
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
      state.hoverLane = laneEl.dataset.lane;
      updateLaneAdvice();
    });
    laneEl.addEventListener('dragleave', function () {
      laneEl.classList.remove('drag-over');
      state.hoverLane = null;
      updateLaneAdvice();
    });
    laneEl.addEventListener('drop', function (event) {
      event.preventDefault();
      laneEl.classList.remove('drag-over');
      if (state.draggingCardId) {
        deployPlayer(state.draggingCardId, laneEl.dataset.lane);
      }
      state.hoverLane = null;
      updateLaneAdvice();
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
    cardEl.draggable = true;
    cardEl.type = 'button';
    cardEl.innerHTML =
      '<div class="card-top"><span class="card-label">' + card.label + '</span><span class="card-cost">' + card.cost + '</span></div>' +
      '<h3>' + card.name + '</h3>' +
      '<p>' + card.description + '</p>' +
      '<div class="card-meta"><span>' + card.abilityLabel + '</span><strong>' + card.damage + ' dmg</strong></div>';

    if (state.selectedTouchCardId === card.id) {
      cardEl.classList.add('selected');
    }

    cardEl.addEventListener('dragstart', function () {
      state.draggingCardId = card.id;
      cardEl.classList.add('dragging');
    });

    cardEl.addEventListener('dragend', function () {
      state.draggingCardId = null;
      cardEl.classList.remove('dragging');
    });

    cardEl.addEventListener('click', function () {
      toggleTouchSelection(card.id);
    });

    cardEl.addEventListener('mouseenter', function () {
      state.hoverLane = recommendLane();
      highlightRecommendedLane();
      updateLaneAdvice();
    });

    cardEl.addEventListener('mouseleave', function () {
      state.hoverLane = null;
      highlightRecommendedLane();
      updateLaneAdvice();
    });

    cardEl.setAttribute('aria-label', card.name + ', cost ' + card.cost + ', slot ' + (index + 1));
    cardsEl.appendChild(cardEl);
  });
  highlightRecommendedLane();
  updateLaneAdvice();
}

function toggleTouchSelection(cardId) {
  state.selectedTouchCardId = state.selectedTouchCardId === cardId ? null : cardId;
  renderCards();
  updateHud();
}

function recommendLane() {
  const leftPressure = state.enemyTowers.left - state.playerTowers.left;
  const rightPressure = state.enemyTowers.right - state.playerTowers.right;
  return leftPressure > rightPressure ? 'left' : 'right';
}

function highlightRecommendedLane() {
  const recommended = recommendLane();
  dropLanes.forEach(function (laneEl) {
    laneEl.classList.toggle('recommended', laneEl.dataset.lane === recommended);
    laneEl.classList.toggle('touch-target', !!state.selectedTouchCardId);
  });
}

function updateLaneAdvice() {
  const recommended = recommendLane();
  const activeLane = state.hoverLane || recommended;
  laneAdvice.textContent = (activeLane === 'left' ? 'Left lane' : 'Right lane') + ' is the best pressure point';
  leftLanePressure.textContent = activeLane === 'left' ? 'Priority' : 'Watch';
  rightLanePressure.textContent = activeLane === 'right' ? 'Priority' : 'Watch';
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
    toast('Not enough elixir for ' + card.name, 'error');
    return;
  }
  state.elixir -= card.cost;
  state.cardsPlayed += 1;
  spawnUnit(card, 'player', lane);
  cycleCard(cardId);
  state.selectedTouchCardId = null;
  renderCards();
  updateHud();
  playSound('deploy');
  log('You deployed ' + card.name + ' into the ' + lane + ' lane.');
}

function cycleCard(cardId) {
  const index = state.playerDeck.indexOf(cardId);
  if (index >= 0) {
    state.playerDeck.splice(index, 1);
    state.playerDeck.push(cardId);
  }
}

function enemyDeploy() {
  const options = allCards.filter(function (card) {
    return card.cost <= Math.min(6, 2 + Math.floor((120 - state.timeLeft) / 20));
  });
  const card = options[Math.floor(Math.random() * options.length)] || allCards[0];
  const lane = Math.random() > 0.5 ? 'left' : 'right';
  state.enemyCardsPlayed += 1;
  spawnUnit(card, 'enemy', lane);
  log('Enemy deployed ' + card.name + ' into the ' + lane + ' lane.');
}

function spawnUnit(card, side, lane) {
  const laneEl = document.querySelector('.' + lane + '-lane');
  const unitEl = document.createElement('div');
  unitEl.className = 'unit ' + side;
  unitEl.textContent = card.label;
  laneEl.appendChild(unitEl);

  const unit = {
    id: state.nextUnitId++,
    cardId: card.id,
    side: side,
    lane: lane,
    hp: card.hp,
    maxHp: card.hp,
    damage: card.damage,
    speed: card.speed,
    range: card.range,
    attackRate: card.attackRate,
    projectile: !!card.projectile,
    projectileSpeed: card.projectileSpeed || 3,
    splashRadius: card.splashRadius || 0,
    stunDuration: card.stunDuration || 0,
    dashRange: card.dashRange || 0,
    dashSpeed: card.dashSpeed || 0,
    x: 50,
    y: side === 'player' ? 82 : 18,
    cooldown: 0,
    stunned: 0,
    element: unitEl
  };

  state.units.push(unit);
  positionUnit(unit);
}

function positionUnit(unit) {
  unit.element.style.left = unit.x + '%';
  unit.element.style.top = unit.y + '%';
}

function updateGame() {
  if (state.paused || state.over) {
    return;
  }

  state.elixir = Math.min(state.maxElixir, state.elixir + 0.02);

  state.units.forEach(function (unit) {
    if (unit.stunned > 0) {
      unit.stunned -= 1 / 30;
      unit.element.classList.add('stunned');
      return;
    }

    unit.element.classList.remove('stunned');
    unit.cooldown = Math.max(0, unit.cooldown - 1 / 30);

    const opponent = findOpponent(unit);
    if (opponent) {
      const distance = Math.abs(unit.y - opponent.y);
      if (distance <= unit.range) {
        attackUnit(unit, opponent);
      } else {
        moveUnit(unit, unit.side === 'player' ? -1 : 1, unit.speed);
      }
    } else {
      const towerTarget = getTowerTarget(unit);
      const distanceToTower = Math.abs(unit.y - towerTarget.y);
      if (distanceToTower <= unit.range) {
        attackTower(unit, towerTarget);
      } else {
        const dashBoost = unit.dashRange && distanceToTower < unit.dashRange ? unit.dashSpeed : unit.speed;
        moveUnit(unit, unit.side === 'player' ? -1 : 1, dashBoost || unit.speed);
      }
    }

    positionUnit(unit);
  });

  state.projectiles.forEach(updateProjectile);
  state.units = state.units.filter(function (unit) {
    return unit.hp > 0;
  });
  state.projectiles = state.projectiles.filter(function (projectile) {
    return !projectile.done;
  });
  updateHud();
}

function moveUnit(unit, direction, speed) {
  unit.y += direction * speed * 0.22;
}

function findOpponent(unit) {
  return state.units.find(function (other) {
    return other.side !== unit.side && other.lane === unit.lane && Math.abs(other.y - unit.y) < 26;
  });
}

function attackUnit(attacker, defender) {
  if (attacker.cooldown > 0) {
    return;
  }
  attacker.cooldown = attacker.attackRate;
  if (attacker.projectile) {
    spawnProjectile(attacker, defender, false);
  } else {
    applyDamageToUnit(defender, attacker.damage, attacker.stunDuration);
    pulseUnit(attacker.element);
  }
}

function attackTower(attacker, towerTarget) {
  if (attacker.cooldown > 0) {
    return;
  }
  attacker.cooldown = attacker.attackRate;
  if (attacker.projectile) {
    spawnProjectile(attacker, towerTarget, true);
  } else {
    damageTower(towerTarget.side, towerTarget.key, attacker.damage);
    pulseUnit(attacker.element);
  }
}

function spawnProjectile(attacker, target, isTower) {
  const laneEl = document.querySelector('.' + attacker.lane + '-lane');
  const projectileEl = document.createElement('div');
  projectileEl.className = 'projectile ' + attacker.side;
  laneEl.appendChild(projectileEl);
  state.projectiles.push({
    id: state.nextProjectileId++,
    attackerId: attacker.id,
    lane: attacker.lane,
    side: attacker.side,
    x: attacker.x,
    y: attacker.y,
    target: target,
    speed: attacker.projectileSpeed,
    damage: attacker.damage,
    splashRadius: attacker.splashRadius,
    stunDuration: attacker.stunDuration,
    isTower: isTower,
    element: projectileEl,
    done: false
  });
}

function updateProjectile(projectile) {
  if (projectile.done) {
    return;
  }
  const targetY = projectile.isTower ? projectile.target.y : projectile.target.y;
  const direction = targetY > projectile.y ? 1 : -1;
  projectile.y += direction * projectile.speed * 0.32;
  projectile.element.style.left = projectile.x + '%';
  projectile.element.style.top = projectile.y + '%';
  if (Math.abs(projectile.y - targetY) < 3) {
    if (projectile.isTower) {
      damageTower(projectile.target.side, projectile.target.key, projectile.damage);
    } else if (projectile.target.hp > 0) {
      applyDamageToUnit(projectile.target, projectile.damage, projectile.stunDuration);
      if (projectile.splashRadius) {
        applySplash(projectile);
      }
    }
    projectile.done = true;
    projectile.element.remove();
  }
}

function applySplash(projectile) {
  state.units.forEach(function (unit) {
    if (unit.side !== projectile.side && unit.lane === projectile.lane && Math.abs(unit.y - projectile.y) < 10) {
      applyDamageToUnit(unit, Math.round(projectile.damage * 0.55), 0);
    }
  });
}

function applyDamageToUnit(unit, damage, stunDuration) {
  unit.hp -= damage;
  if (stunDuration) {
    unit.stunned = stunDuration;
  }
  pulseUnit(unit.element);
  if (unit.hp <= 0) {
    unit.element.classList.add('defeated');
    setTimeout(function () {
      unit.element.remove();
    }, 180);
  }
}

function pulseUnit(element) {
  element.classList.add('pulse');
  setTimeout(function () {
    element.classList.remove('pulse');
  }, 180);
}

function getTowerTarget(unit) {
  const targetSide = unit.side === 'player' ? 'enemy' : 'player';
  const laneTowerHp = state[targetSide + 'Towers'][unit.lane];
  if (laneTowerHp > 0) {
    return { side: targetSide, key: unit.lane, y: targetSide === 'enemy' ? 12 : 88 };
  }
  return { side: targetSide, key: 'king', y: targetSide === 'enemy' ? 20 : 80 };
}

function damageTower(side, key, damage) {
  const towers = side === 'player' ? state.playerTowers : state.enemyTowers;
  towers[key] = Math.max(0, towers[key] - damage);
  playSound('hit');
  if (towers.key === 0) {
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

  const playerTotal = state.playerTowers.left + state.playerTowers.right + state.playerTowers.king;
  const enemyTotal = state.enemyTowers.left + state.enemyTowers.right + state.enemyTowers.king;
  const outcome = playerTotal === enemyTotal ? 'Draw' : playerTotal > enemyTotal ? 'Victory' : 'Defeat';
  state.lastOutcome = outcome;
  saveBestSession(outcome, enemyTotal);
  updateResultOverlay(outcome, playerTotal, enemyTotal);
  showOverlay(resultOverlay);
  setStatus('Match complete');
  toast(outcome + '. Tap Play Again to jump back in.', outcome === 'Defeat' ? 'error' : 'success');
}

function updateResultOverlay(outcome, playerTotal, enemyTotal) {
  resultTitle.textContent = outcome;
  resultSummary.textContent = outcome === 'Victory'
    ? 'You kept more tower health than the enemy fortress.'
    : outcome === 'Defeat'
      ? 'The enemy held the health advantage this time.'
      : 'Both sides finished with the same total tower health.';
  resultOutcome.textContent = outcome;
  resultPlayerHp.textContent = String(playerTotal);
  resultEnemyHp.textContent = String(enemyTotal);
  resultCardsPlayed.textContent = String(state.cardsPlayed);
  resultTime.textContent = formatTime(state.timeLeft);
  bestResultText.textContent = state.bestSession ? state.bestSession.label : '-';
}

function updateHud() {
  timerEl.textContent = formatTime(state.timeLeft);
  elixirFill.style.width = state.elixir / state.maxElixir * 100 + '%';
  elixirText.textContent = Math.floor(state.elixir) + ' / ' + state.maxElixir;
  selectedCardLabel.textContent = state.selectedTouchCardId
    ? allCards.find(function (card) { return card.id === state.selectedTouchCardId; }).name
    : 'None';

  updateTowerBar('playerLeft', state.playerTowers.left, towerMax.left);
  updateTowerBar('playerRight', state.playerTowers.right, towerMax.right);
  updateTowerBar('playerKing', state.playerTowers.king, towerMax.king);
  updateTowerBar('enemyLeft', state.enemyTowers.left, towerMax.left);
  updateTowerBar('enemyRight', state.enemyTowers.right, towerMax.right);
  updateTowerBar('enemyKing', state.enemyTowers.king, towerMax.king);
  updateLaneAdvice();
}

function updateTowerBar(prefix, value, max) {
  document.getElementById(prefix + 'Hp').style.width = value / max * 100 + '%';
  document.getElementById(prefix + 'Text').textContent = String(value);
}

function formatTime(seconds) {
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  return mins + ':' + secs;
}

function updateBestSessionUi() {
  bestSessionLabel.textContent = state.bestSession ? state.bestSession.label : 'No record yet';
}

function rotateTip(forceAdvance) {
  if (forceAdvance) {
    state.tipIndex = (state.tipIndex + 1) % tipRotation.length;
  }
  tipText.textContent = tipRotation[state.tipIndex];
  state.tipIndex = (state.tipIndex + 1) % tipRotation.length;
}

function setStatus(text) {
  statusPill.textContent = text;
}

function log(text) {
  const line = document.createElement('div');
  line.className = 'log-line';
  line.textContent = text;
  battleLog.prepend(line);
  while (battleLog.children.length > 8) {
    battleLog.removeChild(battleLog.lastChild);
  }
}

function toast(text, type) {
  const item = document.createElement('div');
  item.className = 'toast ' + (type || 'success');
  item.textContent = text;
  toastStack.appendChild(item);
  setTimeout(function () {
    item.classList.add('visible');
  }, 10);
  setTimeout(function () {
    item.classList.remove('visible');
    setTimeout(function () {
      item.remove();
    }, 200);
  }, 2400);
}

function showOverlay(el) {
  el.classList.add('active');
  el.setAttribute('aria-hidden', 'false');
  document.body.classList.add('overlay-open');
  appRoot.classList.add('dimmed');
}

function hideOverlay(el) {
  el.classList.remove('active');
  el.setAttribute('aria-hidden', 'true');
  const anyActive = [startOverlay, pauseOverlay, resultOverlay].some(function (overlay) {
    return overlay.classList.contains('active');
  });
  if (!anyActive) {
    document.body.classList.remove('overlay-open');
    appRoot.classList.remove('dimmed');
  }
}

function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  soundToggleBtn.textContent = 'Sound: ' + (state.soundEnabled ? 'On' : 'Off');
}

function playSound(kind) {
  if (!state.soundEnabled) {
    return;
  }
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  oscillator.type = kind === 'hit' ? 'square' : 'sine';
  oscillator.frequency.value = kind === 'deploy' ? 420 : kind === 'hit' ? 180 : 520;
  gain.gain.value = 0.02;
  oscillator.connect(gain);
  gain.connect(audioCtx.destination);
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.08);
}

function clearArenaUnits() {
  document.querySelectorAll('.unit, .projectile').forEach(function (node) {
    node.remove();
  });
}

function loadBestSession() {
  try {
    const raw = localStorage.getItem('lincoln-best-session');
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function saveBestSession(outcome, enemyTotal) {
  const score = towerMax.left + towerMax.right + towerMax.king - enemyTotal;
  const label = outcome + ' - ' + score + ' damage';
  if (!state.bestSession || score > state.bestSession.score) {
    state.bestSession = { score: score, label: label };
    localStorage.setItem('lincoln-best-session', JSON.stringify(state.bestSession));
    updateBestSessionUi();
  }
}

init();