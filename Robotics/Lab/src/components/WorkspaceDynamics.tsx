/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Settings, 
  HelpCircle, 
  TrendingUp, 
  ShieldAlert 
} from 'lucide-react';
import { Vector3D } from '../utils/kinematics';

export const WorkspaceDynamics: React.FC = () => {
  // 2R Robot limits
  const [q1, setQ1] = useState<number>(30);
  const [q2, setQ2] = useState<number>(60);
  
  const [l1, setL1] = useState<number>(1.0);
  const [l2, setL2] = useState<number>(0.8);

  // Sampling resolution
  const [sampleSize, setSampleSize] = useState<number>(2000);
  const [viewWorkspace, setViewWorkspace] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sampledCloudRef = useRef<{ x: number; y: number; w: number }[]>([]);

  // Sample the workspace for singularities on mount or geometry change
  useEffect(() => {
    const cloud: { x: number; y: number; w: number }[] = [];
    const maxW = l1 * l2; // theoretical max Yoshikawa manipulative index
    
    for (let i = 0; i < sampleSize; i++) {
      // Pick random joints
      const randQ1 = Math.random() * Math.PI * 2;
      const randQ2 = (Math.random() * Math.PI * 2) - Math.PI;

      // Forward kinematics coordinate points
      const x = l1 * Math.cos(randQ1) + l2 * Math.cos(randQ1 + randQ2);
      const y = l1 * Math.sin(randQ1) + l2 * Math.sin(randQ1 + randQ2);
      
      // local Yoshikawa w value
      const wValue = Math.abs(l1 * l2 * Math.sin(randQ2));
      const relativeW = wValue / maxW; // 0 to 1 ratio

      cloud.push({ x, y, w: relativeW });
    }
    sampledCloudRef.current = cloud;
  }, [l1, l2, sampleSize]);

  // Jacobian Matrix math
  const q1Rad = (q1 * Math.PI) / 180;
  const q2Rad = (q2 * Math.PI) / 180;

  // Joint positions
  const j1x = l1 * Math.cos(q1Rad);
  const j1y = l1 * Math.sin(q1Rad);
  const eeX = j1x + l2 * Math.cos(q1Rad + q2Rad);
  const eeY = j1y + l2 * Math.sin(q1Rad + q2Rad);

  // Velocity Columns component values
  const j1_colX = -l1 * Math.sin(q1Rad) - l2 * Math.sin(q1Rad + q2Rad);
  const j1_colY = l1 * Math.cos(q1Rad) + l2 * Math.cos(q1Rad + q2Rad);

  const j2_colX = -l2 * Math.sin(q1Rad + q2Rad);
  const j2_colY = l2 * Math.cos(q1Rad + q2Rad);

  const detJ = j1_colX * j2_colY - j1_colY * j2_colX;
  const absDet = Math.abs(detJ);
  const isNearSingularity = absDet < 0.15;

  // eigenvalues computation for 2D velocity ellipse mapping
  const a = j1_colX * j1_colX + j2_colX * j2_colX;
  const b = j1_colX * j1_colY + j2_colX * j2_colY;
  const d = j1_colY * j1_colY + j2_colY * j2_colY;

  const trace = a + d;
  const calcDet = a * d - b * b;
  const desc = Math.sqrt(Math.max(0, (trace / 2) ** 2 - calcDet));
  const l1_eigen = trace / 2 + desc;
  const l2_eigen = trace / 2 - desc;

  const s1_sigma = Math.sqrt(Math.max(0, l1_eigen));
  const s2_sigma = Math.sqrt(Math.max(0, l2_eigen));

  // rotation angle of ellipse
  const rotAngle = 0.5 * Math.atan2(2 * b, a - d);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const cx = W / 2;
    const cy = H * 0.5;
    const scale = 110;

    const proj = (x: number, y: number) => {
      return [cx + x * scale, cy - y * scale];
    };

    // 1. Draw sampled workspace point cloud with colored heatmaps of dexterity
    if (viewWorkspace && sampledCloudRef.current.length > 0) {
      for (const pt of sampledCloudRef.current) {
        const [px, py] = proj(pt.x, pt.y);
        
        // Low w (Singularity) -> Red. High w (Great Dexterity) -> slate-cyan
        let color = '';
        if (pt.w < 0.15) {
          color = 'rgba(239, 68, 68, 0.5)'; // Hot neon red
        } else if (pt.w < 0.4) {
          color = 'rgba(249, 115, 22, 0.15)'; // Orange transition
        } else {
          color = 'rgba(56, 189, 248, 0.04)'; // Subtle blue reachable
        }

        ctx.fillStyle = color;
        ctx.fillRect(px, py, 1.5, 1.5);
      }
    }

    // Coordinate Axes lines
    ctx.strokeStyle = 'rgba(71,85,105,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();

    // 2. Draw Robot Links
    const [ojX, ojY] = proj(0, 0);
    const [j1_X, j1_Y] = proj(j1x, j1y);
    const [ee_X, ee_Y] = proj(eeX, eeY);

    // Link 1
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ojX, ojY); ctx.lineTo(j1_X, j1_Y); ctx.stroke();
    ctx.strokeStyle = '#58a6ff'; // sky blue
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(ojX, ojY); ctx.lineTo(j1_X, j1_Y); ctx.stroke();

    // Link 2
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(j1_X, j1_Y); ctx.lineTo(ee_X, ee_Y); ctx.stroke();
    ctx.strokeStyle = '#d2a8ff'; // purple
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(j1_X, j1_Y); ctx.lineTo(ee_X, ee_Y); ctx.stroke();

    // Joints drawing
    ctx.fillStyle = '#ef4444'; ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(ojX, ojY, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#f97316';
    ctx.beginPath(); ctx.arc(j1_X, j1_Y, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#ec4899';
    ctx.beginPath(); ctx.arc(ee_X, ee_Y, 5.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    // 3. Draw velocity manipulability ellipse over the EE
    // scaled down for readability on screen
    const drawScale = 0.4 * scale;
    const ellR_major = Math.max(1, s1_sigma * drawScale);
    const ellR_minor = Math.max(1, s2_sigma * drawScale);

    ctx.save();
    ctx.translate(ee_X, ee_Y);
    ctx.rotate(-rotAngle);

    // Glow effects
    ctx.fillStyle = isNearSingularity ? 'rgba(239, 68, 68, 0.08)' : 'rgba(34, 197, 94, 0.05)';
    ctx.strokeStyle = isNearSingularity ? 'rgba(239, 68, 68, 0.6)' : 'rgba(34, 197, 94, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, ellR_major, ellR_minor, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 4. Draw Jacobian Column vector arrows (linear contribution) expanding from end effector!
    // Shows linear dependency visually when aligned.
    const renderArrow = (fromX: number, fromY: number, vecX: number, vecY: number, color: string, label: string) => {
      const scaleFactor = 0.25 * scale; // multiplier to represent vector on screen
      const toX = fromX + vecX * scaleFactor;
      const toY = fromY - vecY * scaleFactor;

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();

      // Arrow head
      const angle = Math.atan2(toY - fromY, toX - fromX);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(toX, toY);
      ctx.lineTo(toX - 8 * Math.cos(angle - Math.PI / 6), toY - 8 * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(toX - 8 * Math.cos(angle + Math.PI / 6), toY - 8 * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();

      // Vector label text
      ctx.fillStyle = color;
      ctx.font = 'bold 9px monospace';
      ctx.fillText(label, toX + 5, toY - 2);
    };

    // Vector col J1 (linear sky-blue) and J2 (linear orange)
    renderArrow(ee_X, ee_Y, j1_colX, j1_colY, '#38bdf8', 'J₁ (Giunto 1)');
    renderArrow(ee_X, ee_Y, j2_colX, j2_colY, '#f97316', 'J₂ (Giunto 2)');

  }, [q1, q2, l1, l2, viewWorkspace]);

  return (
    <div className="space-y-6">
      {/* Modulo Header */}
      <div className="border-b border-slate-800 pb-4">
        <span className="text-xs font-mono text-brand-errore tracking-wider uppercase font-bold">
          MODULO C — ANALISI COMPORTAMENTALE AL BORDO
        </span>
        <h1 className="text-2xl font-bold text-white tracking-tight font-display mt-0.5">
          Analizzatore di Singolarità e Jacobiano
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Delinea geometricamente le colinearità che annullano lo Jacobiano. In questa sezione, i punti Workspace rossi indicano le zone morte in cui il determinante cala o la traslazione si appiattisce interamente.
        </p>
      </div>

      {/* Main split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Canvas with overlay details */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-950 p-1 border border-slate-800 rounded-xl overflow-hidden relative">
            <span className="absolute top-3 left-4 text-[9px] font-mono tracking-widest text-slate-400 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded uppercase">
              Viewport Jacobiana locale & Ellissoide
            </span>
            <canvas
              ref={canvasRef}
              width={500}
              height={380}
              className="bg-gray-950 w-full block rounded-lg"
            />
          </div>

          {/* Singularity alarm warning banner */}
          {isNearSingularity ? (
            <div className="bg-rose-950/40 border border-rose-850 p-4 rounded-xl flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="block font-mono text-xs font-bold text-rose-300 uppercase">
                  CONDIZIONE DI SINGOLARITÀ ATTIVA — DET J ≈ 0
                </span>
                <p className="text-xs text-rose-250 mt-1">
                  Gli assi e le colonne Jacobiane <strong className="text-sky-400">J₁</strong> e{' '}
                  <strong className="text-orange-400">J₂</strong> sono coassiali o colineari (allineati).
                  In questa posa, l'ellissoide di manipolabilità si schiaccia interamente, indicando che la mobilità radiale è azzerata.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-950/20 border border-emerald-900/60 p-4 rounded-xl flex items-start gap-3 text-emerald-400">
              <TrendingUp className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <strong>Configurazione destreggiabile:</strong> Gli assi Jacobiani possiedono direzioni ortogonali generatrici distinte. L'ellissoide ricopre ampie aree spaziali sferiche.
              </div>
            </div>
          )}
        </div>

        {/* Right Side: parameters, sliders and algebraic telemetry block */}
        <div className="lg:col-span-5 space-y-6">
          {/* Sliders panel */}
          <div className="bg-slate-900/30 border border-slate-800 p-5 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-850 pb-2">
              <span className="font-display font-semibold text-sm text-slate-200">
                Regolatore Configurazione Spaziale
              </span>
              <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={viewWorkspace}
                  onChange={(e) => setViewWorkspace(e.target.checked)}
                  className="accent-cyan-500 rounded"
                />
                <span>Mappatura WS</span>
              </label>
            </div>

            {/* q1 */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Giunto 1 (q₁)</span>
                <span className="text-sky-400 font-bold">{q1.toFixed(0)}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                value={q1}
                onChange={(e) => setQ1(Number(e.target.value))}
                className="w-full accent-sky-450"
              />
            </div>

            {/* q2 */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Giunto 2 (q₂)</span>
                <span className="text-orange-400 font-bold">{q2.toFixed(0)}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                value={q2}
                onChange={(e) => setQ2(Number(e.target.value))}
                className="w-full accent-orange-450"
              />
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
              *Prova a settare <span className="text-orange-400 font-mono font-bold">q₂ = 0°</span> o{' '}
              <span className="text-orange-400 font-mono font-bold">q₂ = ±180°</span> per estendere o richiudere completamente l'avanbraccio ed innescare all'istante la singolarità!
            </p>
          </div>

          {/* Telemetry data matrices */}
          <div className="bg-slate-900/30 border border-slate-800 p-5 rounded-xl space-y-4">
            <span className="font-display font-semibold text-sm text-slate-200 block border-b border-slate-850 pb-2">
              📊 Matrice Jacobiana & Determinante
            </span>
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-850 relative">
                <span className="absolute top-1.5 right-2 text-[8px] tracking-wider text-slate-500 uppercase font-mono">
                  J_L linear mapper
                </span>
                <div className="text-cyan-400 font-bold mb-1">
                  J = [ [ J₁₁, J₂₁ ], [ J₂₁, J₂₂ ] ]
                </div>
                <div className="text-[11px] text-slate-300">
                  [{j1_colX.toFixed(3)}, {j2_colX.toFixed(3)}]
                  <br />
                  [{j1_colY.toFixed(3)}, {j2_colY.toFixed(3)}]
                </div>
              </div>

              {/* Yoshikawa and det trackers */}
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-slate-950 rounded border border-slate-850">
                  <span className="block text-[9px] uppercase font-bold text-slate-500 mb-0.5">det(J)</span>
                  <span className={`text-base font-bold ${isNearSingularity ? 'text-red-400' : 'text-green-400'}`}>
                    {detJ.toFixed(4)}
                  </span>
                </div>
                <div className="p-3 bg-slate-950 rounded border border-slate-850">
                  <span className="block text-[9px] uppercase font-bold text-slate-500 mb-0.5">Yoshikawa (w)</span>
                  <span className={`text-base font-bold ${isNearSingularity ? 'text-red-400' : 'text-green-400'}`}>
                    {absDet.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default WorkspaceDynamics;
