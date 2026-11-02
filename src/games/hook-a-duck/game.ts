import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const CASTS = 8;
/** The stream is an oval loop the ducks float round. */
export const STREAM = { x: WIDTH / 2, y: 280, rx: 300, ry: 140, width: 70 } as const;
/** Radians per second; every duck floats round at the same pace. */
export const DUCK_SPEED = 0.5;
export const DUCK_RADIUS = 18;
/** How close the hook has to land to a duck to catch it. */
export const CATCH_RADIUS = 30;
/** Seconds the hook takes to go down, and again to come back up. */
export const LOWER_TIME = 0.35;
/** The numbers on the ducks' bases, one per duck. */
export const DUCK_VALUES = [5, 5, 5, 5, 10, 10, 10, 20, 20, 50] as const;
const ROD_Y = 40;

export interface Duck {
  /** Where the duck is round the loop, in radians. */
  angle: number;
  /** The number on its base: what it scores. */
  value: number;
}

export interface Hook {
  x: number;
  y: number;
  /** 0 is up at the rod, 1 is down in the water. */
  depth: number;
  direction: 'down' | 'up';
  /** The number on the duck it caught, once it has caught one. */
  caught?: number;
}

export interface Catch {
  x: number;
  y: number;
  value: number;
  age: number;
}

export interface HookADuckState {
  ducks: Duck[];
  hook: Hook | null;
  catches: Catch[];
  casts: number;
  score: number;
  phase: 'playing' | 'over';
}

/** Sets the ducks out evenly round the loop, with their numbers shuffled. */
export function createState(random: () => number = Math.random): HookADuckState {
  const values: number[] = [...DUCK_VALUES];
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  const ducks = values.map((value, i) => ({ angle: (Math.PI * 2 * i) / values.length, value }));
  return { ducks, hook: null, catches: [], casts: CASTS, score: 0, phase: 'playing' };
}

export function duckPosition(duck: Duck): { x: number; y: number } {
  return {
    x: STREAM.x + STREAM.rx * Math.cos(duck.angle),
    y: STREAM.y + STREAM.ry * Math.sin(duck.angle),
  };
}

/** The duck under the point, if one is within reach of the hook. */
export function duckAt(ducks: readonly Duck[], x: number, y: number): Duck | undefined {
  let nearest: Duck | undefined;
  let nearestDistance: number = CATCH_RADIUS;
  for (const duck of ducks) {
    const position = duckPosition(duck);
    const distance = Math.hypot(position.x - x, position.y - y);
    if (distance <= nearestDistance) {
      nearest = duck;
      nearestDistance = distance;
    }
  }
  return nearest;
}

/** Lowers the hook at the point. Returns false if the hook can't be cast. */
export function cast(state: HookADuckState, x: number, y: number): boolean {
  if (state.phase !== 'playing' || state.hook || state.casts === 0) return false;
  state.hook = { x, y: Math.max(y, ROD_Y), depth: 0, direction: 'down' };
  state.casts -= 1;
  return true;
}

/** Advances the game by `dt` seconds. */
export function step(state: HookADuckState, dt: number): void {
  for (const duck of state.ducks) {
    duck.angle = (duck.angle + DUCK_SPEED * dt) % (Math.PI * 2);
  }

  const hook = state.hook;
  if (hook) {
    if (hook.direction === 'down') {
      hook.depth = Math.min(hook.depth + dt / LOWER_TIME, 1);
      if (hook.depth === 1) {
        const duck = duckAt(state.ducks, hook.x, hook.y);
        if (duck) {
          hook.caught = duck.value;
          state.score += duck.value;
          state.catches.push({ x: hook.x, y: hook.y, value: duck.value, age: 0 });
        }
        hook.direction = 'up';
      }
    } else {
      hook.depth = Math.max(hook.depth - dt / LOWER_TIME, 0);
      if (hook.depth === 0) state.hook = null;
    }
  }

  for (const caught of state.catches) caught.age += dt;
  state.catches = state.catches.filter((c) => c.age < 1);

  if (state.casts === 0 && !state.hook) state.phase = 'over';
}

function drawDuck(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const { colors } = theme;
  ctx.fillStyle = colors.accent;
  ctx.beginPath();
  ctx.ellipse(x, y, DUCK_RADIUS, DUCK_RADIUS * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + DUCK_RADIUS * 0.6, y - DUCK_RADIUS * 0.7, DUCK_RADIUS * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.stripeA;
  ctx.beginPath();
  ctx.moveTo(x + DUCK_RADIUS * 1.05, y - DUCK_RADIUS * 0.8);
  ctx.lineTo(x + DUCK_RADIUS * 1.5, y - DUCK_RADIUS * 0.65);
  ctx.lineTo(x + DUCK_RADIUS * 1.05, y - DUCK_RADIUS * 0.5);
  ctx.fill();
  ctx.fillStyle = colors.background;
  ctx.beginPath();
  ctx.arc(x + DUCK_RADIUS * 0.75, y - DUCK_RADIUS * 0.8, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

function draw(ctx: CanvasRenderingContext2D, state: HookADuckState, aim: { x: number; y: number }) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, ROD_Y);
  }

  // The stream: a loop of water with a wooden rim either side.
  ctx.beginPath();
  ctx.ellipse(STREAM.x, STREAM.y, STREAM.rx, STREAM.ry, 0, 0, Math.PI * 2);
  ctx.strokeStyle = colors.wood;
  ctx.lineWidth = STREAM.width + 12;
  ctx.stroke();
  ctx.strokeStyle = colors.water;
  ctx.lineWidth = STREAM.width;
  ctx.stroke();

  // Ducks further back are drawn first.
  const ducks = [...state.ducks].sort((a, b) => duckPosition(a).y - duckPosition(b).y);
  for (const duck of ducks) {
    const { x, y } = duckPosition(duck);
    drawDuck(ctx, x, y);
  }

  // The rod and its line, over where the hook is going, or over the aim.
  const hook = state.hook;
  const rodX = hook ? hook.x : aim.x;
  const targetY = hook ? hook.y : Math.max(aim.y, ROD_Y);
  ctx.fillStyle = colors.wood;
  ctx.fillRect(rodX - 30, ROD_Y - 6, 60, 10);
  const hookY = hook ? ROD_Y + (targetY - ROD_Y) * hook.depth : ROD_Y + 20;
  ctx.strokeStyle = colors.text;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(rodX, ROD_Y + 4);
  ctx.lineTo(rodX, hookY);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(rodX, hookY + 6, 6, 0, Math.PI);
  ctx.stroke();
  if (!hook && state.phase === 'playing') {
    ctx.strokeStyle = colors.muted;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(aim.x, aim.y, CATCH_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.textAlign = 'center';
  ctx.font = canvasFont('title', 'bold');
  for (const caught of state.catches) {
    ctx.globalAlpha = 1 - caught.age;
    ctx.fillStyle = colors.accent;
    ctx.fillText(`+${caught.value}`, caught.x, caught.y - 40 - caught.age * 40);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Casts ${state.casts}/${CASTS}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Out of casts! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const hookADuck: CarnivalGame = {
  id: 'hook-a-duck',
  name: 'Hook a Duck',
  description: 'Hook the rubber ducks as they float by. The number on each base is its score.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    const aim = { x: WIDTH / 2, y: STREAM.y + STREAM.ry };

    const toCanvas = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
      };
    };
    const onMove = (event: PointerEvent) => Object.assign(aim, toCanvas(event));
    const onDown = (event: PointerEvent) => {
      Object.assign(aim, toCanvas(event));
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
      } else {
        cast(state, aim.x, aim.y);
      }
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't teleport everything.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(hookADuck.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state, aim);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default hookADuck;
