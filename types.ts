
export type Point = {
  x: number;
  y: number;
};

export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
}

export type GameStatus = 'START' | 'PLAYING' | 'EXPLODING_10' | 'EXPLODING_20' | 'GAME_OVER';

export interface GameState {
  snake: Point[];
  food: Point;
  direction: Direction;
  score: number;
  status: GameStatus;
  colors: string[];
  isPucciActive: boolean;
}
