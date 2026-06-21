/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  GraduationCap, 
  Award, 
  HelpCircle, 
  CheckCircle, 
  XCircle, 
  Compass, 
  RefreshCw 
} from 'lucide-react';
import { QuizQuestion } from '../types';
import { MathText } from './Math';

export const ExamSimulator: React.FC = () => {
  // Master set of highly realistic academic Robotics 1 exam questions
  const quizQuestions: QuizQuestion[] = [
    {
      id: 'q_struct_1',
      category: 'DK',
      questionType: 'structure-match',
      questionText: 'Considerando un manipolatore planare coplanare 3R con lunghezze l₁, l₂, l₃, quale struttura esatta assume la coordinata verticale dell\'end-effector P_y rispetto al terreno?',
      options: [
        'l₁·sin(q₁) + l₂·sin(q₁ + q₂) + l₃·sin(q₁ + q₂ + q₃)',
        'l₁·cos(q₁) + l₂·cos(q₂) + l₃·cos(q₃)',
        '(l₁ + l₂ + l₃)·cos(q₁ + q₂ + q₃)',
        'l₁·sin(q₁) + l₂·sin(q₂) + l₃·sin(q₃)'
      ],
      correctIndex: 0,
      points: 10,
      explanation: 'Poiché i giunti sono consecutivi e coplanari, l\'angolo di inclinazione assoluta di ciascun braccio rispetto all\'orizzontale fisso è pari alla somma algebrica degli angoli dei giunti precedenti (q₁, q₁ + q₂, q₁ + q₂ + q₃). La coordinata Y proietta il seno di tale inclinazione assoluta moltiplicata per la lunghezza del rispettivo link.'
    },
    {
      id: 'q_sing_2',
      category: 'Jacobian',
      questionType: 'multiple-choice',
      questionText: 'Quali giunti di un manipolatore SCARA a 4 gradi di libertà (R-R-P-R) influenzano lo Jacobiano di velocità lineare J_L ed innescano singolarità interne dello spazio di lavoro?',
      options: [
        'I primi due giunti rotanti complanari (responsabili del posizionamento sul piano XY).',
        'Tutti e 4 i giunti indistintamente.',
        'Solo il giunto prismatico d₃ di sfilamento verticale.',
        'La spalla rotante q₁ ed il giunto d\'orientamento finale q₄.'
      ],
      correctIndex: 0,
      points: 15,
      explanation: 'Le singolarità interne di uno SCARA dipendono puramente dalla configurazione del sottomanipolatore piana sui primi due giunti R-R (analogo ad un 2R planare). Il giunto prismatico verticale d₃ e la rotazione finale q₄ non introducono singolarità se non a fine corsa.'
    },
    {
      id: 'q_ik_3',
      category: 'IK',
      questionType: 'numerical-estimation',
      questionText: 'Dato un robot SCARA nello spazio di lavoro regolare con coordinate cartesiane e orientamento definiti, quante soluzioni analitiche regolari e distinte di cinematica inversa (IK) ammette?',
      options: [
        'Esattamente 2 soluzioni (Elbow-up ed Elbow-down sui primi due giunti).',
        'Esattamente 4 soluzioni (comprese inversioni spalla-gomito).',
        'Infinite soluzioni, trattandosi di un manipolatore ridondante a 4 giunti.',
        'Nessuna soluzione analitica, richiede metodi numerici iterativi.'
      ],
      correctIndex: 0,
      points: 15,
      explanation: 'Una volta fissati X, Y, Z ed il roll finale, il giunto prismatico d₃ e l\'orientamento q₄ sono univocamente vincolati. I primi due giunti formano una struttura piana 2R che ammette esattamente 2 soluzioni geometriche distinte d\'allineamento: gomito alto o basso.'
    },
    {
      id: 'q_diff_4',
      category: 'Jacobian',
      questionType: 'formula-match',
      questionText: 'Quale operatore algebrico definisce la proiezione proiettiva sul Null-Space di uno Jacobiano J per sfruttare la ridondanza (Null-space control)?',
      options: [
        'P = I - Jᵀ(JJᵀ)⁻¹J  ovvero  I - J#J',
        'P = JJ# - I',
        'P = J#J - I',
        'P = I - J J#'
      ],
      correctIndex: 0,
      points: 20,
      explanation: 'L\'operatore di proiezione sul null-space è P = I - J#J. Moltiplicando J per P si annulla per qualsiasi vettore ξ: J·(I - J#J)·ξ = (J - JJ#J)·ξ = (J - J)·ξ = 0, assicurando che il movimento interno non interferisca minimamente con il task primario.'
    },
    {
      id: 'q_traj_5',
      category: 'Trajectory',
      questionType: 'numerical-estimation',
      questionText: 'Se si deve percorrere una distanza L = 2.0 rad con limiti a_max = 2.0 rad/s² e v_max = 1.0 rad/s, qual è la durata minima T della traiettoria trapezoidale tempo-ottima senza saturare gli attuatori?',
      options: [
        'T = 2.5 secondi',
        'T = 2.0 secondi',
        'T = 1.5 secondi',
        'T = 4.0 secondi'
      ],
      correctIndex: 0,
      points: 20,
      explanation: 'La rampa di accelerazione richiede tc = v_max/a_max = 0.5s. La distanza coperta nelle due rampe di accelerazione e decelerazione è L_ramp = a_max * tc² = 0.5 rad. Lo spazio rimanente a velocità costante è L_coast = 2.0 - 0.5 = 1.5 rad. Il tempo di coasting è t_coast = 1.5 / 1.0 = 1.5s. Tempo totale T = 2 * tc + t_coast = 1.0 + 1.5 = 2.5s.'
    },
    {
      id: 'q_dh_6',
      category: 'Jacobian',
      questionType: 'formula-match',
      questionText: 'Secondo il formalismo della Jacobiana geometrica, qual è il contributo di velocità lineare J_Li (colonna i-esima) generato da un giunto di tipo PRISMATICO?',
      options: [
        'z_{i-1}',
        'z_{i-1} ✕ (p_E - p_{i-1})',
        '0 (vettore nullo)',
        'z_i'
      ],
      correctIndex: 0,
      points: 10,
      explanation: 'Un giunto prismatico compie pura traslazione lineare lungo l\'asse coordinato z della terna precedente (z_{i-1}). Dunque, la sua colonna lineare Jacobiana è J_Li = z_{i-1}, mentre quella angolare J_Ai è nulla.'
    }
  ];

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState<number>(0);
  const [incorrectTracker, setIncorrectTracker] = useState<Record<string, boolean>>({});
  const [complete, setComplete] = useState<boolean>(false);

  const activeQuestion = quizQuestions[currentIndex];

  const handleOptionSelect = (index: number) => {
    if (selectedOption !== null) return; // Prevent double answer locking
    setSelectedOption(index);

    if (index === activeQuestion.correctIndex) {
      setScore(score + activeQuestion.points);
    } else {
      setIncorrectTracker({
        ...incorrectTracker,
        [activeQuestion.id]: true
      });
    }
  };

  const nextQuestion = () => {
    setSelectedOption(null);
    if (currentIndex < quizQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setComplete(true);
    }
  };

  const restartQuiz = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setScore(0);
    setIncorrectTracker({});
    setComplete(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Quiz Progress Header */}
      <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
        <div>
          <span className="text-xs font-mono text-cyan-400 tracking-wider uppercase font-bold">
            VALUTAZIONE INTERATTIVA
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight font-display mt-0.5">
            Simulatore d'Esame "Robotica 1"
          </h1>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1 rounded-lg">
          <Award className="w-4 h-4 text-brand-warning" />
          <span className="font-mono text-xs font-bold text-slate-350">
            Score: <span className="text-cyan-400">{score}</span> Punti
          </span>
        </div>
      </div>

      {!complete ? (
        <div className="space-y-6">
          {/* Question card container */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
            {/* Top corner category status */}
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase bg-cyan-950/40 border border-cyan-800/40 px-2.5 py-0.5 rounded">
                CATEGORIA: {activeQuestion.category}
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                Domanda {currentIndex + 1} di {quizQuestions.length}
              </span>
            </div>

            {/* Question Text */}
            <h3 className="text-lg font-medium text-slate-100 theory-text leading-relaxed">
              {activeQuestion.questionText}
            </h3>

            {/* Custom display notation formulas if any */}
            {activeQuestion.category === 'Jacobian' && (
              <div className="mt-4 p-3 bg-slate-950/40 border border-slate-850 rounded font-mono text-xs text-center text-slate-400 leading-relaxed">
                *Tip d'esame: Fai appoggio mentale sulle scomposizioni vettoriali geometriche colonne prima di tentare l'aliquota di calcolo!
              </div>
            )}
          </div>

          {/* Options Grid */}
          <div className="space-y-3">
            {activeQuestion.options.map((opt, i) => {
              const isLocked = selectedOption !== null;
              const isSelected = selectedOption === i;
              const isCorrect = activeQuestion.correctIndex === i;

              let style = 'bg-slate-900/50 border-slate-800 text-slate-200 hover:bg-slate-900 hover:border-slate-750';
              let badge = null;

              if (isLocked) {
                if (isCorrect) {
                  style = 'bg-green-950/30 border-green-800 text-green-300 font-medium';
                  badge = <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />;
                } else if (isSelected) {
                  style = 'bg-rose-950/30 border-rose-800 text-rose-300';
                  badge = <XCircle className="w-4 h-4 text-rose-400 shrink-0" />;
                } else {
                  style = 'bg-slate-900/20 border-slate-900 text-slate-500 opacity-60';
                }
              }

              return (
                <button
                  key={i}
                  disabled={isLocked}
                  onClick={() => handleOptionSelect(i)}
                  className={`w-full text-left p-4 rounded-xl border flex items-center justify-between gap-4 transition-all duration-200 focus:outline-none ${style} ${
                    !isLocked ? 'cursor-pointer active:scale-95' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-slate-500 w-5">
                      {String.fromCharCode(65 + i)})
                    </span>
                    <span className="text-sm font-sans leading-relaxed">{opt}</span>
                  </div>
                  {badge}
                </button>
              );
            })}
          </div>

          {/* Explanation panel visible post locking */}
          {selectedOption !== null && (
            <div className="bg-slate-900/40 border border-slate-850 p-5 rounded-xl space-y-3 animate-fade-in">
              <span className="block font-mono text-xs font-bold text-amber-500 uppercase flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4" /> Spiegazione Logica & Matematica
              </span>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {activeQuestion.explanation}
              </p>
              <button
                onClick={nextQuestion}
                className="w-full text-center py-2 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800/60 hover:bg-cyan-900 text-xs font-bold transition-colors cursor-pointer mt-2"
              >
                {currentIndex < quizQuestions.length - 1 ? 'Procedi alla Domanda Successiva →' : 'Visualizza Risultati Esame!'}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* QUIZ SUMMARY CARD SCREEN */
        <div className="bg-slate-900/30 border border-slate-800 p-8 rounded-xl text-center space-y-6">
          <div className="inline-flex p-4 bg-cyan-950/50 text-cyan-400 rounded-full border border-cyan-800/40">
            <GraduationCap className="w-12 h-12" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-tight font-display">
              Laboratorio d'Esame Completato!
            </h2>
            <p className="text-xs text-slate-400 text-sans">
              Hai simulato la sessione d'esame. Ecco i tuoi risultati valutati:
            </p>
          </div>

          <div className="max-w-xs mx-auto bg-slate-950 p-5 rounded-lg border border-slate-850 space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Punti Totali Accumulati:</span>
              <span className="text-cyan-400 font-bold">{score} Punti</span>
            </div>
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Esito Percentuale:</span>
              <span className="text-brand-successo font-bold">
                {Math.round((score / quizQuestions.reduce((acc, q) => acc + q.points, 0)) * 100)}%
              </span>
            </div>
          </div>

          <button
            onClick={restartQuiz}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800/80 hover:bg-cyan-900 text-xs font-bold transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" /> Riavvia Simulatore
          </button>
        </div>
      )}
    </div>
  );
};
export default ExamSimulator;
