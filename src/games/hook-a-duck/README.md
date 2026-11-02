# Hook a Duck

Rubber ducks float round a stream in a loop. Lower the hook to catch one as it
passes.

## How to play

- Move the mouse to aim the hook: the ring shows how close a duck has to be.
- Click to lower the hook into the water where you aimed. It takes a moment to
  reach the water, so aim a little ahead of the duck you want.
- You have 8 casts. The round ends when the last cast has come back up.
- Click again on the game over screen to play another round.

## Scoring

Each duck has a number on its base, and catching it scores that number. The ten
ducks carry these numbers, shuffled each round:

| Number | Ducks |
| ------ | ----- |
| 5      | 4     |
| 10     | 3     |
| 20     | 2     |
| 50     | 1     |

A cast that lands in empty water scores nothing. If two ducks are in reach, the
hook catches the nearer one. A caught duck stays on the stream, so you can catch
it again.

Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `cast`, `step`, `duckAt`,
  `duckPosition`) and the `hookADuck` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
