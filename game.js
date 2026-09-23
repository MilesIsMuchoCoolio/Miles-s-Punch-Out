const enemies = [
  { name: 'VOLT BRICK', hp: 100, jab: 8, hook: 12, upper: 16 },
  { name: 'IRON GLO', hp: 110, jab: 10, hook: 14, upper: 18 },
  { name: 'NOVA BLADE', hp: 120, jab: 12, hook: 16, upper: 20 }
];

const state = {
  started: false,
  gameOver: false,
  round: 0,
  playerHp: 100,
  enemyHp: 100,
  star: 0,
  combo: 0,
  enemyIndex: 0,
  timer: 60,
  facing: 1,
  block: false,
  enemyBusy: false,
  playerBusy: false,
  enemyMoveTimer: null,
  clockTimer: null,
  pressed: new Set(),
};

const elements = {
  titleScreen: document.getElementById('titleScreen'),
  roundLabel: document.getElementById('roundLabel'),
  timer: document.getElementById('timer'),
  playerHp: document.getElementById('playerHp'),
  enemyHp: document.getElementById('enemyHp'),
  statusText: document.getElementById('statusText'),
  enemyName: document.getElementById('enemyName'),
  impactText: document.getElementById('impactText'),
  comboText: document.getElementById('comboText'),
  starMeter: document.getElementById('starMeter'),
  player: document.getElementById('player'),
  enemy: document.getElementById('enemy'),
  messageBanner: document.getElementById('messageBanner'),
  messageTitle: document.getElementById('messageTitle'),
  messageSub: document.getElementById('messageSub'),
  startButton: document.getElementById('startButton'),
  restartButton: document.getElementById('restartButton'),
};

function updateHud() {
  elements.playerHp.style.width = `${Math.max(0, state.playerHp)}%`;
  elements.enemyHp.style.width = `${Math.max(0, state.enemyHp)}%`;
  elements.starMeter.style.width = `${state.star}%`;
  elements.comboText.textContent = `${state.combo} HIT COMBO`;
  elements.timer.textContent = String(state.timer).padStart(2, '0');
  elements.roundLabel.textContent = String(state.round);
}

function flashImpact(text) {
  elements.impactText.textContent = text;
  elements.impactText.classList.remove('show');
  void elements.impactText.offsetWidth;
  elements.impactText.classList.add('show');
}

function setBanner(title, sub, show = true) {
  elements.messageTitle.textContent = title;
  elements.messageSub.textContent = sub;
  elements.messageBanner.classList.toggle('hidden', !show);
}

function fireTone(type = 'hit') {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  const ctx = new AudioContextClass();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type === 'power' ? 'square' : 'triangle';
  osc.frequency.value = type === 'power' ? 160 : 260;
  gain.gain.value = 0.04;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.09);
  setTimeout(() => ctx.close(), 120);
}

function setPlayerFacing(dir) {
  state.facing = dir;
  const x = dir === -1 ? -32 : 32;
  elements.player.style.transform = `translateX(${x}px)`;
  setTimeout(() => {
    if (!state.gameOver) elements.player.style.transform = '';
  }, 120);
}

function startGame() {
  state.started = true;
  state.gameOver = false;
  state.enemyIndex = 0;
  state.round = 1;
  state.playerHp = 100;
  state.star = 0;
  state.combo = 0;
  state.timer = 60;
  state.block = false;
  elements.titleScreen.classList.add('hidden');
  enterRound();
  updateHud();
  elements.statusText.textContent = 'READY';
}

function enterRound() {
  const enemy = enemies[state.enemyIndex];
  state.enemyHp = enemy.hp;
  state.enemyBusy = false;
  state.playerBusy = false;
  state.block = false;
  elements.enemyName.textContent = enemy.name;
  elements.statusText.textContent = `ROUND ${state.round}`;
  setBanner(`ROUND ${state.round}`, enemy.name, true);
  setTimeout(() => setBanner('', '', false), 1100);
  updateHud();

  if (state.enemyMoveTimer) clearTimeout(state.enemyMoveTimer);
  state.enemyMoveTimer = setTimeout(enemyTurn, 700);
}

function finishPlayerWin() {
  state.started = false;
  state.gameOver = true;
  if (state.enemyMoveTimer) clearTimeout(state.enemyMoveTimer);
  if (state.clockTimer) clearInterval(state.clockTimer);
  elements.statusText.textContent = 'VICTORY';
  const isFinal = state.enemyIndex >= enemies.length - 1;
  if (isFinal) {
    setBanner('YOU WIN', 'DOWNTOWN CHAMPION', true);
  } else {
    setBanner('ROUND CLEARED', 'NEXT OPPONENT', true);
    setTimeout(() => {
      state.round += 1;
      state.enemyIndex += 1;
      state.started = true;
      state.gameOver = false;
      state.timer = 60;
      enterRound();
      updateHud();
    }, 1400);
  }
}

function finishPlayerLoss() {
  state.started = false;
  state.gameOver = true;
  if (state.enemyMoveTimer) clearTimeout(state.enemyMoveTimer);
  if (state.clockTimer) clearInterval(state.clockTimer);
  elements.statusText.textContent = 'DOWN';
  setBanner('YOU LOST', 'PRESS RESTART', true);
}

function doPlayerAttack(type) {
  if (!state.started || state.gameOver || state.playerBusy || state.enemyBusy) return;

  const dir = state.pressed.has('a') ? -1 : state.pressed.has('d') ? 1 : state.facing;
  state.playerBusy = true;

  if (type === 'upper') {
    if (!state.pressed.has('a') && !state.pressed.has('d')) return;
    elements.player.style.transform = `translateY(-8px) rotate(${dir * 10}deg)`;
    setTimeout(() => {
      elements.player.style.transform = '';
    }, 130);
    state.enemyHp = Math.max(0, state.enemyHp - 18);
    state.combo += 1;
    state.star = Math.min(100, state.star + 12);
    flashImpact('UP!');
    fireTone('power');
    elements.statusText.textContent = 'UPPERCUT';
    updateHud();
    state.playerBusy = false;

    if (state.enemyHp <= 0) {
      finishPlayerWin();
      return;
    }

    enemyTurn();
    return;
  }

  if (type === 'body') {
    const bodyDamage = dir === 0 ? 10 : 9;
    elements.player.style.transform = `translateX(${dir * 18}px)`;
    setTimeout(() => (elements.player.style.transform = ''), 120);
    state.enemyHp = Math.max(0, state.enemyHp - bodyDamage);
    state.combo += 1;
    state.star = Math.min(100, state.star + 11);
    flashImpact('POW!');
    fireTone('hit');
    elements.statusText.textContent = 'BODY BLOW';
    updateHud();
    state.playerBusy = false;

    if (state.enemyHp <= 0) {
      finishPlayerWin();
      return;
    }

    enemyTurn();
    return;
  }

  if (type === 'star') {
    if (state.star < 100) {
      flashImpact('CHARGE');
      elements.statusText.textContent = 'CHARGING';
      state.playerBusy = false;
      return;
    }

    state.star = 0;
    state.enemyHp = Math.max(0, state.enemyHp - 34);
    state.combo += 2;
    flashImpact('STAR!');
    fireTone('power');
    elements.statusText.textContent = 'STAR PUNCH';
    updateHud();
    state.playerBusy = false;

    if (state.enemyHp <= 0) {
      finishPlayerWin();
      return;
    }

    enemyTurn();
  }
}

function dodge(direction) {
  if (!state.started || state.gameOver || state.playerBusy) return;
  state.facing = direction;
  setPlayerFacing(direction);
  elements.statusText.textContent = direction < 0 ? 'DODGE LEFT' : 'DODGE RIGHT';
  elements.player.classList.add('hurt');
  setTimeout(() => elements.player.classList.remove('hurt'), 150);
}

function block(on) {
  if (!state.started || state.gameOver || state.playerBusy) return;
  state.block = on;
  elements.player.classList.toggle('blocking', on);
  elements.statusText.textContent = on ? 'BLOCKING' : 'READY';
}

function enemyTurn() {
  if (!state.started || state.gameOver || state.enemyBusy) return;
  state.enemyBusy = true;

  const move = ['jab', 'hook', 'upper', 'block', 'dodge'][Math.floor(Math.random() * 5)];
  const enemy = enemies[state.enemyIndex];

  switch (move) {
    case 'jab': {
      const attack = enemy.jab;
      elements.enemy.style.transform = 'scaleX(-1) translateX(-10px)';
      setTimeout(() => (elements.enemy.style.transform = 'scaleX(-1)'), 130);
      flashImpact('ACK!');
      fireTone('hit');
      if (state.block) {
        state.playerHp = Math.max(0, state.playerHp - Math.max(1, attack / 3));
        elements.statusText.textContent = 'BLOCKED';
      } else {
        state.playerHp = Math.max(0, state.playerHp - attack);
        elements.statusText.textContent = 'JAB!';
      }
      break;
    }
    case 'hook': {
      const attack = enemy.hook;
      elements.enemy.style.transform = 'scaleX(-1) translateX(-14px)';
      setTimeout(() => (elements.enemy.style.transform = 'scaleX(-1)'), 150);
      flashImpact('BAM!');
      fireTone('power');
      if (state.block) {
        state.playerHp = Math.max(0, state.playerHp - Math.max(1, attack / 2));
        elements.statusText.textContent = 'BLOCKED';
      } else {
        state.playerHp = Math.max(0, state.playerHp - attack);
        elements.statusText.textContent = 'HOOK!';
      }
      break;
    }
    case 'upper': {
      const attack = enemy.upper;
      elements.enemy.style.transform = 'scaleX(-1) translateY(-10px)';
      setTimeout(() => (elements.enemy.style.transform = 'scaleX(-1)'), 170);
      flashImpact('UP!');
      fireTone('power');
      if (state.block) {
        state.playerHp = Math.max(0, state.playerHp - Math.max(2, attack / 3));
        elements.statusText.textContent = 'GUARD';
      } else {
        state.playerHp = Math.max(0, state.playerHp - attack);
        elements.statusText.textContent = 'UPPERCUT!';
      }
      break;
    }
    case 'block': {
      elements.enemy.classList.add('blocking');
      elements.statusText.textContent = 'ENEMY BLOCK';
      setTimeout(() => elements.enemy.classList.remove('blocking'), 350);
      break;
    }
    case 'dodge': {
      elements.enemy.style.transform = 'scaleX(-1) translateX(-18px)';
      setTimeout(() => (elements.enemy.style.transform = 'scaleX(-1)'), 170);
      elements.statusText.textContent = 'DODGE';
      break;
    }
  }

  updateHud();

  if (state.playerHp <= 0) {
    finishPlayerLoss();
    return;
  }

  state.enemyBusy = false;
  state.combo = 0;
  updateHud();
  if (state.started && !state.gameOver) {
    state.enemyMoveTimer = setTimeout(enemyTurn, 900 + Math.random() * 500);
  }
}

function startClock() {
  if (state.clockTimer) clearInterval(state.clockTimer);
  state.clockTimer = setInterval(() => {
    if (!state.started || state.gameOver) return;
    state.timer -= 1;
    updateHud();

    if (state.timer <= 0) {
      if (state.enemyHp > state.playerHp) {
        finishPlayerLoss();
      } else {
        finishPlayerWin();
      }
    }
  }, 1000);
}

function handleKey(key, isDown) {
  if (isDown) {
    state.pressed.add(key);
    if (key === 'a') {
      if (state.started && !state.gameOver) dodge(-1);
      state.facing = -1;
    }
    if (key === 'd') {
      if (state.started && !state.gameOver) dodge(1);
      state.facing = 1;
    }
    if (key === 's') {
      block(true);
    }
    if (key === ' ' && state.started && !state.gameOver) {
      doPlayerAttack('body');
    }
    if (key === 'w' && state.started && !state.gameOver) {
      const upperReady = state.pressed.has('a') || state.pressed.has('d');
      if (upperReady) doPlayerAttack('upper');
    }
    if (key === 'p' && state.started && !state.gameOver) {
      doPlayerAttack('star');
    }
  } else {
    state.pressed.delete(key);
    if (key === 's') block(false);
  }
}

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (['a', 'd', 's', 'w', 'p', ' '].includes(key)) {
    event.preventDefault();
  }

  if (key === ' ' && !state.started) return;
  if (!state.pressed.has(key)) {
    handleKey(key, true);
  }
});

window.addEventListener('keyup', (event) => {
  const key = event.key.toLowerCase();
  if (['a', 'd', 's', 'w', 'p', ' '].includes(key)) {
    handleKey(key, false);
  }
});

elements.startButton.addEventListener('click', () => {
  startGame();
  startClock();
});

elements.restartButton.addEventListener('click', () => {
  startGame();
  startClock();
});

updateHud();
setBanner('READY', 'PRESS START', true);
