# Whack-a-Mole

Whack the moles as they pop up from the nine holes, before they duck back down.

## How to play

- Moles pop up from a 3 by 3 grid of holes, stay up for a moment, then drop back down.
- Click a mole while it's up to whack it.
- The round lasts 30 seconds. As the clock runs down, moles pop up more often and
  stay up for less time: one every 1.1 seconds for 1.4 seconds at the start, down
  to one every 0.4 seconds for 0.6 seconds at the end.
- Click again on the game over screen to play another round.

## Scoring

Each mole you whack scores 10 points. Clicking an empty hole costs nothing.

Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `popUp`, `whack`, `step`, `popInterval`,
  `upTime`) and the `whackAMole` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
