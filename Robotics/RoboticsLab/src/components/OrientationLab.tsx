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
  Rotate3d,
  ChevronRight,
  Info,
  CircleDot
} from 'lucide-react';
import { MathText } from './Math';

// Constants
const SEQUENCES = [
  { name: 'XYZ', axes: [0, 1, 2] }, { name: 'XZY', axes: [0, 2, 1] },
  { name: 'YXZ', axes: [1, 0, 2] }, { name: 'YZX', axes: [1, 2, 0] },
  { name: 'ZXY', axes: [2, 0, 1] }, { name: 'ZYX', axes: [2, 1, 0] },
  { name: 'XYX', axes: [0, 1, 0] }, { name: 'XZX', axes: [0, 2, 0] },
  { name: 'YXY', axes: [1, 0, 1] }, { name: 'YZY', axes: [1, 2, 1] },
  { name: 'ZXZ', axes: [2, 0, 2] }, { name: 'ZYZ', axes: [2, 1, 2] },
];

const BASE = [
  [1, 0, 0], [0, 1, 0], [0, 0, 1]
];

// Quaternion types and functions
type Quaternion = [number, number, number, number]; // [w, x, y, z]

const eulToQuat = (r: number, p: number, y: number): Quaternion => {
  const cr = Math.cos(r / 2);
  const sr = Math.sin(r / 2);
  const cp = Math.cos(p / 2);
  const sp = Math.sin(p / 2);
  const cy = Math.cos(y / 2);
  const sy = Math.sin(y / 2);

  return [
    cr * cp * cy + sr * sp * sy,
    sr * cp * cy - cr * sp * sy,
    cr * sp * cy + sr * cp * sy,
    cr * cp * sy - sr * sp * cy
  ];
};

const quatToRotMat = (q: Quaternion): number[][] => {
  const [w, x, y, z] = q;
  return [
    [1 - 2*y*y - 2*z*z, 2*x*y - 2*w*z,     2*x*z + 2*w*y],
    [2*x*y + 2*w*z,     1 - 2*x*x - 2*z*z, 2*y*z - 2*w*x],
    [2*x*z - 2*w*y,     2*y*z + 2*w*x,     1 - 2*x*x - 2*y*y]
  ];
};

const slerp = (q0: Quaternion, q1: Quaternion, t: number): Quaternion => {
  let cosHalfTheta = q0[0]*q1[0] + q0[1]*q1[1] + q0[2]*q1[2] + q0[3]*q1[3];
  let q1_tilde = [...q1] as Quaternion;

  if (cosHalfTheta < 0) {
    cosHalfTheta = -cosHalfTheta;
    q1_tilde = [-q1[0], -q1[1], -q1[2], -q1[3]];
  }

  if (Math.abs(cosHalfTheta) >= 1.0) {
    return q0;
  }

  const halfTheta = Math.acos(cosHalfTheta);
  const sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta * cosHalfTheta);

  if (Math.abs(sinHalfTheta) < 0.001) {
    return [
      (1 - t) * q0[0] + t * q1_tilde[0],
      (1 - t) * q0[1] + t * q1_tilde[1],
      (1 - t) * q0[2] + t * q1_tilde[2],
      (1 - t) * q0[3] + t * q1_tilde[3]
    ];
  }

  const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
  const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;

  return [
    q0[0] * ratioA + q1_tilde[0] * ratioB,
    q0[1] * ratioA + q1_tilde[1] * ratioB,
    q0[2] * ratioA + q1_tilde[2] * ratioB,
    q0[3] * ratioA + q1_tilde[3] * ratioB
  ];
};

export const OrientationLab: React.FC = () => {
  // Analytical Grid States
  const [currentSeqIdx, setCurrentSeqIdx] = useState<number>(11); // ZYZ defaults
  const [alpha, setAlpha] = useState<number>(30);  // deg
  const [beta, setBeta] = useState<number>(60);   // deg
  const [gamma, setGamma] = useState<number>(45);  // deg

  // Interpolator States
  const [lerpSlerpType, setLerpSlerpType] = useState<'lerp' | 'slerp'>('slerp');
  const [interpTime, setInterpTime] = useState<number>(0.0); // 0 to 1
  const [interpolatorAutoPlay, setInterpolatorAutoPlay] = useState<boolean>(true);

  // Custom Key orientations (Euler roll, pitch, yaw in degrees)
  const [startRoll, setStartRoll] = useState<number>(30);
  const [startPitch, setStartPitch] = useState<number>(10);
  const [startYaw, setStartYaw] = useState<number>(0);

  const [endRoll, setEndRoll] = useState<number>(150);
  const [endPitch, setEndPitch] = useState<number>(80);
  const [endYaw, setEndYaw] = useState<number>(90);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Auto incremental interpolation loop
  useEffect(() => {
    let animationId = 0;
    let lastTime = performance.now();

    const loop = (timestamp: number) => {
      const dt = (timestamp - lastTime) / 1000;
      lastTime = timestamp;

      if (interpolatorAutoPlay) {
        setInterpTime(prev => {
          let next = prev + dt * 0.28; // takes ~3 seconds per sweep
          if (next > 1.0) {
            next = 0.0; // loops back
          }
          return next;
        });
      }

      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [interpolatorAutoPlay]);

  // Redraw 3D Orientation visualizer whenever variables shift
  useEffect(() => {
    render3DFrame();
  }, [interpTime, lerpSlerpType, startRoll, startPitch, startYaw, endRoll, endPitch, endYaw]);

  // Calculate analytical matrix values
  const getEulerRotX = (t: number) => [[1,0,0],[0,Math.cos(t),-Math.sin(t)],[0,Math.sin(t),Math.cos(t)]];
  const getEulerRotY = (t: number) => [[Math.cos(t),0,Math.sin(t)],[0,1,0],[-Math.sin(t),0,Math.cos(t)]];
  const getEulerRotZ = (t: number) => [[Math.cos(t),-Math.sin(t),0],[Math.sin(t),Math.cos(t),0],[0,0,1]];

  const getR = (idx: number, t: number) => {
    if (idx === 0) return getEulerRotX(t);
    if (idx === 1) return getEulerRotY(t);
    return getEulerRotZ(t);
  };

  const mat33xvec = (M: number[][], v: number[]): number[] => {
    return [
      M[0][0]*v[0] + M[0][1]*v[1] + M[0][2]*v[2],
      M[1][0]*v[0] + M[1][1]*v[1] + M[1][2]*v[2],
      M[2][0]*v[0] + M[2][1]*v[1] + M[2][2]*v[2],
    ];
  };

  const mat33mul = (A: number[][], B: number[][]): number[][] => {
    const R = [[0,0,0],[0,0,0],[0,0,0]];
    for(let i=0; i<3; i++) {
      for(let j=0; j<3; j++) {
        for(let k=0; k<3; k++) {
          R[i][j] += A[i][k] * B[k][j];
        }
      }
    }
    return R;
  };

  const det3x3 = (M: number[][]): number => {
    return M[0][0]*(M[1][1]*M[2][2]-M[1][2]*M[2][1])
          -M[0][1]*(M[1][0]*M[2][2]-M[1][2]*M[2][0])
          +M[0][2]*(M[1][0]*M[2][1]-M[1][1]*M[2][0]);
  };

  const rank3x3 = (M: number[][]): number => {
    const A = M.map(r=>[...r]);
    const tol = 1e-6;
    let r = 0;
    for(let c=0; c<3 && r<3; c++) {
      let pivot = -1;
      for(let i=r; i<3; i++) {
        if(Math.abs(A[i][c]) > tol) {
          pivot = i;
          break;
        }
      }
      if(pivot < 0) continue;
      [A[r], A[pivot]] = [A[pivot], A[r]];
      const f = A[r][c];
      for(let j=c; j<3; j++) A[r][j] /= f;
      for(let i=0; i<3; i++) {
        if(i !== r) {
          const g = A[i][c];
          for(let j=c; j<3; j++) A[i][j] -= g * A[r][j];
        }
      }
      r++;
    }
    return r;
  };

  const computeT = (axes: number[], a: number, b: number, g: number): number[][] => {
    const R1 = getR(axes[0], a);
    const R2 = getR(axes[1], b);
    const R3 = getR(axes[2], g);

    const u1 = [...BASE[axes[0]]];
    const u2 = [...BASE[axes[1]]];
    const u3 = [...BASE[axes[2]]];

    const col3 = u3;
    const col2 = mat33xvec(R3, u2);
    const col1 = mat33xvec(mat33mul(R3, R2), u1);

    return [
      [col1[0], col2[0], col3[0]],
      [col1[1], col2[1], col3[1]],
      [col1[2], col2[2], col3[2]],
    ];
  };

  // Evaluate analytical configurations for layout
  const selectedSeq = SEQUENCES[currentSeqIdx];
  const t_alpha = (alpha * Math.PI) / 180;
  const t_beta = (beta * Math.PI) / 180;
  const t_gamma = (gamma * Math.PI) / 180;

  const T_matrix = computeT(selectedSeq.axes, t_alpha, t_beta, t_gamma);
  const detT = det3x3(T_matrix);
  const rankT = rank3x3(T_matrix);
  const isSingular = Math.abs(detT) < 1e-4 || rankT < 3;
  const isEulerian = selectedSeq.axes[0] === selectedSeq.axes[2];

  // Specific column coincidence check
  const col1 = [T_matrix[0][0], T_matrix[1][0], T_matrix[2][0]];
  const col3 = [T_matrix[0][2], T_matrix[1][2], T_matrix[2][2]];
  const col1EqualCol3 = col1.every((val, i) => Math.abs(val - col3[i]) < 0.01) || col1.every((val, i) => Math.abs(val + col3[i]) < 0.01);

  // Render simulated 3D coordinates axes representing rotation
  const render3DFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const cx = W / 2;
    const cy = H / 2;
    const size = 65;

    // Convert keys to radians
    const sr = (startRoll * Math.PI) / 180;
    const sp = (startPitch * Math.PI) / 180;
    const sy = (startYaw * Math.PI) / 180;

    const er = (endRoll * Math.PI) / 180;
    const ep = (endPitch * Math.PI) / 180;
    const ey = (endYaw * Math.PI) / 180;

    let currentRotationMatrix = [
      [1,0,0],
      [0,1,0],
      [0,0,1]
    ];

    if (lerpSlerpType === 'lerp') {
      // Linear Euler angle interpolation (LERP)
      const interRoll = sr + interpTime * (er - sr);
      const interPitch = sp + interpTime * (ep - sp);
      const interYaw = sy + interpTime * (ey - sy);

      // Simple transformation matrix from Roll-Pitch-Yaw rotation order Z-Y-X
      const Rz = getEulerRotZ(interYaw);
      const Ry = getEulerRotY(interPitch);
      const Rx = getEulerRotX(interRoll);
      currentRotationMatrix = mat33mul(Rz, mat33mul(Ry, Rx));
    } else {
      // Quaternion SLERP
      const qStart = eulToQuat(sr, sp, sy);
      const qEnd = eulToQuat(er, ep, ey);
      const qCurrent = slerp(qStart, qEnd, interpTime);
      currentRotationMatrix = quatToRotMat(qCurrent);
    }

    // 3D Oblique Projection coordinates mapper simple
    const project3D = (x: number, y: number, z: number) => {
      // Rotate frame coordinates by a static camera perspective to look 3D isometric
      const camYaw = -0.65;
      const camPitch = 0.45;

      const cosY = Math.cos(camYaw);
      const sinY = Math.sin(camYaw);
      const cosP = Math.cos(camPitch);
      const sinP = Math.sin(camPitch);

      // Transform coordinate systems
      // Y-up 3D mapping
      const x1 = x * cosY - z * sinY;
      const z1 = x * sinY + z * cosY;

      const y2 = y * cosP - z1 * sinP;
      const z2 = y * sinP + z1 * cosP;

      return [cx + x1, cy - y2];
    };

    // Draw static gray reference grid floor
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = -2; i <= 2; i++) {
      const [p1x, p1y] = project3D(i * 40, -45, -80);
      const [p2x, p2y] = project3D(i * 40, -45, 80);
      ctx.moveTo(p1x, p1y); ctx.lineTo(p2x, p2y);

      const [q1x, q1y] = project3D(-80, -45, i * 40);
      const [q2x, q2y] = project3D(80, -45, i * 40);
      ctx.moveTo(q1x, q1y); ctx.lineTo(q2x, q2y);
    }
    ctx.stroke();

    // Projected axes vector definitions (Red: X, Green: Y, Blue: Z)
    const o3d = [0, 0, 0];
    const x3d = [currentRotationMatrix[0][0] * size, currentRotationMatrix[1][0] * size, currentRotationMatrix[2][0] * size];
    const y3d = [currentRotationMatrix[0][1] * size, currentRotationMatrix[1][1] * size, currentRotationMatrix[2][1] * size];
    const z3d = [currentRotationMatrix[0][2] * size, currentRotationMatrix[1][2] * size, currentRotationMatrix[2][2] * size];

    const [ox, oy] = project3D(o3d[0], o3d[1], o3d[2]);
    const [xx, xy] = project3D(x3d[0], x3d[1], x3d[2]);
    const [yx, yy] = project3D(y3d[0], y3d[1], y3d[2]);
    const [zx, zy] = project3D(z3d[0], z3d[1], z3d[2]);

    // Draw axis lines
    // X Axis
    ctx.strokeStyle = '#ef4444'; // Red
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(xx, xy); ctx.stroke();
    ctx.fillStyle = '#ef4444'; ctx.font = 'bold 10px sans-serif'; ctx.fillText('X', xx + 6, xy + 3);

    // Y Axis
    ctx.strokeStyle = '#22c55e'; // Green
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(yx, yy); ctx.stroke();
    ctx.fillStyle = '#22c55e'; ctx.fillText('Y', yx - 1, yy - 5);

    // Z Axis
    ctx.strokeStyle = '#3b82f6'; // Blue
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(zx, zy); ctx.stroke();
    ctx.fillStyle = '#3b82f6'; ctx.fillText('Z', zx + 5, zy + 6);

    // Draw central orientation node
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(ox, oy, 6.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    // Draw arc trace path to illustrate trajectory progress sphere segment
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 8.5px monospace';
    ctx.fillText(`${lerpSlerpType.toUpperCase()} INTERPOLATION PATH - t: ${(interpTime * 100).toFixed(0)}%`, 14, H - 15);
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      {/* Module Title Section */}
      <div className="border-b border-slate-800 pb-4">
        <span className="text-xs font-mono text-cyan-400 tracking-wider uppercase font-bold text-purple-400">
          LABORATORIO AVANZATO — CINEMATICA DELLE ORIENTAZIONI SO(3)
        </span>
        <h1 className="text-2xl font-bold text-white tracking-tight font-display mt-0.5">
          Analizzatore Singolarità di Eulero & Interpolatore SLERP
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Padroneggia la complessa geometria tridimensionale dello spazio delle rotazioni. Esplora le singolarità della matrice di trasformazione delle velocità angolari <MathText math="T(\varphi)" /> su tutti i 12 set di Eulero e sperimenta l'orientamento fluido tra due pose evitando il blocco cardanico (Gimbal Lock) con l'interpolazione sferica quaternionica SLERP.
        </p>
      </div>

      {/* Main double visual sections split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left column: Interpolator 3D SO(3) */}
        <div className="space-y-4 bg-slate-900/20 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-display font-semibold text-sm text-slate-200">
              🔮 Simulatore SO(3) 3D: SLERP vs Euler LERP
            </span>
            <Rotate3d className="w-5 h-5 text-[#06b6d4] text-sky-400" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setLerpSlerpType('lerp')}
              className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                lerpSlerpType === 'lerp'
                  ? 'bg-amber-950/50 text-amber-300 border-amber-800'
                  : 'bg-slate-950/40 text-slate-400 border-slate-850 hover:bg-slate-950'
              }`}
            >
              <span>LERP Lineare (Angoli Eulero)</span>
              <span className="text-[8px] font-mono font-normal flex">Winding strano e Singolo</span>
            </button>
            <button
              onClick={() => setLerpSlerpType('slerp')}
              className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                lerpSlerpType === 'slerp'
                  ? 'bg-cyan-950/50 text-cyan-300 border-cyan-800 bg-sky-950/50 text-sky-300 border-sky-800'
                  : 'bg-slate-950/40 text-slate-400 border-slate-850 hover:bg-slate-950'
              }`}
            >
              <span>SLERP Sferica (Quaternioni)</span>
              <span className="text-[8px] font-mono font-normal flex">Traiettoria più breve e uniforme</span>
            </button>
          </div>

          {/* Simulated 3D isometric frame canvas view */}
          <div className="bg-slate-950 p-1 border border-slate-850 rounded-xl relative overflow-hidden">
            <span className="absolute top-3 left-4 text-[9px] font-mono tracking-widest text-[#06b6d4] bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded uppercase text-sky-400">
              Asse Tridimensionale Proiettato
            </span>

            {/* Play-pause button */}
            <button
              onClick={() => setInterpolatorAutoPlay(!interpolatorAutoPlay)}
              className={`absolute top-3 right-4 px-2 py-0.5 rounded border text-[9px] font-mono font-bold transition-colors cursor-pointer ${
                interpolatorAutoPlay 
                  ? 'bg-amber-950/30 text-amber-400 border-amber-800/30 hover:bg-amber-900/30' 
                  : 'bg-green-950/30 text-green-400 border-green-800/30 hover:bg-green-900/30'
              }`}
            >
              {interpolatorAutoPlay ? 'PAUSA LOOP' : 'AVVIA LOOP'}
            </button>

            <canvas
              ref={canvasRef}
              width={350}
              height={220}
              className="w-full block rounded bg-slate-950"
            />
          </div>

          {/* Manual slider preview */}
          <div className="space-y-1 bg-slate-950/50 p-3 rounded-lg border border-slate-850/60">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-450">Tempo Coordinata di interpolazione (t)</span>
              <span className="text-cyan-400 font-bold text-sky-400">{(interpTime * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={interpTime}
              onChange={(e) => {
                setInterpTime(Number(e.target.value));
                setInterpolatorAutoPlay(false); // suspend auto loop on user drag
              }}
              className="w-full accent-cyan-500 accent-sky-500"
            />
          </div>

          {/* Orientations Key Config */}
          <div className="space-y-4 pt-2.5 border-t border-slate-850">
            <span className="text-[10px] font-mono text-slate-450 uppercase block font-semibold tracking-wider">
              Configura Pose Chiave (ROLL - PITCH - YAW)
            </span>
            <div className="grid grid-cols-2 gap-4">
              {/* Start Pose slider */}
              <div className="bg-slate-950/40 p-3.5 rounded-lg border border-slate-850/40 space-y-2.5">
                <span className="text-[10.5px] font-mono text-emerald-450 font-bold block pb-1 border-b border-slate-800">
                  🔴 POSA START
                </span>
                {/* Roll */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-slate-400">Roll (x)</span>
                    <span className="text-slate-200">{startRoll}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="180"
                    value={startRoll}
                    onChange={(e) => setStartRoll(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>
                {/* Pitch */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-slate-400">Pitch (y)</span>
                    <span className="text-slate-200">{startPitch}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="180"
                    value={startPitch}
                    onChange={(e) => setStartPitch(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>
                {/* Yaw */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-slate-400">Yaw (z)</span>
                    <span className="text-slate-200">{startYaw}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="180"
                    value={startYaw}
                    onChange={(e) => setStartYaw(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>
              </div>

              {/* End Pose slider */}
              <div className="bg-slate-950/40 p-3.5 rounded-lg border border-slate-850/40 space-y-2.5">
                <span className="text-[10.5px] font-mono text-cyan-450 font-bold block pb-1 border-b border-slate-800 text-sky-400">
                  🔵 POSA END
                </span>
                {/* Roll */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-slate-400">Roll (x)</span>
                    <span className="text-slate-200">{endRoll}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="180"
                    value={endRoll}
                    onChange={(e) => setEndRoll(Number(e.target.value))}
                    className="w-full accent-cyan-500 accent-sky-500 text-xs"
                  />
                </div>
                {/* Pitch */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-slate-400">Pitch (y)</span>
                    <span className="text-slate-200">{endPitch}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="180"
                    value={endPitch}
                    onChange={(e) => setEndPitch(Number(e.target.value))}
                    className="w-full accent-cyan-500 accent-sky-500 text-xs"
                  />
                </div>
                {/* Yaw */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-slate-400">Yaw (z)</span>
                    <span className="text-slate-200">{endYaw}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="180"
                    value={endYaw}
                    onChange={(e) => setEndYaw(Number(e.target.value))}
                    className="w-full accent-cyan-500 accent-sky-500 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Singularities grid ported */}
        <div className="space-y-4 bg-slate-900/20 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-display font-semibold text-sm text-slate-200">
              📊 Studio Singolarità Rappresentazioni SO(3)
            </span>
            <Sliders className="w-5 h-5 text-purple-400" />
          </div>

          <p className="text-[12px] text-slate-400 leading-normal font-sans">
            Seleziona una sequenza e varia l'angolo intermedio <code className="font-mono text-purple-300">β</code>. Verifica per quali angoli la matrice <code className="font-mono text-cyan-300 text-sky-400">T(φ)</code> perde rango (<MathText math="\det(T) = 0" />).
          </p>

          <div className="grid grid-cols-4 gap-1.5" id="seq-interactive-grid">
            {SEQUENCES.map((s, idx) => {
              const isEul = s.name[0] === s.name[2];
              return (
                <button
                  key={s.name}
                  onClick={() => setCurrentSeqIdx(idx)}
                  className={`py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer flex flex-col items-center justify-center ${
                    idx === currentSeqIdx
                      ? 'border border-cyan-500 bg-cyan-950/40 text-cyan-200 border-sky-500 bg-sky-950/40 text-sky-200'
                      : isEul
                        ? 'border border-rose-900/40 bg-rose-955/20 text-rose-350 hover:bg-rose-900/20'
                        : 'border border-emerald-900/40 bg-emerald-955/20 text-emerald-350 hover:bg-emerald-900/20'
                  }`}
                  title={isEul ? 'Sequenza Euleriana (asse 1 = asse 3)' : 'Sequenza Tait-Bryan (3 assi distinti)'}
                >
                  <span>{s.name}</span>
                  <span className="text-[7.5px] font-normal opacity-70">{isEul ? 'Euler' : 'Tait-B'}</span>
                </button>
              );
            })}
          </div>

            {/* Euler angles sliders */}
          <div className="space-y-3.5 bg-slate-950/40 p-4 rounded-xl border border-slate-850/60">
            {/* Geometric vs Analytic Jacobians */}
            <div className="mb-4 p-3 bg-cyan-950/20 border border-cyan-900/40 rounded-lg text-xs leading-relaxed space-y-2">
              <span className="text-[10px] uppercase font-mono text-cyan-300 font-bold block pb-1 border-b border-cyan-800/40">
                Jacobiano Geometrico vs Analitico
              </span>
              <p className="text-slate-350">
                Il Jacobiano Geometrico <MathText math="J_A(q)" /> mappa <MathText math="\dot{q}" /> nelle velocità lineari/angolari <MathText math="v" /> e <MathText math="\omega" /> nello spazio cartesiano (SO(3)).
                Il Jacobiano Analitico <MathText math="J_A^*(q)" /> usa la derivata della rappresentazione minima <MathText math="\dot{\varphi}" /> (es. angoli di Eulero).
              </p>
              <div className="bg-slate-900/50 p-2 rounded text-[10px] font-mono text-center text-slate-300">
                <p>Equazione: <code className="text-sky-400">{"\\omega = T(\\varphi) \\cdot \\dot{\\varphi}"}</code></p>
                <p>Relazione: <code className="text-sky-400">{"J_A(q) = \\begin{bmatrix} I & 0 \\\\ 0 & T(\\varphi) \\end{bmatrix} J_A^*(q)"}</code></p>
              </div>
              <p className="text-[9px] text-slate-400 pt-1">
                Gimbal lock avviene quando <MathText math="\det(T(\varphi)) = 0" />, impedendo l'inversione di T e rendendo non relazionabili i due Jacobiani.
              </p>
            </div>

            {/* alpha */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">α (Alpha / Primo asse)</span>
                <span className="text-slate-200">{alpha}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                value={alpha}
                onChange={(e) => setAlpha(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>

            {/* beta */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400 font-bold text-purple-300">β (Beta / Secondo asse cruciale!)</span>
                <span className="text-purple-300 font-bold">{beta}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                value={beta}
                onChange={(e) => setBeta(Number(e.target.value))}
                className="w-full accent-purple-500"
              />
            </div>

            {/* gamma */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400 font-normal">γ (Gamma / Terzo asse)</span>
                <span className="text-slate-200">{gamma}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                value={gamma}
                onChange={(e) => setGamma(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>
          </div>

          {/* Stats Boxed Grid */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-850">
              <span className="text-[8px] font-mono text-slate-500 uppercase block">det(T)</span>
              <span className={`text-[12px] font-mono font-bold ${isSingular ? 'text-rose-400' : 'text-emerald-400'}`}>
                {Math.abs(detT) < 1e-4 ? '0.000' : detT.toFixed(3)}
              </span>
            </div>

            <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-850">
              <span className="text-[8px] font-mono text-slate-500 uppercase block">Rango di T</span>
              <span className={`text-[12px] font-mono font-bold ${isSingular ? 'text-rose-400' : 'text-emerald-400'}`}>
                {rankT}
              </span>
            </div>

            <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-850">
              <span className="text-[8px] font-mono text-slate-500 uppercase block">Tipo</span>
              <span className="text-[10px] font-semibold text-indigo-400 pt-0.5 block">
                {isEulerian ? 'Eulero' : 'Tait-Bryan'}
              </span>
            </div>

            <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-850">
              <span className="text-[8px] font-mono text-slate-500 uppercase block">Singolare?</span>
              <span className={`text-[10px] font-bold uppercase ${isSingular ? 'text-rose-400' : 'text-emerald-400'}`}>
                {isSingular ? '⚠️ SI' : '✓ NO'}
              </span>
            </div>
          </div>

          {/* Row coincidents highlighting matrix */}
          <div className="bg-slate-950/80 p-4 border border-slate-850 rounded-xl space-y-3.5">
            <span className="text-[9px] font-mono text-slate-450 uppercase block font-semibold tracking-wider">
              MATRICE T(φ) - Direzioni istantanee nel frame finale
            </span>
            
            <div className="flex justify-center items-center gap-1.5 text-sm font-mono text-slate-300 py-2 overflow-x-auto min-w-0">
              <span className="text-3xl font-light text-slate-500 flex-shrink-0">[</span>
              <table className="border-collapse flex-shrink-0">
                <tbody>
                  {T_matrix.map((row, rIdx) => (
                    <tr key={rIdx}>
                      {row.map((val, cIdx) => {
                        const cellHilite = col1EqualCol3 && (cIdx === 0 || cIdx === 2);
                        return (
                          <td 
                            key={cIdx} 
                            className={`w-14 md:w-16 h-8 text-center text-xs font-semibold border border-slate-850 transition-all ${
                              cellHilite
                                ? 'bg-rose-955/35 text-rose-300'
                                : ''
                            }`}
                          >
                            {(Math.abs(val) < 1e-4 ? 0 : val).toFixed(3)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <span className="text-3xl font-light text-slate-500 flex-shrink-0">]</span>
            </div>

            {/* Visual labels */}
            <div className="flex justify-center gap-4 text-[9px] uppercase font-mono tracking-wider">
              <span className={`px-1.5 py-0.5 rounded flex ${col1EqualCol3 ? 'bg-rose-955/30 text-rose-350 border border-rose-900/40' : 'text-slate-500'}`}>
                col₁: asse {['X','Y','Z'][selectedSeq.axes[0]]}
              </span>
              <span className="px-1.5 py-0.5 text-slate-500 flex">
                col₂: asse {['X','Y','Z'][selectedSeq.axes[1]]}
              </span>
              <span className={`px-1.5 py-0.5 rounded flex ${col1EqualCol3 ? 'bg-rose-955/30 text-rose-350 border border-rose-900/40' : 'text-slate-500'}`}>
                col₃: asse {['X','Y','Z'][selectedSeq.axes[2]]}
              </span>
            </div>

            {col1EqualCol3 && (
              <div className="p-3 bg-rose-955/15 border border-rose-900/50 text-rose-450 text-xs rounded-lg space-y-1">
                <span className="font-bold text-[9.5px] uppercase font-mono tracking-wide text-rose-300 block">
                  ⚠️ Perdita di Grado di Libertà (Colonna 1 Coincide con Colonna 3!)
                </span>
                <p className="leading-relaxed">
                  Poiché l'angolo intermedio <code className="text-rose-300 font-mono">β</code> corrisponde ad allineamento dei mozzi ({isEulerian ? 'β = 0° (o multipli)' : 'β = ±90°'}), il primo asse rotante di <code className="text-indigo-400 font-mono">α</code> e l'ultimo terzo di <code className="text-indigo-400 font-mono">γ</code> si sovrappongono fisicamente nello spazio 3D. Le colonne diventano linearmente dipendenti, azzerando il determinante e impedendo l'inversione della velocità angolare!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrientationLab;
