import React, { useState, useEffect } from 'react';

// Math utils for 3x3 matrices
const mxMult = (a: number[][], b: number[][]) => {
  return [
    [a[0][0]*b[0][0]+a[0][1]*b[1][0]+a[0][2]*b[2][0], a[0][0]*b[0][1]+a[0][1]*b[1][1]+a[0][2]*b[2][1], a[0][0]*b[0][2]+a[0][1]*b[1][2]+a[0][2]*b[2][2]],
    [a[1][0]*b[0][0]+a[1][1]*b[1][0]+a[1][2]*b[2][0], a[1][0]*b[0][1]+a[1][1]*b[1][1]+a[1][2]*b[2][1], a[1][0]*b[0][2]+a[1][1]*b[1][2]+a[1][2]*b[2][2]],
    [a[2][0]*b[0][0]+a[2][1]*b[1][0]+a[2][2]*b[2][0], a[2][0]*b[0][1]+a[2][1]*b[1][1]+a[2][2]*b[2][1], a[2][0]*b[0][2]+a[2][1]*b[1][2]+a[2][2]*b[2][2]]
  ];
};
const mxTrans = (a: number[][]) => {
  return [[a[0][0],a[1][0],a[2][0]], [a[0][1],a[1][1],a[2][1]], [a[0][2],a[1][2],a[2][2]]];
};

export const IKAnthro6R: React.FC = () => {
  // EE Target xyz
  const [px, setPx] = useState(0.8);
  const [py, setPy] = useState(0.5);
  const [pz, setPz] = useState(0.5);
  // EE Target orientation angles (ZYZ Euler) in degrees
  const [alpha, setAlpha] = useState(0); // Z
  const [beta, setBeta] = useState(45);  // Y'
  const [gamma, setGamma] = useState(0); // Z''

  // Robot geometry (PUMA style)
  const d1 = 0.5, a2 = 0.8, a3 = 0.6, d4 = 0.2, d6 = 0.2;

  // Pieper step outputs
  const [pc, setPc] = useState<number[]>([0,0,0]);
  const [q123, setQ123] = useState<number[]>([0,0,0]);
  const [q456, setQ456] = useState<number[]>([0,0,0]);

  useEffect(() => {
    // 1. Convert target Euler ZYZ to Rotation Matrix Ree
    const ar = alpha * Math.PI/180;
    const br = beta * Math.PI/180;
    const gr = gamma * Math.PI/180;

    const ca=Math.cos(ar), sa=Math.sin(ar);
    const cb=Math.cos(br), sb=Math.sin(br);
    const cg=Math.cos(gr), sg=Math.sin(gr);
    
    // ZYZ Matrix
    const Ree = [
      [ca*cb*cg - sa*sg, -ca*cb*sg - sa*cg, ca*sb],
      [sa*cb*cg + ca*sg, -sa*cb*sg + ca*cg, sa*sb],
      [-sb*cg,           sb*sg,             cb]
    ];

    // 2. Compute Wrist Center Pc = Pee - d6 * Ree * [0,0,1]^T
    const z_ee = [Ree[0][2], Ree[1][2], Ree[2][2]];
    const pcx = px - d6 * z_ee[0];
    const pcy = py - d6 * z_ee[1];
    const pcz = pz - d6 * z_ee[2];
    setPc([pcx, pcy, pcz]);

    // 3. Solve Anthropomorphic Position IK for q1, q2, q3
    const q1 = Math.atan2(pcy, pcx);
    
    // Bring to planar equivalent r, s
    const r = Math.sqrt(pcx*pcx + pcy*pcy);
    const s = pcz - d1;
    // PUMA-like without offset: links are a2 and d4
    const r_prime = r; // If no offset
    // L2 = a2, L3 = hypot(a3, d4) or just a3 if d4=0
    // Let's use standard d4!=0 geometry: link3 hypotenuse = sqrt(a3^2 + d4^2)
    const L3 = Math.hypot(a3, d4);
    const L2 = a2;
    // Angle offset of link3
    const alpha3 = Math.atan2(d4, a3);

    const c3_eq = (r_prime*r_prime + s*s - L2*L2 - L3*L3) / (2*L2*L3);
    let q2=0, q3=0;
    if (Math.abs(c3_eq) <= 1) {
      const s3_eq = -Math.sqrt(1 - c3_eq*c3_eq); // elbow up
      const q3_prime = Math.atan2(s3_eq, c3_eq);
      q3 = q3_prime - alpha3;
      q2 = Math.atan2(s, r_prime) - Math.atan2(L3*s3_eq, L2 + L3*c3_eq);
    }
    setQ123([q1, q2, q3]);

    // 4. Determine Orientation IK for q4, q5, q6
    // R0_3 depends on q1, q2, q3
    const c1=Math.cos(q1), s1=Math.sin(q1);
    const c23=Math.cos(q2+q3), s23=Math.sin(q2+q3);
    
    // Simplistic R0_3 for PUMA-like
    const R0_3 = [
      [c1*c23, -c1*s23, s1],
      [s1*c23, -s1*s23, -c1],
      [s23,     c23,     0]
    ];

    const R3_6 = mxMult(mxTrans(R0_3), Ree);
    
    // Extract ZYZ Euler from R3_6
    let q5 = Math.atan2(Math.hypot(R3_6[0][2], R3_6[1][2]), R3_6[2][2]);
    let q4 = 0, q6 = 0;
    if (Math.abs(Math.sin(q5)) > 1e-4) {
      q4 = Math.atan2(R3_6[1][2], R3_6[0][2]);
      q6 = Math.atan2(R3_6[2][1], -R3_6[2][0]);
    } else {
      q4 = 0;
      q6 = Math.atan2(-R3_6[0][1], R3_6[0][0]);
    }
    setQ456([q4, q5, q6]);

  }, [px, py, pz, alpha, beta, gamma]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
       <div className="lg:col-span-12">
         <div className="bg-slate-950 p-6 border border-slate-800 rounded-xl space-y-6 flex flex-col justify-center relative overflow-hidden">
           <span className="absolute top-3 left-4 text-[9px] font-mono tracking-widest text-slate-400 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded uppercase">
             Laboratorio IK - Disaccoppiamento
           </span>
           <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-4">
             {/* Left Column: Form Inputs */}
             <div className="md:col-span-5 space-y-6">
                <div className="space-y-4 bg-slate-900/30 p-5 border border-slate-800 rounded-xl">
                  <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold border-b border-slate-850 pb-2">Posa End-Effector Desiderata</div>
                  <div className="grid grid-cols-3 gap-3">
                     <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">X (m) <input type="number" step="0.1" value={px} onChange={e=>setPx(parseFloat(e.target.value))} className="w-full bg-slate-950 p-1.5 mt-1 rounded text-slate-300 border border-slate-800"/></label>
                     <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Y (m) <input type="number" step="0.1" value={py} onChange={e=>setPy(parseFloat(e.target.value))} className="w-full bg-slate-950 p-1.5 mt-1 rounded text-slate-300 border border-slate-800"/></label>
                     <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Z (m) <input type="number" step="0.1" value={pz} onChange={e=>setPz(parseFloat(e.target.value))} className="w-full bg-slate-950 p-1.5 mt-1 rounded text-slate-300 border border-slate-800"/></label>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                     <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Z (α°) <input type="number" step="5" value={alpha} onChange={e=>setAlpha(parseFloat(e.target.value))} className="w-full bg-slate-950 p-1.5 mt-1 rounded text-slate-300 border border-slate-800"/></label>
                     <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Y' (β°) <input type="number" step="5" value={beta} onChange={e=>setBeta(parseFloat(e.target.value))} className="w-full bg-slate-950 p-1.5 mt-1 rounded text-slate-300 border border-slate-800"/></label>
                     <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Z'' (γ°) <input type="number" step="5" value={gamma} onChange={e=>setGamma(parseFloat(e.target.value))} className="w-full bg-slate-950 p-1.5 mt-1 rounded text-slate-300 border border-slate-800"/></label>
                  </div>
                </div>
                
                <p className="text-[10px] text-slate-500 leading-relaxed max-w-sm">
                   Il metodo di Pieper garantisce l'esistenza di soluzioni in forma chiusa per robot 6R a patto che tre giunti consecutivi (solitamente i giunti del polso 4, 5 e 6) si intersechino in un singolo punto (polso sferico). Questo consente di disaccoppiare la traslazione (Q1-3) dalla rotazione (Q4-6).
                </p>
             </div>

             {/* Right Column: Breakdown Output */}
             <div className="md:col-span-7 space-y-4">
                {/* Step 1 */}
                <div className="p-4 bg-slate-950/80 border-l-2 border border-slate-850 border-l-emerald-500 rounded-lg text-sm relative">
                  <div className="font-bold text-[11px] uppercase tracking-widest text-emerald-400 mb-2">Step 1: Centro del Polso (Pc)</div>
                  <div className="font-mono text-xs text-slate-300 flex justify-between items-center">
                    <span>P_c = P_ee - d₆·R_ee·[0 0 1]ᵀ</span>
                    <span className="text-white bg-slate-900 border border-slate-800 px-2 py-1 rounded">
                      Pc = [{pc[0].toFixed(3)}, {pc[1].toFixed(3)}, {pc[2].toFixed(3)}]
                    </span>
                  </div>
                </div>
                
                {/* Step 2 */}
                <div className="p-4 bg-slate-950/80 border-l-2 border border-slate-850 border-l-sky-500 rounded-lg text-sm relative">
                  <div className="font-bold text-[11px] uppercase tracking-widest text-sky-400 mb-2">Step 2: Cinematica di Posizione (q1, q2, q3)</div>
                  <div className="font-mono text-xl font-bold flex gap-4 text-sky-300 bg-slate-900/50 p-3 rounded">
                    <span>q₁={(q123[0]*180/Math.PI).toFixed(1)}°</span>
                    <span>q₂={(q123[1]*180/Math.PI).toFixed(1)}°</span>
                    <span>q₃={(q123[2]*180/Math.PI).toFixed(1)}°</span> 
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-4 bg-slate-950/80 border-l-2 border border-slate-850 border-l-purple-500 rounded-lg text-sm relative">
                  <div className="font-bold text-[11px] uppercase tracking-widest text-purple-400 mb-2">Step 3: Cinematica di Orientamento (q4, q5, q6)</div>
                  <div className="font-mono text-xl font-bold flex gap-4 text-purple-300 bg-slate-900/50 p-3 rounded">
                    <span>q₄={(q456[0]*180/Math.PI).toFixed(1)}°</span>
                    <span>q₅={(q456[1]*180/Math.PI).toFixed(1)}°</span>
                    <span>q₆={(q456[2]*180/Math.PI).toFixed(1)}°</span> 
                  </div>
                </div>
             </div>
           </div>
         </div>
       </div>
    </div>
  );
};
export default IKAnthro6R;
