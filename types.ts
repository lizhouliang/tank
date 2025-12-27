
export enum TileType {
  EMPTY = 0,
  BRICK = 1,
  STEEL = 2,
  WATER = 3,
  BUSH = 4,
  BASE = 9
}

export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT'
}

export interface Point {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  direction: Direction;
  speed: number;
  health: number;
}

export interface Bullet extends Entity {
  ownerId: string;
}

export interface Tank extends Entity {
  lastShotTime: number;
  isPlayer: boolean;
  score: number;
}

export interface Mission {
  name: string;
  description: string;
  grid: TileType[][];
  enemyCount: number;
}

export interface GameState {
  player: Tank;
  enemies: Tank[];
  bullets: Bullet[];
  map: TileType[][];
  isGameOver: boolean;
  isVictory: boolean;
  level: number;
  score: number;
  status: 'START' | 'PLAYING' | 'LOADING' | 'GAMEOVER' | 'VICTORY';
  mission?: Mission;
}
