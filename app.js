const allCards = [
  {
    id: 'knight',
    name: 'Knight',
    cost: 3,
    hp: 260,
    damage: 90,
    speed: 1.1,
    label: 'K',
    description: 'Balanced melee fighter that pushes either lane.'
  },
  {
    id: 'archer',
    name: 'Archer',
    cost: 2,
    hp: 180,
    damage: 70,
    speed: 1.35,
    label: 'A',
    description: 'Fast ranged unit with low health and steady damage.'
  },
  {
    id: 'giant',
    name: 'Giant',
    cost: 5,
    hp: 520,
    damage: 140,
    speed: 0.7,
    label: 'G',
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
  nextUnitId: 1,
  over: false,
  soundEnabled: true,
  playerDeck: [...defaultDeckOrder],
  nextDeckIndex: 0,
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

let gameLoop = null;
let timerLoop = null;
let enemyLoop = null;
let audioCtx = null;

function init() {
  renderCards();
  updateHud();
  setStatus('Battle ready');
  log('Match started. Choose a card and deploy it into either lane.');
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

function renderCards() {
  cardsEl.innerHTML = '';
  const hand = getHandCards();
  const nextCard = getNextCard();
  nextCardLabel.textContent = nextCard ? nextCard.name : '-';

  hand.forEach((card, index) => {
    const cardEl = document.createElement('article');
    cardEl.className = `card ${index === 0 ? 'next-up' : ''}`;
    cardEl.innerHTML = `
      <h3>${card.name}</h3>
      <p>${card.description}</p>
      <p>Cost: <strong>${card.cost}</strong> | HP: <strong>${card.hp}</strong> | DMG: <strong>${card.damage}</strong></p>
      <div class="deploy-row">
        <button data-card="${card.id}" data-lane="left">Left Lane</button>
        <button data-card="${card.id}" data-lane="right">Right Lane</button>
      </div>
    `;
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
  unitEl.className = `unit ${side}`;
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

    const opponents = state.units.filter(other => other.side !== unit.side && other.lane === unit.lane);
    const nearest = opponents.find(other => Math.abs(other.y - unit.y) < 12);

    if (nearest) {
      if (unit.attackCooldown <= 0) {
        nearest.hp -= unit.damage;
        unit.attackCooldown = 0.9;
        flashUnit(unit.el);
        flashUnit(nearest.el);
        playSound('hit');
        if (nearest.hp <= 0) {
          removeUnit(nearest.uid);
          setStatus(`${getCard(unit.cardId).name} won the duel`);
          log(`${unit.side === 'player' ? 'Your' : 'Enemy'} ${getCard(unit.cardId).name} defeated a unit.`);
        }
      }
      return;
    }

    const direction = unit.side === 'player' ? -1 : 1;
    unit.y += direction * unit.speed;

    const reachedTower = unit.side === 'player' ? unit.y <= 18 : unit.y >= 82;
    if (reachedTower) {
      attackTower(unit);
      return;
    }

    positionUnit(unit);
  });

  state.units = state.units.filter(Boolean);
  checkWin();
}

function attackTower(unit) {
  const enemyKey = unit.side === 'player' ? 'enemyTowers' : 'playerTowers';
  const targetLane = state[enemyKey][unit.lane] > 0 ? unit.lane : 'king';

  if (unit.attackCooldown <= 0) {
    state[enemyKey][targetLane] = Math.max(0, state[enemyKey][targetLane] - unit.damage);
    unit.attackCooldown = 0.9;
    flashUnit(unit.el);
    flashTower(unit.side === 'player' ? 'enemy' : 'player', targetLane);
    updateHud();
    setStatus(`${unit.side === 'player' ? 'Pressing' : 'Defending'} ${targetLane} tower`);
    log(`${unit.side === 'player' ? 'Your' : 'Enemy'} ${getCard(unit.cardId).name} hit the ${targetLane} tower for ${unit.damage}.`);
    playSound('tower');
  }

  positionUnit(unit);
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
      <p>Press restart to play another quick arena match.</p>
      <button id="playAgainBtn">Play Again</button>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('playAgainBtn').addEventListener('click', resetGame);
}

function resetGame() {
  document.querySelectorAll('.unit').forEach(unit => unit.remove());
  document.querySelector('.overlay')?.remove();
  Object.assign(state, {
    timeLeft: 120,
    elixir: 5,
    units: [],
    nextUnitId: 1,
    over: false,
    soundEnabled: state.soundEnabled,
    playerDeck: [...defaultDeckOrder],
    nextDeckIndex: 0,
    playerTowers: { left: 1400, right: 1400, king: 2400 },
    enemyTowers: { left: 1400, right: 1400, king: 2400 }
  });
  battleLog.innerHTML = '';
  renderCards();
  updateHud();
  setStatus('New match started');
  log('New match started. Good luck!');
  init();
}

function flashUnit(el) {
  el.classList.add('attacking');
  el.animate([
    { transform: 'translateX(-50%) scale(1)' },
    { transform: 'translateX(-50%) scale(1.22)' },
    { transform: 'translateX(-50%) scale(1)' }
  ], { duration: 220 });
  setTimeout(() => el.classList.remove('attacking'), 180);
}

function flashTower(side, tower) {
  const towers = [...document.querySelectorAll('.tower')].filter(el => {
    const target = el.dataset.target;
    const sideName = el.dataset.side;
    return sideName === side && target === tower;
  });
  towers.forEach(towerEl => {
    towerEl.animate([
      { filter: 'brightness(1)', transform: 'translateX(-50%) scale(1)' },
      { filter: 'brightness(1.8)', transform: 'translateX(-50%) scale(1.07)' },
      { filter: 'brightness(1)', transform: 'translateX(-50%) scale(1)' }
    ], { duration: 240 });
  });
}

function setStatus(message) {
  statusPill.textContent = message;
}

function log(message) {
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `<strong>${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong> - ${message}`;
  battleLog.prepend(entry);
}

function formatTime(seconds) {
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

function ensureAudio() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(freq, duration, type = 'sine', volume = 0.03) {
  if (!state.soundEnabled) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = volume;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.stop(ctx.currentTime + duration);
}

function playSound(kind) {
  if (!state.soundEnabled) return;
  if (kind === 'deploy') {
    playTone(440, 0.08, 'square', 0.04);
    setTimeout(() => playTone(660, 0.08, 'square', 0.03), 60);
  } else if (kind === 'hit') {
    playTone(180, 0.06, 'sawtooth', 0.03);
  } else if (kind === 'tower') {
    playTone(140, 0.12, 'triangle', 0.05);
  } else if (kind === 'victory') {
    playTone(523, 0.12, 'triangle', 0.04);
    setTimeout(() => playTone(659, 0.12, 'triangle', 0.04), 120);
    setTimeout(() => playTone(784, 0.18, 'triangle', 0.05), 240);
  } else if (kind === 'defeat') {
    playTone(300, 0.12, 'sawtooth', 0.04);
    setTimeout(() => playTone(220, 0.18, 'sawtooth', 0.04), 120);
  } else if (kind === 'error') {
    playTone(170, 0.08, 'square', 0.025);
  }
}

soundToggleBtn.addEventListener('click', () => {
  state.soundEnabled = !state.soundEnabled;
  soundToggleBtn.textContent = `Sound: ${state.soundEnabled ? 'On' : 'Off'}`;
  if (state.soundEnabled) {
    playTone(520, 0.08, 'triangle', 0.03);
  }
});

restartBtn.addEventListener('click', resetGame);

document.body.addEventListener('click', () => {
  ensureAudio();
}, { once: true });

init();
