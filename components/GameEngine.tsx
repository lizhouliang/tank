
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  GameState, Tank, Bullet, Direction, TileType, Mission 
} from '../types';
import { 
  CANVAS_SIZE, TILE_SIZE, GRID_SIZE, TANK_SIZE, BULLET_SIZE, 
  BULLET_SPEED, PLAYER_SPEED, ENEMY_SPEED, SHOT_COOLDOWN, COLORS 
} from '../constants';

interface GameEngineProps {
  mission: Mission;
  onGameOver: (score: number) => void;
  onVictory: (score: number) => void;
}

const GameEngine: React.FC<GameEngineProps> = ({ mission, onGameOver, onVictory }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const [gameState, setGameState] = useState<GameState>(() => ({
    player: {
      id: 'player',
      x: 4 * TILE_SIZE + (TILE_SIZE - TANK_SIZE) / 2,
      y: 12 * TILE_SIZE + (TILE_SIZE - TANK_SIZE) / 2,
      width: TANK_SIZE,
      height: TANK_SIZE,
      direction: Direction.UP,
      speed: PLAYER_SPEED,
      health: 3,
      lastShotTime: 0,
      isPlayer: true,
      score: 0
    },
    enemies: [],
    bullets: [],
    map: mission.grid.map(row => [...row]),
    isGameOver: false,
    isVictory: false,
    level: 1,
    score: 0,
    status: 'PLAYING'
  }));

  const keys = useRef<Set<string>>(new Set());
  const spawnedCount = useRef(0);
  const lastEnemySpawn = useRef(0);

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => keys.current.add(e.code);
    const handleKeyUp = (e: KeyboardEvent) => keys.current.delete(e.code);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const checkCollision = (x: number, y: number, w: number, h: number, map: TileType[][], excludeEntityId?: string, tanks?: Tank[]) => {
    // Canvas bounds
    if (x < 0 || y < 0 || x + w > CANVAS_SIZE || y + h > CANVAS_SIZE) return true;

    // Map tiles
    const leftTile = Math.floor(x / TILE_SIZE);
    const rightTile = Math.floor((x + w - 1) / TILE_SIZE);
    const topTile = Math.floor(y / TILE_SIZE);
    const bottomTile = Math.floor((y + h - 1) / TILE_SIZE);

    for (let r = topTile; r <= bottomTile; r++) {
      for (let c = leftTile; c <= rightTile; c++) {
        const tile = map[r][c];
        if (tile === TileType.BRICK || tile === TileType.STEEL || tile === TileType.WATER || tile === TileType.BASE) {
          return true;
        }
      }
    }

    // Other tanks
    if (tanks) {
      for (const tank of tanks) {
        if (tank.id === excludeEntityId) continue;
        if (x < tank.x + tank.width && x + w > tank.x && y < tank.y + tank.height && y + h > tank.y) {
          return true;
        }
      }
    }

    return false;
  };

  const shoot = (tank: Tank, setBullets: React.Dispatch<React.SetStateAction<Bullet[]>>) => {
    const now = Date.now();
    if (now - tank.lastShotTime < SHOT_COOLDOWN) return;
    
    tank.lastShotTime = now;
    const bullet: Bullet = {
      id: Math.random().toString(),
      ownerId: tank.id,
      x: tank.x + tank.width / 2 - BULLET_SIZE / 2,
      y: tank.y + tank.height / 2 - BULLET_SIZE / 2,
      width: BULLET_SIZE,
      height: BULLET_SIZE,
      direction: tank.direction,
      speed: BULLET_SPEED,
      health: 1
    };

    setBullets(prev => [...prev, bullet]);
  };

  const spawnEnemy = useCallback(() => {
    if (spawnedCount.current >= mission.enemyCount) return;
    
    const spawnPoints = [
      { x: 0 * TILE_SIZE + 2, y: 0 * TILE_SIZE + 2 },
      { x: 6 * TILE_SIZE + 2, y: 0 * TILE_SIZE + 2 },
      { x: 12 * TILE_SIZE + 2, y: 0 * TILE_SIZE + 2 },
    ];
    
    const point = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
    
    const newEnemy: Tank = {
      id: `enemy-${spawnedCount.current}`,
      x: point.x,
      y: point.y,
      width: TANK_SIZE,
      height: TANK_SIZE,
      direction: Direction.DOWN,
      speed: ENEMY_SPEED,
      health: 1,
      lastShotTime: 0,
      isPlayer: false,
      score: 0
    };

    setGameState(prev => ({
      ...prev,
      enemies: [...prev.enemies, newEnemy]
    }));
    spawnedCount.current++;
    lastEnemySpawn.current = Date.now();
  }, [mission.enemyCount]);

  const update = useCallback(() => {
    setGameState(prev => {
      if (prev.status !== 'PLAYING') return prev;

      let { player, enemies, bullets, map, score } = prev;
      let newStatus = prev.status;

      // 1. Move Player
      let nextX = player.x;
      let nextY = player.y;
      let nextDir = player.direction;

      if (keys.current.has('ArrowUp') || keys.current.has('KeyW')) {
        nextY -= player.speed;
        nextDir = Direction.UP;
      } else if (keys.current.has('ArrowDown') || keys.current.has('KeyS')) {
        nextY += player.speed;
        nextDir = Direction.DOWN;
      } else if (keys.current.has('ArrowLeft') || keys.current.has('KeyA')) {
        nextX -= player.speed;
        nextDir = Direction.LEFT;
      } else if (keys.current.has('ArrowRight') || keys.current.has('KeyD')) {
        nextX += player.speed;
        nextDir = Direction.RIGHT;
      }

      if (!checkCollision(nextX, nextY, player.width, player.height, map, player.id, enemies)) {
        player = { ...player, x: nextX, y: nextY, direction: nextDir };
      } else {
        player = { ...player, direction: nextDir };
      }

      if (keys.current.has('Space')) {
        shoot(player, (newBullets) => { /* dummy */ });
        // We handle bullet creation inside the state update to be pure, but 'shoot' needs to modify state
      }

      // 2. Move Enemies
      enemies = enemies.map(enemy => {
        let eX = enemy.x;
        let eY = enemy.y;
        let eDir = enemy.direction;

        // Simple AI
        if (Math.random() < 0.02) {
          const dirs = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];
          eDir = dirs[Math.floor(Math.random() * dirs.length)];
        }

        if (eDir === Direction.UP) eY -= enemy.speed;
        else if (eDir === Direction.DOWN) eY += enemy.speed;
        else if (eDir === Direction.LEFT) eX -= enemy.speed;
        else if (eDir === Direction.RIGHT) eX += enemy.speed;

        if (checkCollision(eX, eY, enemy.width, enemy.height, map, enemy.id, [player, ...enemies])) {
          // Change direction if hit wall
          const dirs = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];
          return { ...enemy, direction: dirs[Math.floor(Math.random() * dirs.length)] };
        }

        // Random shooting
        if (Math.random() < 0.01) {
           // shoot logic is separate
        }

        return { ...enemy, x: eX, y: eY, direction: eDir };
      });

      // 3. Move Bullets & Check Collisions
      const nextBullets: Bullet[] = [];
      const destroyedTiles: {r: number, c: number}[] = [];
      let baseDestroyed = false;

      bullets.forEach(b => {
        let bx = b.x;
        let by = b.y;

        if (b.direction === Direction.UP) by -= b.speed;
        else if (b.direction === Direction.DOWN) by += b.speed;
        else if (b.direction === Direction.LEFT) bx -= b.speed;
        else if (b.direction === Direction.RIGHT) bx += b.speed;

        // Bounds
        if (bx < 0 || by < 0 || bx > CANVAS_SIZE || by > CANVAS_SIZE) return;

        // Tiles
        const r = Math.floor(by / TILE_SIZE);
        const c = Math.floor(bx / TILE_SIZE);
        if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
          const tile = map[r][c];
          if (tile === TileType.BRICK) {
            destroyedTiles.push({r, c});
            return;
          }
          if (tile === TileType.STEEL) return;
          if (tile === TileType.BASE) {
            baseDestroyed = true;
            return;
          }
        }

        // Tanks
        let hit = false;
        if (b.ownerId === 'player') {
          enemies = enemies.filter(e => {
            if (bx >= e.x && bx <= e.x + e.width && by >= e.y && by <= e.y + e.height) {
              hit = true;
              score += 100;
              return false;
            }
            return true;
          });
        } else {
          if (bx >= player.x && bx <= player.x + player.width && by >= player.y && by <= player.y + player.height) {
            hit = true;
            player.health -= 1;
            if (player.health <= 0) newStatus = 'GAMEOVER';
          }
        }

        if (!hit) nextBullets.push({ ...b, x: bx, y: by });
      });

      // Apply changes
      if (destroyedTiles.length > 0) {
        map = map.map(row => [...row]);
        destroyedTiles.forEach(({r, c}) => map[r][c] = TileType.EMPTY);
      }

      if (baseDestroyed) newStatus = 'GAMEOVER';
      if (enemies.length === 0 && spawnedCount.current >= mission.enemyCount) newStatus = 'VICTORY';

      return {
        ...prev,
        player,
        enemies,
        bullets: nextBullets,
        map,
        score,
        status: newStatus
      };
    });

    // We can't easily put "shoot" inside the functional state update because it adds to a list
    // Handle space key firing outside the setGameState for simplicity
    if (keys.current.has('Space')) {
      setGameState(prev => {
        const now = Date.now();
        if (now - prev.player.lastShotTime < SHOT_COOLDOWN) return prev;
        const b: Bullet = {
          id: Math.random().toString(),
          ownerId: 'player',
          x: prev.player.x + prev.player.width/2 - BULLET_SIZE/2,
          y: prev.player.y + prev.player.height/2 - BULLET_SIZE/2,
          width: BULLET_SIZE,
          height: BULLET_SIZE,
          direction: prev.player.direction,
          speed: BULLET_SPEED,
          health: 1
        };
        return {
          ...prev,
          player: { ...prev.player, lastShotTime: now },
          bullets: [...prev.bullets, b]
        };
      });
    }

    // Enemy auto-shoot
    setGameState(prev => {
      const now = Date.now();
      const newBullets: Bullet[] = [];
      const updatedEnemies = prev.enemies.map(e => {
        if (now - e.lastShotTime > 1500 && Math.random() < 0.05) {
          newBullets.push({
            id: Math.random().toString(),
            ownerId: e.id,
            x: e.x + e.width/2 - BULLET_SIZE/2,
            y: e.y + e.height/2 - BULLET_SIZE/2,
            width: BULLET_SIZE,
            height: BULLET_SIZE,
            direction: e.direction,
            speed: BULLET_SPEED,
            health: 1
          });
          return { ...e, lastShotTime: now };
        }
        return e;
      });
      return {
        ...prev,
        enemies: updatedEnemies,
        bullets: [...prev.bullets, ...newBullets]
      };
    });

    // Enemy Spawning
    if (Date.now() - lastEnemySpawn.current > 3000) {
      spawnEnemy();
    }

    requestRef.current = requestAnimationFrame(update);
  }, [spawnEnemy, mission.enemyCount]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [update]);

  // Handle game end events
  useEffect(() => {
    if (gameState.status === 'GAMEOVER') {
      onGameOver(gameState.score);
    } else if (gameState.status === 'VICTORY') {
      onVictory(gameState.score);
    }
  }, [gameState.status, gameState.score, onGameOver, onVictory]);

  // Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = COLORS.BG;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw Map
    gameState.map.forEach((row, r) => {
      row.forEach((tile, c) => {
        const x = c * TILE_SIZE;
        const y = r * TILE_SIZE;
        if (tile === TileType.BRICK) {
          ctx.fillStyle = COLORS.BRICK;
          ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
          ctx.strokeStyle = '#000';
          ctx.strokeRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8);
        } else if (tile === TileType.STEEL) {
          ctx.fillStyle = COLORS.STEEL;
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = '#fff';
          ctx.strokeRect(x + 5, y + 5, TILE_SIZE - 10, TILE_SIZE - 10);
        } else if (tile === TileType.WATER) {
          ctx.fillStyle = COLORS.WATER;
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        } else if (tile === TileType.BUSH) {
          // Drawn later for overlap
        } else if (tile === TileType.BASE) {
          ctx.fillStyle = COLORS.BASE;
          ctx.beginPath();
          ctx.moveTo(x + TILE_SIZE/2, y + 5);
          ctx.lineTo(x + TILE_SIZE - 5, y + TILE_SIZE - 5);
          ctx.lineTo(x + 5, y + TILE_SIZE - 5);
          ctx.closePath();
          ctx.fill();
        }
      });
    });

    // Draw Tanks
    const drawTank = (tank: Tank, color: string) => {
      ctx.save();
      ctx.translate(tank.x + tank.width / 2, tank.y + tank.height / 2);
      if (tank.direction === Direction.DOWN) ctx.rotate(Math.PI);
      else if (tank.direction === Direction.LEFT) ctx.rotate(-Math.PI / 2);
      else if (tank.direction === Direction.RIGHT) ctx.rotate(Math.PI / 2);

      ctx.fillStyle = color;
      ctx.fillRect(-tank.width / 2, -tank.height / 2, tank.width, tank.height);
      // Cannon
      ctx.fillStyle = '#fff';
      ctx.fillRect(-2, -tank.height / 2 - 5, 4, 15);
      // Details
      ctx.strokeStyle = '#000';
      ctx.strokeRect(-tank.width/2 + 2, -tank.height/2 + 2, tank.width - 4, tank.height - 4);
      ctx.restore();
    };

    drawTank(gameState.player, COLORS.PLAYER);
    gameState.enemies.forEach(e => drawTank(e, COLORS.ENEMY));

    // Draw Bullets
    ctx.fillStyle = COLORS.BULLET;
    gameState.bullets.forEach(b => {
      ctx.beginPath();
      ctx.arc(b.x + b.width / 2, b.y + b.height / 2, b.width / 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Bushes (Top layer)
    gameState.map.forEach((row, r) => {
      row.forEach((tile, c) => {
        if (tile === TileType.BUSH) {
          ctx.fillStyle = COLORS.BUSH;
          ctx.globalAlpha = 0.7;
          ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          ctx.globalAlpha = 1.0;
        }
      });
    });

  }, [gameState]);

  return (
    <div className="flex flex-col items-center">
      <div className="mb-4 flex justify-between w-full max-w-[520px] text-sm md:text-base">
        <div>LEVEL: {gameState.level}</div>
        <div>SCORE: {gameState.score}</div>
        <div>HP: {gameState.player.health}</div>
      </div>
      <div className="relative scanlines retro-border">
        <canvas 
          ref={canvasRef} 
          width={CANVAS_SIZE} 
          height={CANVAS_SIZE}
          className="bg-black"
        />
      </div>
      <div className="mt-4 text-xs text-gray-400 text-center">
        WASD/ARROWS to move | SPACE to fire
      </div>
    </div>
  );
};

export default GameEngine;
