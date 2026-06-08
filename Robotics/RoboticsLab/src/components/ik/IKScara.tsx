import React, { useState, useEffect } from 'react';

export const IKScara: React.FC = () => {
  const [tx, setTx] = useState(1.0);
  const [ty, setTy] = useState(0.5);
  const [tz, setTz] = useState(-0.2); // Z target
  const l1 = 1.0, l2 = 0.8, d1 = 1.0;

  const [q, setQ] = useState<number[]>([0,0,0]);

  useEffect(() => {
    // Analitico SCARA
    const c2 = (tx * tx + ty * ty - l1 * l1 - l2 * l2) / (2 * l1 * l2);
    if (Math.abs(c2) <= 1) {
      const s2 = Math.sqrt(1 - c2 * c2); // picking elbow-up for sim simplicity
      const q2 = Math.atan2(s2, c2);
      const q1 = Math.atan2(ty, tx) - Math.atan2(l2 * s2, l1 + l2 * c2);
      const q3 = d1 - tz; // Since z = d1 - q3
      setQ([q1, q2, q3]);
    }
  }, [tx, ty, tz]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
       <div className="lg:col-span-7 space-y-4">
         <div className="bg-slate-950 p-6 border border-slate-800 rounded-xl space-y-6 h-[440px] flex flex-col justify-center text-center relative overflow-hidden">
           <span className="absolute top-3 left-4 text-[9px] font-mono tracking-widest text-slate-400 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded uppercase">
             Laboratorio IK - SCARA (RRP)
           </span>
           <div className="space-y-4 bg-sky-950/20 border border-sky-800/40 p-8 rounded-lg">
              <h4 className="text-sm font-bold text-sky-400 mb-6 uppercase tracking-widest">Configurazione Giunti Trovata</h4>
              <div className="grid grid-cols-1 gap-4 font-mono text-xl text-slate-200">
                 <div>q₁ (Rev) = <span className="font-bold text-sky-300">{(q[0]*180/Math.PI).toFixed(2)}°</span></div>
                 <div>q₂ (Rev) = <span className="font-bold text-sky-300">{(q[1]*180/Math.PI).toFixed(2)}°</span></div>
                 <div>d₃ (Prism)= <span className="font-bold text-sky-300">{q[2].toFixed(3)} m</span></div>
              </div>
           </div>
           <p className="text-[10px] text-slate-500 mt-4 leading-relaxed max-w-sm mx-auto">
             Per il robot SCARA, le cinematiche di posizione planare (q1, q2) e verticale (d3) sono completamente disaccoppiate geometricamente. L'algoritmo combina un'inversione 2R planare con una traslazione sottrattiva sull'asse Z.
           </p>
         </div>
       </div>

       <div className="lg:col-span-5 space-y-6">
         {/* Inputs */}
         <div className="bg-slate-900/30 border border-slate-800 p-5 rounded-xl space-y-4">
           <div className="font-display text-sm font-semibold text-slate-200 uppercase tracking-widest border-b border-slate-850 pb-2">Target Cartesiano</div>
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">X (m)</span>
                <input type="number" step="0.1" value={tx} onChange={e=>setTx(parseFloat(e.target.value))} className="w-full bg-slate-950 p-1.5 text-slate-200 rounded border border-slate-800"/>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">Y (m)</span>
                <input type="number" step="0.1" value={ty} onChange={e=>setTy(parseFloat(e.target.value))} className="w-full bg-slate-950 p-1.5 text-slate-200 rounded border border-slate-800"/>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">Z (m)</span>
                <input type="number" step="0.1" value={tz} onChange={e=>setTz(parseFloat(e.target.value))} className="w-full bg-slate-950 p-1.5 text-slate-200 rounded border border-slate-800"/>
              </div>
           </div>
         </div>
       </div>
    </div>
  );
};
export default IKScara;
