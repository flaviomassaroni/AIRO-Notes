import React, { useState, useEffect, useRef } from 'react';
import { Spline, Clock, Activity, AlertOctagon, RefreshCw } from 'lucide-react';

interface Datapoint {
  t: number;
  cubicPos: number; cubicVel: number; cubicAcc: number;
  quinticPos: number; quinticVel: number; quinticAcc: number;
  trapPos: number; trapVel: number; trapAcc: number;
  trigPos: number; trigVel: number; trigAcc: number;
}

export const TrajectoryStudio: React.FC = () => {
  const [qi, setQi] = useState<number>(0.0);
  const [qf, setQf] = useState<number>(3.0);
  const [duration, setDuration] = useState<number>(4.0); // Selected T
  const [vMax, setVMax] = useState<number>(1.2);
  const [aMax, setAMax] = useState<number>(0.9);
  
  // Time scaling feature
  const [autoScale, setAutoScale] = useState(false);
  const [effectiveDuration, setEffectiveDuration] = useState(4.0);
  const [kFactor, setKFactor] = useState(1.0);

  const posCanvasRef = useRef<HTMLCanvasElement>(null);
  const velCanvasRef = useRef<HTMLCanvasElement>(null);
  const accCanvasRef = useRef<HTMLCanvasElement>(null);

  const [datapoints, setDatapoints] = useState<Datapoint[]>([]);
  const [violations, setViolations] = useState<any>({});

  useEffect(() => {
    let currentT = duration;
    let k = 1.0;
    
    // First pass to find k
    const computePoints = (T: number) => {
       const N = 100;
       const pts: Datapoint[] = [];
       const L = qf - qi;
       const absL = Math.abs(L);
       
       let mV = 0, mA = 0;

       for (let i=0; i<=N; i++) {
         const t = (T * i) / N;
         const tau = T>0 ? t/T : 0;
         
         // Cubic
         const cPos = qi + (3*tau*tau - 2*tau*tau*tau)*L;
         const cVel = T>0 ? (6*tau - 6*tau*tau)*L/T : 0;
         const cAcc = T>0 ? (6 - 12*tau)*L/(T*T) : 0;
         
         // Quintic
         const qPos = qi + L * (10*Math.pow(tau,3) - 15*Math.pow(tau,4) + 6*Math.pow(tau,5));
         const qVel = T>0 ? L * (30*Math.pow(tau,2) - 60*Math.pow(tau,3) + 30*Math.pow(tau,4))/T : 0;
         const qAcc = T>0 ? L * (60*tau - 180*Math.pow(tau,2) + 120*Math.pow(tau,3))/(T*T) : 0;
         
         // Trigonometric Rest-to-Rest
         const trigPos = qi + L * (tau - (1/(2*Math.PI))*Math.sin(2*Math.PI*tau));
         const trigVel = T>0 ? (L/T) * (1 - Math.cos(2*Math.PI*tau)) : 0;
         const trigAcc = T>0 ? (2*Math.PI*L/(T*T)) * Math.sin(2*Math.PI*tau) : 0;

         // Trapezoidal Bang-Coast-Bang
         // If aMax limits are used
         const a_plat = aMax * Math.sign(L);
         const tc = Math.sqrt(absL / aMax);
         let tPos=qi, tVel=0, tAcc=0;
         if (absL < (vMax*vMax)/aMax) {
            // Triangle
            if (T >= 2*tc) {
               const v_peak = (2*L)/T;
               const a_eff = (2*v_peak)/T;
               if (t <= T/2) {
                 tPos = qi + 0.5*a_eff*t*t; tVel = a_eff*t; tAcc = a_eff;
               } else {
                 const rt = T - t;
                 tPos = qf - 0.5*a_eff*rt*rt; tVel = a_eff*rt; tAcc = -a_eff;
               }
            } else {
               const a_eff = aMax * Math.sign(L);
               if (t <= T/2) {
                 tPos = qi + 0.5*a_eff*t*t; tVel = a_eff*t; tAcc = a_eff;
               } else {
                 const rt = T - t;
                 tPos = qf - 0.5*a_eff*rt*rt; tVel = a_eff*rt; tAcc = -a_eff;
               }
            }
         } else {
            // Trapezoid
            const tc_trap = vMax / aMax;
            if (T >= 2*tc_trap) {
               const v_p = vMax * Math.sign(L);
               if (t <= tc_trap) {
                  tPos = qi + 0.5*a_plat*t*t; tVel = a_plat*t; tAcc = a_plat;
               } else if (t <= T - tc_trap) {
                  tPos = qi + 0.5*a_plat*tc_trap*tc_trap + v_p*(t - tc_trap); tVel = v_p; tAcc = 0;
               } else {
                  const rt = T - t;
                  tPos = qf - 0.5*a_plat*rt*rt; tVel = a_plat*rt; tAcc = -a_plat;
               }
            } else {
               const a_scaled = (4*L)/(T*T);
               if (t <= T/2) {
                  tPos = qi+0.5*a_scaled*t*t; tVel=a_scaled*t; tAcc=a_scaled;
               } else {
                  const rt=T-t; tPos=qf-0.5*a_scaled*rt*rt; tVel=a_scaled*rt; tAcc=-a_scaled;
               }
            }
         }
         
         mV = Math.max(mV, Math.abs(cVel), Math.abs(qVel), Math.abs(trigVel), Math.abs(tVel));
         mA = Math.max(mA, Math.abs(cAcc), Math.abs(qAcc), Math.abs(trigAcc), Math.abs(tAcc));

         pts.push({
           t, cubicPos: cPos, cubicVel: cVel, cubicAcc: cAcc,
           quinticPos: qPos, quinticVel: qVel, quinticAcc: qAcc,
           trigPos, trigVel, trigAcc,
           trapPos: tPos, trapVel: tVel, trapAcc: tAcc
         });
       }
       return {pts, mV, mA};
    };

    let res = computePoints(duration);
    let currentK = 1.0;

    if (autoScale) {
       const kv = res.mV / vMax;
       const ka = Math.sqrt(res.mA / aMax);
       currentK = Math.max(1.0, kv, ka);
       if (currentK > 1.0) {
          res = computePoints(duration * currentK);
       }
    }

    setEffectiveDuration(duration * currentK);
    setKFactor(currentK);
    setDatapoints(res.pts);

    setViolations({
      v: res.mV > vMax + 0.01 && !autoScale,
      a: res.mA > aMax + 0.01 && !autoScale
    });

  }, [qi, qf, duration, vMax, aMax, autoScale]);

  // Painter generic
  const paintPlot = (canvas: HTMLCanvasElement|null, type: 'pos'|'vel'|'acc', title: string) => {
     if (!canvas || datapoints.length === 0) return;
     const ctx = canvas.getContext('2d'); if (!ctx) return;
     const W = canvas.width, H = canvas.height;
     ctx.clearRect(0,0,W,H);

     const padL=35, padR=15, padY=25, pW=W-padL-padR, pH=H-2*padY;
     let minV=0, maxV=0;
     if (type==='pos') { minV=Math.min(qi,qf,0); maxV=Math.max(qi,qf,1); }
     else if (type==='vel') { minV=-vMax*1.2; maxV=vMax*1.2; }
     else { minV=-aMax*1.2; maxV=aMax*1.2; }
     const range = maxV - minV || 1;

     const px = (t:number) => padL + (t/effectiveDuration)*pW;
     const py = (v:number) => padY + pH - ((v-minV)/range)*pH;

     ctx.strokeStyle = '#1e293b'; ctx.lineWidth=1;
     for (let i=0; i<=4; i++) {
        const y = py(minV + (i/4)*range);
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W-padR, y); ctx.stroke();
        ctx.fillStyle='#64748b'; ctx.font='8px mono'; ctx.fillText((minV + (i/4)*range).toFixed(1), 2, y+3);
     }
     if (py(0) >= padY && py(0) <= padY+pH) {
        ctx.strokeStyle = 'rgba(100,116,139,0.3)'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(padL,py(0)); ctx.lineTo(W-padR,py(0)); ctx.stroke();
     }

     if (type !== 'pos') {
        const lim = type === 'vel' ? vMax : aMax;
        ctx.strokeStyle = '#ef4444'; ctx.setLineDash([4,4]);
        ctx.beginPath(); ctx.moveTo(padL,py(lim)); ctx.lineTo(W-padR,py(lim)); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(padL,py(-lim)); ctx.lineTo(W-padR,py(-lim)); ctx.stroke();
        ctx.setLineDash([]);
     }

     const drawLine = (pts: number[], color: string, w:number, vio:boolean) => {
        ctx.strokeStyle = vio ? '#ef4444' : color;
        ctx.lineWidth = vio ? w+1 : w;
        ctx.beginPath(); ctx.moveTo(px(datapoints[0].t), py(pts[0]));
        for (let i=1; i<datapoints.length; i++) ctx.lineTo(px(datapoints[i].t), py(pts[i]));
        ctx.stroke();
     };

     if (type==='pos') {
       drawLine(datapoints.map(d=>d.cubicPos), '#38bdf8', 1.5, false); // Cyan
       drawLine(datapoints.map(d=>d.quinticPos), '#c084fc', 1.5, false); // Purple
       drawLine(datapoints.map(d=>d.trigPos), '#a3e635', 1.5, false); // Lime
       drawLine(datapoints.map(d=>d.trapPos), '#fb923c', 2, false); // Orange
     } else if (type==='vel') {
       drawLine(datapoints.map(d=>d.cubicVel), '#38bdf8', 1.5, violations.v);
       drawLine(datapoints.map(d=>d.quinticVel), '#c084fc', 1.5, violations.v);
       drawLine(datapoints.map(d=>d.trigVel), '#a3e635', 1.5, violations.v);
       drawLine(datapoints.map(d=>d.trapVel), '#fb923c', 2, violations.v);
     } else {
       drawLine(datapoints.map(d=>d.cubicAcc), '#38bdf8', 1.5, violations.a);
       drawLine(datapoints.map(d=>d.quinticAcc), '#c084fc', 1.5, violations.a);
       drawLine(datapoints.map(d=>d.trigAcc), '#a3e635', 1.5, violations.a);
       drawLine(datapoints.map(d=>d.trapAcc), '#fb923c', 2, violations.a);
     }
     
     ctx.fillStyle='#fff'; ctx.fillText(title, padL+5, 15);
  };

  useEffect(() => {
    paintPlot(posCanvasRef.current, 'pos', 'Posizione q(t)');
    paintPlot(velCanvasRef.current, 'vel', 'Velocità q_dot(t)');
    paintPlot(accCanvasRef.current, 'acc', 'Accelerazione q_ddot(t)');
  }, [datapoints]);

  return (
    <div className="space-y-6 animate-fade-in bg-slate-950 p-6 rounded-xl border border-slate-800">
      <div className="border-b border-slate-800 pb-4">
        <span className="text-xs font-mono text-amber-400 tracking-wider uppercase font-bold">MODULO 3 — TRAJECTORY PLANNING</span>
        <h1 className="text-2xl font-bold text-white tracking-tight font-display mt-0.5">Pianificazione dello Spazio dei Giunti e Cartesiano</h1>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-4 space-y-4">
           {/* Parameters */}
           <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg">
             <div className="font-bold text-xs uppercase text-slate-300 mb-4 border-b border-slate-800 pb-2">Parametri di Moto (Giunti)</div>
             <div className="space-y-4 text-xs font-mono">
                <div>
                  <span className="flex justify-between text-slate-400 mb-1"><span>q_i (rad)</span> <span>{qi.toFixed(2)}</span></span>
                  <input type="range" min="-3" max="3" step="0.1" value={qi} onChange={e=>setQi(parseFloat(e.target.value))} className="w-full accent-cyan-500" />
                </div>
                <div>
                  <span className="flex justify-between text-slate-400 mb-1"><span>q_f (rad)</span> <span>{qf.toFixed(2)}</span></span>
                  <input type="range" min="-3" max="3" step="0.1" value={qf} onChange={e=>setQf(parseFloat(e.target.value))} className="w-full accent-cyan-500" />
                </div>
                <div>
                  <span className="flex justify-between text-slate-400 mb-1"><span>Durata Base T (s)</span> <span>{duration.toFixed(2)}</span></span>
                  <input type="range" min="1" max="10" step="0.5" value={duration} onChange={e=>setDuration(parseFloat(e.target.value))} className="w-full accent-emerald-500" />
                </div>
             </div>
           </div>

           {/* Constraints & Scaling */}
           <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg space-y-4">
             <div className="font-bold text-xs uppercase text-slate-300 border-b border-slate-800 pb-2">Vincoli & Time Scaling</div>
             
             <div className="space-y-4 text-xs font-mono">
                <div>
                  <span className="flex justify-between text-rose-400 mb-1"><span>v_max (rad/s)</span> <span>{vMax.toFixed(2)}</span></span>
                  <input type="range" min="0.5" max="5" step="0.1" value={vMax} onChange={e=>setVMax(parseFloat(e.target.value))} className="w-full accent-rose-500" />
                </div>
                <div>
                  <span className="flex justify-between text-rose-400 mb-1"><span>a_max (rad/s²)</span> <span>{aMax.toFixed(2)}</span></span>
                  <input type="range" min="0.5" max="5" step="0.1" value={aMax} onChange={e=>setAMax(parseFloat(e.target.value))} className="w-full accent-rose-500" />
                </div>
             </div>

             <div className="p-3 bg-slate-950 border border-slate-800 rounded flex items-center justify-between">
                <span className="text-xs text-slate-300 font-bold">Auto Time-Scaling (k)</span>
                <button onClick={()=>setAutoScale(!autoScale)} className={`px-3 py-1 rounded text-xs font-bold ${autoScale ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  {autoScale ? 'ATTIVO' : 'SPENTO'}
                </button>
             </div>
             {autoScale && kFactor > 1.001 && (
               <div className="text-xs text-emerald-400 font-mono bg-emerald-950/30 p-2 rounded border border-emerald-900/50">
                 Fattore Sca: k = {kFactor.toFixed(3)}<br/>
                 T_new = {(duration * kFactor).toFixed(2)}s
               </div>
             )}
           </div>
        </div>

        <div className="col-span-8 space-y-4">
           {/* Warnings */}
           {(violations.v || violations.a) && !autoScale && (
             <div className="bg-rose-950/50 border border-rose-800 p-3 rounded-lg text-rose-400 text-xs font-mono flex gap-3">
                <AlertOctagon className="w-4 h-4 shrink-0" />
                <span>Limiti d'attuazione violati (curva rossa). Attiva il Time Scaling per dilatare il tempo k = max(1, v/v_max, sqrt(a/a_max)).</span>
             </div>
           )}

           <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
             <canvas ref={posCanvasRef} width={250} height={200} className="w-full bg-slate-900 border border-slate-800 rounded-lg" />
             <canvas ref={velCanvasRef} width={250} height={200} className="w-full bg-slate-900 border border-slate-800 rounded-lg" />
             <canvas ref={accCanvasRef} width={250} height={200} className="w-full bg-slate-900 border border-slate-800 rounded-lg" />
           </div>

           <div className="flex gap-4 justify-center text-[10px] uppercase font-mono bg-slate-900 p-2 rounded-lg border border-slate-800">
             <div className="text-[#38bdf8] font-bold">-- Cubica</div>
             <div className="text-[#c084fc] font-bold">-- Quintica</div>
             <div className="text-[#a3e635] font-bold">-- Trigonometrica</div>
             <div className="text-[#fb923c] font-bold">-- Trapezoidale</div>
           </div>

           <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-2 mt-4 text-xs font-sans text-slate-300">
              <h4 className="font-bold text-emerald-400 mb-2 uppercase tracking-widest text-[10px]">Note Integrali - Traiettorie Cartesiane e SLERP</h4>
              <p>Per l'Interpolazione Cartesiana Spaziale: il segmento orientato rettilineo P_i → P_f adotta lo stesso profilo trapezoidale Bang-Coast-Bang scalato su ascissa curvilinea s(t). Vengono gestiti i casi "triangolari" quando il tratto è troppo breve per raggiungere v_max.</p>
              <p>Per l'orientamento SO(3), l'algoritmo impiega <strong>SLERP (Spherical Linear Interpolation)</strong> sui Quaternioni Unitari: <code className="bg-slate-950 px-1 py-0.5 rounded text-sky-400 border border-slate-800">q(t) = q_i [sin((1-t)θ)/sin(θ)] + q_f [sin(tθ)/sin(θ)]</code>.</p>
           </div>
        </div>
      </div>
    </div>
  );
};
export default TrajectoryStudio;
