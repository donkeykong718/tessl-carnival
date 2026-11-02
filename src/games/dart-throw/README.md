# Dart Throw

Pop the balloons pinned to the board at the back of the booth.

## How to play

- Move the mouse to aim. The aim sways gently around the pointer, so time your
  throw.
- Click to throw a dart. It lands where the aim was when you clicked. You can
  only throw one dart at a time.
- You have 10 darts. The round ends when the last dart has landed, or when
  every balloon is popped.
- Click again on the game over screen to play another round.
- If you go back to the midway mid-round, the round ends there and the points
  you have scored so far are saved. Leaving before your first throw saves
  nothing.

## Scoring

The board holds 8 balloons in 2 rows of 4, fewer than your darts, so a good
round can clear it. A dart that lands within 35 px of the centre of a balloon pops it. A dart in the gap between balloons scores
nothing, and a popped balloon can't be hit again.

| Balloon | Points |
| ------- | ------ |
| Red     | 10     |
| Gold    | 30     |

There are 2 gold balloons. If you pop every balloon before your darts run out,
each dart left over scores a bonus 20. Your final score, bonus included, is
saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `throwDart`, `step`, `aimPoint`,
  `balloonAt`, `landDart`, `bonusFor`) and the `dartThrow` entry, the default
  export the midway finds.
- `game.test.ts`: tests for the game logic.
