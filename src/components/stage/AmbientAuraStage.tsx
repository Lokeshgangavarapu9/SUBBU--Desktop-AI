import React, { useEffect, useRef } from 'react';
import { useSubbuStore } from '../../store/useSubbuStore';

export const AmbientAuraStage: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const voiceState = useSubbuStore((state) => state.voiceState);
  const expression = useSubbuStore((state) => state.expression);
  const audioRms = useSubbuStore((state) => state.audioRms);
  const reducedGpu = useSubbuStore((state) => state.reducedGpu);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      time += 0.02;
      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height * 0.45;

      ctx.clearRect(0, 0, width, height);

      // Audio-reactive expansion
      const voicePulse = audioRms * 80;
      const breath = Math.sin(time * 1.5) * 15;
      const baseRadius = 140 + breath + voicePulse;

      // Color scheme based on expression/voice
      let auraColor1 = 'rgba(245, 184, 204, 0.45)'; // Soft pink
      let auraColor2 = 'rgba(220, 208, 255, 0.35)'; // Soft lavender
      let auraColor3 = 'rgba(255, 240, 245, 0.1)';

      if (voiceState === 'listening') {
        auraColor1 = 'rgba(245, 184, 204, 0.65)';
        auraColor2 = 'rgba(252, 228, 236, 0.5)';
      } else if (voiceState === 'processing' || expression === 'thinking') {
        auraColor1 = 'rgba(200, 180, 245, 0.55)';
        auraColor2 = 'rgba(110, 86, 168, 0.3)';
      } else if (expression === 'happy' || expression === 'excited') {
        auraColor1 = 'rgba(255, 200, 220, 0.6)';
        auraColor2 = 'rgba(255, 235, 180, 0.35)';
      }

      // 1. Outer ambient bloom
      const grad1 = ctx.createRadialGradient(cx, cy, 10, cx, cy, baseRadius * 1.8);
      grad1.addColorStop(0, auraColor1);
      grad1.addColorStop(0.5, auraColor2);
      grad1.addColorStop(1, 'transparent');

      ctx.fillStyle = grad1;
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * 1.8, 0, Math.PI * 2);
      ctx.fill();

      // 2. Inner pearl core
      const grad2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseRadius);
      grad2.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      grad2.addColorStop(0.4, 'rgba(253, 251, 249, 0.85)');
      grad2.addColorStop(0.8, auraColor3);
      grad2.addColorStop(1, 'transparent');

      ctx.fillStyle = grad2;
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
      ctx.fill();

      // 3. Subtle floating particles (skip in reduced GPU mode)
      if (!reducedGpu) {
        for (let i = 0; i < 5; i++) {
          const angle = time * 0.8 + (i * Math.PI * 2) / 5;
          const dist = baseRadius * 0.85 + Math.sin(time * 2 + i) * 20;
          const px = cx + Math.cos(angle) * dist;
          const py = cy + Math.sin(angle) * dist;

          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.beginPath();
          ctx.arc(px, py, 3 + Math.sin(time * 3 + i), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [voiceState, expression, audioRms, reducedGpu]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center pointer-events-none">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div className="relative z-10 flex flex-col items-center gap-2 text-center select-none">
        <span className="text-2xl font-display font-semibold text-sakura-600 tracking-tight">
          Subbu
        </span>
        <span className="text-xs font-sans text-ink-muted bg-white/70 backdrop-blur-xs px-3 py-1 rounded-full border border-white/80 shadow-2xs">
          {voiceState === 'listening'
            ? 'Listening to you...'
            : voiceState === 'processing'
            ? 'Thinking...'
            : voiceState === 'speaking'
            ? 'Speaking...'
            : 'Ambient Companion Stage Active'}
        </span>
      </div>
    </div>
  );
};

