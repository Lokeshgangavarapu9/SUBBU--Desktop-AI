import React from 'react';
import { AmbientAuraStage } from './AmbientAuraStage';

/**
 * SubbuStageCanvas.tsx
 * 
 * Clean, character-free ambient companion stage for SUBBU.
 * Renders the responsive audio-reactive Ambient Aura canvas
 * with thought pulses, voice reactivity, and zero 3D character overhead.
 */
export const SubbuStageCanvas: React.FC = () => {
  return (
    <div className="relative w-full h-full select-none overflow-hidden">
      <AmbientAuraStage />
    </div>
  );
};
