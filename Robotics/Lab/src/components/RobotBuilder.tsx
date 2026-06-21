/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Plus, 
  Trash2, 
  RefreshCw, 
  HelpCircle,
  Cpu,
  Bookmark
} from 'lucide-react';
import { DHParam, RobotPreset } from '../types';
import { MathText } from './Math';
import { 
  forwardKinematics, 
  computeJacobian, 
  computeManipulability, 
  ROBOT_PRESETS,
  Vector3D,
  FrameInfo
} from '../utils/kinematics';

export const RobotBuilder: React.FC = () => {
  // Initialize with Planar 2R as default
  const [params, setParams] = useState<DHParam[]>(() => {
    return ROBOT_PRESETS.planar_2r.params.map((p, index) => ({
      ...p,
      id: `joint_${index + 1}`
    }));
  });

  const [activePreset, setActivePreset] = useState<string>('planar_2r');
  const [viewMode, setViewMode] = useState<'xy' | 'xz' | 'yz' | '3d'>('xy');
  const [showAxes, setShowAxes] = useState<boolean>(true);
  const [showTrail, setShowTrail] = useState<boolean>(true);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trailRef = useRef<Vector3D[]>([]);

  // Clear trail when robot geometry is rebuilt
  useEffect(() => {
    trailRef.current = [];
  }, [params.length, activePreset]);

  // Load a preset robot
  const loadPreset = (key: string) => {
    const preset = ROBOT_PRESETS[key];
    if (preset) {
      setParams(preset.params.map((p, idx) => ({
        ...p,
        id: `joint_${idx + 1}`
      })));
      setActivePreset(key);
      trailRef.current = [];
    }
  };

  // Add a new joint to the end of the DH table
  const addJoint = () => {
    const newIdx = params.length + 1;
    const newJoint: DHParam = {
      id: `joint_${Date.now()}`,
      jointType: 'R',
      alpha: 0,
      a: 0.5,
      d: 0.0,
      theta: 0,
      value: 0,
      minLimit: -180,
      maxLimit: 180
    };
    setParams([...params, newJoint]);
  };

  // Remove joint by index
  const deleteJoint = (index: number) => {
    if (params.length <= 1) return; // Must have at least 1 joint
    const updated = params.filter((_, i) => i !== index);
    setParams(updated);
    trailRef.current = [];
  };

  // Modify cell value in DH Table
  const updateParamValue = (index: number, key: keyof DHParam, val: string | number) => {
    const updated = [...params];
    const item = { ...updated[index] };

    if (key === 'jointType') {
      item.jointType = val as 'R' | 'P';
      // Adjust default limits and values when switching types
      if (item.jointType === 'P') {
        item.minLimit = 0.0;
        item.maxLimit = 1.0;
        item.value = 0.4;
      } else {
        item.minLimit = -180;
        item.maxLimit = 180;
        item.value = 45;
      }
    } else {
      (item as any)[key] = Number(val);
    }

    updated[index] = item;
    setParams(updated);
  };

  // Slide joint values
  const handleSliderChange = (index: number, val: number) => {
    const updated = [...params];
    updated[index] = { ...updated[index], value: val };
    setParams(updated);
  };

  // Mathematical logic computations
  const frames = forwardKinematics(params);
  const eePos = frames[frames.length - 1].origin;
  const { JL, JA } = computeJacobian(params, frames);

  // We take 2D linear Jacobian components to compute 2D ellipsoids
  const { w, sigmas, det } = computeManipulability(JL.slice(0, 2));

  // Add EE to trail
  useEffect(() => {
    if (showTrail) {
      const last = trailRef.current[trailRef.current.length - 1];
      if (!last || Math.hypot(last[0]-eePos[0], last[1]-eePos[1], last[2]-eePos[2]) > 0.01) {
        trailRef.current.push([...eePos]);
        if (trailRef.current.length > 250) trailRef.current.shift(); // Bound size
      }
    }
  }, [eePos, showTrail]);

  // Paint onto Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Center offset
    const cx = W / 2;
    const cy = H * 0.65;
    const scale = 110; // multiplier to convert meters to pixels

    // Projection utilities
    const project = (pt: Vector3D): [number, number] => {
      const [x, y, z] = pt;
      if (viewMode === 'xy') {
        return [cx + x * scale, cy - y * scale];
      } else if (viewMode === 'xz') {
        return [cx + x * scale, cy - z * scale];
      } else if (viewMode === 'yz') {
        return [cx + y * scale, cy - z * scale];
      } else {
        // Cabinet 3D Military Projection
        const theta = -Math.PI / 6; // 30 deg
        const k = 0.54; // shrink depth axis y
        const px = x + y * Math.cos(theta) * k;
        const py = z + y * Math.sin(theta) * k;
        return [cx + px * scale, cy - py * scale];
      }
    };

    // 1. Grid
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.25)';
    ctx.lineWidth = 1;
    for (let i = -4; i <= 4; i++) {
      // Horizontal lines
      ctx.beginPath();
      const p1 = project([-3, i, 0]);
      const p2 = project([3, i, 0]);
      ctx.moveTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.stroke();

      // Vertical lines
      ctx.beginPath();
      const p3 = project([i, -3, 0]);
      const p4 = project([i, 3, 0]);
      ctx.moveTo(p3[0], p3[1]);
      ctx.lineTo(p4[0], p4[1]);
      ctx.stroke();
    }

    // 2. Base coordinate axes indicator
    if (showAxes) {
      const originProj = project([0, 0, 0]);
      const axisLen = 0.35;
      const ax = project([axisLen, 0, 0]);
      const ay = project([0, axisLen, 0]);
      const az = project([0, 0, axisLen]);

      // X-Axis (Red)
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(originProj[0], originProj[1]);
      ctx.lineTo(ax[0], ax[1]);
      ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.font = '9px monospace';
      ctx.fillText('X0', ax[0] + 3, ax[1] + 3);

      // Y-Axis (Cyan)
      ctx.strokeStyle = '#06b6d4';
      ctx.beginPath();
      ctx.moveTo(originProj[0], originProj[1]);
      ctx.lineTo(ay[0], ay[1]);
      ctx.stroke();
      ctx.fillStyle = '#06b6d4';
      ctx.fillText('Y0', ay[0] + 3, ay[1] + 3);

      // Z-Axis (Green)
      ctx.strokeStyle = '#22c55e';
      ctx.beginPath();
      ctx.moveTo(originProj[0], originProj[1]);
      ctx.lineTo(az[0], az[1]);
      ctx.stroke();
      ctx.fillStyle = '#22c55e';
      ctx.fillText('Z0 (Giunto 1)', az[0] + 3, az[1] - 3);
    }

    // 3. Draw movement trail (EF scia)
    if (showTrail && trailRef.current.length > 1) {
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.55)'; // Pink glow
      ctx.lineWidth = 1.5;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      const pStart = project(trailRef.current[0]);
      ctx.moveTo(pStart[0], pStart[1]);
      for (let i = 1; i < trailRef.current.length; i++) {
        const pt = project(trailRef.current[i]);
        ctx.lineTo(pt[0], pt[1]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 4. Draw Robot Links & joints frame-by-frame
    ctx.lineCap = 'round';
    for (let i = 0; i < params.length; i++) {
      const pStart = frames[i].origin;
      const pEnd = frames[i + 1].origin;
      const projStart = project(pStart);
      const projEnd = project(pEnd);

      // Draw link outline (shadow cylinder)
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(projStart[0], projStart[1]);
      ctx.lineTo(projEnd[0], projEnd[1]);
      ctx.stroke();

      // Draw real link link line
      ctx.strokeStyle = params[i].jointType === 'R' ? '#58a6ff' : '#a78bfa'; // sky blue for R, purple for P
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(projStart[0], projStart[1]);
      ctx.lineTo(projEnd[0], projEnd[1]);
      ctx.stroke();

      // Show DH axes on intermediate joints
      if (showAxes) {
        const axLen = 0.22;
        const xDir = frames[i + 1].xAxis;
        const zDir = frames[i + 1].zAxis;
        const ptX = project([pEnd[0] + xDir[0]*axLen, pEnd[1] + xDir[1]*axLen, pEnd[2] + xDir[2]*axLen]);
        const ptZ = project([pEnd[0] + zDir[0]*axLen, pEnd[1] + zDir[1]*axLen, pEnd[2] + zDir[2]*axLen]);

        // Frame indicator lines
        // x_i (Red)
        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(projEnd[0], projEnd[1]);
        ctx.lineTo(ptX[0], ptX[1]);
        ctx.stroke();
        ctx.fillStyle = '#f87171';
        ctx.fillText(`x${i+1}`, ptX[0] + 2, ptX[1] + 2);

        // z_i (Green)
        ctx.strokeStyle = '#4ade80';
        ctx.beginPath();
        ctx.moveTo(projEnd[0], projEnd[1]);
        ctx.lineTo(ptZ[0], ptZ[1]);
        ctx.stroke();
        ctx.fillStyle = '#4ade80';
        ctx.fillText(`z${i+1}`, ptZ[0] + 2, ptZ[1] - 2);
      }

      // Draw joint markers
      const jointType = params[i].jointType;
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 1.5;

      if (jointType === 'R') {
        // Revolute: Draw Circle
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(projStart[0], projStart[1], i === 0 ? 8 : 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        // Prismatic: Draw Square
        ctx.fillStyle = '#c084fc';
        const sz = i === 0 ? 12 : 10;
        ctx.beginPath();
        ctx.rect(projStart[0] - sz/2, projStart[1] - sz/2, sz, sz);
        ctx.fill();
        ctx.stroke();
      }
    }

    // 5. Draw End-effector indicator
    const eePt = project(eePos);
    ctx.fillStyle = '#ec4899'; // Hot pink EF
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(eePt[0], eePt[1], 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Hot pink glowing halo
    ctx.strokeStyle = 'rgba(236,72,153,0.3)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(eePt[0], eePt[1], 10, 0, Math.PI * 2);
    ctx.stroke();

    // End-effector label
    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 11px Inter, system-ui';
    ctx.fillText('EE', eePt[0] + 11, eePt[1] - 4);

    // Coordinate text
    ctx.fillStyle = 'rgba(241, 245, 249, 0.9)';
    ctx.font = '10px monospace';
    ctx.fillText(`X:${eePos[0].toFixed(2)} Y:${eePos[1].toFixed(2)} Z:${eePos[2].toFixed(2)}`, eePt[0] + 11, eePt[1] + 9);

  }, [params, viewMode, showTrail, showAxes, eePos, frames]);

  // Reactive "Feedback Strutturale" - Structural mathematical DK equations builder
  const getStructuralEquations = () => {
    switch (activePreset) {
      case 'planar_2r':
        return (
          <div className="space-y-2 text-xs font-mono leading-relaxed">
            <p>
              <span className="text-slate-500">// Robot Planare 2R: Il sormonto trigonometrico puro</span>
            </p>
            <p>
              P_x ={' '}
              <strong className="text-cyan-400">a₁</strong> · <strong className="text-purple-400">c₁</strong> +{' '}
              <strong className="text-cyan-400">a₂</strong> · <strong className="text-purple-400">c₁₂</strong>
            </p>
            <p>
              P_y ={' '}
              <strong className="text-cyan-400">a₁</strong> · <strong className="text-pink-400">s₁</strong> +{' '}
              <strong className="text-cyan-400">a₂</strong> · <strong className="text-pink-400">s₁₂</strong>
            </p>
            <p>P_z = 0</p>
            <p className="text-[10px] text-slate-400 font-sans italic mt-1 bg-slate-900 border border-slate-800 p-2 rounded">
              Nota l'accoppiamento geometrico dei segni: elevando al quadrato <MathText math="P_x^2 + P_y^2" /> compare l'identità fondamentale <MathText math="c_1c_{12} + s_1s_{12} = \cos(q_2)" /> che svincola completamente l'angolo dal primo link!
            </p>
          </div>
        );
      case 'planar_3r':
        return (
          <div className="space-y-2 text-xs font-mono leading-relaxed">
            <p>
              <span className="text-slate-500">// Robot Planare 3R (Ridondante)</span>
            </p>
            <p>
              P_x = <strong className="text-cyan-400">a₁</strong> · <strong className="text-purple-400">c₁</strong> +{' '}
              <strong className="text-cyan-400">a₂</strong> · <strong className="text-purple-400">c₁₂</strong> +{' '}
              <strong className="text-cyan-400">a₃</strong> · <strong className="text-purple-400">c₁₂₃</strong>
            </p>
            <p>
              P_y = <strong className="text-pink-400">a₁·s₁</strong> + <strong className="text-pink-400">a₂·s₁₂</strong> +{' '}
              <strong className="text-pink-400">a₃·s₁₂₃</strong>
            </p>
            <p>P_z = 0</p>
          </div>
        );
      case 'scara':
        return (
          <div className="space-y-2 text-xs font-mono leading-relaxed">
            <p>
              <span className="text-slate-500">// SCARA - Disaccoppiamento asse verticale</span>
            </p>
            <p>
              P_x = <strong className="text-cyan-400">a₁</strong> · <strong className="text-purple-400">c₁</strong> +{' '}
              <strong className="text-cyan-400">a₂</strong> · <strong className="text-purple-400">c₁₂</strong>
            </p>
            <p>
              P_y = <strong className="text-pink-400">a₁·s₁</strong> + <strong className="text-pink-400">a₂·s₁₂</strong>
            </p>
            <p>
              P_z = <strong className="text-amber-400">d₃ (Prismatico Verticale)</strong>{' '}
              <span className="text-slate-500"> + d₄</span>
            </p>
            <p className="text-[10px] text-slate-400 font-sans italic mt-1 bg-slate-900 border border-slate-800 p-2 rounded">
              Nello SCARA, la traslazione verticale <MathText math="d_3" /> è disaccoppiata dal piano orizzontale. Lo Jacobiano lineare contiene semplicemente una colonna <MathText math="[0, 0, 1]^T" /> indipendentemente dagli angoli!
            </p>
          </div>
        );
      default:
        return (
          <div className="space-y-2 text-xs font-mono leading-relaxed">
            <p>
              <span className="text-slate-500">// Struttura del Risultato Generale (DK)</span>
            </p>
            <p className="text-slate-200">
              Posizione EE calcolata numericamente dal manipolatore omogeneo:
            </p>
            <p className="text-cyan-400">X = {eePos[0].toFixed(4)} m</p>
            <p className="text-emerald-400">Y = {eePos[1].toFixed(4)} m</p>
            <p className="text-purple-400">Z = {eePos[2].toFixed(4)} m</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Modulo Header */}
      <div className="border-b border-slate-800 pb-4">
        <span className="text-xs font-mono text-cyan-400 tracking-wider uppercase font-bold">
          MODULO A — CINEMATICA & MODERNE STRUTTURE DH
        </span>
        <h1 className="text-2xl font-bold text-white tracking-tight font-display mt-0.5">
          DH Robot Builder & Visualizer
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Configura e manipola qualsiasi topologia di braccio robotico inserendo i parametri di Denavit-Hartenberg. Muovi i giunti con i regolatori, visualizza la scia e l'accoppiamento matematico.
        </p>
      </div>

      {/* Preset Buttons Grid */}
      <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2 mb-3">
          <Bookmark className="w-4 h-4 text-cyan-400" />
          <span className="font-mono text-xs font-bold text-slate-400 uppercase tracking-wider">
            Presets Didattici Esame d'Esempio
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(ROBOT_PRESETS).map(([key, item]) => (
            <button
              key={key}
              onClick={() => loadPreset(key)}
              className={`px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors border ${
                activePreset === key
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-800/85'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 italic mt-3.5 bg-slate-950/40 p-2.5 rounded border border-slate-800/50">
          {ROBOT_PRESETS[activePreset]?.description || 'Seleziona un modello d\'esame per simulare.'}
        </p>
      </div>

      {/* Main Workspace split */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Section: DH Table & sliders (7 cols) */}
        <div className="xl:col-span-7 space-y-6">
          {/* DH Parameter Table Input */}
          <div className="bg-slate-900/30 rounded-xl border border-slate-800 overflow-hidden">
            <div className="p-4 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
              <span className="font-display font-semibold text-sm text-slate-200">
                Tabella Denavit-Hartenberg (DH)
              </span>
              <button
                onClick={addJoint}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/50 hover:bg-cyan-900 text-xs font-medium cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Aggiungi Giunto
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900/40 text-slate-400 border-b border-slate-800 font-mono text-[10px] uppercase tracking-wider">
                    <th className="p-3 text-center">Giunto</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3">α (Twist °)</th>
                    <th className="p-3">a (Link m)</th>
                    <th className="p-3">d (Sfilo m)</th>
                    <th className="p-3">θ (Angolo °)</th>
                    <th className="p-3 text-center">Azione</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {params.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-slate-900/20 font-mono">
                      {/* Joint Index */}
                      <td className="p-3 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>

                      {/* Joint Type R or P */}
                      <td className="p-2">
                        <select
                          value={p.jointType}
                          onChange={(e) => updateParamValue(idx, 'jointType', e.target.value)}
                          className="bg-slate-950 text-cyan-400 border border-slate-800 rounded p-1 text-xs focus:outline-none focus:border-cyan-600 font-mono"
                        >
                          <option value="R">R (Revoluto)</option>
                          <option value="P">P (Prismatico)</option>
                        </select>
                      </td>

                      {/* alpha */}
                      <td className="p-2">
                        <input
                          type="number"
                          step="90"
                          value={p.alpha}
                          onChange={(e) => updateParamValue(idx, 'alpha', e.target.value)}
                          className="w-16 bg-slate-950 border border-slate-800 rounded p-1 text-xs focus:outline-none focus:border-slate-700"
                        />
                      </td>

                      {/* a */}
                      <td className="p-2">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={p.a}
                          onChange={(e) => updateParamValue(idx, 'a', e.target.value)}
                          className="w-16 bg-slate-950 border border-slate-800 rounded p-1 text-xs focus:outline-none focus:border-slate-700"
                        />
                      </td>

                      {/* d */}
                      <td className="p-2">
                        <input
                          type="number"
                          step="0.1"
                          value={p.d}
                          disabled={p.jointType === 'P'}
                          onChange={(e) => updateParamValue(idx, 'd', e.target.value)}
                          className={`w-16 bg-slate-950 border border-slate-800 rounded p-1 text-xs focus:outline-none focus:border-slate-700 ${
                            p.jointType === 'P' ? 'opacity-40 line-through' : ''
                          }`}
                        />
                      </td>

                      {/* theta */}
                      <td className="p-2">
                        <input
                          type="number"
                          step="15"
                          value={p.theta}
                          disabled={p.jointType === 'R'}
                          onChange={(e) => updateParamValue(idx, 'theta', e.target.value)}
                          className={`w-16 bg-slate-950 border border-slate-800 rounded p-1 text-xs focus:outline-none focus:border-slate-700 ${
                            p.jointType === 'R' ? 'opacity-40 line-through' : ''
                          }`}
                        />
                      </td>

                      {/* Actions */}
                      <td className="p-2 text-center">
                        <button
                          onClick={() => deleteJoint(idx)}
                          disabled={params.length <= 1}
                          className="p-1 text-red-400 hover:bg-red-950/30 rounded transition-colors disabled:opacity-30 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Joint Value Sliders (Movable Variables) */}
          <div className="bg-slate-900/30 rounded-xl border border-slate-800 p-5 space-y-4">
            <span className="font-display font-semibold text-sm text-slate-200 block border-b border-slate-850 pb-2">
              Regolazione Dinamica dei Giunti (Variabili qᵢ)
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {params.map((p, idx) => {
                const isR = p.jointType === 'R';
                return (
                  <div key={p.id} className="space-y-1.5 p-3 rounded-lg bg-slate-950/40 border border-slate-850">
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="text-slate-400 font-bold">
                        q_{idx + 1} ({isR ? 'Rotazione' : 'Sfilo'})
                      </span>
                      <span className="text-cyan-400 font-semibold">
                        {p.value.toFixed(2)}{isR ? '°' : ' m'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={p.minLimit}
                      max={p.maxLimit}
                      step={isR ? 1 : 0.05}
                      value={p.value}
                      onChange={(e) => handleSliderChange(idx, Number(e.target.value))}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                      <span>{p.minLimit}</span>
                      <span>{p.maxLimit}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Section: Canvas viewport & reactive equations (5 cols) */}
        <div className="xl:col-span-5 space-y-6">
          {/* Visualizer viewport with switches */}
          <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden relative">
            {/* Viewport Control Bar */}
            <div className="p-3 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-sans font-medium">Vista:</span>
                {(['xy', 'xz', 'yz', '3d'] as const).map((view) => (
                  <button
                    key={view}
                    onClick={() => setViewMode(view)}
                    className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider cursor-pointer ${
                      viewMode === view
                        ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/50'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {view}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1 cursor-pointer text-slate-400 font-medium">
                  <input
                    type="checkbox"
                    checked={showAxes}
                    onChange={(e) => setShowAxes(e.target.checked)}
                    className="accent-cyan-500 rounded"
                  />
                  <span>Assi</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer text-slate-400 font-medium">
                  <input
                    type="checkbox"
                    checked={showTrail}
                    onChange={(e) => setShowTrail(e.target.checked)}
                    className="accent-cyan-500 rounded"
                  />
                  <span>Scia EE</span>
                </label>
              </div>
            </div>

            {/* Canvas graphic viewport */}
            <canvas
              ref={canvasRef}
              width={460}
              height={380}
              className="bg-gray-950 w-full block"
            />
          </div>

          {/* Feedback Strutturale - reactive mathematical equations mapping */}
          <div className="bg-slate-900/30 p-5 rounded-xl border border-slate-800 space-y-3">
            <span className="font-display font-semibold text-sm text-slate-200 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block animate-pulse"></span>
              Feedback Strutturale (Cinematica Diretta)
            </span>
            <p className="text-xs text-slate-400">
              Osserva la conformazione delle equazioni geometriche e come si compongono nel tempo reale manipolando le coordinate:
            </p>
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-850">
              {getStructuralEquations()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default RobotBuilder;
