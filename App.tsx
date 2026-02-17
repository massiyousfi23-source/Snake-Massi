
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
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);
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

  const handleShare = async () => {
    const shareData = {
      title: 'Snake Ultra',
      text: `Mon score: ${gameState.score} sur Snake Ultra ! Essaye de débloquer le mode PUCCI !`,
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setShowCopyFeedback(true);
        setTimeout(() => setShowCopyFeedback(false), 2000);
      }
    } catch (err) {
      console.warn('Partage non disponible');
    }
  };

  const toggleInfo = () => {
    setGameState(prev => ({
      ...prev,
      status: prev.status === 'INFO' ? 'START' : 'INFO'
    }));
  };

  const handleDirection = useCallback((dir: Direction) => {
    setGameState(prev => {
      if (prev.status !== 'PLAYING') return prev;
      
      let finalDir = dir;
      if (prev.isPucciActive) {
        finalDir = INVERTED_CONTROLS[dir] as Direction;
      }

      const currentDir = prev.direction;
      // Empêcher le retournement à 180 degrés
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

      // Collision murs ou corps
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

      // Manger la nourriture
      if (newHead.x === prev.food.x && newHead.y === prev.food.y) {
        newScore += 1;
        newFood = getRandomPoint();
        
        if (newScore > 20) {
          newColors.unshift('#ff00ff');
        } else if (newScore > 10) {
          newColors.unshift(getGrayscale(newScore));
        } else {
          newColors.unshift(getRandomColor());
        }

        if (newScore === 10) newStatus = 'EXPLODING_10';
        if (newScore === 20) newStatus = 'EXPLODING_20';
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
      };
    });
  }, []);

  useEffect(() => {
    if (gameState.status === 'EXPLODING_10' || gameState.status === 'EXPLODING_20') {
      const isLevel10 = gameState.status === 'EXPLODING_10';
      setMilestoneText(isLevel10 ? "niveau Kichta atteint" : "vous avez débloquer le niveau PUCCI");
      
      getMilestoneMessage(isLevel10 ? 10 : 20).then(msg => setMilestoneText(msg));

      setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          status: 'PLAYING',
          isPucciActive: isLevel10 ? false : true,
          // Si niveau 10, on force le noir et blanc immédiatement
          colors: isLevel10 ? prev.snake.map((_, i) => getGrayscale(i)) : prev.colors
        }));
      }, EXPLOSION_DURATION);
    }
  }, [gameState.status]);

  useEffect(() => {
    const frame = (time: number) => {
      const speed = INITIAL_SPEED - Math.min(gameState.score * 3, 100);
      if (time - lastUpdateRef.current > speed) {
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
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 select-none overflow-hidden transition-colors duration-1000 ${gameState.isPucciActive ? 'bg-red-950/20' : 'bg-[#050505]'}`}>
      
      {showCopyFeedback && (
        <div className="fixed top-8 bg-white text-black px-6 py-3 rounded-full pixel-font text-[10px] z-[100] animate-bounce shadow-[0_0_20px_rgba(255,255,255,0.5)]">
          LIEN COPIÉ !
        </div>
      )}

      <div className="mb-6 w-full max-w-md flex justify-between items-end px-2">
        <div>
          <h2 className="pixel-font text-[8px] text-gray-500 mb-1 tracking-tighter">SCORE</h2>
          <p className="pixel-font text-2xl text-white">{gameState.score.toString().padStart(4, '0')}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={toggleInfo} className="bg-white/5 hover:bg-white/10 p-3 rounded-full transition-all border border-white/10">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </button>
          <button onClick={handleShare} className="bg-white/5 hover:bg-white/10 p-3 rounded-full transition-all border border-white/10">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
          </button>
        </div>
      </div>

      <div className="relative border-4 border-white/10 bg-[#0a0a0a] rounded-xl overflow-hidden shadow-[0_0_60px_rgba(255,255,255,0.05)] aspect-square w-full max-w-md">
        <div 
          className="grid h-full w-full" 
          style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`, gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)` }}
        >
          {[...Array(GRID_SIZE * GRID_SIZE)].map((_, i) => (
            <div key={i} className="border-[0.5px] border-white/[0.03]" />
          ))}
          
          {/* Food */}
          <div 
            className="absolute rounded-full animate-pulse z-10"
            style={{
              width: `${100/GRID_SIZE}%`,
              height: `${100/GRID_SIZE}%`,
              left: `${(gameState.food.x / GRID_SIZE) * 100}%`,
              top: `${(gameState.food.y / GRID_SIZE) * 100}%`,
              backgroundColor: '#fff',
              boxShadow: '0 0 20px #fff',
            }}
          />

          {/* Snake */}
          {gameState.snake.map((segment, i) => (
            <div 
              key={`${i}-${segment.x}-${segment.y}`}
              className="absolute transition-all duration-150 ease-linear"
              style={{
                width: `${100/GRID_SIZE}%`,
                height: `${100/GRID_SIZE}%`,
                left: `${(segment.x / GRID_SIZE) * 100}%`,
                top: `${(segment.y / GRID_SIZE) * 100}%`,
                backgroundColor: gameState.colors[i] || '#fff',
                boxShadow: `0 0 15px ${gameState.colors[i]}`,
                zIndex: gameState.snake.length - i,
                borderRadius: i === 0 ? '4px' : '2px',
                transform: i === 0 ? 'scale(1.15)' : 'scale(0.95)',
              }}
            />
          ))}
        </div>

        {/* Overlays */}
        {gameState.status === 'START' && (
          <Overlay 
            title="SNAKE ULTRA" 
            subtitle="Atteins le score 10 pour KICHTA et 20 pour PUCCI."
            buttonText="COMMENCER" 
            onAction={resetGame} 
          />
        )}

        {gameState.status === 'INFO' && (
          <Overlay 
            title="GUIDE GITHUB" 
            subtitle="1. Upload ces fichiers. 2. Settings > Pages. 3. Branche 'main' > Save. 4. Attends 1min pour le lien bleu."
            buttonText="RETOUR" 
            onAction={toggleInfo} 
          />
        )}

        {gameState.status === 'GAME_OVER' && (
          <Overlay 
            title="PERDU" 
            subtitle={`Score final: ${gameState.score}`}
            buttonText="REREESSAYER" 
            onAction={resetGame} 
          />
        )}

        {gameState.status === 'EXPLODING_10' && (
          <Overlay title={milestoneText} buttonText="" onAction={() => {}} isExploding />
        )}

        {gameState.status === 'EXPLODING_20' && (
          <Overlay title={milestoneText} buttonText="" onAction={() => {}} isExploding />
        )}
      </div>

      <Controls onDirectionChange={handleDirection} isPucciActive={gameState.isPucciActive} />
      
      <div className="hidden md:block mt-10 text-gray-500 pixel-font text-[9px] text-center opacity-40">
        <p>TOUCHES FLÉCHÉES POUR DIRIGER</p>
      </div>
    </div>
  );
};

export default App;
