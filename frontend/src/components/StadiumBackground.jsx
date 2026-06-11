import React from 'react';

const StadiumBackground = () => {
  // Generar confeti cayendo
  const confetti = Array.from({ length: 40 }).map((_, i) => {
    const isYellow = Math.random() > 0.3; // Más amarillo que negro
    return {
      id: `confetti-${i}`,
      left: `${Math.random() * 100}%`,
      animationDuration: `${Math.random() * 5 + 5}s`,
      animationDelay: `-${Math.random() * 10}s`,
      width: `${Math.random() * 6 + 4}px`,
      height: `${Math.random() * 10 + 5}px`,
      backgroundColor: isYellow ? '#F0B90B' : '#0B0E11',
      opacity: Math.random() * 0.5 + 0.5,
    };
  });

  // Generar flashes de cámara en las gradas
  const flashes = Array.from({ length: 30 }).map((_, i) => ({
    id: `flash-${i}`,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 45}%`, // Solo en la mitad superior (público)
    animationDuration: `${Math.random() * 3 + 2}s`,
    animationDelay: `-${Math.random() * 5}s`,
  }));

  return (
    <div className="stadium-bg absolute inset-0 overflow-hidden bg-black pointer-events-none z-0">
      {/* 1. Imagen generada de alta calidad con efecto Panorámico lento (Ken Burns) */}
      <img 
        src="/binance_arena.png" 
        alt="Binance Stadium"
        className="absolute inset-0 w-[110%] h-[110%] object-cover animate-stadium-pan opacity-90"
        style={{ left: '-5%', top: '-5%' }}
      />

      {/* 2. Capa de oscurecimiento (Vignette) para dar foco al centro */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(0,0,0,0.8)_100%)]" />
      <div className="absolute inset-0 bg-black opacity-30" /> {/* Oscurecer ligeramente todo para que el juego resalte */}

      {/* 3. Flashes de cámara en el público */}
      <div className="absolute inset-0">
        {flashes.map((f) => (
          <div
            key={f.id}
            className="absolute bg-white rounded-full animate-camera-flash"
            style={{
              left: f.left,
              top: f.top,
              width: '3px',
              height: '3px',
              animationDuration: f.animationDuration,
              animationDelay: f.animationDelay,
            }}
          />
        ))}
      </div>

      {/* 4. Confeti cayendo (Colores Binance) */}
      <div className="absolute inset-0">
        {confetti.map((c) => (
          <div
            key={c.id}
            className="absolute rounded-sm animate-confetti-fall"
            style={{
              left: c.left,
              width: c.width,
              height: c.height,
              backgroundColor: c.backgroundColor,
              opacity: c.opacity,
              animationDuration: c.animationDuration,
              animationDelay: c.animationDelay,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default StadiumBackground;
