# Mosskeep

Mosskeep is a static, mobile-first dungeon crawler built with plain HTML, CSS, and JavaScript.

## Run locally

Open `index.html` directly in a browser, or serve this folder with any static file server.

## Controls

- Use the virtual joystick, or `WASD` / arrow keys, to move.
- Tap `HIT`, or press `J` / Space, to attack.
- Tap `BURST`, or press `K`, to use the special ability.
- Press `E` to open the 36-slot inventory. Drag or double-click equipment to wear it; right-click items for details.
- Use `Controls` to drag the on-screen controls into a preferred one-handed layout.
- Open `Mobs` to inspect all 20 creatures and their exact independent drop chances.
- Open `Drops` to browse the item collection and unlock item details as loot is collected.

The game has 50 floors, with a different boss battle every tenth floor: Cave Spider Queen, Skeleton King, Stone Golem, Fire Dragon, and Void Lord. Each boss has its own health, damage, telegraphed specials, projectiles or hazards, summons where appropriate, phase changes, arena decorations, portrait, rewards, and large health HUD. Enemy stats scale deeper into regular floors, ranged mobs telegraph visible projectiles that can be dodged, armor changes player stats and damage reduction, loot drops on the ground, backpack entries show full item names beside illustrated vector art, and all 20 reference-sheet mob portraits are stored in `assets/mobs/` and used throughout the dungeon UI. Each run ends with a peak-moment recap, floor/defeat/loot highlights, and a personal-best message saved in local storage, with a one-tap retry. Inventory/equipment/encyclopedia progress is also saved in local storage. It has no build step and can be deployed directly to GitHub Pages.
