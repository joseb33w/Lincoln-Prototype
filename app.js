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
  selectedTouchCardId: null,
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
  log('Match started. Drag a card into a lane or tap-select one on mobile, then tap a glowing lane.');
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
      if (cardId) deployPlayer(cardId, lane.dataset.lane);
      clearTouchSelection();
      document.querySelectorAll('.card.dragging').forEach(card => card.classList.remove('dragging'));
    });

    lane.addEventListener('click', () => {
      if (state.selectedTouchCardId) {
        deployPlayer(state.selectedTouchCardId, lane.dataset.lane);
      }
    });

    lane.addEventListener('touchstart', event => {
      if (state.selectedTouchCardId) {
        event.preventDefault();
        lane.classList.add('touch-target');
      }
    }, { passive: false });

    lane.addEventListener('touchend', event => {
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

  hand.forEach((card, index) => {
    const cardEl = document.createElement('article');
    cardEl.className = `card ${index === 0 ? 'next-up' : ''} ${state.selectedTouchCardId === card.id ? 'selected-touch' : ''}`;
    cardEl.draggable = true;
    cardEl.dataset.card = card.id;
    cardEl.innerHTML = `
      <h3>${card.name}</h3>
      <p>${card.description}</p>
      <p>Cost: <strong>${card.cost}</strong> | HP: <strong>${card.hp}</strong> | DMG: <strong>${card.damage}</strong></p>
      <span class="drag-hint">Drag to a glowing lane</span>
      <span class="ability-tag">${card.abilityLabel || 'Arena unit'}</span>
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

    cardEl.addEventListener('click', event => {
      if (event.target.tagName === 'BUTTON') return;
      toggleTouchSelection(card.id);
    });

    cardEl.addEventListener('touchstart', () => {
      toggleTouchSelection(card.id);
    }, { passive: true });

    cardEl.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => deployPlayer(card.id, btn.dataset.lane));
    });

    cardsEl.appendChild(cardEl);
  });
}

function toggleTouchSelection(cardId) {
  state.selectedTouchCardId = state.selectedTouchCardId === cardId ? null : cardId;
  const card = getCard(state.selectedTouchCardId);
  setStatus(card ? `${card.name} selected - tap a lane` : 'Battle ready');
  dropLanes.forEach(lane => lane.classList.toggle('touch-target', !!state.selectedTouchCardId));
  renderCards();
}

function clearTouchSelection() {
  state.selectedTouchCardId = null;
  dropLanes.forEach(lane => lane.classList.remove('touch-target'));
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
  clearTouchSelection();
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
  unitEl.className = `unit ${side} ${card.id === 'archer' ? 'archer' : ''} ${card.id}`;
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
    splashRadius: card.splashRadius || 0,
    stunDuration: card.stunDuration || 0,
    dashRange: card.dashRange || 0,
    dashSpeed: card.dashSpeed || 0,
    x: 50,
    y: side === 'player' ? 86 : 14,
    target: lane,
    el: unitEl,
    hpFill,
    attackCooldown: 0,
    stunnedFor: 0
  };

  unitEl.animate([
    { transform: 'translateX(-50%) scale(0.4)', opacity: 0.1 },
    { transform: 'translateX(-50%) scale(1.12)', opacity: 1 },
    { transform: 'translateX(-50%) scale(1)', opacity: 1 }
  ], { duration: 260, easing: 'ease-out' });

  positionUnit(unit);
  updateUnitHp(unit);
  state.units.push(unit);
}

function tick() {
  if (state.over) return;

  state.elixir = Math.min(state.maxElixir, state.elixir + 0.06);
  updateHud();

  state.units.forEach(unit => {
    if (!unit) return;
    if (unit.attackCooldown > 0) unit.attackCooldown -= 0.12;
    if (unit.stunnedFor > 0) {
      unit.stunnedFor -= 0.12;
      unit.el.classList.add('stunned');
      if (unit.stunnedFor <= 0) unit.el.classList.remove('stunned');
      return;
    }

    const opponents = state.units
      .filter(other => other && other.side !== unit.side && other.lane === unit.lane)
      .sort((a, b) => Math.abs(a.y - unit.y) - Math.abs(b.y - unit.y));
    const nearest = opponents[0];
    const distanceToUnit = nearest ? Math.abs(nearest.y - unit.y) : Infinity;

    if (nearest && distanceToUnit <= unit.range) {
      if (unit.cardId === 'miniPekka' && unit.attackCooldown <= 0 && distanceToUnit <= unit.dashRange && distanceToUnit > 8) {
        const direction = unit.side === 'player' ? -1 : 1;
        unit.y += direction * unit.dashSpeed;
        unit.y = Math.max(12, Math.min(88, unit.y));
        positionUnit(unit);
        setStatus('Mini Bot dash strike');
      }
      if (unit.attackCooldown <= 0) performAttack(unit, nearest);
      return;
    }

    const towerTarget = getTowerTarget(unit);
    if (towerTarget && towerTarget.inRange) {
      if (unit.attackCooldown <= 0) attackTower(unit, towerTarget.key);
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

  applyDamageToUnit(target, unit.damage, unit);
  if (unit.stunDuration) {
    target.stunnedFor = Math.max(target.stunnedFor || 0, unit.stunDuration);
    target.el.classList.add('stunned');
  }
  playSound('hit');
}

function applyDamageToUnit(target, amount, attacker) {
  if (!target) return;
  target.hp -= amount;
  flashUnit(target.el);
  updateUnitHp(target);
  if (target.hp <= 0) {
    removeUnit(target.uid);
    if (attacker) {
      setStatus(`${getCard(attacker.cardId).name} won the duel`);
      log(`${attacker.side === 'player' ? 'Your' : 'Enemy'} ${getCard(attacker.cardId).name} defeated a unit.`);
    }
  }
}

function getTowerTarget(unit) {
  const enemyKey = unit.side === 'player' ? 'enemyTowers' : 'playerTowers';
  const preferred = state[enemyKey][unit.lane] > 0 ? unit.lane : 'king';
  const towerY = unit.side === 'player'
    ? (preferred === 'king' ? 12 : 14)
    : (preferred === 'king' ? 88 : 86);
  const distance = Math.abs(unit.y - towerY);
  return { key: preferred, inRange: distance <= unit.range };
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

  damageTower(unit, targetLane, unit.damage);
}

function damageTower(unit, targetLane, amount) {
  const enemyKey = unit.side === 'player' ? 'enemyTowers' : 'playerTowers';
  state[enemyKey][targetLane] = Math.max(0, state[enemyKey][targetLane] - amount);
  flashUnit(document.querySelector(`.tower[data-side="${unit.side === 'player' ? 'enemy' : 'player'}"][data-target="${targetLane}"]`));
  updateHud();
  playSound('tower');
  if (state[enemyKey][targetLane] === 0) {
    log(`${unit.side === 'player' ? 'Enemy' : 'Your'} ${targetLane} tower has fallen.`);
  }
}

function fireProjectile(unit, targetRef, targetType) {
  const laneEl = document.querySelector(`.${unit.lane}-lane`) || document.querySelector('.center-lane');
  const projectileEl = document.createElement('div');
  projectileEl.className = `projectile ${unit.side} ${unit.splashRadius ? 'splash' : ''}`;
  laneEl.appendChild(projectileEl);

  const projectile = {
    id: state.nextProjectileId++,
    side: unit.side,
    lane: unit.lane,
    y: unit.y,
    x: 50,
    speed: unit.projectileSpeed || 3,
    damage: unit.damage,
    targetRef,
    targetType,
    splashRadius: unit.splashRadius || 0,
    stunDuration: unit.stunDuration || 0,
    sourceCardId: unit.cardId,
    el: projectileEl
  };

  positionProjectile(projectile);
  state.projectiles.push(projectile);
}

function updateProjectiles() {
  state.projectiles = state.projectiles.filter(projectile => {
    const direction = projectile.side === 'player' ? -1 : 1;
    projectile.y += direction * projectile.speed;
    positionProjectile(projectile);

    if (projectile.targetType === 'unit') {
      const target = state.units.find(unit => unit && unit.uid === projectile.targetRef);
      if (!target) {
        projectile.el.remove();
        return false;
      }
      if (Math.abs(target.y - projectile.y) <= 4) {
        applyDamageToUnit(target, projectile.damage, { cardId: projectile.sourceCardId, side: projectile.side });
        if (projectile.stunDuration) {
          target.stunnedFor = Math.max(target.stunnedFor || 0, projectile.stunDuration);
          target.el.classList.add('stunned');
        }
        if (projectile.splashRadius) {
          state.units
            .filter(unit => unit && unit.side !== projectile.side && unit.lane === projectile.lane && Math.abs(unit.y - target.y) <= projectile.splashRadius && unit.uid !== target.uid)
            .forEach(unit => applyDamageToUnit(unit, Math.round(projectile.damage * 0.55), { cardId: projectile.sourceCardId, side: projectile.side }));
        }
        projectile.el.remove();
        return false;
      }
    } else {
      const towerY = projectile.side === 'player'
        ? (projectile.targetRef === 'king' ? 12 : 14)
        : (projectile.targetRef === 'king' ? 88 : 86);
      if (Math.abs(towerY - projectile.y) <= 4) {
        damageTower({ side: projectile.side }, projectile.targetRef, projectile.damage);
        projectile.el.remove();
        return false;
      }
    }

    if (projectile.y < 8 || projectile.y > 92) {
      projectile.el.remove();
      return false;
    }

    return true;
  });
}

function positionUnit(unit) {
  unit.el.style.left = `${unit.x}%`;
  unit.el.style.top = `${unit.y}%`;
}

function positionProjectile(projectile) {
  projectile.el.style.left = `${projectile.x}%`;
  projectile.el.style.top = `${projectile.y}%`;
}

function updateUnitHp(unit) {
  if (!unit?.hpFill) return;
  const pct = Math.max(0, (unit.hp / unit.maxHp) * 100);
  unit.hpFill.style.width = `${pct}%`;
}

function removeUnit(uid) {
  const index = state.units.findIndex(unit => unit && unit.uid === uid);
  if (index === -1) return;
  const unit = state.units[index];
  unit.el.classList.add('defeated');
  setTimeout(() => unit.el.remove(), 180);
  state.units[index] = null;
}

function flashUnit(el) {
  if (!el) return;
  el.classList.add('attacking');
  setTimeout(() => el.classList.remove('attacking'), 140);
}

function stepTimer() {
  if (state.over) return;
  state.timeLeft -= 1;
  updateHud();
  if (state.timeLeft <= 0) endGame(resolveWinnerByHealth());
}

function resolveWinnerByHealth() {
  const playerTotal = Object.values(state.playerTowers).reduce((a, b) => a + b, 0);
  const enemyTotal = Object.values(state.enemyTowers).reduce((a, b) => a + b, 0);
  return playerTotal >= enemyTotal ? 'player' : 'enemy';
}

function checkWin() {
  if (state.enemyTowers.king <= 0) endGame('player');
  else if (state.playerTowers.king <= 0) endGame('enemy');
}

function endGame(winner) {
  if (state.over) return;
  state.over = true;
  clearLoops();
  setStatus(winner === 'player' ? 'Victory!' : 'Defeat');
  log(winner === 'player' ? 'You shattered the enemy core.' : 'Your fortress has fallen.');
  playSound(winner === 'player' ? 'victory' : 'defeat');

  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="overlay-card">
      <h2>${winner === 'player' ? 'Victory' : 'Defeat'}</h2>
      <p>${winner === 'player' ? 'Your neon battalion outplayed the enemy.' : 'The enemy seized the arena this time.'}</p>
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
  state.units.forEach(unit => unit?.el?.remove());
  state.projectiles.forEach(projectile => projectile?.el?.remove());
  state.units = [];
  state.projectiles = [];
  state.nextUnitId = 1;
  state.nextProjectileId = 1;
  state.over = false;
  state.playerDeck = [...defaultDeckOrder];
  state.nextDeckIndex = 0;
  state.draggingCardId = null;
  state.selectedTouchCardId = null;
  state.playerTowers = { left: 1400, right: 1400, king: 2400 };
  state.enemyTowers = { left: 1400, right: 1400, king: 2400 };
  renderCards();
  updateHud();
  battleLog.innerHTML = '';
  init();
}

function updateHud() {
  timerEl.textContent = `${String(Math.floor(state.timeLeft / 60)).padStart(2, '0')}:${String(state.timeLeft % 60).padStart(2, '0')}`;
  elixirFill.style.width = `${(state.elixir / state.maxElixir) * 100}%`;
  elixirText.textContent = `${Math.floor(state.elixir)} / ${state.maxElixir}`;
  updateTowerBar('enemyLeft', state.enemyTowers.left, towerMax.left);
  updateTowerBar('enemyRight', state.enemyTowers.right, towerMax.right);
  updateTowerBar('enemyKing', state.enemyTowers.king, towerMax.king);
  updateTowerBar('playerLeft', state.playerTowers.left, towerMax.left);
  updateTowerBar('playerRight', state.playerTowers.right, towerMax.right);
  updateTowerBar('playerKing', state.playerTowers.king, towerMax.king);
}

function updateTowerBar(prefix, value, max) {
  document.getElementById(`${prefix}Hp`).style.width = `${Math.max(0, (value / max) * 100)}%`;
  document.getElementById(`${prefix}Text`).textContent = value;
}

function setStatus(text) {
  statusPill.textContent = text;
}

function log(message) {
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `<strong>${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong> - ${message}`;
  battleLog.prepend(entry);
  while (battleLog.children.length > 10) battleLog.removeChild(battleLog.lastChild);
}

function ensureAudio() {
  if (!state.soundEnabled) return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playSound(type) {
  const ctx = ensureAudio();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  const presets = {
    deploy: [220, 0.05, 'triangle'],
    hit: [420, 0.04, 'square'],
    tower: [160, 0.07, 'sawtooth'],
    victory: [620, 0.18, 'triangle'],
    defeat: [120, 0.18, 'sine'],
    error: [90, 0.08, 'square']
  };

  const [freq, duration, wave] = presets[type] || presets.hit;
  osc.type = wave;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.1, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

restartBtn.addEventListener('click', resetGame);
soundToggleBtn.addEventListener('click', () => {
  state.soundEnabled = !state.soundEnabled;
  soundToggleBtn.textContent = `Sound: ${state.soundEnabled ? 'On' : 'Off'}`;
  setStatus(state.soundEnabled ? 'Sound enabled' : 'Sound muted');
});

init();
