# Lincoln Prototype

A stylish browser-based lane battle prototype inspired by real-time card arena games, built with HTML, CSS, and vanilla JavaScript.

## How to Play

- Open `index.html` in a browser.
- Press **Start Battle** to begin.
- Build elixir over time.
- Drag a card into the left or right lane, or use the quick deploy buttons.
- Units march toward enemy towers and attack automatically.
- Archers fire ranged projectiles from a distance.
- Defend your towers while destroying the enemy fortress before time runs out.

## UX Improvements Added

- Start screen with onboarding and controls
- Countdown before battle begins
- Pause and resume flow
- End-of-match results summary
- Better lane pressure feedback
- Tactical tips and toast notifications
- Keyboard support for faster play
- Session best-result tracking with local storage
- Improved mobile and accessibility behavior
- Clearer selected-card and lane recommendation feedback

## Controls

- Drag a card onto a glowing lane to deploy it.
- Or click the left/right deploy buttons on each card.
- Keyboard:
  - `1-4` select cards
  - `L` deploy selected card left
  - `R` deploy selected card right
  - `P` pause/resume
  - `M` mute/unmute
- Each card spends elixir based on its cost.
- Units automatically move and attack once deployed.
- Click **Restart Match** to begin a fresh round.
- Click **Sound: On/Off** to toggle audio.

## Features

- Clash Royale-inspired lane combat
- Elixir resource system
- Four playable unit cards
- Drag-and-drop card deployment
- Quick left/right lane deploy buttons
- Archer projectile attacks
- Enemy auto-spawning
- Tower health bars
- Match timer
- Win/lose game state
- Restart button
- Sound effects with toggle control
- Battle log for match events
- Neon cyber-fantasy arena styling
- Start, pause, and results overlays
- Keyboard and touch support
- Lane recommendation feedback
- Session best-result persistence

## Files

- `index.html` - game structure, overlays, HUD, and arena
- `styles.css` - arena visuals, overlays, animations, cards, and effects
- `app.js` - gameplay logic, combat, deployment, sounds, countdown, pause, results, and session stats

## Future Ideas

- More unit types and spells
- Smarter enemy AI
- Matchmaking difficulty levels
- Additional arenas and themes
- GitHub Pages deployment

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript

## Notes

This is a lightweight prototype inspired by lane-based real-time card battlers. It is not an official Clash Royale product.