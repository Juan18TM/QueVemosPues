import { useState, useEffect } from 'react';
import './IntroAnimacion.css';

const DURACION = 4500;

function Spoke({ cx, cy, r1, r2, angle }) {
  const rad = angle * Math.PI / 180;
  return (
    <line
      x1={cx + r1 * Math.cos(rad)} y1={cy + r1 * Math.sin(rad)}
      x2={cx + r2 * Math.cos(rad)} y2={cy + r2 * Math.sin(rad)}
      stroke="#6d4fc2" strokeWidth="2.5" strokeLinecap="round"
    />
  );
}

function EscenaCine() {
  return (
    <svg className="intro-escena-svg" viewBox="0 0 700 210" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gradBeam" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fff8c0" stopOpacity="0.35" />
          <stop offset="55%" stopColor="#fff8c0" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#fff8c0" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="gradBeamCore" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fffae0" stopOpacity="0.55" />
          <stop offset="45%" stopColor="#fffae0" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#fffae0" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="gradLens" cx="0%" cy="50%" r="100%" fx="0%" fy="50%">
          <stop offset="0%" stopColor="#fff8c0" stopOpacity="0.75" />
          <stop offset="60%" stopColor="#fff8c0" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#fff8c0" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="gradLogoHalo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff8c0" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#fff8c0" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* ── LOGO HALO (warm glow where beam lands) ── */}
      <ellipse cx="545" cy="108" rx="175" ry="100" fill="url(#gradLogoHalo)" className="intro-halo" />

      {/* ── HAZ DE LUZ ── */}
      <polygon points="205,112 700,2 700,210"  fill="url(#gradBeam)"     className="intro-beam-anim" />
      <polygon points="205,112 700,35 700,182" fill="url(#gradBeamCore)" className="intro-beam-anim" />
      <polygon points="205,112 700,72 700,150" fill="rgba(255,248,180,0.18)" className="intro-beam-anim" />

      {/* External lens glow */}
      <ellipse cx="192" cy="112" rx="85" ry="58" fill="url(#gradLens)" className="intro-beam-anim" />

      {/* ── REEL IZQUIERDO ── */}
      <g className="intro-bobina-izq">
        <circle cx="67" cy="48" r="38" fill="#0b0b16" stroke="#8b5cf6" strokeWidth="2.2" />
        {[0,60,120,180,240,300].map(a => <Spoke key={a} cx={67} cy={48} r1={8} r2={30} angle={a} />)}
        <circle cx="67" cy="48" r="21" fill="#090912" stroke="#6d4fc2" strokeWidth="1.5" />
        <circle cx="67" cy="48" r="9"  fill="#060610" stroke="#8b5cf6" strokeWidth="1.2" />
        <circle cx="67" cy="48" r="4"  fill="#8b5cf6" />
      </g>

      {/* ── REEL DERECHO ── */}
      <g className="intro-bobina-der">
        <circle cx="145" cy="48" r="38" fill="#0b0b16" stroke="#8b5cf6" strokeWidth="2.2" />
        {[0,60,120,180,240,300].map(a => <Spoke key={a} cx={145} cy={48} r1={8} r2={30} angle={a} />)}
        <circle cx="145" cy="48" r="21" fill="#090912" stroke="#6d4fc2" strokeWidth="1.5" />
        <circle cx="145" cy="48" r="9"  fill="#060610" stroke="#8b5cf6" strokeWidth="1.2" />
        <circle cx="145" cy="48" r="4"  fill="#8b5cf6" />
      </g>

      {/* Conectores bobina → cuerpo */}
      <rect x="52"  y="82" width="24" height="7" rx="2" fill="#181828" stroke="#6d4fc2" strokeWidth="1" />
      <rect x="129" y="82" width="24" height="7" rx="2" fill="#181828" stroke="#6d4fc2" strokeWidth="1" />

      {/* ── CUERPO PRINCIPAL ── */}
      <rect x="22"  y="86" width="168" height="64" rx="7" fill="#000" opacity="0.5" transform="translate(4,4)" />
      <rect x="22"  y="86" width="168" height="64" rx="7" fill="#111120" stroke="#8b5cf6" strokeWidth="2" />
      <rect x="28"  y="92" width="156" height="52" rx="5" fill="#0d0d1a" />

      {/* Display 24fps */}
      <rect x="32" y="95" width="38" height="15" rx="3" fill="#001800" stroke="#22c55e" strokeWidth="1" />
      <text x="34" y="107" fill="#22c55e" fontSize="8.5" fontFamily="'Courier New',monospace" fontWeight="bold">24FPS</text>

      {/* LED REC */}
      <circle cx="42" cy="126" r="6"   fill="#150000" stroke="#ef4444" strokeWidth="1.5" />
      <circle cx="42" cy="126" r="3"   fill="#ef4444" className="intro-rec-light" />
      <text   x="52"  y="130" fill="#ef4444" fontSize="6" fontFamily="monospace" opacity="0.6">REC</text>

      {/* Ventana de película */}
      <rect x="82" y="92" width="72" height="52" rx="3" fill="#060608" stroke="#6d4fc2" strokeWidth="1" />
      {[95,107,119,131].map(y => (
        <rect key={y} x="85" y={y} width="66" height="10" rx="1.5" fill="#0a0a14" stroke="rgba(109,79,194,0.35)" strokeWidth="0.7" />
      ))}
      {[95,104,113,122,131].map(y => (
        <g key={y}>
          <rect x="83"  y={y} width="3" height="6" rx="0.8" fill="#6d4fc2" opacity="0.5" />
          <rect x="151" y={y} width="3" height="6" rx="0.8" fill="#6d4fc2" opacity="0.5" />
        </g>
      ))}

      {/* Tornillos */}
      {[[30,94],[182,94],[30,142],[182,142]].map(([x,y]) => (
        <g key={`${x}${y}`}>
          <circle cx={x} cy={y} r="3.5" fill="#18182a" stroke="#6d4fc2" strokeWidth="0.8" />
          <line x1={x-2} y1={y}   x2={x+2} y2={y}   stroke="#6d4fc2" strokeWidth="0.7" />
          <line x1={x}   y1={y-2} x2={x}   y2={y+2} stroke="#6d4fc2" strokeWidth="0.7" />
        </g>
      ))}

      {/* Etiqueta */}
      <rect x="90" y="142" width="85" height="8" rx="2" fill="#0d0d1a" stroke="#6d4fc2" strokeWidth="0.7" />
      <text x="94" y="149" fill="#8b5cf6" fontSize="5.5" fontFamily="serif" fontStyle="italic" letterSpacing="1.2">35mm · CINÉMA</text>

      {/* ── MONTURA LENTE ── */}
      <rect x="186" y="99" width="22" height="30" rx="4" fill="#0e0e1c" stroke="#8b5cf6" strokeWidth="1.5" />

      {/* ── LENTE PRINCIPAL ── */}
      <circle cx="205" cy="114" r="26" fill="#07070f" stroke="#7c3aed" strokeWidth="2.5" />
      <circle cx="205" cy="114" r="19" fill="#050508" stroke="#8b5cf6" strokeWidth="1.5" />
      <circle cx="205" cy="114" r="12" fill="#020204" stroke="#6d4fc2" strokeWidth="1" />
      {[0,30,60,90,120,150].map(a => {
        const rad = a * Math.PI / 180;
        return <line key={a}
          x1={205 + 5 * Math.cos(rad)} y1={114 + 5 * Math.sin(rad)}
          x2={205 - 5 * Math.cos(rad)} y2={114 - 5 * Math.sin(rad)}
          stroke="#6d4fc2" strokeWidth="1" opacity="0.5"
        />;
      })}
      <circle cx="199" cy="107" r="2.5" fill="rgba(255,255,255,0.13)" />
      {/* Bright active glow */}
      <circle cx="205" cy="114" r="8"  fill="rgba(255,248,180,0.55)" className="intro-beam-anim" />
      <circle cx="205" cy="114" r="4"  fill="rgba(255,255,220,0.9)"  className="intro-beam-anim" />
    </svg>
  );
}

export default function IntroAnimacion({ onFin }) {
  const [saliendo, setSaliendo]   = useState(false);
  const [logoVisible, setLogoVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setLogoVisible(true), 900);
    const t2 = setTimeout(() => setSaliendo(true),    DURACION - 900);
    const t3 = setTimeout(() => onFin?.(),             DURACION);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const saltar = () => { setSaliendo(true); setTimeout(() => onFin?.(), 900); };

  return (
    <div
      className={`intro-overlay${saliendo ? ' saliendo' : ''}`}
      style={{ '--duracion-intro': `${(DURACION - 300) / 1000}s` }}
      onClick={saltar}
    >
      <div className="intro-flicker" />
      <div className="intro-scanlines" />
      <div className="intro-vignette" />

      {/* Filmstrips top & bottom — letterbox cinemático */}
      <div className="intro-film-top" />
      <div className="intro-film-bot" />

      {/* Escena principal */}
      <div className="intro-escena-wrap">
        <EscenaCine />

        {/* Logo iluminado por el haz */}
        <div className={`intro-logo-haz${logoVisible ? ' visible' : ''}`}>
          <div className="intro-logo-text">Que<span>Vemos</span>Pues</div>
          <div className="intro-subtitulo-text">AI · Entertainment</div>
          <div className="intro-barra-wrapper"><div className="intro-barra" /></div>
        </div>
      </div>

      <div className="intro-skip-hint">Toca para continuar</div>
    </div>
  );
}
