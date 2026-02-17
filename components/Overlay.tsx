
import React from 'react';

interface OverlayProps {
  title: string;
  subtitle?: string;
  buttonText: string;
  onAction: () => void;
  isExploding?: boolean;
}

const Overlay: React.FC<OverlayProps> = ({ title, subtitle, buttonText, onAction, isExploding }) => {
  return (
    <div className={`absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-50 transition-opacity duration-500 ${isExploding ? 'animate-pulse' : ''}`}>
      <div className="text-center px-4">
        <h1 className={`pixel-font text-2xl md:text-4xl mb-4 leading-relaxed ${isExploding ? 'animate-blink text-yellow-400 scale-110 drop-shadow-[0_0_15px_rgba(255,255,0,0.8)]' : 'text-white'}`}>
          {title}
        </h1>
        {subtitle && <p className="text-gray-400 mb-8 max-w-md mx-auto">{subtitle}</p>}
        {!isExploding && (
          <button 
            onClick={onAction}
            className="pixel-font bg-white text-black px-8 py-4 hover:bg-yellow-400 transition-colors uppercase"
          >
            {buttonText}
          </button>
        )}
      </div>
    </div>
  );
};

export default Overlay;
