const cards = [
  {
    id: 'knight',
    name: 'Knight',
    cost: 3,
    hp: 260,
    damage: 90,
    speed: 1.1,
    lanePreference: 'left',
    label: 'K',
    description: 'Balanced melee fighter that pushes one lane.'
  },
  {
    id: 'archer',
    name: 'Archer',
    cost: 2,
    hp: 180,
    damage: 70,
    speed: 1.35,
    lanePreference: 'right',
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
    lanePreference: 'left',
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
    lanePreference: 'right',
    label: 'M',
    description: 'Heavy single-target striker for quick tower pressure.'
  }
];

const towerMax = {
  left: 1400,
  right: 1400,
  king: 2400
};

const state = {
  timeLeft: 120,
  elixir: 5,
  maxElixir: 10,
  units: [],
  nextUnitId: 1,
  over: false,
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

let gameLoop = null;
let timerLoop = null;
let enemyLoop = null;

function init() {
  renderCards();
  updateHud();
  log('Match started. Deploy units into either lane.');
  clearLoops();
  gameLoop = setInterval(tick, 120);
  timerLoop = setInterval(stepTimer, 1000);
  enemyLoop = setInterval(enemyPlay, 2200);
}

function clearLoops() {
  [gameLoop, timerLoop, enemyLoop].forEach(loop => loop && clearInterval(loop));
}

function renderCards() {
  cardsEl.innerHTML = '';
  cards.forEach(card => {
    const cardEl = document.createElement('article');
    cardEl.className = 'card';
    cardEl.innerHTML = `
      <h3>${card.name}</h3>
      <p>${card.description}</p>
      <p>Cost: <strong>${card.cost}</strong> | HP: <strong>${card.hp}</strong> | DMG: <strong>${card.damage}</strong></p>
      <button data-card="${card.id}">Deploy to ${card.lanePreference} lane</button>
    `;
    cardEl.querySelector('button').addEventListener('click', () => deployPlayer(card.id));
    cardsEl.appendChild(cardEl);
  });
}

function deployPlayer(cardId) {
  if (state.over) return;
  const card = cards.find(c => c.id === cardId);
  if (!card || state.elixir < card.cost) {
    log('Not enough elixir for that card.');
    return;
  }
  state.elixir -= card.cost;
  spawnUnit('player', card, card.lanePreference);
  log(`You deployed ${card.name} in the ${card.lanePreference} lane.`);
  updateHud();
}

function enemyPlay() {
  if (state.over) return;
  const affordable = cards.filter(card => card.cost <= 6);
  const card = affordable[Math.floor(Math.random() * affordable.length)];
  const lane = Math.random() > 0.5 ? 'left' : 'right';
  spawnUnit('enemy', card, lane);
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
        flashUnit(nearest.el);
        if (nearest.hp <= 0) {
          removeUnit(nearest.uid);
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
    flashTower(unit.side === 'player' ? 'enemy' : 'player', targetLane);
    updateHud();
    log(`${unit.side === 'player' ? 'Your' : 'Enemy'} ${getCard(unit.cardId).name} hit the ${targetLane} tower for ${unit.damage}.`);
  }

  positionUnit(unit);
}

function getCard(id) {
  return cards.find(card => card.id === id);
}

function removeUnit(uid) {
  const index = state.units.findIndex(unit => unit && unit.uid === uid);
  if (index >= 0) {
    state.units[index].el.remove();
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

  document.querySelectorAll('.card button').forEach((btn, index) => {
    btn.disabled = state.elixir < cards[index].cost || state.over;
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
    endGame('Victory! You destroyed the enemy king tower.');
  } else if (state.playerTowers.king <= 0) {
    endGame('Defeat! Your king tower has fallen.');
  }
}

function finishMatch() {
  const playerScore = Object.values(state.enemyTowers).reduce((sum, hp) => sum + hp, 0);
  const enemyScore = Object.values(state.playerTowers).reduce((sum, hp) => sum + hp, 0);
  if (playerScore < enemyScore) {
    endGame('Victory on damage! You dealt more total damage.');
  } else if (enemyScore < playerScore) {
    endGame('Defeat on damage! The enemy dealt more total damage.');
  } else {
    endGame('Draw! Both sides finished even.');
  }
}

function endGame(message) {
  state.over = true;
  clearLoops();
  updateHud();
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
    playerTowers: { left: 1400, right: 1400, king: 2400 },
    enemyTowers: { left: 1400, right: 1400, king: 2400 }
  });
  battleLog.innerHTML = '';
  updateHud();
  log('New match started. Good luck!');
  init();
}

function flashUnit(el) {
  el.animate([
    { transform: 'translateX(-50%) scale(1)' },
    { transform: 'translateX(-50%) scale(1.18)' },
    { transform: 'translateX(-50%) scale(1)' }
  ], { duration: 220 });
}

function flashTower(side, tower) {
  const towers = [...document.querySelectorAll('.tower')].filter(el => {
    const target = el.dataset.target;
    const sideName = el.dataset.side;
    return sideName === side && target === tower;
  });
  towers.forEach(towerEl => {
    towerEl.animate([
      { filter: 'brightness(1)' },
      { filter: 'brightness(1.8)' },
      { filter: 'brightness(1)' }
    ], { duration: 240 });
  });
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

restartBtn.addEventListener('click', resetGame);

init();