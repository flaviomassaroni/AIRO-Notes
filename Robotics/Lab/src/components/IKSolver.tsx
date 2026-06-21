/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Target, 
  Settings, 
  HelpCircle, 
  CheckCircle2, 
  XCircle,
  TrendingUp,
  RotateCcw
} from 'lucide-react';

interface Solution2D {
  q1: number; // degrees
  q2: number; // degrees
  label: string;
}

export const IKSolver: React.FC = () => {
  // Target position coords
  const [targetX, setTargetX] = useState<number>(1.2);
  const [targetY, setTargetY] = useState<number>(0.5);

  // Robot Link Lengths
  const [l1, setL1] = useState<number>(1.0);
  const [l2, setL2] = useState<number>(0.8);

  // Manual User Guesses
  const [userQ1, setUserQ1] = useState<number>(0);
  const [userQ2, setUserQ2] = useState<number>(0);

  // Solve modes: 'auto' (shows math overlays) or 'challenge' (user guesses)
  const [subMode, setSubMode] = useState<'auto' | 'challenge'>('auto');

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Computed Analytical Solutions
  const [solutions, setSolutions] = useState<Solution2D[]>([]);
  const [errorDiagnostic, setErrorDiagnostic] = useState<string>('');

  // Re-calculate analytical IK configurations whenever parameters update
  useEffect(() => {
    const x = targetX;
    const y = targetY;
    const dSq = x * x + y * y;
    const d = Math.sqrt(dSq);
    const rMax = l1 + l2;
    const rMin = Math.abs(l1 - l2);

    if (d > rMax) {
      setSolutions([]);
      setErrorDiagnostic(
        `Target FUORI workspace: il braccio è troppo corto di ${(d - rMax).toFixed(2)} unità. (Estensione massima = ${rMax.toFixed(2)})`
      );
      return;
    }

    if (d < rMin) {
      setSolutions([]);
      setErrorDiagnostic(
        `Target FUORI workspace: il punto è all'interno della zona cieca centrale. I due segmenti si sovrappongono e non possono contrarsi sotto ${rMin.toFixed(2)}.`
      );
      return;
    }

    // Cosine of q2
    const c2 = (dSq - l1 * l1 - l2 * l2) / (2 * l1 * l2);
    // Boundary checks due to floating-point
    const clampedC2 = Math.max(-1, Math.min(1, c2));
    const s2 = Math.sqrt(1 - clampedC2 * clampedC2);

    const sols: Solution2D[] = [];

    // Solution 1: Elbow Up (s2)
    const q2_up_rad = Math.atan2(s2, clampedC2);
    const q1_up_rad = Math.atan2(y, x) - Math.atan2(l2 * s2, l1 + l2 * clampedC2);
    sols.push({
      q1: (q1_up_rad * 180) / Math.PI,
      q2: (q2_up_rad * 180) / Math.PI,
      label: 'Gomito Alto (Elbow-Up)'
    });

    // Solution 2: Elbow Down (-s2)
    const q2_down_rad = Math.atan2(-s2, clampedC2);
    const q1_down_rad = Math.atan2(y, x) - Math.atan2(l2 * (-s2), l1 + l2 * clampedC2);
    sols.push({
      q1: (q1_down_rad * 180) / Math.PI,
      q2: (q2_down_rad * 180) / Math.PI,
      label: 'Gomito Basso (Elbow-Down)'
    });

    setSolutions(sols);
    setErrorDiagnostic('');

    // Pre-populate manual mode close to first solution just to help
    if (subMode === 'challenge' && userQ1 === 0 && userQ2 === 0 && sols.length > 0) {
      setUserQ1(Math.round(sols[0].q1 - 15));
      setUserQ2(Math.round(sols[0].q2 + 10));
    }

  }, [targetX, targetY, l1, l2, subMode]);

  // Compute current coordinates resulting from user guess values
  const userQ1Rad = (userQ1 * Math.PI) / 180;
  const userQ2Rad = (userQ2 * Math.PI) / 180;
  const userX = l1 * Math.cos(userQ1Rad) + l2 * Math.cos(userQ1Rad + userQ2Rad);
  const userY = l1 * Math.sin(userQ1Rad) + l2 * Math.sin(userQ1Rad + userQ2Rad);
  const userError = Math.hypot(targetX - userX, targetY - userY);

  const isChallengeSolved = userError < 0.05; // 5 cm lock range

  // Render graphic canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const cx = W / 2;
    const cy = H * 0.55;
    const scale = 110;

    const proj = (x: number, y: number) => {
      return [cx + x * scale, cy - y * scale];
    };

    // Draw Grid
    ctx.strokeStyle = 'rgba(51,65,85,0.2)';
    ctx.lineWidth = 1;
    for (let i = -3; i <= 3; i += 0.5) {
      ctx.beginPath();
      ctx.moveTo(cx + i * scale, 0); ctx.lineTo(cx + i * scale, H);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, cy - i * scale); ctx.lineTo(W, cy - i * scale);
      ctx.stroke();
    }

    // Draw coordinate base axis cross-hairs
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();

    // Draw workspace borders (Primary Reach Ring)
    const rOuter = (l1 + l2) * scale;
    const rInner = Math.abs(l1 - l2) * scale;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.06)';
    ctx.fillStyle = 'rgba(56, 189, 248, 0.015)';
    ctx.beginPath(); ctx.arc(cx, cy, rOuter, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (rInner > 5) {
      ctx.fillStyle = '#020617'; // hollow center
      ctx.beginPath(); ctx.arc(cx, cy, rInner, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }

    // Draw the Target point
    const [tux, tuy] = proj(targetX, targetY);
    ctx.strokeStyle = '#f43f5e'; // Hot pink target crosshair
    ctx.lineWidth = 1.5;
    // Circular target bounds
    ctx.beginPath(); ctx.arc(tux, tuy, 12, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(tux, tuy, 3, 0, Math.PI * 2); ctx.fillStyle = '#f43f5e'; ctx.fill();
    // Inner target lines
    ctx.beginPath(); ctx.moveTo(tux - 15, tuy); ctx.lineTo(tux + 15, tuy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tux, tuy - 15); ctx.lineTo(tux, tuy + 15); ctx.stroke();

    if (subMode === 'auto') {
      // Draw all analytical options super-imposed
      solutions.forEach((sol, index) => {
        const q1_rad = (sol.q1 * Math.PI) / 180;
        const q2_rad = (sol.q2 * Math.PI) / 180;

        // Joints locations
        const j0 = proj(0, 0);
        const j1 = proj(l1 * Math.cos(q1_rad), l1 * Math.sin(q1_rad));
        const j2 = proj(
          l1 * Math.cos(q1_rad) + l2 * Math.cos(q1_rad + q2_rad),
          l1 * Math.sin(q1_rad) + l2 * Math.sin(q1_rad + q2_rad)
        );

        const color = index === 0 ? '#38bdf8' : '#fb923c'; // Blue vs Orange options

        // Link lines
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(j0[0], j0[1]);
        ctx.lineTo(j1[0], j1[1]);
        ctx.lineTo(j2[0], j2[1]);
        ctx.stroke();

        // Join circles
        ctx.fillStyle = '#1e293b';
        ctx.beginPath(); ctx.arc(j1[0], j1[1], 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

        // Label config text
        ctx.fillStyle = color;
        ctx.font = '9px monospace';
        ctx.fillText(sol.label, j1[0] + 8, j1[1] - 4);
      });
    } else {
      // CHALLENGE MODE: Draw Current User Configuration guess
      const j0 = proj(0, 0);
      const j1 = proj(l1 * Math.cos(userQ1Rad), l1 * Math.sin(userQ1Rad));
      const j2 = proj(userX, userY);

      // Render trial link arm
      ctx.strokeStyle = isChallengeSolved ? '#22c55e' : '#e2e8f0'; // Neon success green or white trail
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(j0[0], j0[1]);
      ctx.lineTo(j1[0], j1[1]);
      ctx.lineTo(j2[0], j2[1]);
      ctx.stroke();

      // Draw hinges
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath(); ctx.arc(j0[0], j0[1], 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fb923c';
      ctx.beginPath(); ctx.arc(j1[0], j1[1], 6, 0, Math.PI * 2); ctx.fill();

      // Active end point tracker
      ctx.fillStyle = isChallengeSolved ? '#22c55e' : '#ef4444';
      ctx.beginPath(); ctx.arc(j2[0], j2[1], 6, 0, Math.PI * 2); ctx.fill();
    }

  }, [targetX, targetY, l1, l2, solutions, subMode, userQ1, userQ2, userX, userY, isChallengeSolved]);

  // Click on canvas to update targets directly (extremely intuitive!)
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const cx = canvas.width / 2;
    const cy = canvas.height * 0.55;
    const scale = 110;

    const x = (px - cx) / scale;
    const y = -(py - cy) / scale;

    // Constrain input to simple decimal grid
    setTargetX(Math.round(x * 100) / 100);
    setTargetY(Math.round(y * 100) / 100);
  };

  return (
    <div className="space-y-6">
      {/* Modulo Header */}
      <div className="border-b border-slate-800 pb-4">
        <span className="text-xs font-mono text-emerald-400 tracking-wider uppercase font-bold">
          MODULO B — GEOMETRIA DELLE SOLUZIONI MULTIPLE
        </span>
        <h1 className="text-2xl font-bold text-white tracking-tight font-display mt-0.5">
          Laboratorio di Cinematica Inversa (IK Solver)
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Comprendi la transizione spaziale della cinematica inversa analizzando l'intervallo delle soluzioni coplanari. Clicca sulla griglia per variare la coordinata target oppure inserisci il valore numerico a mano.
        </p>
      </div>

      {/* Mode selectors Toggle bar */}
      <div className="flex border border-slate-800 rounded-lg overflow-hidden bg-slate-900/30 p-1 w-max">
        <button
          onClick={() => setSubMode('auto')}
          className={`px-4 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${
            subMode === 'auto'
              ? 'bg-slate-800 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          🎓 Risolutore Analitico Instantaneo
        </button>
        <button
          onClick={() => setSubMode('challenge')}
          className={`px-4 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${
            subMode === 'challenge'
              ? 'bg-slate-800 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          ⚔️ Sfida di Approssimazione Manuale
        </button>
      </div>

      {/* Split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left canvas coordinate workspace */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-950 p-1 border border-slate-800 rounded-xl overflow-hidden relative">
            <span className="absolute top-3 left-4 text-[9px] font-mono tracking-widest text-slate-400 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded uppercase uppercase-950">
              Usa il click sulla griglia per riposizionare l'EE
            </span>
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              width={500}
              height={380}
              className="bg-gray-950 w-full block cursor-crosshair rounded-lg"
            />
          </div>

          {/* Warning banner */}
          {errorDiagnostic ? (
            <div className="bg-rose-950/40 border border-rose-800 p-4 rounded-xl flex items-start gap-3">
              <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="block font-mono text-xs font-bold text-rose-300 uppercase">
                  ERRORE DI CONFIGURAZIONE CARTESIANA
                </span>
                <p className="text-xs text-rose-200 mt-1">{errorDiagnostic}</p>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-950/30 border border-emerald-900 p-4 rounded-xl flex items-start gap-3 text-emerald-400">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed font-sans">
                <strong>Coordinata validata nel Workspace:</strong> Il target rientra perfettamente nel raggio energetico. Il sistema ha ricavato esatti coefficienti angolari.
              </div>
            </div>
          )}
        </div>

        {/* Right configuration side controls */}
        <div className="lg:col-span-5 space-y-6">
          {/* Link Geometry controls */}
          <div className="bg-slate-900/30 border border-slate-800 p-5 rounded-xl space-y-4">
            <span className="font-display font-semibold text-sm text-slate-200 block border-b border-slate-850 pb-2">
              Regolazione Target & Link
            </span>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400">Target X (m)</label>
                <input
                  type="number"
                  step="0.05"
                  value={targetX}
                  onChange={(e) => setTargetX(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs focus:outline-none focus:border-cyan-600 font-mono text-cyan-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400">Target Y (m)</label>
                <input
                  type="number"
                  step="0.05"
                  value={targetY}
                  onChange={(e) => setTargetY(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs focus:outline-none focus:border-cyan-600 font-mono text-cyan-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400">Link 1 Lunghezza (l₁)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.2"
                  value={l1}
                  onChange={(e) => setL1(Math.max(0.2, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs focus:outline-none focus:border-cyan-600 font-mono text-slate-300"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400">Link 2 Lunghezza (l₂)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.2"
                  value={l2}
                  onChange={(e) => setL2(Math.max(0.2, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs focus:outline-none focus:border-cyan-600 font-mono text-slate-300"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 font-sans italic">
              *Nota: la distanza euclidea istantanea dell'end-effector dall'origine è <strong>{Math.hypot(targetX, targetY).toFixed(3)} m</strong>.
            </p>
          </div>

          {/* Mode-specific panels */}
          {subMode === 'auto' ? (
            /* Show mathematically calculated configurations */
            <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-xl space-y-4">
              <span className="font-display font-semibold text-sm text-slate-200 block border-b border-slate-850 pb-2">
                📂 Soluzioni Analitiche Trovate
              </span>
              {solutions.length > 0 ? (
                <div className="space-y-3">
                  {solutions.map((sol, index) => (
                    <div
                      key={index}
                      className={`p-3.5 rounded-lg border ${
                        index === 0
                          ? 'bg-sky-950/20 border-sky-800/80 text-sky-300'
                          : 'bg-orange-950/20 border-orange-850 text-orange-400'
                      }`}
                    >
                      <div className="flex justify-between items-center font-bold font-display text-xs mb-1.5 uppercase tracking-wide">
                        <span>{sol.label}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] ${
                          index === 0 ? 'bg-cyan-900 text-cyan-200' : 'bg-orange-900 text-orange-200'
                        }`}>
                          Soluzione #{index + 1}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div>q₁ = <span className="font-bold underline">{sol.q1.toFixed(1)}°</span></div>
                        <div>q₂ = <span className="font-bold underline">{sol.q2.toFixed(1)}°</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-400 font-sans text-center py-4 bg-slate-950/40 rounded border border-slate-850">
                  Nessuna soluzione nel Workspace. Configura un target valido.
                </div>
              )}
            </div>
          ) : (
            /* CHALLENGE GUESSING MODAL */
            <div className="bg-slate-900/30 border border-slate-850 p-5 rounded-xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-850 pb-2.5">
                <span className="font-display font-semibold text-sm text-slate-200">
                  ⚡ Tuo tentativo (Risolvi a mano!)
                </span>
                <button 
                  onClick={() => { setUserQ1(0); setUserQ2(0); }}
                  className="p-1 text-slate-400 hover:text-white rounded border border-slate-800 hover:bg-slate-850"
                  title="Resetta Giunti"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Angle sliders for manual IK */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Giunto 1 (q₁)</span>
                    <span className="text-sky-400 font-bold">{userQ1}°</span>
                  </div>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    value={userQ1}
                    onChange={(e) => setUserQ1(Number(e.target.value))}
                    className="w-full accent-sky-400"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Giunto 2 (q₂)</span>
                    <span className="text-orange-400 font-bold">{userQ2}°</span>
                  </div>
                  <input
                    type="range"
                    min="-185"
                    max="185"
                    value={userQ2}
                    onChange={(e) => setUserQ2(Number(e.target.value))}
                    className="w-full accent-orange-400"
                  />
                </div>
              </div>

              {/* Real-time score indicator */}
              <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-850 space-y-1.5 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Tuo End-Effector:</span>
                  <span className="text-slate-300">({userX.toFixed(2)}, {userY.toFixed(2)})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Errore Cartesiano:</span>
                  <span className={isChallengeSolved ? 'text-green-400 font-bold' : 'text-red-400'}>
                    {(userError * 100).toFixed(1)} cm
                  </span>
                </div>
              </div>

              {isChallengeSolved ? (
                <div className="bg-green-950/40 p-3.5 rounded-lg border border-green-800 flex items-center gap-2.5 text-xs text-green-300 font-sans leading-relaxed">
                  <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                  <div>
                    <strong>ECCO LA STRUTTURA!</strong> Ottimo lavoro, hai ottenuto le coordinate esonere. L'accuratezza è impeccabile (sotto i 5cm).
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 font-sans flex items-start gap-2 bg-slate-950/40 p-2.5 border border-slate-850 rounded">
                  <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <p>
                    <strong>Consiglio Analitico:</strong> Muovi anzitutto <span className="text-sky-400 font-bold">q₁</span> per ruotare l'intero manipolatore verso la retta immaginaria passante per il target, dopodiché compensa l'estensione di sormonto agendo su <span className="text-orange-400 font-bold">q₂</span>!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default IKSolver;
