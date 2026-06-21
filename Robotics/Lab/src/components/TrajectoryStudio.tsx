/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Spline, 
  Sparkles, 
  Activity, 
  Clock, 
  FileText, 
  AlertOctagon 
} from 'lucide-react';

interface Datapoint {
  t: number;
  cubicPos: number; cubicVel: number; cubicAcc: number;
  quinticPos: number; quinticVel: number; quinticAcc: number;
  trapPos: number; trapVel: number; trapAcc: number;
}

export const TrajectoryStudio: React.FC = () => {
  // Motion parameters
  const [qi, setQi] = useState<number>(0.0);
  const [qf, setQf] = useState<number>(3.0);
  const [duration, setDuration] = useState<number>(4.0); // T in seconds

  // Constraints boundary sliders
  const [vMax, setVMax] = useState<number>(1.2); // max permitted speed
  const [aMax, setAMax] = useState<number>(0.9); // max permitted acceleration

  const posCanvasRef = useRef<HTMLCanvasElement>(null);
  const velCanvasRef = useRef<HTMLCanvasElement>(null);
  const accCanvasRef = useRef<HTMLCanvasElement>(null);

  const [datapoints, setDatapoints] = useState<Datapoint[]>([]);
  const [violations, setViolations] = useState<{
    cubicV: boolean; cubicA: boolean;
    quinticV: boolean; quinticA: boolean;
    trapV: boolean; trapA: boolean;
  }>({
    cubicV: false, cubicA: false,
    quinticV: false, quinticA: false,
    trapV: false, trapA: false,
  });

  const [tMinTrap, setTMinTrap] = useState<number>(0);

  // Re-calculate the curves
  useEffect(() => {
    const L = qf - qi;
    const absL = Math.abs(L);
    const N = 150; // sampling steps
    const computedPoints: Datapoint[] = [];

    // Suggestions on minimum time for trapezoid
    const tMin = (absL * aMax + vMax * vMax) / (aMax * vMax);
    setTMinTrap(tMin);

    let maxCubicV = 0, maxCubicA = 0;
    let maxQuinticV = 0, maxQuinticA = 0;
    let maxTrapV = 0, maxTrapA = 0;

    for (let i = 0; i <= N; i++) {
      const t = (duration * i) / N;
      const tau = duration > 0 ? t / duration : 0;

      // 1. Cubic Polynomial Profile
      // Standard conditions: q(0)=qi, q(T)=qf, q_dot(0)=0, q_dot(T)=0
      // q(t) = qi + (3*tau^2 - 2*tau^3)*L
      const cPos = qi + (3 * tau * tau - 2 * tau * tau * tau) * L;
      const cVel = duration > 0 ? (6 * tau - 6 * tau * tau) * L / duration : 0;
      const cAcc = duration > 0 ? (6 - 12 * tau) * L / (duration * duration) : 0;

      maxCubicV = Math.max(maxCubicV, Math.abs(cVel));
      maxCubicA = Math.max(maxCubicA, Math.abs(cAcc));

      // 2. Quintic Polynomial Profile
      // Terms ensuring q_dot(0)=q_dot(T)=q_ddot(0)=q_ddot(T)=0
      const s_quintic = 10 * Math.pow(tau, 3) - 15 * Math.pow(tau, 4) + 6 * Math.pow(tau, 5);
      const ds_quintic = 30 * Math.pow(tau, 2) - 60 * Math.pow(tau, 3) + 30 * Math.pow(tau, 4);
      const dds_quintic = 60 * tau - 180 * Math.pow(tau, 2) + 120 * Math.pow(tau, 3);

      const qPos = qi + L * s_quintic;
      const qVel = duration > 0 ? L * ds_quintic / duration : 0;
      const qAcc = duration > 0 ? L * dds_quintic / (duration * duration) : 0;

      maxQuinticV = Math.max(maxQuinticV, Math.abs(qVel));
      maxQuinticA = Math.max(maxQuinticA, Math.abs(qAcc));

      // 3. Trapezoidal Profile (Bang-Coast-Bang)
      // Standard symmetrical profiles, assuming boundary constraint limits
      let tPos = qi;
      let tVel = 0;
      let tAcc = 0;

      // Symmetrical ramp parameters
      // If duration is too small or limits too narrow, it might contract to a triangle profile
      const isTriMode = absL < (vMax * vMax / aMax); 
      
      if (!isTriMode) {
        // Symmetrical trapezoid
        const tc = vMax / aMax; // speed up time
        if (duration >= 2 * tc) {
          const v_plat = vMax * (L > 0 ? 1 : -1);
          const a_plat = aMax * (L > 0 ? 1 : -1);

          if (t <= tc) {
            tPos = qi + 0.5 * a_plat * t * t;
            tVel = a_plat * t;
            tAcc = a_plat;
          } else if (t <= duration - tc) {
            const posTc = qi + 0.5 * a_plat * tc * tc;
            tPos = posTc + v_plat * (t - tc);
            tVel = v_plat;
            tAcc = 0;
          } else {
            const tfRem = duration - t;
            tPos = qf - 0.5 * a_plat * tfRem * tfRem;
            tVel = a_plat * tfRem;
            tAcc = -a_plat;
          }
        } else {
          // If T is too short to reach standard trapezoid, we scale acceleration
          const t_acc_limit = duration / 2;
          const a_scaled = (4 * L) / (duration * duration);
          const v_peak = a_scaled * t_acc_limit;
          
          if (t <= t_acc_limit) {
            tPos = qi + 0.5 * a_scaled * t * t;
            tVel = a_scaled * t;
            tAcc = a_scaled;
          } else {
            const rem_t = duration - t;
            tPos = qf - 0.5 * a_scaled * rem_t * rem_t;
            tVel = a_scaled * rem_t;
            tAcc = -a_scaled;
          }
        }
      } else {
        // Triangle Profile
        const tc = Math.sqrt(absL / aMax);
        const a_plat = aMax * (L > 0 ? 1 : -1);
        if (duration >= 2 * tc) {
          // Triangle reachable in given duration: we must scale peak velocity
          const v_peak = (2 * L) / duration;
          const a_eff = (2 * v_peak) / duration;

          if (t <= duration / 2) {
            tPos = qi + 0.5 * a_eff * t * t;
            tVel = a_eff * t;
            tAcc = a_eff;
          } else {
            const rem_t = duration - t;
            tPos = qf - 0.5 * a_eff * rem_t * rem_t;
            tVel = a_eff * rem_t;
            tAcc = -a_eff;
          }
        } else {
          // Under-timed triangle, accelerated at full aMax
          const halfT = duration / 2;
          const a_eff = aMax * (L > 0 ? 1 : -1);
          if (t <= halfT) {
            tPos = qi + 0.5 * a_eff * t * t;
            tVel = a_eff * t;
            tAcc = a_eff;
          } else {
            const rem_t = duration - t;
            tPos = qf - 0.5 * a_eff * rem_t * rem_t;
            tVel = a_eff * rem_t;
            tAcc = -a_eff;
          }
        }
      }

      maxTrapV = Math.max(maxTrapV, Math.abs(tVel));
      maxTrapA = Math.max(maxTrapA, Math.abs(tAcc));

      computedPoints.push({
        t,
        cubicPos: cPos, cubicVel: cVel, cubicAcc: cAcc,
        quinticPos: qPos, quinticVel: qVel, quinticAcc: qAcc,
        trapPos: tPos, trapVel: tVel, trapAcc: tAcc
      });
    }

    setDatapoints(computedPoints);

    // Compute constraints violations state
    setViolations({
      cubicV: maxCubicV > vMax, cubicA: maxCubicA > aMax,
      quinticV: maxQuinticV > vMax, quinticA: maxQuinticA > aMax,
      trapV: maxTrapV > vMax, trapA: maxTrapA > aMax,
    });

  }, [qi, qf, duration, vMax, aMax]);

  // Draw plots onto Canvas
  const paintPlot = (
    canvas: HTMLCanvasElement | null, 
    type: 'pos' | 'vel' | 'acc', 
    titleY: string
  ) => {
    if (!canvas || datapoints.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const padL = 40;
    const padR = 20;
    const padY = 25;
    const pW = W - padL - padR;
    const pH = H - 2 * padY;

    // Get max ranges for scaling
    let minVal = 0;
    let maxVal = 0;

    if (type === 'pos') {
      minVal = Math.min(qi, qf, 0);
      maxVal = Math.max(qi, qf, 1);
    } else if (type === 'vel') {
      // Scale based on both generated points and max boundary limits to view clipping
      minVal = -vMax * 1.25;
      maxVal = vMax * 1.25;
    } else {
      minVal = -aMax * 1.45;
      maxVal = aMax * 1.45;
    }

    const range = maxVal - minVal || 1.0;

    const px = (t: number) => padL + (t / duration) * pW;
    const py = (val: number) => padY + pH - ((val - minVal) / range) * pH;

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      // Horizontal fractional lines
      const frac = minVal + (i / 4) * range;
      const y = py(frac);
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
      
      // text labels on Y
      ctx.fillStyle = '#64748b';
      ctx.font = '8px monospace';
      ctx.fillText(frac.toFixed(1), 5, y + 3);
    }

    // Zero-line highlights
    const zY = py(0);
    if (zY >= padY && zY <= padY + pH) {
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(padL, zY); ctx.lineTo(W - padR, zY); ctx.stroke();
    }

    // Draw constraint limits as horizontal dashes (Red zones)
    if (type === 'vel') {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      
      ctx.beginPath(); ctx.moveTo(padL, py(vMax)); ctx.lineTo(W - padR, py(vMax)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(padL, py(-vMax)); ctx.lineTo(W - padR, py(-vMax)); ctx.stroke();
      ctx.setLineDash([]);
      
      ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
      ctx.fillText('+vMax', W - padR - 35, py(vMax) - 4);
      ctx.fillText('-vMax', W - padR - 35, py(-vMax) + 10);
    } else if (type === 'acc') {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      
      ctx.beginPath(); ctx.moveTo(padL, py(aMax)); ctx.lineTo(W - padR, py(aMax)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(padL, py(-aMax)); ctx.lineTo(W - padR, py(-aMax)); ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
      ctx.fillText('+aMax', W - padR - 35, py(aMax) - 4);
      ctx.fillText('-aMax', W - padR - 35, py(-aMax) + 10);
    }

    // Draw curves
    const drawCurve = (
      points: number[], 
      color: string, 
      width: number, 
      isViolatedList: boolean
    ) => {
      ctx.strokeStyle = isViolatedList ? '#ef4444' : color; // Glow red if violated!
      ctx.lineWidth = isViolatedList ? width + 1.2 : width;
      ctx.beginPath();
      ctx.moveTo(px(datapoints[0].t), py(points[0]));
      for (let i = 1; i < datapoints.length; i++) {
        ctx.lineTo(px(datapoints[i].t), py(points[i]));
      }
      ctx.stroke();
    };

    // Plot lines
    if (type === 'pos') {
      drawCurve(datapoints.map(d => d.cubicPos), '#38bdf8', 1.5, false); // Cyan Cubic
      drawCurve(datapoints.map(d => d.quinticPos), '#c084fc', 1.5, false); // Purple Quintic
      drawCurve(datapoints.map(d => d.trapPos), '#fb923c', 2, false); // Orange Trapezoid
    } else if (type === 'vel') {
      drawCurve(datapoints.map(d => d.cubicVel), '#38bdf8', 1.5, violations.cubicV);
      drawCurve(datapoints.map(d => d.quinticVel), '#c084fc', 1.5, violations.quinticV);
      drawCurve(datapoints.map(d => d.trapVel), '#fb923c', 2.2, violations.trapV);
    } else {
      drawCurve(datapoints.map(d => d.cubicAcc), '#38bdf8', 1.5, violations.cubicA);
      drawCurve(datapoints.map(d => d.quinticAcc), '#c084fc', 1.5, violations.quinticA);
      drawCurve(datapoints.map(d => d.trapAcc), '#fb923c', 2.2, violations.trapA);
    }

    // Title label overlay
    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 10px Inter';
    ctx.fillText(titleY, padL + 6, 15);
  };

  useEffect(() => {
    paintPlot(posCanvasRef.current, 'pos', 'Posizione q(t) [rad]');
    paintPlot(velCanvasRef.current, 'vel', 'Velocità q_dot(t) [rad/s]');
    paintPlot(accCanvasRef.current, 'acc', 'Accelerazione q_ddot(t) [rad/s²]');
  }, [datapoints, violations, vMax, aMax]);

  return (
    <div className="space-y-6">
      {/* Modulo Header */}
      <div className="border-b border-slate-800 pb-4">
        <span className="text-xs font-mono text-brand-warning tracking-wider uppercase font-bold">
          MODULO D — PIANIFICAZIONE DI TRAIETTORIE TEMPO-OTTIMALATE
        </span>
        <h1 className="text-2xl font-bold text-white tracking-tight font-display mt-0.5">
          Trajectory Planning Studio
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Compara i profili polinomiali con le leggi orarie trapezoidali simmetriche sotto vincoli fisici d'attuatore. Le tratteggiate indicano i limiti geometrici: se una curva li interseca, il grafico diventa rosso.
        </p>
      </div>

      {/* Split inputs and curves */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive limit sliders (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Pos and duration settings */}
          <div className="bg-slate-900/30 border border-slate-800 p-5 rounded-xl space-y-4">
            <span className="font-display font-semibold text-sm text-slate-200 block border-b border-slate-850 pb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" /> Parametri di Moto
            </span>
            <div className="space-y-3">
              {/* qi */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Posizione Iniziale (qᵢ)</span>
                  <span className="text-slate-200">{qi.toFixed(1)} rad</span>
                </div>
                <input
                  type="range"
                  min="-3"
                  max="3"
                  step="0.1"
                  value={qi}
                  onChange={(e) => setQi(Number(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>

              {/* qf */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Posizione Finale (q_f)</span>
                  <span className="text-slate-200">{qf.toFixed(1)} rad</span>
                </div>
                <input
                  type="range"
                  min="-3"
                  max="5"
                  step="0.1"
                  value={qf}
                  onChange={(e) => setQf(Number(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>

              {/* Duration T */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Durata desiderata (T)</span>
                  <span className="text-cyan-400 font-bold">{duration.toFixed(1)} s</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="10"
                  step="0.1"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Actuator bounds physical limits */}
          <div className="bg-slate-900/30 border border-slate-800 p-5 rounded-xl space-y-4">
            <span className="font-display font-semibold text-sm text-slate-200 block border-b border-slate-850 pb-2 flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-warning" /> Vincoli Attuatore (Limiti)
            </span>
            <div className="space-y-3">
              {/* vMax */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Velocità Consentita (v_max)</span>
                  <span className="text-red-400 font-semibold">{vMax.toFixed(2)} rad/s</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="4"
                  step="0.05"
                  value={vMax}
                  onChange={(e) => setVMax(Number(e.target.value))}
                  className="w-full accent-red-400"
                />
              </div>

              {/* aMax */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Accelerazione Consentita (a_max)</span>
                  <span className="text-red-400 font-semibold">{aMax.toFixed(2)} rad/s²</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.05"
                  value={aMax}
                  onChange={(e) => setAMax(Number(e.target.value))}
                  className="w-full accent-red-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Comparative charts layout (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Violation triggers check */}
          {(violations.cubicV ||
            violations.cubicA ||
            violations.quinticV ||
            violations.quinticA ||
            violations.trapV ||
            violations.trapA) && (
            <div className="bg-rose-950/40 border border-rose-800/80 rounded-xl p-4 flex items-start gap-3">
              <AlertOctagon className="w-5 h-5 text-rose-500 shrink-0 mt-0.5 animate-bounce" />
              <div>
                <span className="block font-mono text-xs font-bold text-rose-300 uppercase">
                  ⚠️ ACCELERAZIONE O VELOCITÀ FUORI VINCOLO!
                </span>
                <p className="text-xs text-rose-200 mt-1 leading-relaxed">
                  Il profilo temporale ha superato le capacità d'attuazione specificate. All'esame, per pianificare la legge oraria trapezoidale tempo-ottima senza saturazione magnetica dei motori, impiega questo tempo minimo:
                </p>
                <div className="mt-2.5 bg-slate-950 p-2 rounded border border-slate-800 font-mono text-center text-xs text-brand-warning">
                  T_minimo = (L·a_max + v_max²) / (a_max·v_max) ≈{' '}
                  <span className="font-bold underline text-brand-successo">
                    {tMinTrap.toFixed(2)} secondi
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Symmetrical Charts Panels Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-slate-950 p-1 border border-slate-800 rounded-lg">
              <canvas ref={posCanvasRef} width={220} height={180} className="w-full block" />
            </div>
            <div className="bg-slate-950 p-1 border border-slate-800 rounded-lg">
              <canvas ref={velCanvasRef} width={220} height={180} className="w-full block" />
            </div>
            <div className="bg-slate-950 p-1 border border-slate-800 rounded-lg">
              <canvas ref={accCanvasRef} width={220} height={180} className="w-full block" />
            </div>
          </div>

          {/* Graph Legend marker */}
          <div className="bg-slate-900/30 border border-slate-850 px-4 py-2.5 rounded-lg flex justify-center gap-6 text-[10px] uppercase tracking-wider font-mono">
            <span className="flex items-center gap-1.5 font-bold">
              <span className="w-2.5 h-0.5 inline-block bg-[#38bdf8]"></span>
              <span className="text-[#38bdf8]">Cubica (3° Ordine)</span>
            </span>
            <span className="flex items-center gap-1.5 font-bold">
              <span className="w-2.5 h-0.5 inline-block bg-[#c084fc]"></span>
              <span className="text-[#c084fc]">Quintica (5° Ordine)</span>
            </span>
            <span className="flex items-center gap-1.5 font-bold">
              <span className="w-2.5 h-0.5 inline-block bg-[#fb923c]"></span>
              <span className="text-[#fb923c]">Trapezoidale (Bang-Coast-Bang)</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default TrajectoryStudio;
