/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Flame, 
  Settings, 
  HelpCircle, 
  Play, 
  Square, 
  RotateCcw, 
  Activity, 
  Cpu, 
  Sliders, 
  ChevronRight,
  TrendingUp,
  BarChart2,
  CheckCircle2,
  BookOpen,
  X
} from 'lucide-react';
import { MathText } from './Math';

export const DynamicsControl: React.FC = () => {
  // Mechanical system parameters (persisted via localStorage)
  const [m1, setM1] = useState<number>(() => {
    const saved = localStorage.getItem('dc_m1');
    return saved ? Number(saved) : 2.0;
  });
  const [m2, setM2] = useState<number>(() => {
    const saved = localStorage.getItem('dc_m2');
    return saved ? Number(saved) : 1.5;
  });
  const [l1, setL1] = useState<number>(1.0); // Link 1 length (m)
  const [l2, setL2] = useState<number>(0.8); // Link 2 length (m)
  
  // Physics constants
  const [gConst, setGConst] = useState<number>(() => {
    const saved = localStorage.getItem('dc_gConst');
    return saved ? Number(saved) : 9.81;
  });
  const [damping, setDamping] = useState<number>(() => {
    const saved = localStorage.getItem('dc_damping');
    return saved ? Number(saved) : 0.4;
  });

  // Controller parameters
  const [kp, setKp] = useState<number>(() => {
    const saved = localStorage.getItem('dc_kp');
    return saved ? Number(saved) : 15.0;
  });
  const [kd, setKd] = useState<number>(() => {
    const saved = localStorage.getItem('dc_kd');
    return saved ? Number(saved) : 4.0;
  });
  const [enableCompensation, setEnableCompensation] = useState<boolean>(() => {
    const saved = localStorage.getItem('dc_enableComp');
    return saved === 'true';
  });
  const [controlMode, setControlMode] = useState<'passive' | 'pd'>(() => {
    const saved = localStorage.getItem('dc_controlMode');
    return (saved === 'passive' || saved === 'pd') ? saved : 'pd';
  });

  // Targets
  const [targetQ1, setTargetQ1] = useState<number>(() => {
    const saved = localStorage.getItem('dc_targetQ1');
    return saved ? Number(saved) : 45;
  });
  const [targetQ2, setTargetQ2] = useState<number>(() => {
    const saved = localStorage.getItem('dc_targetQ2');
    return saved ? Number(saved) : 45;
  });

  // Help guide visibility
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);

  // Sync back to storage on updates
  useEffect(() => {
    localStorage.setItem('dc_m1', m1.toString());
    localStorage.setItem('dc_m2', m2.toString());
    localStorage.setItem('dc_gConst', gConst.toString());
    localStorage.setItem('dc_damping', damping.toString());
    localStorage.setItem('dc_kp', kp.toString());
    localStorage.setItem('dc_kd', kd.toString());
    localStorage.setItem('dc_enableComp', enableCompensation.toString());
    localStorage.setItem('dc_controlMode', controlMode);
    localStorage.setItem('dc_targetQ1', targetQ1.toString());
    localStorage.setItem('dc_targetQ2', targetQ2.toString());
  }, [m1, m2, gConst, damping, kp, kd, enableCompensation, controlMode, targetQ1, targetQ2]);

  // Sim Play status
  const [isRunning, setIsRunning] = useState<boolean>(true);

  // States for display of instantaneous values
  const [telemetry, setTelemetry] = useState({
    q1: 0.0,
    q2: 0.0,
    dq1: 0.0,
    dq2: 0.0,
    tau1: 0.0,
    tau2: 0.0,
    detM: 0.0,
    err1: 0.0,
    err2: 0.0,
  });

  // Physics simulation refs
  const stateRef = useRef({
    q1: (30 * Math.PI) / 180,  // rad
    q2: (60 * Math.PI) / 180,  // rad
    dq1: 0.0,                  // rad/s
    dq2: 0.0,                  // rad/s
    targetQ1: (45 * Math.PI) / 180,
    targetQ2: (45 * Math.PI) / 180,
    lastTime: 0,
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Tracking history buffer for plotting error signals
  const errorHistoryRef = useRef<{ e1: number; e2: number }[]>([]);

  // Keep target refs updated
  useEffect(() => {
    stateRef.current.targetQ1 = (targetQ1 * Math.PI) / 180;
    stateRef.current.targetQ2 = (targetQ2 * Math.PI) / 180;
  }, [targetQ1, targetQ2]);

  // Reset physics simulation state
  const handleReset = () => {
    stateRef.current.q1 = (30 * Math.PI) / 180;
    stateRef.current.q2 = (60 * Math.PI) / 180;
    stateRef.current.dq1 = 0.0;
    stateRef.current.dq2 = 0.0;
    errorHistoryRef.current = [];
    
    setTelemetry(prev => ({
      ...prev,
      q1: (stateRef.current.q1 * 180) / Math.PI,
      q2: (stateRef.current.q2 * 180) / Math.PI,
      dq1: 0,
      dq2: 0,
    }));
  };

  // Main simulation and animation Loop
  useEffect(() => {
    let animationId = 0;
    stateRef.current.lastTime = performance.now();

    const updatePhysics = (timestamp: number) => {
      if (!isRunning) {
        stateRef.current.lastTime = timestamp;
        animationId = requestAnimationFrame(updatePhysics);
        return;
      }

      // Limit dt to avoid massive strides on frame drops
      let dt = (timestamp - stateRef.current.lastTime) / 1000;
      if (dt > 0.1) dt = 0.1;
      if (dt <= 0) dt = 0.016; 
      stateRef.current.lastTime = timestamp;

      // Dynamics integration sub-steps for Euler-Cromer accuracy
      const subSteps = 4;
      const h_dt = dt / subSteps;

      for (let s = 0; s < subSteps; s++) {
        const q1 = stateRef.current.q1;
        const q2 = stateRef.current.q2;
        const dq1 = stateRef.current.dq1;
        const dq2 = stateRef.current.dq2;

        // Centers of mass (Concentrated at halfway along links)
        const dc1 = l1 / 2;
        const dc2 = l2 / 2;

        // Inertias
        const I1 = (1 / 12) * m1 * l1 * l1;
        const I2 = (1 / 12) * m2 * l2 * l2;

        // 1. Mass Matrix components
        const M11 = m1 * dc1 * dc1 + I1 + m2 * (l1 * l1 + dc2 * dc2 + 2 * l1 * dc2 * Math.cos(q2)) + I2;
        const M12 = m2 * (dc2 * dc2 + l1 * dc2 * Math.cos(q2)) + I2;
        const M21 = M12;
        const M22 = m2 * dc2 * dc2 + I2;

        const detM = M11 * M22 - M12 * M21;

        // 2. Coriolis vector mechanics
        const hC = m2 * l1 * dc2 * Math.sin(q2);
        const c1 = -hC * dq2 * dq2 - 2 * hC * dq1 * dq2;
        const c2 = hC * dq1 * dq1;

        // 3. Gravity vector mechanics
        const g1 = (m1 * dc1 + m2 * l1) * gConst * Math.cos(q1) + m2 * dc2 * gConst * Math.cos(q1 + q2);
        const g2 = m2 * dc2 * gConst * Math.cos(q1 + q2);

        // 4. Input Torque (Tau) from controller or passive mode
        let tau1 = 0;
        let tau2 = 0;

        if (controlMode === 'pd') {
          const tQ1 = stateRef.current.targetQ1;
          const tQ2 = stateRef.current.targetQ2;

          // Standard PD feedforward
          tau1 = kp * (tQ1 - q1) - kd * dq1;
          tau2 = kp * (tQ2 - q2) - kd * dq2;

          // If gravity feedforward compensation is enabled, add gravity vector torques
          if (enableCompensation) {
            tau1 += g1;
            tau2 += g2;
          }
        }

        // Apply joint friction (damping)
        const f1 = tau1 - c1 - g1 - damping * dq1;
        const f2 = tau2 - c2 - g2 - damping * dq2;

        // 5. Compute joint accelerations (q_ddot = M^-1 * forceVec)
        let ddq1 = 0.2;
        let ddq2 = 0.2;
        if (Math.abs(detM) > 0.0001) {
          ddq1 = (M22 * f1 - M12 * f2) / detM;
          ddq2 = (-M21 * f1 + M11 * f2) / detM;
        }

        // Integration step (Euler-Cromer)
        stateRef.current.dq1 += ddq1 * h_dt;
        stateRef.current.dq2 += ddq2 * h_dt;
        stateRef.current.q1 += stateRef.current.dq1 * h_dt;
        stateRef.current.q2 += stateRef.current.dq2 * h_dt;
      }

      // Draw active frames
      drawRobot();
      drawChart();

      // Read current state and write to Telemetry throttled
      const cQ1 = stateRef.current.q1;
      const cQ2 = stateRef.current.q2;
      const cDQ1 = stateRef.current.dq1;
      const cDQ2 = stateRef.current.dq2;

      // Re-evaluate matrix telemetry for logging
      const dc1_p = l1 / 2;
      const dc2_p = l2 / 2;
      const I1_p = (1 / 12) * m1 * l1 * l1;
      const I2_p = (1 / 12) * m2 * l2 * l2;
      const M11_p = m1 * dc1_p * dc1_p + I1_p + m2 * (l1 * l1 + dc2_p * dc2_p + 2 * l1 * dc2_p * Math.cos(cQ2)) + I2_p;
      const M12_p = m2 * (dc2_p * dc2_p + l1 * dc2_p * Math.cos(cQ2)) + I2_p;
      const M22_p = m2 * dc2_p * dc2_p + I2_p;
      const detM_p = M11_p * M22_p - M12_p * M12_p;

      const g1_p = (m1 * dc1_p + m2 * l1) * gConst * Math.cos(cQ1) + m2 * dc2_p * gConst * Math.cos(cQ1 + cQ2);
      const g2_p = m2 * dc2_p * gConst * Math.cos(cQ1 + cQ2);

      let instantTau1 = 0;
      let instantTau2 = 0;
      if (controlMode === 'pd') {
        instantTau1 = kp * (stateRef.current.targetQ1 - cQ1) - kd * cDQ1 + (enableCompensation ? g1_p : 0);
        instantTau2 = kp * (stateRef.current.targetQ2 - cQ2) - kd * cDQ2 + (enableCompensation ? g2_p : 0);
      }

      const err1 = stateRef.current.targetQ1 - cQ1;
      const err2 = stateRef.current.targetQ2 - cQ2;

      setTelemetry({
        q1: (cQ1 * 180) / Math.PI,
        q2: (cQ2 * 180) / Math.PI,
        dq1: cDQ1,
        dq2: cDQ2,
        tau1: instantTau1,
        tau2: instantTau2,
        detM: detM_p,
        err1: (err1 * 180) / Math.PI,
        err2: (err2 * 180) / Math.PI,
      });

      // Record tracking historical errors (capped at 160 elements)
      const currentHist = errorHistoryRef.current;
      currentHist.push({ e1: err1 * (180 / Math.PI), e2: err2 * (180 / Math.PI) });
      if (currentHist.length > 165) currentHist.shift();

      animationId = requestAnimationFrame(updatePhysics);
    };

    animationId = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(animationId);
  }, [isRunning, m1, m2, l1, l2, gConst, damping, kp, kd, enableCompensation, controlMode]);

  // Drawing the robot graphic viewport
  const drawRobot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const cx = W / 2;
    const cy = H * 0.55; // Offset slightly down
    const scale = 110;  // Scale factor (pixel per meter)

    const proj = (x: number, y: number) => [cx + x * scale, cy - y * scale];

    const q1 = stateRef.current.q1;
    const q2 = stateRef.current.q2;

    // Joint positions
    const j1x = l1 * Math.cos(q1);
    const j1y = l1 * Math.sin(q1);
    const eex = j1x + l2 * Math.cos(q1 + q2);
    const eey = j1y + l2 * Math.sin(q1 + q2);

    const [oxProj, oyProj] = proj(0, 0);
    const [j1ProjX, j1ProjY] = proj(j1x, j1y);
    const [eeProjX, eeProjY] = proj(eex, eey);

    // Target positions indicators
    const tQ1 = stateRef.current.targetQ1;
    const tQ2 = stateRef.current.targetQ2;
    const tj1x = l1 * Math.cos(tQ1);
    const tj1y = l1 * Math.sin(tQ1);
    const teex = tj1x + l2 * Math.cos(tQ1 + tQ2);
    const teey = tj1y + l2 * Math.sin(tQ1 + tQ2);
    const [tProjX, tProjY] = proj(teex, teey);

    // Grid coordinates
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();

    // Trace coordinate horizontal guidelines
    ctx.fillStyle = '#475569';
    ctx.font = '8px monospace';
    ctx.fillText('GROUND PLANE REFERENCE (y = 0)', cx + 55, cy + 12);

    // Draw TARGET silhouette shadow (highly immersive visual feed!)
    if (controlMode === 'pd') {
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)'; // faint cyan ghost arm
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(oxProj, oyProj);
      ctx.lineTo(proj(tj1x, tj1y)[0], proj(tj1x, tj1y)[1]);
      ctx.lineTo(tProjX, tProjY);
      ctx.stroke();

      // target terminal dot
      ctx.fillStyle = 'rgba(6, 182, 212, 0.65)';
      ctx.beginPath();
      ctx.arc(tProjX, tProjY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = 'bold 8px monospace';
      ctx.fillText('Target', tProjX + 8, tProjY - 3);
    }

    // Draw active robot link 1
    ctx.strokeStyle = '#1e293b';       // Dark border
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(oxProj, oyProj); ctx.lineTo(j1ProjX, j1ProjY); ctx.stroke();
    ctx.strokeStyle = '#38bdf8';       // Sky blue center
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(oxProj, oyProj); ctx.lineTo(j1ProjX, j1ProjY); ctx.stroke();

    // Link 2
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(j1ProjX, j1ProjY); ctx.lineTo(eeProjX, eeProjY); ctx.stroke();
    ctx.strokeStyle = '#c084fc';       // Elegant Purple center
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(j1ProjX, j1ProjY); ctx.lineTo(eeProjX, eeProjY); ctx.stroke();

    // Joints node hubs
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 2;
    
    // Base joint
    ctx.fillStyle = '#0f172a';
    ctx.beginPath(); ctx.arc(oxProj, oyProj, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath(); ctx.arc(oxProj, oyProj, 4, 0, Math.PI * 2); ctx.fill();

    // Joint 2
    ctx.fillStyle = '#0f172a';
    ctx.beginPath(); ctx.arc(j1ProjX, j1ProjY, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c084fc';
    ctx.beginPath(); ctx.arc(j1ProjX, j1ProjY, 3.5, 0, Math.PI * 2); ctx.fill();

    // End-effector tracking tip
    ctx.fillStyle = '#ec4899'; // Bright pink tip
    ctx.beginPath(); ctx.arc(eeProjX, eeProjY, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  };

  // Plotting tracking error chart
  const drawChart = () => {
    const canvas = chartCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const padL = 30;
    const padR = 10;
    const padTop = 15;
    const padBottom = 15;
    const chartW = W - padL - padR;
    const chartH = H - padTop - padBottom;

    // Grid center zero line
    const zeroY = padTop + chartH / 2;
    ctx.strokeStyle = 'rgba(74, 85, 104, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padL, zeroY); ctx.lineTo(W - padR, zeroY); ctx.stroke();

    // Horizontal grid boundary markers
    ctx.strokeStyle = 'rgba(74, 85, 104, 0.08)';
    ctx.beginPath(); ctx.moveTo(padL, padTop); ctx.lineTo(W - padR, padTop); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(padL, padTop + chartH); ctx.lineTo(W - padR, padTop + chartH); ctx.stroke();

    ctx.font = '7px monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText('+90°', 4, padTop + 5);
    ctx.fillText(' 0°', 4, zeroY + 2);
    ctx.fillText('-90°', 4, padTop + chartH + 1);

    const history = errorHistoryRef.current;
    if (history.length < 2) return;

    const maxErrVisibleRad = 90; // degrees amplitude representing full scale

    const getX = (idx: number) => padL + (idx / 160) * chartW;
    const getY = (val: number) => {
      const ratio = val / maxErrVisibleRad;
      const clampedRatio = Math.max(-1, Math.min(1, ratio));
      return zeroY - clampedRatio * (chartH / 2);
    };

    // Draw Joint 1 Error Curve (Sky)
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(history[0].e1));
    for (let i = 1; i < history.length; i++) {
      ctx.lineTo(getX(i), getY(history[i].e1));
    }
    ctx.stroke();

    // Draw Joint 2 Error Curve (Crimson-Purple)
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(history[0].e2));
    for (let i = 1; i < history.length; i++) {
      ctx.lineTo(getX(i), getY(history[i].e2));
    }
    ctx.stroke();

    // Title label
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 8px Inter';
    ctx.fillText('STORICO ERRORE DI GIUNTO e(t) = q_d(t) - q(t)', padL + 10, padTop - 5);
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      {/* Module Title Section */}
      <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-xs font-mono text-brand-supplementare tracking-wider uppercase font-bold text-cyan-400">
            MODULO E — DINAMICA, ATTRITO & CONTROLLO CONTINUO
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight font-display mt-0.5">
            Modellatore Dinamico & Studio di Controllo PD
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Esamina l'equazione del moto lagrangiano del robot 2R. Sperimenta la caduta libera gravitazionale (modalità passiva) e tara lo sforzo di coppia del controllore PD, studiando il collasso causato dalla gravità non compensata.
          </p>
        </div>
        <button
          onClick={() => setIsGuideOpen(true)}
          className="flex items-center gap-2 self-start md:self-center bg-cyan-950/40 hover:bg-cyan-900/30 text-cyan-400 hover:text-cyan-300 border border-cyan-900/60 px-3.5 py-2 text-xs font-display font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap"
        >
          <BookOpen className="w-4 h-4" />
          GUIDA RAPIDA DI CONTROLLO
        </button>
      </div>

      {/* Main split viewport layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Physics Canvas & tracking graphs */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-950 p-1 border border-slate-800 rounded-xl overflow-hidden relative">
            <span className="absolute top-3 left-4 text-[9px] font-mono tracking-widest text-slate-400 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded uppercase">
              Simulatore Fisico 2R (Gravità e Attrito)
            </span>
            <div className="absolute top-3 right-4 flex items-center gap-2">
              <button 
                onClick={() => setIsRunning(!isRunning)}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono font-bold rounded border transition-all cursor-pointer ${
                  isRunning 
                    ? 'bg-amber-950/40 text-amber-400 border-amber-800/40 hover:bg-amber-900/30' 
                    : 'bg-green-950/40 text-green-400 border-green-800/40 hover:bg-green-900/30'
                }`}
              >
                {isRunning ? (
                  <>
                    <Square className="w-2.5 h-2.5 fill-current" />
                    PAUSA PHYS
                  </>
                ) : (
                  <>
                    <Play className="w-2.5 h-2.5 fill-current" />
                    AVVIA PHYS
                  </>
                )}
              </button>
              <button 
                onClick={handleReset}
                className="flex items-center gap-1 bg-slate-900 hover:bg-slate-850 px-2.5 py-1 text-[10px] font-mono font-bold rounded border border-slate-850 text-slate-400 hover:text-slate-200 cursor-pointer"
                title="Resetta Stato Meccanico"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                RESET STATE
              </button>
            </div>

            <canvas
              ref={canvasRef}
              width={500}
              height={310}
              className="bg-gray-950 w-full block rounded-lg cursor-crosshair"
            />
          </div>

          {/* Real-time moving telemetry chart */}
          <div className="bg-slate-950 p-3 border border-slate-800 rounded-xl">
            <canvas ref={chartCanvasRef} width={500} height={100} className="w-full block" />
            <div className="flex justify-center gap-6 mt-1.5 text-[8.5px] uppercase font-mono tracking-wider">
              <span className="flex items-center gap-1 text-[#0ea5e9]">
                <span className="w-2 h-0.5 bg-[#0ea5e9]"></span> Errore Giunto 1
              </span>
              <span className="flex items-center gap-1 text-[#c084fc]">
                <span className="w-2 h-0.5 bg-[#c084fc]"></span> Errore Giunto 2
              </span>
            </div>
          </div>

          {/* Educational Concept Insights Banner */}
          {controlMode === 'pd' && (
            <div className={`p-4 rounded-xl border flex gap-3 transition-colors ${
              enableCompensation 
                ? 'bg-green-950/20 border-green-900/60 text-green-400' 
                : 'bg-amber-950/20 border-amber-900/60 text-amber-400'
            }`}>
              <Cpu className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed font-sans space-y-1">
                {enableCompensation ? (
                  <>
                    <span className="font-bold block uppercase text-[10px] tracking-wider font-mono text-green-300">
                      Compensazione Integrata Attiva (Stato Perfetto)
                    </span>
                    <p className="flex flex-wrap items-center gap-1">
                      Essendo attiva la compensazione feedforward <MathText math="\tau_{ff} = g(q)" />, lo sforzo statico dovuto al peso viene calcolato e cancellato all'istante dell'azionatore. Il controllore PD lavora puramente sulla dinamica transitoria, annullando l'errore a regime anche con guadagni <code className="text-green-300 font-mono">Kp</code> minimi!
                    </p>
                  </>
                ) : (
                  <>
                    <span className="font-bold block uppercase text-[10px] tracking-wider font-mono text-amber-300">
                      Saturazione Gravitazionale Statica (Errore di Regolatore)
                    </span>
                    <p className="flex flex-wrap items-center gap-1 flex-row">
                      Senza compensazione, la gravità spinge l'end-effector verso il basso. L'errore stazionario di inseguimento <code className="text-amber-300 font-mono">e_ss</code> è proporzionale a <MathText math="M(q)^{-1} g(q)/K_p" />. Se aumenti la massa o la gravità, noterai che l'arm scende ancora di più, disobbedendo alla posa d'origine!
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Controllers, Sliders, and Dynamic Matrix Math notation */}
        <div className="lg:col-span-5 space-y-5">
          {/* Controls Modes selector */}
          <div className="bg-slate-900/30 border border-slate-800 p-4 rounded-xl space-y-3.5">
            <span className="font-display font-semibold text-xs text-slate-400 uppercase tracking-wider block">
              🔧 Selettore Modalità di Controllo
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setControlMode('pd')}
                className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  controlMode === 'pd'
                    ? 'bg-cyan-950/50 text-cyan-300 border-cyan-800'
                    : 'bg-slate-950/40 text-slate-400 border-slate-850 hover:bg-slate-950'
                }`}
              >
                Sforzo Attivo (PD Controller)
              </button>
              <button
                onClick={() => {
                  setControlMode('passive');
                  setEnableCompensation(false);
                }}
                className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  controlMode === 'passive'
                    ? 'bg-amber-950/50 text-amber-300 border-amber-800'
                    : 'bg-slate-950/40 text-slate-400 border-slate-850 hover:bg-slate-950'
                }`}
              >
                Passivo (Caduta Libera / Pendolo)
              </button>
            </div>

            {controlMode === 'pd' && (
              <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-850 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono font-bold text-slate-450 block uppercase">
                    Feedforward Gravity Compensation
                  </span>
                  <p className="text-[10px] text-slate-400 font-sans leading-tight">
                    Somma algebricamente $g(q)$ all'output della coppia
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableCompensation}
                    onChange={(e) => setEnableCompensation(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500 peer-checked:after:bg-slate-900"></div>
                </label>
              </div>
            )}
          </div>

          {/* Interactive Parameters Adjusters */}
          <div className="bg-slate-900/30 border border-slate-800 p-5 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-850 pb-2">
              <span className="font-display font-semibold text-sm text-slate-200">
                Regolazione Parametri & Guadagni
              </span>
              <Sliders className="w-4 h-4 text-slate-550" />
            </div>

            {controlMode === 'pd' ? (
              <div className="space-y-3.5">
                {/* target q1 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Target Giunto 1 (q₁d)</span>
                    <span className="text-sky-400 font-bold">{targetQ1}°</span>
                  </div>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    value={targetQ1}
                    onChange={(e) => setTargetQ1(Number(e.target.value))}
                    className="w-full accent-sky-450"
                  />
                </div>

                {/* target q2 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Target Giunto 2 (q₂d)</span>
                    <span className="text-purple-400 font-bold">{targetQ2}°</span>
                  </div>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    value={targetQ2}
                    onChange={(e) => setTargetQ2(Number(e.target.value))}
                    className="w-full accent-purple-450"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-850/60">
                  {/* Kp */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-slate-400">Kp (Porzionale)</span>
                      <span className="text-cyan-400 font-bold">{kp.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      step="0.5"
                      value={kp}
                      onChange={(e) => setKp(Number(e.target.value))}
                      className="w-full accent-cyan-500 text-xs"
                    />
                  </div>

                  {/* Kd */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-slate-400">Kd (Derivativo)</span>
                      <span className="text-cyan-400 font-bold">{kd.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="20"
                      step="0.1"
                      value={kd}
                      onChange={(e) => setKd(Number(e.target.value))}
                      className="w-full accent-cyan-500 text-xs"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                ⚠️ Nella modalità passiva il robot dondola in caduta libera. Puoi regolare i parametri fisici del sistema (massa dei link, coefficiente d'attrito) qui sotto per influenzare la cinetica oscillatoria!
              </p>
            )}

            {/* Mass sliders (Educational gravity parameters) */}
            <div className="border-t border-slate-850/60 pt-3.5 space-y-3">
              <span className="text-[10px] font-mono text-slate-450 block uppercase tracking-wider font-semibold">
                Parametri Fisici Struttura
              </span>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* m1 mass */}
                <div>
                  <div className="flex justify-between font-mono text-[10px]">
                    <span className="text-slate-400">Massa Link 1</span>
                    <span className="text-slate-200">{m1.toFixed(1)} kg</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={m1}
                    onChange={(e) => setM1(Number(e.target.value))}
                    className="w-full accent-slate-400 mt-0.5"
                  />
                </div>

                {/* m2 mass */}
                <div>
                  <div className="flex justify-between font-mono text-[10px]">
                    <span className="text-slate-400">Massa Link 2</span>
                    <span className="text-slate-200">{m2.toFixed(1)} kg</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={m2}
                    onChange={(e) => setM2(Number(e.target.value))}
                    className="w-full accent-slate-400 mt-0.5"
                  />
                </div>

                {/* Gravity strength */}
                <div>
                  <div className="flex justify-between font-mono text-[10px]">
                    <span className="text-slate-400">Gravità (g)</span>
                    <span className="text-red-400 font-semibold">{gConst.toFixed(1)} m/s²</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="0.2"
                    value={gConst}
                    onChange={(e) => setGConst(Number(e.target.value))}
                    className="w-full accent-red-400 mt-0.5"
                  />
                </div>

                {/* Friction/damping factor */}
                <div>
                  <div className="flex justify-between font-mono text-[10px]">
                    <span className="text-slate-400">Smorzamento (B)</span>
                    <span className="text-amber-400 font-semibold">{damping.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="2.0"
                    step="0.05"
                    value={damping}
                    onChange={(e) => setDamping(Number(e.target.value))}
                    className="w-full accent-amber-500 mt-0.5"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Algebraic values telemetry data block */}
          <div className="bg-slate-900/30 border border-slate-800 p-5 rounded-xl space-y-4">
            <span className="font-display font-semibold text-sm text-slate-200 block border-b border-slate-850 pb-2">
              📊 Equazione Lagrangiana & Telemetria
            </span>

            <div className="font-mono text-[11px] p-3 bg-slate-950 rounded-lg border border-slate-850 leading-relaxed text-slate-300">
              <span className="text-[9px] text-cyan-400 font-bold tracking-wider uppercase block border-b border-slate-850/60 pb-1 mb-1.5">
                Stato Istantaneo dei Giunti
              </span>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>q₁ (Angolo Giunto 1):</span>
                  <span className="text-sky-400 font-bold">{telemetry.q1.toFixed(1)}°</span>
                </div>
                <div className="flex justify-between">
                  <span>q₂ (Angolo Giunto 2):</span>
                  <span className="text-purple-400 font-bold">{telemetry.q2.toFixed(1)}°</span>
                </div>
                <div className="flex justify-between">
                  <span>dq₁/dt (Velocità 1):</span>
                  <span>{telemetry.dq1.toFixed(3)} rad/s</span>
                </div>
                <div className="flex justify-between">
                  <span>dq₂/dt (Velocità 2):</span>
                  <span>{telemetry.dq2.toFixed(3)} rad/s</span>
                </div>
                <div className="flex justify-between border-t border-slate-850/60 pt-1 mt-1 font-bold">
                  <span>Coppia Attuata τ₁:</span>
                  <span className="text-cyan-400">{telemetry.tau1.toFixed(3)} Nm</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Coppia Attuata τ₂:</span>
                  <span className="text-purple-400">{telemetry.tau2.toFixed(3)} Nm</span>
                </div>
              </div>
            </div>

            <div className="font-mono text-[10px] space-y-1 bg-slate-950/40 p-3.5 rounded border border-slate-850/60 leading-relaxed text-slate-400">
              <span className="text-slate-350 block font-semibold mb-1">Dinamica Algebrica Calcolata:</span>
              <div>
                • Determinante M(q): <span className="text-sky-300 font-bold">{telemetry.detM.toFixed(3)}</span> (Sempre &gt; 0)
              </div>
              <div>
                • Matrice d'Inerzia Simmetrica M_11: <span className="text-slate-300">{(m1*0.25+m2*(1+0.16+2*0.4*Math.cos(stateRef.current.q2))).toFixed(2)}</span>
              </div>
              <div>
                • Termine Centrifugo C_21: <span className="text-slate-300">{(m2*0.2 * Math.sin(stateRef.current.q2)*stateRef.current.dq1*stateRef.current.dq1).toFixed(3)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Guide Quick Overlay Modal */}
      {isGuideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-cyan-400" />
                <span className="font-display font-semibold text-base text-white">
                  Guida Didattica: Dinamica, Attrito & Controllo Continuo
                </span>
              </div>
              <button
                onClick={() => setIsGuideOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document body Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-300 leading-relaxed font-sans max-h-full">
              {/* Equation intro */}
              <div className="space-y-2">
                <h3 className="font-display font-semibold text-cyan-400 flex items-center gap-1">
                  1. L'Equazione del Moto Lagrangiana (Robot 2R)
                </h3>
                <p>
                  La dinamica del sistema meccanico a due giunti rotanti viene modellata tramite il formalismo di Eulero-Lagrange:
                </p>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-850 text-center font-mono text-cyan-300 flex justify-center items-center gap-1 py-4">
                  <MathText math="M(q)\ddot{q} + C(q, \dot{q})\dot{q} + g(q) + B\dot{q} = \tau" />
                </div>
                <ul className="list-disc pl-5 space-y-1 text-xs text-slate-400">
                  <li><span className="text-slate-200 font-bold font-mono">M(q)</span>: Matrice di Inerzia definita positiva (simmetrica). Determina la resistenza angolare istantanea.</li>
                  <li><span className="text-slate-200 font-bold font-mono">C(q, dq)</span>: Vettore dei termini centrifughi e di Coriolis. Nasce dall'interazione cinematica tra i link in rapida rotazione.</li>
                  <li><span className="text-slate-200 font-bold font-mono">g(q)</span>: Forze di gravità generalizzate indotte dai baricentri dei singoli link.</li>
                  <li><span className="text-slate-200 font-bold font-mono">B</span>: Coefficiente d'attrito viscoso nei cuscinetti joint.</li>
                </ul>
              </div>

              {/* Controller Details */}
              <div className="space-y-2">
                <h3 className="font-display font-semibold text-cyan-400">
                  2. Controllo a Giunti Indipendenti PD
                </h3>
                <p>
                  I servomotori generano coppie <MathText math="\tau" /> volte all'errore istantaneo di tracciamento <MathText math="e(t) = q_d(t) - q(t)" />:
                </p>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-850 text-center font-mono text-purple-300 flex justify-center items-center gap-1 py-3.5">
                  <MathText math="\tau = K_p(q_d - q) - K_d\dot{q} + \tau_{ff}" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div className="bg-slate-950/40 p-3 rounded border border-slate-850 space-y-1">
                    <span className="text-xs font-mono font-bold text-sky-400 uppercase">Azione Proporzionale (Kp) - Rigidezza</span>
                    <p className="text-xs text-slate-400">
                      Rappresenta la molla virtuale. Un aumento di <code className="text-sky-305 font-mono">Kp</code> riduce l'errore di inseguimento e velocizza la risposta transitoria, ma un valore eccessivo genera violenti picchi di sovracorrente e rende instabile il risolutore numerico se supera lo smorzamento d'inerzia.
                    </p>
                  </div>
                  <div className="bg-slate-950/40 p-3 rounded border border-slate-850 space-y-1">
                    <span className="text-xs font-mono font-bold text-purple-400 uppercase">Azione Derivativa (Kd) - Smorzamento</span>
                    <p className="text-xs text-slate-400">
                      Rappresenta l'ammortizzatore virtuale. La velocità derivatrice smorza lo sfarfallio e contrasta le improvvise variazioni di accelerazione, stabilizzando la posa finale ed eliminando gli shock di inerzia causati dal transitorio.
                    </p>
                  </div>
                </div>
              </div>

              {/* Gravity Compensation */}
              <div className="space-y-2">
                <h3 className="font-display font-semibold text-cyan-400">
                  3. Il Principio della Compensazione Gravitazionale Feedforward
                </h3>
                <p>
                  Senza compensazione attiva (<MathText math="\tau_{ff} = 0" />), un controllore puramente lineare PD non raggiungerà mai l'angolo target in presenza di una forza peso. Questo disallineamento a regime stazionario prende il nome di <strong>Errore di Regolatore statico</strong>:
                </p>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-850 text-center font-mono text-amber-300 flex justify-center items-center gap-1 py-3">
                  <MathText math="e_{ss} \approx \frac{g(q_d)}{K_p}" />
                </div>
                <p className="text-xs text-slate-400">
                  Per annullare l'errore a regime senza introdurre un integratore (che renderebbe la dinamica suscettibile di fastidiosi overshoot o instabilità (Windup)), viene implementata una compensazione della forza peso calcolando all'istante il vettore <MathText math="g(q)" /> e sommandolo come sforzo feedforward (<MathText math="\tau_{ff} = g(q)" />).
                </p>
              </div>

              {/* Experimenting guide */}
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase block">🧪 Esercizio di Taratura Consigliato in App</span>
                <ol className="list-decimal pl-5 text-xs text-slate-400 space-y-1.5">
                  <li>Seleziona <strong>Passivo</strong> e osserva i legami liberi pendolare sotto l'effetto della vera gravità <MathText math="g=9.81" />.</li>
                  <li>Passa a <strong>PD Controller</strong> ma tieni <strong className="text-amber-300">disattivato</strong> il flag "Feedforward Gravity Compensation". Cambia svariate posizioni target e noterai che l'end-effector cade sempre di qualche grado più in basso rispetto al punto di target azzurro o si afferra in obliquo.</li>
                  <li>Prova ad incrementare <code className="text-cyan-305 font-mono">Kp</code> per diminuire tale errore. Noterai che riduce la distanza, ma i giunti iniziano ad oscillare repentinamente se non aumenti proporzionalmente anche <code className="text-cyan-305 font-mono">Kd</code>.</li>
                  <li>Ora <strong>attiva</strong> il flag "Feedforward Gravity Compensation". L'errore stazionario svanisce istantaneamente! Il robot raggiunge l'assetto perfetto, con i motori che ronzano erogando l'esatta coppia necessaria per bilanciare il proprio peso statico.</li>
                </ol>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-850 bg-slate-900 text-right">
              <button
                onClick={() => setIsGuideOpen(false)}
                className="py-2 px-5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-lg transition-all cursor-pointer"
              >
                Ho Capito!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DynamicsControl;
