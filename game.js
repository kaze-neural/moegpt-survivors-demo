'use strict';

const el = id => document.getElementById(id);
const canvas = el('arena');
const ctx = canvas.getContext('2d');
const keys = new Set();
const directions = {
  w: [0, -1], arrowup: [0, -1], s: [0, 1], arrowdown: [0, 1],
  a: [-1, 0], arrowleft: [-1, 0], d: [1, 0], arrowright: [1, 0],
};
const chipRates = [1, 1, 1, 1, .60, .48, .39, .32, .27, .24];
const stages = [
  { name: '故障中继站', floor: 'relay-arena', waves: [22, 24, 25, 26, 60, 29, 30, 32, 34, null], bosses: [
    ['中继守卫', 'relay-warden', 1050, 'strike'],
    ['故障核心', 'relay-core', 42000, 'ring'],
  ] },
  { name: '碎光回廊', floor: 'glass-arena', waves: [22, 24, 25, 26, 65, 26, 28, 30, 31, 75, 28, 30, 32, 34, null], bosses: [
    ['琉璃螳螂', 'glass-mantis', 2200, 'fan'],
    ['潮眼蛇王', 'tide-serpent', 6800, 'ring'],
    ['逆时冠冕', 'chronograph', 54000, 'strike'],
  ] },
  { name: '天穹裂隙', floor: 'sky-arena', waves: [22, 24, 25, 26, 65, 26, 28, 30, 31, 75, 28, 30, 32, 34, 85, 30, 32, 34, 36, null], bosses: [
    ['熔链三首犬', 'ember-hound', 3200, 'fan'],
    ['蚀日骑士', 'eclipse-knight', 9200, 'strike'],
    ['幽辉蛾皇', 'moth-empress', 17600, 'ring'],
    ['天穹裂龙', 'astral-dragon', 72000, 'ring'],
  ] },
];
const guardianIntervals = [3.05, 2.65];
const corePhases = [
  { speed: 112, interval: 2.55, armor: .90, bullets: 12, blast: 74, damage: 30 },
  { speed: 134, interval: 2.15, armor: .80, bullets: 16, blast: 82, damage: 34 },
  { speed: 156, interval: 1.78, armor: .72, bullets: 20, blast: 92, damage: 38 },
];
const phaseFloors = { 2: [.50, 0], 3: [.70, .35, 0] };
const maxModuleRank = 3;
const wardCapacity = () => 34 + 12 * Math.max(0, signatureRank() - 1);
const wardRecharge = () => 6 - .75 * Math.max(0, signatureRank() - 1);
const modes = { home: 'home', starter: 'starter', play: 'play', shop: 'shop', pause: 'pause', end: 'end' };
const joystick = { id: null, x: 0, y: 0, dx: 0, dy: 0 };
const maxWeaponRank = 4;
const evolutionPrice = 58;
const showTestTools = true;
const ultimateCooldown = 45;
const healthTier = waveIndex => 2 ** Math.floor(waveIndex / 5);
const characters = {
  chatgpt: { id: 'chatgpt', color: '#d4b8ff', titleColor: '#5c4479', name: 'ChatGPT', title: '银龙少女', portrait: 'silver-dragon', walk: 'dragon-walk',
    weapon: '三段龙息', icon: 'dragon', description: '自动锁敌，每第三击发出穿透波。',
    hp: 100, speed: 220, power: 15, interval: .42, defense: 2,
    skill: { name: '银龙回响', icon: 'dragon-ward', interval: .25, reaches: [165, 220, 280], hits: [280, 350, 470],
      description: '以自身为中心释放三道逐渐扩大的震波。' },
    signature: { name: '龙翼护印', icon: 'dragon-ward', price: 22,
      effect: rank => t('抵消下一击最多 {0} 点伤害，累计移动 {1} 秒充满。', 34 + 12 * (rank - 1), 6 - .75 * (rank - 1)) } },
  claude: { id: 'claude', color: '#ffd291', titleColor: '#805039', name: 'Claude', title: '橘发书页少女', portrait: 'claude-portrait', walk: 'claude-walk',
    weapon: '回卷书页', icon: 'book', description: '投出的书页会飞回身边，去程和回程都能穿透并命中敌人。',
    hp: 108, speed: 214, power: 17, interval: .56, defense: 3,
    skill: { name: '终章书域', icon: 'book', interval: .34, radius: 205, hits: [200, 200, 220, 220, 260],
      description: '在附近敌人脚下展开书域，连续造成五次伤害。' },
    signature: { name: '余墨共鸣', icon: 'book', price: 22,
      effect: rank => t('回程书页留印，后续命中引爆。追加触发伤害的 {0}% 加 {1}，附近敌人承受其中 55%。', 70 + (rank - 1) * 15, 48 + (rank - 1) * 16) } },
  deepseek: { id: 'deepseek', color: '#8ee7ff', titleColor: '#245979', name: 'DeepSeek', title: '鲸尾推理少女', portrait: 'deepseek-portrait', walk: 'deepseek-walk',
    weapon: '声呐水珠', icon: 'spell-deepseek', description: '水珠命中后炸开，周围敌人受到 60% 溅射伤害。',
    hp: 112, speed: 211, power: 24, interval: .68, defense: 2,
    skill: { name: '鲸落潮汐', icon: 'spell-deepseek', interval: .21, radius: 118, hits: [300, 330, 380, 450],
      description: '朝最近敌人的方向放出灵鲸，沿直线连续掀起四重潮浪。' },
    signature: { name: '深海回声', icon: 'spell-deepseek', price: 22,
      effect: rank => t('水珠在落点追加一道回声，半径 {0}，造成主武器伤害的 {1}%。', 78 + rank * 12, 45 + rank * 20) } },
  gemini: { id: 'gemini', color: '#e4b0ff', titleColor: '#6b3d82', name: 'Gemini', title: '星光猫耳少女', portrait: 'gemini-portrait', walk: 'gemini-walk',
    weapon: '双子飞星', icon: 'spell-gemini', description: '一对飞星分别瞄准最近的两个敌人，落单的敌人会被同时锁定。',
    hp: 94, speed: 237, power: 13, interval: .54, defense: 1,
    skill: { name: '双星连图', icon: 'spell-gemini', interval: .32, radius: 113, hits: [280, 340, 460],
      description: '依次锁定附近至多三个不同目标，引落星爆。目标不足时会再次锁敌。' },
    signature: { name: '伴星共振', icon: 'spell-gemini', price: 22,
      effect: rank => t('每第三轮飞星命中时弹向附近另一名敌人，单体时原地回响，造成主武器伤害的 {0}%。', 55 + 25 * rank) } },
  grok: { id: 'grok', color: '#ffd779', titleColor: '#775331', name: 'Grok', title: '黑金战斧少女', portrait: 'grok-portrait', walk: 'grok-walk',
    weapon: '弦月战斧', icon: 'spell-grok', description: '自动转向敌人，横扫身前半径 126 的扇区。一次挥击可以劈中整群敌人。',
    hp: 122, speed: 226, power: 36, interval: .68, defense: 3,
    skill: { name: '黑金断月', icon: 'spell-grok', interval: .36, reaches: [180, 230, 275], hits: [340, 410, 560],
      description: '追瞄前方连劈两斧，第三斧旋身横扫四周。' },
    signature: { name: '裂月斧纹', icon: 'spell-grok', price: 22,
      effect: rank => t('每次主武器斧击命中时迸出金色裂纹，追加该次伤害的 {0}%。', 25 + rank * 15) } },
};
const pageSpeed = 445;
const pageOutTime = .53;
const pageReach = Math.round(pageSpeed * pageOutTime);
const weapons = [
  { id: 'nova', name: '星环震荡器', description: '周期性震击身边的敌人，升级提高范围和伤害。',
    evolution: '超新星环', evolvedDescription: '震波范围更大，伤害更高，释放也更频繁。' },
  { id: 'fan', name: '星羽散射炮', description: '自动发射扇形弹幕，升级增加弹数。',
    evolution: '星羽风暴', evolvedDescription: '星羽弹穿透敌群，发射间隔缩短。' },
  { id: 'prism', name: '棱镜连锁', description: '在附近敌人间跳跃的闪电，升级增加跳跃次数。',
    evolution: '极光电网', evolvedDescription: '连锁距离扩大，闪电能跳向更多目标。' },
  { id: 'lance', name: '寒星长枪', description: '发射一枚穿透长枪，升级提高伤害。',
    evolution: '双极贯星枪', evolvedDescription: '向瞄准方向和反方向各发射一枚高伤长枪。' },
  { id: 'orbit', name: '卫星刃', description: '环绕角色切割敌人，升级增加刀刃数量。',
    evolution: '双轨月刃', evolvedDescription: '增加一条反向旋转的外轨，扩大覆盖范围。' },
];
const weaponStats = {
  nova: rank => rank > maxWeaponRank ? { damage: 126, interval: 1.15, radius: 170 }
    : { damage: 21 + 14 * rank, interval: 1.8, radius: 80 + rank * 15 },
  fan: rank => ({ damage: 16 + 3 * rank, interval: rank > maxWeaponRank ? .8 : 1.15,
    count: 2 * rank + 1, pierces: rank > maxWeaponRank }),
  prism: rank => rank > maxWeaponRank ? { damage: 61, interval: .95, reach: 250, jump: 175, targets: 9 }
    : { damage: 22 + 5 * rank, interval: 1.45, reach: 250, jump: 105, targets: rank + 1 },
  lance: rank => ({ damage: rank > maxWeaponRank ? 105 : 28 + 12 * rank,
    interval: rank > maxWeaponRank ? .9 : 1.35, count: rank > maxWeaponRank ? 2 : 1, pierces: true }),
  orbit: rank => ({ damage: 18 + rank * 8, hitInterval: .38, bladeRadius: 13,
    paths: rank > maxWeaponRank ? [[96, 5, 1], [144, 5, -1]] : [[78 + (rank - 1) * 6, rank + 1, 1]] }),
};
const upgrades = [
  { name: '碎星增幅', icon: 'amplifier', description: '主武器伤害 +55%', price: 12, apply: p => { p.power *= 1.55; } },
  { name: '短咏回路', icon: 'circuit', description: '主武器间隔缩短 25%，最低 0.12 秒', price: 12, apply: p => { p.interval = Math.max(.12, p.interval * .75); } },
  { name: '轻羽鳞片', icon: 'boots', description: '移动速度 +20%，最高 390', price: 10, apply: p => { p.speed = Math.min(390, p.speed * 1.20); } },
  { name: '共鸣磁芯', icon: 'magnet', description: '芯片拾取范围 +48', price: 10, apply: p => { p.magnet += 48; } },
  { name: '银鳞修复', icon: 'scale', description: '生命上限 +22，恢复 42 点生命', price: 10, apply: p => {
    p.maxHp += 22;
    p.hp = Math.min(p.maxHp, p.hp + 42);
  } },
  { name: '镜像进程', icon: 'mirror', price: 16,
    effect: rank => t(player.character.id === 'grok' ? '本体挥斧后，侧面的镜像反手追斩。' : '主武器双重攻击。') + ' ' +
      t('每击保留 {0}% 伤害。首次安装扣除最多 24 拾取范围。', [78, 88, 100][rank - 1]),
    apply: p => {
      if (!p.split) p.magnet = Math.max(22, p.magnet - 24);
      p.split = true;
    } },
  { name: '合金护甲', icon: 'armor', description: '防御 +4。防御越高，每点带来的减伤越少。最高减伤 40%。', price: 14,
    apply: p => { p.defense += 4; } },
  { name: '全频校准', icon: 'nova', description: '全部武器伤害 +25%，与等级加成相乘。', price: 17,
    apply: p => { p.weaponBonus *= 1.25; } },
];

const artPath = id => 'art/' + id + '.webp';
const art = Object.fromEntries([
  'drone', 'flank', 'elite', 'wisp', 'sentry', 'chip', 'healing-flask', 'hostile', 'dragon-ward',
  'dragon', 'nova', 'fan', 'prism', 'lance', 'orbit', 'fan-bolt', 'dragon-bolt', 'lance-bolt', 'page-bolt',
  ...stages.flatMap(({ floor, bosses }) => [floor, ...bosses.map(([, icon]) => icon)]),
  ...Object.values(characters).flatMap(({ id, walk }) => [walk, 'cast-' + id, 'spell-' + id, 'action-' + id]),
].map(id => {
  const image = new Image();
  image.src = artPath(id);
  return [id, image];
}));

let selectedCharacter = 'chatgpt';
let stageIndex = 0;
let stage = stages[stageIndex];
let mode = modes.home;
let width = 750;
let height = 650;
let scale = 1;
let inset = 0;
let player, enemies, shots, hostileShots, drops, rings, particles, skillVfx, wave, remaining, spawnTimer;
let chips, kills, offers, boss, banner, previous = 0, gameSpeed = 1;
let rerolls = 0;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const random = (lo, hi) => lo + Math.random() * (hi - lo);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const coarsePointer = matchMedia('(pointer: coarse)');

function selectCharacter(id) {
  selectedCharacter = id;
  const character = characters[id];
  el('home').dataset.character = id;
  el('home').style.setProperty('--hero-light', character.color);
  el('home').style.setProperty('--hero-tone', character.titleColor);
  const portrait = el('portrait-stage');
  portrait.getAnimations?.().filter(animation => animation.id === 'arrival').forEach(animation => animation.cancel());
  if (!reducedMotion.matches) portrait.animate?.([{ opacity: .68, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }], { id: 'arrival', duration: 350, easing: 'ease-out' });
  el('character-portrait').src = artPath(character.portrait);
  el('character-portrait').alt = character.name + ' · ' + t(character.title);
  el('portrait-caption').textContent = t(character.title) + ' · ' + character.name;
  el('intro-weapon-icon').src = artPath(character.icon);
  el('intro-weapon-name').textContent = t(character.weapon);
  el('intro-weapon-description').textContent = t(character.description);
  el('intro-skill').textContent = t(character.skill.name) + ' · ' + skillDescription(character.skill);
  el('intro-signature').textContent = t('专属模块') + ' · ' + t(character.signature.name);
  for (const button of el('character-select').querySelectorAll('button')) {
    button.setAttribute('aria-pressed', button.dataset.character === id);
  }
}

function skillDescription(skill) {
  return t(skill.description) + ' ' + t('冷却 {0} 秒', ultimateCooldown);
}

function setGameLanguage(language) {
  gameLanguage = language;
  document.documentElement.lang = language;
  document.title = t('星光客厅防卫战') + ' · MoeGPT';
  el('language-select').value = language;
  for (const label of document.querySelectorAll('[data-text]')) label.textContent = t(label.dataset.text);
  for (const label of document.querySelectorAll('[data-label]')) label.setAttribute('aria-label', t(label.dataset.label));
  for (const button of el('stage-select').querySelectorAll('button')) {
    const chapter = stages[Number(button.dataset.stage)];
    button.querySelector('strong').textContent = t(chapter.name);
    button.querySelector('small').textContent = t('{0} 波', chapter.waves.length);
  }
  selectCharacter(selectedCharacter);
}

function selectStage(index) {
  stageIndex = index;
  stage = stages[index];
  for (const button of el('stage-select').querySelectorAll('button')) {
    button.setAttribute('aria-pressed', Number(button.dataset.stage) === index);
  }
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const oldWidth = width, oldHeight = height;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const unit = Math.min(rect.width / 410, rect.height / 570, 1.45);
  width = Math.min(920, rect.width / unit);
  height = rect.height / unit;
  inset = (rect.width - width * unit) / 2 * ratio;
  scale = unit * ratio;
  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);
  if (!player) return;
  const entities = [player, ...enemies, ...drops, ...shots, ...hostileShots, ...rings, ...particles, ...skillVfx];
  if (player.skillCast?.center) entities.push(player.skillCast.center);
  for (const entity of entities) {
    entity.x *= width / oldWidth;
    entity.y *= height / oldHeight;
  }
}

function startRun() {
  el('home').hidden = true;
  el('battle').hidden = false;
  player = null;
  resize();
  const character = characters[selectedCharacter];
  player = {
    character, x: width / 2, y: height * .51, hp: character.hp, maxHp: character.hp,
    speed: character.speed, power: character.power, interval: character.interval, defense: character.defense,
    level: 1, xp: 0, weaponBonus: 1, magnet: 61, attack: .15, shotCount: 0, invulnerable: 0, stride: 0,
    ranks: {}, moduleRanks: {}, cooldowns: {}, orbitAngle: 0, orbitHits: new WeakMap(), weaponTime: 0,
    links: [], pulse: 0, moving: false, flip: false, split: false, mirrorSwing: null,
    ward: 0, wardCharge: 0, signatureEquipped: false, skillCooldown: 0, skillCast: null, damage: {},
    pose: 0, cast: 0, castAngle: 0, skillPose: 0, skillFacing: 1, hurtFlash: 0, recovery: 0, trail: 0,
  };
  enemies = [];
  shots = [];
  hostileShots = [];
  drops = [];
  rings = [];
  particles = [];
  skillVfx = [];
  boss = null;
  chips = 0;
  kills = 0;
  wave = 0;
  remaining = stage.waves[0];
  el('wave-message').textContent = '';
  el('gesture-tip').hidden = !coarsePointer.matches;
  enterMode(modes.starter);
  syncHud();
  const cards = weapons.map(weapon => shopCard(t(weapon.name), t('免费'), t(weapon.description), false, () => {
    if (mode !== modes.starter) return;
    player.ranks[weapon.id] = 1;
    startWave(0);
  }, weapon.id, weaponReadout(weapon.id, 1)));
  setPanel(t('开局商店'), t('免费选一件副武器，选定后开始第 1 波。'), [], cards);
}

function startWave(index) {
  const healthGrowth = healthTier(index) / healthTier(wave);
  if (healthGrowth > 1) {
    for (const enemy of enemies) {
      if (enemy.hp <= 0 || enemy.profile) continue;
      enemy.hp *= healthGrowth;
    }
  }
  wave = index;
  remaining = stage.waves[index];
  spawnTimer = .35;
  banner = 1.5;
  const entry = (index + 1) % 5 === 0 ? stage.bosses[Math.floor(index / 5)] : null;
  const [name, icon, baseHp, pattern] = entry ?? [];
  boss = null;
  el('wave-message').textContent = entry ? t('{0}来袭', t(name)) : t('第 {0} 波', index + 1);
  if (entry) {
    const hp = baseHp * healthTier(index);
    const final = index === stage.waves.length - 1;
    const profile = { name, icon, pattern, final, floors: phaseFloors[final ? 3 : 2] };
    const y = height * .24;
    boss = { type: 'boss', profile, x: width / 2, y: Math.abs(player.y - y) < 120 ? height * .76 : y,
      r: final ? 36 : 28, speed: final ? 112 : 84 + stageIndex * 7, hp, maxHp: hp, attack: 2.1, grace: .85,
      phaseIndex: 0, volleys: 0 };
    enemies.push(boss);
    refreshBossBars(boss);
  }
  enterMode(modes.play);
  syncHud();
}

function clearInput() {
  keys.clear();
  releaseStick();
}

function enterMode(next) {
  mode = next;
  clearInput();
  el('overlay').hidden = next === modes.play || next === modes.home;
  el('pause').disabled = next !== modes.play;
}

function home() {
  enterMode(modes.home);
  el('battle').hidden = true;
  el('home').hidden = false;
  el('start').focus();
}

function setPanel(title, description, actions, cards = [], details = []) {
  el('panel-title').textContent = title;
  el('panel-description').textContent = description;
  el('offers').replaceChildren(...cards);
  el('panel-details').replaceChildren(...details);
  el('panel-details').hidden = !details.length;
  el('panel-body').scrollTop = 0;
  const buttons = actions.map(([label, callback, disabled], index) => {
    const button = document.createElement('button');
    button.className = index === 0 ? 'primary' : 'secondary';
    button.textContent = label;
    button.disabled = Boolean(disabled);
    button.addEventListener('click', callback);
    return button;
  });
  el('panel-actions').replaceChildren(...buttons);
  (buttons[0] ?? cards[0])?.focus({ preventScroll: true });
}

function togglePause() {
  if (mode === modes.pause) {
    enterMode(modes.play);
    el('pause').focus();
  } else if (mode === modes.play) {
    enterMode(modes.pause);
    setPanel(t('已暂停'), '', [[t('继续战斗'), togglePause], [t('返回首页'), home]], [], pauseDetails());
  }
}

function grantWaveReward() {
  chips += 6;
  player.hp = Math.min(player.maxHp, player.hp + 12);
}

function openShop() {
  grantWaveReward();
  player.boughtHere = new Set();
  rerolls = 0;
  rollShop();
  enterMode(modes.shop);
  syncHud();
  drawShop();
}

function rollShop() {
  const weaponPool = weapons.filter(weapon => (player.ranks[weapon.id] ?? 0) < maxWeaponRank && !player.boughtHere.has(weapon));
  offers = weapons.filter(weapon => player.ranks[weapon.id] === maxWeaponRank && !player.boughtHere.has(weapon));
  while (offers.length < 2 && weaponPool.length) {
    offers.push(takeWeighted(weaponPool, weapon => player.ranks[weapon.id] ? 2 : 1));
  }
  const eligible = item => moduleRank(item) < maxModuleRank && !player.boughtHere.has(item);
  const pool = upgrades.filter(item => eligible(item) && (item.icon !== 'mirror' || wave > 0));
  const signature = player.character.signature;
  const moduleSlots = 3;
  // The sum of inclusion probabilities equals the number of slots.
  const signatureChance = Math.min(1, 2 * moduleSlots / (pool.length + 2));
  const featured = eligible(signature) && Math.random() < signatureChance;
  if (featured) offers.push(signature);
  const generalSlots = moduleSlots - Number(featured);
  for (let i = 0; i < generalSlots && pool.length; i++) {
    offers.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
}

function takeWeighted(pool, weight) {
  let roll = Math.random() * pool.reduce((total, item) => total + weight(item), 0);
  const index = pool.findIndex(item => (roll -= weight(item)) < 0);
  return pool.splice(index, 1)[0];
}

function shopCard(name, badge, details, disabled, onClick, icon, stats) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'offer';
  if (icon) {
    button.classList.add('has-weapon-icon');
    button.append(itemIcon(icon));
  }
  button.disabled = disabled;
  const title = document.createElement('strong');
  title.textContent = name;
  const price = document.createElement('span');
  price.textContent = badge;
  const description = document.createElement('small');
  description.textContent = details;
  button.append(title, price, description);
  if (stats) {
    const readout = document.createElement('small');
    readout.className = 'weapon-stats';
    readout.textContent = stats;
    button.append(readout);
  }
  button.addEventListener('click', onClick);
  return button;
}

function itemIcon(id) {
  const icon = document.createElement('img');
  icon.className = 'item-icon';
  icon.alt = '';
  icon.src = artPath(id);
  return icon;
}

const statNumber = value => Number(value.toFixed(2));
const xpRequired = () => 14 + (player.level - 1) * 8;
const moduleRank = item => player.moduleRanks[item.name] ?? 0;
const signatureRank = () => moduleRank(player.character.signature);
const moduleEffect = (item, rank) => item.effect ? item.effect(rank) : t('每级') + ' · ' + t(item.description);
const attackMultiplier = () => (1 + (player.level - 1) * .06) * player.weaponBonus;
const damageReduction = () => Math.min(.40, player.defense / (player.defense + 36));

function weaponReadout(id, rank) {
  const interval = t('每 {0} 秒', statNumber(player.interval));
  if (id === player.character.icon && !['book', 'dragon'].includes(id)) {
    return [t('每击 {0}', statNumber(mainDamage())), interval, t(player.character.description),
      player.split && t('镜像双重攻击')].filter(Boolean).join(' · ');
  }
  if (id === 'dragon' || id === 'book') {
    const split = player.split ? ' ×2' : '';
    if (id === 'book') {
      return [t('去程 {0}', statNumber(mainDamage())) + split, t('回程 {0}', statNumber(mainDamage(.75))) + split,
        interval, t('去程约 {0}', pageReach), t('双程穿透')].join(' · ');
    }
    return [t('普通 {0}', statNumber(mainDamage())) + split, t('第三击 {0}', statNumber(mainDamage(1.65))) + split +
      ' (' + t('穿透') + ')', interval].join(' · ');
  }
  const stats = weaponStats[id](rank);
  const values = [t('伤害 {0}', statNumber(stats.damage * attackMultiplier()))];
  if (stats.interval) values.push(t('每 {0} 秒', stats.interval));
  if (stats.hitInterval) values.push(t('同目标间隔 {0} 秒', stats.hitInterval));
  if (stats.radius) values.push(t('半径 {0}', stats.radius));
  if (stats.count) values.push(t('弹数 {0}', stats.count));
  if (stats.pierces) values.push(t('穿透'));
  if (stats.targets) values.push(t('最多 {0} 个目标', stats.targets), t('起手 {0} / 跳跃 {1}', stats.reach, stats.jump));
  if (stats.paths) values.push(stats.paths.map(([radius, count]) => t('{0} 刃 / 轨道半径 {1}', count, radius)).join(' + '),
    t('刃半径 {0}', stats.bladeRadius));
  return values.join(' · ');
}

function pauseDetails() {
  const stats = document.createElement('dl');
  stats.className = 'character-stats';
  for (const [label, value] of [
    ['角色', player.character.name],
    ['等级 / 经验', 'Lv.' + player.level + ' · ' + player.xp + ' / ' + xpRequired()],
    ['生命', Math.ceil(player.hp) + ' / ' + player.maxHp],
    ['防御', player.defense + ' · ' + t('减伤 {0}%', statNumber(damageReduction() * 100))],
    ['全武器伤害加成', '+' + Math.round((attackMultiplier() - 1) * 100) + '%'],
    ['移速', t('{0} 单位/秒', statNumber(player.speed))],
    ['拾取范围', t('{0} 单位', statNumber(player.magnet))],
    ['芯片', chips],
  ]) {
    const row = document.createElement('div');
    const labelNode = document.createElement('dt');
    const valueNode = document.createElement('dd');
    labelNode.textContent = t(label);
    valueNode.textContent = value;
    row.append(labelNode, valueNode);
    stats.append(row);
  }
  const loadoutSection = document.createElement('h3');
  loadoutSection.textContent = t('当前装备');
  const list = document.createElement('ul');
  list.className = 'equipment';
  const loadout = [{ id: player.character.icon, name: player.character.weapon }, ...weapons.filter(weapon => player.ranks[weapon.id])];
  for (const weapon of loadout) {
    const rank = player.ranks[weapon.id];
    const name = !rank ? t(weapon.name) + ' · ' + t('主武器')
      : rank > maxWeaponRank ? t(weapon.evolution) + ' · ' + t('已进化') : t(weapon.name) + ' Lv.' + rank;
    list.append(equipmentRow(weapon.id, name, weaponReadout(weapon.id, rank)));
  }
  const signatureHeading = document.createElement('h3');
  signatureHeading.textContent = t('角色专属');
  const signatureList = document.createElement('ul');
  signatureList.className = 'equipment';
  const signature = player.character.signature;
  const wardStatus = player.signatureEquipped && player.character === characters.chatgpt
    ? ' · ' + (player.ward > 0 ? t('护盾 {0}/{1}', Math.ceil(player.ward), wardCapacity()) : t('还需移动 {0} 秒', statNumber(wardRecharge() - player.wardCharge)))
    : '';
  const skill = player.character.skill;
  signatureList.append(equipmentRow(skill.icon, t(skill.name) + ' · ' + t('主动技能'), skillDescription(skill)));
  signatureList.append(equipmentRow(signature.icon, t(signature.name) + (player.signatureEquipped ? ' Lv.' + signatureRank() : ' · ' + t('未装')) + wardStatus, moduleEffect(signature, Math.max(1, signatureRank()))));
  const details = [stats, ...damageDetails(), signatureHeading, signatureList, loadoutSection, list];
  const moduleList = document.createElement('ul');
  moduleList.className = 'equipment';
  for (const item of upgrades) {
    const count = moduleRank(item);
    if (count) moduleList.append(equipmentRow(item.icon, t(item.name) + ' Lv.' + count, moduleEffect(item, count)));
  }
  if (moduleList.childElementCount) {
    const heading = document.createElement('h3');
    heading.textContent = t('已装模块');
    details.push(heading, moduleList);
  }
  return details;
}

function damageDetails() {
  const rows = [
    ['skill', t(player.character.skill.name) + ' · ' + t('主动技能')],
    ['main', t(player.character.weapon) + ' · ' + t('主武器')],
  ];
  for (const weapon of weapons) {
    if (!player.ranks[weapon.id]) continue;
    const name = player.ranks[weapon.id] > maxWeaponRank ? weapon.evolution : weapon.name;
    rows.push([weapon.id, t(name) + ' · ' + t('副武器')]);
  }
  if (player.signatureEquipped && player.character !== characters.chatgpt) {
    rows.push(['signature', t(player.character.signature.name) + ' · ' + t('专属模块')]);
  }
  const title = document.createElement('h3');
  const total = rows.reduce((sum, [id]) => sum + (player.damage[id] ?? 0), 0);
  title.textContent = t('本局伤害') + ' · ' + Math.round(total).toLocaleString(gameLanguage);
  const list = document.createElement('ul');
  list.className = 'damage-report';
  for (const [id, label] of rows) {
    const amount = player.damage[id] ?? 0;
    const item = document.createElement('li');
    const heading = document.createElement('span');
    const number = document.createElement('strong');
    const bar = document.createElement('div');
    const fill = document.createElement('i');
    heading.textContent = label;
    number.textContent = Math.round(amount).toLocaleString(gameLanguage);
    fill.style.width = total > 0 ? 100 * amount / total + '%' : '0%';
    bar.append(fill);
    item.append(heading, number, bar);
    list.append(item);
  }
  return [title, list];
}

function equipmentRow(icon, name, details) {
  const item = document.createElement('li');
  const text = document.createElement('div');
  const title = document.createElement('strong');
  const readout = document.createElement('small');
  title.textContent = name;
  readout.textContent = details;
  text.append(title, readout);
  item.append(itemIcon(icon), text);
  return item;
}

function buildOffer(item) {
  const bought = player.boughtHere.has(item);
  const rank = item.id ? (player.ranks[item.id] ?? 0) : moduleRank(item);
  const nextRank = rank + (bought ? 0 : 1);
  const evolving = Boolean(item.id && nextRank > maxWeaponRank);
  const cost = item.id ? (evolving ? evolutionPrice : 16 + (nextRank - 1) * 6)
    : item.price + (nextRank - 1) * (item === player.character.signature ? 8 : 5);
  const moduleUpgrade = !item.id && rank > 0 && !bought;
  const name = evolving ? t(item.evolution) : t(item.name) + (moduleUpgrade ? ' Lv.' + rank + ' → Lv.' : ' Lv.') + nextRank;
  const details = evolving ? t('满级进化') + ' · ' + t(item.evolvedDescription)
    : item.id ? t(item.description) : (item === player.character.signature ? t('角色专属') + ' · ' : '') + moduleEffect(item, nextRank);
  return shopCard(name, bought ? t('已安装') : '◇ ' + cost, details, bought || chips < cost, () => {
    if (mode !== modes.shop || !offers.includes(item) || player.boughtHere.has(item) || chips < cost) return;
    chips -= cost;
    player.boughtHere.add(item);
    if (item.id) player.ranks[item.id] = nextRank;
    else {
      player.moduleRanks[item.name] = nextRank;
      if (item === player.character.signature) {
        player.signatureEquipped = true;
        if (player.character === characters.chatgpt) { player.ward = wardCapacity(); player.wardCharge = 0; }
      } else item.apply(player);
    }
    syncHud();
    drawShop();
  }, item.icon ?? item.id, item.id ? weaponReadout(item.id, nextRank) : '');
}

function evolutionPicker(items) {
  const slot = document.createElement('div');
  slot.className = 'evolution-picker';
  const ready = items.filter(item => !player.boughtHere.has(item));
  if (!ready.length) {
    slot.textContent = t('进化已购买');
    return slot;
  }
  const select = document.createElement('select');
  select.setAttribute('aria-label', t('选择进化武器'));
  const offer = document.createElement('div');
  for (const [index, item] of ready.entries()) {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = t(item.evolution);
    select.append(option);
  }
  const refresh = () => offer.replaceChildren(buildOffer(ready[Number(select.value) || 0]));
  select.addEventListener('change', refresh);
  refresh();
  slot.append(select, offer);
  return slot;
}

function shopSection(title, cards, count) {
  const section = document.createElement('section');
  section.className = 'shop-section';
  const heading = document.createElement('h3');
  heading.textContent = t(title) + ' · ' + t('{0} 个货位', count);
  section.append(heading, ...cards);
  for (let i = cards.length; i < count; i++) {
    const empty = document.createElement('span');
    empty.className = 'empty-slot';
    empty.textContent = t('本次无商品');
    section.append(empty);
  }
  return section;
}

function drawShop() {
  const weaponOffers = offers.filter(item => item.id);
  const weaponCards = weaponOffers.length > 2
    ? [buildOffer(weaponOffers[0]), evolutionPicker(weaponOffers.slice(1))]
    : weaponOffers.map(buildOffer);
  const cards = [shopSection('副武器', weaponCards, 2),
    shopSection('模块', offers.filter(item => !item.id).map(buildOffer), 3)];
  const nextBoss = (wave + 2) % 5 === 0 ? stage.bosses[Math.floor((wave + 1) / 5)]?.[0] : null;
  const cost = 8 + rerolls * 4;
  const messages = [boss?.hp <= 0 && t('{0}已击败。', t(boss.profile.name)),
    t('可用芯片 {0}。场上剩余 {1} 个敌人。', chips, enemies.length),
    nextBoss ? t('下一波首领') + ' · ' + t(nextBoss) : wave === 1 && t('下一波开始会遇到远程炮台。')];
  setPanel(t('波间补给'), messages.filter(Boolean).join(' '), [
    [t('进入第 {0} 波', wave + 2), () => { if (mode === modes.shop) startWave(wave + 1); }],
    [t('刷新') + ' · ◇ ' + cost, () => {
      if (mode !== modes.shop || chips < cost) return;
      chips -= cost;
      rerolls++;
      rollShop();
      syncHud();
      drawShop();
    }, chips < cost],
  ], cards);
}

function finish(won, reason = '') {
  enterMode(modes.end);
  const actions = [[t('再来一局'), startRun], [t('返回首页'), home]];
  if (won && stageIndex + 1 < stages.length) {
    actions.unshift([t('下一关') + ' · ' + t(stages[stageIndex + 1].name), () => {
      selectStage(stageIndex + 1);
      startRun();
    }]);
  }
  if (showTestTools && !won && player.hp <= 0 && !reason) {
    actions.unshift([t('测试复活'), () => {
      if (mode !== modes.end || player.hp > 0) return;
      player.hp = player.maxHp;
      player.invulnerable = 2;
      enterMode(modes.play);
      syncHud();
    }]);
  }
  const modules = Object.entries(player.moduleRanks).map(([name, rank]) => t(name) + ' Lv.' + rank);
  const summary = [reason, t('抵达第 {0} 波 · Lv.{1} · 击倒 {2} 个敌人。', wave + 1, player.level, kills),
    modules.length && t('已装模块') + ' · ' + modules.join(gameLanguage === 'en' ? ', ' : '、')];
  setPanel(won ? t(stage.name) + ' · ' + t('已通关') : t('防卫中断'), summary.filter(Boolean).join(' '),
    actions, [], damageDetails());
}

function syncHud() {
  const seconds = Math.max(0, Math.ceil(remaining ?? 0));
  const clock = String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
  updateText('time', remaining === null ? t('不限时') : clock);
  updateText('wave-label', t('第 {0} / {1} 波', wave + 1, stage.waves.length));
  updateText('chips', '◇ ' + chips);
  updateText('hud-character', player.character.name);
  updateText('hud-level', 'Lv.' + player.level + ' · ' + player.xp + '/' + xpRequired() + ' XP');
  updateText('health-text', Math.ceil(player.hp) + ' / ' + player.maxHp);
  el('health-fill').style.width = 100 * player.hp / player.maxHp + '%';
  el('xp-fill').style.width = 100 * player.xp / xpRequired() + '%';
  const skill = player.character.skill;
  updateText('skill-name', t(skill.name));
  updateText('skill-status', player.skillCooldown > 0 ? t('冷却 {0} 秒', Math.ceil(player.skillCooldown))
    : t('可释放') + (coarsePointer.matches ? '' : ' · Q'));
  el('skill-use').disabled = mode !== modes.play || player.skillCooldown > 0;
  el('boss-hud').hidden = !boss || boss.hp <= 0;
  if (boss) {
    updateText('boss-name', t(boss.profile.name) + ' · ' + t('阶段 {0}', boss.phaseIndex + 1) + ' / ' + boss.profile.floors.length);
    for (const [index, bar] of boss.bars.entries()) {
      const { current, max } = phaseHealth(boss, index);
      bar.fill.style.width = 100 * current / max + '%';
      const active = index === boss.phaseIndex;
      bar.container.classList.toggle('active', active);
      bar.container.classList.toggle('spent', current === 0);
      if (active) updateText('boss-phase-value', Math.ceil(current) + ' / ' + max);
    }
  }
}

function phaseHealth(enemy, index) {
  const floors = enemy.profile.floors;
  const lower = Math.round(enemy.maxHp * floors[index]);
  const upper = index === 0 ? enemy.maxHp : Math.round(enemy.maxHp * floors[index - 1]);
  return { lower, max: upper - lower, current: clamp(enemy.hp - lower, 0, upper - lower) };
}

function refreshBossBars(enemy) {
  enemy.bars = enemy.profile.floors.map((_, index) => {
    const container = document.createElement('div');
    container.className = 'phase-health';
    container.setAttribute('aria-label', t('阶段 {0}', index + 1));
    const fill = document.createElement('i');
    container.append(fill);
    return { container, fill };
  });
  el('boss-bars').replaceChildren(...enemy.bars.map(bar => bar.container));
}

function updateText(id, value) {
  const label = el(id);
  if (label.textContent !== value) label.textContent = value;
}

function spawn() {
  const edge = Math.floor(random(0, 4));
  const shooter = wave >= 2 && Math.random() < .15 + stageIndex * .04;
  const flank = !shooter && wave > 0 && Math.random() < .34;
  const elite = !shooter && !flank && wave >= 3 && Math.random() < .24;
  const enemy = {
    type: shooter ? 'sentry' : elite ? 'elite' : flank ? 'flank' : 'drone', r: shooter ? 16 : elite ? 19 : flank ? 10 : 13,
    x: edge === 0 ? 17 : edge === 1 ? width - 17 : random(20, width - 20),
    y: edge === 2 ? 105 : edge === 3 ? height - 17 : random(105, height - 18),
    hp: ((shooter ? 49 : elite ? 95 : flank ? 23 : 36) + wave * (elite ? 13 : 6) + stageIndex * 10) * healthTier(wave),
    speed: (shooter ? 76 : elite ? 78 : flank ? random(140, 158) : random(83, 108)) + Math.min(wave * 5, 56),
    attack: random(1.5, 3), windup: 0,
    grace: .45, phase: random(0, Math.PI * 2),
  };
  if (distance(player, enemy) < 100) {
    enemy.x = width - enemy.x;
    enemy.y = clamp(height - enemy.y, 105, height - 17);
  }
  enemies.push(enemy);
}

function releaseStick(event) {
  if (event && event.pointerId !== joystick.id) return;
  const oldId = joystick.id;
  joystick.id = null;
  joystick.dx = joystick.dy = 0;
  el('stick').hidden = true;
  if (oldId !== null && el('move-zone').hasPointerCapture(oldId)) el('move-zone').releasePointerCapture(oldId);
}

function bindInput() {
  const zone = el('move-zone');
  zone.addEventListener('pointerdown', event => {
    if (mode !== modes.play || joystick.id !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    Object.assign(joystick, { id: event.pointerId, x: event.clientX, y: event.clientY });
    el('gesture-tip').hidden = true;
    const stick = el('stick');
    stick.hidden = false;
    stick.style.left = joystick.x + 'px';
    stick.style.top = joystick.y + 'px';
    stick.firstElementChild.style.transform = '';
    zone.setPointerCapture(event.pointerId);
  });
  zone.addEventListener('pointermove', event => {
    if (event.pointerId !== joystick.id) return;
    const dx = event.clientX - joystick.x, dy = event.clientY - joystick.y;
    const length = Math.max(37, Math.hypot(dx, dy));
    joystick.dx = dx / length;
    joystick.dy = dy / length;
    el('stick').firstElementChild.style.transform = 'translate(' + joystick.dx * 31 + 'px, ' + joystick.dy * 31 + 'px)';
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) zone.addEventListener(name, releaseStick);
  document.addEventListener('keydown', event => {
    const key = event.key.toLowerCase();
    if (key === 'escape' && !event.repeat) togglePause();
    if (key === 'q' && !event.repeat && mode === modes.play) {
      event.preventDefault();
      activateSkill();
    }
    if (mode !== modes.play || !directions[key]) return;
    event.preventDefault();
    keys.add(key);
  });
  document.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
  function suspend() {
    clearInput();
    if (mode === modes.play) togglePause();
  }
  window.addEventListener('blur', suspend);
  document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); });
  window.addEventListener('resize', resize);
}

function movePlayer(dt) {
  let dx = joystick.dx, dy = joystick.dy;
  for (const key of keys) {
    dx += directions[key][0];
    dy += directions[key][1];
  }
  const norm = Math.max(1, Math.hypot(dx, dy));
  const oldX = player.x, oldY = player.y;
  player.x = clamp(player.x + dx / norm * player.speed * dt, 20, width - 20);
  player.y = clamp(player.y + dy / norm * player.speed * dt, 101, height - 25);
  const moved = Math.hypot(player.x - oldX, player.y - oldY);
  player.moving = moved > .02;
  player.stride = player.moving ? player.stride + moved : 0;
  if (Math.abs(dx) > .12) player.flip = dx < 0;
}

function attack() {
  let target = null, closest = Infinity;
  for (const enemy of enemies) {
    const gap = distance(player, enemy);
    if (enemy.hp <= 0 || enemy.grace > 0 || gap >= closest) continue;
    target = enemy;
    closest = gap;
  }
  if (!target) return;
  const angle = Math.atan2(target.y - player.y, target.x - player.x);
  const spread = player.split ? [-.14, .14] : [0];
  const id = player.character.id;
  const usesBook = player.character === characters.claude;
  if (usesBook && closest > pageReach + target.r) return;
  if (id === 'grok' && closest > 126 + target.r) return;
  player.cast = .22;
  player.castAngle = angle;
  player.shotCount++;
  if (id === 'grok') {
    const damage = mainDamage();
    const rune = signatureRank() ? damage * (.25 + .15 * signatureRank()) : 0;
    swingAxe(player, angle, damage, rune, false);
    if (player.split) player.mirrorSwing = { target, angle, damage, rune, delay: Math.min(.16, player.interval * .48) };
    player.attack = player.interval;
    return;
  }
  if (id === 'deepseek' || id === 'gemini') {
    const living = enemies.filter(enemy => enemy.hp > 0 && !(enemy.grace > 0));
    const second = id === 'gemini' && living.filter(enemy => enemy !== target).sort((a,b) => distance(player,a) - distance(player,b))[0];
    const targets = id === 'gemini' ? [target, second || target] : [target];
    for (const [i, aim] of targets.entries()) {
      for (const offset of spread) {
        const heading = Math.atan2(aim.y - player.y, aim.x - player.x) + offset;
        const speed = id === 'gemini' ? 500 : 395;
        const side = id === 'gemini' ? (i ? 4 : -4) : 0;
        shots.push({ x: player.x - Math.sin(heading) * side, y: player.y + Math.cos(heading) * side,
          angle: heading, vx: Math.cos(heading) * speed, vy: Math.sin(heading) * speed, r: 7,
          life: 1.6, hits: new Set(), damage: mainDamage(), source: 'main', icon: player.character.icon,
          trait: id, echo: signatureRank() && player.shotCount % 3 === 0 });
      }
    }
    player.attack = player.interval;
    return;
  }
  const charged = !usesBook && player.shotCount % 3 === 0;
  for (const offset of spread) {
    const heading = angle + offset;
    const speed = usesBook ? pageSpeed : 530;
    shots.push({ x: player.x, y: player.y, vx: Math.cos(heading) * speed, vy: Math.sin(heading) * speed,
      angle: heading, r: usesBook ? 8 : charged ? 11 : 4,
      life: usesBook ? 3.2 : 1.42, hits: new Set(), damage: mainDamage(charged ? 1.65 : 1),
      charged, pierces: usesBook, icon: usesBook ? 'page-bolt' : 'dragon-bolt',
      pageTime: usesBook ? pageOutTime : undefined });
  }
  player.attack = player.interval;
}

function swingAxe(origin, angle, damage, rune, mirror) {
  addEffect('grok', origin, 126, mirror ? .34 : .28, angle, mirror ? 1 : 0, mirror ? 'mirror' : 'main');
  for (const enemy of enemies) {
    if (!inArc(origin, enemy, 126, angle, 1.16)) continue;
    if (!applyDamage(enemy, damage, 'main')) continue;
    if (rune && applyDamage(enemy, rune, 'signature')) spark(enemy.x, enemy.y, '#ffcf65', 4);
  }
}

function stepMirrorSwing(dt) {
  const swing = player.mirrorSwing;
  if (!swing || (swing.delay -= dt) > 0) return;
  player.mirrorSwing = null;
  const { angle } = swing;
  const origin = {
    x: clamp(player.x + Math.cos(angle) * 12 - Math.sin(angle) * 32, 12, width - 12),
    y: clamp(player.y + Math.sin(angle) * 12 + Math.cos(angle) * 32, 20, height - 12),
  };
  const inReach = enemy => enemy.hp > 0 && !(enemy.grace > 0) && !(enemy.transition > 0) && distance(origin, enemy) <= 126 + enemy.r;
  let target = swing.target;
  if (!inReach(target)) {
    target = null;
    for (const enemy of enemies) {
      if (inReach(enemy) && (!target || distance(origin, enemy) < distance(origin, target))) target = enemy;
    }
  }
  const aim = target ? Math.atan2(target.y - origin.y, target.x - origin.x) : angle;
  swingAxe(origin, aim, swing.damage, swing.rune, true);
}

function mainDamage(multiplier = 1) {
  const mirror = player.moduleRanks['镜像进程'] ?? 0;
  return player.power * multiplier * attackMultiplier() * [1, .78, .88, 1][mirror];
}

function inArc(origin, enemy, radius, aim, halfAngle) {
  const gap = distance(origin, enemy);
  if (gap > radius + enemy.r) return false;
  if (gap <= enemy.r) return true;
  const delta = Math.atan2(enemy.y - origin.y, enemy.x - origin.x) - aim;
  return Math.acos(clamp(Math.cos(delta), -1, 1)) <= halfAngle + Math.asin(Math.min(1, enemy.r / gap));
}

function onMainImpact(shot, enemy) {
  const rank = signatureRank();
  if (shot.trait === 'deepseek') {
    const echoRadius = 78 + rank * 12;
    addEffect('deepseek', enemy, rank ? echoRadius : 68, .32, shot.angle, 0, 'main');
    for (const near of enemies) {
      const gap = distance(enemy, near);
      if (near !== enemy && gap <= 68 + near.r) damageEnemy(near, shot.damage * .6, 'main');
      if (rank && gap <= echoRadius + near.r) applyDamage(near, shot.damage * (.45 + rank * .20), 'signature');
    }
  } else if (shot.trait === 'gemini' && shot.echo && rank) {
    const near = enemies.filter(other => other !== enemy && other.hp > 0 && !(other.grace > 0) && distance(enemy, other) <= 165)
      .sort((a,b) => distance(enemy,a) - distance(enemy,b))[0] ?? enemy;
    if (applyDamage(near, shot.damage * (.55 + rank * .25), 'signature')) {
      player.links.push({ from: { x: enemy.x, y: enemy.y }, to: near, life: .17 });
      spark(near.x, near.y, player.character.color, 6);
    }
  }
}

function damageEnemy(enemy, damage, source = 'main', returningPage = false) {
  if (!applyDamage(enemy, damage, source)) return;
  if (!player.signatureEquipped || player.character !== characters.claude) return;
  if (returningPage) {
    if (enemy.hp > 0) enemy.inkMark = 5;
    return;
  }
  const inkBurst = enemy.inkMark > 0;
  if (inkBurst) {
    enemy.inkMark = 0;
    const extra = signatureRank() - 1;
    const bonus = damage * (.70 + extra * .15) + 48 + extra * 16;
    applyDamage(enemy, bonus, 'signature');
    spark(enemy.x, enemy.y, '#ffbb62', 12);
    for (const near of enemies) {
      if (near !== enemy && near.hp > 0 && !(near.grace > 0) && distance(enemy, near) <= 82) {
        applyDamage(near, bonus * .55, 'signature');
      }
    }
  }
}

function applyDamage(enemy, damage, source) {
  if (enemy.hp <= 0 || enemy.grace > 0 || enemy.transition > 0) return false;
  const before = enemy.hp;
  if (enemy.profile) {
    const { lower } = phaseHealth(enemy, enemy.phaseIndex);
    const armor = enemy.profile.final ? corePhases[enemy.phaseIndex].armor : 1 - enemy.phaseIndex * .1;
    enemy.hp = Math.max(lower, enemy.hp - damage * armor);
    if (lower > 0 && enemy.hp <= lower) startBossPhase(enemy, enemy.phaseIndex + 1);
  } else enemy.hp = Math.max(0, enemy.hp - damage);
  enemy.flash = .13;
  player.damage[source] = (player.damage[source] ?? 0) + before - enemy.hp;
  return enemy.hp < before;
}

function nearestForSkill(limit, exclude) {
  let closest = limit, target = null;
  for (const enemy of enemies) {
    if (enemy.hp <= 0 || enemy.grace > 0 || exclude?.has(enemy)) continue;
    const gap = distance(player, enemy);
    if (gap <= closest) { closest = gap; target = enemy; }
  }
  return target;
}

function addEffect(id, center, radius, duration, aim, pulse, kind = 'skill') {
  skillVfx.push({ id, x: center.x, y: center.y, radius, life: duration, duration, aim, pulse, kind });
}

function activateSkill() {
  if (mode !== modes.play || player.skillCooldown > 0) return;
  const { id, skill } = player.character;
  const target = nearestForSkill(id === 'claude' ? 300 : Infinity);
  const angle = target ? Math.atan2(target.y - player.y, target.x - player.x) : (player.flip ? Math.PI : 0);
  const origin = id === 'claude' && target ? target : player;
  player.skillCast = { center: { x: origin.x, y: origin.y }, angle, used: new Set(), pulse: 0, next: .18 };
  player.skillFacing = Math.cos(angle) < 0 ? -1 : 1;
  const bounds = canvas.getBoundingClientRect();
  const hudBottom = Math.max(el('hud-level').getBoundingClientRect().bottom,
    boss?.hp > 0 ? el('boss-hud').getBoundingClientRect().bottom : 0);
  player.cutInTop = (hudBottom - bounds.top + 17) * height / bounds.height;
  player.skillDuration = .18 + (skill.hits.length - 1) * skill.interval + .40;
  player.skillPose = player.skillDuration;
  player.skillCooldown = ultimateCooldown;
  syncHud();
}

function stepSkill(dt) {
  player.skillCooldown = Math.max(0, player.skillCooldown - dt);
  player.skillPose = Math.max(0, player.skillPose - dt);
  skillVfx = skillVfx.filter(effect => (effect.life -= dt) > 0);
  const cast = player.skillCast;
  if (!cast) return;
  cast.next -= dt;
  if (cast.next > 0) return;
  const { id, skill, color } = player.character;
  let center = player;
  if (id === 'claude') center = cast.center;
  if (id === 'deepseek') {
    const offset = 54 + 56 * cast.pulse;
    center = { x: cast.center.x + Math.cos(cast.angle) * offset, y: cast.center.y + Math.sin(cast.angle) * offset };
  }
  if (id === 'gemini') {
    const target = nearestForSkill(400, cast.used) ?? nearestForSkill(400);
    if (target) { center = target; cast.used.add(target); }
  }
  if (id === 'grok') {
    const target = nearestForSkill(240);
    if (target) cast.angle = Math.atan2(target.y - player.y, target.x - player.x);
  }
  const radius = skill.radius ?? skill.reaches[cast.pulse];
  addEffect(id, center, radius, .54, cast.angle, cast.pulse);
  const damage = skill.hits[cast.pulse] * attackMultiplier();
  for (const enemy of enemies) {
    const inside = id === 'grok' && cast.pulse < 2 ? inArc(center, enemy, radius, cast.angle, 1.38) : distance(center, enemy) <= radius + enemy.r;
    if (inside) damageEnemy(enemy, damage, 'skill');
  }
  spark(center.x, center.y, color, 11);
  cast.pulse++;
  cast.next += skill.interval;
  if (cast.pulse >= skill.hits.length) player.skillCast = null;
}

function gainExperience(enemy) {
  player.xp += enemy.type === 'boss' ? 15 : enemy.type === 'elite' ? 3 : 1;
  while (player.xp >= xpRequired()) {
    player.xp -= xpRequired();
    player.level++;
    player.maxHp += 6;
    player.hp = Math.min(player.maxHp, player.hp > 0 ? player.hp + 6 : 0);
    if (player.level % 2 === 0) player.defense++;
    spark(player.x, player.y, '#ffe4a0', 12);
  }
}

function orbitBlades(paths) {
  const blades = [];
  for (const [radius, count, direction] of paths) {
    for (let i = 0; i < count; i++) {
      const angle = player.orbitAngle * direction + i * Math.PI * 2 / count;
      blades.push({ x: player.x + Math.cos(angle) * radius, y: player.y + Math.sin(angle) * radius, angle });
    }
  }
  return blades;
}

function fireShot(angle, speed, radius, stats, icon) {
  shots.push({ x: player.x, y: player.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
    angle, r: radius, life: 1.4, hits: new Set(), damage: stats.damage, source: stats.source, pierces: stats.pierces, icon });
}

const weaponAttacks = {
  nova(stats, targets) {
    const inRange = targets.filter(enemy => distance(player, enemy) <= stats.radius + enemy.r);
    if (!inRange.length) return 0;
    player.pulse = .32;
    for (const enemy of inRange) damageEnemy(enemy, stats.damage, stats.source);
    return stats.interval;
  },
  fan(stats, targets) {
    const aim = Math.atan2(targets[0].y - player.y, targets[0].x - player.x);
    for (let i = 0; i < stats.count; i++) {
      fireShot(aim + (i - (stats.count - 1) / 2) * .13, 410, 6, stats, 'fan-bolt');
    }
    return stats.interval;
  },
  prism(stats, targets) {
    if (distance(player, targets[0]) > stats.reach) return 0;
    let from = player;
    const chain = new Set();
    for (let i = 0; i < stats.targets; i++) {
      let nearest = null;
      let gap = i === 0 ? stats.reach : stats.jump;
      for (const enemy of targets) {
        const distanceToEnemy = distance(from, enemy);
        if (chain.has(enemy) || distanceToEnemy > gap) continue;
        nearest = enemy;
        gap = distanceToEnemy;
      }
      if (!nearest) break;
      player.links.push({ from, to: nearest, life: .17 });
      damageEnemy(nearest, stats.damage, stats.source);
      chain.add(nearest);
      from = nearest;
    }
    return stats.interval;
  },
  lance(stats, targets) {
    const aim = Math.atan2(targets[0].y - player.y, targets[0].x - player.x);
    for (let i = 0; i < stats.count; i++) fireShot(aim + i * Math.PI, 600, 8, stats, 'lance-bolt');
    return stats.interval;
  },
};

function fireWeapons(dt) {
  player.pulse = Math.max(0, player.pulse - dt);
  player.weaponTime += dt;
  player.orbitAngle += dt * 3.1;
  player.links = player.links.filter(link => (link.life -= dt) > 0);
  const targets = enemies.filter(enemy => !(enemy.grace > 0) && enemy.hp > 0);
  targets.sort((a, b) => distance(player, a) - distance(player, b));
  for (const [id, fire] of Object.entries(weaponAttacks)) {
    const rank = player.ranks[id];
    if (!rank) continue;
    const cooldown = (player.cooldowns[id] ?? 0) - dt;
    player.cooldowns[id] = cooldown;
    if (cooldown > 0) continue;
    const living = targets.filter(enemy => enemy.hp > 0);
    if (living.length) {
      const stats = weaponStats[id](rank);
      stats.damage *= attackMultiplier();
      stats.source = id;
      player.cooldowns[id] = fire(stats, living);
    }
  }
  const rank = player.ranks.orbit;
  if (!rank) return;
  const orbit = weaponStats.orbit(rank);
  const blades = orbitBlades(orbit.paths);
  for (const enemy of targets) {
    if (enemy.hp <= 0 || (player.orbitHits.get(enemy) ?? 0) > player.weaponTime) continue;
    if (blades.some(blade => distance(blade, enemy) <= enemy.r + orbit.bladeRadius)) {
      damageEnemy(enemy, orbit.damage * attackMultiplier(), 'orbit');
      player.orbitHits.set(enemy, player.weaponTime + orbit.hitInterval);
    }
  }
}

function hurt(amount) {
  if (player.invulnerable > 0) return;
  let damage = Math.max(1, Math.ceil(amount * (1 - damageReduction())));
  if (player.ward > 0) {
    damage = Math.max(0, damage - player.ward);
    player.ward = 0;
    player.wardCharge = 0;
    spark(player.x, player.y, '#d7b0ff', 15);
  }
  player.hp = Math.max(0, player.hp - damage);
  player.invulnerable = .68;
  if (damage > 0) {
    player.hurtFlash = .23;
    spark(player.x, player.y, '#ff709e', 9);
  }
}

function spark(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = random(0, Math.PI * 2), speed = random(24, 130);
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: random(.17, .42), color });
  }
}

function telegraph(x, y, radius, damage) {
  rings.push({ x, y, r: radius, damage, time: .8, life: 1.03, fired: false });
}

function summonWisps(enemy, count) {
  const active = enemies.filter(other => other.type === 'wisp' && other.hp > 0).length;
  const slots = Math.min(count, 6 - active);
  for (let i = 0; i < slots; i++) {
    const angle = i * Math.PI * 2 / slots + enemy.volleys;
    enemies.push({
      type: 'wisp', x: clamp(enemy.x + 80 * Math.cos(angle), 20, width - 20),
      y: clamp(enemy.y + 80 * Math.sin(angle), 105, height - 20),
      r: 12, hp: 92 * healthTier(wave), speed: 145, grace: .65,
    });
  }
}

function startBossPhase(enemy, phaseIndex) {
  enemy.phaseIndex = phaseIndex;
  enemy.speed = enemy.profile.final ? corePhases[phaseIndex].speed : enemy.speed + 16;
  enemy.transition = 1.05;
  enemy.attack = 0;
  banner = 2.3;
  updateText('wave-message', t(phaseIndex === 2 ? '第三阶段 · 暴走' : '第二阶段 · 强化冲击'));
  if (enemy.profile.final || stageIndex > 0) summonWisps(enemy, phaseIndex === 2 ? 3 : 2);
  spark(enemy.x, enemy.y, '#ff9edd', 26);
}

function enemyShot(enemy, angle, speed, damage, sentry = false) {
  hostileShots.push({ x: enemy.x, y: enemy.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
    angle, life: 5, r: sentry ? 5 : 7, damage, sentry });
}

function stepBoss(enemy, dt, aim) {
  if (enemy.transition > 0) {
    enemy.transition = Math.max(0, enemy.transition - dt);
    if (enemy.transition > 0) return;
  }
  const phaseIndex = enemy.phaseIndex;
  const { final, pattern } = enemy.profile;
  const phase = final ? corePhases[phaseIndex] : {
    interval: guardianIntervals[phaseIndex], blast: 58 + stageIndex * 5 + phaseIndex * 10,
    damage: 24 + stageIndex * 4 + phaseIndex * 5, bullets: 8 + stageIndex * 2 + phaseIndex * 2,
  };
  enemy.attack -= dt;
  if (enemy.attack > 0) return;
  enemy.attack = phase.interval;
  enemy.recoil = .37;
  enemy.volleys++;
  if (pattern === 'fan' || (pattern === 'strike' && phaseIndex >= 1 && enemy.volleys % 2 === 0)) {
    const count = phaseIndex > 0 ? 5 : 3;
    for (let i = 0; i < count; i++) enemyShot(enemy, aim + (i - (count - 1) / 2) * .19, 195 + stageIndex * 24, phase.damage - 4);
  }
  if ((pattern === 'ring' || final) && (phaseIndex === 2 || enemy.volleys % 2 === 0)) {
    const speed = 172 + phaseIndex * 38;
    for (let i = 0; i < phase.bullets; i++) {
      const angle = aim + Math.PI * 2 * (i + .5) / phase.bullets;
      enemyShot(enemy, angle, speed, phase.damage - 5);
    }
  }
  if (pattern === 'strike' || phaseIndex > 0 || enemy.volleys % 2 === 1) {
    telegraph(player.x, player.y, phase.blast, phase.damage);
    if (phaseIndex === 2) {
      telegraph(player.x - Math.sin(aim) * 110, player.y + Math.cos(aim) * 110, 54, 32);
    }
  }
  if (final && phaseIndex > 0 && enemy.volleys % 3 === 0) summonWisps(enemy, phaseIndex + 1);
}

function stepSentry(enemy, dt, dx, dy, gap) {
  if (enemy.windup > 0) {
    enemy.windup -= dt;
    if (enemy.windup <= 0) {
      enemyShot(enemy, enemy.aim, 242 + stageIndex * 23, 16 + stageIndex * 3 + Math.floor(wave / 3), true);
      enemy.attack = 2.45;
      enemy.recoil = .24;
    }
  } else {
    enemy.attack -= dt;
    if (enemy.attack <= 0 && gap <= 300) {
      enemy.aim = Math.atan2(dy, dx);
      enemy.windup = .49;
    }
    if (gap > 1 && (gap > 190 || gap < 115)) {
      const pace = enemy.speed * dt * (gap > 190 ? 1 : -.77) / gap;
      enemy.x = clamp(enemy.x + dx * pace, 14, width - 14);
      enemy.y = clamp(enemy.y + dy * pace, 103, height - 18);
    }
  }
  if (gap <= enemy.r + 12) hurt(11 + stageIndex * 2);
}

function stepEnemies(dt) {
  for (const enemy of enemies) {
    if (enemy.hp <= 0) continue;
    enemy.pose = (enemy.pose ?? 0) + dt;
    if (enemy.recoil > 0) enemy.recoil -= dt;
    if (enemy.inkMark > 0) enemy.inkMark -= dt;
    if (enemy.grace > 0) { enemy.grace -= dt; continue; }
    const dx = player.x - enemy.x, dy = player.y - enemy.y;
    const gap = Math.hypot(dx, dy);
    if (enemy.type === 'sentry') {
      stepSentry(enemy, dt, dx, dy, gap);
      continue;
    }
    if (enemy.profile) {
      stepBoss(enemy, dt, Math.atan2(dy, dx));
    } else if (enemy.type === 'elite') {
      enemy.attack -= dt;
      if (enemy.attack <= 0) {
        enemy.attack = 4.8;
        telegraph(player.x, player.y, 42, 24);
      }
    }
    if (gap > enemy.r + 4) {
      enemy.x += dx / gap * enemy.speed * dt;
      enemy.y += dy / gap * enemy.speed * dt;
    }
    if (gap <= enemy.r + 12) hurt(enemy.profile?.final ? 42 : enemy === boss ? 30 : 13 + wave);
  }
  for (const ring of rings) {
    ring.time -= dt;
    ring.life -= dt;
    if (ring.time <= 0 && !ring.fired) {
      ring.fired = true;
      if (distance(player, ring) <= ring.r + 7) hurt(ring.damage);
    }
  }
  rings = rings.filter(ring => ring.life > 0);
  hostileShots = hostileShots.filter(shot => {
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.life -= dt;
    if (shot.life <= 0 || shot.x < -20 || shot.x > width + 20 || shot.y < -20 || shot.y > height + 20) return false;
    if (distance(shot, player) > shot.r + 9) return true;
    hurt(shot.damage);
    return false;
  });
}

function stepShots(dt) {
  for (const shot of shots) {
    if (shot.pageTime !== undefined) steerPage(shot, dt);
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.life -= dt;
    if (shot.life <= 0) continue;
    for (const enemy of enemies) {
      if (enemy.hp <= 0 || enemy.grace > 0 || shot.hits.has(enemy) || distance(shot, enemy) > shot.r + enemy.r) continue;
      shot.hits.add(enemy);
      const before = enemy.hp;
      damageEnemy(enemy, shot.damage, shot.source, Boolean(shot.returning));
      if (shot.trait && enemy.hp < before) onMainImpact(shot, enemy);
      spark(enemy.x, enemy.y, '#c9a4ff', 3);
      if (!shot.charged && !shot.pierces) { shot.life = 0; break; }
    }
  }
  shots = shots.filter(shot => shot.life > 0);
  enemies = enemies.filter(enemy => {
    enemy.flash = Math.max(0, (enemy.flash || 0) - dt);
    if (enemy.hp > 0) return true;
    kills++;
    gainExperience(enemy);
    spark(enemy.x, enemy.y, enemy === boss ? '#f3a8fb' : '#81ffe5', enemy === boss ? 28 : 9);
    if (enemy === boss && !enemy.profile.final) {
      const x = clamp(enemy.x, 35, width - 35);
      drops.push({ x: x - 14, y: enemy.y, heal: true });
      if (Math.random() < .30) drops.push({ x: x + 14, y: enemy.y, heal: true });
    } else if (enemy !== boss) {
      if (Math.random() < chipRates[Math.min(wave, chipRates.length - 1)]) drops.push({ x: enemy.x, y: enemy.y });
      if (Math.random() < (enemy.type === 'elite' ? .05 : .01)) drops.push({ x: enemy.x + 5, y: enemy.y, heal: true });
    }
    return false;
  });
}

function steerPage(shot, dt) {
  shot.pageTime -= dt;
  if (shot.pageTime > 0) return;
  if (!shot.returning) {
    shot.returning = true;
    shot.hits.clear();
    shot.damage *= .75;
  }
  if (distance(shot, player) < 13) {
    shot.life = 0;
    return;
  }
  shot.angle = Math.atan2(player.y - shot.y, player.x - shot.x);
  shot.vx = Math.cos(shot.angle) * pageSpeed * 1.12;
  shot.vy = Math.sin(shot.angle) * pageSpeed * 1.12;
}

function animatePlayer(dt) {
  player.pose += dt;
  player.cast = Math.max(0, player.cast - dt);
  player.hurtFlash = Math.max(0, player.hurtFlash - dt);
  player.recovery = Math.max(0, player.recovery - dt);
  player.trail -= dt;
  if (!player.moving) return;
  if (player.character === characters.chatgpt && player.signatureEquipped && !player.ward) {
    player.wardCharge += dt;
    if (player.wardCharge >= wardRecharge()) {
      player.ward = wardCapacity();
      player.wardCharge = 0;
      spark(player.x, player.y, '#d7b0ff', 12);
    }
  }
  if (!reducedMotion.matches && player.trail <= 0) {
    player.trail = .11;
    particles.push({ x: player.x, y: player.y + 6, vx: 0, vy: -14, life: .35,
      color: player.character === characters.claude ? '#ffc67d' : '#cca5ff' });
  }
}

function step(dt) {
  if (remaining !== null) remaining -= dt;
  if (banner > 0) {
    banner -= dt;
    if (banner <= 0) el('wave-message').textContent = '';
  }
  player.invulnerable -= dt;
  player.attack -= dt;
  movePlayer(dt);
  animatePlayer(dt);
  spawnTimer -= dt;
  if (spawnTimer <= 0 && enemies.length < 35) {
    spawn();
    if (remaining !== null && wave >= 4 && enemies.length < 35 && Math.random() < .35) spawn();
    spawnTimer = remaining === null ? .9 : Math.max(.34, .89 - wave * .065);
  }
  stepMirrorSwing(dt);
  if (player.attack <= 0) attack();
  stepSkill(dt);
  fireWeapons(dt);
  stepEnemies(dt);
  stepShots(dt);
  drops = drops.filter(drop => {
    const gap = distance(player, drop);
    if (drop.heal && (player.hp >= player.maxHp || player.hp <= 0)) return true;
    if (gap <= 14) {
      if (drop.heal) {
        player.hp = Math.min(player.maxHp, player.hp + 20);
        player.recovery = .48;
        spark(player.x, player.y, '#74ff93', 12);
      } else chips++;
      return false;
    }
    if (gap < player.magnet) {
      const travel = Math.min(gap, 320 * dt);
      drop.x += (player.x - drop.x) / gap * travel;
      drop.y += (player.y - drop.y) / gap * travel;
    }
    return true;
  });
  for (const particle of particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt;
  }
  particles = particles.filter(particle => particle.life > 0);
  if (player.hp <= 0) finish(false);
  else if (boss?.hp <= 0) {
    if (boss.profile.final) finish(true);
    else openShop();
  }
  else if (remaining !== null && remaining <= 0) {
    if (boss?.hp > 0) finish(false, t('倒计时结束，{0}仍未击败。', t(boss.profile.name)));
    else openShop();
  }
}

function circle(x, y, radius, fill, stroke) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}

function diamond(x, y, rx, ry, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x, y - ry);
  ctx.lineTo(x + rx, y);
  ctx.lineTo(x, y + ry);
  ctx.lineTo(x - rx, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}

function sprite(id, x, y, size, angle = 0) {
  const image = art[id];
  if (!image?.complete || !image.naturalWidth) return false;
  const ratio = size / Math.max(image.naturalWidth, image.naturalHeight);
  const w = image.naturalWidth * ratio;
  const h = image.naturalHeight * ratio;
  ctx.save();
  ctx.translate(x, y);
  if (angle) ctx.rotate(angle);
  ctx.drawImage(image, -w / 2, -h / 2, w, h);
  ctx.restore();
  return true;
}

function drawFloor() {
  const arena = art[stage.floor];
  if (arena.complete && arena.naturalWidth) {
    // Keep corner landmarks in view in both portrait and landscape.
    const crop = Math.min(arena.naturalWidth, arena.naturalHeight);
    const sourceW = crop * Math.min(1, Math.pow(width / height, .27));
    const sourceH = crop * Math.min(1, Math.pow(height / width, .27));
    ctx.drawImage(arena, (arena.naturalWidth - sourceW) / 2, (arena.naturalHeight - sourceH) / 2,
      sourceW, sourceH, 0, 0, width, height);
    ctx.fillStyle = '#251b392b';
    ctx.fillRect(0, 0, width, height);
    return;
  }
  const floor = ctx.createRadialGradient(width * .5, height * .47, 0, width * .5, height * .47, Math.max(width, height) * .68);
  floor.addColorStop(0, '#292044');
  floor.addColorStop(1, '#100d20');
  ctx.fillStyle = floor;
  ctx.fillRect(0, 0, width, height);
}

function drawEnemy(enemy) {
  const { x, y, r } = enemy;
  const id = enemy.profile?.icon ?? enemy.type;
  const size = enemy === boss ? r * 3.12 : r * 2.95;
  const time = (enemy.pose ?? 0) + (enemy.phase ?? 0);
  const animated = !reducedMotion.matches;
  const isBoss = Boolean(enemy.profile);
  const hop = animated ? Math.sin(time * (isBoss ? 3.4 : 7.4)) * (isBoss ? 5 : 2.7) : 0;
  const charging = isBoss && !(enemy.transition > 0) && enemy.attack > 0 && enemy.attack <= .55;
  const windup = charging ? 1 - enemy.attack / .55 : 0;
  const bounce = animated ? Math.sin(time * (isBoss ? 3.4 : 7.4)) * .035 : 0;
  const attackKick = animated ? Math.max(0, enemy.recoil ?? 0) : 0;
  ctx.save();
  ctx.translate(x, y + r * .37);
  ctx.scale(1, .43);
  circle(0, 0, r * 1.08, '#0a0618a0');
  ctx.restore();
  if (enemy.profile?.final && enemy.phaseIndex > 0) {
    circle(x, y, r + 10, '#fe53712c', enemy.phaseIndex === 2 ? '#ff79ad' : '#e15b92');
  }
  if (enemy.transition > 0) {
    ctx.lineWidth = 3;
    circle(x, y, r + 19, '#ffd5fc38', '#ffd5fc');
    ctx.lineWidth = 1;
  }
  if (charging) circle(x, y, r + 8 + windup * 9, '#ff87af22', '#ff9fbe');
  if (enemy.inkMark > 0) diamond(x, y - r - 7, 5, 7, '#fbb76e', '#fff3b7');
  if (enemy.type === 'sentry' && enemy.windup > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(enemy.aim) * 355, y + Math.sin(enemy.aim) * 355);
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = '#ffbb5cbf';
    ctx.stroke();
    ctx.restore();
  }
  ctx.save();
  if (enemy.grace > 0) ctx.globalAlpha = .49;
  if (enemy.flash > 0) ctx.filter = 'brightness(1.45)';
  ctx.translate(x, y - r * .19 - hop - attackKick * 13);
  const tilt = animated ? Math.sin(time * (isBoss ? 2.6 : 5.2)) * (isBoss ? .062 : .09) : 0;
  ctx.rotate(tilt + (enemy.transition > 0 && animated ? Math.sin(time * 17) * .10 : 0));
  const pulse = animated && enemy.transition > 0 ? Math.sin(time * 17) * .09 : 0;
  ctx.scale(1 + bounce + windup * .11 + pulse, 1 - bounce - windup * .13 + attackKick * .27 + pulse);
  if (!sprite(id, 0, 0, size)) diamond(0, 0, r, r, '#883948', '#ffb2bc');
  ctx.restore();
  if (enemy.grace > 0) circle(x, y, r + 6, null, '#ff9e7c');
}

function drawPlayer() {
  const { x, y } = player;
  const atlas = art[player.character.walk];
  const isClaude = player.character === characters.claude;
  const idleBob = !reducedMotion.matches && !player.moving ? Math.sin(player.pose * 4.2) * 2.3 : 0;
  const recoil = reducedMotion.matches ? 0 : Math.sin(player.cast / .22 * Math.PI) * .12;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, .48);
  circle(0, 3, player.ward > 0 ? 26 : 23, isClaude ? '#d6a55c35' : '#b99aff37',
    player.ward > 0 ? '#e2bcffc4' : isClaude ? '#ffbc8099' : '#c49affac');
  ctx.restore();
  if (player.ward > 0) circle(x, y - 10, 30, '#bd8cff14', '#dec5ff66');
  if (player.recovery > 0) circle(x, y, 22 + (.48 - player.recovery) * 54, null, '#8dffd4a0');
  ctx.save();
  if (player.hurtFlash > 0) {
    ctx.filter = 'brightness(1.5) saturate(1.4)';
    if (!reducedMotion.matches) ctx.globalAlpha = .72;
  }
  ctx.translate(x, y + idleBob);
  ctx.rotate(recoil * (Math.cos(player.castAngle) < 0 ? -1 : 1));
  const stretch = reducedMotion.matches ? 0 : Math.sin(player.pose * 4.2) * (player.moving ? .012 : .028);
  ctx.scale(1 - stretch, 1 + stretch);
  const action = art['action-' + player.character.id];
  if (player.skillPose > 0 && action.complete && action.naturalWidth) {
    const elapsed = player.skillDuration - player.skillPose;
    const key = elapsed < .18 ? 0 : player.skillPose < .34 ? 2 : 1;
    const lean = reducedMotion.matches ? 0 : Math.sin(Math.min(1, elapsed / .4) * Math.PI);
    ctx.scale(player.skillFacing, 1);
    ctx.drawImage(action, key * 192, 0, 192, 192, -49 + lean * 4, -81 - lean * 3, 98, 98);
  } else if (atlas.complete && atlas.naturalWidth) {
    if (player.flip) ctx.scale(-1, 1);
    const frame = player.moving ? 1 + Math.floor(player.stride / 13) % 8 : 0;
    ctx.drawImage(atlas, frame * 96, 0, 96, 96, -33, -53, 66, 66);
  } else {
    diamond(0, -12, 13, 21, '#e6d5ff', '#fff');
  }
  ctx.restore();
  if (player.cast > 0 && player.skillPose <= 0 && player.character.id !== 'grok') {
    const progress = 1 - player.cast / .22;
    const sparkX = x + Math.cos(player.castAngle) * (13 + progress * 24);
    const sparkY = y - 12 + Math.sin(player.castAngle) * (13 + progress * 24);
    ctx.save();
    ctx.globalAlpha = 1 - progress;
    const bolt = isClaude ? 'page-bolt' : player.character.id === 'chatgpt' ? 'dragon-bolt' : player.character.icon;
    sprite(bolt, sparkX, sparkY, 23 + progress * 10, player.castAngle + Math.PI / 2);
    ctx.restore();
  }
}

function drawSkillEffects() {
  for (const effect of skillVfx) {
    const { id, x, y, aim, pulse, radius } = effect;
    const progress = 1 - effect.life / effect.duration;
    const motion = reducedMotion.matches ? .55 : progress;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = Math.min(1, (1 - progress) * 1.6) * (effect.kind === 'main' ? .59 : .86);
    const image = 'spell-' + id;
    if (id === 'chatgpt') {
      const r = radius * (.4 + .6 * motion);
      ctx.lineWidth = 2;
      circle(0, 0, r, '#dcc6ff0d', '#e3cdffab');
      for (let i = 0; i < 3; i++) {
        const angle = i * Math.PI * 2 / 3 + pulse * .65 + motion * .82;
        sprite(image, Math.cos(angle) * r * .77, Math.sin(angle) * r * .77, r * .64, angle + .6);
      }
    } else if (id === 'claude') {
      ctx.scale(1,.80);
      circle(0,0,radius,'#ffd69a14','#ffe2a599');
      sprite(image, 0, -15 - motion * 10, radius * .83, -.1 + motion * .18);
      for (let i = 0; i < 7; i++) {
        const angle = i * Math.PI * 2 / 7 + pulse * .46 + motion * .55;
        sprite('page-bolt', Math.cos(angle) * radius * .84, Math.sin(angle) * radius * .84, 28 + motion * 12, angle + .45);
      }
    } else if (id === 'deepseek') {
      ctx.rotate(aim);
      ctx.lineWidth = 2;
      if (effect.kind === 'skill') sprite(image, (motion - .45) * 40, -8 * Math.sin(motion * Math.PI), radius * 1.95, 0);
      else circle(0,0, Math.max(1,radius * (.28 + motion * .72)), '#8af9ff17','#b8faff');
    } else if (id === 'gemini') {
      ctx.rotate((pulse - 1) * .25);
      sprite(image, (1 - motion) * -20, (1 - motion) * -50, radius * (1.4 + .62 * motion), motion * .34);
      for (let i = 0; i < 5; i++) {
        const a = i * Math.PI * .4 + .25;
        diamond(Math.cos(a)*radius*motion, Math.sin(a)*radius*motion, 3, 7, '#fff2af');
      }
    } else if (id === 'grok') {
      if (effect.kind === 'mirror') {
        const atlas = art['action-grok'];
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, radius * (.63 + .24 * motion), aim - 1.18, aim + .96);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#a3ffff';
        ctx.stroke();
        ctx.scale(Math.cos(aim) < 0 ? -1 : 1, 1);
        ctx.globalAlpha *= .85;
        ctx.filter = 'sepia(1) saturate(2.5) hue-rotate(135deg) brightness(1.65)';
        if (atlas.complete && atlas.naturalWidth) ctx.drawImage(atlas, 192, 0, 192, 192, -44, -68, 88, 88);
        ctx.restore();
        ctx.filter = 'hue-rotate(145deg) brightness(1.22)';
      }
      ctx.rotate(aim + (pulse % 2 ? 1 : -1) * (.6 - motion * 1.1));
      if (pulse % 2) ctx.scale(1, -1);
      sprite(image, radius * .52, 0, radius * 1.43);
      if (pulse === 2) sprite(image, -radius * .52, 0, radius * 1.43, Math.PI);
    }
    ctx.restore();
  }
}

function drawSkillCutIn() {
  if (player.skillPose <= 0) return;
  const age = player.skillDuration - player.skillPose;
  const duration = .82;
  if (age >= duration || reducedMotion.matches) return;
  const w = Math.min(184, width * .43), h = 57;
  const top = player.cutInTop;
  ctx.save();
  const fromRight = player.y < height * .38 && player.x < width * .5;
  ctx.translate(fromRight ? width - w - 8 : 8, top);
  ctx.globalAlpha = Math.min(1, age * 14 + .25, (duration - age) * 5);
  ctx.translate((fromRight ? 1 : -1) * 22 * Math.max(0,1 - age * 7), 0);
  ctx.fillStyle = '#211b36e6';
  ctx.beginPath(); ctx.moveTo(0,4); ctx.lineTo(w,0); ctx.lineTo(w-12,h-5); ctx.lineTo(0,h); ctx.fill();
  ctx.strokeStyle = player.character.color; ctx.beginPath(); ctx.moveTo(2,h); ctx.lineTo(w-12,h-5); ctx.stroke();
  sprite('cast-' + player.character.id, 30, h / 2 - 3, 69);
  ctx.fillStyle = player.character.color; ctx.font = 'bold 10px system-ui'; ctx.fillText(player.character.name, 62, 21);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 17px system-ui'; ctx.fillText(t(player.character.skill.name), 61, 42, w - 74);
  ctx.restore();
}

function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(scale, 0, 0, scale, inset, 0);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  ctx.clip();
  drawFloor();
  drawSkillEffects();
  for (const ring of rings) {
    ctx.lineWidth = ring.fired ? 4 : 2;
    circle(ring.x, ring.y, ring.r, ring.fired ? '#ff558c84' : '#a809402f', '#872340');
    circle(ring.x, ring.y, Math.max(1,ring.r - 2), null, '#ffb7c7');
    if (!ring.fired) circle(ring.x, ring.y, Math.max(1, ring.r * (1 - ring.time / .8)), null, '#ff7fa788');
  }
  ctx.lineWidth = 1;
  for (const drop of drops) {
    const lift = drop.heal && !reducedMotion.matches ? Math.sin(player.pose * 5 + drop.x * .02) * 2 : 0;
    if (drop.heal) circle(drop.x, drop.y + 4, 11, '#54ff7030');
    if (!sprite(drop.heal ? 'healing-flask' : 'chip', drop.x, drop.y + lift, drop.heal ? 29 : 15)) {
      diamond(drop.x, drop.y, 5, 7, drop.heal ? '#aaffbb' : '#76ebd1');
    }
  }
  for (const enemy of enemies) drawEnemy(enemy);
  if (player.pulse > 0) {
    const radius = weaponStats.nova(player.ranks.nova).radius * (1 - player.pulse / .34);
    ctx.save();
    ctx.globalAlpha = player.pulse / .34;
    sprite('nova', player.x, player.y, radius * 2);
    ctx.restore();
    circle(player.x, player.y, radius, '#77e8ff19', '#8deaff');
  }
  if (player.ranks.orbit) {
    for (const blade of orbitBlades(weaponStats.orbit(player.ranks.orbit).paths)) {
      if (!sprite('orbit', blade.x, blade.y, 26, blade.angle)) diamond(blade.x, blade.y, 6, 10, '#f8b6ff', '#fff0ff');
    }
  }
  for (const link of player.links) {
    ctx.beginPath();
    ctx.moveTo(link.from.x, link.from.y);
    ctx.lineTo(link.to.x, link.to.y);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#b1aeff';
    ctx.stroke();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#fff0ff';
    ctx.stroke();
  }
  drawPlayer();
  for (const shot of shots) {
    if (shot.trait === 'deepseek') {
      ctx.lineWidth = 1.5;
      circle(shot.x, shot.y, 7.5, '#4cbadfe6', '#d4faff');
      circle(shot.x - 2, shot.y - 2, 2, '#f1ffff');
      circle(shot.x - Math.cos(shot.angle) * 11, shot.y - Math.sin(shot.angle) * 11, 2.5, '#bffaff');
      continue;
    }
    if (shot.trait === 'gemini') {
      ctx.save();
      ctx.translate(shot.x, shot.y); ctx.rotate(shot.angle);
      diamond(-5, 0, 12, 2, '#dfb3ffab');
      diamond(0, 0, 6, 7, shot.echo ? '#ffdb80' : '#e7a7ff', '#fff1ff');
      ctx.restore();
      continue;
    }
    const size = shot.icon === 'lance-bolt' || shot.charged ? 43 : 26;
    if (sprite(shot.icon, shot.x, shot.y, size, shot.angle + Math.PI / 2)) continue;
    ctx.save();
    ctx.translate(shot.x, shot.y);
    ctx.rotate(shot.angle);
    diamond(-3, 0, 13, shot.r, ['fan-bolt', 'page-bolt'].includes(shot.icon) ? '#ffb858' : '#d5a5ff', '#fff1cb');
    circle(4, 0, 2.4, '#fff8ef');
    ctx.restore();
  }
  for (const shot of hostileShots) {
    if (shot.sentry) {
      ctx.save();
      ctx.translate(shot.x, shot.y);
      ctx.rotate(shot.angle);
      diamond(-4, 0, 12, 5, '#ffaf54', '#fff1b6');
      ctx.restore();
    } else if (!sprite('hostile', shot.x, shot.y, 23, shot.angle + Math.PI * .75)) circle(shot.x, shot.y, 6, '#ff719f');
  }
  for (const particle of particles) {
    ctx.globalAlpha = clamp(particle.life * 4, 0, 1);
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, 3, 3);
  }
  ctx.globalAlpha = 1;
  drawSkillCutIn();
  ctx.restore();
}

function frame(now) {
  const dt = Math.min(.033, (now - previous) / 1000);
  previous = now;
  if (mode === modes.play) {
    const steps = Math.max(1, Math.ceil(dt * gameSpeed * 60));
    const tick = dt * gameSpeed / steps;
    for (let i = 0; i < steps && mode === modes.play; i++) step(tick);
    syncHud();
  }
  if (mode !== modes.home) render();
  requestAnimationFrame(frame);
}

const portraitStage = el('portrait-stage');
portraitStage.addEventListener('pointermove', event => {
  if (reducedMotion.matches || event.pointerType !== 'mouse') return;
  const rect = portraitStage.getBoundingClientRect();
  portraitStage.style.setProperty('--look-x', ((event.clientX - rect.left) / rect.width * 2 - 1) * 8 + 'px');
  portraitStage.style.setProperty('--look-y', ((event.clientY - rect.top) / rect.height * 2 - 1) * 5 + 'px');
});
portraitStage.addEventListener('pointerleave', () => {
  portraitStage.style.removeProperty('--look-x');
  portraitStage.style.removeProperty('--look-y');
});
setGameLanguage(gameLanguage);
el('language-select').addEventListener('change', event => {
  const language = event.target.value;
  if (!gameLanguages.includes(language)) return;
  setGameLanguage(language);
  try {
    localStorage.setItem('moegpt-survivors-language', language);
  } catch {
    // Language switching still works for this session.
  }
});
el('start').addEventListener('click', startRun);
el('skill-use').addEventListener('click', activateSkill);
for (const button of el('character-select').querySelectorAll('button')) {
  button.addEventListener('click', () => selectCharacter(button.dataset.character));
}
for (const button of el('stage-select').querySelectorAll('button')) {
  button.addEventListener('click', () => selectStage(Number(button.dataset.stage)));
}
el('pause').addEventListener('click', togglePause);
const testSpeed = el('test-speed');
testSpeed.hidden = !showTestTools;
if (showTestTools) {
  const buttons = testSpeed.querySelectorAll('button');
  for (const button of buttons) {
    button.addEventListener('click', () => {
      gameSpeed = Number(button.dataset.speed);
      for (const option of buttons) option.setAttribute('aria-pressed', option === button);
    });
  }
}
bindInput();
requestAnimationFrame(frame);
