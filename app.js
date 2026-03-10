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
const pauseOverlay = document.getElementById('pauseOverlay');
const resultOverlay = document.getElementById('resultOverlay');
const startBattleBtn = document.getElementById('startBattleBtn');
const howToPlayBtn = document.getElementById('howToPlayBtn');
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
  howToPlayBtn.addEventListener('click', function () {
    rotateTip(true);
    toast('Tip panel refreshed with another tactical hint.', 'success');
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
      const cardId = event.dataTransfer.getData('text/plain') || state.draggingCardId;
      if (cardId) deployPlayer(cardId, lane.dataset.lane);
      clearTouchSelection();
      document.querySelectorAll('.card.dragging').forEach(function (card) {
        card.classList.remove('dragging');
      });
    });

    lane.addEventListener('click', function () {
      if (state.selectedTouchCardId) {
        deployPlayer(state.selectedTouchCardId, lane.dataset.lane);
      }
    });

    lane.addEventListener('keydown', function (event) {
      if ((event.key === 'Enter' || event.key === ' ') && state.selectedTouchCardId) {
        event.preventDefault();
        deployPlayer(state.selectedTouchCardId, lane.dataset.lane);
      }
    });

    lane.addEventListener('touchstart', function (event) {
      if (state.selectedTouchCardId) {
        event.preventDefault();
        lane.classList.add('touch-target');
      }
    }, { passive: false });

    lane.addEventListener('touchend', function (event) {
      if (state.selectedTouchCardId) {
        event.preventDefault();
        deployPlayer(state.selectedTouchCardId, lane.dataset.lane);
      }
      lane.classList.remove('touch-target');
    }, { passive: false });
  });
}

function renderCards() {
  cardsEl.innerHTML = '';
  const hand = getHandCards();
  const nextCard = getNextCard();
  nextCardLabel.textContent = nextCard ? nextCard.name : '-';

  hand.forEach(function (card, index) {
    const cardEl = document.createElement('article');
    cardEl.className = 'card ' + (index === 0 ? 'next-up' : '') + ' ' + (state.selectedTouchCardId === card.id ? 'selected-touch' : '');
    cardEl.draggable = true;
    cardEl.tabIndex = 0;
    cardEl.dataset.card = card.id;
    cardEl.innerHTML = [
      '<h3>' + (index + 1) + '. ' + card.name + '</h3>',
      '<p>' + card.description + '</p>',
      '<p>Cost: <strong>' + card.cost + '</strong> | HP: <strong>' + card.hp + '</strong> | DMG: <strong>' + card.damage + '</strong></p>',
      '<span class="drag-hint">Drag to a glowing lane or press L/R after selecting</span>',
      '<span class="ability-tag">' + (card.abilityLabel || 'Arena unit') + '</span>',
      '<div class="deploy-row">',
      '<button data-card="' + card.id + '" data-lane="left">Left Lane</button>',
      '<button data-card="' + card.id + '" data-lane="right">Right Lane</button>',
      '</div>'
    ].join('');

    cardEl.addEventListener('dragstart', function (event) {
      state.draggingCardId = card.id;
      cardEl.classList.add('dragging');
      event.dataTransfer.setData('text/plain', card.id);
      event.dataTransfer.effectAllowed = 'move';
      setStatus('Dragging ' + card.name);
    });

    cardEl.addEventListener('dragend', function () {
      state.draggingCardId = null;
      cardEl.classList.remove('dragging');
      dropLanes.forEach(function (lane) {
        lane.classList.remove('drag-over');
      });
    });

    cardEl.addEventListener('click', function (event) {
      if (event.target.tagName === 'BUTTON') return;
      toggleTouchSelection(card.id);
    });

    cardEl.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleTouchSelection(card.id);
      }
    });

    cardEl.addEventListener('touchstart', function () {
      toggleTouchSelection(card.id);
    }, { passive: true });

    cardEl.querySelectorAll('button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        deployPlayer(card.id, btn.dataset.lane);
      });
    });

    cardsEl.appendChild(cardEl);
  });
}

function toggleTouchSelection(cardId) {
  state.selectedTouchCardId = state.selectedTouchCardId === cardId ? null : cardId;
  const card = getCard(state.selectedTouchCardId);
  selectedCardLabel.textContent = card ? card.name : 'None';
  setStatus(card ? card.name + ' selected - choose a lane' : 'Battle ready');
  dropLanes.forEach(function (lane) {
    lane.classList.toggle('touch-target', !!state.selectedTouchCardId);
  });
  renderCards();
}

function clearTouchSelection() {
  state.selectedTouchCardId = null;
  selectedCardLabel.textContent = 'None';
  dropLanes.forEach(function (lane) {
    lane.classList.remove('touch-target');
  });
}

function deployPlayer(cardId, lane) {
  if (state.over || state.paused || state.countdownActive) return;
  const card = getCard(cardId);
  if (!card || state.elixir < card.cost) {
    setStatus('Not enough elixir');
    log('Not enough elixir for that card.');
    toast('Not enough elixir yet. Wait a moment and try again.', 'warning');
    playSound('error');
    return;
  }

  state.elixir -= card.cost;
  state.cardsPlayed += 1;
  spawnUnit('player', card, lane);
  cycleDeck(card.id);
  clearTouchSelection();
  renderCards();
  updateHud();
  setStatus(card.name + ' deployed ' + lane);
  log('You deployed ' + card.name + ' in the ' + lane + ' lane.');
  toast(card.name + ' deployed in the ' + lane + ' lane.', 'success');
  playSound('deploy');
}

function enemyPlay() {
  if (state.over || state.paused) return;
  const affordable = allCards.filter(function (card) {
    return card.cost <= 6;
  });
  const card = affordable[Math.floor(Math.random() * affordable.length)];
  const lane = Math.random() > 0.5 ? 'left' : 'right';
  state.enemyCardsPlayed += 1;
  spawnUnit('enemy', card, lane);
  setStatus('Enemy pressure in ' + lane + ' lane');
  log('Enemy deployed ' + card.name + ' in the ' + lane + ' lane.');
}

function spawnUnit(side, card, lane) {
  const laneEl = document.querySelector('.' + lane + '-lane') || document.querySelector('.center-lane');
  const unitEl = document.createElement('div');
  unitEl.className = 'unit ' + side + ' ' + (card.id === 'archer' ? 'archer' : '') + ' ' + card.id;
  unitEl.textContent = card.label;

  const hpShell = document.createElement('div');
  hpShell.className = 'hp-shell';
  const hpFill = document.createElement('div');
  hpFill.className = 'hp-fill';
  hpShell.appendChild(hpFill);
  unitEl.appendChild(hpShell);
  laneEl.appendChild(unitEl);

  const unit = {
    uid: state.nextUnitId++,
    side: side,
    lane: lane,
    cardId: card.id,
    hp: card.hp,
    maxHp: card.hp,
    damage: card.damage,
    speed: card.speed,
    range: card.range,
    projectile: card.projectile,
    projectileSpeed: card.projectileSpeed || 0,
    attackRate: card.attackRate,
    splashRadius: card.splashRadius || 0,
    stunDuration: card.stunDuration || 0,
    dashRange: card.dashRange || 0,
    dashSpeed: card.dashSpeed || 0,
    x: 50,
    y: side === 'player' ? 86 : 14,
    target: lane,
    el: unitEl,
    hpFill: hpFill,
    attackCooldown: 0,
    stunnedFor: 0
  };

  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    unitEl.animate([
      { transform: 'translateX(-50%) scale(0.4)', opacity: 0.1 },
      { transform: 'translateX(-50%) scale(1.12)', opacity: 1 },
      { transform: 'translateX(-50%) scale(1)', opacity: 1 }
    ], { duration: 260, easing: 'ease-out' });
  }

  positionUnit(unit);
  updateUnitHp(unit);
  state.units.push(unit);
  updateLanePressure();
}

function tick() {
  if (state.over || state.paused) return;

  state.elixir = Math.min(state.maxElixir, state.elixir + 0.06);
  updateHud();

  state.units.forEach(function (unit) {
    if (!unit) return;
    if (unit.attackCooldown > 0) unit.attackCooldown -= 0.12;
    if (unit.stunnedFor > 0) {
      unit.stunnedFor -= 0.12;
      unit.el.classList.add('stunned');
      return;
    }

    unit.el.classList.remove('stunned');
    const targetUnit = findClosestEnemy(unit);

    if (targetUnit && Math.abs(targetUnit.y - unit.y) <= unit.range) {
      attackUnit(unit, targetUnit);
    } else {
      const towerTarget = getTowerTarget(unit.side, unit.lane);
      if (towerTarget && withinTowerRange(unit, towerTarget)) {
        attackTower(unit, towerTarget);
      } else {
        moveUnit(unit);
      }
    }

    positionUnit(unit);
  });

  updateProjectiles();
  cleanupDefeatedUnits();
  updateLanePressure();
  checkWinCondition();
}

function moveUnit(unit) {
  const direction = unit.side === 'player' ? -1 : 1;
  unit.y += direction * unit.speed * 1.9;
  unit.el.classList.remove('attacking');
}

function findClosestEnemy(unit) {
  const enemies = state.units.filter(function (other) {
    return other.side !== unit.side && other.lane === unit.lane && other.hp > 0;
  });
  let closest = null;
  let bestDistance = Infinity;

  enemies.forEach(function (enemy) {
    const distance = Math.abs(enemy.y - unit.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      closest = enemy;
    }
  });

  return closest;
}

function attackUnit(attacker, defender) {
  if (attacker.attackCooldown > 0) return;
  attacker.attackCooldown = attacker.attackRate;
  attacker.el.classList.add('attacking');

  if (attacker.dashRange && Math.abs(defender.y - attacker.y) <= attacker.dashRange) {
    attacker.el.classList.add('dashing');
    attacker.y += attacker.side === 'player' ? -4 : 4;
    setTimeout(function () {
      if (attacker.el) attacker.el.classList.remove('dashing');
    }, 180);
  }

  if (attacker.projectile) {
    spawnProjectile(attacker, defender);
  } else {
    applyDamageToUnit(attacker, defender, attacker.damage);
  }

  if (attacker.stunDuration) {
    defender.stunnedFor = Math.max(defender.stunnedFor, attacker.stunDuration);
  }

  playSound('hit');
}

function attackTower(attacker, towerTarget) {
  if (attacker.attackCooldown > 0) return;
  attacker.attackCooldown = attacker.attackRate;
  attacker.el.classList.add('attacking');
  damageTower(towerTarget.side, towerTarget.key, attacker.damage);
  playSound('hit');
}

function spawnProjectile(attacker, target) {
  const projectileEl = document.createElement('div');
  projectileEl.className = 'projectile ' + attacker.side + ' ' + (attacker.splashRadius ? 'splash' : '');
  const laneEl = document.querySelector('.' + attacker.lane + '-lane');
  laneEl.appendChild(projectileEl);

  const projectile = {
    id: state.nextProjectileId++,
    side: attacker.side,
    lane: attacker.lane,
    x: attacker.x,
    y: attacker.y,
    speed: attacker.projectileSpeed || 3,
    damage: attacker.damage,
    splashRadius: attacker.splashRadius || 0,
    targetUid: target.uid,
    el: projectileEl
  };

  state.projectiles.push(projectile);
  positionProjectile(projectile);
}

function updateProjectiles() {
  state.projectiles = state.projectiles.filter(function (projectile) {
    const target = state.units.find(function (unit) {
      return unit.uid === projectile.targetUid && unit.hp > 0;
    });
    if (!target) {
      projectile.el.remove();
      return false;
    }

    const direction = target.y > projectile.y ? 1 : -1;
    projectile.y += direction * projectile.speed;
    positionProjectile(projectile);

    if (Math.abs(target.y - projectile.y) <= 4) {
      if (projectile.splashRadius) {
        state.units
          .filter(function (unit) {
            return unit.side !== projectile.side && unit.lane === projectile.lane && Math.abs(unit.y - target.y) <= projectile.splashRadius;
          })
          .forEach(function (unit) {
            applyDamageToUnit(null, unit, projectile.damage);
          });
      } else {
        applyDamageToUnit(null, target, projectile.damage);
      }
      projectile.el.remove();
      return false;
    }

    return true;
  });
}

function applyDamageToUnit(attacker, unit, damage) {
  unit.hp -= damage;
  updateUnitHp(unit);
  if (unit.hp <= 0) {
    unit.el.classList.add('defeated');
    log(getCard(unit.cardId).name + ' was defeated in the ' + unit.lane + ' lane.');
  }
}

function cleanupDefeatedUnits() {
  state.units = state.units.filter(function (unit) {
    if (unit.hp > 0 && unit.y > 2 && unit.y < 98) return true;

    if (unit.hp > 0 && (unit.y <= 2 || unit.y >= 98)) {
      const defendingSide = unit.side === 'player' ? 'enemy' : 'player';
      damageTower(defendingSide, unit.lane, unit.damage);
      unit.el.classList.add('defeated');
    }

    setTimeout(function () {
      if (unit.el) unit.el.remove();
    }, 140);
    return false;
  });
}

function getTowerTarget(side, lane) {
  return {
    side: side === 'player' ? 'enemy' : 'player',
    key: lane,
    y: side === 'player' ? 14 : 86
  };
}

function withinTowerRange(unit, towerTarget) {
  return Math.abs(unit.y - towerTarget.y) <= unit.range + 6;
}

function damageTower(side, key, damage) {
  const towers = side === 'player' ? state.playerTowers : state.enemyTowers;
  towers[key] = Math.max(0, towers[key] - damage);
  updateHud();

  const perspective = side === 'enemy' ? 'Enemy' : 'Your';
  if (towers[key] === 0) {
    toast(perspective + ' ' + key + ' tower was destroyed.', side === 'enemy' ? 'success' : 'danger');
    log(perspective + ' ' + key + ' tower was destroyed.');
  }
}

function updateHud() {
  timerEl.textContent = formatTime(state.timeLeft);
  elixirFill.style.width = ((state.elixir / state.maxElixir) * 100) + '%';
  elixirText.textContent = Math.floor(state.elixir) + ' / ' + state.maxElixir;

  updateTowerBar('playerLeft', state.playerTowers.left, towerMax.left);
  updateTowerBar('playerRight', state.playerTowers.right, towerMax.right);
  updateTowerBar('playerKing', state.playerTowers.king, towerMax.king);
  updateTowerBar('enemyLeft', state.enemyTowers.left, towerMax.left);
  updateTowerBar('enemyRight', state.enemyTowers.right, towerMax.right);
  updateTowerBar('enemyKing', state.enemyTowers.king, towerMax.king);

  laneAdvice.textContent = getLaneAdvice();
}

function updateTowerBar(prefix, hp, max) {
  const fill = document.getElementById(prefix + 'Hp');
  const text = document.getElementById(prefix + 'Text');
  fill.style.width = ((hp / max) * 100) + '%';
  text.textContent = String(hp);
}

function updateUnitHp(unit) {
  unit.hpFill.style.width = (Math.max(0, unit.hp / unit.maxHp) * 100) + '%';
}

function positionUnit(unit) {
  unit.el.style.left = unit.x + '%';
  unit.el.style.top = unit.y + '%';
}

function positionProjectile(projectile) {
  projectile.el.style.left = projectile.x + '%';
  projectile.el.style.top = projectile.y + '%';
}

function stepTimer() {
  if (state.over || state.paused) return;
  state.timeLeft -= 1;
  updateHud();

  if (state.timeLeft === 60) {
    toast('One minute remaining. Start committing to a winning lane.', 'warning');
  }

  if (state.timeLeft === 30) {
    toast('Thirty seconds left. Finish the push.', 'warning');
  }

  if (state.timeLeft <= 0) {
    endMatch(resolveWinnerByHealth());
  }
}

function resolveWinnerByHealth() {
  const playerHp = totalTowerHealth(state.playerTowers);
  const enemyHp = totalTowerHealth(state.enemyTowers);
  if (enemyHp < playerHp) return 'victory';
  if (playerHp < enemyHp) return 'defeat';
  return 'draw';
}

function checkWinCondition() {
  if (state.enemyTowers.king <= 0) {
    endMatch('victory');
  } else if (state.playerTowers.king <= 0) {
    endMatch('defeat');
  }
}

function endMatch(outcome) {
  if (state.over) return;
  state.over = true;
  state.paused = true;
  state.lastOutcome = outcome;
  clearLoops();
  setStatus(outcome === 'victory' ? 'Victory!' : outcome === 'defeat' ? 'Defeat' : 'Draw');
  saveBestSession(outcome);
  showResults(outcome);
  playSound(outcome === 'victory' ? 'victory' : 'error');
}

function showResults(outcome) {
  const playerHp = totalTowerHealth(state.playerTowers);
  const enemyHp = totalTowerHealth(state.enemyTowers);
  const playedTime = 120 - state.timeLeft;
  const title = outcome === 'victory' ? 'Victory' : outcome === 'defeat' ? 'Defeat' : 'Draw';
  const summary = outcome === 'victory'
    ? 'You protected more tower health and controlled the battlefield better.'
    : outcome === 'defeat'
      ? 'The enemy broke through first. Try defending the pressured lane earlier.'
      : 'Both sides finished even. One stronger push could decide the rematch.';

  resultTitle.textContent = title;
  resultSummary.textContent = summary;
  resultOutcome.textContent = title;
  resultPlayerHp.textContent = String(playerHp);
  resultEnemyHp.textContent = String(enemyHp);
  resultCardsPlayed.textContent = String(state.cardsPlayed);
  resultTime.textContent = formatTime(Math.max(0, playedTime));
  bestResultText.textContent = state.bestSession ? state.bestSession.outcome + ' | ' + state.bestSession.score : 'No record yet';
  showOverlay(resultOverlay);
}

function togglePause() {
  if (startOverlay.classList.contains('active') || state.over || state.countdownActive) return;
  if (pauseOverlay.classList.contains('active')) {
    resumeFromPause();
  } else {
    state.paused = true;
    showOverlay(pauseOverlay);
    setStatus('Paused');
  }
}

function resumeFromPause() {
  hideOverlay(pauseOverlay);
  state.paused = false;
  setStatus('Battle live');
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

function setStatus(message) {
  statusPill.textContent = message;
}

function log(message) {
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = '<strong>' + formatTime(state.timeLeft) + '</strong> - ' + message;
  battleLog.prepend(entry);
}

function toast(message, tone) {
  const el = document.createElement('div');
  el.className = 'toast ' + (tone || 'success');
  el.textContent = message;
  toastStack.appendChild(el);
  setTimeout(function () {
    el.remove();
  }, 2800);
}

function rotateTip(force) {
  if (!force && state.tipIndex >= tipRotation.length) {
    state.tipIndex = 0;
  }
  tipText.textContent = tipRotation[state.tipIndex % tipRotation.length];
  state.tipIndex += 1;
}

function updateLanePressure() {
  const left = summarizeLane('left');
  const right = summarizeLane('right');
  leftLanePressure.textContent = left.label;
  rightLanePressure.textContent = right.label;

  const recommendedLane = left.score <= right.score ? 'left' : 'right';
  dropLanes.forEach(function (lane) {
    lane.classList.toggle('recommended', lane.dataset.lane === recommendedLane);
  });
}

function summarizeLane(lane) {
  const playerStrength = state.units.filter(function (unit) {
    return unit.side === 'player' && unit.lane === lane;
  }).reduce(function (sum, unit) {
    return sum + unit.hp;
  }, 0);
  const enemyStrength = state.units.filter(function (unit) {
    return unit.side === 'enemy' && unit.lane === lane;
  }).reduce(function (sum, unit) {
    return sum + unit.hp;
  }, 0);
  const score = enemyStrength - playerStrength;

  if (Math.abs(score) < 80) return { label: 'Balanced', score: score };
  if (score > 0) return { label: 'Enemy pressure', score: score };
  return { label: 'Your push', score: score };
}

function getLaneAdvice() {
  const left = summarizeLane('left');
  const right = summarizeLane('right');
  if (left.label === 'Enemy pressure' && right.label !== 'Enemy pressure') return 'Defend left lane first';
  if (right.label === 'Enemy pressure' && left.label !== 'Enemy pressure') return 'Defend right lane first';
  if (left.label === 'Your push' && right.label !== 'Your push') return 'Support your left lane push';
  if (right.label === 'Your push' && left.label !== 'Your push') return 'Support your right lane push';
  return 'Open the battle with either lane';
}

function totalTowerHealth(towers) {
  return towers.left + towers.right + towers.king;
}

function formatTime(seconds) {
  const safe = Math.max(0, seconds);
  const mins = String(Math.floor(safe / 60)).padStart(2, '0');
  const secs = String(safe % 60).padStart(2, '0');
  return mins + ':' + secs;
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
  if (![startOverlay, pauseOverlay, resultOverlay].some(function (el) {
    return el.classList.contains('active');
  })) {
    document.body.classList.remove('overlay-open');
    appRoot.classList.remove('dimmed');
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

function saveBestSession(outcome) {
  const score = totalTowerHealth(state.playerTowers) - totalTowerHealth(state.enemyTowers);
  const record = {
    outcome: outcome,
    score: score,
    cardsPlayed: state.cardsPlayed,
    timestamp: new Date().toISOString()
  };

  if (!state.bestSession || score > state.bestSession.score) {
    state.bestSession = record;
    try {
      localStorage.setItem('lincolnPrototypeBestSession', JSON.stringify(record));
    } catch (error) {}
  }

  updateBestSessionUi();
}

function updateBestSessionUi() {
  if (!state.bestSession) {
    bestSessionLabel.textContent = 'No record yet';
    return;
  }

  bestSessionLabel.textContent = state.bestSession.outcome + ' | score ' + state.bestSession.score;
}

function playSound(type) {
  if (!state.soundEnabled) return;

  if (!audioCtx) {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return;
    audioCtx = new AudioContextCtor();
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  const presets = {
    deploy: { frequency: 440, duration: 0.08, gain: 0.04, type: 'triangle' },
    hit: { frequency: 220, duration: 0.06, gain: 0.035, type: 'square' },
    error: { frequency: 160, duration: 0.12, gain: 0.04, type: 'sawtooth' },
    victory: { frequency: 620, duration: 0.18, gain: 0.05, type: 'triangle' },
    tick: { frequency: 520, duration: 0.05, gain: 0.03, type: 'sine' }
  };

  const preset = presets[type] || presets.deploy;
  oscillator.type = preset.type;
  oscillator.frequency.value = preset.frequency;
  gainNode.gain.value = preset.gain;
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + preset.duration);
}

init();