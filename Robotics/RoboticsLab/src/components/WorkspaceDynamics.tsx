/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Activity, Settings, HelpCircle, TrendingUp, ShieldAlert, Bookmark } from 'lucide-react';
import { Vector3D, ROBOT_PRESETS, forwardKinematics, computeJacobian, computeManipulability } from '../utils/kinematics';
import { DHParam } from '../types';

export const WorkspaceDynamics: React.FC = () => {
  const [activePreset, setActivePreset] = useState<string>('planar_2r');
  const [params, setParams] = useState<DHParam[]>(() => {
    return ROBOT_PRESETS['planar_2r'].params.map((p, index) => ({
      ...p,
      id: `joint_${index + 1}`
    }));
  });

  const [sampleSize, setSampleSize] = useState<number>(2000);
  const [viewWorkspace, setViewWorkspace] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sampledCloudRef = useRef<{ x: number; y: number; w: number }[]>([]);

  // Generic Math 
  const frames = forwardKinematics(params);
  const eePos = frames[frames.length - 1].origin;
  const { JL, JA } = computeJacobian(params, frames);
  
  // Calculate Generic Manipulability (using linear part JL only for 3D/2D)
  const slicedJL = params.length === 2 ? JL.slice(0, 2) : JL;
  const { w: absDet, sigmas, det: detJ } = computeManipulability(slicedJL);
  
  // For 2D drawing of ellipse components (only if 2D)
  const isNearSingularity = absDet < 0.15;
  const s1_sigma = sigmas[0] || 0;
  const s2_sigma = sigmas[1] || 0;
  let rotAngle = 0;
  if (params.length === 2 && slicedJL.length === 2) {
     const j1_colX = slicedJL[0][0], j1_colY = slicedJL[1][0];
     const j2_colX = slicedJL[0][1], j2_colY = slicedJL[1][1];
     const a = j1_colX * j1_colX + j2_colX * j2_colX;
     const b = j1_colX * j1_colY + j2_colX * j2_colY;
     const d = j1_colY * j1_colY + j2_colY * j2_colY;
     rotAngle = 0.5 * Math.atan2(2 * b, a - d);
  }

  // Load a preset robot
  const loadPreset = (key: string) => {
    const preset = ROBOT_PRESETS[key];
    if (preset) {
      setParams(preset.params.map((p, idx) => ({ ...p, id: `joint_${idx + 1}` })));
      setActivePreset(key);
    }
  };

  // Sample generic kinematic cloud (3D -> 2D projection)
  useEffect(() => {
    const cloud: { x: number; y: number; w: number }[] = [];
    let maxW = 0.001;
    
    // Perform N random configuration tests to map Workspace & Dexterity
    for (let i = 0; i < sampleSize * (params.length > 2 ? 3 : 1); i++) {
        const randParams = params.map(p => {
           const randVal = p.minLimit + Math.random()*(p.maxLimit - p.minLimit);
           return { ...p, value: randVal };
        });
        const rFrames = forwardKinematics(randParams);
        const rEE = rFrames[rFrames.length - 1].origin;
        const { JL: rJL } = computeJacobian(randParams, rFrames);
        const rSlicedJL = randParams.length === 2 ? rJL.slice(0, 2) : rJL;
        const { w } = computeManipulability(rSlicedJL);
        if (w > maxW) maxW = w;
        cloud.push({ x: rEE[0], y: rEE[1], w });
    }
    
    // Normalize w
    cloud.forEach(pt => { pt.w = pt.w / maxW; });
    sampledCloudRef.current = cloud;
  }, [params.length, activePreset, sampleSize]);

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

    // 2. Draw Robot Links dynamically
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < params.length; i++) {
        const pStart = frames[i].origin;
        const pMid = frames[i + 1].intermediate;
        const pEnd = frames[i + 1].origin;
        const [projStartX, projStartY] = proj(pStart[0], pStart[1]); // 2D proj for Workspace View
        const [projMidX, projMidY] = proj(pMid[0], pMid[1]);
        const [projEndX, projEndY] = proj(pEnd[0], pEnd[1]);

        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 8;
        ctx.beginPath(); 
        ctx.moveTo(projStartX, projStartY); 
        ctx.lineTo(projMidX, projMidY); 
        ctx.lineTo(projEndX, projEndY); 
        ctx.stroke();
        
        ctx.strokeStyle = params[i].jointType === 'R' ? '#58a6ff' : '#a78bfa'; 
        ctx.lineWidth = 4;
        ctx.beginPath(); 
        ctx.moveTo(projStartX, projStartY); 
        ctx.lineTo(projMidX, projMidY); 
        ctx.lineTo(projEndX, projEndY); 
        ctx.stroke();

        ctx.fillStyle = params[i].jointType === 'R' ? '#ef4444' : '#c084fc'; 
        ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(projStartX, projStartY, i === 0 ? 6 : 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    
    // EE Point
    const [ee_X, ee_Y] = proj(eePos[0], eePos[1]);
    ctx.fillStyle = '#ec4899';
    ctx.beginPath(); ctx.arc(ee_X, ee_Y, 5.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    // 3. Draw velocity manipulability ellipse over the EE
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

    // 4. Draw Jacobian Column vector arrows
    const renderArrow = (fromX: number, fromY: number, vecX: number, vecY: number, color: string, label: string) => {
      const scaleFactor = 0.25 * scale;
      const toX = fromX + vecX * scaleFactor;
      const toY = fromY - vecY * scaleFactor;

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(fromX, fromY); ctx.lineTo(toX, toY); ctx.stroke();

      const angle = Math.atan2(toY - fromY, toX - fromX);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(toX, toY);
      ctx.lineTo(toX - 8 * Math.cos(angle - Math.PI / 6), toY - 8 * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(toX - 8 * Math.cos(angle + Math.PI / 6), toY - 8 * Math.sin(angle + Math.PI / 6));
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = color;
      ctx.font = 'bold 9px monospace';
      ctx.fillText(label, toX + 5, toY - 2);
    };

    // Render primary 2D Jacobian columns from EE
    const colors = ['#38bdf8', '#f97316', '#a3e635', '#f472b6', '#a78bfa', '#fbbf24'];
    for(let i=0; i<Math.min(slicedJL[0]?.length || 0, 6); i++) {
        renderArrow(ee_X, ee_Y, slicedJL[0][i], slicedJL[1][i], colors[i%colors.length], `J${i+1}`);
    }

  }, [params, eePos, frames, viewWorkspace, s1_sigma, s2_sigma, rotAngle, isNearSingularity, slicedJL]);

  // Handle generic joint slider mapping
  const handleSliderChange = (idx: number, val: number) => {
    const updated = [...params];
    updated[idx] = { ...updated[idx], value: val };
    setParams(updated);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Modulo Header */}
      <div className="border-b border-slate-800 pb-4">
        <span className="text-xs font-mono text-brand-errore tracking-wider uppercase font-bold text-rose-400">
          MODULO C — ANALISI COMPORTAMENTALE AL BORDO
        </span>
        <h1 className="text-2xl font-bold text-white tracking-tight font-display mt-0.5">
          Analizzatore di Singolarità e Jacobiano Universale
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Delinea geometricamente le colinearità che annullano lo Jacobiano per qualsiasi architettura. In questa sezione, i punti Workspace rossi indicano le zone morte in cui il determinante cala o la traslazione si appiattisce interamente.
        </p>
      </div>

      {/* Preset Selector */}
      <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2 mb-3">
          <Bookmark className="w-4 h-4 text-rose-400" />
          <span className="font-mono text-xs font-bold text-slate-400 uppercase tracking-wider">
            Libreria Strutture (Per Analisi del Determinante)
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(ROBOT_PRESETS).map(([key, item]) => (
            <button
              key={key}
              onClick={() => loadPreset(key)}
              className={`px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors border ${
                activePreset === key
                  ? 'bg-rose-950 text-rose-300 border-rose-800/85'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Canvas with overlay details */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-950 p-1 border border-slate-800 rounded-xl overflow-hidden relative">
            <span className="absolute top-3 left-4 text-[9px] font-mono tracking-widest text-slate-400 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded uppercase">
              Viewport Jacobiana locale (Proiezione 2D base) & Ellissoide
            </span>
            <canvas
              ref={canvasRef}
              width={500}
              height={380}
              className="bg-gray-950 w-full block rounded-lg max-w-full"
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
                  Gli assi e le colonne Jacobiane sono coassiali o colineari.
                  In questa posa, l'ellissoide di manipolabilità si schiaccia interamente, indicando che la mobilità (Dexterity) è azzerata.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-950/20 border border-emerald-900/60 p-4 rounded-xl flex items-start gap-3 text-emerald-400">
              <TrendingUp className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <strong>Configurazione destreggiabile:</strong> Gli assi Jacobiani possiedono direzioni ortogonali generatrici distinte. L'ellissoide generico volume &gt; 0.
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

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {params.map((p, idx) => {
                 const isR = p.jointType === 'R';
                 return (
                  <div key={p.id} className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-400">Giunto {idx+1} (q_{idx+1})</span>
                      <span className="text-sky-400 font-bold">{p.value.toFixed(1)}{isR ? '°' : 'm'}</span>
                    </div>
                    <input
                      type="range"
                      min={p.minLimit}
                      max={p.maxLimit}
                      step={isR ? 1 : 0.05}
                      value={p.value}
                      onChange={(e) => handleSliderChange(idx, Number(e.target.value))}
                      className="w-full accent-sky-450"
                    />
                  </div>
                 );
              })}
            </div>
          </div>

          {/* Telemetry data matrices */}
          <div className="bg-slate-900/30 border border-slate-800 p-5 rounded-xl space-y-4">
            <span className="font-display font-semibold text-sm text-slate-200 block border-b border-slate-850 pb-2">
              📊 Matrice Jacobiana Lineare Estesa
            </span>
            <div className="space-y-3 font-mono text-xs overflow-x-auto">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-850 relative">
                <span className="absolute top-1.5 right-2 text-[8px] tracking-wider text-slate-500 uppercase font-mono">
                  J_L mapper
                </span>
                <div className="text-[10px] text-slate-300 leading-relaxed whitespace-nowrap">
                   {slicedJL.map((row, rIdx) => (
                      <div key={rIdx}>
                        [{row.map(v => v.toFixed(3).padStart(6, ' ')).join(', ')}]
                      </div>
                   ))}
                </div>
              </div>

              {/* Yoshikawa and det trackers */}
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-slate-950 rounded border border-slate-850">
                  <span className="block text-[9px] uppercase font-bold text-slate-500 mb-0.5">det(JJᵀ) o (J)</span>
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
