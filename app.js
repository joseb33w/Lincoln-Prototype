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
    description: 'Balanced melee fighter that pushes either lane.'
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
    description: 'Fast ranged unit that fires glowing arrows from distance.'
  },
  {
    id: 'giant',
    name: 'Giant',
    cost: 5,
    hp: 520,
    damage: 140,
    speed: 0.7,
    label: 'G',
    range: 10,
    attackRate: 1.15,
    projectile: false,
    description: 'Slow tank that can soak damage and crush towers.'
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
    description: 'Heavy single-target striker for quick tower pressure.'
  }
];

const towerMax = {
  left: 1400,
  right: 1400,
  king: 2400
};

const defaultDeckOrder = ['knight', 'archer', 'giant', 'miniPekka'];

const state = {
  timeLeft: 120,
  elixir: 5,
  maxElixir: 10,
  units: [],
  projectiles: [],
  nextUnitId: 1,
  nextProjectileId: 1,
  over: false,
  soundEnabled: true,
  playerDeck: [...defaultDeckOrder],
  nextDeckIndex: 0,
  draggingCardId: null,
  playerTowers: { left: 1400, right: 1400, king: 2400 },
  enemyTowers: { left: 1400, right: 1400, king: 2400 }
};

const arena = document.getElementById('arena');
const cardsEl = document.getElementById('cards');
const battleLog = document.getElementById('battleLog');
const timerEl = document.getElementById('timer');
const elixirFill = document.getElementById('elixirFill');
const elixirText = document.getElementById('elixirText');
const restartBtn = document.getElementById('restartBtn');
const soundToggleBtn = document.getElementById('soundToggleBtn');
const statusPill = document.getElementById('statusPill');
const nextCardLabel = document.getElementById('nextCardLabel');
const dropLanes = Array.from(document.querySelectorAll('.drop-lane'));

let gameLoop = null;
let timerLoop = null;
let enemyLoop = null;
let audioCtx = null;

function init() {
  bindLaneDrops();
  renderCards();
  updateHud();
  setStatus('Battle ready');
  log('Match started. Drag a card into a lane or use the quick deploy buttons.');
  clearLoops();
  gameLoop = setInterval(tick, 120);
  timerLoop = setInterval(stepTimer, 1000);
  enemyLoop = setInterval(enemyPlay, 2200);
}

function clearLoops() {
  [gameLoop, timerLoop, enemyLoop].forEach(loop => loop && clearInterval(loop));
}

function getCard(id) {
  return allCards.find(card => card.id === id);
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
  dropLanes.forEach(lane => {
    lane.addEventListener('dragover', event => {
      event.preventDefault();
      lane.classList.add('drag-over');
    });

    lane.addEventListener('dragleave', () => {
      lane.classList.remove('drag-over');
    });

    lane.addEventListener('drop', event => {
      event.preventDefault();
      lane.classList.remove('drag-over');
      const cardId = event.dataTransfer.getData('text/plain') || state.draggingCardId;
      if (cardId) {
        deployPlayer(cardId, lane.dataset.lane);
      }
      state.draggingCardId = null;
      document.querySelectorAll('.card.dragging').forEach(card => card.classList.remove('dragging'));
    });
  });
}

function renderCards() {
  cardsEl.innerHTML = '';
  const hand = getHandCards();
  const nextCard = getNextCard();
  nextCardLabel.textContent = nextCard ? nextCard.name : '-';

  hand.forEach((card, index) => {
    const cardEl = document.createElement('article');
    cardEl.className = `card ${index === 0 ? 'next-up' : ''}`;
    cardEl.draggable = true;
    cardEl.dataset.card = card.id;
    cardEl.innerHTML = `
      <h3>${card.name}</h3>
      <p>${card.description}</p>
      <p>Cost: <strong>${card.cost}</strong> | HP: <strong>${card.hp}</strong> | DMG: <strong>${card.damage}</strong></p>
      <span class="drag-hint">Drag to a glowing lane</span>
      <div class="deploy-row">
        <button data-card="${card.id}" data-lane="left">Left Lane</button>
        <button data-card="${card.id}" data-lane="right">Right Lane</button>
      </div>
    `;

    cardEl.addEventListener('dragstart', event => {
      state.draggingCardId = card.id;
      cardEl.classList.add('dragging');
      event.dataTransfer.setData('text/plain', card.id);
      event.dataTransfer.effectAllowed = 'move';
      setStatus(`Dragging ${card.name}`);
    });

    cardEl.addEventListener('dragend', () => {
      state.draggingCardId = null;
      cardEl.classList.remove('dragging');
      dropLanes.forEach(lane => lane.classList.remove('drag-over'));
    });

    cardEl.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => deployPlayer(card.id, btn.dataset.lane));
    });

    cardsEl.appendChild(cardEl);
  });
}

function deployPlayer(cardId, lane) {
  if (state.over) return;
  const card = getCard(cardId);
  if (!card || state.elixir < card.cost) {
    setStatus('Not enough elixir');
    log('Not enough elixir for that card.');
    playSound('error');
    return;
  }

  state.elixir -= card.cost;
  spawnUnit('player', card, lane);
  cycleDeck(card.id);
  renderCards();
  updateHud();
  setStatus(`${card.name} deployed ${lane}`);
  log(`You deployed ${card.name} in the ${lane} lane.`);
  playSound('deploy');
}

function enemyPlay() {
  if (state.over) return;
  const affordable = allCards.filter(card => card.cost <= 6);
  const card = affordable[Math.floor(Math.random() * affordable.length)];
  const lane = Math.random() > 0.5 ? 'left' : 'right';
  spawnUnit('enemy', card, lane);
  setStatus(`Enemy pressure in ${lane} lane`);
  log(`Enemy deployed ${card.name} in the ${lane} lane.`);
}

function spawnUnit(side, card, lane) {
  const laneEl = document.querySelector(`.${lane}-lane`) || document.querySelector('.center-lane');
  const unitEl = document.createElement('div');
  unitEl.className = `unit ${side} ${card.id === 'archer' ? 'archer' : ''}`;
  unitEl.textContent = card.label;
  laneEl.appendChild(unitEl);

  const unit = {
    uid: state.nextUnitId++,
    side,
    lane,
    cardId: card.id,
    hp: card.hp,
    maxHp: card.hp,
    damage: card.damage,
    speed: card.speed,
    range: card.range,
    projectile: card.projectile,
    projectileSpeed: card.projectileSpeed || 0,
    attackRate: card.attackRate,
    x: 50,
    y: side === 'player' ? 86 : 14,
    target: lane,
    el: unitEl,
    attackCooldown: 0
  };

  unitEl.animate([
    { transform: 'translateX(-50%) scale(0.4)', opacity: 0.1 },
    { transform: 'translateX(-50%) scale(1.12)', opacity: 1 },
    { transform: 'translateX(-50%) scale(1)', opacity: 1 }
  ], { duration: 260, easing: 'ease-out' });

  positionUnit(unit);
  state.units.push(unit);
}

function tick() {
  if (state.over) return;

  state.elixir = Math.min(state.maxElixir, state.elixir + 0.06);
  updateHud();

  state.units.forEach(unit => {
    if (unit.attackCooldown > 0) unit.attackCooldown -= 0.12;

    const opponents = state.units
      .filter(other => other.side !== unit.side && other.lane === unit.lane)
      .sort((a, b) => Math.abs(a.y - unit.y) - Math.abs(b.y - unit.y));
    const nearest = opponents[0];
    const distanceToUnit = nearest ? Math.abs(nearest.y - unit.y) : Infinity;

    if (nearest && distanceToUnit <= unit.range) {
      if (unit.attackCooldown <= 0) {
        performAttack(unit, nearest);
      }
      return;
    }

    const towerTarget = getTowerTarget(unit);
    if (towerTarget && towerTarget.inRange) {
      if (unit.attackCooldown <= 0) {
        attackTower(unit, towerTarget.key);
      }
      return;
    }

    const direction = unit.side === 'player' ? -1 : 1;
    unit.y += direction * unit.speed;
    unit.y = Math.max(12, Math.min(88, unit.y));
    positionUnit(unit);
  });

  updateProjectiles();
  state.units = state.units.filter(Boolean);
  checkWin();
}

function performAttack(unit, target) {
  unit.attackCooldown = unit.attackRate;
  flashUnit(unit.el);

  if (unit.projectile) {
    fireProjectile(unit, target.uid, 'unit');
    setStatus(`${getCard(unit.cardId).name} fired a shot`);
    playSound('hit');
    return;
  }

  target.hp -= unit.damage;
  flashUnit(target.el);
  playSound('hit');
  if (target.hp <= 0) {
    removeUnit(target.uid);
    setStatus(`${getCard(unit.cardId).name} won the duel`);
    log(`${unit.side === 'player' ? 'Your' : 'Enemy'} ${getCard(unit.cardId).name} defeated a unit.`);
  }
}

function getTowerTarget(unit) {
  const enemyKey = unit.side === 'player' ? 'enemyTowers' : 'playerTowers';
  const preferred = state[enemyKey][unit.lane] > 0 ? unit.lane : 'king';
  const towerY = unit.side === 'player'
    ? (preferred === 'king' ? 12 : 14)
    : (preferred === 'king' ? 88 : 86);
  const distance = Math.abs(unit.y - towerY);
  return {
    key: preferred,
    inRange: distance <= unit.range
  };
}

function attackTower(unit, forcedTarget) {
  const enemyKey = unit.side === 'player' ? 'enemyTowers' : 'playerTowers';
  const targetLane = forcedTarget || (state[enemyKey][unit.lane] > 0 ? unit.lane : 'king');
  unit.attackCooldown = unit.attackRate;

  if (unit.projectile) {
    fireProjectile(unit, targetLane, 'tower');
    setStatus(`${getCard(unit.cardId).name} is targeting ${targetLane} tower`);
    playSound('tower');
    return;
  }

  state[enemyKey][targetLane] = Math.max(0, state[enemyKey][targetLane] - unit.damage);
  flashUnit(unit.el);
  flashTower(unit.side === 'player' ? 'enemy' : 'player', targetLane);
  updateHud();
  setStatus(`${unit.side === 'player' ? 'Pressing' : 'Defending'} ${targetLane} tower`);
  log(`${unit.side === 'player' ? 'Your' : 'Enemy'} ${getCard(unit.cardId).name} hit the ${targetLane} tower for ${unit.damage}.`);
  playSound('tower');
}

function fireProjectile(unit, targetRef, targetType) {
  const laneEl = document.querySelector(`.${unit.lane}-lane`);
  if (!laneEl) return;

  const projectileEl = document.createElement('div');
  projectileEl.className = `projectile ${unit.side}`;
  laneEl.appendChild(projectileEl);

  const projectile = {
    id: state.nextProjectileId++,
    side: unit.side,
    lane: unit.lane,
    damage: unit.damage,
    speed: unit.projectileSpeed || 3,
    y: unit.side === 'player' ? unit.y - 4 : unit.y + 4,
    x: unit.x,
    targetRef,
    targetType,
    el: projectileEl,
    sourceCardId: unit.cardId
  };

  positionProjectile(projectile);
  state.projectiles.push(projectile);
}

function updateProjectiles() {
  state.projectiles = state.projectiles.filter(projectile => {
    const direction = projectile.side === 'player' ? -1 : 1;
    projectile.y += direction * projectile.speed;

    let hit = false;
    if (projectile.targetType === 'unit') {
      const target = state.units.find(unit => unit.uid === projectile.targetRef);
      if (!target) {
        projectile.el.remove();
        return false;
      }
      if (Math.abs(projectile.y - target.y) < 5) {
        target.hp -= projectile.damage;
        flashUnit(target.el);
        hit = true;
        if (target.hp <= 0) {
          removeUnit(target.uid);
          log(`${projectile.side === 'player' ? 'Your' : 'Enemy'} Archer landed a finishing shot.`);
        }
      }
    } else {
      const enemyKey = projectile.side === 'player' ? 'enemyTowers' : 'playerTowers';
      const towerY = projectile.side === 'player'
        ? (projectile.targetRef === 'king' ? 12 : 14)
        : (projectile.targetRef === 'king' ? 88 : 86);
      if (Math.abs(projectile.y - towerY) < 5) {
        state[enemyKey][projectile.targetRef] = Math.max(0, state[enemyKey][projectile.targetRef] - projectile.damage);
        flashTower(projectile.side === 'player' ? 'enemy' : 'player', projectile.targetRef);
        updateHud();
        log(`${projectile.side === 'player' ? 'Your' : 'Enemy'} Archer hit the ${projectile.targetRef} tower for ${projectile.damage}.`);
        hit = true;
      }
    }

    if (hit || projectile.y < 4 || projectile.y > 96) {
      projectile.el.remove();
      return false;
    }

    positionProjectile(projectile);
    return true;
  });
}

function removeUnit(uid) {
  const index = state.units.findIndex(unit => unit && unit.uid === uid);
  if (index >= 0) {
    const unit = state.units[index];
    unit.el.classList.add('defeated');
    setTimeout(() => unit.el.remove(), 160);
    state.units.splice(index, 1);
  }
}

function positionUnit(unit) {
  unit.el.style.left = `${unit.x}%`;
  unit.el.style.top = `${unit.y}%`;
}

function positionProjectile(projectile) {
  projectile.el.style.left = `${projectile.x}%`;
  projectile.el.style.top = `${projectile.y}%`;
}

function updateHud() {
  timerEl.textContent = formatTime(state.timeLeft);
  elixirFill.style.width = `${(state.elixir / state.maxElixir) * 100}%`;
  elixirText.textContent = `${Math.floor(state.elixir)} / ${state.maxElixir}`;

  updateTowerBar('player', 'left');
  updateTowerBar('player', 'right');
  updateTowerBar('player', 'king');
  updateTowerBar('enemy', 'left');
  updateTowerBar('enemy', 'right');
  updateTowerBar('enemy', 'king');

  const hand = getHandCards();
  document.querySelectorAll('.card').forEach((cardEl, index) => {
    cardEl.querySelectorAll('button').forEach(btn => {
      btn.disabled = state.elixir < hand[index].cost || state.over;
    });
  });
}

function updateTowerBar(side, tower) {
  const hp = state[`${side}Towers`][tower];
  const max = towerMax[tower];
  const fill = document.getElementById(`${side}${capitalize(tower)}Hp`);
  const text = document.getElementById(`${side}${capitalize(tower)}Text`);
  fill.style.width = `${(hp / max) * 100}%`;
  text.textContent = hp;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function stepTimer() {
  if (state.over) return;
  state.timeLeft -= 1;
  updateHud();
  if (state.timeLeft <= 0) {
    finishMatch();
  }
}

function checkWin() {
  if (state.enemyTowers.king <= 0) {
    playSound('victory');
    endGame('Victory! You destroyed the enemy king tower.');
  } else if (state.playerTowers.king <= 0) {
    playSound('defeat');
    endGame('Defeat! Your king tower has fallen.');
  }
}

function finishMatch() {
  const playerScore = Object.values(state.enemyTowers).reduce((sum, hp) => sum + hp, 0);
  const enemyScore = Object.values(state.playerTowers).reduce((sum, hp) => sum + hp, 0);
  if (playerScore < enemyScore) {
    playSound('victory');
    endGame('Victory on damage! You dealt more total damage.');
  } else if (enemyScore < playerScore) {
    playSound('defeat');
    endGame('Defeat on damage! The enemy dealt more total damage.');
  } else {
    endGame('Draw! Both sides finished even.');
  }
}

function endGame(message) {
  state.over = true;
  clearLoops();
  updateHud();
  setStatus(message);
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="overlay-card">
      <h2>${message}</h2>
      <p>The arena cools down. Reset the match and try a new strategy.</p>
      <button id="playAgainBtn">Play Again</button>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('playAgainBtn').addEventListener('click', resetGame);
}

function resetGame() {
  document.querySelector('.overlay')?.remove();
  state.timeLeft = 120;
  state.elixir = 5;
  state.units.forEach(unit => unit.el.remove());
  state.projectiles.forEach(projectile => projectile.el.remove());
  state.units = [];
  state.projectiles = [];
  state.nextUnitId = 1;
  state.nextProjectileId = 1;
  state.over = false;
  state.playerDeck = [...defaultDeckOrder];
  state.nextDeckIndex = 0;
  state.draggingCardId = null;
  state.playerTowers = { left: 1400, right: 1400, king: 2400 };
  state.enemyTowers = { left: 1400, right: 1400, king: 2400 };
  battleLog.innerHTML = '';
  renderCards();
  init();
}

function setStatus(message) {
  statusPill.textContent = message;
}

function log(message) {
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `<strong>${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong> - ${message}`;
  battleLog.prepend(entry);
  while (battleLog.children.length > 12) {
    battleLog.removeChild(battleLog.lastChild);
  }
}

function flashUnit(el) {
  el.classList.add('attacking');
  setTimeout(() => el.classList.remove('attacking'), 140);
}

function flashTower(side, lane) {
  const tower = document.querySelector(`.tower.${side}[data-target="${lane}"]`);
  if (!tower) return;
  tower.animate([
    { filter: 'brightness(1)' },
    { filter: 'brightness(1.8)' },
    { filter: 'brightness(1)' }
  ], { duration: 220, easing: 'ease-out' });
}

function formatTime(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playTone(frequency, duration, type = 'sine', gainValue = 0.03) {
  if (!state.soundEnabled) return;
  ensureAudio();
  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.value = gainValue;
  oscillator.connect(gain);
  gain.connect(audioCtx.destination);
  oscillator.start();
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
  oscillator.stop(audioCtx.currentTime + duration);
}

function playSound(type) {
  if (!state.soundEnabled) return;
  switch (type) {
    case 'deploy':
      playTone(440, 0.12, 'triangle', 0.05);
      setTimeout(() => playTone(660, 0.08, 'triangle', 0.04), 50);
      break;
    case 'hit':
      playTone(180, 0.08, 'square', 0.03);
      break;
    case 'tower':
      playTone(120, 0.14, 'sawtooth', 0.035);
      break;
    case 'victory':
      playTone(523, 0.14, 'triangle', 0.05);
      setTimeout(() => playTone(659, 0.14, 'triangle', 0.05), 120);
      setTimeout(() => playTone(784, 0.2, 'triangle', 0.05), 240);
      break;
    case 'defeat':
      playTone(220, 0.18, 'sawtooth', 0.04);
      setTimeout(() => playTone(174, 0.22, 'sawtooth', 0.035), 140);
      break;
    case 'error':
      playTone(160, 0.08, 'square', 0.03);
      setTimeout(() => playTone(120, 0.1, 'square', 0.03), 60);
      break;
  }
}

restartBtn.addEventListener('click', resetGame);
soundToggleBtn.addEventListener('click', () => {
  state.soundEnabled = !state.soundEnabled;
  soundToggleBtn.textContent = `Sound: ${state.soundEnabled ? 'On' : 'Off'}`;
  if (state.soundEnabled) {
    playTone(520, 0.08, 'triangle', 0.04);
  }
});

document.body.addEventListener('click', () => {
  if (state.soundEnabled) ensureAudio();
}, { once: true });

init();