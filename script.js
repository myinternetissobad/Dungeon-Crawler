(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const canvas = $('#gameCanvas');
  const ctx = canvas.getContext('2d');
  const MOSSKEEP = window.MOSSKEEP;
  const mobPortraitCache = Object.create(null);
  const WORLD = { width: 900, height: 560, padding: 34 };
  const controlDefaults = { joystick: { left: 5, top: 70 }, hit: { left: 79, top: 74 }, special: { left: 86, top: 56 } };
  const tips = [
    'Stay light on your feet. The dark spots are usually the interesting ones.',
    'A Burst can turn a bad corner into a clean escape.',
    'Boss rooms arrive every ten floors. Save your courage for the climb.',
    'The dungeon remembers your rhythm. Make yours unpredictable.',
  ];
  const bossByFloor = { 10: 'cave_spider_queen', 20: 'skeleton_king', 30: 'stone_golem_boss', 40: 'fire_dragon', 50: 'void_lord' };
  const bossNames = { 10: 'Cave Spider Queen', 20: 'Skeleton King', 30: 'Stone Golem', 40: 'Fire Dragon', 50: 'Void Lord' };
  const bossRules = {
    cave_spider_queen: { phase2At: .5, arena: 'spider', color: '#86d69c', basicCooldown: 2, specialCooldown: 7, speedBoost: 1.25 },
    skeleton_king: { phase2At: .5, arena: 'skeleton', color: '#e56b70', basicCooldown: 2, specialCooldown: 8, speedBoost: 1.15 },
    stone_golem_boss: { phase2At: .4, arena: 'stone', color: '#e3ba6d', basicCooldown: 3, specialCooldown: 10, speedBoost: 1.08 },
    fire_dragon: { phase2At: .5, arena: 'fire', color: '#ff9c55', basicCooldown: 2, specialCooldown: 6, speedBoost: 1.2 },
    void_lord: { phase2At: .6, phase3At: .25, arena: 'void', color: '#bd70ff', basicCooldown: 2, specialCooldown: 7, speedBoost: 1.25 },
  };
  const bossKeyForFloor = (floor) => bossByFloor[floor] || null;
  const bossArenaThemes = {
    spider: { ground: '#193532', tile: '#23453e', ink: '#78b996', shadow: '#102b2b', accent: '#8fe0a1', name: 'Spider Cave' },
    skeleton: { ground: '#202b43', tile: '#2e3c5b', ink: '#a8b4cc', shadow: '#131b2f', accent: '#df6e75', name: 'Skeleton Throne Room' },
    stone: { ground: '#45443e', tile: '#5b574c', ink: '#b9a988', shadow: '#292a29', accent: '#e0b96d', name: 'Ancient Stone Chamber' },
    fire: { ground: '#4a211c', tile: '#693026', ink: '#f5a05c', shadow: '#2c1718', accent: '#ff7652', name: 'Volcanic Arena' },
    void: { ground: '#1b1231', tile: '#2b1a4b', ink: '#b987ec', shadow: '#0e0a1e', accent: '#c96cff', name: 'Void Dimension' },
  };

  const state = {
    floor: 1, running: false, paused: false, editing: false, defeated: 0, shards: 0,
    lastTime: 0, elapsed: 0, loopVersion: 0, floorLocked: false, toastTimer: null,
    hitCooldown: 0, abilityCooldown: 0, attackEffect: 0, abilityEffect: 0,
    keys: Object.create(null), enemies: [], projectiles: [], hazards: [], particles: [], numbers: [], deathBursts: [], decorations: [], lootDrops: [], clearTimer: 0, screenShake: 0,
    inventory: Array.from({ length: 36 }, () => null), equipment: { helmet: null, chestplate: null, leggings: null, boots: null, weapon: null },
    discoveredItems: [], mobDefeats: {}, inventoryOpen: false,
    runItems: [], bestHit: 0, bestMoment: { text: 'You entered the dungeon.', score: 1 }, finalBossShortcut: false,
    personalBest: { floor: 0, defeated: 0, shards: 0, loot: 0, bestHit: 0, bestMomentScore: 0, bestMomentText: '' },
    player: { x: 450, y: 295, r: 17, hp: 100, maxHp: 100, speed: 220, angle: 0, invuln: 0, poison: 0, burn: 0 },
    joystick: { active: false, x: 0, y: 0, pointerId: null },
    drag: null,
  };

  const themeForFloor = (floor) => {
    const bossKey = bossKeyForFloor(floor);
    if (bossKey) return bossArenaThemes[bossRules[bossKey].arena];
    if (floor >= 41) return { ground: '#bacbc6', tile: '#afc5bc', ink: '#506b70', shadow: '#8daaa5', accent: '#8d83e8', name: 'The Deep Crown' };
    if (floor >= 31) return { ground: '#c6d1df', tile: '#b8c8d9', ink: '#5b6f82', shadow: '#95adbf', accent: '#de8ba0', name: 'Frostmoss Run' };
    if (floor >= 21) return { ground: '#d6d4c9', tile: '#c8c9bb', ink: '#6b7470', shadow: '#aaaFA0', accent: '#dfad5f', name: 'The Crag Hollows' };
    if (floor >= 11) return { ground: '#c5d8d5', tile: '#b5cfca', ink: '#567875', shadow: '#8daaa7', accent: '#75c1be', name: 'Gloomwing Grotto' };
    return { ground: '#cadbd0', tile: '#b9d0c5', ink: '#54796c', shadow: '#92b6a3', accent: '#ef8b72', name: 'The Mossy Steps' };
  };

  const formatFloor = (value) => String(value).padStart(2, '0');
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const random = (min, max) => Math.random() * (max - min) + min;
  const clonePositions = (positions) => JSON.parse(JSON.stringify(positions));
  function getMobPortrait(mob) {
    if (!mob?.portrait) return null;
    if (!mobPortraitCache[mob.id]) { const image = new Image(); image.decoding = 'async'; image.src = mob.portrait; mobPortraitCache[mob.id] = image; }
    return mobPortraitCache[mob.id];
  }
  function drawMobPortrait(mob, centerX, centerY, maxWidth, maxHeight) {
    const image = getMobPortrait(mob); if (!image || !image.complete || !image.naturalWidth) return false;
    const scale = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight); const width = image.naturalWidth * scale; const height = image.naturalHeight * scale;
    ctx.drawImage(image, centerX - width / 2, centerY - height / 2, width, height); return true;
  }

  function openModal(id) { const modal = $(`#${id}`); modal.classList.add('is-visible'); modal.setAttribute('aria-hidden', 'false'); }
  function closeModal(id) { const modal = $(`#${id}`); modal.classList.remove('is-visible'); modal.setAttribute('aria-hidden', 'true'); }
  function showToast(message) {
    $('#toastText').textContent = message;
    $('#toast').classList.add('is-visible');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => $('#toast').classList.remove('is-visible'), 2400);
  }

  const itemDefinition = (itemId) => MOSSKEEP.ITEMS[itemId];
  const rarityClass = (rarity) => `rarity-${rarity.toLowerCase()}`;
  function itemArtMarkup(item, extraClass = '') {
    if (!item) return '';
    const artClass = `item-art ${extraClass}`.trim();
    const id = item.id;
    const color = MOSSKEEP.RARITIES[item.rarity]?.color || '#9ca5b5';
    const shadow = '#26324f';
    let shape = '';
    if (item.type === 'weapon') {
      if (id.includes('bow')) {
        shape = `<path class="art-outline" d="M18 10 Q48 32 18 54"/><path class="art-main" d="M19 11 Q42 32 19 53"/><path class="art-detail" d="M17 32 H51 M44 26 L51 32 L44 38"/>`;
      } else if (id.includes('hammer')) {
        shape = `<path class="art-main" d="M30 13 H38 V41 H30 Z"/><path class="art-outline" d="M18 10 H50 V21 H18 Z"/><path class="art-detail" d="M23 14 H45"/>`;
      } else {
        shape = `<path class="art-main" d="M31 8 L37 8 L39 30 L47 49 L32 42 L17 49 L25 30 L28 8 Z"/><path class="art-outline" d="M29 30 H39 V38 H29 Z"/><path class="art-detail" d="M22 39 H46"/>`;
      }
    } else if (item.type === 'armor') {
      if (item.slot === 'helmet') {
        shape = `<path class="art-main" d="M16 37 V27 C16 15 23 9 32 9 C41 9 48 15 48 27 V37 Z"/><path class="art-detail" d="M13 37 H51 V45 H13 Z M32 10 V37"/>`;
      } else if (item.slot === 'chestplate') {
        shape = `<path class="art-main" d="M22 12 L32 18 L42 12 L50 23 L44 29 V51 H20 V29 L14 23 Z"/><path class="art-detail" d="M32 18 V51 M20 29 H44"/>`;
      } else if (item.slot === 'leggings') {
        shape = `<path class="art-main" d="M19 12 H45 L43 29 L48 51 H35 L32 32 L29 51 H16 L21 29 Z"/><path class="art-detail" d="M32 14 V32"/>`;
      } else {
        shape = `<path class="art-main" d="M20 10 H42 V34 L49 43 V51 H28 V42 L20 36 Z"/><path class="art-detail" d="M20 34 H39 M29 42 V51"/>`;
      }
    } else if (id.includes('bone')) {
      shape = `<path class="art-main" d="M16 18 C11 12 18 7 23 12 L41 30 C46 25 53 31 48 36 C52 42 45 47 40 42 L22 24 C17 29 10 23 16 18 Z"/>`;
    } else if (id.includes('arrow')) {
      shape = `<path class="art-main" d="M14 45 L44 15 L47 18 L17 48 Z"/><path class="art-detail" d="M44 15 L54 12 L51 22 Z M14 45 L11 54 L20 51 Z"/>`;
    } else if (id.includes('flesh') || id.includes('sac')) {
      shape = `<path class="art-main" d="M19 18 C25 10 39 10 45 18 C53 29 45 49 32 51 C19 49 11 29 19 18 Z"/><path class="art-detail" d="M25 17 C29 21 35 21 39 17 M24 33 C28 37 36 37 40 33"/>`;
    } else if (id.includes('slime') || id.includes('gel') || id.includes('core')) {
      shape = `<path class="art-main" d="M14 40 C14 27 20 18 28 18 C33 18 34 12 39 16 C47 21 51 31 48 40 C45 51 20 53 14 40 Z"/><path class="art-detail" d="M24 30 A3 3 0 1 0 24.1 30 M39 30 A3 3 0 1 0 39.1 30"/>`;
    } else if (id.includes('coin') || id.includes('metal') || id.includes('scrap')) {
      shape = `<ellipse class="art-main" cx="32" cy="32" rx="19" ry="23"/><path class="art-detail" d="M25 23 C38 18 43 28 35 32 C26 36 29 43 40 39"/>`;
    } else if (id.includes('fire') || id.includes('essence')) {
      shape = `<path class="art-main" d="M33 8 C43 19 47 25 44 35 C42 45 36 51 27 49 C17 47 13 39 18 31 C22 25 26 23 26 15 C29 18 30 21 30 25 C36 21 36 15 33 8 Z"/><path class="art-detail" d="M30 31 C36 35 34 42 28 44 C24 42 23 38 27 34"/>`;
    } else if (id.includes('shadow') || id.includes('void') || id.includes('fragment')) {
      shape = `<circle class="art-main" cx="32" cy="32" r="22"/><circle class="art-detail-fill" cx="32" cy="32" r="11"/><path class="art-detail" d="M25 22 L39 42 M40 23 L24 40"/>`;
    } else if (id.includes('crystal') || id.includes('scale') || id.includes('gem')) {
      shape = `<path class="art-main" d="M32 7 L48 22 L42 49 L22 49 L16 22 Z"/><path class="art-detail" d="M16 22 H48 M32 7 L32 49 M22 49 L16 22 M42 49 L48 22"/>`;
    } else if (id.includes('web') || id.includes('silk')) {
      shape = `<path class="art-main" d="M32 9 C42 17 50 24 52 32 C50 41 42 48 32 55 C22 48 14 41 12 32 C14 24 22 17 32 9 Z"/><path class="art-detail" d="M20 22 L44 42 M44 22 L20 42 M15 32 H49 M32 12 V52"/>`;
    } else {
      shape = `<path class="art-main" d="M32 8 L51 27 L42 50 H22 L13 27 Z"/><path class="art-detail" d="M13 27 H51 M22 50 L32 27 L42 50"/>`;
    }
    return `<svg class="${artClass}" style="color:${color}" viewBox="0 0 64 64" role="img" aria-label="${item.name}"><circle class="art-shadow" cx="32" cy="56" r="13" fill="${shadow}" opacity=".24"/>${shape}</svg>`;
  }
  function drawItemArt(item, size = 1) {
    const color = MOSSKEEP.RARITIES[item.rarity]?.color || '#9ca5b5';
    const id = item.id;
    ctx.save(); ctx.scale(size, size); ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#26324f'; ctx.fillStyle = color;
    if (item.type === 'weapon') {
      if (id.includes('bow')) { ctx.beginPath(); ctx.arc(0, 0, 13, -1.15, 1.15); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-10, -12); ctx.lineTo(13, 0); ctx.lineTo(-10, 12); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(13, 0); ctx.stroke(); }
      else { ctx.save(); ctx.rotate(-.45); ctx.beginPath(); ctx.moveTo(0, -19); ctx.lineTo(5, 8); ctx.lineTo(0, 16); ctx.lineTo(-5, 8); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#d9a456'; ctx.fillRect(-4, 8, 8, 4); ctx.restore(); }
    } else if (item.type === 'armor') {
      ctx.beginPath(); if (item.slot === 'helmet') { ctx.arc(0, 0, 14, Math.PI, 0); ctx.lineTo(14, 10); ctx.lineTo(-14, 10); } else if (item.slot === 'chestplate') { ctx.roundRect(-15, -13, 30, 27, 5); } else if (item.slot === 'leggings') { ctx.roundRect(-13, -12, 26, 25, 4); ctx.moveTo(0, -9); ctx.lineTo(0, 13); } else { ctx.roundRect(-13, -13, 23, 25, 4); ctx.moveTo(0, -12); ctx.lineTo(0, 13); } ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else if (id.includes('bone')) { ctx.beginPath(); ctx.moveTo(-13, -9); ctx.lineTo(12, 10); ctx.stroke(); ctx.beginPath(); ctx.arc(-14, -11, 4, 0, Math.PI * 2); ctx.arc(14, 12, 4, 0, Math.PI * 2); ctx.fill(); }
    else if (id.includes('arrow')) { ctx.beginPath(); ctx.moveTo(-14, 11); ctx.lineTo(13, -14); ctx.stroke(); ctx.beginPath(); ctx.moveTo(13, -14); ctx.lineTo(9, -4); ctx.moveTo(13, -14); ctx.lineTo(3, -10); ctx.stroke(); }
    else if (id.includes('fire') || id.includes('essence')) { ctx.beginPath(); ctx.moveTo(0, -19); ctx.bezierCurveTo(14, -4, 13, 13, 0, 18); ctx.bezierCurveTo(-14, 13, -13, -2, -4, -7); ctx.bezierCurveTo(-5, -1, 1, 2, 3, -3); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else if (id.includes('coin') || id.includes('metal') || id.includes('scrap')) { ctx.beginPath(); ctx.ellipse(0, 0, 15, 18, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.stroke(); }
    else if (id.includes('slime') || id.includes('gel') || id.includes('core')) { ctx.beginPath(); ctx.ellipse(0, 2, 16, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#26324f'; ctx.beginPath(); ctx.arc(-5, 0, 2, 0, Math.PI * 2); ctx.arc(6, 0, 2, 0, Math.PI * 2); ctx.fill(); }
    else if (id.includes('shadow') || id.includes('void') || id.includes('fragment')) { ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#26324f'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(15, -3); ctx.lineTo(9, 17); ctx.lineTo(-9, 17); ctx.lineTo(-15, -3); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-15, -3); ctx.lineTo(15, -3); ctx.moveTo(0, -18); ctx.lineTo(0, 17); ctx.stroke(); }
    ctx.restore();
  }
  const itemStatText = (item) => {
    if (!item) return '';
    const stats = item.stats || {};
    const parts = [];
    if (stats.damage) parts.push(`+${stats.damage} DMG`);
    if (stats.defense) parts.push(`+${stats.defense} DEF`);
    if (stats.health) parts.push(`+${stats.health} HP`);
    if (stats.speed) parts.push(`+${stats.speed}% SPD`);
    return parts.join(' · ');
  };
  function getPlayerStats() {
    const stats = { maxHealth: 100, attackDamage: 30, defense: 0, movementSpeed: 220, critChance: 5, critDamage: 150 };
    Object.values(state.equipment).forEach((itemId) => {
      const item = itemDefinition(itemId);
      if (!item) return;
      stats.maxHealth += item.stats.health || 0;
      stats.attackDamage += item.stats.damage || 0;
      stats.defense += item.stats.defense || 0;
      stats.movementSpeed *= 1 + ((item.stats.speed || 0) / 100);
    });
    return stats;
  }
  function refreshDerivedStats() {
    const previousMax = state.player.maxHp || 100;
    const stats = getPlayerStats();
    state.player.maxHp = stats.maxHealth;
    state.player.speed = stats.movementSpeed;
    state.player.attackDamage = stats.attackDamage;
    state.player.defense = stats.defense;
    if (state.player.hp > 0) state.player.hp = clamp(state.player.hp + (stats.maxHealth - previousMax), 0, stats.maxHealth);
    updateUI();
  }
  function defaultPersonalBest() { return { floor: 0, defeated: 0, shards: 0, loot: 0, bestHit: 0, bestMomentScore: 0, bestMomentText: '' }; }
  function sanitizePersonalBest(value) {
    const fallback = defaultPersonalBest();
    if (!value || typeof value !== 'object') return fallback;
    return {
      floor: Math.max(0, Number(value.floor) || 0),
      defeated: Math.max(0, Number(value.defeated) || 0),
      shards: Math.max(0, Number(value.shards) || 0),
      loot: Math.max(0, Number(value.loot) || 0),
      bestHit: Math.max(0, Number(value.bestHit) || 0),
      bestMomentScore: Math.max(0, Number(value.bestMomentScore) || 0),
      bestMomentText: typeof value.bestMomentText === 'string' ? value.bestMomentText : fallback.bestMomentText,
    };
  }
  function saveProgress() {
    try {
      localStorage.setItem('mosskeep-progress', JSON.stringify({ inventory: state.inventory, equipment: state.equipment, discoveredItems: state.discoveredItems, mobDefeats: state.mobDefeats, personalBest: state.personalBest }));
    } catch (error) { /* Storage can be unavailable in private browsing; the run still works. */ }
  }
  function loadProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem('mosskeep-progress'));
      if (!saved) return;
      if (Array.isArray(saved.inventory)) state.inventory = saved.inventory.map((slot) => slot && itemDefinition(slot.id) ? { id: slot.id, qty: clamp(Number(slot.qty) || 1, 1, 64) } : null);
      if (saved.equipment) Object.keys(state.equipment).forEach((slot) => { const item = itemDefinition(saved.equipment[slot]); state.equipment[slot] = item && ((slot === 'weapon' && item.type === 'weapon') || (slot !== 'weapon' && item.type === 'armor' && item.slot === slot)) ? item.id : null; });
      if (Array.isArray(saved.discoveredItems)) state.discoveredItems = saved.discoveredItems.filter((itemId) => itemDefinition(itemId));
      if (saved.mobDefeats && typeof saved.mobDefeats === 'object') state.mobDefeats = saved.mobDefeats;
      state.personalBest = sanitizePersonalBest(saved.personalBest);
    } catch (error) { /* Start with a clean pack if saved data is corrupted. */ }
    refreshDerivedStats();
  }
  function inventoryUsed() { return state.inventory.filter(Boolean).length; }
  function markDiscovered(itemId) { if (!state.discoveredItems.includes(itemId)) { state.discoveredItems.push(itemId); saveProgress(); } }
  function addItemToInventory(itemId, quantity = 1, announce = true) {
    const item = itemDefinition(itemId); if (!item) return quantity;
    let remaining = quantity;
    if (item.stackable) state.inventory.forEach((slot) => { if (slot && slot.id === itemId && slot.qty < 64 && remaining > 0) { const moved = Math.min(64 - slot.qty, remaining); slot.qty += moved; remaining -= moved; } });
    while (remaining > 0) {
      const amount = item.stackable ? Math.min(64, remaining) : 1;
      const emptyIndex = state.inventory.findIndex((slot) => !slot);
      if (emptyIndex < 0) state.inventory.push({ id: itemId, qty: amount });
      else state.inventory[emptyIndex] = { id: itemId, qty: amount };
      remaining -= amount;
    }
    if (remaining < quantity) { markDiscovered(itemId); if (announce) showToast(`${item.name} added to your pack.`); if (state.inventoryOpen) updateInventoryUI(); saveProgress(); }
    return remaining;
  }
  function itemSourceRows(itemId) {
    return Object.values(MOSSKEEP.MOBS).flatMap((mob) => mob.dropTable.filter((drop) => drop.itemId === itemId).map((drop) => ({ mob, chance: drop.chance })));
  }

  function loadControlPositions() {
    try {
      const saved = JSON.parse(localStorage.getItem('mosskeep-control-positions'));
      return saved && saved.joystick && saved.hit && saved.special ? saved : clonePositions(controlDefaults);
    } catch (error) { return clonePositions(controlDefaults); }
  }
  let controlPositions = loadControlPositions();
  function applyControlPositions() {
    Object.entries({ joystick: $('#joystick'), hit: $('#hitControl'), special: $('#specialControl') }).forEach(([name, element]) => {
      element.style.left = `${controlPositions[name].left}%`;
      element.style.top = `${controlPositions[name].top}%`;
    });
  }
  function saveControlPositions() { localStorage.setItem('mosskeep-control-positions', JSON.stringify(controlPositions)); }
  function resetControlPositions() { controlPositions = clonePositions(controlDefaults); saveControlPositions(); applyControlPositions(); showToast('Controls returned to their original spots.'); }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
  }
  window.addEventListener('resize', resizeCanvas);

  function addParticle(x, y, color, count = 8, speed = 70) {
    for (let i = 0; i < count; i += 1) {
      const angle = random(0, Math.PI * 2);
      const velocity = random(speed * .35, speed);
      state.particles.push({ x, y, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity, life: random(.35, .7), maxLife: .7, size: random(2, 5), color });
    }
  }
  function addNumber(x, y, value, color = '#fff5c9') { state.numbers.push({ x, y, value, life: .75, color }); }

  function buildDecorations() {
    state.decorations = [];
    const bossKey = bossKeyForFloor(state.floor);
    const arenaType = bossKey ? bossRules[bossKey].arena : null;
    for (let i = 0; i < 24; i += 1) {
      const x = random(45, WORLD.width - 45); const y = random(60, WORLD.height - 35);
      if (Math.hypot(x - state.player.x, y - state.player.y) < 100) { i -= 1; continue; }
      const arenaDecor = arenaType === 'spider' ? 'web' : arenaType === 'skeleton' ? 'bone' : arenaType === 'stone' ? 'crack' : arenaType === 'fire' ? 'lava' : arenaType === 'void' ? 'void' : null;
      state.decorations.push({ x, y, type: arenaDecor || (Math.random() > .48 ? 'pebble' : 'sprout'), scale: random(.65, 1.3), flip: Math.random() > .5 });
    }
  }

  function createEnemy(mobKey, x, y, index = 0) {
    const mob = MOSSKEEP.MOBS[mobKey];
    const isBoss = mob.tier === 'Boss';
    const rule = isBoss ? bossRules[mobKey] : null;
    const floorScale = 1 + (state.floor - 1) * .045;
    const maxHp = isBoss ? mob.hp : Math.round(mob.hp * floorScale);
    const damage = Math.max(1, isBoss ? mob.damage : Math.round(mob.damage * (1 + (state.floor - 1) * .03)));
    return { x, y, type: mob.shape, mobKey, mob, isBoss, r: isBoss ? 34 : mob.shape === 'golem' ? 24 : 16, hp: maxHp, maxHp, speed: mob.speed, damage, color: mob.color, dark: mob.dark, phase: random(0, Math.PI * 2), attackTimer: isBoss ? random(.7, 1.4) : random(.2, 1), specialTimer: isBoss ? random(3, 5) : 0, bossAction: null, bossPhase: 1, phasePulse: 0, telegraph: 0, aimX: x, aimY: y, hitFlash: 0, index, name: mob.name, summoned: false, rewardClaimed: false };
  }

  function mobPoolForFloor() {
    if (state.floor <= 5) return MOSSKEEP.TIER_KEYS.Beginner;
    if (state.floor <= 15) return MOSSKEEP.TIER_KEYS.Intermediate;
    if (state.floor <= 30) return MOSSKEEP.TIER_KEYS.Advanced;
    return MOSSKEEP.TIER_KEYS.Elite;
  }
  function randomMobKey() { const pool = mobPoolForFloor(); return pool[Math.floor(Math.random() * pool.length)]; }

  function spawnLootDrop(itemId, x, y, quantity = 1) {
    if (!itemDefinition(itemId)) return;
    state.lootDrops.push({ itemId, quantity, x: x + random(-18, 18), y: y + random(-18, 18), phase: random(0, Math.PI * 2), life: 90 });
  }
  function rollLoot(enemy) {
    const successfulRolls = enemy.mob.dropTable.filter((drop) => Math.random() * 100 < drop.chance);
    if (!successfulRolls.length) return;
    const drop = successfulRolls[Math.floor(Math.random() * successfulRolls.length)];
    spawnLootDrop(drop.itemId, enemy.x, enemy.y, drop.itemId === 'arrows' ? Math.floor(random(3, 8)) : 1);
  }
  function collectLootDrop(drop, announce = true) {
    const remainder = addItemToInventory(drop.itemId, drop.quantity, announce); drop.quantity = remainder;
    if (remainder > 0) { if (announce) showToast('Pack full — the loot stays on the ground.'); return false; }
    markDiscovered(drop.itemId); state.runItems.push(drop.itemId); state.clearTimer = 0; return true;
  }
  function updateLootDrops(dt) {
    state.lootDrops = state.lootDrops.filter((drop) => {
      drop.phase += dt * 2; drop.life -= dt;
      if (distance(drop, state.player) < 38) {
        try { if (collectLootDrop(drop)) return false; } catch (error) { console.error('Loot pickup skipped:', error); showToast('That loot could not be collected.'); return false; }
      }
      return drop.life > 0;
    });
  }
  function drawLootDrops() {
    state.lootDrops.forEach((drop) => {
      const item = itemDefinition(drop.itemId); if (!item) return;
      const bob = Math.sin(drop.phase) * 3; const color = MOSSKEEP.RARITIES[item.rarity].color;
      ctx.save(); ctx.translate(drop.x, drop.y + bob); ctx.globalAlpha = .35; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 4, 18, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = .95; ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.stroke(); drawItemArt(item, .72); ctx.restore();
    });
  }

  function spawnFloor() {
    state.player.x = 450; state.player.y = 300; state.player.hp = Math.min(state.player.maxHp, state.player.hp + 22); state.player.invuln = 0;
    state.hitCooldown = 0; state.abilityCooldown = Math.max(0, state.abilityCooldown - 1.5); state.floorLocked = false; state.clearTimer = 0; state.enemies = []; state.projectiles = []; state.hazards = []; state.deathBursts = [];
    const bossKey = bossKeyForFloor(state.floor);
    const count = bossKey ? 0 : 3 + Math.min(4, Math.floor((state.floor - 1) / 5));
    for (let i = 0; i < count; i += 1) {
      const type = randomMobKey();
      const edge = i % 4; const x = edge === 0 ? random(80, 250) : edge === 1 ? random(650, 820) : random(80, 820); const y = edge === 2 ? random(75, 150) : edge === 3 ? random(410, 485) : random(160, 430);
      state.enemies.push(createEnemy(type, x, y, i));
    }
    if (bossKey) {
      state.enemies.push(createEnemy(bossKey, 680, 280));
      showToast(`${bossNames[state.floor]} guards this floor.`);
    }
    buildDecorations(); updateUI();
  }

  function startRunAtFloor(startFloor = 1, toastText = 'Find the exit. Make some noise.', finalBossShortcut = false) {
    state.floor = startFloor; state.defeated = 0; state.shards = 0; state.running = true; state.paused = false; state.finalBossShortcut = finalBossShortcut; state.enemies = []; state.projectiles = []; state.hazards = []; state.lootDrops = []; state.particles = []; state.numbers = []; state.deathBursts = []; state.runItems = []; state.bestHit = 0; state.bestMoment = { text: 'You entered the dungeon.', score: 1 }; state.screenShake = 0; refreshDerivedStats(); state.player.hp = state.player.maxHp;
    closeAllModals(); toggleEditMode(false); $('#introScreen').classList.remove('is-visible'); $('#gameScreen').classList.add('is-visible');
    state.lastTime = performance.now(); spawnFloor(); resizeCanvas(); showToast(toastText); beginLoop();
  }

  function startNewRun() {
    startRunAtFloor(1);
  }

  function startFinalBossRun() {
    startRunAtFloor(50, 'The final arena is open. Face the Void Lord.', true);
  }

  function rememberPeak(text, score) {
    if (score >= state.bestMoment.score) state.bestMoment = { text, score };
  }
  function runSummaryData() {
    return {
      floor: state.floor,
      defeated: state.defeated,
      shards: state.shards,
      loot: state.runItems.length,
      bestHit: state.bestHit,
      bestMomentScore: state.bestMoment.score,
      bestMomentText: state.bestMoment.text,
    };
  }
  function beatsPersonalBest(run, best) {
    return run.floor > best.floor || (run.floor === best.floor && run.defeated > best.defeated) || (run.floor === best.floor && run.defeated === best.defeated && run.loot > best.loot) || (run.floor === best.floor && run.defeated === best.defeated && run.loot === best.loot && run.shards > best.shards) || (run.floor === best.floor && run.defeated === best.defeated && run.loot === best.loot && run.shards === best.shards && run.bestMomentScore > best.bestMomentScore);
  }
  function renderRunSummary(victory = false) {
    const run = runSummaryData();
    const finalBossVictory = victory && state.floor === 50;
    const isNewBest = beatsPersonalBest(run, state.personalBest);
    if (isNewBest) { state.personalBest = { ...run }; saveProgress(); }
    const personalBest = state.personalBest;
    $('.run-summary-card').classList.toggle('is-final-victory', finalBossVictory);
    $('#runEndKicker').textContent = finalBossVictory ? 'FINAL BOSS DEFEATED' : victory ? 'THE KEEP IS YOURS' : 'RUN COMPLETE';
    $('#runEndMark').textContent = finalBossVictory ? 'VOID LORD FALLEN' : victory ? '50 FLOORS' : 'PEAK MOMENT';
    $('#runEndTitle').textContent = finalBossVictory ? 'You broke the Void.' : victory ? 'You cleared the keep.' : 'That run still counts.';
    $('#runEndCopy').textContent = finalBossVictory ? 'You brought down the Void Lord on floor 50. This is the run worth remembering.' : victory ? 'Fifty floors, five bosses, and a story worth repeating.' : 'The dungeon stopped you, but the time you spent is saved below. Your next run starts here.';
    $('#runBestMoment').textContent = finalBossVictory ? 'You brought down the Void Lord on floor 50.' : run.bestMomentText || `You reached floor ${formatFloor(run.floor)}.`;
    $('#runHighlights').innerHTML = [
      finalBossVictory ? ['Final boss', 'Void Lord'] : ['Floor reached', formatFloor(run.floor)],
      ['Monsters defeated', run.defeated],
      ['Loot collected', run.loot],
      ['Shards earned', run.shards],
      ['Best hit', run.bestHit || 0],
      ['Personal record', `Floor ${formatFloor(personalBest.floor)}`],
    ].map(([label, value]) => `<div class="run-stat"><span>${label}</span><strong>${value}</strong></div>`).join('');
    const bestLabel = isNewBest ? `NEW PERSONAL BEST · Floor ${formatFloor(run.floor)} · ${run.defeated} defeated` : `PERSONAL BEST · Floor ${formatFloor(personalBest.floor)} · ${personalBest.defeated} defeated`;
    $('#runPersonalBest').textContent = bestLabel;
    $('#runPersonalBest').classList.toggle('is-new', isNewBest);
    $('#runAgainButton').innerHTML = `${victory ? 'Run it back' : 'Try again'} <span>↻</span>`;
  }
  function closeAllModals() { ['floorModal', 'pauseModal', 'customizeModal', 'inventoryModal', 'codexModal', 'runEndModal'].forEach(closeModal); state.inventoryOpen = false; }
  function finishFloor() {
    if (state.floorLocked) return;
    state.floorLocked = true; state.running = false;
    rememberPeak(state.floor % 10 === 0 ? `${bossNames[state.floor]} fell on floor ${formatFloor(state.floor)}.` : `You reached floor ${formatFloor(state.floor)}.`, 600 + state.floor);
    if (state.floor >= 50) { winRun(); return; }
    const next = state.floor + 1; $('#floorModalKicker').textContent = state.floor % 10 === 0 ? 'BOSS VANQUISHED' : 'FLOOR CLEARED'; $('#floorModalTitle').textContent = state.floor % 10 === 0 ? `${bossNames[state.floor]} is toast.` : 'A quiet room.'; $('#floorModalCopy').textContent = state.floor % 10 === 0 ? 'The next stretch is yours. The dungeon is already rearranging itself.' : 'The stairs are awake. Something bigger is waiting above.'; $('#continueButton').innerHTML = `Climb to floor ${formatFloor(next)} <span>↑</span>`; openModal('floorModal');
  }
  function continueFloor() { closeModal('floorModal'); state.floor += 1; state.running = true; state.lastTime = performance.now(); spawnFloor(); showToast(state.floor % 10 === 0 ? 'A boss room is close.' : `Floor ${formatFloor(state.floor)}. Keep moving.`); beginLoop(); }
  function defeatRun() { state.running = false; state.paused = false; renderRunSummary(false); openModal('runEndModal'); }
  function winRun() { state.running = false; state.paused = false; renderRunSummary(true); openModal('runEndModal'); }

  function getInput() {
    let x = 0; let y = 0;
    if (state.keys.ArrowLeft || state.keys.a) x -= 1; if (state.keys.ArrowRight || state.keys.d) x += 1; if (state.keys.ArrowUp || state.keys.w) y -= 1; if (state.keys.ArrowDown || state.keys.s) y += 1;
    if (state.joystick.active) { x += state.joystick.x; y += state.joystick.y; }
    const length = Math.hypot(x, y); return length > 1 ? { x: x / length, y: y / length } : { x, y };
  }
  function summonForNecromancer(enemy) {
    if (enemy.mobKey !== 'necromancer' || state.enemies.length >= 10 || Math.random() >= .22) return;
    const summon = createEnemy('skeleton', enemy.x + random(-30, 30), enemy.y + random(-30, 30), state.enemies.length);
    state.enemies.push(summon); addParticle(enemy.x, enemy.y, '#d9c8ff', 12, 90);
  }
  function bossPhaseFor(enemy) {
    const rule = bossRules[enemy.mobKey]; const ratio = enemy.hp / enemy.maxHp;
    if (rule?.phase3At && ratio <= rule.phase3At) return 3;
    if (rule?.phase2At && ratio <= rule.phase2At) return 2;
    return 1;
  }
  function updateBossPhase(enemy) {
    const nextPhase = bossPhaseFor(enemy);
    enemy.phasePulse = Math.max(0, enemy.phasePulse - .035);
    if (nextPhase <= enemy.bossPhase) return;
    enemy.bossPhase = nextPhase; enemy.phasePulse = 1.2;
    const phaseName = nextPhase === 3 ? 'FINAL PHASE' : 'ENRAGED PHASE';
    showToast(`${enemy.name} enters ${phaseName}.`); addNumber(enemy.x, enemy.y - enemy.r - 42, phaseName, '#ffe18c'); addParticle(enemy.x, enemy.y, bossRules[enemy.mobKey].color, 24, 145);
  }
  function bossCooldown(enemy, base) {
    if (enemy.bossPhase === 3) return base * .72;
    if (enemy.bossPhase === 2) return base * .8;
    return base;
  }
  function startBossAction(enemy, type, duration, payload = {}) {
    enemy.bossAction = { type, timer: duration, duration, ...payload };
    enemy.aimX = state.player.x; enemy.aimY = state.player.y; enemy.bossRecovery = 0;
    addParticle(enemy.x, enemy.y, bossRules[enemy.mobKey].color, 5, 38);
  }
  function createBossHazard(enemy, options = {}) {
    const life = options.life ?? 1;
    state.hazards.push({
      type: options.type || 'circle', x: options.x ?? state.player.x, y: options.y ?? state.player.y,
      r: options.r || 55, range: options.range || 150, angle: options.angle || 0, halfAngle: options.halfAngle || .4,
      warning: options.warning || 0, life, maxLife: life, tick: 0, tickRate: options.tickRate || .55,
      damage: options.damage ?? enemy.damage, color: options.color || bossRules[enemy.mobKey].color,
      mobKey: enemy.mobKey, mob: enemy.mob, isBoss: true, poisonDuration: options.poisonDuration || 0,
      poisonDamage: options.poisonDamage || 0, burnDuration: options.burnDuration || 0, burnDamage: options.burnDamage || 0,
    });
  }
  function angleDifference(first, second) { return Math.atan2(Math.sin(first - second), Math.cos(first - second)); }
  function hazardHitsPlayer(hazard) {
    const dx = state.player.x - hazard.x; const dy = state.player.y - hazard.y; const distanceToPlayer = Math.hypot(dx, dy);
    if (hazard.type === 'cone') return distanceToPlayer <= hazard.range && Math.abs(angleDifference(Math.atan2(dy, dx), hazard.angle)) <= hazard.halfAngle;
    return distanceToPlayer <= hazard.r + state.player.r;
  }
  function updateHazards(dt) {
    state.hazards = state.hazards.filter((hazard) => {
      if (hazard.warning > 0) { hazard.warning -= dt; return true; }
      hazard.life -= dt; hazard.tick -= dt;
      if (hazard.tick <= 0 && hazardHitsPlayer(hazard)) { hazard.tick = hazard.tickRate; applyEnemyDamage(hazard); }
      return hazard.life > 0;
    });
  }
  function summonBossMinions(enemy, mobKey, count, hp, damage) {
    const activeSummons = state.enemies.filter((entry) => entry.summoned).length;
    const available = Math.max(0, 6 - activeSummons);
    for (let index = 0; index < Math.min(count, available); index += 1) {
      const summon = createEnemy(mobKey, enemy.x + random(-42, 42), enemy.y + random(-42, 42), state.enemies.length);
      summon.summoned = true; summon.isBoss = false; summon.hp = hp; summon.maxHp = hp; summon.damage = damage; summon.speed = MOSSKEEP.MOBS[mobKey].speed;
      state.enemies.push(summon);
    }
    addParticle(enemy.x, enemy.y, bossRules[enemy.mobKey].color, 18, 100);
  }
  function startBossBasic(enemy) {
    const distanceToPlayer = distance(enemy, state.player); const angle = Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x);
    const basics = { cave_spider_queen: ['spider_bite', 112], skeleton_king: ['skeleton_slash', 118], stone_golem_boss: ['golem_punch', 92], fire_dragon: ['dragon_claw', 126], void_lord: ['void_slash', 132] };
    const [type, range] = basics[enemy.mobKey];
    if (distanceToPlayer > range) return false;
    startBossAction(enemy, type, enemy.mobKey === 'stone_golem_boss' ? .6 : .42, { angle, targetX: state.player.x, targetY: state.player.y, range });
    return true;
  }
  function startBossSpecial(enemy) {
    const actionIndex = enemy.specialIndex || 0; enemy.specialIndex = actionIndex + 1;
    if (enemy.mobKey === 'cave_spider_queen') {
      startBossAction(enemy, actionIndex % 2 === 0 ? 'spider_spit' : 'spider_summon', actionIndex % 2 === 0 ? .55 : .8);
    } else if (enemy.mobKey === 'skeleton_king') {
      if (actionIndex % 2 === 0) { createBossHazard(enemy, { x: state.player.x, y: state.player.y, r: 82, warning: 1, life: .55, damage: 50, color: '#e56b70' }); startBossAction(enemy, 'skeleton_slam', 1); }
      else startBossAction(enemy, 'skeleton_summon', .9);
    } else if (enemy.mobKey === 'stone_golem_boss') {
      if (actionIndex % 2 === 0) { createBossHazard(enemy, { x: enemy.x, y: enemy.y, r: enemy.bossPhase >= 2 ? 116 : 96, warning: 1.5, life: .65, damage: 65, color: '#e3ba6d' }); startBossAction(enemy, 'golem_quake', 1.5); }
      else startBossAction(enemy, 'golem_boulder', .65, { targetX: state.player.x, targetY: state.player.y });
    } else if (enemy.mobKey === 'fire_dragon') {
      if (actionIndex % 3 === 0) { createBossHazard(enemy, { type: 'cone', x: enemy.x, y: enemy.y, angle: Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x), range: 225, halfAngle: .38, warning: 1, life: 3, damage: 15, tickRate: .5, color: '#ff9c55', burnDuration: 3, burnDamage: 3 }); startBossAction(enemy, 'dragon_breath', 1); }
      else if (actionIndex % 3 === 1) startBossAction(enemy, 'dragon_fireball', .55);
      else startBossAction(enemy, 'dragon_puddles', .65);
    } else if (enemy.mobKey === 'void_lord') {
      if (actionIndex % 3 === 0) startBossAction(enemy, 'void_orbs', .65);
      else if (actionIndex % 3 === 1) {
        const targetX = clamp(state.player.x + random(-115, 115), 75, WORLD.width - 75); const targetY = clamp(state.player.y + random(-90, 90), 80, WORLD.height - 75);
        createBossHazard(enemy, { x: targetX, y: targetY, r: 58, warning: enemy.bossPhase >= 3 ? .7 : .9, life: .45, damage: 90, color: '#bd70ff' });
        startBossAction(enemy, 'void_teleport', enemy.bossPhase >= 3 ? .7 : .9, { targetX, targetY });
      } else {
        createBossHazard(enemy, { x: state.player.x, y: state.player.y, r: enemy.bossPhase >= 3 ? 155 : 135, warning: 2, life: .7, damage: 120, color: '#bd70ff' });
        startBossAction(enemy, 'void_explosion', 2);
      }
    }
  }
  function resolveBossAction(enemy, action) {
    const distanceToPlayer = distance(enemy, state.player);
    if (action.type === 'spider_bite' && distanceToPlayer <= action.range) applyEnemyDamage(enemy);
    if (action.type === 'skeleton_slash' && distanceToPlayer <= action.range && Math.abs(angleDifference(Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x), action.angle)) < .9) applyEnemyDamage(enemy);
    if (action.type === 'golem_punch' && distanceToPlayer <= action.range) applyEnemyDamage(enemy);
    if (action.type === 'dragon_claw' && distanceToPlayer <= action.range) applyEnemyDamage(enemy);
    if (action.type === 'void_slash' && distanceToPlayer <= action.range) applyEnemyDamage(enemy);
    if (action.type === 'spider_spit') {
      const count = enemy.bossPhase >= 2 ? 2 : 1;
      for (let index = 0; index < count; index += 1) launchProjectile(enemy, { kind: 'poison', damage: 12, color: '#8fe0a1', poisonDuration: 5, poisonDamage: 3, angleOffset: count === 2 ? (index === 0 ? -.13 : .13) : 0 });
    }
    if (action.type === 'spider_summon') summonBossMinions(enemy, 'cave_spider', 3, 30, 5);
    if (action.type === 'skeleton_slam' && enemy.bossPhase >= 2) createBossHazard(enemy, { x: action.targetX ?? state.player.x, y: action.targetY ?? state.player.y, r: 50, warning: .05, life: .45, damage: 25, color: '#f3a1a4' });
    if (action.type === 'skeleton_summon') summonBossMinions(enemy, 'skeleton', 3, 75, 12);
    if (action.type === 'golem_boulder') launchProjectile(enemy, { kind: 'boulder', damage: 45, color: '#d5b88d', speed: 220, targetX: action.targetX, targetY: action.targetY });
    if (action.type === 'dragon_fireball') {
      const count = enemy.bossPhase >= 2 ? 3 : 1;
      for (let index = 0; index < count; index += 1) launchProjectile(enemy, { kind: 'fireball', damage: 60, color: '#ff9c55', burnDuration: 3, burnDamage: 3, angleOffset: count === 3 ? (index - 1) * .14 : 0 });
    }
    if (action.type === 'dragon_puddles') {
      const radius = enemy.bossPhase >= 2 ? 56 : 44;
      for (let index = 0; index < 3; index += 1) createBossHazard(enemy, { type: 'puddle', x: clamp(state.player.x + random(-90, 90), 55, WORLD.width - 55), y: clamp(state.player.y + random(-70, 70), 70, WORLD.height - 55), r: radius, warning: .25, life: 5, damage: 10, tickRate: .55, color: '#ff7652', burnDuration: 2, burnDamage: 2 });
    }
    if (action.type === 'void_orbs') {
      const count = enemy.bossPhase >= 2 ? 5 : 3;
      for (let index = 0; index < count; index += 1) launchProjectile(enemy, { kind: 'void', damage: 65, color: '#bd70ff', angleOffset: (index - (count - 1) / 2) * .12, speed: 245 });
    }
    if (action.type === 'void_teleport') { addParticle(enemy.x, enemy.y, '#bd70ff', 24, 130); enemy.x = action.targetX; enemy.y = action.targetY; addParticle(enemy.x, enemy.y, '#bd70ff', 28, 150); }
    if (action.type === 'void_explosion') state.screenShake = .55;
  }
  function updateBossEnemy(enemy, dt) {
    updateBossPhase(enemy); enemy.phase += dt * 2.6; enemy.bossRecovery = Math.max(0, (enemy.bossRecovery || 0) - dt);
    if (enemy.bossAction) { enemy.bossAction.timer -= dt; if (enemy.bossAction.timer <= 0) { resolveBossAction(enemy, enemy.bossAction); enemy.bossAction = null; enemy.bossRecovery = .3; } return; }
    if (enemy.bossRecovery > 0) return;
    enemy.attackTimer -= dt; enemy.specialTimer -= dt;
    const deltaX = state.player.x - enemy.x; const deltaY = state.player.y - enemy.y; const distanceToPlayer = Math.hypot(deltaX, deltaY) || 1;
    const rule = bossRules[enemy.mobKey]; const moveSpeed = enemy.speed * (enemy.bossPhase > 1 ? rule.speedBoost : 1);
    if (distanceToPlayer > 108) { enemy.x += (deltaX / distanceToPlayer) * moveSpeed * dt; enemy.y += (deltaY / distanceToPlayer) * moveSpeed * dt; }
    if (enemy.specialTimer <= 0) { startBossSpecial(enemy); enemy.specialTimer = bossCooldown(enemy, rule.specialCooldown); return; }
    if (enemy.attackTimer <= 0 && startBossBasic(enemy)) enemy.attackTimer = bossCooldown(enemy, rule.basicCooldown);
    enemy.x = clamp(enemy.x, 45, WORLD.width - 45); enemy.y = clamp(enemy.y, 70, WORLD.height - 45);
  }
  function applyEnemyDamage(enemy) {
    if (state.player.invuln > 0) return false;
    const stats = getPlayerStats();
    const damage = Math.max(1, Math.round(enemy.damage * (100 / (100 + stats.defense))));
    state.player.hp = Math.max(0, state.player.hp - damage); state.player.invuln = .55;
    addParticle(state.player.x, state.player.y, enemy.mob.tier === 'Boss' ? '#f9a6a1' : '#fff1b7', 10, 80); addNumber(state.player.x, state.player.y - 24, `-${damage}`, '#ffcfbd');
    if (enemy.poisonDuration) { state.player.poison = Math.max(state.player.poison, enemy.poisonDuration); state.player.poisonDamage = enemy.poisonDamage || 2; showToast('Poisoned — keep moving.'); }
    else if (enemy.mobKey.includes('spider') && enemy.mobKey !== 'cave_spider_queen') { state.player.poison = 3; state.player.poisonDamage = 2; showToast('Poisoned — keep moving.'); }
    if (enemy.burnDuration) { state.player.burn = Math.max(state.player.burn, enemy.burnDuration); state.player.burnDamage = enemy.burnDamage || 3; showToast('Burning — find your rhythm.'); }
    else if (enemy.mobKey === 'fire_elemental' || enemy.mobKey === 'dragon_guardian') { state.player.burn = 3; state.player.burnDamage = 3; showToast('Burning — find your rhythm.'); }
    summonForNecromancer(enemy);
    if (state.player.hp <= 0) defeatRun();
    return true;
  }
  function launchProjectile(enemy, options = {}) {
    const targetX = options.targetX ?? enemy.aimX ?? state.player.x; const targetY = options.targetY ?? enemy.aimY ?? state.player.y;
    const baseAngle = Math.atan2(targetY - enemy.y, targetX - enemy.x); const angle = baseAngle + (options.angleOffset || 0); const speed = options.speed || (enemy.isBoss ? 310 : 275);
    state.projectiles.push({ x: enemy.x, y: enemy.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, radius: options.radius || (enemy.isBoss ? 8 : 6), life: options.life || 2.4, color: options.color || enemy.color, dark: enemy.dark, kind: options.kind || 'arrow', targetX, targetY, mobKey: enemy.mobKey, mob: enemy.mob, isBoss: enemy.isBoss, damage: options.damage ?? enemy.damage, poisonDuration: options.poisonDuration || 0, poisonDamage: options.poisonDamage || 0, burnDuration: options.burnDuration || 0, burnDamage: options.burnDamage || 0, angle });
    addParticle(enemy.x, enemy.y, options.color || enemy.color, 5, 45);
  }
  function enemyAttack(enemy) {
    if (enemy.mob.attackType === 'Ranged') { launchProjectile(enemy); return; }
    applyEnemyDamage(enemy);
  }
  function updatePlayer(dt) {
    const input = getInput(); const stats = getPlayerStats(); state.player.speed = stats.movementSpeed;
    if (input.x || input.y) { state.player.x += input.x * state.player.speed * dt; state.player.y += input.y * state.player.speed * dt; state.player.angle = Math.atan2(input.y, input.x); }
    state.player.x = clamp(state.player.x, WORLD.padding + state.player.r, WORLD.width - WORLD.padding - state.player.r); state.player.y = clamp(state.player.y, 55 + state.player.r, WORLD.height - WORLD.padding - state.player.r);
    state.player.invuln = Math.max(0, state.player.invuln - dt); state.hitCooldown = Math.max(0, state.hitCooldown - dt); state.abilityCooldown = Math.max(0, state.abilityCooldown - dt); state.attackEffect = Math.max(0, state.attackEffect - dt); state.abilityEffect = Math.max(0, state.abilityEffect - dt);
    if (state.player.poison > 0) { state.player.poison -= dt; state.player.poisonTick = (state.player.poisonTick || 0) - dt; if (state.player.poisonTick <= 0) { const poisonDamage = state.player.poisonDamage || 2; state.player.poisonTick = .7; state.player.hp = Math.max(0, state.player.hp - poisonDamage); addNumber(state.player.x, state.player.y - 27, `-${poisonDamage}`, '#a8e4cf'); } }
    if (state.player.burn > 0) { state.player.burn -= dt; state.player.burnTick = (state.player.burnTick || 0) - dt; if (state.player.burnTick <= 0) { const burnDamage = state.player.burnDamage || 3; state.player.burnTick = .5; state.player.hp = Math.max(0, state.player.hp - burnDamage); addNumber(state.player.x, state.player.y - 34, `-${burnDamage}`, '#ff9b72'); } }
    if (state.player.hp <= 0) defeatRun();
  }
  function updateEnemies(dt) {
    state.enemies.forEach((enemy) => {
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      if (enemy.isBoss) { updateBossEnemy(enemy, dt); return; }
      enemy.attackTimer -= dt; enemy.phase += dt * 2;
      if (enemy.telegraph > 0) { enemy.telegraph -= dt; if (enemy.telegraph <= 0) enemyAttack(enemy); return; }
      const deltaX = state.player.x - enemy.x; const deltaY = state.player.y - enemy.y; const distanceToPlayer = Math.hypot(deltaX, deltaY) || 1; const ranged = enemy.mob.attackType === 'Ranged'; const range = ranged ? 205 : enemy.r + state.player.r + (enemy.isBoss ? 24 : 8);
      const tooClose = ranged && distanceToPlayer < 125;
      if (distanceToPlayer > range || tooClose) { const direction = tooClose ? -1 : 1; enemy.x += (deltaX / distanceToPlayer) * enemy.speed * dt * direction; enemy.y += (deltaY / distanceToPlayer) * enemy.speed * dt * direction; }
      if (enemy.mobKey === 'void_stalker' && Math.random() < dt * .15) { enemy.x = clamp(state.player.x + random(-130, 130), 45, WORLD.width - 45); enemy.y = clamp(state.player.y + random(-100, 100), 65, WORLD.height - 45); addParticle(enemy.x, enemy.y, '#c5b8ff', 8, 70); }
      if (distanceToPlayer <= range && enemy.attackTimer <= 0 && state.player.invuln <= 0) { enemy.attackTimer = enemy.isBoss ? 1.8 : ranged ? 1.6 : 1.35; if (enemy.isBoss || ranged || enemy.mob.attackType === 'Sweep') { enemy.telegraph = enemy.isBoss ? .7 : .45; enemy.aimX = state.player.x; enemy.aimY = state.player.y; } else enemyAttack(enemy); }
      enemy.x = clamp(enemy.x, 35, WORLD.width - 35); enemy.y = clamp(enemy.y, 55, WORLD.height - 35);
    });
  }
  function updateProjectiles(dt) {
    state.projectiles = state.projectiles.filter((projectile) => {
      projectile.x += projectile.vx * dt; projectile.y += projectile.vy * dt; projectile.life -= dt;
      if (distance(projectile, state.player) <= projectile.radius + state.player.r) {
        applyEnemyDamage(projectile); addParticle(projectile.x, projectile.y, projectile.color, 8, 75); return false;
      }
      return projectile.life > 0 && projectile.x > -30 && projectile.x < WORLD.width + 30 && projectile.y > -30 && projectile.y < WORLD.height + 30;
    });
  }
  function updateEffects(dt) {
    state.deathBursts.forEach((burst) => { burst.life -= dt; }); state.deathBursts = state.deathBursts.filter((burst) => burst.life > 0);
    state.particles.forEach((particle) => { particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.vx *= .97; particle.vy *= .97; particle.life -= dt; });
    state.particles = state.particles.filter((particle) => particle.life > 0);
    state.numbers.forEach((number) => { number.y -= 24 * dt; number.life -= dt; }); state.numbers = state.numbers.filter((number) => number.life > 0);
  }
  function update(dt) { updatePlayer(dt); updateEnemies(dt); updateProjectiles(dt); updateHazards(dt); updateLootDrops(dt); updateEffects(dt); state.screenShake = Math.max(0, state.screenShake - dt); if (state.enemies.length === 0 && !state.floorLocked) { state.clearTimer += dt; if (state.clearTimer > 1.35) finishFloor(); } else state.clearTimer = 0; updateUI(); }

  function hit() {
    if (!state.running || state.paused || state.hitCooldown > 0 || state.floorLocked) return;
    state.hitCooldown = .34; state.attackEffect = .25; let hitCount = 0;
    state.enemies.forEach((enemy) => {
      const dx = enemy.x - state.player.x; const dy = enemy.y - state.player.y; const d = Math.hypot(dx, dy); const facing = (dx * Math.cos(state.player.angle) + dy * Math.sin(state.player.angle)) / (d || 1);
      if (d < 110 + enemy.r && facing > -.25) { const stats = getPlayerStats(); const shortcutDamage = state.finalBossShortcut && state.floor === 50 && enemy.mobKey === 'void_lord' ? 9999 : 0; const critical = shortcutDamage ? false : Math.random() * 100 < stats.critChance; const rawDamage = shortcutDamage || Math.max(5, stats.attackDamage - (enemy.mob.defense || 0)); const damage = Math.round(rawDamage * (critical ? stats.critDamage / 100 : 1)); enemy.hp -= damage; enemy.hitFlash = .14; hitCount += 1; if (damage > state.bestHit) { state.bestHit = damage; rememberPeak(critical ? `Critical hit for ${damage} damage.` : `Your biggest hit landed for ${damage} damage.`, 100 + damage + (critical ? 60 : 0)); } addParticle(enemy.x, enemy.y, enemy.color, 7, 105); addNumber(enemy.x, enemy.y - enemy.r - 8, critical ? `${damage}!` : damage, critical ? '#ffe18c' : '#fff5c9'); }
    });
    if (hitCount === 0) addParticle(state.player.x + Math.cos(state.player.angle) * 40, state.player.y + Math.sin(state.player.angle) * 40, '#fff3bd', 4, 45);
    removeDefeatedEnemies();
  }
  function special() {
    if (!state.running || state.paused || state.abilityCooldown > 0 || state.floorLocked) return;
    state.abilityCooldown = 6; state.abilityEffect = .45; let hitCount = 0; const stats = getPlayerStats();
    state.enemies.forEach((enemy) => { if (distance(enemy, state.player) < 160 + enemy.r) { const damage = Math.max(8, Math.round(stats.attackDamage * 1.75) - (enemy.mob.defense || 0)); enemy.hp -= damage; enemy.hitFlash = .2; hitCount += 1; addParticle(enemy.x, enemy.y, '#ecebff', 12, 135); addNumber(enemy.x, enemy.y - enemy.r - 8, damage, '#f6f0ff'); } });
    if (hitCount > 0) rememberPeak(`Burst caught ${hitCount} ${hitCount === 1 ? 'enemy' : 'enemies'}.`, 220 + hitCount * 65);
    addParticle(state.player.x, state.player.y, '#ecebff', 26, 170); showToast(hitCount ? `Burst caught ${hitCount} ${hitCount === 1 ? 'enemy' : 'enemies'}.` : 'Burst missed. Still looked cool.'); removeDefeatedEnemies();
  }
  function removeDefeatedEnemies() {
    const defeatedEnemies = state.enemies.filter((enemy) => enemy.hp <= 0);
    if (defeatedEnemies.length) { defeatedEnemies.forEach((enemy) => { state.defeated += 1; state.shards += enemy.isBoss ? 20 : state.floor % 10 === 0 ? 4 : 1; state.deathBursts.push({ x: enemy.x, y: enemy.y, life: enemy.isBoss ? 1.2 : .55, maxLife: enemy.isBoss ? 1.2 : .55, color: enemy.isBoss ? bossRules[enemy.mobKey].color : enemy.color, boss: enemy.isBoss }); addParticle(enemy.x, enemy.y, enemy.isBoss ? bossRules[enemy.mobKey].color : enemy.color, enemy.isBoss ? 34 : 10, enemy.isBoss ? 175 : 80); if (!enemy.summoned) { state.mobDefeats[enemy.mobKey] = (state.mobDefeats[enemy.mobKey] || 0) + 1; if (enemy.isBoss) rememberPeak(`You brought down the ${enemy.name} on floor ${formatFloor(state.floor)}.`, 100000 + state.floor); rollLoot(enemy); } }); const bossDefeated = defeatedEnemies.some((enemy) => enemy.isBoss); state.enemies = state.enemies.filter((enemy) => enemy.hp > 0); if (bossDefeated) { state.projectiles = state.projectiles.filter((projectile) => !projectile.isBoss); state.hazards = []; } saveProgress(); updateUI(); }
  }

  function drawBackground(theme) {
    ctx.fillStyle = theme.ground; ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    ctx.fillStyle = theme.tile; for (let x = 15; x < WORLD.width; x += 42) for (let y = 40; y < WORLD.height; y += 42) { const offset = ((x / 42 + y / 42) % 2) * 3; ctx.globalAlpha = .32; ctx.beginPath(); ctx.roundRect(x + offset, y + offset, 35, 35, 9); ctx.fill(); } ctx.globalAlpha = 1;
    ctx.fillStyle = theme.shadow; ctx.globalAlpha = .22; ctx.fillRect(20, 45, WORLD.width - 40, 5); ctx.fillRect(20, WORLD.height - 38, WORLD.width - 40, 5); ctx.globalAlpha = 1;
    state.decorations.forEach((decor) => drawDecoration(decor, theme));
    const exitX = WORLD.width - 80; const exitY = 73; ctx.fillStyle = '#718f83'; ctx.globalAlpha = .34; ctx.beginPath(); ctx.arc(exitX, exitY, 27, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; ctx.fillStyle = theme.ink; ctx.beginPath(); ctx.arc(exitX, exitY, 15, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#f6e7ab'; ctx.beginPath(); ctx.arc(exitX, exitY, 7, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.font = '700 9px DM Sans'; ctx.textAlign = 'center'; ctx.fillText('EXIT', exitX, exitY + 38);
  }
  function drawDecoration(decor, theme) {
    ctx.save(); ctx.translate(decor.x, decor.y); ctx.scale(decor.flip ? -decor.scale : decor.scale, decor.scale); ctx.globalAlpha = .75;
    if (decor.type === 'sprout') { ctx.strokeStyle = theme.ink; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 8); ctx.quadraticCurveTo(-2, -5, 1, -14); ctx.stroke(); ctx.fillStyle = theme.ink; ctx.beginPath(); ctx.ellipse(-6, -9, 7, 4, -.45, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(7, -13, 7, 4, .45, 0, Math.PI * 2); ctx.fill(); }
    else if (decor.type === 'web') { ctx.strokeStyle = '#8ed9ae'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-20, -20); ctx.lineTo(20, 20); ctx.moveTo(20, -20); ctx.lineTo(-20, 20); ctx.moveTo(0, -25); ctx.lineTo(0, 25); ctx.moveTo(-25, 0); ctx.lineTo(25, 0); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.stroke(); }
    else if (decor.type === 'bone') { ctx.strokeStyle = '#c8c0ae'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-15, -10); ctx.lineTo(15, 10); ctx.stroke(); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-16, -12, 4, 0, Math.PI * 2); ctx.arc(16, 12, 4, 0, Math.PI * 2); ctx.stroke(); }
    else if (decor.type === 'crack') { ctx.strokeStyle = '#292827'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-20, -5); ctx.lineTo(-5, 0); ctx.lineTo(-11, 17); ctx.moveTo(-5, 0); ctx.lineTo(14, -16); ctx.moveTo(-5, 0); ctx.lineTo(15, 9); ctx.stroke(); }
    else if (decor.type === 'lava') { ctx.fillStyle = '#d9533d'; ctx.beginPath(); ctx.ellipse(0, 4, 20, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffb04f'; ctx.beginPath(); ctx.ellipse(-3, 2, 10, 3, 0, 0, Math.PI * 2); ctx.fill(); }
    else if (decor.type === 'void') { ctx.strokeStyle = '#a25be2'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = '#281044'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#d091ff'; ctx.beginPath(); ctx.arc(4, -4, 3, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.fillStyle = theme.ink; ctx.beginPath(); ctx.ellipse(0, 5, 12, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = theme.tile; ctx.beginPath(); ctx.ellipse(-2, 2, 7, 3, -.2, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  function drawPlayer() {
    const p = state.player; ctx.save(); ctx.translate(p.x, p.y); if (p.invuln > 0 && Math.floor(state.elapsed * 16) % 2 === 0) ctx.globalAlpha = .42;
    ctx.fillStyle = 'rgba(43,65,78,.22)'; ctx.beginPath(); ctx.ellipse(0, 19, 25, 8, 0, 0, Math.PI * 2); ctx.fill();
    if (state.abilityEffect > 0) { ctx.globalAlpha = .32 + state.abilityEffect; ctx.strokeStyle = '#f4e7a6'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, 28 + (0.45 - state.abilityEffect) * 115, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
    ctx.fillStyle = '#ef785f'; ctx.beginPath(); ctx.moveTo(-18, -4); ctx.quadraticCurveTo(-27, 19, -9, 24); ctx.lineTo(13, 22); ctx.quadraticCurveTo(26, 11, 15, -7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4f62b5'; ctx.beginPath(); ctx.roundRect(-13, -9, 27, 30, 10); ctx.fill();
    ctx.fillStyle = '#ffc987'; ctx.beginPath(); ctx.arc(0, -20, 17, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#eda86d'; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = '#774b66'; ctx.beginPath(); ctx.arc(0, -25, 18, Math.PI, Math.PI * 2); ctx.fill(); ctx.fillRect(-18, -26, 36, 8);
    ctx.fillStyle = '#263254'; ctx.beginPath(); ctx.arc(-6, -19, 2.3, 0, Math.PI * 2); ctx.arc(6, -19, 2.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffc987'; ctx.beginPath(); ctx.arc(-19, 2, 6, 0, Math.PI * 2); ctx.arc(19, 2, 6, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.rotate(p.angle + .46); ctx.fillStyle = '#eff8f6'; ctx.roundRect(14, -5, 43, 9, 4); ctx.fill(); ctx.fillStyle = '#edc95f'; ctx.fillRect(6, -7, 17, 13); ctx.restore();
    if (state.attackEffect > 0) { ctx.save(); ctx.rotate(p.angle); ctx.strokeStyle = '#fff2b8'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.globalAlpha = state.attackEffect * 4; ctx.beginPath(); ctx.arc(18, 0, 38, -.9, .55); ctx.stroke(); ctx.restore(); }
    ctx.restore();
  }
  function drawProjectiles() {
    state.projectiles.forEach((projectile) => {
      const angle = Math.atan2(projectile.vy, projectile.vx); ctx.save(); ctx.translate(projectile.x, projectile.y); ctx.rotate(angle); ctx.globalAlpha = .22; ctx.strokeStyle = projectile.color; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(-5, 0); ctx.stroke(); ctx.globalAlpha = 1;
      if (projectile.kind === 'poison') { ctx.fillStyle = '#8fe0a1'; ctx.strokeStyle = '#2d6b54'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(2, 0, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#d9ffe1'; ctx.beginPath(); ctx.arc(-1, -3, 3, 0, Math.PI * 2); ctx.fill(); }
      else if (projectile.kind === 'boulder') { ctx.fillStyle = '#b8a58e'; ctx.strokeStyle = '#514b47'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(2, 0, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#d9c8a6'; ctx.beginPath(); ctx.arc(-2, -4, 3, 0, Math.PI * 2); ctx.fill(); }
      else if (projectile.kind === 'fireball') { ctx.fillStyle = '#f07a55'; ctx.strokeStyle = '#7c3e48'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(13, 0); ctx.bezierCurveTo(6, -9, -3, -8, -8, 0); ctx.bezierCurveTo(-3, 8, 6, 9, 13, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.arc(1, 0, 3, 0, Math.PI * 2); ctx.fill(); }
      else if (projectile.kind === 'void') { ctx.fillStyle = '#bd70ff'; ctx.strokeStyle = '#3d1f6b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(2, 0, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#f2c9ff'; ctx.beginPath(); ctx.arc(-1, -2, 3, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.strokeStyle = '#293754'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-17, 0); ctx.lineTo(10, 0); ctx.stroke(); ctx.fillStyle = projectile.mobKey.includes('skeleton') ? '#f1e9cf' : projectile.color; ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(7, -5); ctx.lineTo(7, 5); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#8a5e4b'; ctx.beginPath(); ctx.moveTo(-13, 0); ctx.lineTo(-18, -6); ctx.lineTo(-12, -3); ctx.lineTo(-18, 6); ctx.lineTo(-13, 3); ctx.closePath(); ctx.fill(); }
      ctx.restore();
      if (projectile.kind === 'boulder') { ctx.save(); ctx.globalAlpha = .28; ctx.strokeStyle = projectile.color; ctx.setLineDash([5, 5]); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(projectile.targetX, projectile.targetY, 18, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.restore(); }
    });
  }
  function drawHazards() {
    state.hazards.forEach((hazard) => {
      const warning = hazard.warning > 0; const pulse = .5 + Math.sin(state.elapsed * 12) * .15;
      ctx.save(); ctx.globalAlpha = warning ? .18 + pulse * .18 : .2;
      if (hazard.type === 'cone') {
        ctx.fillStyle = hazard.color; ctx.beginPath(); ctx.moveTo(hazard.x, hazard.y); ctx.arc(hazard.x, hazard.y, hazard.range, hazard.angle - hazard.halfAngle, hazard.angle + hazard.halfAngle); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = warning ? .8 : .42; ctx.strokeStyle = hazard.color; ctx.lineWidth = 3; ctx.setLineDash(warning ? [8, 7] : []); ctx.stroke(); ctx.setLineDash([]);
      } else {
        ctx.fillStyle = hazard.color; ctx.beginPath(); ctx.arc(hazard.x, hazard.y, hazard.r, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = warning ? .9 : .5; ctx.strokeStyle = hazard.color; ctx.lineWidth = 3; ctx.setLineDash(warning ? [8, 7] : []); ctx.stroke(); ctx.setLineDash([]);
        if (!warning && hazard.type === 'puddle') { ctx.globalAlpha = .48; ctx.fillStyle = '#ffcf72'; ctx.beginPath(); ctx.arc(hazard.x - hazard.r * .2, hazard.y - hazard.r * .2, hazard.r * .18, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.restore();
    });
  }
  function drawBossAction(enemy) {
    const action = enemy.bossAction; if (!action) return;
    const progress = 1 - clamp(action.timer / action.duration, 0, 1); const color = bossRules[enemy.mobKey].color;
    ctx.save(); ctx.translate(enemy.x, enemy.y); ctx.globalAlpha = .35 + progress * .5; ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.lineCap = 'round';
    if (['spider_bite', 'skeleton_slash', 'golem_punch', 'dragon_claw', 'void_slash'].includes(action.type)) { ctx.rotate(action.angle || 0); ctx.beginPath(); ctx.arc(0, 0, enemy.r + (action.range || 85) * .45, -.75, .75); ctx.stroke(); }
    if (action.type === 'spider_spit') { ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(state.player.x - enemy.x, state.player.y - enemy.y); ctx.stroke(); ctx.setLineDash([]); }
    if (action.type === 'dragon_fireball' || action.type === 'void_orbs') { ctx.beginPath(); ctx.arc(0, 0, enemy.r + 13 + progress * 7, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  }
  function drawEnemy(enemy) {
    const shape = enemy.mob.shape; const scale = enemy.isBoss ? 1.25 : 1;
    drawBossAction(enemy);
    if (enemy.telegraph > 0) {
      if (enemy.mob.attackType === 'Ranged') { const targetX = enemy.aimX ?? state.player.x; const targetY = enemy.aimY ?? state.player.y; const aimAngle = Math.atan2(targetY - enemy.y, targetX - enemy.x); ctx.save(); ctx.globalAlpha = .42 + Math.sin(state.elapsed * 14) * .08; ctx.strokeStyle = enemy.isBoss ? '#e36b7c' : '#d88e5d'; ctx.lineWidth = 3; ctx.setLineDash([8, 7]); ctx.beginPath(); ctx.moveTo(enemy.x, enemy.y); ctx.lineTo(targetX, targetY); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = enemy.isBoss ? '#e36b7c' : '#d88e5d'; ctx.beginPath(); ctx.arc(targetX, targetY, enemy.isBoss ? 15 : 11, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = .95; ctx.strokeStyle = '#fff3c4'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(targetX, targetY, enemy.isBoss ? 15 : 11, 0, Math.PI * 2); ctx.stroke(); ctx.translate(targetX, targetY); ctx.rotate(aimAngle); ctx.strokeStyle = '#293754'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-17, 0); ctx.lineTo(12, 0); ctx.stroke(); ctx.restore(); }
      else { ctx.save(); ctx.globalAlpha = .22 + enemy.telegraph * .35; ctx.fillStyle = enemy.isBoss ? '#f06e70' : '#f2b25c'; ctx.beginPath(); ctx.arc(state.player.x, state.player.y, enemy.isBoss ? 42 : 25, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 3; ctx.globalAlpha = .75; ctx.beginPath(); ctx.arc(state.player.x, state.player.y, enemy.isBoss ? 42 : 25, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
    }
    ctx.save(); ctx.translate(enemy.x, enemy.y + Math.sin(enemy.phase) * 2); const motionScale = enemy.isBoss ? 1 + Math.sin(enemy.phase * 1.4) * .035 + enemy.phasePulse * .055 : 1; ctx.scale(scale * motionScale, scale * motionScale); ctx.globalAlpha = enemy.hitFlash > 0 ? .5 : 1; ctx.fillStyle = 'rgba(43,65,78,.2)'; ctx.beginPath(); ctx.ellipse(0, enemy.r + 4, enemy.r * 1.18, enemy.r * .38, 0, 0, Math.PI * 2); ctx.fill();
    if (drawMobPortrait(enemy.mob, 0, -4, enemy.r * 2.8, enemy.r * 2.8)) { } else if (shape === 'spider') { ctx.strokeStyle = enemy.dark; ctx.lineWidth = 3; for (let leg = -1; leg <= 1; leg += 1) { ctx.beginPath(); ctx.moveTo(leg * 7, 3); ctx.lineTo(leg * 18, leg * 8 - 8); ctx.stroke(); ctx.beginPath(); ctx.moveTo(leg * 7, 5); ctx.lineTo(leg * 18, 16 - leg * 5); ctx.stroke(); } ctx.fillStyle = enemy.color; ctx.beginPath(); ctx.arc(0, 0, enemy.r, 0, Math.PI * 2); ctx.fill(); } else if (shape === 'skeleton' || shape === 'archer' || shape === 'undead') { ctx.fillStyle = enemy.dark; ctx.beginPath(); ctx.roundRect(-enemy.r * .7, -enemy.r + 8, enemy.r * 1.4, enemy.r * 1.6, 5); ctx.fill(); ctx.fillStyle = enemy.color; ctx.beginPath(); ctx.arc(0, -7, enemy.r * .8, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#2b3450'; ctx.beginPath(); ctx.arc(-5, -8, 2.5, 0, Math.PI * 2); ctx.arc(5, -8, 2.5, 0, Math.PI * 2); ctx.fill(); } else if (shape === 'golem' || shape === 'armored' || shape === 'knight' || shape === 'cursed' || shape === 'boss') { ctx.fillStyle = enemy.dark; ctx.beginPath(); ctx.roundRect(-enemy.r, -enemy.r + 5, enemy.r * 2, enemy.r * 1.7, 10); ctx.fill(); ctx.fillStyle = enemy.color; ctx.beginPath(); ctx.arc(0, -5, enemy.r * .84, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#f8e49a'; ctx.beginPath(); ctx.arc(-9, -8, 4, 0, Math.PI * 2); ctx.arc(9, -8, 4, 0, Math.PI * 2); ctx.fill(); if (enemy.isBoss) { ctx.fillStyle = '#f6d06e'; ctx.beginPath(); ctx.moveTo(-23, -27); ctx.lineTo(-13, -42); ctx.lineTo(-5, -28); ctx.lineTo(7, -42); ctx.lineTo(16, -25); ctx.closePath(); ctx.fill(); } } else if (shape === 'slime') { ctx.fillStyle = enemy.color; ctx.beginPath(); ctx.ellipse(0, 1, enemy.r + 2, enemy.r - 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = enemy.dark; ctx.beginPath(); ctx.arc(-6, -2, 2.5, 0, Math.PI * 2); ctx.arc(7, -2, 2.5, 0, Math.PI * 2); ctx.fill(); } else { ctx.fillStyle = enemy.color; ctx.beginPath(); ctx.arc(0, 0, enemy.r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = enemy.dark; ctx.beginPath(); ctx.arc(-6, -3, 2.5, 0, Math.PI * 2); ctx.arc(7, -3, 2.5, 0, Math.PI * 2); ctx.fill(); }
    if (enemy.isBoss && enemy.bossPhase > 1) { ctx.globalAlpha = .55 + Math.sin(state.elapsed * 10) * .15; ctx.strokeStyle = bossRules[enemy.mobKey].color; ctx.lineWidth = 3; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.arc(0, -4, enemy.r + 9, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
    if (enemy.mobKey === 'stone_golem_boss' && enemy.bossPhase >= 2) { ctx.globalAlpha = .75; ctx.strokeStyle = '#3e3837'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-11, -18); ctx.lineTo(-3, -4); ctx.lineTo(-9, 13); ctx.moveTo(13, -14); ctx.lineTo(5, 1); ctx.lineTo(12, 17); ctx.stroke(); }
    if (!getMobPortrait(enemy.mob)?.complete) { ctx.fillStyle = '#fff'; ctx.font = `${enemy.isBoss ? 20 : 15}px serif`; ctx.textAlign = 'center'; ctx.fillText(enemy.mob.icon, 0, 6); } ctx.restore();
    const barWidth = enemy.isBoss ? 88 : 38; const barY = enemy.y - enemy.r - (enemy.isBoss ? 28 : 12); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.roundRect(enemy.x - barWidth / 2, barY, barWidth, 5, 3); ctx.fill(); ctx.fillStyle = enemy.isBoss ? '#f6dc84' : '#f9f0bc'; ctx.beginPath(); ctx.roundRect(enemy.x - barWidth / 2, barY, barWidth * Math.max(0, enemy.hp / enemy.maxHp), 5, 3); ctx.fill(); drawMobPortrait(enemy.mob, enemy.x - barWidth / 2 - 14, barY + 2, 22, 22); if (enemy.isBoss) { ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.font = '700 9px DM Sans'; ctx.textAlign = 'center'; ctx.fillText(enemy.name, enemy.x, barY - 7); }
  }
  function drawEffects() { state.deathBursts.forEach((burst) => { ctx.globalAlpha = clamp(burst.life / burst.maxLife, 0, 1); ctx.strokeStyle = burst.color; ctx.lineWidth = burst.boss ? 5 : 3; ctx.beginPath(); ctx.arc(burst.x, burst.y, (burst.boss ? 65 : 28) * (1 - burst.life / burst.maxLife) + 8, 0, Math.PI * 2); ctx.stroke(); }); state.particles.forEach((particle) => { ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1); ctx.fillStyle = particle.color; ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2); ctx.fill(); }); state.numbers.forEach((number) => { ctx.globalAlpha = clamp(number.life * 2, 0, 1); ctx.fillStyle = number.color; ctx.font = '700 14px DM Sans'; ctx.textAlign = 'center'; ctx.fillText(number.value, number.x, number.y); }); ctx.globalAlpha = 1; }
  function draw() { const ratioX = canvas.width / WORLD.width; const ratioY = canvas.height / WORLD.height; const shake = state.screenShake > 0 ? random(-state.screenShake * 8, state.screenShake * 8) : 0; ctx.setTransform(ratioX, 0, 0, ratioY, shake, shake); const theme = themeForFloor(state.floor); drawBackground(theme); drawHazards(); drawLootDrops(); drawProjectiles(); state.enemies.forEach(drawEnemy); drawPlayer(); drawEffects(); ctx.setTransform(1, 0, 0, 1, 0, 0); }
  function beginLoop() { state.loopVersion += 1; const version = state.loopVersion; requestAnimationFrame((time) => loop(time, version)); }
  function loop(time, version) { if (version !== state.loopVersion) return; if (!state.running) { draw(); return; } if (state.paused) { draw(); return; } const dt = Math.min((time - state.lastTime) / 1000, .035); state.lastTime = time; state.elapsed += dt; update(dt); draw(); if (state.running) requestAnimationFrame((nextTime) => loop(nextTime, version)); }

  function updateUI() {
    const theme = themeForFloor(state.floor); $('#floorNumber').textContent = formatFloor(state.floor); $('#floorChip').textContent = `FLOOR ${formatFloor(state.floor)}`; $('#runTitle').textContent = theme.name; $('#floorProgress').style.width = `${(state.floor / 50) * 100}%`; $('#floorCaption').textContent = state.floor % 10 === 0 ? 'A boss guards this milestone.' : 'Clear the room to climb higher.'; $('#objectiveText').textContent = state.floor % 10 === 0 ? `Defeat ${bossNames[state.floor]}` : `Defeat ${state.enemies.length} ${state.enemies.length === 1 ? 'foe' : 'foes'}`; $('#healthText').textContent = `${Math.ceil(state.player.hp)} / ${state.player.maxHp}`; $('#healthFill').style.width = `${(state.player.hp / state.player.maxHp) * 100}%`; $('#healthFill').style.background = '#e85d67'; $('#shardCount').textContent = state.shards; $('#defeatedCount').textContent = state.defeated; const cooldown = state.abilityCooldown; $('#specialCooldown').textContent = cooldown > 0 ? `${cooldown.toFixed(1)}s` : 'READY'; $('#specialButton').style.filter = cooldown > 0 ? 'saturate(.45) brightness(.9)' : 'none'; document.querySelectorAll('[data-boss-row]').forEach((row) => { const bossFloor = Number(row.dataset.bossRow); row.classList.toggle('is-passed', state.floor > bossFloor); row.classList.toggle('is-current', state.floor === bossFloor); });
    const activeBoss = state.enemies.find((enemy) => enemy.isBoss && enemy.hp > 0); const bossHud = $('#bossHud');
    if (activeBoss) {
      const phaseText = activeBoss.bossPhase === 3 ? 'FINAL PHASE · ENRAGED' : activeBoss.bossPhase === 2 ? 'PHASE 2 · ENRAGED' : 'PHASE 1 · HUNT';
      bossHud.classList.add('is-visible'); $('#bossHudPortrait').src = activeBoss.mob.portrait; $('#bossHudPortrait').alt = activeBoss.name; $('#bossHudName').textContent = activeBoss.name; $('#bossHudPhase').textContent = phaseText; $('#bossHudHp').textContent = `${Math.ceil(clamp(activeBoss.hp, 0, activeBoss.maxHp))} / ${activeBoss.maxHp}`; $('#bossHealthFill').style.width = `${clamp((activeBoss.hp / activeBoss.maxHp) * 100, 0, 100)}%`; $('#bossHealthFill').style.background = bossRules[activeBoss.mobKey].color; bossHud.classList.toggle('is-hit', activeBoss.hitFlash > 0);
    } else bossHud.classList.remove('is-visible');
    if (Math.random() < .0005) $('#tipText').textContent = tips[Math.floor(Math.random() * tips.length)];
  }

  function showInventoryTooltip(index, itemId = null) {
    const id = itemId || state.inventory[index]?.id; const item = itemDefinition(id); const tooltip = $('#inventoryTooltip');
    if (!item) { tooltip.innerHTML = '<span class="tooltip-empty">Select an item to inspect it.</span>'; return; }
    const color = MOSSKEEP.RARITIES[item.rarity].color; const equipSlot = item.type === 'weapon' ? 'weapon' : item.slot; const equipped = equipSlot ? itemDefinition(state.equipment[equipSlot]) : null; const comparisons = equipped ? ['damage', 'defense', 'health', 'speed'].filter((stat) => (item.stats[stat] || 0) !== (equipped.stats[stat] || 0)).map((stat) => { const diff = (item.stats[stat] || 0) - (equipped.stats[stat] || 0); return `<span class="compare-${diff > 0 ? 'up' : 'down'}">${diff > 0 ? '+' : ''}${diff} ${stat.toUpperCase()}</span>`; }).join(' ') : '';
    tooltip.innerHTML = `<div class="tooltip-name" style="color:${color}">${item.name}</div><div class="tooltip-meta">${item.rarity} · ${item.type}${item.slot ? ` · ${item.slot}` : ''}</div><div class="tooltip-stats">${itemStatText(item) || 'Useful dungeon material'}</div>${comparisons ? `<div class="tooltip-comparison">Compared with equipped: ${comparisons}</div>` : ''}<div class="tooltip-description">${item.description}</div>`;
  }
  function renderPlayerStats() {
    const stats = getPlayerStats(); $('#playerStats').innerHTML = [['Level', '1'], ['Current health', `${Math.ceil(state.player.hp)} / ${stats.maxHealth}`], ['Max health', Math.round(stats.maxHealth)], ['Attack damage', Math.round(stats.attackDamage)], ['Defense', Math.round(stats.defense)], ['Move speed', Math.round(stats.movementSpeed)], ['Crit chance', `${stats.critChance}%`], ['Crit damage', `${stats.critDamage}%`]].map(([label, value]) => `<div class="player-stat"><span>${label}</span><strong>${value}</strong></div>`).join('');
  }
  function renderEquippedSlots() {
    document.querySelectorAll('[data-equip-slot]').forEach((element) => { const slot = element.dataset.equipSlot; const item = itemDefinition(state.equipment[slot]); const emptyName = slot === 'weapon' ? 'Weapon' : slot === 'chestplate' ? 'Chestplate' : slot[0].toUpperCase() + slot.slice(1); element.classList.toggle('has-item', Boolean(item)); element.innerHTML = item ? `${itemArtMarkup(item, 'item-art-equipment')}<small>${item.name}</small>` : `<span class="equip-slot-empty">${emptyName}</span>`; });
  }
  function renderInventoryGrid() {
    const grid = $('#inventoryGrid'); grid.innerHTML = '';
    state.inventory.forEach((slot, index) => { const item = itemDefinition(slot?.id); const button = document.createElement('button'); button.type = 'button'; button.className = `inventory-slot${item ? ` ${rarityClass(item.rarity)}` : ''}`; button.dataset.index = index; button.draggable = Boolean(item); button.innerHTML = `<span class="slot-index">${String(index + 1).padStart(2, '0')}</span>${item ? `${itemArtMarkup(item, 'item-art-inventory')}<span class="item-name">${item.name}</span><span class="item-qty">${slot.qty > 1 ? slot.qty : ''}</span>` : ''}`; button.addEventListener('click', () => { document.querySelectorAll('.inventory-slot').forEach((slotElement) => slotElement.classList.remove('is-selected')); button.classList.add('is-selected'); showInventoryTooltip(index); }); button.addEventListener('contextmenu', (event) => { event.preventDefault(); showInventoryTooltip(index); }); button.addEventListener('dblclick', () => equipInventoryIndex(index)); button.addEventListener('dragstart', (event) => { if (!item) return; event.dataTransfer.setData('text/plain', JSON.stringify({ type: 'inventory', index })); button.classList.add('is-dragging'); }); button.addEventListener('dragend', () => button.classList.remove('is-dragging')); button.addEventListener('dragover', (event) => event.preventDefault()); button.addEventListener('drop', (event) => { event.preventDefault(); const source = JSON.parse(event.dataTransfer.getData('text/plain') || '{}'); if (source.type === 'inventory') { const target = state.inventory[index]; state.inventory[index] = state.inventory[source.index]; state.inventory[source.index] = target; saveProgress(); renderInventoryUI(); } else if (source.type === 'equipment' && !state.inventory[index]) { state.inventory[index] = { id: state.equipment[source.slot], qty: 1 }; state.equipment[source.slot] = null; refreshDerivedStats(); saveProgress(); renderInventoryUI(); } }); grid.appendChild(button); });
  }
  function renderInventoryUI() { $('#inventoryCapacity').textContent = `${inventoryUsed()} item${inventoryUsed() === 1 ? '' : 's'} stored · Unlimited storage`; renderEquippedSlots(); document.querySelectorAll('[data-equip-slot]').forEach((element) => { element.draggable = Boolean(state.equipment[element.dataset.equipSlot]); }); renderInventoryGrid(); renderPlayerStats(); }
  function equipInventoryIndex(index, forcedSlot = null) {
    const slot = state.inventory[index]; const item = itemDefinition(slot?.id); if (!item) return;
    const equipSlot = forcedSlot || (item.type === 'weapon' ? 'weapon' : item.slot); if (!equipSlot || (equipSlot === 'weapon' && item.type !== 'weapon') || (equipSlot !== 'weapon' && (item.type !== 'armor' || item.slot !== equipSlot))) { showToast('That item does not fit that slot.'); return; }
    const old = state.equipment[equipSlot];
    if (slot.qty > 1) slot.qty -= 1;
    else state.inventory[index] = null;
    if (old) addItemToInventory(old, 1, false);
    state.equipment[equipSlot] = item.id; refreshDerivedStats(); saveProgress(); renderInventoryUI(); showInventoryTooltip(index); showToast(`${item.name} equipped.`);
  }
  function unequipSlot(slot) { const itemId = state.equipment[slot]; if (!itemId) return; const remainder = addItemToInventory(itemId, 1, false); if (remainder === 0) { state.equipment[slot] = null; refreshDerivedStats(); saveProgress(); renderInventoryUI(); showToast('Equipment returned to your pack.'); } else showToast('Your pack is full.'); }
  function sortInventory() { state.inventory.sort((a, b) => { if (!a) return 1; if (!b) return -1; const itemA = itemDefinition(a.id); const itemB = itemDefinition(b.id); return `${itemA.type}${itemA.rarity}${itemA.name}`.localeCompare(`${itemB.type}${itemB.rarity}${itemB.name}`); }); saveProgress(); renderInventoryUI(); showToast('Pack sorted.'); }
  function toggleInventory(force) { const shouldOpen = typeof force === 'boolean' ? force : !state.inventoryOpen; state.inventoryOpen = shouldOpen; if (shouldOpen) { state.paused = Boolean(state.running); renderInventoryUI(); openModal('inventoryModal'); } else { closeModal('inventoryModal'); state.paused = false; if (state.running) { state.lastTime = performance.now(); beginLoop(); } } }

  let codexView = 'mobs'; let codexSelection = null;
  const obtainableItemIds = () => Object.keys(MOSSKEEP.ITEMS).filter((itemId) => itemSourceRows(itemId).length);
  function openCodex(view = 'mobs') { codexView = view; codexSelection = null; $('#codexSearch').value = ''; if (state.running) state.paused = true; openModal('codexModal'); renderCodex(); }
  function closeCodex() { closeModal('codexModal'); if (state.running) { state.paused = false; state.lastTime = performance.now(); beginLoop(); } }
  function configureCodexFilter() { const filter = $('#codexFilter'); const selected = filter.value; filter.innerHTML = codexView === 'mobs' ? '<option value="all">All tiers</option><option value="Beginner">Beginner</option><option value="Intermediate">Intermediate</option><option value="Advanced">Advanced</option><option value="Elite">Elite</option><option value="Boss">Bosses</option>' : '<option value="all">All rarities</option>' + Object.keys(MOSSKEEP.RARITIES).map((rarity) => `<option value="${rarity}">${rarity}</option>`).join(''); if ([...filter.options].some((option) => option.value === selected)) filter.value = selected; }
  function renderCodex() {
    document.querySelectorAll('[data-codex-tab]').forEach((tab) => tab.classList.toggle('is-active', tab.dataset.codexTab === codexView)); configureCodexFilter(); const search = $('#codexSearch').value.trim().toLowerCase(); const filter = $('#codexFilter').value; const grid = $('#codexGrid'); grid.innerHTML = '';
    if (codexView === 'mobs') {
      $('#codexTitle').textContent = 'Mob Encyclopedia'; $('#codexSubtitle').textContent = 'Study the things that move in the dark.'; $('#codexProgress').textContent = `${Object.values(state.mobDefeats).reduce((sum, count) => sum + count, 0)} total defeats logged · ${Object.keys(MOSSKEEP.MOBS).length} creatures catalogued`;
      Object.values(MOSSKEEP.MOBS).filter((mob) => (!search || `${mob.name} ${mob.tier} ${mob.ability}`.toLowerCase().includes(search)) && (filter === 'all' || mob.tier === filter)).forEach((mob) => { const card = document.createElement('button'); card.type = 'button'; card.className = `codex-card${codexSelection === mob.id ? ' is-selected' : ''}`; card.innerHTML = `<img class="mob-portrait mob-portrait-card" src="${mob.portrait}" alt="${mob.name}" loading="lazy"><span class="codex-rarity" style="background:${mob.color}"></span><strong>${mob.name}</strong><small>${mob.tier} · ${state.mobDefeats[mob.id] || 0} defeated</small>`; card.addEventListener('click', () => { codexSelection = mob.id; renderCodex(); }); grid.appendChild(card); });
    } else {
      const ids = obtainableItemIds().filter((itemId) => { const item = itemDefinition(itemId); return (!search || `${item.name} ${item.type} ${item.rarity}`.toLowerCase().includes(search)) && (filter === 'all' || item.rarity === filter); });
      $('#codexTitle').textContent = 'Drop Encyclopedia'; $('#codexSubtitle').textContent = 'Every treasure has a story. Every story has a source.'; $('#codexProgress').textContent = `${state.discoveredItems.filter((itemId) => obtainableItemIds().includes(itemId)).length} / ${obtainableItemIds().length} items discovered`;
      ids.forEach((itemId) => { const item = itemDefinition(itemId); const known = state.discoveredItems.includes(itemId); const card = document.createElement('button'); card.type = 'button'; card.className = `codex-card${codexSelection === itemId ? ' is-selected' : ''}${known ? '' : ' is-unknown'}`; card.innerHTML = `${known ? itemArtMarkup(item, 'item-art-codex') : '<span class="codex-unknown-mark">?</span>'}<span class="codex-rarity" style="background:${MOSSKEEP.RARITIES[item.rarity].color}"></span><strong>${known ? item.name : 'Undiscovered'}</strong><small>${known ? `${item.rarity} · ${item.type}` : 'Find this item'}</small>`; card.addEventListener('click', () => { codexSelection = itemId; renderCodex(); }); grid.appendChild(card); });
    }
    renderCodexDetails();
  }
  function renderCodexDetails() {
    const details = $('#codexDetails'); const definition = codexSelection && (codexView === 'mobs' ? MOSSKEEP.MOBS[codexSelection] : itemDefinition(codexSelection));
    if (!definition) { details.innerHTML = '<div class="codex-empty">Select an entry to learn more.</div>'; return; }
    if (codexView === 'mobs') {
      const mob = definition; details.innerHTML = `<div class="detail-top"><div class="detail-icon"><img class="mob-portrait mob-portrait-detail" src="${mob.portrait}" alt="${mob.name}"></div><div><h3>${mob.name}</h3><span class="detail-tag">${mob.tier} · ${mob.floors}</span></div></div><div class="detail-section"><div class="detail-stats"><div class="detail-stat"><span>Health</span><strong>${mob.hp}</strong></div><div class="detail-stat"><span>Attack damage</span><strong>${mob.damage}</strong></div><div class="detail-stat"><span>Defense</span><strong>${mob.defense}</strong></div><div class="detail-stat"><span>Move speed</span><strong>${mob.speed}</strong></div><div class="detail-stat"><span>Attack type</span><strong>${mob.attackType}</strong></div><div class="detail-stat"><span>Defeated</span><strong>${state.mobDefeats[mob.id] || 0}</strong></div></div></div><div class="detail-section"><h4>Behavior & ability</h4><p class="detail-copy">${mob.behavior}. ${mob.ability}.</p></div><div class="detail-section"><h4>Possible drops · ${mob.dropTable.length}</h4><div class="drop-list">${mob.dropTable.map((drop) => { const item = itemDefinition(drop.itemId); return `<button class="drop-row" data-item-detail="${item.id}" type="button"><span class="drop-icon">${itemArtMarkup(item, 'item-art-drop-row')}</span><span><strong>${item.name}</strong><small style="color:${MOSSKEEP.RARITIES[item.rarity].color}">${item.rarity} · ${itemStatText(item) || 'Material'}</small></span><span class="drop-chance">${drop.chance}%</span></button>`; }).join('')}</div></div>`;
      details.querySelectorAll('[data-item-detail]').forEach((button) => button.addEventListener('click', () => { codexView = 'drops'; codexSelection = button.dataset.itemDetail; renderCodex(); }));
    } else {
      const item = definition; const known = state.discoveredItems.includes(item.id); const sources = itemSourceRows(item.id); details.innerHTML = `<div class="detail-top"><div class="detail-icon">${known ? itemArtMarkup(item, 'item-art-detail') : '<span class="codex-unknown-mark">?</span>'}</div><div><h3>${known ? item.name : 'Undiscovered item'}</h3><span class="detail-tag" style="color:${MOSSKEEP.RARITIES[item.rarity].color}">${known ? item.rarity : '???'} · ${item.type}</span></div></div>${known ? `<div class="detail-section"><p class="detail-copy">${item.description}</p><div class="detail-stats" style="margin-top:12px"><div class="detail-stat"><span>Item stats</span><strong>${itemStatText(item) || 'Material'}</strong></div><div class="detail-stat"><span>Stack limit</span><strong>${item.stackable ? 64 : 1}</strong></div></div></div><div class="detail-section"><h4>Found from</h4>${sources.map((source) => `<div class="source-row"><span>${source.mob.name} · ${source.mob.floors}</span><strong>${source.chance}%</strong></div>`).join('')}</div>` : '<div class="detail-section"><p class="detail-copy">This item is still hidden in the field guide. Defeat the right mob and collect it to unlock its details.</p></div>'}`;
    }
  }

  function setJoystickFromPointer(event) { const rect = $('#joystick').getBoundingClientRect(); const centerX = rect.left + rect.width / 2; const centerY = rect.top + rect.height / 2; const radius = rect.width * .34; const rawX = (event.clientX - centerX) / radius; const rawY = (event.clientY - centerY) / radius; const length = Math.hypot(rawX, rawY); const ratio = length > 1 ? 1 / length : 1; state.joystick.x = rawX * ratio; state.joystick.y = rawY * ratio; $('#joystickKnob').style.transform = `translate(${state.joystick.x * 25}px, ${state.joystick.y * 25}px)`; }
  function resetJoystick() { state.joystick.active = false; state.joystick.pointerId = null; state.joystick.x = 0; state.joystick.y = 0; $('#joystickKnob').style.transform = 'translate(0, 0)'; }

  function startDrag(event, control) { const stageRect = $('#gameStage').getBoundingClientRect(); state.drag = { control, pointerId: event.pointerId, stageRect }; event.currentTarget.setPointerCapture?.(event.pointerId); }
  function moveDrag(event) { if (!state.drag || event.pointerId !== state.drag.pointerId) return; const { stageRect, control } = state.drag; const element = control === 'joystick' ? $('#joystick') : control === 'hit' ? $('#hitControl') : $('#specialControl'); const x = clamp(((event.clientX - stageRect.left) / stageRect.width) * 100, 1, 91); const y = clamp(((event.clientY - stageRect.top) / stageRect.height) * 100, 2, 88); controlPositions[control] = { left: x, top: y }; element.style.left = `${x}%`; element.style.top = `${y}%`; }
  function endDrag() { if (state.drag) { saveControlPositions(); state.drag = null; showToast('Control position saved.'); } }
  function toggleEditMode(enabled = !state.editing) { state.editing = enabled; $('#gameStage').classList.toggle('is-editing', enabled); if (enabled) { closeModal('customizeModal'); showToast('Drag the controls into place.'); } else { saveControlPositions(); } }

  $('#startButton').addEventListener('click', startNewRun); $('#secretBossButton').addEventListener('click', startFinalBossRun); $('#runAgainButton').addEventListener('click', startNewRun); $('#continueButton').addEventListener('click', continueFloor);
  $('#pauseButton').addEventListener('click', () => { if (!state.running && !state.paused) return; state.paused = true; openModal('pauseModal'); }); $('#resumeButton').addEventListener('click', () => { closeModal('pauseModal'); state.paused = false; state.lastTime = performance.now(); beginLoop(); }); $('#restartButton').addEventListener('click', startNewRun);
  $('#customizeButton').addEventListener('click', () => openModal('customizeModal')); $('#introCustomizeButton').addEventListener('click', () => openModal('customizeModal')); $('#closeCustomizeButton').addEventListener('click', () => closeModal('customizeModal')); $('#editLayoutButton').addEventListener('click', () => { closeModal('customizeModal'); if (!$('#gameScreen').classList.contains('is-visible')) startNewRun(); toggleEditMode(true); }); $('#doneEditingButton').addEventListener('click', () => toggleEditMode(false)); $('#resetLayoutButton').addEventListener('click', resetControlPositions);
  $('#inventoryButton').addEventListener('click', () => toggleInventory()); $('#closeInventoryButton').addEventListener('click', () => toggleInventory(false)); $('#sortInventoryButton').addEventListener('click', sortInventory);
  $('#introMobsButton').addEventListener('click', () => openCodex('mobs')); $('#introDropsButton').addEventListener('click', () => openCodex('drops')); $('#gameMobsButton').addEventListener('click', () => openCodex('mobs')); $('#gameDropsButton').addEventListener('click', () => openCodex('drops')); $('#closeCodexButton').addEventListener('click', closeCodex);
  document.querySelectorAll('[data-codex-tab]').forEach((tab) => tab.addEventListener('click', () => { codexView = tab.dataset.codexTab; codexSelection = null; document.querySelectorAll('[data-codex-tab]').forEach((tabButton) => tabButton.classList.toggle('is-active', tabButton === tab)); renderCodex(); })); $('#codexSearch').addEventListener('input', renderCodex); $('#codexFilter').addEventListener('change', renderCodex);
  $('#hitButton').addEventListener('pointerdown', (event) => { event.preventDefault(); hit(); }); $('#specialButton').addEventListener('pointerdown', (event) => { event.preventDefault(); special(); });

  document.querySelectorAll('[data-equip-slot]').forEach((element) => {
    element.addEventListener('click', () => { if (state.equipment[element.dataset.equipSlot]) { showInventoryTooltip(null, state.equipment[element.dataset.equipSlot]); } else showToast('Drag matching gear here to equip it.'); });
    element.addEventListener('dragover', (event) => { event.preventDefault(); element.classList.add('is-over'); }); element.addEventListener('dragleave', () => element.classList.remove('is-over')); element.addEventListener('dragend', () => element.classList.remove('is-over'));
    element.addEventListener('dragstart', (event) => { const slot = element.dataset.equipSlot; if (!state.equipment[slot]) { event.preventDefault(); return; } event.dataTransfer.setData('text/plain', JSON.stringify({ type: 'equipment', slot })); });
    element.addEventListener('drop', (event) => { event.preventDefault(); element.classList.remove('is-over'); const source = JSON.parse(event.dataTransfer.getData('text/plain') || '{}'); if (source.type !== 'inventory') return; equipInventoryIndex(source.index, element.dataset.equipSlot); });
  });

  $('#joystick').addEventListener('pointerdown', (event) => { event.preventDefault(); if (state.editing) { startDrag(event, 'joystick'); return; } state.joystick.active = true; state.joystick.pointerId = event.pointerId; $('#joystick').setPointerCapture?.(event.pointerId); setJoystickFromPointer(event); });
  $('#joystick').addEventListener('pointermove', (event) => { if (state.editing) moveDrag(event); else if (state.joystick.active && event.pointerId === state.joystick.pointerId) setJoystickFromPointer(event); });
  $('#joystick').addEventListener('pointerup', () => { if (state.editing) endDrag(); else resetJoystick(); }); $('#joystick').addEventListener('pointercancel', () => { if (state.editing) endDrag(); else resetJoystick(); });
  document.querySelectorAll('.control-hit, .control-special').forEach((element) => element.addEventListener('pointerdown', (event) => { if (state.editing) { event.preventDefault(); startDrag(event, element.dataset.control); } }));
  window.addEventListener('pointermove', moveDrag); window.addEventListener('pointerup', endDrag); window.addEventListener('pointercancel', endDrag);
  window.addEventListener('keydown', (event) => { const key = event.key.length === 1 ? event.key.toLowerCase() : event.key; const formField = ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName); if (key === 'e' && !formField) { event.preventDefault(); toggleInventory(); return; } state.keys[key] = true; if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault(); if (event.key === ' ' || key === 'j') hit(); if (key === 'k') special(); if (key === 'Escape') { if ($('#inventoryModal').classList.contains('is-visible')) toggleInventory(false); else if ($('#codexModal').classList.contains('is-visible')) closeCodex(); else if (state.running) { if ($('#pauseModal').classList.contains('is-visible')) $('#resumeButton').click(); else $('#pauseButton').click(); } } }); window.addEventListener('keyup', (event) => { const key = event.key.length === 1 ? event.key.toLowerCase() : event.key; state.keys[key] = false; });

  loadProgress(); applyControlPositions(); resizeCanvas(); updateUI(); renderInventoryUI();
})();
