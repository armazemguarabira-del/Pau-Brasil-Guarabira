import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize2, 
  Minimize2, 
  Move, 
  Hand,
  X,
  Maximize,
  RefreshCw,
  Compass
} from 'lucide-react';

interface LayoutPanZoomViewerProps {
  imageSrc?: string | null;
  children?: React.ReactNode;
  title?: string;
  className?: string;
  onCloseModal?: () => void;
}

export const LayoutPanZoomViewer: React.FC<LayoutPanZoomViewerProps> = ({
  imageSrc,
  children,
  title = 'Planta de Layout Interativa — Revenda Guarabira',
  className = '',
  onCloseModal
}) => {
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [isPanModeActive, setIsPanModeActive] = useState<boolean>(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const touchDistRef = useRef<number | null>(null);

  // Zoom limits
  const MIN_SCALE = 0.4;
  const MAX_SCALE = 6.0;
  const SCALE_STEP = 0.25;

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + SCALE_STEP, MAX_SCALE));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - SCALE_STEP, MIN_SCALE));
  };

  const handleReset = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handlePresetZoom = (newScale: number) => {
    setScale(newScale);
    setPosition({ x: 0, y: 0 });
  };

  const toggleFullscreen = async () => {
    const nextMaximized = !isMaximized;
    setIsMaximized(nextMaximized);

    // Reset position & scale when toggling screen state
    handleReset();

    try {
      if (nextMaximized && containerRef.current) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        }
      } else if (document.fullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (_) {
      // Fallback to CSS fixed z-[99999] overlay
    }
  };

  const handleExitFullscreen = async () => {
    setIsMaximized(false);
    handleReset();
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch (_) {}
  };

  // Mouse Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || !isPanModeActive) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch Handlers for Mobile Pan & Pinch Zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isPanModeActive) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      });
    } else if (e.touches.length === 2) {
      // Touch pinch zoom
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchDistRef.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      });
    } else if (e.touches.length === 2 && touchDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / touchDistRef.current;
      touchDistRef.current = dist;
      setScale((prev) => Math.min(Math.max(prev * factor, MIN_SCALE), MAX_SCALE));
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchDistRef.current = null;
  };

  // Wheel Zoom handler (CTRL + Wheel = Zoom, Normal Wheel = Pan Up/Down)
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
      setScale((prev) => {
        const next = prev * zoomFactor;
        return Math.min(Math.max(next, MIN_SCALE), MAX_SCALE);
      });
    } else {
      // Normal scroll wheel pans the image vertically
      e.preventDefault();
      setPosition((prev) => ({
        x: prev.x,
        y: prev.y - e.deltaY * 0.9
      }));
    }
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Keybindings (Esc key resets scale/position and exits fullscreen)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleReset();
        if (isMaximized) {
          handleExitFullscreen();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMaximized, handleReset]);

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col bg-[#030712] border border-amber-500/30 rounded-2xl overflow-hidden shadow-2xl transition-all ${
        isMaximized
          ? 'fixed inset-0 z-[99999] rounded-none border-none max-w-none max-h-none h-screen w-screen bg-[#030611]'
          : className
      }`}
    >
      {/* TOP HEADER CONTROLS BAR */}
      <div className="bg-[#081028] border-b border-slate-800 px-4 py-3 flex items-center justify-between flex-wrap gap-2 z-30 shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-black text-white uppercase tracking-wider block">
              {title}
            </span>
            <span className="text-[10px] text-slate-400 flex items-center gap-1.5">
              <Hand className="w-3 h-3 text-amber-400 inline" /> Arraste para Mover · Segure CTRL + Roda do mouse: Zoom · Roda normal: Rolar · ESC: Restaurar
            </span>
          </div>
        </div>

        {/* CONTROLS BAR RIGHT SIDE */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* PAN MODE TOGGLE */}
          <button
            onClick={() => setIsPanModeActive(!isPanModeActive)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isPanModeActive
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="Ativar/Desativar modo de arrastar o layout"
          >
            <Hand className="w-3.5 h-3.5" />
            <span>Mover Layout</span>
          </button>

          {/* PRESET ZOOM BUTTONS */}
          <div className="hidden md:flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
            {[0.75, 1, 1.5, 2, 3].map((pScale) => (
              <button
                key={pScale}
                onClick={() => handlePresetZoom(pScale)}
                className={`px-2 py-0.5 text-[10px] font-bold rounded-lg transition-colors cursor-pointer ${
                  scale === pScale
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {Math.round(pScale * 100)}%
              </button>
            ))}
          </div>

          {/* ZOOM CONTROL BUTTONS */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
            <button
              onClick={handleZoomOut}
              title="Diminuir Zoom (-)"
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <span className="text-xs font-mono font-black text-amber-400 px-2 min-w-[55px] text-center">
              {Math.round(scale * 100)}%
            </span>

            <button
              onClick={handleZoomIn}
              title="Aumentar Zoom (+)"
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <button
              onClick={handleReset}
              title="Restaurar Posição e Zoom Original (ESC)"
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-400 flex items-center justify-center transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* FULLSCREEN / MAXIMIZE TOGGLE */}
          <button
            onClick={toggleFullscreen}
            className={`px-3 py-1.5 rounded-xl border text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
              isMaximized
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg'
                : 'bg-amber-500 text-slate-950 hover:bg-amber-400 border-amber-400'
            }`}
            title={isMaximized ? 'Sair do Modo Tela Cheia (ESC)' : 'Maximizar Layout em Tela Cheia'}
          >
            {isMaximized ? (
              <>
                <Minimize2 className="w-4 h-4" />
                <span>Restaurar (ESC)</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4" />
                <span>Maximizar Tela</span>
              </>
            )}
          </button>

          {/* OPTIONAL EXPLICIT CLOSE BUTTON IF INSIDE A MODAL OR FULLSCREEN */}
          {(isMaximized || onCloseModal) && (
            <button
              onClick={() => {
                if (isMaximized) handleExitFullscreen();
                if (onCloseModal) onCloseModal();
              }}
              className="w-8 h-8 rounded-xl bg-rose-600/20 border border-rose-500/40 text-rose-300 hover:bg-rose-600 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              title="Fechar Visualização"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* PAN & ZOOM CANVAS VIEWPORT */}
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        className={`relative flex-1 overflow-hidden select-none bg-[#02050e] flex items-center justify-center ${
          isPanModeActive ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
        } ${isMaximized ? 'h-[calc(100vh-62px)] w-screen' : 'min-h-[520px] max-h-[80vh]'}`}
      >
        {/* BACKGROUND GRID PATTERN */}
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#f59e0b 1.5px, transparent 1.5px)`,
            backgroundSize: '28px 28px'
          }}
        />

        {/* TRANSFORMABLE CANVAS CONTAINER */}
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          }}
          className="p-4 flex items-center justify-center min-w-max transition-transform duration-75"
        >
          {imageSrc ? (
            <img
              src={imageSrc}
              alt="Planta de Layout"
              draggable={false}
              className="max-w-none object-contain rounded-xl shadow-2xl border border-amber-500/20 pointer-events-none"
              style={{ maxHeight: isMaximized ? '92vh' : '72vh' }}
            />
          ) : (
            <div className="w-full max-w-6xl pointer-events-auto">
              {children}
            </div>
          )}
        </div>

        {/* FLOATING STATUS BADGE AT BOTTOM */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-amber-500/30 backdrop-blur-md px-5 py-2 rounded-full text-xs font-mono font-bold text-slate-200 shadow-2xl flex items-center gap-3.5 pointer-events-none z-20">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Zoom: <strong className="text-amber-400">{Math.round(scale * 100)}%</strong>
          </span>
          <span className="text-slate-700">|</span>
          <span className="text-slate-300">
            {isDragging ? 'Arrastando...' : 'Clique e Arraste para Mover'}
          </span>
          <span className="text-slate-700">|</span>
          <span className="text-amber-300">Tecla ESC: Voltar ao Normal</span>
        </div>
      </div>
    </div>
  );
};
