
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Point, Direction, GameStatus, GameState } from './types';
import { GRID_SIZE, INITIAL_SPEED, DIRECTIONS, EXPLOSION_DURATION, INVERTED_CONTROLS } from './constants';
import Overlay from './components/Overlay';
import Controls from './components/Controls';
import { getMilestoneMessage } from './services/geminiService';

const getRandomPoint = (): Point => ({
  x: Math.floor(Math.random() * GRID_SIZE),
  y: Math.floor(Math.random() * GRID_SIZE),
});

const getRandomColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

const getGrayscale = (index: number) => {
  const v = Math.max(50, 255 - index * 10);
  return `rgb(${v}, ${v}, ${v})`;
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    snake: [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }],
    food: getRandomPoint(),
    direction: Direction.UP,
    score: 0,
    status: 'START',
    colors: ['#fff', '#fff', '#fff'],
    isPucciActive: false,
  });

  const [milestoneText, setMilestoneText] = useState('');
  const gameLoopRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const nextDirectionRef = useRef<Direction>(Direction.UP);

  const resetGame = () => {
    setGameState({
      snake: [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }],
      food: getRandomPoint(),
      direction: Direction.UP,
      score: 0,
      status: 'PLAYING',
      colors: ['#fff', '#fff', '#fff'],
      isPucciActive: false,
    });
    nextDirectionRef.current = Direction.UP;
  };

  const handleDirection = useCallback((dir: Direction) => {
    setGameState(prev => {
      let finalDir = dir;
      if (prev.isPucciActive) {
        finalDir = INVERTED_CONTROLS[dir] as Direction;
      }

      // Prevent 180 degree turns
      const currentDir = prev.direction;
      if (
        (finalDir === Direction.UP && currentDir === Direction.DOWN) ||
        (finalDir === Direction.DOWN && currentDir === Direction.UP) ||
        (finalDir === Direction.LEFT && currentDir === Direction.RIGHT) ||
        (finalDir === Direction.RIGHT && currentDir === Direction.LEFT)
      ) {
        return prev;
      }

      nextDirectionRef.current = finalDir;
      return prev;
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp': handleDirection(Direction.UP); break;
        case 'ArrowDown': handleDirection(Direction.DOWN); break;
        case 'ArrowLeft': handleDirection(Direction.LEFT); break;
        case 'ArrowRight': handleDirection(Direction.RIGHT); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDirection]);

  const moveSnake = useCallback(() => {
    setGameState(prev => {
      if (prev.status !== 'PLAYING') return prev;

      const newHead = {
        x: prev.snake[0].x + DIRECTIONS[nextDirectionRef.current].x,
        y: prev.snake[0].y + DIRECTIONS[nextDirectionRef.current].y,
      };

      // Collision Check: Walls or Self
      if (
        newHead.x < 0 || newHead.x >= GRID_SIZE || 
        newHead.y < 0 || newHead.y >= GRID_SIZE ||
        prev.snake.some(segment => segment.x === newHead.x && segment.y === newHead.y)
      ) {
        return { ...prev, status: 'GAME_OVER' };
      }

      const newSnake = [newHead, ...prev.snake];
      let newScore = prev.score;
      let newFood = prev.food;
      let newColors = [...prev.colors];
      let newStatus: GameStatus = 'PLAYING';
      let pucci = prev.isPucciActive;

      // Eating Food
      if (newHead.x === prev.food.x && newHead.y === prev.food.y) {
        newScore += 1;
        newFood = getRandomPoint();
        
        // Color logic
        if (newScore > 20) {
          newColors.unshift('#ff00ff'); // Pucci glitchy magenta
        } else if (newScore > 10) {
          newColors.unshift(getGrayscale(newScore)); // B&W phase
        } else {
          newColors.unshift(getRandomColor()); // Rainbow phase
        }

        // Milestone Level 10
        if (newScore === 10) {
          newStatus = 'EXPLODING_10';
        } 
        // Milestone Level 20
        else if (newScore === 20) {
          newStatus = 'EXPLODING_20';
        }
      } else {
        newSnake.pop();
      }

      return {
        ...prev,
        snake: newSnake,
        food: newFood,
        score: newScore,
        direction: nextDirectionRef.current,
        status: newStatus,
        colors: newColors,
        isPucciActive: pucci,
      };
    });
  }, []);

  // Level Up Animations
  useEffect(() => {
    if (gameState.status === 'EXPLODING_10' || gameState.status === 'EXPLODING_20') {
      const isLevel10 = gameState.status === 'EXPLODING_10';
      
      // Set the requested messages immediately
      const targetText = isLevel10 ? "niveau Kichta atteint" : "vous avez débloquer le niveau PUCCI";
      setMilestoneText(targetText);
      
      // Still call the service if we want to potentially fetch more dynamic content later,
      // but the UI will show targetText first.
      getMilestoneMessage(isLevel10 ? 10 : 20).then(msg => setMilestoneText(msg));

      setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          status: 'PLAYING',
          isPucciActive: isLevel10 ? false : true,
          // If level 10, start making snake B&W by resetting current colors to grey
          colors: isLevel10 ? prev.snake.map((_, i) => getGrayscale(i)) : prev.colors
        }));
      }, EXPLOSION_DURATION);
    }
  }, [gameState.status]);

  // Main Loop
  useEffect(() => {
    const frame = (time: number) => {
      if (time - lastUpdateRef.current > INITIAL_SPEED - Math.min(gameState.score * 2, 80)) {
        moveSnake();
        lastUpdateRef.current = time;
      }
      gameLoopRef.current = requestAnimationFrame(frame);
    };
    gameLoopRef.current = requestAnimationFrame(frame);
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [moveSnake, gameState.score]);

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4 select-none overflow-hidden">
      {/* Header */}
      <div className="mb-6 w-full max-w-md flex justify-between items-end">
        <div>
          <h2 className="pixel-font text-xs text-gray-500 mb-1">SCORE</h2>
          <p className="pixel-font text-2xl text-white">{gameState.score.toString().padStart(4, '0')}</p>
        </div>
        <div className="text-right">
          <h2 className="pixel-font text-xs text-gray-500 mb-1">MODE</h2>
          <p className={`pixel-font text-sm ${gameState.isPucciActive ? 'text-red-500 glitch' : gameState.score > 10 ? 'text-gray-300' : 'text-green-400'}`}>
            {gameState.isPucciActive ? 'PUCCI' : gameState.score > 10 ? 'NOIR & BLANC' : 'RAINBOW'}
          </p>
        </div>
      </div>

      {/* Game Board */}
      <div className="relative border-4 border-white/10 bg-[#0a0a0a] rounded-xl overflow-hidden shadow-[0_0_50px_rgba(255,255,255,0.05)] aspect-square w-full max-w-md">
        <div 
          className="grid h-full w-full" 
          style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`, gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)` }}
        >
          {/* Grid Helper Lines */}
          {[...Array(GRID_SIZE * GRID_SIZE)].map((_, i) => (
            <div key={i} className="border-[0.5px] border-white/[0.02]" />
          ))}
          
          {/* Food */}
          <div 
            className="absolute rounded-full animate-pulse shadow-[0_0_15px_#fff]"
            style={{
              width: `${100/GRID_SIZE}%`,
              height: `${100/GRID_SIZE}%`,
              left: `${(gameState.food.x / GRID_SIZE) * 100}%`,
              top: `${(gameState.food.y / GRID_SIZE) * 100}%`,
              backgroundColor: '#fff',
            }}
          />

          {/* Snake */}
          {gameState.snake.map((segment, i) => (
            <div 
              key={`${i}-${segment.x}-${segment.y}`}
              className="absolute transition-all duration-150 ease-linear rounded-sm"
              style={{
                width: `${100/GRID_SIZE}%`,
                height: `${100/GRID_SIZE}%`,
                left: `${(segment.x / GRID_SIZE) * 100}%`,
                top: `${(segment.y / GRID_SIZE) * 100}%`,
                backgroundColor: gameState.colors[i] || '#fff',
                boxShadow: `0 0 10px ${gameState.colors[i]}`,
                zIndex: gameState.snake.length - i,
                borderRadius: i === 0 ? '4px' : '2px',
                transform: i === 0 ? 'scale(1.1)' : 'scale(0.95)',
              }}
            />
          ))}
        </div>

        {/* Overlays */}
        {gameState.status === 'START' && (
          <Overlay 
            title="SNAKE ULTRA" 
            subtitle="Atteignez le niveau 10 pour le mode Kichta, et le niveau 20 pour débloquer PUCCI."
            buttonText="Jouer" 
            onAction={resetGame} 
          />
        )}

        {gameState.status === 'GAME_OVER' && (
          <Overlay 
            title="GAME OVER" 
            subtitle={`Score final: ${gameState.score}`}
            buttonText="Réessayer" 
            onAction={resetGame} 
          />
        )}

        {gameState.status === 'EXPLODING_10' && (
          <Overlay 
            title={milestoneText || "niveau Kichta atteint"} 
            buttonText="" 
            onAction={() => {}} 
            isExploding
          />
        )}

        {gameState.status === 'EXPLODING_20' && (
          <Overlay 
            title={milestoneText || "vous avez débloquer le niveau PUCCI"} 
            buttonText="" 
            onAction={() => {}} 
            isExploding
          />
        )}
      </div>

      {/* Controls */}
      <Controls onDirectionChange={handleDirection} isPucciActive={gameState.isPucciActive} />
      
      {/* Desktop Instructions */}
      <div className="hidden md:block mt-8 text-gray-500 pixel-font text-[10px] space-y-2 text-center opacity-50">
        <p>UTILISEZ LES FLÈCHES DU CLAVIER</p>
        {gameState.isPucciActive && <p className="text-red-500 animate-pulse">ALERTE : COMMANDES INVERSÉES</p>}
      </div>
    </div>
  );
};

export default App;
