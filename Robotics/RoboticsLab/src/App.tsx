/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  GraduationCap, 
  Cpu, 
  Target, 
  Activity, 
  Spline, 
  BookOpen,
  ArrowRight,
  TrendingUp,
  CpuIcon,
  Flame,
  Workflow,
  Zap,
  Rotate3d
} from 'lucide-react';

import { ActiveSection } from './types';
import Sidebar from './components/Sidebar';
import Teoria from './components/Teoria';
import RobotBuilder from './components/RobotBuilder';
import IKSolver from './components/IKSolver';
import WorkspaceDynamics from './components/WorkspaceDynamics';
import TrajectoryStudio from './components/TrajectoryStudio';
import ExamSimulator from './components/ExamSimulator';
import DynamicsControl from './components/DynamicsControl';
import InverseDiffLab from './components/InverseDiffLab';
import StaticsLab from './components/StaticsLab';
import OrientationLab from './components/OrientationLab';

export default function App() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('overview');
  
  // Progress bar listener for reading
  const [readingProgress, setReadingProgress] = useState<number>(0);

  useEffect(() => {
    const handleScroll = () => {
      const el = document.getElementById('main-scroll-container') || document.documentElement;
      const total = el.scrollHeight - el.clientHeight;
      if (total > 0) {
        setReadingProgress((el.scrollTop / total) * 100);
      }
    };
    
    const scrollContainer = document.getElementById('main-scroll-container');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-slate-100 flex flex-col font-sans select-none antialiased h-screen overflow-hidden">
      {/* Top micro progress indicator */}
      <div 
        className="fixed top-0 left-0 h-1 bg-cyan-500 z-50 transition-all duration-150 shadow-[0_0_8px_rgba(6,182,212,0.6)]" 
        style={{ width: `${readingProgress}%` }}
      />

      {/* Main Engineering Header Bar */}
      <header className="h-[76px] shrink-0 border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-950/45 border border-cyan-800/40 text-cyan-400">
            <CpuIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display font-bold text-base tracking-tight text-white flex items-center gap-2">
              Robotics 1 Master Lab
              <span className="font-mono text-[9px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                v1.2-LT
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Piattaforma Interattiva Sapienza di Cinematica e Pianificazione dei Robot
            </p>
          </div>
        </div>

        {/* Course details badge */}
        <div className="hidden md:flex items-center gap-2 text-xs font-mono bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-850 text-slate-350">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
          <span>DIPARTIMENTO DIAGDI</span>
        </div>
      </header>

      {/* Split Lateral Navigation Structure layout */}
      <div className="flex-1 flex min-h-0 relative">
        <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} />

        <main id="main-scroll-container" className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-950">
          {/* Overview Section Portal Dashboard */}
          {activeSection === 'overview' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
              {/* Welcome card banner */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/35 p-8 shadow-2xl">
                <div className="relative z-10 max-w-2xl space-y-3">
                  <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-cyan-400">
                    BENVENUTO NEL LABORATORIO DI STUDIO
                  </span>
                  <h2 className="text-3xl font-bold font-display text-white tracking-tight">
                    Allena la tua intuizione geometrica, supera il calcolo pedante.
                  </h2>
                  <p className="text-sm text-slate-300 leading-relaxed font-sans">
                    Il corso di Robotica 1 impone rigore algebrico ma richiede, soprattutto, capacità di sintesi visiva: saper interpretare a colpo d'occhio la morfologia delle equazioni della Cinematica Diretta, prevedere le singolarità e progettare leggi orarie prive di scatti. Questa piattaforma è stata modellata per aiutarti a visualizzare ogni singolo teorema.
                  </p>
                </div>
              </div>

              {/* Bento Grid Features shortcuts links */}
              <div className="space-y-4">
                <span className="font-mono text-xs font-bold text-slate-400 uppercase tracking-widest block">
                  I Nostri Moduli E Labs d'Esame
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card Theory */}
                  <div 
                    onClick={() => setActiveSection('theory')}
                    className="p-5 rounded-xl border border-slate-850 hover:border-slate-800 bg-slate-900/35 hover:bg-slate-900/60 transition-all duration-200 cursor-pointer flex items-start gap-4 group"
                  >
                    <div className="p-2 rounded-lg bg-purple-950/40 border border-purple-800/40 text-purple-400 shrink-0 group-hover:scale-105 transition-transform">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block font-display font-semibold text-sm text-slate-200 mt-0.5">
                        Dispensa Teorica di Robotica 1
                      </span>
                      <p className="text-xs text-slate-400 font-sans mt-1 leading-relaxed">
                        Fai rinfresco rigoroso su DH parameters, quaternioni unitari, proprietà Moore-Penrose, ellissoidi e leggi orarie trapezoidali simmetriche.
                      </p>
                    </div>
                  </div>

                  {/* Card DH builder */}
                  <div 
                    onClick={() => setActiveSection('builder')}
                    className="p-5 rounded-xl border border-slate-850 hover:border-slate-800 bg-slate-900/35 hover:bg-slate-900/60 transition-all duration-200 cursor-pointer flex items-start gap-4 group"
                  >
                    <div className="p-2 rounded-lg bg-cyan-950/40 border border-cyan-800/40 text-cyan-400 shrink-0 group-hover:scale-105 transition-transform">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block font-display font-semibold text-sm text-slate-200 mt-0.5">
                        DH Robot Builder & Vis
                      </span>
                      <p className="text-xs text-slate-400 font-sans mt-1 leading-relaxed">
                        Un modellatore 3D dove immettere parametri di giunto, testare i presets, saggiare la traiettoria con scia visiva e leggere le formule attive risultanti.
                      </p>
                    </div>
                  </div>

                  {/* Card IK Solver */}
                  <div 
                    onClick={() => setActiveSection('ik_solver')}
                    className="p-5 rounded-xl border border-slate-850 hover:border-slate-800 bg-slate-900/35 hover:bg-slate-900/60 transition-all duration-200 cursor-pointer flex items-start gap-4 group"
                  >
                    <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                      <Target className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block font-display font-semibold text-sm text-slate-200 mt-0.5">
                        Laboratorio IK (Cinematica Inversa)
                      </span>
                      <p className="text-xs text-slate-400 font-sans mt-1 leading-relaxed">
                        Imposta un target XY o un sormonto a click, analizza le scomposizioni multiple e sperimenta una sfida per risolvere a mano le rotazioni dell'avambraccio.
                      </p>
                    </div>
                  </div>

                  {/* Card Singularities */}
                  <div 
                    onClick={() => setActiveSection('jacobian_lab')}
                    className="p-5 rounded-xl border border-slate-850 hover:border-slate-800 bg-slate-900/35 hover:bg-slate-900/60 transition-all duration-200 cursor-pointer flex items-start gap-4 group"
                  >
                    <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-800/40 text-rose-400 shrink-0 group-hover:scale-105 transition-transform">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block font-display font-semibold text-sm text-slate-200 mt-0.5">
                        Analizzatore di Singolarità & J
                      </span>
                      <p className="text-xs text-slate-400 font-sans mt-1 leading-relaxed">
                        Mappa un intero workspace in colori relativi alla destrezza Yoshikawa. Guarda l'ellissoide appiattirsi e le colonne del Jacobiano allinearsi linearmente.
                      </p>
                    </div>
                  </div>

                  {/* Card Trajectories */}
                  <div 
                    onClick={() => setActiveSection('trajectory_studio')}
                    className="p-5 rounded-xl border border-slate-850 hover:border-slate-850 bg-slate-900/35 hover:bg-slate-900/60 transition-all duration-200 cursor-pointer flex items-start gap-4 group"
                  >
                    <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-800/40 text-amber-500 shrink-0 group-hover:scale-105 transition-transform">
                      <Spline className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block font-display font-semibold text-sm text-slate-200 mt-0.5">
                        Trajectory Studio Simulator
                      </span>
                      <p className="text-xs text-slate-400 font-sans mt-1 leading-relaxed">
                        Imposta coordinate, velocità e accelerazione limite. Verifica le violazioni sulla terna di grafici simultanei e ricava d'esofago il tempo T_minimo.
                      </p>
                    </div>
                  </div>

                  {/* Card Exam */}
                  <div 
                    onClick={() => setActiveSection('exam_simulator')}
                    className="p-5 rounded-xl border border-slate-850 hover:border-slate-800 bg-slate-900/35 hover:bg-slate-900/60 transition-all duration-200 cursor-pointer flex items-start gap-4 group"
                  >
                    <div className="p-2 rounded-lg bg-cyan-950/50 border border-cyan-800/40 text-cyan-400 shrink-0 group-hover:scale-105 transition-transform">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block font-display font-semibold text-sm text-slate-200 mt-0.5">
                        Simulatore d'Esame Interattivo
                      </span>
                      <p className="text-xs text-slate-400 font-sans mt-1 leading-relaxed">
                        Mettiti alla prova con domande incentrate sulla morfologia vettoriale "Struttura vs Calcolo" tratte direttamente dai compiti universitari scritti.
                      </p>
                    </div>
                  </div>

                  {/* Card Dynamics and Control */}
                  <div 
                    onClick={() => setActiveSection('dynamics_control')}
                    className="p-5 rounded-xl border border-slate-850 hover:border-slate-800 bg-slate-900/35 hover:bg-slate-900/60 transition-all duration-200 cursor-pointer flex items-start gap-4 group"
                  >
                    <div className="p-2 rounded-lg bg-sky-950/40 border border-sky-800/40 text-sky-400 shrink-0 group-hover:scale-105 transition-transform">
                      <Flame className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block font-display font-semibold text-sm text-slate-200 mt-0.5">
                        Dinamica & Controllo Real-time
                      </span>
                      <p className="text-xs text-slate-400 font-sans mt-1 leading-relaxed">
                        Esplora le equazioni di Eulero-Lagrangiano del robot 2R. Sperimenta la caduta libera gravitazionale (modalità passiva) e tara un controllore PD.
                      </p>
                    </div>
                  </div>

                  {/* Card IDK Lab */}
                  <div 
                    onClick={() => setActiveSection('inverse_diff_lab')}
                    className="p-5 rounded-xl border border-slate-850 hover:border-slate-800 bg-slate-900/35 hover:bg-slate-900/60 transition-all duration-200 cursor-pointer flex items-start gap-4 group"
                  >
                    <div className="p-2 rounded-lg bg-cyan-950/40 border border-cyan-800/40 text-[#06b6d4] shrink-0 group-hover:scale-105 transition-transform">
                      <Workflow className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block font-display font-semibold text-sm text-slate-200 mt-0.5">
                        IDK & Null-Space Projector
                      </span>
                      <p className="text-xs text-slate-400 font-sans mt-1 leading-relaxed">
                        Visualizza la Moore-Penrose vs la Damped Least Squares (DLS) in tempo reale. Sperimenta l'Elbow-Dance proiettando obiettivi nello spazio nullo.
                      </p>
                    </div>
                  </div>

                  {/* Card Statics Dual */}
                  <div 
                    onClick={() => setActiveSection('statics_lab')}
                    className="p-5 rounded-xl border border-slate-850 hover:border-slate-800 bg-slate-900/35 hover:bg-slate-900/60 transition-all duration-200 cursor-pointer flex items-start gap-4 group"
                  >
                    <div className="p-2 rounded-lg bg-pink-950/40 border border-pink-800/40 text-pink-400 shrink-0 group-hover:scale-105 transition-transform">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block font-display font-semibold text-sm text-slate-200 mt-0.5">
                        Statica Duale & Equilibrio t = Jᵀ F
                      </span>
                      <p className="text-xs text-slate-400 font-sans mt-1 leading-relaxed">
                        Applica forze tese all'end-effector trascinando il mouse, ricava le coppie statiche necessarie, e confronta gli ellissoidi duali velocità-forza.
                      </p>
                    </div>
                  </div>

                  {/* Card Slerp Orientations */}
                  <div 
                    onClick={() => setActiveSection('orientation_lab')}
                    className="p-5 rounded-xl border border-slate-850 hover:border-slate-800 bg-slate-900/35 hover:bg-slate-900/60 transition-all duration-200 cursor-pointer flex items-start gap-4 group"
                  >
                    <div className="p-2 rounded-lg bg-purple-950/40 border border-purple-800/40 text-[#a855f7] shrink-0 group-hover:scale-105 transition-transform">
                      <Rotate3d className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block font-display font-semibold text-sm text-slate-200 mt-0.5">
                        Analisi SO(3): T(φ) & SLERP Quaternionica
                      </span>
                      <p className="text-xs text-slate-400 font-sans mt-1 leading-relaxed">
                        Esamina le singolarità di velocità angolare su 12 sequenze canoniche e riproduci l'interpolazione geodesica SLERP contro Eulero LERP.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Render Active Lab Route Components */}
          {activeSection === 'theory' && <Teoria />}
          {activeSection === 'builder' && <RobotBuilder />}
          {activeSection === 'ik_solver' && <IKSolver />}
          {activeSection === 'jacobian_lab' && <WorkspaceDynamics />}
          {activeSection === 'trajectory_studio' && <TrajectoryStudio />}
          {activeSection === 'exam_simulator' && <ExamSimulator />}
          {activeSection === 'dynamics_control' && <DynamicsControl />}
          {activeSection === 'inverse_diff_lab' && <InverseDiffLab />}
          {activeSection === 'statics_lab' && <StaticsLab />}
          {activeSection === 'orientation_lab' && <OrientationLab />}
        </main>
      </div>
    </div>
  );
}
