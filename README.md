# MoeGPT · Starfire Circuit

**[Play Starfire Circuit in your browser](https://kaze-neural.github.io/moegpt-survivors-demo/)**

Starfire Circuit is a single-player, top-down survival game prototype featuring the five heroines from MoeGPT AI Girls. Dodge enemy waves, collect chips, and spend them between waves to upgrade your weapons and modules. The game runs on desktop and mobile with plain HTML, CSS, and JavaScript.

## Local Setup

Clone or download the repository and open `index.html` in a desktop browser. To serve the game locally, run this command from the repository root and open [localhost:8765](http://localhost:8765/).

```sh
python -m http.server 8765 --bind 127.0.0.1
```

For mobile testing on the same Wi-Fi network, change the bind address to `0.0.0.0` and open your computer’s local IP address on port `8765` from your phone.

## Controls

| Action | Desktop | Mobile |
| --- | --- | --- |
| Move | WASD or arrow keys | Drag on the lower half of the screen |
| Use ultimate | Q | Tap the skill button in the lower left |
| Pause | Esc | Tap the pause button in the upper right |

The title screen lets you switch between English, Simplified Chinese, and Japanese. English is the default.

## Features and Status

| Character | Primary weapon | Ultimate |
| --- | --- | --- |
| ChatGPT | Triple Dragon Breath | Silver Dragon Echo |
| Claude | Returning Pages | Final Chapter |
| DeepSeek | Sonar Orb | Whalecrest Tide |
| Gemini | Twin Stars | Twin Constellation |
| Grok | Crescent Axe | Mooncleaver |

- Broken Relay, Shattered Gallery, and Astral Rift have 10, 15, and 20 waves, with a boss every five waves.
- Start each run with one free secondary weapon and one free module. Buy upgrades and evolve max-rank secondary weapons at shops between waves.
- Each character has a signature module. Regular batteries restore 20% of max HP, and boss batteries restore 50%.
- The pause and results screens show actual damage by weapon and skill. The demo includes test speeds and a test revive.

## Project Layout

```text
index.html  Title screen, combat HUD, and shops
style.css   Desktop and mobile layouts
game.js     Canvas rendering, combat, loot, shops, and input
i18n.js     Interface translations and language preference
art/        Portraits, animations, arenas, enemies, and pickups
```

## Deployment

The live demo is served by GitHub Pages from the root of `main`. Run it directly from the repository files. Set `showTestTools` to `false` in `game.js` to disable test speeds and the test revive.

This is an unofficial fan project.
