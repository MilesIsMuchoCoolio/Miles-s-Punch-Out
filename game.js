const fighters = [
  { name: 'VOLT BRICK', hp: 100, damage: 9, pattern: ['jab', 'pause', 'hook', 'pause'] },
  { name: 'IRON GLO', hp: 115, damage: 11, pattern: ['jab', 'hook', 'pause', 'upper', 'pause'] },
  { name: 'RING ROGUE', hp: 130, damage: 12, pattern: ['hook', 'pause', 'jab', 'upper', 'pause'] },
  { name: 'THE CHAMP', hp: 150, damage: 14, pattern: ['jab', 'hook', 'pause', 'upper', 'hook'] }
];

const $ = id => document.getElementById(id);
const e = {
  titleScreen: $('titleScreen'), start: $('startButton'), restart: $('restartButton'), music: $('musicButton'),
  round: $('roundLabel'), timer: $('timer'), php: $('playerHp'), ehp: $('enemyHp'), ptext: $('playerHealthText'), etext: $('enemyHealthText'),
  ename: $('enemyName'), status: $('statusText'), arena: document.querySelector('.arena'), player: $('player'), enemy: $('enemy'),
  impact: $('impactText'), banner: $('messageBanner'), bannerTitle: $('messageTitle'), bannerSub: $('messageSub'),
  combo: $('comboText'), star: $('starMeter'), telegraph: $('telegraph'), teleMove: $('telegraphMove'), teleTarget: $('telegraphTarget'), teleProgress: $('telegraphProgress')
};

const s = {
  active: false, over: false, round: 0, php: 100, pmax: 100, ehp: 100, emax: 100,
  star: 0, combo: 0, time: 60, busy: false, enemyBusy: false, blocking: false, pressed: new Set(),
  enemyTimer: null, clock: null, telegraphTimer: null, telegraphId: 0, pattern: 0, dodgeUntil: 0, audio: null, musicOn: true
};

function hud() {
  e.php.style.width = `${Math.max(0, s.php / s.pmax * 100)}%`;
  e.ehp.style.width = `${Math.max(0, s.ehp / s.emax * 100)}%`;
  e.star.style.width = `${s.star}%`;
  e.ptext.textContent = `${Math.ceil(s.php)} / ${s.pmax}`;
  e.etext.textContent = `${Math.ceil(s.ehp)} / ${s.emax}`;
  e.combo.textContent = `${s.combo} HIT COMBO`;
  e.timer.textContent = s.time;
}

function banner(title, sub, show = true, kind = '') {
  e.bannerTitle.textContent = title;
  e.bannerSub.textContent = sub;
  e.banner.className = `message-banner ${show ? '' : 'hidden'} ${kind}`;
}

function hitText(text) {
  e.impact.textContent = text;
  e.impact.classList.remove('show');
  void e.impact.offsetWidth;
  e.impact.classList.add('show');
}

function tone(type = 'hit') {
  if (!window.AudioContext && !window.webkitAudioContext) return;
  try {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!s.audio) s.audio = new C();
    const o = s.audio.createOscillator(), g = s.audio.createGain();
    o.type = type === 'ko' ? 'sawtooth' : 'square';
    o.frequency.value = type === 'block' ? 120 : type === 'ko' ? 70 : type === 'star' ? 520 : 220;
    g.gain.value = .035; o.connect(g); g.connect(s.audio.destination); o.start(); o.stop(s.audio.currentTime + .09);
  } catch (_) {}
}

function anim(who, cls, ms = 300) {
  who.classList.remove('punch-body', 'punch-upper', 'punch-star', 'dodge-left', 'dodge-right', 'hurt', 'ko', 'recover');
  void who.offsetWidth; who.classList.add(cls);
  setTimeout(() => who.classList.remove(cls), ms);
}

function clearTelegraph() {
  clearTimeout(s.telegraphTimer);
  e.telegraph.classList.add('hidden');
  e.teleProgress.style.width = '0%';
}

function telegraph(move) {
  clearTelegraph();
  const id = ++s.telegraphId;
  const duration = 1450;
  e.teleMove.textContent = move === 'upper' ? 'UPPERCUT!' : `${move.toUpperCase()}!`;
  e.teleTarget.textContent = move === 'upper' ? 'DODGE SIDEWAYS OR HOLD S TO BLOCK' : 'HOLD S TO BLOCK — DODGE ALSO WORKS';
  e.telegraph.classList.remove('hidden');
  e.teleProgress.style.transition = `width ${duration}ms linear`;
  requestAnimationFrame(() => { e.teleProgress.style.width = '100%'; });
  s.telegraphTimer = setTimeout(() => { if (id === s.telegraphId) executeEnemy(move); }, duration);
}

function start() {
  clearInterval(s.clock); s.active = true; s.over = false; s.round = 0; s.php = 100; s.star = 0; s.combo = 0; s.time = 60;
  e.titleScreen.classList.add('hidden'); enterRound();
  s.clock = setInterval(() => { if (!s.active) return; s.time--; hud(); if (s.time <= 0) lose('TIME UP'); }, 1000);
}

function enterRound() {
  const f = fighters[s.round]; s.emax = f.hp; s.ehp = f.hp; s.busy = s.enemyBusy = false; s.pattern = 0; s.blocking = false;
  e.round.textContent = s.round + 1; e.ename.textContent = f.name; e.enemy.classList.remove('ko');
  e.enemy.classList.toggle('enraged', s.round === fighters.length - 1); setBlock(false); hud();
  banner(`ROUND ${s.round + 1}`, 'WATCH THE TELEGRAPH • HOLD S TO GUARD', true);
  setTimeout(() => { if (s.active) { banner('', '', false); e.status.textContent = 'FIGHT!'; enemyPlan(); } }, 1250);
}

function win() {
  if (!s.active) return; s.active = false; clearTelegraph(); clearTimeout(s.enemyTimer); clearInterval(s.clock);
  anim(e.enemy, 'ko', 1100); tone('ko'); e.status.textContent = 'KO!';
  if (s.round < fighters.length - 1) {
    banner('DOWN!', `REF COUNT: 1`, true, 'counting');
    let count = 1;
    const countTimer = setInterval(() => { count++; if (count <= 10) { banner('DOWN!', `REF COUNT: ${count}`, true, 'counting'); tone('block'); } else { clearInterval(countTimer); s.round++; s.active = true; enterRound(); } }, 420);
  } else {
    banner('YOU WIN!', 'CHAMPIONSHIP COMPLETE — PRESS RESTART TO FIGHT AGAIN', true); s.over = true;
  }
}

function lose(reason = 'KO!') {
  if (!s.active) return; s.active = false; s.over = true; clearTelegraph(); clearTimeout(s.enemyTimer); clearInterval(s.clock);
  anim(e.player, 'ko', 1100); tone('ko'); e.status.textContent = reason; banner('YOU LOSE', 'BLOCK EARLIER — THE BIG FLASH IS YOUR WARNING', true);
}

function attack(type) {
  if (!s.active || s.over || s.busy || s.enemyBusy) return;
  if (type === 'upper' && !(s.pressed.has('a') || s.pressed.has('d'))) return;
  if (type === 'star' && s.star < 100) { hitText('CHARGE!'); return; }
  s.busy = true; const damage = type === 'star' ? 30 : type === 'upper' ? 18 : 11;
  anim(e.player, type === 'star' ? 'punch-star' : type === 'upper' ? 'punch-upper' : 'punch-body', 400);
  setTimeout(() => {
    if (!s.active) return;
    s.ehp = Math.max(0, s.ehp - damage); s.combo++; s.star = Math.min(100, s.star + (type === 'star' ? -100 : 18));
    hitText(type === 'star' ? 'STAR!' : type === 'upper' ? 'UPPERCUT!' : 'POW!'); tone(type === 'star' ? 'star' : 'hit'); hud();
    if (s.ehp <= 0) win(); else { s.busy = false; }
  }, 180);
}

function dodge(dir) {
  if (!s.active || s.over || s.busy) return;
  anim(e.player, dir < 0 ? 'dodge-left' : 'dodge-right', 360); s.dodgeUntil = Date.now() + 520;
  e.status.textContent = dir < 0 ? 'DODGE LEFT!' : 'DODGE RIGHT!';
}

function setBlock(on) {
  s.blocking = on; e.player.classList.toggle('blocking', on);
  let guard = document.getElementById('guardIndicator');
  if (!guard) { guard = document.createElement('div'); guard.id = 'guardIndicator'; guard.textContent = 'GUARD UP!'; e.arena.appendChild(guard); }
  guard.classList.toggle('visible', on);
  if (on) e.status.textContent = 'BLOCKING — NICE GUARD!';
}

function enemyPlan() {
  if (!s.active || s.over || s.enemyBusy) return;
  const f = fighters[s.round], move = f.pattern[s.pattern++ % f.pattern.length];
  if (move === 'pause') { e.status.textContent = 'WATCHING...'; s.enemyTimer = setTimeout(enemyPlan, 700); return; }
  telegraph(move);
}

function executeEnemy(move) {
  if (!s.active || s.over) return; clearTelegraph(); s.enemyBusy = true;
  const f = fighters[s.round]; anim(e.enemy, move === 'upper' ? 'punch-upper' : 'punch-body', 520);
  setTimeout(() => {
    const blocked = s.blocking, dodged = Date.now() < s.dodgeUntil;
    if (blocked) { s.php = Math.max(0, s.php - Math.ceil(f.damage * .2)); hitText('BLOCKED!'); e.player.classList.add('guard-hit'); setTimeout(() => e.player.classList.remove('guard-hit'), 300); tone('block'); }
    else if (dodged) { hitText('MISS!'); tone('block'); }
    else { s.php = Math.max(0, s.php - f.damage); s.combo = 0; anim(e.player, 'hurt', 300); hitText('OUCH!'); tone('hit'); }
    hud(); s.enemyBusy = false; if (s.php <= 0) lose(); else { s.enemyTimer = setTimeout(enemyPlan, 720); }
  }, 410);
}

function key(k, down) {
  if (down) {
    s.pressed.add(k); if (k === 'a') dodge(-1); if (k === 'd') dodge(1); if (k === 's') setBlock(true);
    if (k === ' ') attack('body'); if (k === 'w' && (s.pressed.has('a') || s.pressed.has('d'))) attack('upper'); if (k === 'p') attack('star');
  } else { s.pressed.delete(k); if (k === 's') setBlock(false); }
}

e.start?.addEventListener('click', start); e.restart?.addEventListener('click', start);
e.music?.addEventListener('click', () => { s.musicOn = !s.musicOn; e.music.textContent = s.musicOn ? 'MUSIC: ON' : 'MUSIC: OFF'; });
addEventListener('keydown', ev => { const k = ev.key.toLowerCase(); if (['a','d','s','w','p',' '].includes(k)) ev.preventDefault(); if (!s.pressed.has(k)) key(k, true); });
addEventListener('keyup', ev => key(ev.key.toLowerCase(), false));
hud();
