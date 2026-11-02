---
name: review-carnival-house-rules
description: Review a change to a carnival game for the house rules in AGENTS.md on registering on the midway, reporting scores through the shared scores module, and drawing with the carnival's theme. Use as one lens in a code review run on changes under src/games/.
---

# Review lens: Carnival House Rules

Review changed games under `src/games/` against house rules 1 to 3 in `AGENTS.md`, for what each break costs the player or the next person to work on the game.

## Scope

- **Registration** Whether each game lives in `src/games/<game-id>/`, has its `CarnivalGame` as the default export of `game.ts`, and uses an `id` that matches its folder name.
- **Scores** Whether a round's score reaches the shared scores module: `recordScore(game.id, score)` imported from `src/carnival`, called once when a round ends, with no local storage access and no high score table of the game's own.
- **Theme** Whether colours, fonts and sizes in a game come from `theme` and `canvasFont` in `src/carnival/theme.ts`, rather than hex colours, colour names or font strings written into the game.

## Method

Read house rules 1 to 3 in the root `AGENTS.md` first, then read `src/games/index.ts` to see how the midway finds games, and `src/carnival/index.ts` to see what the shared base exports.

For each changed `game.ts`, find its default export and compare the game's `id` with its folder name. Follow each path that ends a round, including a timer running out, a miss that ends the game, and leaving early, to the point where the score is recorded, and count how many times a single round can reach `recordScore`.

For each value assigned to `fillStyle`, `strokeStyle`, `font`, or a size used for drawing, trace it back to where it is defined. A value computed from `theme` or `canvasFont`, such as a size scaled from `theme.canvas`, comes from the theme.

## Threshold

Report a break of house rules 1 to 3 in a game under `src/games/`, with its real consequence:

- A `game.ts` with no default export, or a game whose `id` differs from its folder name, makes `src/games/index.ts` throw when the midway loads, so the midway shows no booths at all and `src/games/index.test.ts` fails. The `id` rule exists so a game's folder, its route and its scores share one name.
- A round that never calls `recordScore` leaves the game off the booth card's scores. A round that calls it more than once records duplicate scores. A game that reads or writes local storage itself, or keeps its own table, shows scores that disagree with the midway's.
- A hex colour or font string in a game does not break anything for the player today, but the game no longer follows the carnival's palette when the theme changes.

Do not report code outside `src/games/`: `src/carnival/` defines the theme and the scores module, and `src/midway/palette.ts` has its own scenery colours built on the theme.

Do not report values derived from the theme, test data in `game.test.ts`, or anything lint, the type-checker or the tests already enforce. House rules 4 to 7 belong to other reviews, and general code quality belongs to the maintainability lens.

## Reporting

- Name the house rule, the file and the line, and the consequence above that applies.
- For a score problem, name the path through the round that records the score twice or not at all.
- For a theme problem, name the `theme` entry or `canvasFont` call to use instead, or say that `theme.ts` has no matching entry and needs its own change, since changes to `src/carnival/` are their own change.
