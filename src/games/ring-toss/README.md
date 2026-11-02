# Ring Toss

Land rings on the necks of the bottles at the back of the booth.

## How to play

- Move the mouse to aim. The aim sways left and right of the pointer, so time
  your throw.
- Click to toss a ring. It lands where the aim was when you clicked. You can
  only throw one ring at a time.
- You have 8 rings. The round ends when the last ring has landed.
- Click again on the game over screen to play another round.

## Scoring

A ring scores when it lands within 12 px of the centre of a bottle's neck.
Bottles further back score more:

| Row    | Points |
| ------ | ------ |
| Back   | 30     |
| Middle | 20     |
| Front  | 10     |

A ring that misses every neck scores nothing. Your final score is saved to the
carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `toss`, `step`, `aimPoint`,
  `bottleAt`) and the `ringToss` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
