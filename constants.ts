
export const GRID_SIZE = 20;
export const INITIAL_SPEED = 150;
export const EXPLOSION_DURATION = 3000;

export const DIRECTIONS: Record<string, { x: number; y: number }> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

export const INVERTED_CONTROLS: Record<string, string> = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
};
