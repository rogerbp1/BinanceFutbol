import { useState, useEffect, useRef } from 'react';
import Phaser from 'phaser';
import GameScene from './GameScene';
import QRCode from 'qrcode';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import StadiumBackground from './components/StadiumBackground';
import {
  QrCode, Trophy, ShieldAlert, Users, CheckCircle2, AlertCircle, XCircle,
  UploadCloud, LogOut, RefreshCw, Play, Camera, Check, Lock, LayoutDashboard,
  Settings, Activity, Eye, Menu, X, Award
} from 'lucide-react';

const VITE_API_URL = import.meta.env.VITE_API_URL || '';

const ACTIVITY_LINKS = {
  'Mercado de predicciones': 'https://www.binance.com/es-LA/activity/pick-and-win/2026-football-challenge?ref=FOOTBALL26',
  'Encuesta de satisfacción': 'https://www.binance.com/en/qr/dplk8c929f85f7624f888ff0079e2a0fa40f'
};

// Componente del Juego Phaser
function PhaserGame({ playerName, onHud, onGameOver }) {
  const gameRef = useRef(null);
  
  // Guardar callbacks en refs para tener las referencias actualizadas sin forzar re-creación de Phaser
  const onHudRef = useRef(onHud);
  const onGameOverRef = useRef(onGameOver);

  useEffect(() => {
    onHudRef.current = onHud;
    onGameOverRef.current = onGameOver;
  });

  useEffect(() => {
    const parentEl = document.getElementById('phaser-container');
    const initialW = parentEl ? parentEl.clientWidth : window.innerWidth;
    const initialH = parentEl ? parentEl.clientHeight : window.innerHeight;

    const config = {
      type: Phaser.AUTO,
      parent: 'phaser-container',
      width: initialW || window.innerWidth,
      height: initialH || window.innerHeight,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 300 },
          debug: false
        }
      },
      transparent: false,
      scene: [GameScene],
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
      }
    };

    const game = new Phaser.Game(config);

    // Iniciar la escena del juego pasándole proxies que llamen al ref actual
    game.scene.start('GameScene', {
      playerName: playerName,
      onHud: (hudData) => onHudRef.current?.(hudData),
      onGameOver: (gameData) => onGameOverRef.current?.(gameData),
    });

    gameRef.current = game;
    window.phaserGame = game;

    const syncSize = () => {
      const container = document.getElementById('phaser-container');
      if (container) {
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w > 0 && h > 0) {
          game.scale.resize(w, h);
        }
      }
    };
    
    syncSize();
    const t1 = setTimeout(syncSize, 100);
    const t2 = setTimeout(syncSize, 400);
    const t3 = setTimeout(syncSize, 800);

    window.visualViewport?.addEventListener('resize', syncSize);
    window.addEventListener('resize', syncSize);
    window.addEventListener('orientationchange', syncSize);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.visualViewport?.removeEventListener('resize', syncSize);
      window.removeEventListener('resize', syncSize);
      window.removeEventListener('orientationchange', syncSize);
      game.destroy(true);
      window.phaserGame = null;
    };
  }, [playerName]);

  return <div id="phaser-container" className="w-full h-full" />;
}

// HUD del Juego Phaser
function GameHud({ hud }) {
  if (!hud) return null;
  const goal = hud.goal || 21;
  const touchPct = Math.max(0, Math.min(100, (hud.touches / goal) * 100));
  return (
    <div
      className="absolute inset-0 pointer-events-none px-3 pb-3 flex flex-col"
      style={{
        zIndex: 80,
        transform: 'translate3d(0, 0, 80px)',
        paddingTop: 'max(0.75rem, env(safe-area-inset-top))'
      }}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="bg-black/80 backdrop-blur-md rounded-lg px-3 py-2 border border-binance-yellow/40">
          <div className="text-binance-yellow font-black text-xl leading-none">{hud.score} <span className="text-white text-xs font-bold">PTS</span></div>
          {hud.combo >= 3 && (
            <div className="text-orange-400 font-black text-xs mt-1 animate-pulse">🔥 COMBO x{hud.combo}</div>
          )}
        </div>
        <div className="bg-black/80 backdrop-blur-md rounded-lg px-3 py-2 border border-binance-yellow/40 text-right font-bold">
          <div className="text-white font-black text-sm leading-none">{hud.bandera} {hud.ciudad}</div>
          <div className="text-binance-lightYellow text-[10px] font-bold uppercase tracking-wide">{hud.estadio} · SEDE {hud.worldNumber}/{hud.totalWorlds}</div>
        </div>
      </div>

      <div className="mt-3 w-full max-w-md mx-auto">
        <div className="flex justify-between items-end text-[11px] font-bold text-white/90 mb-1 px-1">
          <span className="uppercase tracking-widest">Dominadas</span>
          <span className="text-binance-yellow text-base leading-none">{hud.touches}<span className="text-white/70 text-xs">/{goal}</span> ⚽</span>
        </div>
        <div className="w-full h-3 bg-black/60 rounded-full overflow-hidden border border-white/10">
          <div className="h-full bg-binance-yellow transition-all duration-150" style={{ width: `${touchPct}%` }} />
        </div>
      </div>
    </div>
  );
}

// Router Principal
function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    setMenuOpen(false);
  };

  // SEO y Título de Página
  useEffect(() => {
    let title = 'Binance Fútbol Arena 2026';
    let metaDesc = 'Fiesta de fútbol interactiva de Binance. Acumula puntos completando desafíos en el estadio.';
    
    if (currentPath === '/') {
      title = 'Ingresar al Estadio | Binance Fútbol Festival';
    } else if (currentPath === '/dashboard') {
      title = 'Mi Pase de Tribuna | Binance Fútbol Festival';
    } else if (currentPath === '/ranking') {
      title = 'Tabla de Goleadores | Binance Fútbol Festival';
    } else if (currentPath === '/staff') {
      title = 'Control de Tribuna | Binance Fútbol Festival';
    } else if (currentPath === '/admin') {
      title = 'Monitoreo de Fiesta | Binance Fútbol Festival';
    }
    
    document.title = title;
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', metaDesc);
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = metaDesc;
      document.head.appendChild(meta);
    }
  }, [currentPath]);

  return (
    <div className="min-h-screen bg-[#0B0E11] text-white flex flex-col font-sans relative overflow-x-hidden selection:bg-binance-yellow selection:text-black">
      {/* Fondo del Estadio Animado (Flashes, Confeti) */}
      <StadiumBackground />

      {/* Navbar Premium con Efecto de Cristal */}
      <header className="sticky top-0 z-50 bg-[#0B0E11]/75 backdrop-blur-lg border-b border-gray-800/60 px-4 py-3 flex justify-between items-center shadow-xl">
        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => navigate('/')}>
          <div className="w-9 h-9 bg-binance-yellow rounded-xl flex items-center justify-center font-black text-black text-xl shadow-[0_0_15px_rgba(240,185,11,0.3)] group-hover:rotate-12 transition-transform duration-300">⚽</div>
          <span className="font-black italic tracking-tighter text-lg sm:text-xl">
            BINANCE <span className="text-binance-yellow">FÚTBOL ARENA</span>
          </span>
        </div>

        <button 
          onClick={() => setMenuOpen(!menuOpen)}
          className="text-white hover:text-binance-yellow md:hidden focus:outline-none p-1.5 rounded-lg border border-gray-800 bg-[#181A20]/40"
          id="menu-toggle-btn"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Desktop Nav links */}
        <nav className="hidden md:flex items-center gap-5">
          <button onClick={() => navigate('/dashboard')} className={`font-black text-xs tracking-widest hover:text-binance-yellow transition-colors ${currentPath === '/dashboard' ? 'text-binance-yellow' : 'text-gray-400'}`}>MI PASE</button>
          <button onClick={() => navigate('/ranking')} className={`font-black text-xs tracking-widest hover:text-binance-yellow transition-colors ${currentPath === '/ranking' ? 'text-binance-yellow' : 'text-gray-400'}`}>TABLA DE GOLEADORES</button>
        </nav>
      </header>

      {/* Mobile Drawer Menu */}
      {menuOpen && (
        <div className="fixed inset-x-0 top-[57px] bottom-0 z-40 bg-[#0B0E11]/95 backdrop-blur-xl flex flex-col p-6 gap-6 md:hidden animate-fade-in">
          <button onClick={() => navigate('/dashboard')} className="text-left font-black text-2xl tracking-wider hover:text-binance-yellow py-3 border-b border-gray-800/80">MI PASE DE TRIBUNA</button>
          <button onClick={() => navigate('/ranking')} className="text-left font-black text-2xl tracking-wider hover:text-binance-yellow py-3 border-b border-gray-800/80">TABLA DE GOLEADORES</button>
        </div>
      )}

      {/* Vistas Ruteadas */}
      <main className="flex-1 flex flex-col w-full relative z-10 p-3 sm:p-6 justify-center">
        {currentPath === '/' && <RegisterView navigate={navigate} />}
        {currentPath === '/dashboard' && <DashboardView navigate={navigate} />}
        {currentPath === '/ranking' && <RankingView />}
        {currentPath === '/staff' && <StaffView />}
        {currentPath === '/admin' && <AdminView />}
      </main>
    </div>
  );
}

// ==========================================
// VISTA: REGISTRO (/)
// ==========================================
function RegisterView({ navigate }) {
  const [buid, setBuid] = useState('');
  const [esNuevo, setEsNuevo] = useState(null); // null, 'si', 'no'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const savedBuid = localStorage.getItem('buid');
    if (savedBuid) navigate('/dashboard');
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!buid || buid.trim().length < 6) {
      setError('Por favor ingresa un BUID de Binance válido (mínimo 6 dígitos).');
      return;
    }
    
    if (esNuevo === null) {
      setError('Por favor responde si es tu primera vez en la plataforma.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${VITE_API_URL}/api/usuarios/registro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buid, es_nuevo: esNuevo === 'si' })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error de conexión con el estadio.');
      }

      localStorage.setItem('buid', data.buid);
      localStorage.setItem('qr_token', data.qr_token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto my-auto bg-[#181A20]/80 backdrop-blur-md border border-gray-800/80 p-6 sm:p-8 rounded-2xl shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-2 h-full bg-binance-yellow shadow-[0_0_15px_rgba(240,185,11,0.5)]" />
      
      <div className="text-center mb-6">
        <h2 className="text-3xl font-black italic tracking-tighter text-binance-yellow uppercase flex items-center justify-center gap-2">
          ¡INGRESO AL ESTADIO!
        </h2>
        <p className="text-gray-300 text-xs mt-2 px-1">Registra tu Binance User ID (BUID) para obtener tu Pase Oficial de Tribuna y sumarte a la fiesta del gol.</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-950/40 border border-red-900/50 text-red-300 p-3 rounded-xl flex items-center gap-2 text-xs">
          <ShieldAlert size={16} className="shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2" htmlFor="buid-input">Binance User ID (BUID)</label>
          <input
            id="buid-input"
            type="text"
            placeholder="Ej: 87654321"
            className="w-full bg-[#0B0E11]/90 text-white border border-gray-800 focus:border-binance-yellow p-4 rounded-xl outline-none font-black text-center text-2xl tracking-widest transition-all"
            value={buid}
            onChange={(e) => setBuid(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
            disabled={loading}
          />
        </div>

        <div className="bg-[#0B0E11]/70 p-4 rounded-xl border border-gray-850">
          <span className="block text-[10px] font-black uppercase tracking-widest text-center text-gray-400 mb-3">¿Es tu primera vez en Binance?</span>
          <div className="flex gap-3">
            <button
              type="button"
              className={`flex-1 py-3 px-2 rounded-lg font-black text-xs uppercase tracking-wider border transition-all ${esNuevo === 'si' ? 'bg-binance-yellow text-black border-binance-yellow shadow-lg shadow-binance-yellow/15' : 'bg-transparent text-white border-gray-800 hover:border-gray-650'}`}
              onClick={() => setEsNuevo('si')}
              disabled={loading}
            >
              Sí, soy nuevo
            </button>
            <button
              type="button"
              className={`flex-1 py-3 px-2 rounded-lg font-black text-xs uppercase tracking-wider border transition-all ${esNuevo === 'no' ? 'bg-binance-yellow text-black border-binance-yellow shadow-lg shadow-binance-yellow/15' : 'bg-transparent text-white border-gray-800 hover:border-gray-650'}`}
              onClick={() => setEsNuevo('no')}
              disabled={loading}
            >
              Ya tengo cuenta
            </button>
          </div>
        </div>

        {esNuevo === 'si' && (
          <div className="bg-binance-yellow/10 border border-binance-yellow/20 p-4 rounded-xl text-center animate-fade-in">
            <span className="block text-binance-yellow font-black text-xs mb-1">🎁 ¡DESAFÍO ESPECIAL DE BIENVENIDA!</span>
            <p className="text-gray-300 text-[10px] leading-relaxed mb-3">Regístrate utilizando el enlace oficial a continuación y participa para ganar hasta 100K USDT.</p>
            <a
              href="https://www.binance.com/es-LA/activity/latam-gana-100000"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-binance-yellow hover:bg-binance-lightYellow text-black font-black text-[10px] px-5 py-2 rounded-lg shadow-md hover:shadow-binance-yellow/15 transition-all uppercase tracking-wider"
            >
              REGISTRARME EN BINANCE
            </a>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || esNuevo === null}
          className="w-full bg-binance-yellow text-black font-black italic text-lg py-4 rounded-xl hover:bg-binance-lightYellow transition-all disabled:opacity-50 transform hover:scale-[1.01] active:scale-[0.99] duration-150 shadow-lg shadow-binance-yellow/10 flex items-center justify-center gap-2"
        >
          {loading ? 'INGRESANDO AL ESTADIO...' : 'OBTENER PASE OFICIAL 🎟️'}
        </button>
      </form>
    </div>
  );
}

// ==========================================
// VISTA: DASHBOARD (/dashboard)
// ==========================================
function DashboardView({ navigate }) {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  // Estado del juego Phaser
  const [gameState, setGameState] = useState('menu');
  const [hud, setHud] = useState(null);
  const [gameOver, setGameOver] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [playKey, setPlayKey] = useState(0);
  const [visibleH, setVisibleH] = useState(() => window.visualViewport?.height || window.innerHeight);

  // Estados para subida de capturas
  const [uploadingId, setUploadingId] = useState(null);
  const [uploadError, setUploadError] = useState('');

  // Bloquear scroll de pantalla únicamente mientras se juega el minijuego de cabeceos
  useEffect(() => {
    if (gameState === 'playing') {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.classList.add('game-playing');
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.classList.remove('game-playing');
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.classList.remove('game-playing');
    };
  }, [gameState]);

  // Auto-refrescar dashboard cada 15 segundos si el usuario está en el menú
  useEffect(() => {
    if (gameState !== 'menu') return;

    const interval = setInterval(() => {
      if (!uploadingId) {
        fetchDashboard();
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [gameState, uploadingId]);

  const fetchDashboard = async () => {
    const buid = localStorage.getItem('buid');
    if (!buid) {
      navigate('/');
      return;
    }

    setRefreshing(true);
    try {
      const response = await fetch(`${VITE_API_URL}/api/usuarios/${buid}/dashboard`);
      const data = await response.json();
      
      if (!response.ok) {
        localStorage.removeItem('buid');
        localStorage.removeItem('qr_token');
        navigate('/');
        return;
      }

      setUsuario(data);
      
      if (data.qr_token) {
        const qrCodeUrl = await QRCode.toDataURL(data.qr_token, {
          color: {
            dark: '#0B0E11',
            light: '#FFFFFF'
          },
          margin: 1,
          width: 250
        });
        setQrUrl(qrCodeUrl);
      }
    } catch (err) {
      setError('Error de comunicación con el estadio.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [navigate]);

  useEffect(() => {
    const update = () => setVisibleH(window.visualViewport?.height || window.innerHeight);
    window.visualViewport?.addEventListener('resize', update);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.visualViewport?.removeEventListener('resize', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  const handleStartGame = () => {
    setHud(null);
    setGameOver(null);
    setShowHint(true);
    setGameState('playing');
    window.phaserGameReadyToStart = false;
    if (window.phaserGame) {
      const scene = window.phaserGame.scene?.getScene?.('GameScene') || window.phaserGame.scene?.keys?.['GameScene'];
      if (scene) {
        scene.scene.restart();
      }
    }
  };

  const handleGameOver = async (gameData) => {
    setGameOver(gameData);
    
    try {
      const response = await fetch(`${VITE_API_URL}/api/juego/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qr_token: usuario.qr_token,
          score: gameData.score
        })
      });
      const data = await response.json();
      if (response.ok) {
        setUsuario(prev => ({
          ...prev,
          puntos_totales: data.puntos_totales,
          puntos_cabeceos: data.puntos_cabeceos,
          intentos_cabeceos: data.intentos_cabeceos
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e, actividadId) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingId(actividadId);
    setUploadError('');

    const formData = new FormData();
    formData.append('buid', usuario.buid);
    formData.append('actividad_id', actividadId);
    formData.append('captura', file);

    try {
      const response = await fetch(`${VITE_API_URL}/api/participaciones/captura`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al subir la captura.');
      }

      await fetchDashboard();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploadingId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('buid');
    localStorage.removeItem('qr_token');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <RefreshCw className="animate-spin text-binance-yellow" size={40} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="text-red-500 mb-3 animate-pulse" size={44} />
        <h3 className="text-xl font-black mb-1 uppercase tracking-tight">Fallo en la Conexión</h3>
        <p className="text-gray-400 text-xs max-w-xs mb-5">{error}</p>
        <button onClick={fetchDashboard} className="bg-binance-yellow text-black font-black px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider">Reintentar Conexión</button>
      </div>
    );
  }

  // Phaser Game Screen View
  if (gameState === 'playing') {
    return (
      <div className="fixed inset-0 z-50 overflow-hidden bg-black" style={{ height: `${visibleH}px` }}>
        <div className="absolute top-0 left-0 w-full h-full z-10">
          <PhaserGame
            key={playKey}
            playerName={usuario.buid}
            onHud={setHud}
            onGameOver={handleGameOver}
          />
        </div>

        {!gameOver && <GameHud hud={hud} />}

        {/* Tutorial */}
        {!gameOver && showHint && (
          <div
            className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center"
            style={{ zIndex: 100, transform: 'translate3d(0, 0, 100px)', backfaceVisibility: 'hidden' }}
          >
            <h2 className="text-3xl font-black italic text-binance-yellow mb-5 tracking-tight uppercase">RETOS DE CABECEOS</h2>
            <div className="w-full max-w-sm space-y-3 text-left mb-6 px-2">
              <div className="flex items-center gap-3 bg-[#181A20]/90 rounded-xl p-3 border border-gray-800">
                <span className="text-xl">👈👉</span>
                <span className="text-white font-bold text-xs">Toca la <span className="text-binance-yellow">izquierda o derecha</span> para mover al jugador.</span>
              </div>
              <div className="flex items-center gap-3 bg-[#181A20]/90 rounded-xl p-3 border border-green-500/30">
                <span className="text-xl">🦵⚽</span>
                <span className="text-white font-bold text-xs">Pega con el <span className="text-green-400 font-black">PIE (bordes de Bibi)</span> = ¡PERFECT (Doble Puntos)! Con la cabeza = Normal.</span>
              </div>
              <div className="flex items-center gap-3 bg-[#181A20]/90 rounded-xl p-3 border border-orange-500/30">
                <span className="text-xl">🔥</span>
                <span className="text-white font-bold text-xs">Consigue <span className="text-orange-400 font-black">5 PERFECT seguidos</span> y desata la <span className="text-orange-400 font-black">FIEBRE</span> del gol.</span>
              </div>
              <div className="flex items-center gap-3 bg-[#181A20]/90 rounded-xl p-3 border border-binance-yellow/20">
                <span className="text-xl">🏟️</span>
                <span className="text-white font-bold text-xs">Completa <span className="text-binance-yellow font-black">21 toques</span> para saltar a un nuevo estadio.</span>
              </div>
            </div>
            <button
              className="bg-binance-yellow text-black font-black italic text-2xl px-12 py-4 rounded-xl hover:bg-binance-lightYellow transition-all shadow-lg shadow-binance-yellow/20"
              onClick={() => {
                setShowHint(false);
                window.phaserGameReadyToStart = true;
                const gameInst = window.phaserGame;
                if (gameInst) {
                  const scene = gameInst.scene?.getScene?.('GameScene') || gameInst.scene?.keys?.['GameScene'];
                  if (scene && typeof scene.startPhysics === 'function') {
                    scene.startPhysics();
                  }
                }
              }}
            >
              ¡ARRANCAR PARTIDA!
            </button>
          </div>
        )}

        {/* Game Over Screen */}
        {gameOver && (
          <div
            className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center"
            style={{ zIndex: 100, transform: 'translate3d(0, 0, 100px)', backfaceVisibility: 'hidden' }}
          >
            <h2 className="text-4xl font-black italic text-binance-yellow mb-1 animate-pulse uppercase tracking-tight">PARTIDA FINALIZADA</h2>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-6">El balón ha tocado el césped</p>

            <div className="bg-[#181A20]/90 border border-binance-yellow/30 rounded-2xl px-8 py-5 mb-8 w-full max-w-xs shadow-2xl">
              <div className="text-6xl font-black text-binance-yellow leading-none font-mono">{gameOver.score}</div>
              <div className="text-white text-[10px] font-bold uppercase tracking-widest mt-1">Toques Realizados</div>
              
              <div className="text-binance-lightYellow text-xs font-black mt-4 uppercase">
                Alcanzaste la Sede {gameOver.worldIndex + 1}
              </div>
              <div className="text-white/60 text-[9px] font-bold uppercase">{gameOver.ciudad} · {gameOver.estadio}</div>
            </div>

            <div className="w-full max-w-xs space-y-3">
              {(usuario.intentos_cabeceos || 0) >= 3 ? (
                <button
                  className="w-full bg-binance-yellow text-black font-black italic text-lg py-4 rounded-xl hover:bg-binance-lightYellow transition-all transform hover:scale-[1.02]"
                  onClick={() => { setGameOver(null); setHud(null); setGameState('menu'); fetchDashboard(); }}
                >
                  VOLVER A MI PASE DE TRIBUNA
                </button>
              ) : (
                <>
                  <button
                    className="w-full bg-binance-yellow text-black font-black italic text-lg py-4 rounded-xl hover:bg-binance-lightYellow transition-all transform hover:scale-[1.02]"
                    onClick={handleStartGame}
                  >
                    INTENTAR DE NUEVO
                  </button>
                  <button
                    className="w-full bg-transparent border border-gray-700 text-gray-300 font-bold text-xs py-3 rounded-xl hover:bg-gray-800 transition-all"
                    onClick={() => { setGameOver(null); setHud(null); setGameState('menu'); fetchDashboard(); }}
                  >
                    VOLVER A MI PASE DE TRIBUNA
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full px-2 py-4 space-y-6 flex-1 flex flex-col justify-center">
      {/* Header Pase de Tribuna */}
      <div className="bg-[#181A20]/80 backdrop-blur-md border border-gray-800/80 rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(circle_at_top_right,_rgba(240,185,11,0.06)_0%,_transparent_75%)] pointer-events-none" />
        
        <div className="text-center md:text-left">
          <span className="bg-[#2B2F36] text-binance-yellow text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider">PASE OFICIAL DE ACCESO</span>
          <h1 className="text-2xl sm:text-3xl font-black italic text-white mt-1 flex items-center justify-center md:justify-start gap-2.5">
            <span>BUID: <span className="text-binance-yellow font-mono">{usuario.buid}</span></span>
            <button
              onClick={fetchDashboard}
              disabled={refreshing}
              className="p-1.5 rounded-lg bg-gray-800/60 hover:bg-gray-800 text-gray-400 hover:text-binance-yellow transition-all border border-gray-750 hover:border-binance-yellow/20 flex items-center justify-center shrink-0"
              title="Refrescar Puntos"
            >
              <RefreshCw size={12} className={refreshing ? 'animate-spin text-binance-yellow' : ''} />
            </button>
          </h1>
          <p className="text-gray-400 text-xs mt-1.5">Acumula puntos completando los retos físicos y digitales del festival.</p>
        </div>

        <div className="flex gap-3 w-full md:w-auto shrink-0">
          <div className="flex-1 bg-[#0B0E11]/90 border border-gray-800/85 px-4 py-3 rounded-xl text-center min-w-[100px]">
            <div className="text-gray-500 text-[8px] font-black uppercase tracking-widest">Puntos Estadio</div>
            <div className="text-2xl font-black text-binance-yellow font-mono">{usuario.puntos_totales}</div>
          </div>
          <div className="flex-1 bg-[#0B0E11]/90 border border-gray-800/85 px-4 py-3 rounded-xl text-center min-w-[100px]">
            <div className="text-gray-500 text-[8px] font-black uppercase tracking-widest">Récord Toques</div>
            <div className="text-2xl font-black text-binance-yellow font-mono">{usuario.puntos_cabeceos}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Columna Izquierda: QR */}
        <div className="bg-[#181A20]/80 backdrop-blur-md border border-gray-800/80 rounded-2xl p-5 flex flex-col items-center shadow-xl text-center">
          <h3 className="font-black italic text-binance-yellow tracking-tight mb-1 uppercase text-sm flex items-center gap-1.5">
            <QrCode size={16} /> QR DE TRIBUNA
          </h3>
          <p className="text-gray-400 text-[10px] mb-5 max-w-[220px] leading-relaxed">Presenta este código en las estaciones presenciales para registrar tus puntos inmediatamente.</p>
          
          <div className="bg-white p-3 rounded-xl shadow-lg border border-binance-yellow/60 w-full max-w-[200px] aspect-square flex items-center justify-center">
            {qrUrl ? (
              <img src={qrUrl} alt="QR Pase" className="w-full h-full object-contain" />
            ) : (
              <div className="text-black text-xs font-bold">Cargando...</div>
            )}
          </div>
          <span className="text-gray-500 font-mono text-[8px] mt-4 select-all break-all border border-gray-850 bg-[#0B0E11] px-2 py-1 rounded w-full max-w-[200px]">{usuario.qr_token}</span>
        </div>

        {/* Columna Derecha: Desafío de juego y retos */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lanzador de Juego */}
          <div className="bg-gradient-to-br from-[#181A20]/90 to-[#2B2F36]/90 border border-binance-yellow/20 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row justify-between items-center gap-5 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-full bg-[radial-gradient(circle_at_right,_rgba(240,185,11,0.06)_0%,_transparent_75%)] pointer-events-none" />
            
            <div className="space-y-1.5 text-center sm:text-left">
              <span className="bg-binance-yellow text-black text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider shadow-md">RETO INDIVIDUAL</span>
              <h3 className="text-xl sm:text-2xl font-black italic text-white flex items-center gap-2 justify-center sm:justify-start">
                <Play size={18} className="fill-current text-binance-yellow" /> DESAFÍO DE CABECEOS
              </h3>
              <p className="text-gray-300 text-xs max-w-sm leading-relaxed">Pateala con estilo, supera los 21 toques para saltar de estadio y registra tu mayor récord en la tabla.</p>
              <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Intentos Realizados:</span>
                <span className={`text-xs font-black px-2.5 py-0.5 rounded-md ${
                  (usuario.intentos_cabeceos || 0) >= 3 ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-binance-yellow/10 text-binance-yellow border border-binance-yellow/20'
                }`}>
                  {usuario.intentos_cabeceos || 0} / 3
                </span>
              </div>
            </div>

            {(usuario.intentos_cabeceos || 0) >= 3 ? (
              <button
                disabled
                className="w-full sm:w-auto bg-gray-800 text-gray-500 cursor-not-allowed font-black italic text-base px-6 py-3.5 rounded-xl border border-gray-750 shrink-0 flex items-center justify-center gap-2"
              >
                SIN INTENTOS <X size={18} />
              </button>
            ) : (
              <button
                onClick={handleStartGame}
                className="w-full sm:w-auto bg-binance-yellow hover:bg-binance-lightYellow text-black font-black italic text-base px-6 py-3.5 rounded-xl shadow-lg hover:shadow-binance-yellow/15 transition-all shrink-0 hover:scale-105 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                ¡JUGAR YA! <Award size={18} />
              </button>
            )}
          </div>

          {/* Listado de Actividades */}
          <div className="bg-[#181A20]/80 backdrop-blur-md border border-gray-800/80 rounded-2xl p-5 shadow-xl">
            <h3 className="text-base font-black italic text-binance-yellow mb-3 uppercase flex items-center gap-1.5"><Trophy size={16} /> RETOS DISPONIBLES</h3>
            
            {uploadError && (
              <div className="mb-4 bg-red-950/40 border border-red-900/50 text-red-300 p-3 rounded-lg text-xs">
                {uploadError}
              </div>
            )}

            <div className="divide-y divide-gray-800/60">
              {usuario.actividades && usuario.actividades.map((act) => {
                if (!act.activa) return null;
                return (
                  <div key={act.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 first:pt-0 last:pb-0">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-white">{act.nombre}</span>
                        <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-[#2B2F36] text-gray-350 tracking-wider">
                          {act.tipo === 'captura' ? 'Digital' : act.tipo === 'presencial' ? 'En Stands' : 'Juego'}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 leading-normal max-w-md">
                        {act.tipo === 'captura' && 'Sube tu captura de pantalla para que el administrador la apruebe.'}
                        {act.tipo === 'presencial' && 'Busca al Staff en las tribunas para validar tu código.'}
                        {act.tipo === 'juego' && 'Se acredita automáticamente a partir de tu mejor puntaje récord.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 justify-between sm:justify-end">
                      <span className="font-black text-binance-yellow text-xs sm:text-sm">
                        {act.estado === 'aprobado' ? `+${act.puntos_obtenidos} PTS` : (act.puntos_maximos ? `+${act.puntos_maximos} PTS` : 'Variable')}
                      </span>

                      <div>
                        {act.estado === 'aprobado' && (
                          <span className="flex items-center gap-1 text-[10px] text-green-400 font-bold bg-green-950/20 px-2.5 py-1.5 rounded-lg border border-green-900/40">
                            <CheckCircle2 size={12} /> Acreditado
                          </span>
                        )}

                        {act.estado === 'pendiente' && (
                          <span className="flex items-center gap-1 text-[10px] text-yellow-400 font-bold bg-yellow-950/20 px-2.5 py-1.5 rounded-lg border border-yellow-900/40">
                            <AlertCircle size={12} className="animate-pulse" /> En Revisión
                          </span>
                        )}

                        {(act.estado === 'no realizada' || act.estado === 'rechazado') && (
                          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                            {act.estado === 'rechazado' && (
                              <span className="flex items-center gap-1 text-[9px] text-red-400 font-bold bg-red-950/20 px-2 py-1 rounded border border-red-900/30">
                                <XCircle size={10} /> Rechazada:
                              </span>
                            )}
                            
                            {ACTIVITY_LINKS[act.nombre] && (
                              <a
                                href={ACTIVITY_LINKS[act.nombre]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-binance-yellow hover:text-white hover:bg-binance-yellow/10 transition-all bg-binance-yellow/5 border border-binance-yellow/20 px-3 py-2 rounded-lg hover:scale-105 active:scale-95 shrink-0"
                              >
                                Ir al Reto 🔗
                              </a>
                            )}

                            {act.tipo === 'captura' ? (
                              <label className={`cursor-pointer inline-flex items-center gap-1 text-[10px] font-black uppercase text-black bg-binance-yellow hover:bg-binance-lightYellow px-3 py-2 rounded-lg transition-all hover:scale-105 active:scale-95 shrink-0 ${uploadingId === act.id ? 'opacity-50 pointer-events-none' : ''}`}>
                                <UploadCloud size={12} /> {uploadingId === act.id ? 'Subiendo...' : 'Subir Reto'}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleFileUpload(e, act.id)}
                                  disabled={uploadingId !== null}
                                />
                              </label>
                            ) : act.tipo === 'presencial' ? (
                              <span className="text-[9px] font-bold text-gray-500 bg-[#0B0E11]/60 px-2.5 py-1.5 rounded border border-gray-800 uppercase tracking-wider text-center">
                                Ir al Stand 🏟️
                              </span>
                            ) : (
                              <button
                                onClick={handleStartGame}
                                className="bg-binance-yellow text-black font-black text-[10px] px-3.5 py-2 rounded-lg hover:bg-binance-lightYellow uppercase tracking-wider"
                              >
                                Jugar
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer del Dashboard */}
          <div className="flex justify-between items-center pt-3 border-t border-gray-850">
            <button
              onClick={() => navigate('/ranking')}
              className="text-binance-yellow hover:text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1"
            >
              <Trophy size={12} /> Ver Tabla de Goleadores
            </button>
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-red-400 font-black text-[10px] uppercase tracking-wider flex items-center gap-1"
            >
              <LogOut size={12} /> Salir del Estadio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// VISTA: RANKING PÚBLICO (/ranking)
// ==========================================
function RankingView() {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fullscreenMode, setFullscreenMode] = useState(false);

  const fetchRanking = async () => {
    try {
      const response = await fetch(`${VITE_API_URL}/api/ranking`);
      const data = await response.json();
      if (!response.ok) throw new Error();
      setRanking(data);
      setError('');
    } catch (err) {
      setError('Error al actualizar el marcador.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRanking();
    const interval = setInterval(fetchRanking, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <RefreshCw className="animate-spin text-binance-yellow" size={40} />
      </div>
    );
  }

  // TV/Full Screen layout
  if (fullscreenMode) {
    return (
      <div className="fixed inset-0 z-55 bg-[#0B0E11] p-6 sm:p-12 flex flex-col justify-between items-center text-white select-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(240,185,11,0.06)_0%,_transparent_75%)] pointer-events-none" />
        
        {/* Header TV */}
        <div className="w-full flex justify-between items-center border-b border-gray-800/80 pb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-binance-yellow rounded-2xl flex items-center justify-center font-black text-black text-3xl shadow-[0_0_20px_rgba(240,185,11,0.3)]">⚽</div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black italic tracking-tighter">TABLA DE GOLEADORES <span className="text-binance-yellow">LIVE</span></h1>
              <p className="text-gray-400 text-xs tracking-widest font-bold">TRIBUNA BINANCE — EVENTO EN DIRECTO</p>
            </div>
          </div>
          <button
            onClick={() => setFullscreenMode(false)}
            className="bg-gray-800 hover:bg-gray-700 text-white font-black text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 border border-gray-750 transition-all"
          >
            <Eye size={16} /> Salir Modo TV
          </button>
        </div>

        {/* Top 5 Leaderboard TV */}
        <div className="w-full max-w-4xl space-y-4 my-auto">
          {ranking.map((row, index) => {
            const isFirst = index === 0;
            const isSecond = index === 1;
            const isThird = index === 2;

            return (
              <div
                key={index}
                className={`w-full flex items-center justify-between p-4 sm:p-5 rounded-2xl border transition-all ${
                  isFirst
                    ? 'bg-gradient-to-r from-binance-yellow/20 to-black/60 border-binance-yellow shadow-[0_0_35px_rgba(240,185,11,0.2)] scale-[1.02]'
                    : isSecond
                    ? 'bg-[#181A20]/80 border-gray-700 shadow-lg'
                    : isThird
                    ? 'bg-[#181A20]/80 border-amber-800 shadow-md'
                    : 'bg-[#181A20]/70 border-gray-800'
                }`}
              >
                <div className="flex items-center gap-4 sm:gap-6">
                  {/* Posición */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${
                    isFirst ? 'bg-binance-yellow text-black' : isSecond ? 'bg-gray-300 text-black' : isThird ? 'bg-amber-700 text-white' : 'bg-gray-800 text-gray-450'
                  }`}>
                    #{index + 1}
                  </div>
                  {/* BUID masked */}
                  <div className="text-xl sm:text-2xl font-black font-mono tracking-widest">{row.buid_oculto}</div>
                </div>

                {/* Puntajes */}
                <div className="flex items-center gap-6 sm:gap-10 text-right">
                  <div>
                    <div className="text-gray-500 text-[8px] font-bold uppercase tracking-widest">Récord Cabeceos</div>
                    <div className="text-lg font-bold font-mono text-gray-300">{row.puntos_cabeceos}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-[8px] font-bold uppercase tracking-widest">Puntos Totales</div>
                    <div className={`text-2xl sm:text-3xl font-black font-mono ${isFirst ? 'text-binance-yellow' : 'text-white'}`}>{row.puntos_totales}</div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {ranking.length === 0 && (
            <div className="text-center py-10 text-gray-500 font-bold text-xl uppercase tracking-widest animate-pulse">Esperando clasificados en la tribuna...</div>
          )}
        </div>

        {/* Footer TV */}
        <div className="w-full flex justify-between items-center border-t border-gray-800/80 pt-4 text-gray-500 text-[9px] font-bold tracking-widest">
          <div>MONITOREO DE ACTIVIDAD EN VIVO</div>
          <div>ACTUALIZACIÓN CADA 30S</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto w-full px-2 py-4 space-y-6 flex-1 flex flex-col justify-center">
      <div className="text-center space-y-2">
        <h2 className="text-3xl sm:text-4xl font-black italic tracking-tighter text-binance-yellow uppercase">TABLA DE GOLEADORES</h2>
        <p className="text-gray-300 text-xs max-w-sm mx-auto">Leaderboard oficial de la tribuna. El ranking se actualiza automáticamente cada 30 segundos.</p>
      </div>

      {error && (
        <div className="bg-yellow-950/20 border border-yellow-900 text-yellow-350 p-2.5 rounded-xl text-xs text-center">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => setFullscreenMode(true)}
          className="bg-binance-yellow hover:bg-binance-lightYellow text-black font-black text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md hover:shadow-binance-yellow/15 transition-all transform hover:scale-105"
        >
          <Eye size={12} /> Modo Pantalla Gigante / TV 📺
        </button>
      </div>

      <div className="bg-[#181A20]/80 backdrop-blur-md border border-gray-800/80 rounded-2xl overflow-hidden shadow-2xl divide-y divide-gray-850">
        {ranking.map((row, index) => {
          const isFirst = index === 0;
          return (
            <div key={index} className={`p-4 flex items-center justify-between transition-all ${isFirst ? 'bg-binance-yellow/5 border-l-4 border-l-binance-yellow' : ''}`}>
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                  isFirst ? 'bg-binance-yellow text-black' : 'bg-gray-800 text-gray-400'
                }`}>
                  #{index + 1}
                </span>
                <span className="font-mono font-bold text-sm sm:text-base tracking-widest">{row.buid_oculto}</span>
              </div>

              <div className="flex gap-6 text-right items-center">
                <div>
                  <div className="text-gray-500 text-[8px] font-bold uppercase tracking-wider">Toques</div>
                  <div className="font-mono text-xs font-bold text-gray-300">{row.puntos_cabeceos}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-[8px] font-bold uppercase tracking-wider">Total</div>
                  <div className="font-mono text-base sm:text-lg font-black text-binance-yellow">{row.puntos_totales}</div>
                </div>
              </div>
            </div>
          );
        })}
        {ranking.length === 0 && (
          <div className="text-center py-10 text-gray-500 text-xs font-bold uppercase">Aún no hay goleadores registrados.</div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// VISTA: PANEL STAFF (/staff)
// ==========================================
function StaffView() {
  const [token, setToken] = useState(localStorage.getItem('staff_token') || '');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Estados autenticado
  const [scannedUser, setScannedUser] = useState(null);
  const [activities, setActivities] = useState([]);
  const [searchToken, setSearchToken] = useState('');
  const [assigningId, setAssigningId] = useState(null);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');
  const [cameraPermission, setCameraPermission] = useState('prompt'); // 'prompt' | 'granted' | 'denied'
  const [isInsecureContext, setIsInsecureContext] = useState(false);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const scannerRef = useRef(null);

  const handleRetryCamera = () => {
    setCameraPermission('prompt');
    setRetryTrigger(prev => prev + 1);
  };

  const loadPresencialActivities = async (staffToken) => {
    try {
      const res = await fetch(`${VITE_API_URL}/api/actividades`, {
        headers: { 'Authorization': `Bearer ${staffToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        setActivities(data.filter(act => act.tipo === 'presencial' && act.activa));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) {
      loadPresencialActivities(token);
    }
  }, [token]);

  useEffect(() => {
    let html5QrCode = null;

    const startScanner = async () => {
      if (scannerRef.current) return;

      // Check if it's an insecure context (HTTP that is not localhost)
      if (window.isSecureContext === false) {
        setIsInsecureContext(true);
        setCameraPermission('denied');
        return;
      }
      setIsInsecureContext(false);

      try {
        html5QrCode = new Html5Qrcode("qr-reader");
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 15,
            qrbox: { width: 200, height: 200 }
          },
          async (decodedText) => {
            try {
              await html5QrCode.stop();
            } catch (err) {
              console.warn("Error stopping scanner on decode:", err);
            }
            scannerRef.current = null;
            handleSearchUser(decodedText);
          },
          (errorMessage) => {
            // Ignore scan noise
          }
        );
        // Successfully started, so permission is granted
        setCameraPermission('granted');
      } catch (err) {
        console.error("Scanner start error:", err);
        scannerRef.current = null;
        setCameraPermission('denied');
      }
    };

    if (token && !scannedUser && cameraPermission !== 'denied') {
      startScanner();
    }

    return () => {
      if (html5QrCode) {
        try {
          if (html5QrCode.isScanning) {
            html5QrCode.stop().catch(err => console.warn("Error stopping scanner on cleanup:", err));
          }
        } catch (e) {
          console.warn(e);
        }
        if (scannerRef.current === html5QrCode) {
          scannerRef.current = null;
        }
      }
    };
  }, [token, scannedUser, retryTrigger]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${VITE_API_URL}/api/auth/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'PIN incorrecto.');

      localStorage.setItem('staff_token', data.token);
      setToken(data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchUser = async (userQrToken) => {
    setActionError('');
    setActionSuccess('');
    try {
      const res = await fetch(`${VITE_API_URL}/api/usuarios/qr/${userQrToken}`);
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'QR inválido.');

      setScannedUser({ ...data, qr_token: userQrToken });
    } catch (err) {
      setActionError(err.message);
      setScannedUser(null);
    }
  };

  const handleManualSearch = (e) => {
    e.preventDefault();
    if (searchToken.trim().length > 0) {
      handleSearchUser(searchToken.trim());
    }
  };

  const handleAwardPoints = async (actividadId, puntos) => {
    setAssigningId(actividadId);
    setActionError('');
    setActionSuccess('');

    try {
      const res = await fetch(`${VITE_API_URL}/api/participaciones/presencial`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          qr_token: scannedUser.qr_token,
          actividad_id: actividadId,
          puntos: puntos
        })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Error al validar.');

      setActionSuccess(`¡Reto validado y puntos asignados al BUID ${data.usuario.buid}!`);
      setScannedUser(null);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setAssigningId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('staff_token');
    setToken('');
    setScannedUser(null);
  };

  // Login View
  if (!token) {
    return (
      <div className="w-full max-w-sm mx-auto my-auto bg-[#181A20]/80 backdrop-blur-md border border-gray-800/80 p-6 sm:p-8 rounded-2xl shadow-2xl">
        <div className="flex justify-center mb-3 text-binance-yellow"><Lock size={40} /></div>
        <h2 className="text-2xl font-black italic tracking-tighter mb-1 text-center uppercase">CONTROL DE TRIBUNA</h2>
        <p className="text-gray-400 text-xs mb-5 text-center">Ingresa el PIN del Staff del evento para registrar los retos.</p>
        
        {error && (
          <div className="mb-4 bg-red-950/40 border border-red-900/50 text-red-300 p-2.5 rounded-xl text-center text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2" htmlFor="staff-pin">PIN de Seguridad</label>
            <input
              id="staff-pin"
              type="password"
              maxLength={4}
              className="w-full bg-[#0B0E11]/90 text-white border border-gray-800 focus:border-binance-yellow p-4 rounded-xl outline-none font-bold text-center text-2xl tracking-widest"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading || pin.length < 4}
            className="w-full bg-binance-yellow text-black font-black italic text-base py-3.5 rounded-xl hover:bg-binance-lightYellow transition-all"
          >
            {loading ? 'CONECTANDO...' : 'ENTRAR AL PUESTO'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto w-full px-2 py-4 space-y-5 flex-1 flex flex-col justify-center">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black italic text-binance-yellow uppercase flex items-center gap-1.5"><Camera size={18} /> REGISTRO DE RETOS</h2>
          <p className="text-gray-400 text-[10px] uppercase font-bold">Puesto de control presencial en stands</p>
        </div>
        <button onClick={handleLogout} className="text-gray-500 hover:text-red-400 font-bold text-xs flex items-center gap-1">
          <LogOut size={12} /> Salir
        </button>
      </div>

      {actionError && (
        <div className="bg-red-950/40 border border-red-900/50 text-red-300 p-3.5 rounded-xl text-xs flex items-center gap-2">
          <ShieldAlert size={16} className="text-red-450 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="bg-green-950/40 border border-green-900/50 text-green-300 p-3.5 rounded-xl text-xs flex items-center gap-2 animate-bounce">
          <CheckCircle2 size={16} className="text-green-450 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {!scannedUser ? (
        <div className="space-y-4">
          <div className="bg-[#181A20]/80 backdrop-blur-md border border-gray-800/80 rounded-2xl p-4 flex flex-col items-center relative min-h-[320px] justify-center w-full max-w-[312px]">
            {cameraPermission === 'denied' ? (
              <div className="w-full text-center py-6 px-4 space-y-4 flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-red-950/40 border border-red-900/50 flex items-center justify-center text-red-400">
                  <ShieldAlert size={24} />
                </div>
                <div>
                  <h4 className="text-binance-yellow font-black text-xs uppercase tracking-wider mb-1">
                    {isInsecureContext ? 'Conexión No Segura (HTTP)' : 'Acceso a la Cámara Denegado'}
                  </h4>
                  {isInsecureContext ? (
                    <div className="space-y-2.5 text-gray-400 text-[10px] leading-relaxed max-w-[280px] mx-auto text-left">
                      <p>
                        Los navegadores móviles bloquean el acceso a la cámara en conexiones <code className="bg-black/40 px-1 py-0.5 rounded text-red-400 font-mono">http</code> (como <code className="bg-black/40 px-1 py-0.5 rounded text-white font-mono">{window.location.host}</code>) por seguridad.
                      </p>
                      <div className="bg-binance-yellow/5 border border-binance-yellow/20 p-2.5 rounded-xl space-y-1">
                        <p className="font-bold text-binance-yellow uppercase text-[9px] tracking-wider">¿Cómo solucionarlo en tu celular?</p>
                        <ul className="list-disc pl-4 space-y-1 text-gray-300 text-[9px]">
                          <li>
                            Usa Chrome e ingresa a: <br />
                            <code className="bg-black/60 px-1 py-0.5 rounded text-binance-yellow select-all font-mono break-all text-[8px] inline-block mt-0.5">chrome://flags/#unsafely-treat-insecure-origin-as-secure</code>
                          </li>
                          <li>Activa la opción (Enabled).</li>
                          <li>Agrega <code className="text-white font-mono">{window.location.origin}</code> en la caja de texto.</li>
                          <li>Presiona "Relaunch" para reiniciar Chrome y vuelve a entrar.</li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-gray-400 text-[10px] leading-relaxed max-w-[240px] mx-auto">
                        No podemos iniciar el escáner porque el permiso de la cámara está desactivado en tu navegador.
                      </p>
                      <p className="text-gray-500 text-[9px] leading-relaxed mt-2 max-w-[240px] mx-auto">
                        Por favor, presiona el candado 🔒 o el ícono de cámara en la barra de direcciones de tu navegador, cambia el permiso a "Permitir" y recarga la página.
                      </p>
                    </>
                  )}
                </div>
                {!isInsecureContext && (
                  <button
                    type="button"
                    onClick={handleRetryCamera}
                    className="bg-binance-yellow hover:bg-binance-lightYellow text-black font-black text-[10px] px-4 py-2.5 rounded-xl uppercase tracking-wider transition-all transform hover:scale-105 active:scale-95"
                  >
                    Volver a intentar 📸
                  </button>
                )}
              </div>
            ) : (
              <div className="w-full flex flex-col items-center relative">
                {cameraPermission === 'prompt' && (
                  <div className="absolute inset-0 bg-[#181A20] z-10 flex flex-col items-center justify-center text-center p-4">
                    <RefreshCw className="animate-spin text-binance-yellow mb-3" size={32} />
                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Solicitando acceso a la cámara...</p>
                    <p className="text-gray-500 text-[8px] max-w-[180px] mt-1">Por favor, permite el uso de la cámara cuando el navegador te lo solicite.</p>
                  </div>
                )}
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-3">Coloca el Pase QR del asistente frente a la cámara</span>
                <div id="qr-reader" className="w-full max-w-[280px] rounded-xl overflow-hidden border border-gray-800 bg-black aspect-square animate-pulse" />
              </div>
            )}
          </div>

          <div className="bg-[#181A20]/80 backdrop-blur-md border border-gray-800/80 rounded-2xl p-5 shadow-lg">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Ingresar Código Manual</h4>
            <form onSubmit={handleManualSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="Pegar token de QR firmado..."
                className="flex-1 bg-[#0B0E11]/90 border border-gray-800 focus:border-binance-yellow p-3 rounded-xl outline-none text-xs text-white"
                value={searchToken}
                onChange={(e) => setSearchToken(e.target.value)}
              />
              <button type="submit" className="bg-binance-yellow text-black font-black text-xs px-4 rounded-xl">BUSCAR</button>
            </form>
          </div>
        </div>
      ) : (
        <div className="bg-[#181A20]/90 backdrop-blur-md border border-binance-yellow/20 rounded-2xl p-5 shadow-xl space-y-5 animate-fade-in">
          <div className="flex justify-between items-start border-b border-gray-800 pb-3">
            <div>
              <span className="text-[9px] font-bold text-gray-500 uppercase">Asistente en Cabina</span>
              <h3 className="text-xl font-black text-binance-yellow font-mono mt-0.5">{scannedUser.buid}</h3>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-bold text-gray-500 uppercase">Puntos Actuales</span>
              <div className="text-lg font-bold font-mono text-white">{scannedUser.puntos_totales} PTS</div>
            </div>
          </div>

          <div className="space-y-3">
            <span className="block text-[10px] font-black uppercase tracking-widest text-gray-400">Otorgar reto presencial completado:</span>
            
            <div className="space-y-2.5">
              {activities.map((act) => {
                const isAdivina = act.nombre === 'Adivina el jugador';
                const isPenales = act.nombre === 'Juego de penales';

                if (isAdivina || isPenales) {
                  const options = isAdivina ? [300, 150, 0] : [150, 100, 50, 0];
                  return (
                    <div key={act.id} className="bg-[#0B0E11]/80 border border-gray-850 p-3.5 rounded-xl space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-bold text-xs text-white">{act.nombre}</span>
                          <p className="text-[9px] text-gray-400 mt-0.5">Selecciona el puntaje del asistente</p>
                        </div>
                        <span className="bg-[#2B2F36] text-gray-300 font-bold text-[8px] px-2 py-0.5 rounded tracking-wide uppercase">
                          Opciones
                        </span>
                      </div>
                      <div className={`grid gap-2 pt-1 ${isAdivina ? 'grid-cols-3' : 'grid-cols-4'}`}>
                        {options.map((pts) => (
                          <button
                            key={pts}
                            disabled={assigningId !== null}
                            onClick={() => handleAwardPoints(act.id, pts)}
                            className="bg-binance-yellow/10 hover:bg-binance-yellow hover:text-black border border-binance-yellow/30 text-binance-yellow font-black text-xs py-2 rounded-lg transition-all disabled:opacity-50 text-center"
                          >
                            {pts}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                }

                return (
                  <button
                    key={act.id}
                    onClick={() => handleAwardPoints(act.id, act.puntos)}
                    disabled={assigningId !== null}
                    className="w-full bg-[#0B0E11]/80 hover:bg-[#2B2F36]/80 border border-gray-850 hover:border-binance-yellow/50 p-3 rounded-xl flex justify-between items-center text-left transition-all disabled:opacity-50"
                  >
                    <div>
                      <span className="font-bold text-xs text-white">{act.nombre}</span>
                      <p className="text-[9px] text-gray-400 mt-0.5">Asignación directa de puntos</p>
                    </div>
                    <span className="bg-binance-yellow text-black font-black text-[10px] px-2.5 py-1 rounded-lg">
                      +{act.puntos} PTS
                    </span>
                  </button>
                );
              })}
              {activities.length === 0 && (
                <div className="text-center py-4 text-gray-500 text-xs font-bold uppercase">No hay retos físicos activos.</div>
              )}
            </div>
          </div>

          <button
            onClick={() => setScannedUser(null)}
            className="w-full bg-transparent border border-gray-700 hover:border-gray-500 text-gray-450 font-bold text-xs py-2.5 rounded-lg"
          >
            VOLVER AL ESCÁNER / CANCELAR
          </button>
        </div>
      )}
    </div>
  );
}

// ==========================================
// VISTA: PANEL ADMIN (/admin)
// ==========================================
function AdminView() {
  const [token, setToken] = useState(localStorage.getItem('admin_token') || '');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Estados Admin panel
  const [activeTab, setActiveTab] = useState('capturas');
  const [pendingCaptures, setPendingCaptures] = useState([]);
  const [activities, setActivities] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);

  const loadData = async (adminToken) => {
    try {
      const headers = { 'Authorization': `Bearer ${adminToken}` };
      
      const capRes = await fetch(`${VITE_API_URL}/api/participaciones/pendientes`, { headers });
      const capData = await resJson(capRes);
      if (capRes.ok) setPendingCaptures(capData);

      const actRes = await fetch(`${VITE_API_URL}/api/actividades`, { headers });
      const actData = await resJson(actRes);
      if (actRes.ok) setActivities(actData);

      const rankRes = await fetch(`${VITE_API_URL}/api/ranking`);
      const rankData = await resJson(rankRes);
      if (rankRes.ok) setRanking(rankData);
    } catch (err) {
      console.error(err);
    }
  };

  const resJson = async (res) => {
    try { return await res.json(); } catch(e) { return []; }
  };

  useEffect(() => {
    if (token) {
      loadData(token);
      const interval = setInterval(() => {
        loadData(token);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [token]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${VITE_API_URL}/api/auth/admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'PIN incorrecto.');

      localStorage.setItem('admin_token', data.token);
      setToken(data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    setActionError('');
    setActionSuccess('');
    try {
      const res = await fetch(`${VITE_API_URL}/api/participaciones/${id}/aprobar`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setActionSuccess('Captura validada y puntos acreditados.');
      await loadData(token);
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleReject = async (id) => {
    setActionError('');
    setActionSuccess('');
    try {
      const res = await fetch(`${VITE_API_URL}/api/participaciones/${id}/rechazar`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setActionSuccess('Participación de captura rechazada.');
      await loadData(token);
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleToggleActivity = async (id) => {
    setActionError('');
    setActionSuccess('');
    try {
      const res = await fetch(`${VITE_API_URL}/api/actividades/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setActionSuccess(data.message);
      await loadData(token);
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken('');
  };

  // Login View
  if (!token) {
    return (
      <div className="w-full max-w-sm mx-auto my-auto bg-[#181A20]/80 backdrop-blur-md border border-gray-800/80 p-6 sm:p-8 rounded-2xl shadow-2xl">
        <div className="flex justify-center mb-3 text-binance-yellow"><Lock size={40} /></div>
        <h2 className="text-2xl font-black italic tracking-tighter mb-1 text-center uppercase">MONITOREO ADMIN</h2>
        <p className="text-gray-400 text-xs mb-5 text-center">Ingresa el PIN de Administrador del festival para controlar el sistema.</p>
        
        {error && (
          <div className="mb-4 bg-red-950/40 border border-red-900/50 text-red-300 p-2.5 rounded-xl text-center text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2" htmlFor="admin-pin">PIN de Administrador</label>
            <input
              id="admin-pin"
              type="password"
              maxLength={4}
              className="w-full bg-[#0B0E11]/90 text-white border border-gray-800 focus:border-binance-yellow p-4 rounded-xl outline-none font-bold text-center text-2xl tracking-widest"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading || pin.length < 4}
            className="w-full bg-binance-yellow text-black font-black italic text-base py-3.5 rounded-xl hover:bg-binance-lightYellow transition-all"
          >
            {loading ? 'INGRESANDO...' : 'ABRIR MONITOR'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto w-full px-2 py-4 space-y-5 flex-1 flex flex-col justify-center">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-black italic text-binance-yellow uppercase flex items-center gap-1.5"><Settings size={18} /> PANEL DE MONITOREO</h2>
          <p className="text-gray-400 text-[10px] uppercase font-bold">Moderación de retos digitales y gestión de tribunas</p>
        </div>
        <button onClick={handleLogout} className="text-gray-500 hover:text-red-400 font-bold text-xs flex items-center gap-1 self-end sm:self-center">
          <LogOut size={12} /> Salir
        </button>
      </div>

      {actionError && (
        <div className="bg-red-950/40 border border-red-900/50 text-red-300 p-3 rounded-xl text-xs">
          {actionError}
        </div>
      )}

      {actionSuccess && (
        <div className="bg-green-950/40 border border-green-900/50 text-green-300 p-3 rounded-xl text-xs">
          {actionSuccess}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-800 gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('capturas')}
          className={`px-5 py-2.5 font-black text-xs tracking-wider uppercase border-b-2 whitespace-nowrap transition-all ${activeTab === 'capturas' ? 'border-binance-yellow text-binance-yellow bg-binance-yellow/5' : 'border-transparent text-gray-400 hover:text-white'}`}
        >
          Cola de Capturas ({pendingCaptures.length})
        </button>
        <button
          onClick={() => setActiveTab('actividades')}
          className={`px-5 py-2.5 font-black text-xs tracking-wider uppercase border-b-2 whitespace-nowrap transition-all ${activeTab === 'actividades' ? 'border-binance-yellow text-binance-yellow bg-binance-yellow/5' : 'border-transparent text-gray-400 hover:text-white'}`}
        >
          Retos del Estadio
        </button>
        <button
          onClick={() => setActiveTab('ranking')}
          className={`px-5 py-2.5 font-black text-xs tracking-wider uppercase border-b-2 whitespace-nowrap transition-all ${activeTab === 'ranking' ? 'border-binance-yellow text-binance-yellow bg-binance-yellow/5' : 'border-transparent text-gray-400 hover:text-white'}`}
        >
          Goleadores Live
        </button>
      </div>

      {/* Tabs Content */}
      <div className="flex-1">
        {/* Tab 1: Captures */}
        {activeTab === 'capturas' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pendingCaptures.map((cap) => (
              <div key={cap.id} className="bg-[#181A20]/80 backdrop-blur-md border border-gray-800 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[8px] font-bold text-gray-500 uppercase">BUID Asistente</span>
                    <div className="font-bold font-mono text-white text-sm mt-0.5">{cap.buid}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] font-bold text-gray-500 uppercase">Premio</span>
                    <div className="font-black text-binance-yellow text-sm mt-0.5">+{cap.puntos_maximos} PTS</div>
                  </div>
                </div>

                <div className="text-xs text-gray-300">
                  <span className="text-gray-500 font-bold uppercase">Reto:</span> {cap.actividad_nombre}
                </div>

                <div 
                  className="w-full h-36 bg-black rounded-lg overflow-hidden border border-gray-800/80 relative group cursor-pointer"
                  onClick={() => setSelectedImage(cap.url_captura.startsWith('/') ? `${VITE_API_URL}${cap.url_captura}` : cap.url_captura)}
                >
                  <img
                    src={cap.url_captura.startsWith('/') ? `${VITE_API_URL}${cap.url_captura}` : cap.url_captura}
                    alt="Captura"
                    className="w-full h-full object-contain group-hover:scale-105 transition-all"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center font-bold text-[10px] uppercase tracking-wider">
                    Ampliar Reto
                  </div>
                </div>

                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => handleReject(cap.id)}
                    className="flex-1 bg-red-950/40 hover:bg-red-900/40 text-red-400 font-bold py-2.5 rounded-lg border border-red-900/40 text-[10px] uppercase tracking-wider"
                  >
                    Rechazar
                  </button>
                  <button
                    onClick={() => handleApprove(cap.id)}
                    className="flex-1 bg-binance-yellow hover:bg-binance-lightYellow text-black font-black py-2.5 rounded-lg text-[10px] uppercase tracking-wider"
                  >
                    Aprobar
                  </button>
                </div>
              </div>
            ))}

            {pendingCaptures.length === 0 && (
              <div className="col-span-full py-12 text-center text-gray-500 font-bold uppercase tracking-wider">No hay retos pendientes por revisar. 🎉</div>
            )}
          </div>
        )}

        {/* Tab 2: Activities Manage */}
        {activeTab === 'actividades' && (
          <div className="bg-[#181A20]/80 backdrop-blur-md border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#0B0E11]/80 text-gray-400 text-[10px] font-bold uppercase tracking-wider border-b border-gray-800">
                    <th className="p-3">ID</th>
                    <th className="p-3">Nombre Desafío</th>
                    <th className="p-3">Estación</th>
                    <th className="p-3 text-center">Puntos</th>
                    <th className="p-3 text-center">Estado</th>
                    <th className="p-3 text-right">Moderación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {activities.map((act) => (
                    <tr key={act.id} className="hover:bg-[#2B2F36]/20 transition-all">
                      <td className="p-3 font-mono font-bold text-xs text-gray-500">#{act.id}</td>
                      <td className="p-3 font-bold text-white">{act.nombre}</td>
                      <td className="p-3">
                        <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-[#0B0E11] text-gray-400 border border-gray-800">
                          {act.tipo === 'captura' ? 'Digital' : act.tipo === 'presencial' ? 'Stand Físico' : 'Juego API'}
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold text-binance-yellow">
                        {act.puntos ? `+${act.puntos} PTS` : 'Variable'}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded ${act.activa ? 'bg-green-950/20 text-green-400 border border-green-900/30' : 'bg-red-950/20 text-red-400 border border-red-900/30'}`}>
                          {act.activa ? 'Habilitado' : 'Suspendido'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleToggleActivity(act.id)}
                          className={`font-black text-[10px] px-3 py-1.5 rounded-lg transition-all ${act.activa ? 'bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-900/30' : 'bg-green-950/40 hover:bg-green-900/40 text-green-400 border border-green-900/30'}`}
                        >
                          {act.activa ? 'Suspender' : 'Habilitar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Ranking */}
        {activeTab === 'ranking' && (
          <div className="bg-[#181A20]/80 backdrop-blur-md border border-gray-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-gray-800">
              <h3 className="font-black italic text-binance-yellow uppercase flex items-center gap-1.5"><Activity size={16} /> Clasificación de Goleadores</h3>
              <span className="text-[8px] text-gray-500 font-bold uppercase tracking-wider">Auto-refresh cada 30s</span>
            </div>
            
            <div className="divide-y divide-gray-800/60">
              {ranking.map((row, index) => (
                <div key={index} className="py-3 flex justify-between items-center first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded bg-gray-800 text-gray-400 flex items-center justify-center font-black text-[10px]">#{index + 1}</span>
                    <span className="font-mono font-bold text-sm tracking-wider">{row.buid_oculto}</span>
                  </div>
                  <div className="flex gap-6 text-right font-mono text-xs">
                    <div>
                      <span className="text-[8px] font-bold text-gray-500 block uppercase">Toques Récord</span>
                      <span className="text-gray-300 font-bold">{row.puntos_cabeceos}</span>
                    </div>
                    <div>
                      <span className="text-[8px] font-bold text-gray-500 block uppercase">Puntos Totales</span>
                      <span className="text-binance-yellow font-black">{row.puntos_totales}</span>
                    </div>
                  </div>
                </div>
              ))}
              {ranking.length === 0 && (
                <div className="text-center py-6 text-gray-500 text-xs font-bold uppercase">Sin registros aún</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Zoom Image */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-55 bg-black/95 flex flex-col items-center justify-center p-4 cursor-pointer animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <button className="absolute top-4 right-4 text-white hover:text-binance-yellow"><X size={28} /></button>
          <img src={selectedImage} alt="Captura ampliada" className="max-w-full max-h-[80vh] object-contain rounded-xl border border-gray-800 shadow-2xl" />
          <span className="text-gray-450 text-[10px] font-black mt-4 uppercase tracking-widest">Toca la pantalla para cerrar</span>
        </div>
      )}
    </div>
  );
}

export default App;
