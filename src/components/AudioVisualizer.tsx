import React from 'react';
import { motion } from 'motion/react';
import { AppState } from '../types';

interface AudioVisualizerProps {
  state: AppState;
  isPowerOn: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ state, isPowerOn }) => {
  const bars = 18;

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-1.5 h-10 px-4 py-2 bg-black/40 border border-white/10 rounded-2xl backdrop-blur-md">
      {Array.from({ length: bars }).map((_, i) => {
        const isSpeaking = state === 'speaking';
        const isListening = state === 'listening';
        const isConnecting = state === 'connecting';

        let height = '8%';
        let duration = 0.5;
        let colorClass = 'bg-white/20';

        if (isSpeaking) {
          colorClass = 'bg-gradient-to-t from-purple-500 to-cyan-400';
          duration = 0.3 + (i % 5) * 0.1;
        } else if (isListening) {
          colorClass = 'bg-gradient-to-t from-emerald-500 to-cyan-400';
          duration = 0.6 + (i % 3) * 0.15;
        } else if (isConnecting) {
          colorClass = 'bg-blue-400';
          duration = 0.8;
        } else if (isPowerOn) {
          colorClass = 'bg-cyan-500/40';
          duration = 1.2;
        }

        return (
          <motion.span
            key={i}
            animate={{
              height: isSpeaking
                ? ['15%', `${Math.min(100, 25 + ((i * 17) % 75))}%`, '20%']
                : isListening
                ? ['10%', `${Math.min(80, 20 + ((i * 11) % 60))}%`, '12%']
                : isConnecting
                ? ['10%', '40%', '10%']
                : ['8%', '16%', '8%'],
              opacity: isPowerOn ? [0.6, 1, 0.6] : 0.2,
            }}
            transition={{
              repeat: Infinity,
              duration: duration,
              delay: (i * 0.04),
              ease: 'easeInOut',
            }}
            className={`w-1 sm:w-1.5 rounded-full ${colorClass} transition-colors`}
          />
        );
      })}
    </div>
  );
};
