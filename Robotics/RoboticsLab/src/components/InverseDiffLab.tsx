/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Activity, 
  Cpu, 
  Sliders, 
  HelpCircle,
  ToggleLeft,
  CircleDot,
  Dribbble,
  Crosshair,
  TrendingUp,
  SlidersHorizontal,
  PlusCircle,
  AlertTriangle
} from 'lucide-react';
import { MathText } from './Math';

// Math helpers
function det2x2(A: number[][]): number {
  return A[0][0] * A[1][1] - A[0][1] * A[1][0];
}

function inv2x2(A: number[][]): number[][] | null {
  const det = det2x2(A);
  if (Math.abs(det) < 1e-9) return null;
  return [
    [A[1][1] / det, -A[0][1] / det],
    [-A[1][0] / det, A[0][0] / det]
  ];
}

export const InverseDiffLab: React.FC = () => {
  // Kinematic parameters
  const l1 = 1.0;
  const l2 = 0.8;
  const l3 = 0.6;

  // Controllers config
  const [lambda, setLambda] = useState<number>(0.15); // Damped Least Squares parameter
  const [pseudoinverseType, setPseudoinverseType] = useState<'moore_penrose' | 'dls'>('dls');
  const [nullSpaceTask, setNullSpaceTask] = useState<'none' | 'manual' | 'joint_limits' | 'manipulability' | 'obstacle'>('manipulability');
  
  // Gains
  const [trackerKp, setTrackerKp] = useState<number>(5.0); // Cart feedback gain
  const [nullSpaceGain, setNullSpaceGain] = useState<number>(2.0); // Null-space task gain

  // Manual Null-space joint velocity bias
  const [manualXi1, setManualXi1] = useState<number>(0.0);
  const [manualXi2, setManualXi2] = useState<number>(0.0);
  const [manualXi3, setManualXi3] = useState<number>(0.0);

  const [controlMode, setControlMode] = useState<'open_loop' | 'closed_loop'>('closed_loop');

  // Trajectory settings
  const [trajType, setTrajType] = useState<'circle' | 'figure8' | 'square' | 'mouse'>('circle');
  const [isRunning, setIsRunning] = useState<boolean>(true);

  // Obstacle coords
  const [obstacleX, setObstacleX] = useState<number>(0.3);
  const [obstacleY, setObstacleY] = useState<number>(1.2);
  const [obstacleRadius, setObstacleRadius] = useState<number>(0.22);

  // States for display
  const [telemetry, setTelemetry] = useState({
    q1: 0.0,
    q2: 0.0,
    q3: 0.0,
    dq1: 0.0,
    dq2: 0.0,
    dq3: 0.0,
    x: 0.0,
    y: 0.0,
    targetX: 0.0,
    targetY: 0.0,
    manipIndex: 0.0,
    trackingError: 0.0,
    conditionNumber: 1.0,
  });

  // State refs
  const stateRef = useRef({
    q1: 0.5,    // rad
    q2: 0.8,    // rad
    q3: -0.6,   // rad
    targetX: 1.2,
    targetY: 0.8,
    lastTime: 0,
    trajTime: 0,
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartCanvasRef = useRef<HTMLCanvasElement>(null);

  // History buffer for logging tracking errors & manipulability index
  const trackingHistoryRef = useRef<{ e: number; m: number }[]>([]);

  // Setup / Reset action
  const handleReset = () => {
    stateRef.current.q1 = 0.5;
    stateRef.current.q2 = 0.8;
    stateRef.current.q3 = -0.6;
    stateRef.current.trajTime = 0;
    trackingHistoryRef.current = [];
    
    // Set initial target based on pose to prevent sudden snap
    const q1 = stateRef.current.q1;
    const q2 = stateRef.current.q2;
    const q3 = stateRef.current.q3;
    const x = l1 * Math.cos(q1) + l2 * Math.cos(q1 + q2) + l3 * Math.cos(q1 + q2 + q3);
    const y = l1 * Math.sin(q1) + l2 * Math.sin(q1 + q2) + l3 * Math.sin(q1 + q2 + q3);
    stateRef.current.targetX = x;
    stateRef.current.targetY = y;
  };

  // Trajectory function
  const getTrajectoryPoint = (t: number): { x: number; y: number; dx: number; dy: number } => {
    const w = (2 * Math.PI) / 8.0;
    const angle = w * t;

    if (trajType === 'circle') {
      const cx = 0.8, cy = 0.8, r = 0.45;
      return {
        x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle),
        dx: -r * w * Math.sin(angle), dy: r * w * Math.cos(angle)
      };
    } else if (trajType === 'figure8') {
      const cx = 0.9, cy = 0.8, rx = 0.55, ry = 0.35;
      return {
        x: cx + rx * Math.sin(angle), y: cy + ry * Math.sin(2 * angle),
        dx: rx * w * Math.cos(angle), dy: ry * 2 * w * Math.cos(2 * angle)
      };
    } else if (trajType === 'square') {
      // Simplified: just return position, velocities 0 or numerical deriv
      // (Numerical derivative not needed for square, just keep dx dy 0)
      const cx = 0.8, cy = 0.8, size = 0.8, half = size / 2, period = 8.0;
      const normT = (t % period) / period;
      let lx = cx - half, ly = cy - half;
      let dx = 0, dy = 0;
      const vel = size / (period * 0.25);
      if (normT < 0.25) { lx = cx - half + (normT / 0.25) * size; ly = cy + half; dx = vel; }
      else if (normT < 0.5) { lx = cx + half; ly = cy + half - ((normT - 0.25) / 0.25) * size; dy = -vel; }
      else if (normT < 0.75) { lx = cx + half - ((normT - 0.5) / 0.25) * size; ly = cy - half; dx = -vel; }
      else { lx = cx - half; ly = cy - half + ((normT - 0.75) / 0.25) * size; dy = vel; }
      return { x: lx, y: ly, dx, dy };
    } else {
      return { x: stateRef.current.targetX, y: stateRef.current.targetY, dx: 0, dy: 0 };
    }
  };

  // Secondary objectives helper
  const computeSecondaryObjective = (q: number[]): number => {
    const [q1, q2, q3] = q;

    if (nullSpaceTask === 'joint_limits') {
      // Keep joints in safe center limits [-160deg, 160deg]
      const maxLim = (160 * Math.PI) / 180;
      const minLim = -(160 * Math.PI) / 180;
      const h1 = Math.pow(q1 / maxLim, 2);
      const h2 = Math.pow(q2 / maxLim, 2);
      const h3 = Math.pow(q3 / maxLim, 2);
      return (h1 + h2 + h3); // We want to minimize this, so gradient is fine
    }

    if (nullSpaceTask === 'manipulability') {
      // Maximize Yoshikawa Index w = sqrt(det(J * JT))
      // To maximize, we MINIMIZE negative manipulability
      const J11 = -l1 * Math.sin(q1) - l2 * Math.sin(q1 + q2) - l3 * Math.sin(q1 + q2 + q3);
      const J12 = -l2 * Math.sin(q1 + q2) - l3 * Math.sin(q1 + q2 + q3);
      const J13 = -l3 * Math.sin(q1 + q2 + q3);
      const J21 = l1 * Math.cos(q1) + l2 * Math.cos(q1 + q2) + l3 * Math.cos(q1 + q2 + q3);
      const J22 = l2 * Math.cos(q1 + q2) + l3 * Math.cos(q1 + q2 + q3);
      const J23 = l3 * Math.cos(q1 + q2 + q3);

      const M11 = J11 * J11 + J12 * J12 + J13 * J13;
      const M12 = J11 * J21 + J12 * J22 + J13 * J23;
      const M22 = J21 * J21 + J22 * J22 + J23 * J23;

      const det = M11 * M22 - M12 * M12;
      const w = det > 0 ? Math.sqrt(det) : 0;
      return -w; // negative to minimize
    }

    if (nullSpaceTask === 'obstacle') {
      // Minimize potential function regarding links distance to obstacle
      const p1x = l1 * Math.cos(q1);
      const p1y = l1 * Math.sin(q1);
      const p2x = p1x + l2 * Math.cos(q1 + q2);
      const p2y = p1y + l2 * Math.sin(q1 + q2);

      const d1 = Math.sqrt(Math.pow(p1x - obstacleX, 2) + Math.pow(p1y - obstacleY, 2));
      const d2 = Math.sqrt(Math.pow(p2x - obstacleX, 2) + Math.pow(p2y - obstacleY, 2));

      const cost1 = d1 < 0.4 ? Math.pow(0.4 / (d1 + 0.05), 2) : 0;
      const cost2 = d2 < 0.4 ? Math.pow(0.4 / (d2 + 0.05), 2) : 0;
      return cost1 + cost2;
    }

    return 0;
  };

  // Compute numerical gradient of objective function
  const computeObjectiveGradient = (q: number[]): number[] => {
    const eps = 1e-4;
    const grad = [0, 0, 0];
    
    for (let i = 0; i < 3; i++) {
      const qPlus = [...q];
      const qMinus = [...q];
      qPlus[i] += eps;
      qMinus[i] -= eps;

      const hPlus = computeSecondaryObjective(qPlus);
      const hMinus = computeSecondaryObjective(qMinus);

      grad[i] = (hPlus - hMinus) / (2 * eps);
    }

    return grad;
  };

  // Main real-time simulation loop
  useEffect(() => {
    let animationId = 0;
    stateRef.current.lastTime = performance.now();

    const loop = (timestamp: number) => {
      let dt = (timestamp - stateRef.current.lastTime) / 1000;
      if (dt > 0.08) dt = 0.08;
      if (dt <= 0) dt = 0.016;
      stateRef.current.lastTime = timestamp;

      if (isRunning) {
        stateRef.current.trajTime += dt;
      }

      const q1 = stateRef.current.q1;
      const q2 = stateRef.current.q2;
      const q3 = stateRef.current.q3;

      // 1. Current Cartesian Position
      const currentX = l1 * Math.cos(q1) + l2 * Math.cos(q1 + q2) + l3 * Math.cos(q1 + q2 + q3);
      const currentY = l1 * Math.sin(q1) + l2 * Math.sin(q1 + q2) + l3 * Math.sin(q1 + q2 + q3);

      // 2. Trajectory target
      const target = getTrajectoryPoint(stateRef.current.trajTime);
      if (trajType !== 'mouse') {
        stateRef.current.targetX = target.x;
        stateRef.current.targetY = target.y;
      }

      // Feedforward velocity + simple feedback error task space loop
      const errX = stateRef.current.targetX - currentX;
      const errY = stateRef.current.targetY - currentY;
      const trackingErr = Math.sqrt(errX * errX + errY * errY);

      // CLIK Control formulation
      let xDot = 0;
      let yDot = 0;
      if (controlMode === 'open_loop') {
         xDot = target.dx;
         yDot = target.dy;
      } else {
         xDot = target.dx + trackerKp * errX;
         yDot = target.dy + trackerKp * errY;
      }

      // 3. Compute Jacobian Matrix (2x3)
      const J11 = -l1 * Math.sin(q1) - l2 * Math.sin(q1 + q2) - l3 * Math.sin(q1 + q2 + q3);
      const J12 = -l2 * Math.sin(q1 + q2) - l3 * Math.sin(q1 + q2 + q3);
      const J13 = -l3 * Math.sin(q1 + q2 + q3);
      const J21 = l1 * Math.cos(q1) + l2 * Math.cos(q1 + q2) + l3 * Math.cos(q1 + q2 + q3);
      const J22 = l2 * Math.cos(q1 + q2) + l3 * Math.cos(q1 + q2 + q3);
      const J23 = l3 * Math.cos(q1 + q2 + q3);

      const J = [
        [J11, J12, J13],
        [J21, J22, J23]
      ];

      // J * J^T matrix (2x2)
      const JJT11 = J11 * J11 + J12 * J12 + J13 * J13;
      const JJT12 = J11 * J21 + J12 * J22 + J13 * J23;
      const JJT21 = JJT12;
      const JJT22 = J21 * J21 + J22 * J22 + J23 * J23;

      let A = [
        [JJT11, JJT12],
        [JJT21, JJT22]
      ];

      // Yoshikawa index
      const detJJT = JJT11 * JJT22 - JJT12 * JJT21;
      const manipIndex = detJJT > 0 ? Math.sqrt(detJJT) : 0;

      // Condition Number of A as indicator
      const tr = A[0][0] + A[1][1];
      const disc = Math.sqrt(Math.pow(A[0][0] - A[1][1], 2) + 4 * Math.pow(A[0][1], 2));
      const s1 = (tr + disc) / 2;
      const s2 = Math.max(0.0001, (tr - disc) / 2);
      const conditionNumber = s1 / s2;

      // Add damping if requested
      if (pseudoinverseType === 'dls') {
        A[0][0] += lambda * lambda;
        A[1][1] += lambda * lambda;
      }

      // Inverse of A
      const invA = inv2x2(A);
      
      let dq1 = 0;
      let dq2 = 0;
      let dq3 = 0;

      if (invA) {
        // Pseudo-inverse right-side: J# = J^T * A^-1 (3x2)
        const JT_invA11 = J11 * invA[0][0] + J21 * invA[1][0];
        const JT_invA12 = J11 * invA[0][1] + J21 * invA[1][1];

        const JT_invA21 = J12 * invA[0][0] + J22 * invA[1][0];
        const JT_invA22 = J12 * invA[0][1] + J22 * invA[1][1];

        const JT_invA31 = J13 * invA[0][0] + J23 * invA[1][0];
        const JT_invA32 = J13 * invA[0][1] + J23 * invA[1][1];

        // 1. Particular Joint Velocities (dq_p = J# * [xDot, yDot]^T)
        const dqp1 = JT_invA11 * xDot + JT_invA12 * yDot;
        const dqp2 = JT_invA21 * xDot + JT_invA22 * yDot;
        const dqp3 = JT_invA31 * xDot + JT_invA32 * yDot;

        // 2. Compute Null-Space Projection Matrix P_null = I - J# * J (3x3)
        // Coeff product J# * J
        const pinvJ11 = JT_invA11 * J11 + JT_invA12 * J21;
        const pinvJ12 = JT_invA11 * J12 + JT_invA12 * J22;
        const pinvJ13 = JT_invA11 * J13 + JT_invA12 * J23;

        const pinvJ21 = JT_invA21 * J11 + JT_invA22 * J21;
        const pinvJ22 = JT_invA21 * J12 + JT_invA22 * J22;
        const pinvJ23 = JT_invA21 * J13 + JT_invA22 * J23;

        const pinvJ31 = JT_invA31 * J11 + JT_invA32 * J21;
        const pinvJ32 = JT_invA31 * J12 + JT_invA32 * J22;
        const pinvJ33 = JT_invA31 * J13 + JT_invA32 * J23;

        const P11 = 1 - pinvJ11; const P12 = -pinvJ12; const P13 = -pinvJ13;
        const P21 = -pinvJ21; const P22 = 1 - pinvJ22; const P23 = -pinvJ23;
        const P31 = -pinvJ31; const P32 = -pinvJ32; const P33 = 1 - pinvJ33;

        // Obtain secondary joint velocity vector xi
        let xi = [0, 0, 0];
        if (nullSpaceTask === 'manual') {
          xi = [manualXi1, manualXi2, manualXi3];
        } else if (nullSpaceTask !== 'none') {
          // Minimizing numerical gradient
          const grad = computeObjectiveGradient([q1, q2, q3]);
          xi = [-nullSpaceGain * grad[0], -nullSpaceGain * grad[1], -nullSpaceGain * grad[2]];
        }

        // Project. dq_h = P_null * xi
        const dqh1 = P11 * xi[0] + P12 * xi[1] + P13 * xi[2];
        const dqh2 = P21 * xi[0] + P22 * xi[1] + P23 * xi[2];
        const dqh3 = P31 * xi[0] + P32 * xi[1] + P33 * xi[2];

        // Total joint velocities
        dq1 = dqp1 + dqh1;
        dq2 = dqp2 + dqh2;
        dq3 = dqp3 + dqh3;
      }

      // Numerical integration (Euler)
      if (isRunning) {
        stateRef.current.q1 += dq1 * dt;
        stateRef.current.q2 += dq2 * dt;
        stateRef.current.q3 += dq3 * dt;

        // Keep inside [-Math.PI, Math.PI] to keep things normalized
        const wrapAngle = (a: number) => {
          while (a > Math.PI) a -= 2 * Math.PI;
          while (a < -Math.PI) a += 2 * Math.PI;
          return a;
        };
        stateRef.current.q1 = wrapAngle(stateRef.current.q1);
        stateRef.current.q2 = wrapAngle(stateRef.current.q2);
        stateRef.current.q3 = wrapAngle(stateRef.current.q3);
      }

      // Draw frames
      drawInverseDiffRobot();
      drawInverseDiffChart(manipIndex, trackingErr);

      // Throttled UI telemetry update
      setTelemetry({
        q1: (stateRef.current.q1 * 180) / Math.PI,
        q2: (stateRef.current.q2 * 180) / Math.PI,
        q3: (stateRef.current.q3 * 180) / Math.PI,
        dq1,
        dq2,
        dq3,
        x: currentX,
        y: currentY,
        targetX: stateRef.current.targetX,
        targetY: stateRef.current.targetY,
        manipIndex,
        trackingError: trackingErr,
        conditionNumber,
      });

      // Buffer historical values
      const hist = trackingHistoryRef.current;
      hist.push({ e: trackingErr, m: manipIndex });
      if (hist.length > 165) hist.shift();

      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [isRunning, trajType, trackerKp, pseudoinverseType, lambda, nullSpaceTask, nullSpaceGain, manualXi1, manualXi2, manualXi3, obstacleX, obstacleY]);

  // Handle canvas mouse interaction for target coordinate tracking and obstacle dragging
  const isDraggingObstacleRef = useRef<boolean>(false);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const scale = 110;
    const cx = canvas.width / 2;
    const cy = canvas.height * 0.75;
    const clickX = (mx - cx) / scale;
    const clickY = (cy - my) / scale;

    const dObstacle = Math.hypot(clickX - obstacleX, clickY - obstacleY);
    if (nullSpaceTask === 'obstacle' && dObstacle < obstacleRadius + 0.1) {
      isDraggingObstacleRef.current = true;
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const scale = 110;
    const cx = canvas.width / 2;
    const cy = canvas.height * 0.75;

    if (isDraggingObstacleRef.current) {
      setObstacleX((mx - cx) / scale);
      setObstacleY((cy - my) / scale);
      return;
    }

    if (trajType !== 'mouse') return;
    stateRef.current.targetX = (mx - cx) / scale;
    stateRef.current.targetY = (cy - my) / scale;
  };

  const handleCanvasMouseUp = () => {
    isDraggingObstacleRef.current = false;
  };

  // Rendering robot graphic & interactive indicators
  const drawInverseDiffRobot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const scale = 110;
    const cx = W / 2;
    const cy = H * 0.75; // Offset to give ground feel

    const proj = (x: number, y: number) => [cx + x * scale, cy - y * scale];

    const q1 = stateRef.current.q1;
    const q2 = stateRef.current.q2;
    const q3 = stateRef.current.q3;

    // Kinematics Node positions
    const p1x = l1 * Math.cos(q1);
    const p1y = l1 * Math.sin(q1);
    const p2x = p1x + l2 * Math.cos(q1 + q2);
    const p2y = p1y + l2 * Math.sin(q1 + q2);
    const p3x = p2x + l3 * Math.cos(q1 + q2 + q3);
    const p3y = p2y + l3 * Math.sin(q1 + q2 + q3);

    const [oxProj, oyProj] = proj(0, 0);
    const [p1ProjX, p1ProjY] = proj(p1x, p1y);
    const [p2ProjX, p2ProjY] = proj(p2x, p2y);
    const [p3ProjX, p3ProjY] = proj(p3x, p3y);

    // Target positions indicator
    const tx = stateRef.current.targetX;
    const ty = stateRef.current.targetY;
    const [txProj, tyProj] = proj(tx, ty);

    // Grid coordinates
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();

    // Trace Obstacle circular field
    if (nullSpaceTask === 'obstacle') {
      const [oxObst, oyObst] = proj(obstacleX, obstacleY);
      const radiusPx = obstacleRadius * scale;
      
      // Outer field
      ctx.fillStyle = 'rgba(239, 68, 68, 0.06)';
      ctx.beginPath(); ctx.arc(oxObst, oyObst, radiusPx + 40, 0, Math.PI * 2); ctx.fill();

      // Strong core obstacle
      ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(oxObst, oyObst, radiusPx, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

      ctx.fillStyle = '#f87171';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('OSTACOLO', oxObst - 24, oyObst + 3);
    }

    // Draw reference workspace envelope limit ring
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.06)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(oxProj, oyProj, (l1 + l2 + l3) * scale, 0, Math.PI * 2);
    ctx.stroke();

    // Also draw inner singurality ring at l1 - l2 - l3 absolute limits
    const innerLim = Math.max(0.1, Math.abs(l1 - l2 - l3));
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.03)';
    ctx.beginPath();
    ctx.arc(oxProj, oyProj, innerLim * scale, 0, Math.PI * 2);
    ctx.stroke();

    // Draw active trajectory path trail
    if (trajType !== 'mouse') {
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      for (let t = 0; t < 8.0; t += 0.05) {
        const pt = getTrajectoryPoint(t);
        const [ptx, pty] = proj(pt.x, pt.y);
        if (t === 0) ctx.moveTo(ptx, pty);
        else ctx.lineTo(ptx, pty);
      }
      ctx.stroke();
      ctx.setLineDash([]); // Restore solid lines
    }

    // Trace target pin
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath(); ctx.arc(txProj, tyProj, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Inner pulse
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(txProj, tyProj, 2.5, 0, Math.PI * 2); ctx.fill();

    // DRAW ROBOT LINKS
    // Link 1
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(oxProj, oyProj); ctx.lineTo(p1ProjX, p1ProjY); ctx.stroke();
    ctx.strokeStyle = '#06b6d4'; // cyan
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(oxProj, oyProj); ctx.lineTo(p1ProjX, p1ProjY); ctx.stroke();

    // Link 2
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 11;
    ctx.beginPath(); ctx.moveTo(p1ProjX, p1ProjY); ctx.lineTo(p2ProjX, p2ProjY); ctx.stroke();
    ctx.strokeStyle = '#a855f7'; // purple
    ctx.lineWidth = 5.5;
    ctx.beginPath(); ctx.moveTo(p1ProjX, p1ProjY); ctx.lineTo(p2ProjX, p2ProjY); ctx.stroke();

    // Link 3
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 8.5;
    ctx.beginPath(); ctx.moveTo(p2ProjX, p2ProjY); ctx.lineTo(p3ProjX, p3ProjY); ctx.stroke();
    ctx.strokeStyle = '#ec4899'; // pink
    ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(p2ProjX, p2ProjY); ctx.lineTo(p3ProjX, p3ProjY); ctx.stroke();

    // Joint Nodes Hubs
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 2;

    // Joint 1 (Base)
    ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(oxProj, oyProj, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#06b6d4'; ctx.beginPath(); ctx.arc(oxProj, oyProj, 4, 0, Math.PI * 2); ctx.fill();

    // Joint 2
    ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(p1ProjX, p1ProjY, 7.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#a855f7'; ctx.beginPath(); ctx.arc(p1ProjX, p1ProjY, 3.5, 0, Math.PI * 2); ctx.fill();

    // Joint 3
    ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(p2ProjX, p2ProjY, 6.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ec4899'; ctx.beginPath(); ctx.arc(p2ProjX, p2ProjY, 3, 0, Math.PI * 2); ctx.fill();

    // End-Effector Tip (Active Tracker dot)
    ctx.fillStyle = trackingHistoryRef.current.length > 0 && trackingHistoryRef.current[trackingHistoryRef.current.length-1].e > 0.05 ? '#e11d48' : '#22c55e'; // red if tracking lost
    ctx.beginPath(); ctx.arc(p3ProjX, p3ProjY, 5.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  };

  // Render secondary chart
  const drawInverseDiffChart = (manipIndex: number, trackingErr: number) => {
    const canvas = chartCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const padL = 35;
    const padR = 10;
    const padTop = 15;
    const padBottom = 15;
    const chartW = W - padL - padR;
    const chartH = H - padTop - padBottom;

    const history = trackingHistoryRef.current;
    if (history.length < 2) return;

    // Coordinate grid lines
    ctx.strokeStyle = 'rgba(74, 85, 104, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padL, padTop); ctx.lineTo(W - padR, padTop); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(padL, padTop + chartH); ctx.lineTo(W - padR, padTop + chartH); ctx.stroke();
    
    // Middle dotted reference line
    ctx.strokeStyle = 'rgba(74, 85, 104, 0.15)';
    ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.moveTo(padL, padTop + chartH / 2); ctx.lineTo(W - padR, padTop + chartH / 2); ctx.stroke();
    ctx.setLineDash([]);

    const getX = (idx: number) => padL + (idx / 160) * chartW;

    // Manipulability Index is on range [0, 1.2], Tracking error on scale [0, 0.15]
    const getYManip = (val: number) => {
      const ratio = Math.min(1.0, val / 1.1);
      return padTop + chartH - ratio * chartH;
    };

    const getYError = (val: number) => {
      const ratio = Math.min(1.0, val / 0.18);
      return padTop + chartH - ratio * chartH;
    };

    // Plot Manipulability Index (Violet)
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(getX(0), getYManip(history[0].m));
    for (let i = 1; i < history.length; i++) {
      ctx.lineTo(getX(i), getYManip(history[i].m));
    }
    ctx.stroke();

    // Plot Tracking Error (Rose/Red)
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(getX(0), getYError(history[0].e));
    for (let i = 1; i < history.length; i++) {
      ctx.lineTo(getX(i), getYError(history[i].e));
    }
    ctx.stroke();

    // Text axes labels
    ctx.font = '7px monospace';
    ctx.fillStyle = '#a855f7';
    ctx.fillText('M_max=1.1', 2, padTop + 6);
    ctx.fillStyle = '#f43f5e';
    ctx.fillText('E_max=18cm', 2, padTop + chartH - 3);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 8.5px Inter';
    ctx.fillText('MANIPULABILITÀ vs ERRORE CARTEZIANO DI INSEGUIMENTO', padL + 12, padTop - 5);
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      {/* Module Title Section */}
      <div className="border-b border-slate-800 pb-4">
        <span className="text-xs font-mono text-cyan-400 tracking-wider uppercase font-bold text-sky-400">
          LABORATORIO AVANZATO — CINEMATICA DIFFERENZIALE INVERSA
        </span>
        <h1 className="text-2xl font-bold text-white tracking-tight font-display mt-0.5">
          Visualizzatore Null-Space & pseudo-inversione DLS
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Risolvi la ridondanza planare del braccio {l1 + l2 + l3}m 3R. Esplora il comportamento delle velocità ai giunti in prossimità delle singolarità cinematica con pseudo-inversione semplice di Moore-Penrose ed evita il collasso computazionale grazie all'inversione smorzata Damped Least Squares (DLS). Proietta obiettivi secondari nel Null-Space.
        </p>
      </div>

      {/* Main Grid Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column: Lab Renderings */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-950 p-1 border border-slate-800 rounded-xl overflow-hidden relative">
            <span className="absolute top-3 left-4 text-[9px] font-mono tracking-widest text-[#06b6d4] bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-sky-400 border-sky-800/40 bg-sky-950/40">
              Robot 3R + Target di Traiettoria
            </span>

            {/* Float Controls */}
            <div className="absolute top-3 right-4 flex items-center gap-2">
              <button 
                onClick={() => setIsRunning(!isRunning)}
                className={`flex items-center gap-1 px-2.5 py-1 text-[9.5px] font-mono font-bold rounded border transition-all cursor-pointer ${
                  isRunning 
                    ? 'bg-amber-950/40 text-amber-400 border-amber-800/40 hover:bg-amber-900/30' 
                    : 'bg-green-950/40 text-green-400 border-green-800/40 hover:bg-green-900/30'
                }`}
              >
                {isRunning ? (
                  <>
                    <Square className="w-2.5 h-2.5 fill-current" />
                    PAUSA RUN
                  </>
                ) : (
                  <>
                    <Play className="w-2.5 h-2.5 fill-current" />
                    AVVIA RUN
                  </>
                )}
              </button>
              <button 
                onClick={handleReset}
                className="flex items-center gap-1 bg-slate-900 hover:bg-slate-850 px-2.5 py-1 text-[9.5px] font-mono font-bold rounded border border-slate-850 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                REINIT POSE
              </button>
            </div>

            <canvas
              ref={canvasRef}
              width={500}
              height={310}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              className="bg-gray-950 w-full block rounded-lg cursor-crosshair"
            />
            
            {trajType === 'mouse' && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] bg-cyan-950/70 border border-cyan-800 text-cyan-300 px-3 py-1 rounded font-mono uppercase tracking-wider text-center pointer-events-none bg-sky-950/80 border-sky-800 text-sky-400">
                Muovi il cursore sul canvas per far seguire il mouse al robot!
              </div>
            )}
          </div>

          {/* Quality Tracker Plot */}
          <div className="bg-slate-950 p-3 border border-slate-800 rounded-xl">
            <canvas ref={chartCanvasRef} width={500} height={105} className="w-full block" />
            <div className="flex justify-center gap-6 mt-1.5 text-[8px] uppercase font-mono tracking-wider">
              <span className="flex items-center gap-1 text-[#a855f7]">
                <span className="w-2 h-0.5 bg-[#a855f7]" /> Indice di Manipulabilità w(q) (Alto è Destro)
              </span>
              <span className="flex items-center gap-1 text-[#f43f5e]">
                <span className="w-2 h-0.5 bg-[#f43f5e]" /> Errore Cartesiano Inseguimento (e)
              </span>
            </div>
          </div>

          {/* Damping Singularity Warning info box */}
          {telemetry.conditionNumber > 45 && (
            <div className="p-3.5 bg-rose-955/20 border border-rose-900/60 text-rose-400 rounded-xl flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
              <div className="text-xs font-sans space-y-1">
                <span className="font-bold block uppercase text-[10px] tracking-wider font-mono text-rose-300">
                  ⚠️ Forte Condizionamento Jacobian (Vicinanza a Singolarità!)
                </span>
                <p>
                  Numero di condizionamento <code className="text-rose-300 font-bold">{telemetry.conditionNumber.toFixed(0)}</code> critico. 
                  {pseudoinverseType === 'moore_penrose' ? (
                    <span> La pseudo-inversione pura Moore-Penrose sta inviando velocità ai giunti fuori norma: dq/dt = [{(telemetry.dq1).toFixed(1)}, {(telemetry.dq2).toFixed(1)}, {(telemetry.dq3).toFixed(1)}] rad/s, provocando evidenti sfarfallii strutturali. Attiva l'inversione smorzata DLS per stabilizzare!</span>
                  ) : (
                    <span> L'inversione DLS sta smorzando stabilmente le velocità angolari, accettando un piccolo errore di deviazione cartesiano provvisorio di { (telemetry.trackingError * 100).toFixed(1) } cm per salvaguardare i giunti.</span>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right column: Config parametrics */}
        <div className="lg:col-span-5 space-y-5">
          {/* Section 1: Trajectory Profile Config */}
          <div className="bg-slate-900/30 border border-slate-800 p-4 rounded-xl space-y-3">
            <span className="font-display font-semibold text-xs text-slate-400 uppercase tracking-wider block">
              🎯 Configura Profilo Traiettoria & CLIK
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {(['circle', 'figure8', 'square', 'mouse'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => {
                    setTrajType(type);
                    if (type === 'mouse') {
                      setIsRunning(true);
                      setControlMode('closed_loop'); // Force closed loop for mouse to follow properly
                    }
                  }}
                  className={`py-1.5 px-1 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    trajType === type
                      ? 'bg-sky-950/50 border border-sky-800 text-sky-400'
                      : 'bg-slate-950/45 text-slate-400 border border-slate-900 hover:bg-slate-950 hover:text-slate-200'
                  }`}
                >
                  {type === 'figure8' ? 'Otto' : type === 'mouse' ? 'Mouse (x,y)' : type === 'circle' ? 'Cerchio' : 'Quadrato'}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setControlMode('open_loop')} className={`flex-1 py-1 text-[10px] font-bold uppercase rounded border transition-all ${controlMode === 'open_loop' ? 'bg-amber-950/40 border-amber-800 text-amber-400' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'}`}>Open-Loop (Solo FF)</button>
              <button onClick={() => setControlMode('closed_loop')} className={`flex-1 py-1 text-[10px] font-bold uppercase rounded border transition-all ${controlMode === 'closed_loop' ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'}`}>Closed-Loop (CLIK)</button>
            </div>

            <div className={`space-y-1 pt-1.5 transition-opacity ${controlMode === 'open_loop' ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-slate-400">Guadagno CLIK Kp Inseguimento</span>
                <span className="text-sky-400 font-bold">{trackerKp.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="12"
                step="0.5"
                value={trackerKp}
                onChange={(e) => setTrackerKp(Number(e.target.value))}
                className="w-full accent-sky-500 text-xs"
              />
            </div>
          </div>

          {/* Section 2: Jacobiana & Pseudoinverse selection */}
          <div className="bg-slate-900/30 border border-slate-800 p-4 rounded-xl space-y-3">
            <span className="font-display font-semibold text-xs text-slate-400 uppercase tracking-wider block">
              💻 Risolutore Cinematica Differenziale
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPseudoinverseType('moore_penrose')}
                className={`py-2 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                  pseudoinverseType === 'moore_penrose'
                    ? 'bg-purple-950/50 text-purple-300 border-purple-800'
                    : 'bg-slate-950/40 text-slate-400 border-slate-850 hover:bg-slate-950'
                }`}
                title="Jacobian Pseudoinverse (J+)"
              >
                <span>Moore-Penrose</span>
                <span className="text-[8px] font-mono font-normal text-slate-400">J⁺ = Jᵀ(JJᵀ)⁻¹</span>
              </button>
              <button
                onClick={() => setPseudoinverseType('dls')}
                className={`py-2 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                  pseudoinverseType === 'dls'
                    ? 'bg-cyan-950/50 text-cyan-300 border-cyan-800 bg-sky-950/50 text-sky-300 border-sky-800'
                    : 'bg-slate-950/40 text-slate-400 border-slate-850 hover:bg-slate-950'
                }`}
                title="Damped Least Squares (DLS)"
              >
                <span>Damped Least Squares</span>
                <span className="text-[8px] font-mono font-normal text-slate-400">J* = Jᵀ(JJᵀ + λ²I)⁻¹</span>
              </button>
            </div>

            {pseudoinverseType === 'dls' && (
              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-850 space-y-2">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Fattore di Smorzamento (λ)</span>
                  <span className="text-cyan-400 font-bold text-sky-400">{lambda.toFixed(3)}</span>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="0.8"
                  step="0.01"
                  value={lambda}
                  onChange={(e) => setLambda(Number(e.target.value))}
                  className="w-full accent-cyan-500 accent-sky-500"
                />
                <span className="text-[9px] text-slate-400 block font-sans leading-tight">
                  Valori più alti prevengono oscillazioni vicini ai limiti ma aumentano l'errore sistematico cartesiano.
                </span>
              </div>
            )}
          </div>

          {/* Section 3: Redundancy Null-space Resolutions */}
          <div className="bg-slate-900/30 border border-slate-800 p-4 rounded-xl space-y-3">
            <span className="font-display font-semibold text-xs text-slate-400 uppercase tracking-wider block">
              🌌 Compiti Autonomi nel Spazio Nullo (Null-Space)
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'none', label: 'Disattiva' },
                { id: 'manipulability', label: 'Massimizza Destrezza' },
                { id: 'joint_limits', label: 'Evita Limiti Giunti' },
                { id: 'obstacle', label: 'Evita Ostacolo' },
                { id: 'manual', label: 'Slider Manuali' }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setNullSpaceTask(item.id as any)}
                  className={`py-1.5 px-2 rounded-md text-[10px] font-bold text-center transition-all cursor-pointer ${
                    nullSpaceTask === item.id
                      ? 'bg-purple-950/55 text-purple-300 border border-purple-800'
                      : 'bg-slate-950/45 text-slate-400 border border-slate-900 hover:bg-slate-950 hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {nullSpaceTask === 'manual' && (
              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-850 space-y-3">
                <span className="text-[10px] font-mono text-cyan-400 font-bold block border-b border-slate-800 pb-1 uppercase text-sky-400">
                  Vettore di Controllo Manuale (ξ) - Elbow Dance
                </span>
                
                {/* xi1 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-slate-450">Velocità Giunto 1</span>
                    <span className="text-purple-400 font-bold">{(manualXi1).toFixed(2)} rad/s</span>
                  </div>
                  <input
                    type="range"
                    min="-4.0"
                    max="4.0"
                    step="0.1"
                    value={manualXi1}
                    onChange={(e) => setManualXi1(Number(e.target.value))}
                    className="w-full accent-purple-500 text-xs"
                  />
                </div>

                {/* xi2 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-slate-450">Velocità Giunto 2</span>
                    <span className="text-purple-400 font-bold">{(manualXi2).toFixed(2)} rad/s</span>
                  </div>
                  <input
                    type="range"
                    min="-4.0"
                    max="4.0"
                    step="0.1"
                    value={manualXi2}
                    onChange={(e) => setManualXi2(Number(e.target.value))}
                    className="w-full accent-purple-500 text-xs"
                  />
                </div>

                {/* xi3 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-slate-450">Velocità Giunto 3</span>
                    <span className="text-purple-400 font-bold">{(manualXi3).toFixed(2)} rad/s</span>
                  </div>
                  <input
                    type="range"
                    min="-4.0"
                    max="4.0"
                    step="0.1"
                    value={manualXi3}
                    onChange={(e) => setManualXi3(Number(e.target.value))}
                    className="w-full accent-purple-505 accent-purple-500 text-xs"
                  />
                </div>
                <p className="text-[9.5px] text-purple-400 font-mono text-center">
                  In tempo reale viene applicato: <code className="text-white">(I - J⁺J) ξ</code>. L'end-effector resta fermo!
                </p>
              </div>
            )}

            {nullSpaceTask !== 'none' && nullSpaceTask !== 'manual' && (
              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-850 space-y-2">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Guadagno Proiezione (K_null)</span>
                  <span className="text-purple-400 font-bold">{nullSpaceGain.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="8.0"
                  step="0.1"
                  value={nullSpaceGain}
                  onChange={(e) => setNullSpaceGain(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />

                {nullSpaceTask === 'obstacle' && (
                  <div className="pt-2 border-t border-slate-850 space-y-2">
                    <span className="text-[9px] font-mono text-slate-450 uppercase block">Posiziona Ostacolo Repulsivo</span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="flex justify-between text-[9px] font-mono">
                          <span className="text-slate-450">Coord X</span>
                          <span className="text-slate-200">{obstacleX.toFixed(2)}m</span>
                        </div>
                        <input
                          type="range"
                          min="-1.5"
                          max="1.5"
                          step="0.05"
                          value={obstacleX}
                          onChange={(e) => setObstacleX(Number(e.target.value))}
                          className="w-full accent-red-400 text-xs"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[9px] font-mono">
                          <span className="text-slate-450">Coord Y</span>
                          <span className="text-slate-200">{obstacleY.toFixed(2)}m</span>
                        </div>
                        <input
                          type="range"
                          min="-1.5"
                          max="1.5"
                          step="0.05"
                          value={obstacleY}
                          onChange={(e) => setObstacleY(Number(e.target.value))}
                          className="w-full accent-red-400 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 4: Live Telemetry Values */}
          <div className="bg-slate-900/30 border border-slate-800 p-4 rounded-xl space-y-3">
            <span className="font-display font-semibold text-xs text-slate-400 uppercase tracking-wider block">
              📊 Equazione Differenziale & Telemetria
            </span>

            <div className="font-mono text-[10.5px] p-3 bg-slate-950 rounded-lg border border-slate-850 leading-relaxed text-slate-300">
              <span className="text-[9px] text-[#06b6d4] font-bold tracking-wider uppercase block border-b border-slate-850/60 pb-1 mb-1.5 text-sky-400">
                Stato Istantaneo dei Giunti
              </span>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>q₁ (Spalla):</span>
                  <span className="text-sky-400 font-bold">{telemetry.q1.toFixed(1)}°</span>
                </div>
                <div className="flex justify-between">
                  <span>q₂ (Gomito):</span>
                  <span className="text-purple-400 font-bold">{telemetry.q2.toFixed(1)}°</span>
                </div>
                <div className="flex justify-between">
                  <span>q₃ (Polso):</span>
                  <span className="text-pink-400 font-bold">{telemetry.q3.toFixed(1)}°</span>
                </div>
                <div className="flex justify-between border-t border-slate-850/60 pt-1 mt-1">
                  <span>dq₁/dt (Spalla):</span>
                  <span>{telemetry.dq1.toFixed(3)} rad/s</span>
                </div>
                <div className="flex justify-between">
                  <span>dq₂/dt (Gomito):</span>
                  <span>{telemetry.dq2.toFixed(2)} rad/s</span>
                </div>
                <div className="flex justify-between">
                  <span>dq₃/dt (Polso):</span>
                  <span>{telemetry.dq3.toFixed(2)} rad/s</span>
                </div>
                <div className="flex justify-between border-t border-slate-850/60 pt-1 mt-1 font-bold">
                  <span>Errore di Posizionamento (e):</span>
                  <span className="text-cyan-400 text-sky-400">{(telemetry.trackingError*100).toFixed(2)} cm</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Yoshikawa Manipulability:</span>
                  <span className="text-purple-400">{telemetry.manipIndex.toFixed(4)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InverseDiffLab;
