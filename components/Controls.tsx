
import React from 'react';
import { Direction } from '../types';

interface ControlsProps {
  onDirectionChange: (dir: Direction) => void;
  isPucciActive: boolean;
}

const Controls: React.FC<ControlsProps> = ({ onDirectionChange, isPucciActive }) => {
  const btnClass = "w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center active:scale-90 active:bg-white/30 transition-all border border-white/20";
  
  return (
    <div className="md:hidden flex flex-col items-center gap-2 mt-8 pb-8">
      <div className="flex justify-center">
        <button className={btnClass} onClick={() => onDirectionChange(Direction.UP)}>
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
        </button>
      </div>
      <div className="flex gap-4">
        <button className={btnClass} onClick={() => onDirectionChange(Direction.LEFT)}>
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button className={btnClass} onClick={() => onDirectionChange(Direction.DOWN)}>
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>
        <button className={btnClass} onClick={() => onDirectionChange(Direction.RIGHT)}>
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
      {isPucciActive && (
        <p className="text-red-500 font-bold text-xs mt-2 animate-pulse uppercase tracking-widest">
          ⚠️ Commandes Inversées ⚠️
        </p>
      )}
    </div>
  );
};

export default Controls;
