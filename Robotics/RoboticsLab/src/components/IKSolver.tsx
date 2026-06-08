import React, { useState } from 'react';
import IKPlanar from './ik/IKPlanar';
import IKScara from './ik/IKScara';
import IKAnthro6R from './ik/IKAnthro6R';

export const IKSolver: React.FC = () => {
  const [robotType, setRobotType] = useState<'2r' | '3r' | 'scara' | 'anthro6r'>('2r');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Modulo Header */}
      <div className="border-b border-slate-800 pb-4">
        <span className="text-xs font-mono text-emerald-400 tracking-wider uppercase font-bold">
          MODULO 1 — CINEMATICA INVERSA
        </span>
        <h1 className="text-2xl font-bold text-white tracking-tight font-display mt-0.5">
          Laboratorio di Cinematica Inversa Globale
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Risoluzione analitica esatta e metodi numerici iterativi (Newton-Raphson, Gradient Descent).
        </p>
      </div>

      {/* Main split layout instead of separate boxes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Canvas area wrapped by the specific component */}
        <div className="lg:col-span-12">
          {/* Menu for selecting type of robot */}
          <div className="flex gap-2 mb-6">
            {(['2r', '3r', 'scara', 'anthro6r'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setRobotType(type)}
                className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                  robotType === type 
                    ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800' 
                    : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-300'
                }`}
              >
                {type === '2r' && 'Planare 2R'}
                {type === '3r' && 'Planare 3R'}
                {type === 'scara' && 'SCARA (RRP)'}
                {type === 'anthro6r' && 'Antropomorfo 6R'}
              </button>
            ))}
          </div>

          <div className="animate-fade-in w-full">
            {robotType === '2r' && <IKPlanar type="2r" />}
            {robotType === '3r' && <IKPlanar type="3r" />}
            {robotType === 'scara' && <IKScara />}
            {robotType === 'anthro6r' && <IKAnthro6R />}
          </div>
        </div>
      </div>
    </div>
  );
};
export default IKSolver;
