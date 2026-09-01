"use client";

import React, { useEffect, useRef, useState } from 'react';

interface SplashLoaderProps {
  onComplete: () => void;
}

export const SplashLoader: React.FC<SplashLoaderProps> = ({ onComplete }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const handleFinish = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      onComplete();
    }, 500);
  };

  useEffect(() => {
    const handleResize = () => {
      if (!rootRef.current || !logoRef.current) return;
      const s = Math.min(
        (rootRef.current.clientWidth * 0.82) / 776,
        (rootRef.current.clientHeight * 0.7) / 284
      );
      logoRef.current.style.setProperty('--s', String(Math.max(0.15, s)));
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Fallback de seguridad para completar la animación si no se dispara animationend
    const fallbackTimer = setTimeout(() => {
      handleFinish();
    }, 4200);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(fallbackTimer);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      id="dxLoader"
      className="datax-loader"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        opacity: isFadingOut ? 0 : 1,
        transition: 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: isFadingOut ? 'none' : 'auto',
      }}
    >
      <style>{`
        :root { --s: 1; }
        .datax-loader * { box-sizing: border-box; }
        .dx-logo {
          position: relative; width: 776px; height: 284px; flex: none;
          transform: scale(var(--s)); transform-origin: center center;
        }
        .dx-logo img { display: block; -webkit-user-drag: none; user-select: none; }

        /* ---- pieces of the mark ---- */
        .dx-icon { position: absolute; inset: 0; transform-origin: 192px 142px;
                   animation: dx-bounce .35s cubic-bezier(.34,1.56,.64,1) 1.5s both; }
        .dx-blur { position: absolute; inset: 0; animation: dx-blur 1.68s linear 0s both; }
        .dx-half { position: absolute; top: 0; height: 284px; }
        .dx-half-l { left: 30px; width: 163px; animation: dx-in-l 1.5s cubic-bezier(.215,.61,.355,1) both; }
        .dx-half-r { left: 193px; width: 157px; animation: dx-in-r 1.5s cubic-bezier(.215,.61,.355,1) both; }

        /* ---- light ---- */
        .dx-ring { position: absolute; left: 190px; top: 142px; width: 260px; height: 260px;
                   margin: -130px 0 0 -130px; border-radius: 50%; pointer-events: none;
                   background: radial-gradient(circle, rgba(90,190,170,.55) 0%, rgba(122,190,90,.25) 45%, rgba(122,190,90,0) 72%);
                   animation: dx-ring 1.25s cubic-bezier(.215,.61,.355,1) 1.5s both; }
        .dx-glow { position: absolute; left: 0; top: 0; width: 776px; height: 284px; pointer-events: none;
                   filter: blur(12px) saturate(1.7) brightness(1.2);
                   animation: dx-glow 1.75s cubic-bezier(.25,.46,.45,.94) 1.5s both; }
        .dx-flash { position: absolute; left: 30px; top: 0; width: 320px; height: 284px; pointer-events: none;
                    animation: dx-flash .3s linear 1.5s both; }
        .dx-sweep { position: absolute; left: 30px; top: 0; width: 320px; height: 284px; pointer-events: none;
                    -webkit-mask-image: linear-gradient(100deg, rgba(0,0,0,0) 38%, rgba(0,0,0,.55) 46%, rgba(0,0,0,1) 50%, rgba(0,0,0,.55) 54%, rgba(0,0,0,0) 62%);
                    mask-image: linear-gradient(100deg, rgba(0,0,0,0) 38%, rgba(0,0,0,.55) 46%, rgba(0,0,0,1) 50%, rgba(0,0,0,.55) 54%, rgba(0,0,0,0) 62%);
                    -webkit-mask-size: 320px 284px; mask-size: 320px 284px;
                    -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
                    animation: dx-sweep 1.1s cubic-bezier(.37,0,.63,1) 1.75s both, dx-sweep-fade 1.1s linear 1.75s both; }

        /* ---- wordmark ---- */
        .dx-word { position: absolute; left: 355px; top: 0; width: 390px; height: 284px;
                   animation: dx-word .6s cubic-bezier(.215,.61,.355,1) 2.75s both; }

        @keyframes dx-in-l  { from { transform: translateX(-860px) rotate(-1080deg); } to { transform: translateX(0) rotate(0); } }
        @keyframes dx-in-r  { from { transform: translateX(860px) rotate(1080deg); }  to { transform: translateX(0) rotate(0); } }
        @keyframes dx-blur  { 0% { filter: blur(10px); } 53.6% { filter: blur(7px); } 75.9% { filter: blur(3px); }
                              89.3% { filter: blur(0); } 94.6% { filter: blur(3.5px); } 100% { filter: blur(0); } }
        @keyframes dx-bounce{ 0% { transform: scale(1); } 46% { transform: scale(1.07); } 100% { transform: scale(1); } }
        @keyframes dx-ring  { 0% { transform: scale(.2); opacity: 0; } 15% { opacity: .55; } 100% { transform: scale(3.2); opacity: 0; } }
        @keyframes dx-glow  { 0% { opacity: 0; } 20% { opacity: .5; } 55% { opacity: .42; } 100% { opacity: 0; } }
        @keyframes dx-flash { 0% { opacity: 0; } 25% { opacity: .55; } 100% { opacity: 0; } }
        @keyframes dx-sweep { from { -webkit-mask-position: -140px 0; mask-position: -140px 0; }
                              to   { -webkit-mask-position: 240px 0;  mask-position: 240px 0; } }
        @keyframes dx-sweep-fade { 0% { opacity: 0; } 12% { opacity: .95; } 85% { opacity: .95; } 100% { opacity: 0; } }
        @keyframes dx-word  { from { opacity: 0; transform: translate(-14px, 16px); } to { opacity: 1; transform: translate(0, 0); } }

        @media (prefers-reduced-motion: reduce) {
          .dx-icon, .dx-blur, .dx-half-l, .dx-half-r, .dx-ring, .dx-glow, .dx-flash, .dx-sweep, .dx-word { animation: none !important; }
          .dx-ring, .dx-glow, .dx-flash, .dx-sweep { opacity: 0; }
        }
      `}</style>

      <div ref={logoRef} className="dx-logo">
        <div className="dx-ring"></div>
        <div className="dx-glow">
          <img
            className="dx-half dx-half-l"
            style={{ animation: 'none' }}
            src="/splash/dx-half-l.webp"
            alt="Datax Logo Left"
          />
          <img
            className="dx-half dx-half-r"
            style={{ animation: 'none' }}
            src="/splash/dx-half-r.webp"
            alt="Datax Logo Right"
          />
        </div>
        <div className="dx-icon">
          <div className="dx-blur">
            <img
              className="dx-half dx-half-l"
              src="/splash/dx-half-l.webp"
              alt="Datax Icon Left"
            />
            <img
              className="dx-half dx-half-r"
              src="/splash/dx-half-r.webp"
              alt="Datax Icon Right"
            />
          </div>
          <img
            className="dx-flash"
            src="/splash/dx-flash.webp"
            alt="Datax Flash"
          />
          <img
            className="dx-sweep"
            src="/splash/dx-sweep.webp"
            alt="Datax Sweep"
          />
        </div>
        <img
          className="dx-word"
          src="/splash/dx-word.webp"
          alt="Datax — Soluciones basadas en datos"
          onAnimationEnd={handleFinish}
        />
      </div>

      {/* Botón sutil para omitir animación si se desea */}
      <button
        type="button"
        onClick={handleFinish}
        style={{
          position: 'absolute',
          bottom: '24px',
          right: '28px',
          background: 'rgba(241, 245, 249, 0.8)',
          border: '1px solid #e2e8f0',
          borderRadius: '20px',
          padding: '6px 14px',
          fontSize: '12px',
          fontWeight: 600,
          color: '#64748b',
          cursor: 'pointer',
          backdropFilter: 'blur(4px)',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#0f172a';
          e.currentTarget.style.background = '#ffffff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#64748b';
          e.currentTarget.style.background = 'rgba(241, 245, 249, 0.8)';
        }}
      >
        Omitir animación &rarr;
      </button>
    </div>
  );
};
