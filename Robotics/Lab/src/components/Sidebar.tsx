/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Compass, 
  BookOpen, 
  Cpu, 
  Target, 
  Activity, 
  Spline, 
  GraduationCap,
  Flame
} from 'lucide-react';
import { ActiveSection } from '../types';

interface SidebarProps {
  activeSection: ActiveSection;
  setActiveSection: (section: ActiveSection) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeSection, setActiveSection }) => {
  const menuItems = [
    {
      id: 'overview' as ActiveSection,
      label: 'Panoramica Generale',
      subtitle: 'Mappa del Corso',
      icon: Compass,
      color: 'text-brand-cinematica',
    },
    {
      id: 'theory' as ActiveSection,
      label: 'Teoria e Note di Studio',
      subtitle: 'Programma Rigoroso',
      icon: BookOpen,
      color: 'text-brand-orientamento',
    },
    {
      id: 'builder' as ActiveSection,
      label: 'DH Robot Builder',
      subtitle: 'Modellatore & FK',
      icon: Cpu,
      color: 'text-brand-cinematica',
    },
    {
      id: 'ik_solver' as ActiveSection,
      label: 'Laboratorio IK',
      subtitle: 'Cinematica Inversa',
      icon: Target,
      color: 'text-brand-successo',
    },
    {
      id: 'jacobian_lab' as ActiveSection,
      label: 'Analisi Singolarità',
      subtitle: 'Jacobiano & Ellissoidi',
      icon: Activity,
      color: 'text-brand-errore',
    },
    {
      id: 'trajectory_studio' as ActiveSection,
      label: 'Trajectory Studio',
      subtitle: 'Curve & Leggi Orarie',
      icon: Spline,
      color: 'text-brand-warning',
    },
    {
      id: 'exam_simulator' as ActiveSection,
      label: 'Simulatore d\'Esame',
      subtitle: 'Quiz & Studio Intuitivo',
      icon: GraduationCap,
      color: 'text-brand-orientamento',
    },
    {
      id: 'dynamics_control' as ActiveSection,
      label: 'Dinamica & Controllo PD',
      subtitle: 'Modello Fisico & Coppie',
      icon: Flame,
      color: 'text-brand-supplementare',
    },
  ];

  return (
    <aside className="w-80 bg-gray-900 border-r border-slate-800 flex flex-col shrink-0 h-[calc(100vh-80px)] overflow-y-auto">
      {/* Sidebar Header */}
      <div className="p-5 border-b border-slate-800 bg-slate-950/20">
        <h3 className="font-display font-semibold text-xs tracking-widest text-slate-500 uppercase">
          Navigazione Moduli
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Seleziona un modulo del Laboratorio per iniziare.
        </p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full text-left flex items-start gap-4 p-3 rounded-lg transition-all duration-200 border group ${
                isActive
                  ? 'bg-slate-800/80 border-slate-700 text-white shadow-lg'
                  : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 hover:border-slate-800/60'
              }`}
            >
              <div
                className={`p-1.5 rounded-md transition-colors ${
                  isActive ? 'bg-slate-900' : 'bg-slate-900/50 group-hover:bg-slate-900'
                }`}
              >
                <IconComponent
                  className={`w-5 h-5 ${item.color} ${
                    isActive ? 'scale-105' : 'group-hover:scale-105'
                  } transition-transform`}
                />
              </div>

              <div className="flex-1 min-w-0">
                <span className="block font-medium text-sm truncate">{item.label}</span>
                <span className="block font-mono text-[10px] tracking-wide text-slate-500 uppercase mt-0.5">
                  {item.subtitle}
                </span>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer Info Box */}
      <div className="p-4 m-4 bg-slate-950 rounded-lg border border-slate-800/60 text-center">
        <span className="inline-flex items-center gap-1.5 font-mono text-[9px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/50">
          ● ONLINE LAB STATE
        </span>
        <div className="mt-2 text-[10px] text-slate-400 font-sans">
          Universitá di Roma "La Sapienza"
          <br />
          Ingegneria Robotica · Robotica 1
        </div>
      </div>
    </aside>
  );
};
export default Sidebar;
