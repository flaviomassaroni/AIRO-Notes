import React, { useState, useEffect, useRef } from 'react';
import { Target, Settings, Zap, Compass, RotateCcw } from 'lucide-react';

interface IKPlanarProps {
  type: '2r' | '3r';
}

export const IKPlanar: React.FC<IKPlanarProps> = ({ type }) => {
  const [tx, setTx] = useState(1.0);
  const [ty, setTy] = useState(0.5);
  const [tphi, setTphi] = useState(0); // For 3R
  const [l1, setL1] = useState(1.0);
  const [l2, setL2] = useState(0.8);
  const [l3, setL3] = useState(0.5);

  const [solverMethod, setSolverMethod] = useState<'analytical' | 'newton' | 'gradient'>('analytical');
  const [lr, setLr] = useState(0.05); // Learning rate
  const [numSteps, setNumSteps] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // States to hold the current robot configuration
  const [q, setQ] = useState<number[]>(type === '2r' ? [0, 0] : [0, 0, 0]);
  const [analyticalSols, setAnalyticalSols] = useState<number[][]>([]);

  // Simulation step
  useEffect(() => {
    if (solverMethod === 'analytical') {
      let x = tx;
      let y = ty;
      if (type === '3r') {
        const phi = tphi * Math.PI / 180;
        x = tx - l3 * Math.cos(phi);
        y = ty - l3 * Math.sin(phi);
      }
      
      const c2 = (x * x + y * y - l1 * l1 - l2 * l2) / (2 * l1 * l2);
      if (Math.abs(c2) <= 1) {
        const s2_up = Math.sqrt(1 - c2 * c2);
        const s2_down = -Math.sqrt(1 - c2 * c2);
        
        const q2_up = Math.atan2(s2_up, c2);
        const q1_up = Math.atan2(y, x) - Math.atan2(l2 * s2_up, l1 + l2 * c2);
        
        const q2_down = Math.atan2(s2_down, c2);
        const q1_down = Math.atan2(y, x) - Math.atan2(l2 * s2_down, l1 + l2 * c2);
        
        if (type === '2r') {
          setAnalyticalSols([[q1_up, q2_up], [q1_down, q2_down]]);
          setQ([q1_up, q2_up]);
        } else {
          const phi = tphi * Math.PI / 180;
          setAnalyticalSols([
            [q1_up, q2_up, phi - q1_up - q2_up],
            [q1_down, q2_down, phi - q1_down - q2_down]
          ]);
          setQ([q1_up, q2_up, phi - q1_up - q2_up]);
        }
      } else {
        setAnalyticalSols([]);
      }
      setNumSteps(1);
    } else {
      // Numerical solvers: step by step
      let currentQ = [...q];
      let steps = 0;
      let error = 1;
      const phiTarget = tphi * Math.PI / 180;
      
      const interval = setInterval(() => {
        if (error < 0.001 || steps > 100) {
          clearInterval(interval);
          return;
        }

        const [q1, q2] = currentQ;
        const q3 = currentQ[2] || 0;
        
        let ee_x = l1 * Math.cos(q1) + l2 * Math.cos(q1 + q2);
        let ee_y = l1 * Math.sin(q1) + l2 * Math.sin(q1 + q2);
        let ee_phi = q1 + q2;
        
        if (type === '3r') {
          ee_x += l3 * Math.cos(q1 + q2 + q3);
          ee_y += l3 * Math.sin(q1 + q2 + q3);
          ee_phi += q3;
        }

        const ex = tx - ee_x;
        const ey = ty - ee_y;
        const ephi = type === '3r' ? phiTarget - ee_phi : 0;
        // normalize angle error
        const normEphi = Math.atan2(Math.sin(ephi), Math.cos(ephi));
        
        error = Math.hypot(ex, ey) + Math.abs(normEphi);
        if (error < 0.001) return;

        // Jacobian formulation
        let J: number[][] = [];
        if (type === '2r') {
          J = [
            [-l1 * Math.sin(q1) - l2 * Math.sin(q1 + q2), -l2 * Math.sin(q1 + q2)],
            [ l1 * Math.cos(q1) + l2 * Math.cos(q1 + q2),  l2 * Math.cos(q1 + q2)]
          ];
          const E = [ex, ey];
          
          if (solverMethod === 'newton') {
            const det = J[0][0] * J[1][1] - J[0][1] * J[1][0];
            if (Math.abs(det) < 0.0001) {
              clearInterval(interval); return; // Singularity
            }
            const Jinv = [
              [J[1][1] / det, -J[0][1] / det],
              [-J[1][0] / det, J[0][0] / det]
            ];
            const dq1 = Jinv[0][0] * E[0] + Jinv[0][1] * E[1];
            const dq2 = Jinv[1][0] * E[0] + Jinv[1][1] * E[1];
            currentQ[0] += lr * dq1;
            currentQ[1] += lr * dq2;
          } else if (solverMethod === 'gradient') {
            const dq1 = J[0][0] * E[0] + J[1][0] * E[1];
            const dq2 = J[0][1] * E[0] + J[1][1] * E[1];
            currentQ[0] += lr * dq1;
            currentQ[1] += lr * dq2;
          }
        } else if (type === '3r') {
          J = [
            [-l1 * Math.sin(q1) - l2 * Math.sin(q1 + q2) - l3 * Math.sin(q1 + q2 + q3), -l2 * Math.sin(q1 + q2) - l3 * Math.sin(q1 + q2 + q3), -l3 * Math.sin(q1 + q2 + q3)],
            [l1 * Math.cos(q1) + l2 * Math.cos(q1 + q2) + l3 * Math.cos(q1 + q2 + q3), l2 * Math.cos(q1 + q2) + l3 * Math.cos(q1 + q2 + q3), l3 * Math.cos(q1 + q2 + q3)],
            [1, 1, 1]
          ];
          const E = [ex, ey, normEphi];
          
          if (solverMethod === 'newton') {
             // 3x3 determinant & inversion (Cramer)
             const det = J[0][0]*(J[1][1]*J[2][2] - J[1][2]*J[2][1]) - J[0][1]*(J[1][0]*J[2][2] - J[1][2]*J[2][0]) + J[0][2]*(J[1][0]*J[2][1] - J[1][1]*J[2][0]);
             if (Math.abs(det) < 0.0001) { clearInterval(interval); return; }
             
             const Jinv = [
                // INV ROW 1
                [(J[1][1]*J[2][2] - J[1][2]*J[2][1])/det, -(J[0][1]*J[2][2] - J[0][2]*J[2][1])/det, (J[0][1]*J[1][2] - J[0][2]*J[1][1])/det],
                // INV ROW 2
                [-(J[1][0]*J[2][2] - J[1][2]*J[2][0])/det, (J[0][0]*J[2][2] - J[0][2]*J[2][0])/det, -(J[0][0]*J[1][2] - J[0][2]*J[1][0])/det],
                // INV ROW 3
                [(J[1][0]*J[2][1] - J[1][1]*J[2][0])/det, -(J[0][0]*J[2][1] - J[0][1]*J[2][0])/det, (J[0][0]*J[1][1] - J[0][1]*J[1][0])/det]
             ];
             currentQ[0] += lr * (Jinv[0][0]*E[0] + Jinv[0][1]*E[1] + Jinv[0][2]*E[2]);
             currentQ[1] += lr * (Jinv[1][0]*E[0] + Jinv[1][1]*E[1] + Jinv[1][2]*E[2]);
             currentQ[2] += lr * (Jinv[2][0]*E[0] + Jinv[2][1]*E[1] + Jinv[2][2]*E[2]);
          } else {
             // Gradient J^T E
             currentQ[0] += lr * (J[0][0]*E[0] + J[1][0]*E[1] + J[2][0]*E[2]);
             currentQ[1] += lr * (J[0][1]*E[0] + J[1][1]*E[1] + J[2][1]*E[2]);
             currentQ[2] += lr * (J[0][2]*E[0] + J[1][2]*E[1] + J[2][2]*E[2]);
          }
        }
        
        setQ([...currentQ]);
        steps++;
        setNumSteps(steps);
      }, 50);

      return () => clearInterval(interval);
    }
  }, [tx, ty, tphi, l1, l2, l3, solverMethod, lr, type]);

  // Painter
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0,0, canvas.width, canvas.height);
    const cx = canvas.width / 2;
    const cy = canvas.height * 0.55;
    const scale = 100;
    const proj = (x: number, y: number) => [cx + x * scale, cy - y * scale];

    // Grid
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1;
    for (let i=-3; i<=3; i+=0.5) {
      ctx.beginPath(); ctx.moveTo(cx+i*scale, 0); ctx.lineTo(cx+i*scale, canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, cy-i*scale); ctx.lineTo(canvas.width, cy-i*scale); ctx.stroke();
    }

    // Target
    const [tpx, tpy] = proj(tx, ty);
    ctx.strokeStyle = '#f43f5e'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(tpx, tpy, 8, 0, Math.PI*2); ctx.stroke();
    if (type === '3r') {
      const phi = tphi * Math.PI/180;
      ctx.beginPath(); ctx.moveTo(tpx, tpy); ctx.lineTo(tpx + 20*Math.cos(phi), tpy - 20*Math.sin(phi)); ctx.stroke();
    }

    // Robot arm draw
    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth=4;
    const j0 = proj(0,0);
    const j1 = proj(l1*Math.cos(q[0]), l1*Math.sin(q[0]));
    const j2 = proj(l1*Math.cos(q[0])+l2*Math.cos(q[0]+q[1]), l1*Math.sin(q[0])+l2*Math.sin(q[0]+q[1]));
    
    ctx.beginPath(); ctx.moveTo(j0[0], j0[1]); ctx.lineTo(j1[0], j1[1]); ctx.lineTo(j2[0], j2[1]);
    
    if (type === '3r') {
      const ee = proj(
        l1*Math.cos(q[0])+l2*Math.cos(q[0]+q[1])+l3*Math.cos(q[0]+q[1]+q[2]),
        l1*Math.sin(q[0])+l2*Math.sin(q[0]+q[1])+l3*Math.sin(q[0]+q[1]+q[2])
      );
      ctx.lineTo(ee[0], ee[1]);
    }
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath(); ctx.arc(j0[0],j0[1],4,0,2*Math.PI); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(j1[0],j1[1],4,0,2*Math.PI); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(j2[0],j2[1],4,0,2*Math.PI); ctx.fill(); ctx.stroke();
  }, [q, tx, ty, tphi, l1, l2, l3, type]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
      <div className="lg:col-span-7 space-y-4">
        <div className="bg-slate-950 p-1 border border-slate-800 rounded-xl overflow-hidden relative">
          <span className="absolute top-3 left-4 text-[9px] font-mono tracking-widest text-slate-400 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded uppercase">
             Laboratorio IK - Disegno Real-Time
          </span>
          <canvas ref={canvasRef} width={600} height={400} className="w-full bg-slate-900 rounded-lg cursor-crosshair" 
            onClick={(e) => {
               const rt = canvasRef.current!.getBoundingClientRect();
               const scale = 100;
               const x = (e.clientX - rt.left - rt.width/2)/scale;
               const y = -(e.clientY - rt.top - rt.height*0.55)/scale;
               setTx(x); setTy(y);
            }}
          />
        </div>
        {solverMethod !== 'analytical' && (
           <div className="flex justify-between text-[10px] text-slate-400 font-mono tracking-wider bg-slate-900 border border-slate-800 p-2 rounded-lg">
             <span>Convergenza Step: {numSteps}</span>
             <span>Errore residuo approssimato {numSteps > 100 ? '(Convergenza lenta)' : ''}</span>
           </div>
        )}
      </div>

      <div className="lg:col-span-5 space-y-6">
        <div className="bg-slate-900/30 border border-slate-800 p-5 rounded-xl space-y-4">
          <div className="font-display font-semibold text-sm text-slate-200 uppercase tracking-widest border-b border-slate-850 pb-2">Target Cartesiano</div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">X (m)</span>
              <input type="number" step="0.1" value={tx.toFixed(2)} onChange={e=>setTx(parseFloat(e.target.value))} className="w-full bg-slate-950 p-1.5 text-slate-200 rounded border border-slate-800"/>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">Y (m)</span>
              <input type="number" step="0.1" value={ty.toFixed(2)} onChange={e=>setTy(parseFloat(e.target.value))} className="w-full bg-slate-950 p-1.5 text-slate-200 rounded border border-slate-800"/>
            </div>
            {type === '3r' && (
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">Orient. φ°</span>
                <input type="number" step="5" value={tphi} onChange={e=>setTphi(parseFloat(e.target.value))} className="w-full bg-slate-950 p-1.5 text-slate-200 rounded border border-slate-800"/>
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-900/30 border border-slate-800 p-5 rounded-xl space-y-4">
          <div className="font-display font-semibold text-sm text-slate-200 uppercase tracking-widest border-b border-slate-850 pb-2">Solutore (Metodo)</div>
          <select value={solverMethod} onChange={(e:any) => setSolverMethod(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-xs font-mono p-2 rounded">
            <option value="analytical">Analitico Esatto</option>
            <option value="newton">Newton-Raphson (J⁻¹)</option>
            <option value="gradient">Gradient Descent (Jᵀ)</option>
          </select>
          {solverMethod !== 'analytical' && (
             <div className="pt-2">
               <label className="text-[10px] text-slate-400 block mb-1 uppercase font-mono tracking-widest">Learning Rate (α): {lr}</label>
               <input type="range" min="0.01" max="0.5" step="0.01" value={lr} onChange={e=>setLr(parseFloat(e.target.value))} className="w-full accent-emerald-500" />
             </div>
          )}
        </div>

        {solverMethod === 'analytical' && analyticalSols.length > 0 && (
          <div className="bg-emerald-950/20 border border-emerald-900/50 p-5 rounded-xl">
            <div className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold mb-3 border-b border-emerald-900/50 pb-2">Soluzioni Analitiche ({analyticalSols.length})</div>
            <div className="space-y-2">
              {analyticalSols.map((s, i) => (
                 <div key={i} className="text-xs font-mono bg-slate-950 p-2 rounded border border-slate-850 text-slate-300 flex justify-between">
                   <span className="text-emerald-500 font-bold">SOL {i+1}:</span> 
                   <span>{s.map(v => (v*180/Math.PI).toFixed(1) + '°').join(' | ')}</span>
                 </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default IKPlanar;
