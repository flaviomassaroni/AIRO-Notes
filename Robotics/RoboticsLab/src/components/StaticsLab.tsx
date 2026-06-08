/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Sliders, 
  HelpCircle,
  TrendingUp,
  Award,
  Zap,
  Move,
  Info
} from 'lucide-react';
import { MathText } from './Math';

export const StaticsLab: React.FC = () => {
  // Kinematic parameters
  const l1 = 1.0;
  const l2 = 0.8;

  // Joint Angles
  const [q1, setQ1] = useState<number>(45); // deg
  const [q2, setQ2] = useState<number>(60); // deg

  // Force vector applied at End-Effector (N)
  const [fx, setFx] = useState<number>(-25.0);
  const [fy, setFy] = useState<number>(-15.0);

  // States
  const [torque1, setTorque1] = useState<number>(0);
  const [torque2, setTorque2] = useState<number>(0);
  const [jacobianDet, setJacobianDet] = useState<number>(0);
  const [manipulability, setManipulability] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingRef = useRef<boolean>(false);

  // Recompute Statics whenever q1, q2, fx or fy change
  useEffect(() => {
    const r1 = (q1 * Math.PI) / 180;
    const r2 = (q2 * Math.PI) / 180;

    // Jacobian column terms J = [J11 J12; J21 J22]
    const J11 = -l1 * Math.sin(r1) - l2 * Math.sin(r1 + r2);
    const J12 = -l2 * Math.sin(r1 + r2);
    const J21 = l1 * Math.cos(r1) + l2 * Math.cos(r1 + r2);
    const J22 = l2 * Math.cos(r1 + r2);

    // Tau = J^T * F
    const t1 = J11 * fx + J21 * fy;
    const t2 = J12 * fx + J22 * fy;

    // Determinant J
    // det(J) = l1 * l2 * sin(q2)
    const det = l1 * l2 * Math.sin(r2);

    setTorque1(t1);
    setTorque2(t2);
    setJacobianDet(det);
    setManipulability(Math.abs(det));

    drawStatics();
  }, [q1, q2, fx, fy]);

  // Handle canvas drag events
  const getCanvasMousePosition = (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = getCanvasMousePosition(e);

    // Position of end effector in pixel
    const scale = 110;
    const cx = canvas.width / 2;
    const cy = canvas.height * 0.65;

    const r1 = (q1 * Math.PI) / 180;
    const r2 = (q2 * Math.PI) / 180;
    const eex = l1 * Math.cos(r1) + l2 * Math.cos(r1 + r2);
    const eey = l1 * Math.sin(r1) + l2 * Math.sin(r1 + r2);

    const eePixelX = cx + eex * scale;
    const eePixelY = cy - eey * scale;

    // Check if clicked close to end-effector
    const dist = Math.sqrt(Math.pow(x - eePixelX, 2) + Math.pow(y - eePixelY, 2));
    if (dist < 22) {
      isDraggingRef.current = true;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { x, y } = getCanvasMousePosition(e);
    const scale = 110;
    const cx = canvas.width / 2;
    const cy = canvas.height * 0.65;

    const r1 = (q1 * Math.PI) / 180;
    const r2 = (q2 * Math.PI) / 180;
    const eex = l1 * Math.cos(r1) + l2 * Math.cos(r1 + r2);
    const eey = l1 * Math.sin(r1) + l2 * Math.sin(r1 + r2);

    const eePixelX = cx + eex * scale;
    const eePixelY = cy - eey * scale;

    // Applied Force is represented as scaling force arrow length
    // 1px = 0.5 Newton
    const forceCoeff = 0.45;
    const computedFx = (x - eePixelX) * forceCoeff;
    const computedFy = -(y - eePixelY) * forceCoeff; // Flip Y for graphics conversion

    // Limit forces inside standard threshold
    setFx(Math.max(-80, Math.min(80, computedFx)));
    setFy(Math.max(-80, Math.min(80, computedFy)));
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
  };

  // Rendering graphics on the canvas (robot + force arrow + ellipsoids!)
  const drawStatics = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const scale = 110;
    const cx = W / 2;
    const cy = H * 0.65;

    const r1 = (q1 * Math.PI) / 180;
    const r2 = (q2 * Math.PI) / 180;

    // Joint positions
    const j1x = l1 * Math.cos(r1);
    const j1y = l1 * Math.sin(r1);
    const eex = j1x + l2 * Math.cos(r1 + r2);
    const eey = j1y + l2 * Math.sin(r1 + r2);

    const proj = (x: number, y: number) => [cx + x * scale, cy - y * scale];

    const [oxProj, oyProj] = proj(0, 0);
    const [j1ProjX, j1ProjY] = proj(j1x, j1y);
    const [eeProjX, eeProjY] = proj(eex, eey);

    // Draw grid background
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();

    // Trace ELLIPSOIDS center at (150, 80)
    // We compute Singular Value Decomposition of J * JT to plot
    const J11 = -l1 * Math.sin(r1) - l2 * Math.sin(r1 + r2);
    const J12 = -l2 * Math.sin(r1 + r2);
    const J21 = l1 * Math.cos(r1) + l2 * Math.cos(r1 + r2);
    const J22 = l2 * Math.cos(r1 + r2);

    // J * JT Matrix components
    const A11 = J11 * J11 + J12 * J12;
    const A12 = J11 * J21 + J12 * J22;
    const A22 = J21 * J21 + J22 * J22;

    // SVD eigenvalues and angles from J*JT
    const tr = A11 + A22;
    const disc = Math.sqrt(Math.pow(A11 - A22, 2) + 4 * A12 * A12);
    const valMax = (tr + disc) / 2;
    const valMin = Math.max(0.0001, (tr - disc) / 2);

    const sigma1 = Math.sqrt(valMax); // Major axis length in velocity
    const sigma2 = Math.sqrt(valMin); // Minor axis length in velocity

    const angleEll = 0.5 * Math.atan2(2 * A12, A11 - A22);

    // Render original Velocity Ellipsoid (glowing green/cyan)
    const ellCx = cx - 145;
    const ellCy = cy - 110;

    ctx.save();
    ctx.translate(ellCx, ellCy);
    ctx.rotate(-angleEll); // flip screen vertical coordinate rotation
    
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.fillStyle = 'rgba(34, 197, 94, 0.04)';
    ctx.beginPath();
    ctx.ellipse(0, 0, sigma1 * 34, sigma2 * 34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Render FORCE ellipsoid (dual, inverse of J*JT, showing force direction capacity, amber red)
    // SVD lengths of J^-T are reciprocal: 1 / sigma2, 1 / sigma1
    const fSigma1 = l1 * l2 / Math.max(0.01, sigma2); // Force capacity is high in directions where velocity is low!
    const fSigma2 = l1 * l2 / Math.max(0.01, sigma1);

    ctx.save();
    ctx.translate(ellCx, ellCy);
    ctx.rotate(-angleEll);
    
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.fillStyle = 'rgba(249, 115, 22, 0.04)';
    ctx.beginPath();
    ctx.ellipse(0, 0, fSigma2 * 12, fSigma1 * 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Ellipsoids title and legend
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 8px monospace';
    ctx.fillText('🔴 ELLISSOIDE VELOCITÀ J*Jᵀ', ellCx - 48, ellCy - 48);
    ctx.fillStyle = '#f97316';
    ctx.fillText('🟠 ELLISSOIDE FORZA (J*Jᵀ)⁻¹', ellCx - 48, ellCy + 56);

    // Draw double-circle to locate ellipsoid anchor
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath(); ctx.arc(ellCx, ellCy, 3, 0, Math.PI * 2); ctx.stroke();

    // Draw mechanical Links
    // Link 1
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(oxProj, oyProj); ctx.lineTo(j1ProjX, j1ProjY); ctx.stroke();
    ctx.strokeStyle = '#38bdf8'; // Sky blue Link
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(oxProj, oyProj); ctx.lineTo(j1ProjX, j1ProjY); ctx.stroke();

    // Link 2
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(j1ProjX, j1ProjY); ctx.lineTo(eeProjX, eeProjY); ctx.stroke();
    ctx.strokeStyle = '#c084fc'; // elegant Purple Link
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(j1ProjX, j1ProjY); ctx.lineTo(eeProjX, eeProjY); ctx.stroke();

    // Node joints
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 2;

    // Joint 1
    ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(oxProj, oyProj, 7.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.arc(oxProj, oyProj, 3.5, 0, Math.PI * 2); ctx.fill();

    // Joint 2
    ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(j1ProjX, j1ProjY, 6.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c084fc'; ctx.beginPath(); ctx.arc(j1ProjX, j1ProjY, 3, 0, Math.PI * 2); ctx.fill();

    // Interactive Force Vector Arrow dragging rendered from End-effector
    const forceLengthCoeff = 2.2;
    const forceArrowX = eeProjX + fx * forceLengthCoeff;
    const forceArrowY = eeProjY - fy * forceLengthCoeff; // invert for graphics coordinate system

    ctx.strokeStyle = '#ec4899'; // vivid pink
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(eeProjX, eeProjY);
    ctx.lineTo(forceArrowX, forceArrowY);
    ctx.stroke();

    // Force arrowhead
    const arrowAngle = Math.atan2(forceArrowY - eeProjY, forceArrowX - eeProjX);
    const arrowSize = 9;
    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.moveTo(forceArrowX, forceArrowY);
    ctx.lineTo(
      forceArrowX - arrowSize * Math.cos(arrowAngle - Math.PI / 6),
      forceArrowY - arrowSize * Math.sin(arrowAngle - Math.PI / 6)
    );
    ctx.lineTo(
      forceArrowX - arrowSize * Math.cos(arrowAngle + Math.PI / 6),
      forceArrowY - arrowSize * Math.sin(arrowAngle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();

    // Outer Target EE locator circle
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(eeProjX, eeProjY, 7, 0, Math.PI * 2); ctx.stroke();

    // Text labels
    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 9px Inter';
    ctx.fillText(`F = [${fx.toFixed(1)}, ${fy.toFixed(1)}]ᵀ N`, forceArrowX + 11, forceArrowY - 3);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '8px monospace';
    ctx.fillText('TRASCINA LA PUNTA PER APPLICARE FORZA', eeProjX - 85, eeProjY + 25);
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      {/* Page Title Section */}
      <div className="border-b border-slate-800 pb-4">
        <span className="text-xs font-mono text-cyan-400 tracking-wider uppercase font-bold text-pink-400">
          MODULO D E DUALITÀ — STATICA DEI MANIPOLATORI
        </span>
        <h1 className="text-2xl font-bold text-white tracking-tight font-display mt-0.5">
          Equilibrio statico interattivo & dualità cinetico-statica
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Investiga l'equazione fondamentale delle forze ed equilibri energetici virtuali <code className="text-cyan-300 font-mono text-pink-400">{"\u03C4 = J\u1D40 F"}</code>. Trascina direttamente l'end-effector della struttura 2R planar per generare una forza esterna e osserva la trasmissione delle coppie sui motori. Confronta graficamente la distorsione geometrica fra sforzo permissibile e velocità cartesian.
        </p>
      </div>

      {/* Main split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left canvas: Interactive Drag representation */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-950 p-1 border border-slate-800 rounded-xl overflow-hidden relative">
            <span className="absolute top-3 left-4 text-[9px] font-mono tracking-widest text-cyan-400 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded uppercase text-pink-400 border-pink-800/40 bg-pink-950/40">
              Grafica Interattiva Transizione Statica-Forza (2R Robot)
            </span>

            <canvas
              ref={canvasRef}
              width={500}
              height={335}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUpOrLeave}
              onMouseLeave={handleMouseUpOrLeave}
              className="bg-gray-950 w-full block rounded-lg cursor-grab active:cursor-grabbing"
            />
          </div>

          {/* Educational banner explanation concerning Dual Kineto-Statics */}
          <div className="p-4 bg-slate-900/30 border border-slate-800 rounded-xl flex gap-3.5 leading-relaxed text-xs">
            <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5 text-pink-400" />
            <div className="space-y-1 text-slate-350">
              <span className="font-bold text-[10px] tracking-wider uppercase font-mono text-cyan-300 block text-pink-400">
                ANALISI ACCADEMICA DI DUALITÀ CINETICO-STATICA
              </span>
              <p>
                La dualità sancisce che i motori debbano fornire un'alta coppia statica <MathText math="\tau" /> per opporsi alle forze dirette lungo l'allineamento dei link. Al contrario, quando il braccio è in <strong>singolarità bordo</strong> (completamente allungato, <MathText math="q_2 = 0" />), la coppia richiesta per resistere a una forza perfettamente parallela al braccio è <strong>pari a zero</strong>!
              </p>
              <p className="mt-1">
                La forza esterna viene scaricata interamente attraverso l'asse fisico del giunto invece di fare sforzo sull'attuatore. Questo è simboleggiato graficamente dall'ellipsoide di forza <strong className="text-orange-400">grosso</strong> in asse e l'ellissoide di velocità ridotto ad una linea <strong className="text-green-400">schiacciata</strong> (rango perso).
              </p>
            </div>
          </div>
        </div>

        {/* Right canvas: Parametrics and torque indicators */}
        <div className="lg:col-span-5 space-y-5">
          {/* Section 1: Joint Configuration */}
          <div className="bg-slate-900/30 border border-slate-800 p-4 rounded-xl space-y-3.5">
            <span className="font-display font-semibold text-xs text-slate-400 uppercase tracking-wider block">
              🔧 Configura Posa Struttura
            </span>
            
            {/* q1 */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Angolo Giunto 1 (q₁)</span>
                <span className="text-sky-400 font-bold">{q1}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                value={q1}
                onChange={(e) => setQ1(Number(e.target.value))}
                className="w-full accent-sky-505 accent-sky-400"
              />
            </div>

            {/* q2 */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Angolo Giunto 2 (q₂)</span>
                <span className="text-purple-400 font-bold">{q2}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                value={q2}
                onChange={(e) => setQ2(Number(e.target.value))}
                className="w-full accent-purple-505 accent-purple-400"
              />
            </div>
          </div>

          {/* Section 2: Applied Force Override Sliders */}
          <div className="bg-slate-900/30 border border-slate-800 p-4 rounded-xl space-y-3">
            <span className="font-display font-semibold text-xs text-slate-400 uppercase tracking-wider block">
              ⚡ Componenti Vettore Forza Esterna
            </span>
            
            {/* fx */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-450">Componente Forza Fx</span>
                <span className="text-pink-400 font-bold">{fx.toFixed(1)} N</span>
              </div>
              <input
                type="range"
                min="-80"
                max="80"
                step="1"
                value={fx}
                onChange={(e) => setFx(Number(e.target.value))}
                className="w-full accent-pink-500"
              />
            </div>

            {/* fy */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-455">Componente Forza Fy</span>
                <span className="text-pink-400 font-bold">{fy.toFixed(1)} N</span>
              </div>
              <input
                type="range"
                min="-80"
                max="80"
                step="1"
                value={fy}
                onChange={(e) => setFy(Number(e.target.value))}
                className="w-full accent-pink-500"
              />
            </div>
          </div>

          {/* Section 3: Dual Equilibrum Torques outputs */}
          <div className="bg-slate-900/30 border border-slate-800 p-4 rounded-xl space-y-4">
            <span className="font-display font-semibold text-xs text-slate-200 uppercase tracking-wider block border-b border-slate-850 pb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-pink-400" /> Coppie Risolte di Equilibrio Statico
            </span>

            {/* Torque 1 Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-sky-300 w-32 truncate">Coppia Giunto Spalla (τ₁)</span>
                <span className="text-slate-200 font-bold ml-1">{torque1.toFixed(3)} Nm</span>
              </div>
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden relative border border-slate-850">
                <div 
                  className={`h-full transition-all duration-150 ${torque1 >= 0 ? 'bg-sky-500' : 'bg-red-400'}`}
                  style={{
                    width: `${Math.min(100, (Math.abs(torque1) / 100) * 100)}%`,
                    marginLeft: torque1 < 0 ? 'auto' : '0'
                  }}
                />
              </div>
            </div>

            {/* Torque 2 Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-purple-300 w-32 truncate">Coppia Giunto Gomito (τ₂)</span>
                <span className="text-slate-200 font-bold ml-1">{torque2.toFixed(3)} Nm</span>
              </div>
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden relative border border-slate-850">
                <div 
                  className={`h-full transition-all duration-150 ${torque2 >= 0 ? 'bg-purple-500' : 'bg-red-400'}`}
                  style={{
                    width: `${Math.min(100, (Math.abs(torque2) / 100) * 100)}%`,
                    marginLeft: torque2 < 0 ? 'auto' : '0'
                  }}
                />
              </div>
            </div>

            {/* Algebraic verification */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-850 font-mono text-[10.5px] space-y-1 text-slate-350">
              <span className="text-[9px] text-[#22c55e] font-bold uppercase tracking-wider block border-b border-slate-850/60 pb-1 mb-1 text-pink-400">
                Verifica Prodotto Duale
              </span>
              <div className="flex justify-between">
                <span>Determinante J(q):</span>
                <span className={Math.abs(jacobianDet) < 0.05 ? 'text-rose-450 font-bold' : 'text-slate-300'}>
                  {jacobianDet.toFixed(4)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Yoshikawa d'Inseguimento:</span>
                <span className="text-emerald-400 font-bold">{manipulability.toFixed(4)}</span>
              </div>
              <div className="text-[8.5px] text-slate-500 pt-1 leading-normal border-t border-slate-850/60 break-all">
                L'equazione risolta è:<br />
                <code className="text-white bg-slate-900 border border-slate-800 p-0.5 rounded break-all whitespace-pre-wrap block mt-0.5">{"[ \u03C4\u2081, \u03C4\u2082 ]\u1D40 = [ J\u2081\u2081 J\u2082\u25AC; J\u2081\u2082 J\u2082\u2082 ] [ Fx, Fy ]\u1D40"}</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaticsLab;
