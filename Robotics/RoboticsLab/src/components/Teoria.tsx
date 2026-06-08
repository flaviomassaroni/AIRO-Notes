/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  BookOpen, 
  ChevronDown, 
  ChevronUp, 
  Info, 
  AlertTriangle, 
  Compass, 
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { MathText } from './Math';

interface AccordionSectionProps {
  title: string;
  subtitle: string;
  badge: { text: string; color: string };
  children: React.ReactNode;
}

const AccordionSection: React.FC<AccordionSectionProps> = ({ title, subtitle, badge, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40 mb-4 transition-all duration-300">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 text-left bg-slate-900/60 hover:bg-slate-900 transition-colors focus:outline-none"
      >
        <div className="space-y-1 pr-4">
          <div className="flex items-center gap-3">
            <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wide font-mono ${badge.color}`}>
              {badge.text}
            </span>
            <h3 className="text-base font-semibold text-slate-100 font-display">
              {title}
            </h3>
          </div>
          <p className="text-xs text-slate-400 font-sans">
            {subtitle}
          </p>
        </div>
        <div>
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-slate-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-500" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="p-6 border-t border-slate-800 bg-slate-950/40 divide-y divide-slate-800/60 space-y-6">
          {children}
        </div>
      )}
    </div>
  );
};

export const Teoria: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      {/* Intro Header */}
      <div className="border-b border-slate-800 pb-5">
        <span className="text-xs font-mono text-cyan-400 tracking-wider uppercase font-bold">
          CONOSCENZA RIGOROSA
        </span>
        <h1 className="text-3xl font-bold text-white tracking-tight font-display mt-1">
          Dispensa Teorica di Robotica 1
        </h1>
        <p className="text-sm text-slate-400 mt-2 font-sans">
          Questa sezione racchiude le note d'esame complete, elaborate rigorosamente in accordo con i programmi didattici accademici. Clicca sui moduli per aprire i dettagli, visualizzare le formule LaTeX e scoprire i trucchi strategici d'esame.
        </p>
      </div>

      {/* 1. DH PARAMETERS */}
      <AccordionSection
        title="D-H Parameters (Denavit-Hartenberg)"
        subtitle="Analisi del convenzionamento cinematico standard e modificato"
        badge={{ text: "Cinematica", color: "bg-cyan-950 text-cyan-400 border border-cyan-800/50" }}
      >
        <div className="space-y-3">
          <h4 className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold">
            1. I quattro parametri Denavit-Hartenberg
          </h4>
          <p className="text-sm text-slate-300 theory-text">
            Per descrivere la posa relativa tra due bracci consecutivi (Link <MathText math="i-1" /> e Link <MathText math="i" />), la convenzione DH individua 4 parametri geometrici associati ad una terna solidale omonima:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-300 border-collapse border border-slate-800">
              <thead>
                <tr className="bg-slate-900 text-slate-200">
                  <th className="p-3 border border-slate-800 font-mono">Parametro</th>
                  <th className="p-3 border border-slate-800 font-mono">Significato</th>
                  <th className="p-3 border border-slate-800 font-mono">Direzione Asse</th>
                  <th className="p-3 border border-slate-800 font-mono">Variabile se Joint</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                <tr>
                  <td className="p-3 font-mono text-cyan-400"><MathText math="a_i" /></td>
                  <td className="p-3 theory-text">Lunghezza del braccio: distanza ortogonale tra gli assi <MathText math="z_{i-1}" /> e <MathText math="z_i" /></td>
                  <td className="p-3 font-mono"><MathText math="x_i" /></td>
                  <td className="p-3 text-slate-500">— Fisso</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-cyan-400"><MathText math="\alpha_i" /></td>
                  <td className="p-3 theory-text">Angolo di "twist": torsione tra asse <MathText math="z_{i-1}" /> ed asse <MathText math="z_i" /></td>
                  <td className="p-3 font-mono"><MathText math="x_i" /></td>
                  <td className="p-3 text-slate-500">— Fisso</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-cyan-400"><MathText math="d_i" /></td>
                  <td className="p-3 theory-text">Coordinata di sfilamento: distanza dall'origine <MathText math="O_{i-1}" /> al piede della normale</td>
                  <td className="p-3 font-mono"><MathText math="z_{i-1}" /></td>
                  <td className="p-3 text-green-400 font-semibold">Joint Prismatico (P)</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-cyan-400"><MathText math="\theta_i" /></td>
                  <td className="p-3 theory-text">Angolo di rotazione: angolo tra gli assi coplanari <MathText math="x_{i-1}" /> e <MathText math="x_i" /></td>
                  <td className="p-3 font-mono"><MathText math="z_{i-1}" /></td>
                  <td className="p-3 text-green-400 font-semibold">Joint Revoluto (R)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-3 pt-4">
          <h4 className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold">
            2. La matrice di roto-traslazione elementare DH
          </h4>
          <p className="text-sm text-slate-300 theory-text">
            La matrice omogenea <MathText math="{}^{i-1}A_i(q_i)" /> rappresenta la trasformazione complessiva ottenuta moltiplicando due rotazioni e due traslazioni elementari coordinate:
          </p>
          <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800">
            <MathText 
              math="{}^{i-1}A_i = \text{Rot}_z(\theta_i)\cdot\text{Trans}_z(d_i)\cdot\text{Trans}_x(a_i)\cdot\text{Rot}_x(\alpha_i)" 
              block={true} 
            />
            <p className="text-xs text-slate-400 mt-2 text-center">Formulazione esplicita risultante:</p>
            <MathText 
              math="{}^{i-1}A_i = \begin{pmatrix} \cos\theta_i & -\sin\theta_i\cos\alpha_i & \sin\theta_i\sin\alpha_i & a_i\cos\theta_i \\ \sin\theta_i & \cos\theta_i\cos\alpha_i & -\cos\theta_i\sin\alpha_i & a_i\sin\theta_i \\ 0 & \sin\alpha_i & \cos\alpha_i & d_i \\ 0 & 0 & 0 & 1 \end{pmatrix}" 
              block={true} 
            />
          </div>
        </div>

        <div className="bg-amber-950/40 border border-amber-800/80 rounded-lg p-4 space-y-2 mt-4">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider">
              TRUCCO D'ESAME — Assegnamento Frame DH ordinario
            </span>
          </div>
          <ul className="list-disc pl-5 text-xs text-amber-200/90 space-y-1 font-sans">
            <li><strong>Asse Z di giunto i:</strong> Allinea sempre l'asse <MathText math="z_{i-1}" /> all'asse di rotazione o traslazione del giunto <strong>i</strong>. <em>Errore comune:</em> confondere l'indice! L'asse del giunto 1 è <MathText math="z_0" />.</li>
            <li><strong>Asse X di giunto i:</strong> Deve essere perpendicolare sia a <MathText math="z_{i-1}" /> che a <MathText math="z_i" />. Se i due assi sono incidenti, orienta <MathText math="x_i" /> lungo il loro prodotto vettoriale (direzione uscente), o arbitrariamente se sono paralleli (poni <MathText math="d_i = 0" /> per semplicità!).</li>
            <li><strong>Giunti incidenti consecutivi:</strong> Quando due assi di giunto si intersecano (<MathText math="a_i = 0" />), l'origine <MathText math="O_i" /> giace sull'intersezione.</li>
          </ul>
        </div>
      </AccordionSection>

      {/* 2. ORIENTAMENTO E ROTAZIONI */}
      <AccordionSection
        title="Orientamento, SO(3) e Quaternioni"
        subtitle="Analisi delle matrici di rotazione, angoli di Eulero, angoli RPY e asse/angolo"
        badge={{ text: "Orientamento", color: "bg-purple-950 text-purple-400 border border-purple-800/50" }}
      >
        <div className="space-y-3">
          <h4 className="text-xs font-mono uppercase tracking-wider text-purple-400 font-bold">
            1. Matrici di Rotazione ed il Gruppo Speciale Ortogonale SO(3)
          </h4>
          <p className="text-sm text-slate-300 theory-text">
            Ogni matrice <MathText math="R \in SO(3)" /> è ortonormale e definisce i vettori unitari del frame ruotato proiettati su quello fisso:
          </p>
          <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800">
            <MathText math="R^T R = I_3, \qquad \det(R) = +1" block={true} />
            <p className="text-xs text-slate-400 mt-1 text-center">Rappresentanza per colonne dei versori:</p>
            <MathText math="R = \begin{pmatrix} \mathbf{n} & \mathbf{s} & \mathbf{a} \end{pmatrix} = \begin{pmatrix} n_x & s_x & a_x \\ n_y & s_y & a_y \\ n_z & s_z & a_z \end{pmatrix}" block={true} />
          </div>
        </div>

        <div className="space-y-3 pt-4">
          <h4 className="text-xs font-mono uppercase tracking-wider text-purple-400 font-bold">
            2. Rotazioni Elementari
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-slate-900/50 p-3 rounded border border-slate-800 text-center">
              <span className="block text-xs font-mono text-cyan-400 font-semibold mb-2">Attorno a X (Roll)</span>
              <MathText math="R_x(\phi) = \begin{pmatrix} 1 & 0 & 0 \\ 0 & c\phi & -s\phi \\ 0 & s\phi & c\phi \end{pmatrix}" block={false} />
            </div>
            <div className="bg-slate-900/50 p-3 rounded border border-slate-800 text-center">
              <span className="block text-xs font-mono text-cyan-400 font-semibold mb-2">Attorno a Y (Pitch)</span>
              <MathText math="R_y(\theta) = \begin{pmatrix} c\theta & 0 & s\theta \\ 0 & 1 & 0 \\ -s\theta & 0 & c\theta \end{pmatrix}" block={false} />
            </div>
            <div className="bg-slate-900/50 p-3 rounded border border-slate-800 text-center">
              <span className="block text-xs font-mono text-cyan-400 font-semibold mb-2">Attorno a Z (Yaw)</span>
              <MathText math="R_z(\psi) = \begin{pmatrix} c\psi & -s\psi & 0 \\ s\psi & c\psi & 0 \\ 0 & 0 & 1 \end{pmatrix}" block={false} />
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-4">
          <h4 className="text-xs font-mono uppercase tracking-wider text-purple-400 font-bold">
            3. Angoli di Eulero (Assi Mobili) vs Roll-Pitch-Yaw (Assi Fissi)
          </h4>
          <p className="text-sm text-slate-300 theory-text font-serif">
            L'orientamento spaziale può essere specificato con 3 valori d'angolo successivi. La differenza fondamentale risiede nella rotazione di riferimento:
          </p>
          <ul className="list-disc pl-5 text-sm text-slate-300 space-y-2">
            <li>
              <strong>Angoli di Eulero Z-X-Z:</strong> Le rotazioni avvengono rispetto agli assi del sistema in movimento (mobiles). La matrice complessiva si distribuisce moltiplicando da <strong>sinistra a destra</strong>: 
              <MathText math="R_{\text{Eulero}} = R_z(\phi)\cdot R_{x'}(\theta)\cdot R_{z''}(\psi)" />.
            </li>
            <li>
              <strong>Roll-Pitch-Yaw Z-Y-X:</strong> Le rotazioni avvengono rispetto agli assi del frame base (fissi). La matrice si accumula moltiplicando da <strong>destra a sinistra</strong>:
              <MathText math="R_{\text{RPY}} = R_z(\phi)\cdot R_y(\theta)\cdot R_x(\psi)" />.
            </li>
          </ul>
        </div>

        <div className="space-y-3 pt-4">
          <h4 className="text-xs font-mono uppercase tracking-wider text-purple-400 font-bold">
            4. Matrice d'esame specifica Y-Z-X ed analisi singolarità
          </h4>
          <p className="text-sm text-slate-300 theory-text">
            Un'espressione analoga d'esame è la composizione <MathText math="R_{YZX}(\phi, \theta, \psi) = R_y(\phi)\cdot R_z(\theta)\cdot R_x(\psi)" />:
          </p>
          <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800">
            <MathText 
              math="R_{YZX} = \begin{pmatrix} c\phi c\theta & s\phi s\psi - c\phi s\theta c\psi & c\phi s\theta s\psi + s\phi c\psi \\ s\theta & c\theta c\psi & -c\theta s\psi \\ -s\phi c\theta & s\phi s\theta c\psi + c\phi s\psi & -s\phi s\theta s\psi + c\phi c\psi \end{pmatrix}" 
              block={true} 
            />
            <p className="text-xs text-slate-400 mt-2">
              <strong>Analisi Singolarità:</strong> Avviene quando <MathText math="\cos\theta = 0" /> (ovvero <MathText math="\theta = \pm 90^\circ" />). In questa condizione, gli assi di rotazione iniziali (y) e finali (x) si allineano in modo parallelo perdendo un grado di orientazione indipendenza, lasciando determinabile unicamente la somma/differenza <MathText math="\phi \pm \psi" />.
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-4">
          <h5 className="text-xs font-mono uppercase tracking-wider text-purple-400 font-bold">
            5. Rappresentazione asse-angolo e Quaternioni Unitari
          </h5>
          <p className="text-sm text-slate-300 theory-text font-serif">
            I quaternioni unitari <MathText math="Q = \{ \eta, \boldsymbol{\epsilon} \}" /> eliminano l'ambiguità e i calcoli complessi delle singolarità trigonometriche (Gimbal Lock) mappando la rotazione attorno ad un asse generico <MathText math="\mathbf{r}" /> di un angolo complessivo <MathText math="\theta" />:
          </p>
          <div className="bg-slate-900/80 p-3 rounded border border-slate-800">
            <MathText math="Q = \left\{ \cos\left(\frac{\theta}{2}\right),\ \sin\left(\frac{\theta}{2}\right)\mathbf{r} \right\} \in \mathbb{S}^3" block={true} />
            <p className="text-xs text-slate-400 mt-2 theory-text text-center">
              Un quaternione unitario obbedisce alla condizione di normalizzazione quadratica <MathText math="\eta^2 + \epsilon_x^2 + \epsilon_y^2 + \epsilon_z^2 = 1" />.
            </p>
          </div>
        </div>

        <div className="bg-purple-950/40 border border-purple-800/80 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-purple-400">
            <Info className="w-5 h-5 text-purple-400 flex-shrink-0" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider">
              TRUCCO D'ESAME — Singolarità d'Orientamento
            </span>
          </div>
          <p className="text-xs text-purple-200/90 font-sans leading-relaxed">
            All'esame, quando devi invertire una matrice di rotazione numerica per ricavare gli angoli di Eulero, controlla subito l'elemento corrispondente al "pitch" cardinale (es. <MathText math="R_{31}" /> per RPY o <MathText math="R_{33}" /> per Eulero). 
            Se questo elemento è identico a <MathText math="\pm 1" />, ti trovi in una <strong>singolarità</strong>! In tal caso, non cercare di usare le formule classiche (il denominatore andrebbe a zero!). Imposta <MathText math="\phi = 0" /> come valore arbitrario di convenienza e risolvi per la differenza o somma d'angoli rimanente.
          </p>
        </div>
      </AccordionSection>

      {/* 3. CINEMATICA DIRETTA */}
      <AccordionSection
        title="Cinematica Diretta e Workspace"
        subtitle="Analisi del modello geometrico e delle limitazioni dello spazio di lavoro del robot"
        badge={{ text: "Cinematica", color: "bg-cyan-950 text-cyan-400 border border-cyan-800/50" }}
      >
        <div className="space-y-3">
          <h4 className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold">
            1. Definizione matematica e catena cinematica
          </h4>
          <p className="text-sm text-slate-300 theory-text">
            La cinematica diretta (Forward Kinematics) associa le posizioni dei giunti spaziali <MathText math="\mathbf{q} \in \mathbb{R}^n" /> all'orientamento e posizionamento finale dell'end-effector <MathText math="\mathbf{r} \in \mathbb{R}^m" />:
          </p>
          <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800 text-center text-lg text-cyan-300 font-mono">
            <MathText math="\mathbf{r} = f(\mathbf{q})" block={true} />
          </div>
          <p className="text-sm text-slate-300 theory-text font-serif">
            La posa complessiva corrisponde al prodotto omogeneo cumulativo delle matrici DH di giunto:
          </p>
          <MathText math="{}^0T_n(\mathbf{q}) = {}^0A_1(q_1)\;{}^1A_2(q_2)\;\dots\; {}^{n-1}A_n(q_n)" block={true} />
        </div>

        <div className="space-y-3 pt-4">
          <h4 className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold">
            2. Lo spazio di lavoro (Workspace)
          </h4>
          <p className="text-sm text-slate-300 theory-text">
            Distinguiamo nettamente i due spazi di lavoro fisici raggiungibili del manipolatore:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-900/40 border border-slate-800">
              <span className="font-mono text-xs font-bold text-cyan-400 block mb-2">Workspace Primario (Reachable)</span>
              <p className="text-xs text-slate-300 font-sans">
                L'insieme dei punti dello spazio cartesiano che l'end-effector può raggiungere con <strong>almeno un'orientazione</strong> complessiva del polso.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-slate-900/40 border border-slate-800">
              <span className="font-mono text-xs font-bold text-cyan-400 block mb-2">Workspace Secondario (Dextrous)</span>
              <p className="text-xs text-slate-300 font-sans">
                L'area interna dello spazio che l'end-effector può raggiungere assumendo <strong>qualsiasi orientamento desiderato</strong> del polso 3D.
              </p>
            </div>
          </div>
        </div>
      </AccordionSection>

      {/* 4. CINEMATICA INVERSA */}
      <AccordionSection
        title="Cinematica Inversa (IK)"
        subtitle="Risoluzione analitica di robot 2R e 3R antropomorfi, atan2 e scomposizione"
        badge={{ text: "Modello Inverso", color: "bg-emerald-950 text-emerald-400 border border-emerald-800/50" }}
      >
        <div className="space-y-3">
          <h4 className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold">
            1. Problematiche di un sistema non lineare
          </h4>
          <p className="text-sm text-slate-300 theory-text">
            Data la posa desiderata, ricaviamo i parametri cinematici <MathText math="\mathbf{q}" />. Trattandosi di un problema trigonometrico non-lineare, possono presentarsi: (a) zero soluzioni (punto fuori dal workspace), (b) numero finito di soluzioni (es. gomito alto/basso), (c) infinite soluzioni (in corrispondenza di singolarità interne o ridondanza).
          </p>
        </div>

        <div className="space-y-3 pt-4">
          <h4 className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold">
            2. Soluzione analitica del manipolatore 2R planare (l₁, l₂)
          </h4>
          <p className="text-sm text-slate-300 theory-text">
            Considerando la cinematica diretta cartesiana <MathText math="x = l_1 c_1 + l_2 c_{12}" /> e <MathText math="y = l_1 s_1 + l_2 s_{12}" />, elevando al quadrato ed addizionando si ottiene l'espressione per il giunto 2:
          </p>
          <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800">
            <MathText math="P_x^2 + P_y^2 = l_1^2 + l_2^2 + 2l_1l_2\cos q_2 \implies \cos q_2 = \frac{P_x^2 + P_y^2 - l_1^2 - l_2^2}{2l_1l_2}" block={true} />
            <p className="text-xs text-slate-400 mt-2 text-center">Esistono due soluzioni geometriche (gomito alto / basso) ricavabili calcolando il seno:</p>
            <MathText math="q_2^\pm = \text{atan2}\left(\pm\sqrt{1-\cos^2 q_2},\ \cos q_2\right)" block={true} />
            <p className="text-xs text-slate-400 mt-2 text-center">Una volta determinato <MathText math="q_2" />, ricaviamo <MathText math="q_1" /> via differenze d'angoli:</p>
            <MathText math="q_1 = \text{atan2}(P_y, P_x) - \text{atan2}(l_2\sin q_2,\ l_1 + l_2\cos q_2)" block={true} />
          </div>
        </div>

        <div className="bg-emerald-950/40 border border-emerald-800/80 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider">
              REQUISITO CRITICO ESPRESSO — L'uso obbligatorio di atan2(y, x)
            </span>
          </div>
          <p className="text-xs text-slate-200 font-sans leading-relaxed">
            Perché non devi <strong>MAI</strong> usare la funzione classica arcsin o arccos al compito d'esame? 
            Perché <MathText math="\arccos\alpha" /> perde l'informazione sul segno dell'angolo (<MathText math="\pm\theta" /> danno lo stesso coseno) e l'arcotangente semplice ha un intervallo limitato incapace di riconoscere il quadrante cinematico (<MathText math="x < 0" />). La funzione <strong>atan2(y, x)</strong> estrae l'arcotangente controllando separatamente i segni di y e x, posizionando l'angolo in modo univoco nell'intero intervallo <MathText math="(-\pi, \pi]" />. 
          </p>
        </div>
      </AccordionSection>

      {/* 5. CINEMATICA DIFFERENZIALE & JACOBIANO */}
      <AccordionSection
        title="Cinematica Differenziale e Jacobiano"
        subtitle="Analisi del Jacobiano Geometrico, scomposizione vettoriale, singolarità ed ellissoidi"
        badge={{ text: "Fisica e Velocità", color: "bg-red-950 text-brand-errore border border-red-800/50" }}
      >
        <div className="space-y-3">
          <h4 className="text-xs font-mono uppercase tracking-wider text-red-400 font-bold">
            1. Mappatura differenziale della velocità
          </h4>
          <p className="text-sm text-slate-300 theory-text">
            Lo Jacobiano Geometrico <MathText math="J(\mathbf{q})" /> mappa la velocità vettoriale di giunto nello spazio cartesiano (velocità lineare <MathText math="\mathbf{v}" /> ed angolare <MathText math="\boldsymbol{\omega}" />):
          </p>
          <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800">
            <MathText math="\begin{pmatrix} \mathbf{v} \\ \boldsymbol{\omega} \end{pmatrix} = J(\mathbf{q})\,\dot{\mathbf{q}} = \begin{pmatrix} J_L \\ J_A \end{pmatrix} \dot{\mathbf{q}}" block={true} />
          </div>
        </div>

        <div className="space-y-3 pt-4">
          <h4 className="text-xs font-mono uppercase tracking-wider text-red-400 font-bold">
            2. Calcolo rapido delle colonne per giunti R o P
          </h4>
          <p className="text-sm text-slate-300 theory-text">
            La colonna i-esima del Jacobiano <MathText math="J_i = \begin{pmatrix} J_{Li} \\ J_{Ai} \end{pmatrix}" /> dipende esclusivamente dalla tipologia fisica del giunto:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-900/40 border border-slate-800">
              <span className="font-mono text-xs font-bold text-cyan-400 block mb-2">Giunto Revoluto (R)</span>
              <MathText math="J_i = \begin{pmatrix} \mathbf{z}_{i-1} \times (\mathbf{p}_E - \mathbf{p}_{i-1}) \\ \mathbf{z}_{i-1} \end{pmatrix}" block={true} />
            </div>
            <div className="p-4 rounded-lg bg-slate-900/40 border border-slate-800">
              <span className="font-mono text-xs font-bold text-emerald-400 block mb-2">Giunto Prismatico (P)</span>
              <MathText math="J_i = \begin{pmatrix} \mathbf{z}_{i-1} \\ \mathbf{0} \end{pmatrix}" block={true} />
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Dove <MathText math="\mathbf{z}_{i-1}" /> è l'asse della giunzione espresso nel sistema di riferimento 0, <MathText math="\mathbf{p}_{i-1}" /> l'origine del frame coerente, e <MathText math="\mathbf{p}_E" /> la posizione dell'end-effector.
          </p>
        </div>

        <div className="space-y-3 pt-4">
          <h4 className="text-xs font-mono uppercase tracking-wider text-red-400 font-bold">
            3. Singolarità Cinematiche e perdita di rango
          </h4>
          <p className="text-sm text-slate-300 theory-text">
            Una configurazione spaziale è classificata come <strong>singolarità</strong> quando lo Jacobiano perde rango massimo ordinario (<MathText math="\text{rank}(J) < m" />). Per matrici quadrate, questo equivale alla condizione simmetrica:
          </p>
          <div className="bg-slate-900/80 p-3 rounded border border-slate-800 text-center text-lg font-mono text-red-400">
            <MathText math="\det(J(\mathbf{q})) = 0" block={true} />
          </div>
          <p className="text-xs text-slate-400 theory-text font-serif mt-2">
            <strong>Conseguenze fisiche della singolarità:</strong> (1) Perdita di mobilità in direzioni cartesiane vincolate. (2) Sforzi cinematici infiniti richiesti ai motori per generare piccole traiettorie in quella direzione. (3) Esplosione del modello di calcolo differenziale inverso.
          </p>
        </div>

        <div className="space-y-3 pt-4">
          <h4 className="text-xs font-mono uppercase tracking-wider text-red-400 font-bold">
            4. Ellissoide di Manipolabilità
          </h4>
          <p className="text-sm text-slate-300 theory-text">
            Un'ottima misura descrittiva della destrezza del robot è fornita dalla norma unitaria delle velocità giunto <MathText math="\|\dot{\mathbf{q}}\|^2 \le 1" />, che proietta in un ellissoide dinamico con asse di simmetria cartesiana:
          </p>
          <div className="bg-slate-900/80 p-3 rounded border border-slate-800">
            <MathText math="\mathbf{v}^T(JJ^T)^{-1}\mathbf{v} \le 1" block={true} />
            <p className="text-xs text-slate-400 mt-2 text-center">
              L'indice qualitativo di manipolabilità di Yoshikawa è dato da: <MathText math="w = \sqrt{\det(JJ^T)}" />. All'approssimarsi della singolarità, l'asse minore descrittivo crolla a zero, schiacciando l'ellissoide in una forma piatta!
            </p>
          </div>
        </div>
      </AccordionSection>

      {/* 6. CINEMATICA INVERSA DIFFERENZIALE */}
      <AccordionSection
        title="Cinematica Inversa Differenziale e Pseudo-inversa"
        subtitle="Analisi dei metodi di inversione differenziale, pseudo-inversa Moore-Penrose e DLS"
        badge={{ text: "Inversione ed Algoritmi", color: "bg-purple-950 text-purple-400 border border-purple-800/50" }}
      >
        <div className="space-y-3">
          <h4 className="text-xs font-mono uppercase tracking-wider text-purple-400 font-bold">
            1. Pseudo-inversa Moore-Penrose per robot ridondanti (n &gt; m)
          </h4>
          <p className="text-sm text-slate-300 theory-text">
            Quando lo Jacobiano non è quadrato o invertibile direttamente, la formula di minimizzazione della norma energetica delle velocità <MathText math="\|\dot{\mathbf{q}}\|^2" /> definisce la pseudoinversa:
          </p>
          <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800">
            <MathText math="J^\# = J^T(JJ^T)^{-1}" block={true} />
            <p className="text-xs text-slate-400 mt-2 text-center">La traiettoria di giunto minima risultante è:</p>
            <MathText math="\dot{\mathbf{q}} = J^\#\mathbf{v}" block={true} />
          </div>
        </div>

        <div className="space-y-3 pt-4">
          <h4 className="text-xs font-mono uppercase tracking-wider text-purple-400 font-bold">
            2. Le 4 Proprietà Matematiche di Moore-Penrose (FONDAMENTALE ALL'ORALE)
          </h4>
          <p className="text-sm text-slate-300 theory-text font-serif">
            Una matrice descrittiva <MathText math="X" /> rappresenta la pseudoinversa <MathText math="J^\#" /> se e solo se soddisfa contemporaneamente le quattro equazioni algebriche cardinali:
          </p>
          <div className="bg-slate-900/40 p-4 rounded-lg border border-slate-800 font-mono text-xs text-purple-300 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-2 bg-slate-950/60 rounded">
              <span className="block text-purple-400 font-bold mb-1">1. Condizione di proiezione di J</span>
              <MathText math="J X J = J" block={true} />
            </div>
            <div className="p-2 bg-slate-950/60 rounded">
              <span className="block text-purple-400 font-bold mb-1">2. Proiezione della pseudoinversa</span>
              <MathText math="X J X = X" block={true} />
            </div>
            <div className="p-2 bg-slate-950/60 rounded">
              <span className="block text-purple-400 font-bold mb-1">3. Simmetria cartesiano (JX)</span>
              <MathText math="(JX)^T = JX" block={true} />
            </div>
            <div className="p-2 bg-slate-950/60 rounded">
              <span className="block text-purple-400 font-bold mb-1">4. Simmetria giunti (XJ)</span>
              <MathText math="(XJ)^T = XJ" block={true} />
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-4">
          <h4 className="text-xs font-mono uppercase tracking-wider text-purple-400 font-bold">
            3. Gestione della Ridondanza (Null-Space Control)
          </h4>
          <p className="text-sm text-slate-300 theory-text">
            Sfruttando la ridondanza strutturale (<MathText math="n > m" />), possiamo sovrapporre una velocità ausiliaria senza influenzare la traiettoria cartesiana principale dell'end-effector:
          </p>
          <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800 text-center">
            <MathText math="\dot{\mathbf{q}} = J^\#\mathbf{v} + (I - J^\#J)\boldsymbol{\xi}" block={true} />
            <p className="text-xs text-slate-400 mt-2">
              L'operatore di proiezione proietta il vettore <MathText math="\boldsymbol{\xi}" /> nel <strong>Null-Space</strong> del Jacobiano. È comodo per massimizzare la distanza dai limiti fisici dei giunti, ottimizzare la manipolabilità o evitare ostacoli.
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-4">
          <h4 className="text-xs font-mono uppercase tracking-wider text-purple-400 font-bold">
            4. Metodo DLS (Damped Least Squares)
          </h4>
          <p className="text-sm text-slate-300 theory-text">
            Per stabilizzare l'inversione numerica in prossimità delle singolarità fisiche, evitiamo l'esplosione delle velocità di giunto inserendo un fattore smorzante quadratico <MathText math="\lambda" /> (damping factor):
          </p>
          <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800">
            <MathText math="J_{\text{DLS}} = J^T(JJ^T + \lambda^2 I_m)^{-1}" block={true} />
            <p className="text-xs text-slate-400 mt-2 theory-text text-center">
              Il parametro <MathText math="\lambda" /> baratta la precisione cartesiana sull'end-effector in favore della stabilità termomeccanica e fisica dei rotori!
            </p>
          </div>
        </div>
      </AccordionSection>

      {/* 7. PIANIFICAZIONE DELLE TRAIETTORIE */}
      <AccordionSection
        title="Pianificazione delle Traiettorie"
        subtitle="Analisi delle leggi orarie trapezoidali, cubiche, quintiche e splines"
        badge={{ text: "Traiettorie", color: "bg-amber-950 text-brand-warning border border-amber-800/50" }}
      >
        <div className="space-y-3">
          <h4 className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold">
            1. Differenza tra Path (Percorso) e Trajectory (Traiettoria)
          </h4>
          <p className="text-sm text-slate-300 theory-text font-serif">
            Un <strong>Path (Percorso)</strong> rappresenta il luogo geometrico dei punti nello spazio tridimensionale descritto senza alcun vincolo temporale. Una <strong>Traiettoria</strong> è definita dal percorso accoppiato ad una specifica <strong>Legge Oraria</strong> descrittiva di profilo <MathText math="s(t)" />.
          </p>
        </div>

        <div className="space-y-4 pt-4">
          <h4 className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold">
            2. Profilo Trapezoidale (Bang-Coast-Bang)
          </h4>
          <p className="text-sm text-slate-300 theory-text">
            Si tratta del profilo di accelerazione a tratti costante ampiamente utilizzato nei controlli automatici d'attuazione elettromeccanica:
          </p>
          <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800">
            <p className="text-xs text-slate-300 font-semibold mb-2">Tre fasi temporali distinte:</p>
            <div className="space-y-2 text-xs text-slate-300 font-sans">
              <div>1. <strong className="text-brand-successo">Bang:</strong> Accelerazione costante massima <MathText math="a_{max}" />.</div>
              <div>2. <strong className="text-brand-cinematica">Coast:</strong> Velocità di regime massima costante <MathText math="v_{max}" />.</div>
              <div>3. <strong className="text-brand-errore">Bang:</strong> Decelerazione costante massima <MathText math="-a_{max}" />.</div>
            </div>
            <p className="text-xs text-slate-400 mt-3">
              Tempo minimo teorico richiesto per ricoprire la distanza geometrica lorda <MathText math="L" />:
            </p>
            <MathText math="T = \frac{L\cdot a_{max} + v_{max}^2}{a_{max}\cdot v_{max}}, \qquad L \ge \frac{v_{max}^2}{a_{max}}" block={true} />
            <p className="text-xs text-slate-500 text-center mt-1">
              Nota bene: Se <MathText math="L < v_{max}^2/a_{max}" />, lo spazio non consente di raggiungere il coasting e la pianificazione si contrae ad un profilo <strong>triangolare</strong>!
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-4">
          <h4 className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold">
            3. Profili Polinomiali di Grado Dispari (Appoggio Giunti PTP)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900/40 p-4 rounded-lg border border-slate-800 space-y-2">
              <span className="font-mono text-xs font-bold text-cyan-400 block">Polinomio Cubico (3° Ordine)</span>
              <p className="text-xs text-slate-300 font-sans">
                Richiede l'imposizione di 4 vincoli d'appoggio (<MathText math="q_i, q_f" /> a velocità iniziale e finale nulle). Garantisce la <strong>continuità delle velocità</strong>, ma produce picchi o discontinuità sull'accelerazione!
              </p>
              <MathText math="q(t) = a_0 + a_1 t + a_2 t^2 + a_3 t^3" block={true} />
            </div>
            <div className="bg-slate-900/40 p-4 rounded-lg border border-slate-800 space-y-2">
              <span className="font-mono text-xs font-bold text-emerald-400 block">Polinomio Quintico (5° Ordine)</span>
              <p className="text-xs text-slate-300 font-sans">
                Fissa 6 condizioni cinematiche aggiungendo l'obbligo di accelerazione nulla iniziale e finale. Garantisce la <strong>continuità delle accelerazioni</strong> e limita il Jerk!
              </p>
              <MathText math="q(t) = a_0 + a_1 t + a_2 t^2 + a_3 t^3 + a_4 t^4 + a_5 t^5" block={true} />
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-4">
          <h4 className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold">
            4. Curvatura geometrica ed accelerazione centripeta cartesiana
          </h4>
          <p className="text-sm text-slate-300 theory-text">
            Nelle traiettorie tridimensionali cartesiane, la velocità d'avanzamento <MathText math="\dot{p}" /> si scompone in tangente e normale, legando l'accelerazione centripeta alla curvatura geometrica istantanea <MathText math="\kappa" />:
          </p>
          <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800">
            <MathText math="\mathbf{a}_c = \kappa \|\dot{\mathbf{p}}\|^2 \mathbf{n}" block={true} />
            <p className="text-xs text-slate-400 mt-2 text-center">
              Dove la formula esplicita per ricavare la curvatura locale corrisponde a:
            </p>
            <MathText math="\kappa = \frac{\|\dot{\mathbf{p}} \times \ddot{\mathbf{p}}\|}{\|\dot{\mathbf{p}}\|^3}" block={true} />
          </div>
        </div>
      </AccordionSection>

      {/* 8. STATICA E DUALITÀ */}
      <AccordionSection
        title="Statica e Dualità Forze/Coppie"
        subtitle="Analisi dei carichi cinematici statici, lavori virtuali e dualità dei modellatori"
        badge={{ text: "Termodinamica e Forze", color: "bg-red-950 text-brand-errore border border-red-800/50" }}
      >
        <div className="space-y-3">
          <h4 className="text-xs font-mono uppercase tracking-wider text-red-400 font-bold">
            1. Relazione fondamentale di accoppiamento statico
          </h4>
          <p className="text-sm text-slate-300 theory-text">
            Utilizzando il Principio dei Lavori Virtuali, la stessa matrice Jacobiana che modella il moto differenziale determina l'equilibrio statico tra le coppie o forze da applicare ai motori dei giunti <MathText math="\boldsymbol{\tau}" /> e le interazioni finali di Forza/Momento cartesiano impresse dall'end-effector (Wrench <MathText math="\mathbf{F}" />):
          </p>
          <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800 text-center text-xl text-red-450 font-mono">
            <MathText math="\boldsymbol{\tau} = J^T(\mathbf{q})\,\mathbf{F}" block={true} />
          </div>
        </div>

        <div className="space-y-3 pt-4">
          <h4 className="text-xs font-mono uppercase tracking-wider text-red-400 font-bold">
            2. Dualità cinematica e conservazione energetica
          </h4>
          <p className="text-sm text-slate-300 theory-text text-serif">
            Questa straordinaria relazione mostra che gli spazi d'action cinematici e statici del manipolatore sono mutuamente ortogonali ed inversi:
          </p>
          <ul className="list-disc pl-5 text-sm text-slate-300 space-y-2">
            <li>
              I vettori di forza cartesiana posizionati all'interno del <strong>Null-Space dello Jacobiano Trasposto</strong> (<MathText math="\mathcal{N}(J^T)" />) rappresentano direzioni geometriche vincolate: le forze esterne combinate premono rigidamente sul braccio del robot e vengono trasferite solidamente alle parti meccaniche senza richiedere alcuna controcoppia attiva ai motori di giunto (<MathText math="\boldsymbol{\tau} = 0" />).
            </li>
            <li>
              Le direzioni in cui il robot esibisce la massima destrezza di spostamento (grande raggio d'ellissoide di velocità) corrispondono ad una scarsa capacità d'impatto statico e necessitano di enorme coppia motoria per sprigionare spinta!
            </li>
          </ul>
        </div>
      </AccordionSection>
    </div>
  );
};
export default Teoria;
