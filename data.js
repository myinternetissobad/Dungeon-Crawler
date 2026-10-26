(() => {
  'use strict';

  const ITEMS = {};
  const RARITIES = {
    Common: { color: '#9ca5b5', weight: 55 },
    Uncommon: { color: '#59b982', weight: 25 },
    Rare: { color: '#5b93e8', weight: 12 },
    Epic: { color: '#9b68df', weight: 6 },
    Legendary: { color: '#e89b3f', weight: 1.8 },
    Mythic: { color: '#e65c73', weight: .2 },
  };

  function addItem(id, name, type, rarity, icon, stats, description, options = {}) {
    ITEMS[id] = { id, name, type, rarity, icon, stats: stats || {}, description, stackable: options.stackable ?? true, slot: options.slot || null };
  }
  const material = (id, name, rarity, icon, description) => addItem(id, name, 'material', rarity, icon, {}, description);
  const weapon = (id, name, rarity, icon, damage, description) => addItem(id, name, 'weapon', rarity, icon, { damage }, description);
  const armor = (id, name, rarity, icon, slot, defense, health, speed, description) => addItem(id, name, 'armor', rarity, icon, { defense, health, speed }, description, { stackable: true, slot });

  material('rotten_flesh', 'Rotten Flesh', 'Common', '🥩', 'A questionable snack with a surprisingly useful alchemical aftertaste.');
  material('bones', 'Bones', 'Common', '🦴', 'Clean, chalky pieces left behind by dungeon undead.');
  material('arrows', 'Arrows', 'Common', '🏹', 'A small bundle of reliable dungeon arrows.');
  material('spider_fang', 'Spider Fang', 'Common', '🕷️', 'A sharp fang that still tingles with cave venom.');
  material('spider_queen_fang', 'Spider Queen Fang', 'Rare', '🕷️', 'A huge venomous fang from the ruler of the first depths.');
  material('web_silk', 'Web Silk', 'Common', '🧵', 'Strong, sticky silk spun in the dark.');
  material('slime_gel', 'Slime Gel', 'Common', '🫧', 'Bouncy gel that refuses to stay in one shape.');
  material('slime_core', 'Slime Core', 'Uncommon', '🟢', 'A bright little engine of elastic energy.');
  material('goblin_coin', 'Goblin Coin', 'Common', '🪙', 'It has two heads and neither one looks trustworthy.');
  material('iron_scrap', 'Iron Scrap', 'Common', '🔩', 'Bent metal scavenged from old dungeon armor.');
  material('venom_sac', 'Venom Sac', 'Uncommon', '🧪', 'Handle with care. It still has pressure.');
  material('spider_silk', 'Spider Silk', 'Uncommon', '🕸️', 'Refined silk that shimmers like a wet moonbeam.');
  material('magic_essence', 'Magic Essence', 'Uncommon', '✨', 'A fizzing drop of condensed spellwork.');
  material('shadow_fragment', 'Shadow Fragment', 'Rare', '🌑', 'A shard that seems to be missing from the light.');
  material('fire_essence', 'Fire Essence', 'Rare', '🔥', 'A warm ember that never burns out.');
  material('fire_crystal', 'Fire Crystal', 'Rare', '🔶', 'A crystal that holds a tiny, roaring sunrise.');
  material('stone_core', 'Stone Core', 'Rare', '🪨', 'Dense stone with a heartbeat-like pulse.');
  material('cursed_bone', 'Cursed Bone', 'Rare', '☠️', 'The runes on it move when nobody is looking.');
  material('cursed_metal', 'Cursed Metal', 'Epic', '⛓️', 'Cold metal that remembers every hand that held it.');
  material('void_fragment', 'Void Fragment', 'Epic', '🕳️', 'A piece of somewhere that is not here.');
  material('dragon_scale', 'Dragon Scale', 'Legendary', '🐉', 'A warm scale, tougher than any ordinary shield.');
  material('abyss_fragment', 'Abyss Fragment', 'Legendary', '🌀', 'The dungeon gets quieter around this fragment.');
  material('kings_bone', "King's Bone", 'Legendary', '👑', 'A royal relic with a very long memory.');
  material('shadow_armor_piece', 'Shadow Armor Piece', 'Epic', '🖤', 'A loose piece of armor stitched from living shade.');
  material('void_core', 'Void Core', 'Mythic', '🔮', 'The dark center of a world-ending machine.');
  material('void_armor_piece', 'Void Armor Piece', 'Mythic', '🛡️', 'A fragment of armor that bends the edge of reality.');

  weapon('old_dagger', 'Old Dagger', 'Common', '🗡️', 10, 'A well-used blade that still knows the way to a weak spot.');
  weapon('rusty_sword', 'Rusty Sword', 'Common', '⚔️', 12, 'It is more enthusiastic than sharp.');
  weapon('iron_sword', 'Iron Sword', 'Uncommon', '🗡️', 18, 'A dependable dungeon sword with a solid edge.');
  weapon('skeleton_bow', 'Skeleton Bow', 'Uncommon', '🏹', 14, 'A light bow made for bony hands and quick shots.');
  weapon('goblin_blade', 'Goblin Blade', 'Uncommon', '🔪', 20, 'A crooked blade with a surprisingly nimble balance.');
  weapon('poison_dagger', 'Poison Dagger', 'Rare', '🗡️', 24, 'Its green edge leaves more than a scratch.');
  weapon('reinforced_bow', 'Reinforced Bow', 'Rare', '🏹', 26, 'Layered wood gives this bow a confident snap.');
  weapon('knight_sword', 'Knight Sword', 'Rare', '⚔️', 32, 'A polished blade from an old dungeon order.');
  weapon('mage_staff', 'Mage Staff', 'Rare', '🪄', 28, 'It hums softly when enemies get too close.');
  weapon('venom_blade', 'Venom Blade', 'Epic', '🗡️', 38, 'A long blade with a bright, toxic glint.');
  weapon('dark_staff', 'Dark Staff', 'Epic', '🪄', 42, 'A staff that makes every shadow feel intentional.');
  weapon('assassin_dagger', 'Assassin Dagger', 'Epic', '🔪', 45, 'Small, silent, and already halfway to the next target.');
  weapon('necromancer_staff', 'Necromancer Staff', 'Epic', '☠️', 50, 'The crystal at the top whispers old names.');
  weapon('flame_sword', 'Flame Sword', 'Legendary', '🔥', 55, 'A sword that leaves a little sunrise in its wake.');
  weapon('golem_hammer', 'Golem Hammer', 'Legendary', '🔨', 62, 'Heavy enough to make the floor rethink itself.');
  weapon('soul_staff', 'Soul Staff', 'Legendary', '🪄', 68, 'A staff that channels the energy between heartbeats.');
  weapon('cursed_sword', 'Cursed Sword', 'Legendary', '⚔️', 72, 'Powerful, moody, and not recommended for bedtime reading.');
  weapon('dragon_sword', 'Dragon Sword', 'Legendary', '🐉', 88, 'Forged in a heat ordinary metal cannot survive.');
  weapon('void_dagger', 'Void Dagger', 'Mythic', '🗡️', 84, 'The cut arrives before the blade does.');
  weapon('reaper_scythe', 'Reaper Scythe', 'Mythic', '🌙', 105, 'A sweeping weapon that makes space for itself.');
  weapon('skeleton_kings_sword', "Skeleton King's Sword", 'Legendary', '👑', 115, 'A royal blade with a dramatic entrance.');
  weapon('void_sword', 'Void Sword', 'Mythic', '🌌', 150, 'A sword-shaped answer to the question of darkness.');
  weapon('void_lords_scythe', "Void Lord's Scythe", 'Mythic', '🌑', 175, 'It is best admired from a safe distance.');

  armor('leather_helmet', 'Leather Helmet', 'Common', '🪖', 'helmet', 2, 0, 0, 'Soft protection for a brave first step.');
  armor('leather_chestplate', 'Leather Chestplate', 'Common', '🦺', 'chestplate', 5, 0, 0, 'Light armor that leaves room to move.');
  armor('leather_leggings', 'Leather Leggings', 'Common', '👖', 'leggings', 3, 0, 0, 'Simple protection for the climb.');
  armor('leather_boots', 'Leather Boots', 'Common', '🥾', 'boots', 2, 0, 0, 'Quiet boots with a little extra grip.');
  armor('slime_boots', 'Slime Boots', 'Common', '🥾', 'boots', 1, 0, 4, 'Bouncy soles give movement a little spring.');
  armor('iron_helmet', 'Iron Helmet', 'Uncommon', '⛑️', 'helmet', 5, 0, 0, 'Sturdy iron with a well-worn nose guard.');
  armor('iron_chestplate', 'Iron Chestplate', 'Uncommon', '🛡️', 'chestplate', 10, 0, 0, 'A reliable plate for rooms that bite back.');
  armor('iron_leggings', 'Iron Leggings', 'Uncommon', '🦿', 'leggings', 7, 0, 0, 'Protective iron fitted for a long expedition.');
  armor('iron_boots', 'Iron Boots', 'Uncommon', '🥾', 'boots', 4, 0, 0, 'Heavy boots with a reassuring thud.');
  armor('reinforced_chestplate', 'Reinforced Chestplate', 'Rare', '🛡️', 'chestplate', 20, 8, 0, 'Dense plates built from a golem core.');
  armor('knight_helmet', 'Knight Helmet', 'Rare', '🪖', 'helmet', 8, 5, 0, 'A knightly helm that makes courage look easy.');
  armor('knight_chestplate', 'Knight Chestplate', 'Rare', '🛡️', 'chestplate', 16, 15, 0, 'Layered steel for the center of a hard fight.');
  armor('knight_leggings', 'Knight Leggings', 'Rare', '👖', 'leggings', 11, 10, 0, 'Flexible plates for a steady stride.');
  armor('knight_boots', 'Knight Boots', 'Rare', '🥾', 'boots', 7, 0, 3, 'Polished boots that never lose their footing.');
  armor('shadow_helmet', 'Shadow Helmet', 'Epic', '🎭', 'helmet', 12, 10, 0, 'A quiet hood that makes a silhouette disappear.');
  armor('shadow_chestplate', 'Shadow Chestplate', 'Epic', '🖤', 'chestplate', 23, 25, 0, 'Layered shadow that turns danger into a rumor.');
  armor('shadow_leggings', 'Shadow Leggings', 'Epic', '👖', 'leggings', 17, 15, 0, 'Dark fabric for quick, silent steps.');
  armor('shadow_boots', 'Shadow Boots', 'Epic', '🥾', 'boots', 10, 0, 8, 'Boots that seem to arrive a moment early.');
  armor('dragon_helmet', 'Dragon Helmet', 'Legendary', '🐲', 'helmet', 18, 20, 0, 'A scale-lined helm with a warm inner glow.');
  armor('dragon_chestplate', 'Dragon Chestplate', 'Legendary', '🐉', 'chestplate', 35, 40, 0, 'A legendary breastplate built for impossible rooms.');
  armor('dragon_leggings', 'Dragon Leggings', 'Legendary', '👖', 'leggings', 26, 30, 0, 'Dragon scale plates with a flexible core.');
  armor('dragon_boots', 'Dragon Boots', 'Legendary', '🥾', 'boots', 15, 0, 10, 'A fiery stride for an even fierier climb.');
  armor('void_helmet', 'Void Helmet', 'Mythic', '🌌', 'helmet', 28, 35, 0, 'A helm that keeps the abyss politely outside.');
  armor('void_chestplate', 'Void Chestplate', 'Mythic', '🛡️', 'chestplate', 50, 70, 0, 'The deepest armor in the keep.');
  armor('void_leggings', 'Void Leggings', 'Mythic', '👖', 'leggings', 38, 50, 0, 'The darkness itself seems to carry the weight.');
  armor('void_boots', 'Void Boots', 'Mythic', '🥾', 'boots', 22, 0, 15, 'A step in these boots is half a step elsewhere.');
  armor('skeleton_crown', 'Skeleton Crown', 'Legendary', '👑', 'helmet', 22, 20, 0, 'A crown for someone who has already conquered death.');
  armor('abyssal_crown', 'Abyssal Crown', 'Mythic', '👑', 'helmet', 35, 40, 0, 'A crown that makes the room hold its breath.');

  const drops = (...entries) => entries.map(([itemId, chance]) => ({ itemId, chance }));
  const mob = (id, name, tier, icon, color, hp, damage, defense, speed, attackType, ability, floors, dropTable, options = {}) => ({
    id, name, tier, icon, portrait: options.portrait || `assets/mobs/${id}.png`, color, dark: options.dark || '#33415c', hp, damage, defense, speed, attackType, ability, floors, minFloor: options.minFloor || 1, maxFloor: options.maxFloor || 50, behavior: options.behavior || ability, shape: options.shape || 'blob', dropTable,
  });

  const MOBS = {
    zombie: mob('zombie', 'Zombie', 'Beginner', '🧟', '#87a96b', 40, 5, 2, 40, 'Melee', 'Slow chase', 'Floors 1–5', drops(['rotten_flesh', 60], ['old_dagger', 12], ['leather_helmet', 8], ['leather_chestplate', 5], ['iron_sword', 2]), { maxFloor: 5, shape: 'undead' }),
    skeleton: mob('skeleton', 'Skeleton', 'Beginner', '💀', '#d9d0bd', 30, 7, 1, 42, 'Ranged', 'Shoots arrows', 'Floors 1–5', drops(['bones', 70], ['arrows', 45], ['skeleton_bow', 10], ['iron_helmet', 4]), { maxFloor: 5, shape: 'skeleton' }),
    cave_spider: mob('cave_spider', 'Cave Spider', 'Beginner', '🕷️', '#6d8d85', 25, 4, 0, 78, 'Melee', 'Occasional poison', 'Floors 1–5', drops(['spider_fang', 55], ['web_silk', 35], ['leather_boots', 8], ['poison_dagger', 2]), { maxFloor: 5, shape: 'spider' }),
    slime: mob('slime', 'Slime', 'Beginner', '🟢', '#65b98a', 35, 5, 0, 58, 'Leap', 'Jumps toward players', 'Floors 1–5', drops(['slime_gel', 70], ['slime_core', 15], ['slime_boots', 5]), { maxFloor: 5, shape: 'slime' }),
    goblin: mob('goblin', 'Goblin', 'Beginner', '👺', '#b67861', 45, 6, 2, 72, 'Melee', 'Attacks and retreats', 'Floors 1–5', drops(['goblin_coin', 60], ['rusty_sword', 20], ['iron_chestplate', 5], ['goblin_blade', 2]), { maxFloor: 5, shape: 'goblin' }),

    armored_zombie: mob('armored_zombie', 'Armored Zombie', 'Intermediate', '🧟', '#79869a', 100, 12, 12, 30, 'Melee', 'Heavy armor', 'Floors 6–15', drops(['iron_scrap', 65], ['iron_helmet', 15], ['iron_chestplate', 8], ['iron_leggings', 6], ['iron_boots', 4], ['knight_helmet', 2]), { minFloor: 6, maxFloor: 15, shape: 'armored' }),
    skeleton_archer: mob('skeleton_archer', 'Skeleton Archer', 'Intermediate', '🏹', '#c2bbad', 65, 14, 4, 48, 'Ranged', 'Keeps distance', 'Floors 6–15', drops(['bones', 75], ['arrows', 60], ['reinforced_bow', 12], ['knight_boots', 3]), { minFloor: 6, maxFloor: 15, shape: 'archer' }),
    dungeon_knight: mob('dungeon_knight', 'Dungeon Knight', 'Intermediate', '🛡️', '#7797a6', 150, 16, 18, 36, 'Melee', 'Occasionally blocks', 'Floors 6–15', drops(['iron_sword', 25], ['iron_chestplate', 15], ['knight_leggings', 8], ['knight_chestplate', 2], ['knight_sword', 3]), { minFloor: 6, maxFloor: 15, shape: 'knight' }),
    poison_spider: mob('poison_spider', 'Poison Spider', 'Intermediate', '🕷️', '#765aa5', 75, 10, 3, 88, 'Melee', 'Inflicts poison', 'Floors 6–15', drops(['venom_sac', 65], ['spider_silk', 40], ['poison_dagger', 10], ['venom_blade', 2]), { minFloor: 6, maxFloor: 15, shape: 'spider' }),
    dark_mage: mob('dark_mage', 'Dark Mage', 'Intermediate', '🧙', '#7569bf', 80, 18, 5, 38, 'Ranged', 'Casts dark magic', 'Floors 6–15', drops(['magic_essence', 65], ['mage_staff', 15], ['shadow_helmet', 5], ['dark_staff', 1]), { minFloor: 6, maxFloor: 15, shape: 'mage' }),

    shadow_assassin: mob('shadow_assassin', 'Shadow Assassin', 'Advanced', '🥷', '#566287', 180, 25, 8, 105, 'Dash', 'Dashes rapidly', 'Floors 16–30', drops(['shadow_fragment', 65], ['assassin_dagger', 15], ['shadow_boots', 8], ['shadow_chestplate', 3]), { minFloor: 16, maxFloor: 30, shape: 'assassin' }),
    fire_elemental: mob('fire_elemental', 'Fire Elemental', 'Advanced', '🔥', '#dc8059', 220, 22, 9, 46, 'Ranged', 'Fireballs and burning', 'Floors 16–30', drops(['fire_essence', 70], ['flame_sword', 12], ['fire_crystal', 8], ['dragon_helmet', 1]), { minFloor: 16, maxFloor: 30, shape: 'fire' }),
    stone_golem: mob('stone_golem', 'Stone Golem', 'Advanced', '🗿', '#938878', 400, 30, 24, 25, 'Melee', 'Heavy attacks', 'Floors 16–30', drops(['stone_core', 70], ['reinforced_chestplate', 12], ['golem_hammer', 8], ['dragon_leggings', 1]), { minFloor: 16, maxFloor: 30, shape: 'golem' }),
    necromancer: mob('necromancer', 'Necromancer', 'Advanced', '☠️', '#8b69aa', 200, 20, 10, 34, 'Ranged', 'Summons undead', 'Floors 16–30', drops(['cursed_bone', 65], ['necromancer_staff', 15], ['shadow_leggings', 7], ['soul_staff', 2]), { minFloor: 16, maxFloor: 30, shape: 'necromancer' }),
    cursed_knight: mob('cursed_knight', 'Cursed Knight', 'Advanced', '⚔️', '#61708b', 350, 35, 28, 32, 'Melee', 'Blocks and strikes hard', 'Floors 16–30', drops(['cursed_metal', 65], ['cursed_sword', 15], ['shadow_chestplate', 8], ['dragon_chestplate', 1]), { minFloor: 16, maxFloor: 30, shape: 'cursed' }),

    void_stalker: mob('void_stalker', 'Void Stalker', 'Elite', '👁️', '#665da5', 500, 45, 22, 92, 'Teleport', 'Short-range teleportation', 'Floors 31–50', drops(['void_fragment', 70], ['void_dagger', 12], ['void_boots', 3], ['void_helmet', .5]), { minFloor: 31, maxFloor: 50, shape: 'void' }),
    dragon_guardian: mob('dragon_guardian', 'Dragon Guardian', 'Elite', '🐲', '#c76d65', 800, 55, 35, 38, 'Ranged', 'Fire attacks and heavy melee', 'Floors 31–50', drops(['dragon_scale', 75], ['dragon_sword', 12], ['dragon_chestplate', 5], ['dragon_leggings', 3], ['dragon_boots', 2]), { minFloor: 31, maxFloor: 50, shape: 'dragon' }),
    abyssal_reaper: mob('abyssal_reaper', 'Abyssal Reaper', 'Elite', '🌙', '#755f94', 650, 65, 30, 44, 'Sweep', 'Large sweeping attacks', 'Floors 31–50', drops(['abyss_fragment', 70], ['reaper_scythe', 10], ['void_leggings', 2], ['void_chestplate', .5]), { minFloor: 31, maxFloor: 50, shape: 'reaper' }),

    cave_spider_queen: mob('cave_spider_queen', 'Cave Spider Queen', 'Boss', '🕷️', '#b94c62', 500, 20, 10, 92, 'Melee', 'Bites, spits poison, and summons cave spiders', 'Floor 10', drops(['spider_queen_fang', 100], ['web_silk', 100], ['venom_blade', 12], ['shadow_boots', 4]), { minFloor: 10, maxFloor: 10, shape: 'spider_boss', portrait: 'assets/mobs/cave_spider.png' }),
    skeleton_king: mob('skeleton_king', 'Skeleton King', 'Boss', '👑', '#d0a45d', 1200, 35, 30, 30, 'Melee', 'Swings a sword, slams the ground, and summons skeletons', 'Floor 20', drops(['kings_bone', 100], ['skeleton_crown', 20], ['skeleton_kings_sword', 25], ['knight_chestplate', 20], ['shadow_armor_piece', 10]), { minFloor: 20, maxFloor: 20, shape: 'boss' }),
    stone_golem_boss: mob('stone_golem_boss', 'Stone Golem', 'Boss', '🗿', '#938878', 2000, 50, 45, 20, 'Melee', 'Punches, shakes the chamber, and throws boulders', 'Floor 30', drops(['stone_core', 100], ['golem_hammer', 25], ['reinforced_chestplate', 20], ['dragon_leggings', 5]), { minFloor: 30, maxFloor: 30, shape: 'golem_boss', portrait: 'assets/mobs/stone_golem.png' }),
    fire_dragon: mob('fire_dragon', 'Fire Dragon', 'Boss', '🐲', '#d85b45', 3000, 75, 40, 48, 'Melee', 'Claws, breathes fire, and leaves burning ground', 'Floor 40', drops(['dragon_scale', 100], ['dragon_sword', 20], ['dragon_chestplate', 15], ['dragon_leggings', 12], ['dragon_boots', 10], ['fire_crystal', 60]), { minFloor: 40, maxFloor: 40, shape: 'dragon_boss', portrait: 'assets/mobs/dragon_guardian.png' }),
    void_lord: mob('void_lord', 'Void Lord', 'Boss', '🌌', '#8a72d7', 5000, 100, 45, 50, 'Melee', 'Slashes, fires void orbs, teleports, and explodes', 'Floor 50', drops(['void_core', 100], ['void_sword', 20], ['void_armor_piece', 10], ['void_lords_scythe', 3], ['abyssal_crown', .5]), { minFloor: 50, maxFloor: 50, shape: 'boss' }),
  };

  const TIER_KEYS = {
    Beginner: ['zombie', 'skeleton', 'cave_spider', 'slime', 'goblin'],
    Intermediate: ['armored_zombie', 'skeleton_archer', 'dungeon_knight', 'poison_spider', 'dark_mage'],
    Advanced: ['shadow_assassin', 'fire_elemental', 'stone_golem', 'necromancer', 'cursed_knight'],
    Elite: ['void_stalker', 'dragon_guardian', 'abyssal_reaper'],
    Boss: ['cave_spider_queen', 'skeleton_king', 'stone_golem_boss', 'fire_dragon', 'void_lord'],
  };

  // Keep short fallback labels device-safe. Item illustrations are generated in script.js without external assets.
  const textIcon = (name) => name.replace(/[^A-Za-z ]/g, '').split(/\s+/).filter(Boolean).map((word) => word[0]).join('').slice(0, 2).toUpperCase();
  Object.values(ITEMS).forEach((item) => { item.icon = textIcon(item.name); });
  Object.values(MOBS).forEach((mobEntry) => { mobEntry.icon = textIcon(mobEntry.name); });

  window.MOSSKEEP = { ITEMS, MOBS, TIER_KEYS, RARITIES };
})();
