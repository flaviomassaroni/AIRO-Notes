/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DHParam, RobotPreset } from '../types';

// Standard 3D vector helpers
export type Vector3D = [number, number, number];
export type Matrix4x4 = [
  [number, number, number, number],
  [number, number, number, number],
  [number, number, number, number],
  [number, number, number, number]
];

export const IDENTITY_MATRIX: Matrix4x4 = [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 1]
];

export function crossProduct(v1: Vector3D, v2: Vector3D): Vector3D {
  return [
    v1[1] * v2[2] - v1[2] * v2[1],
    v1[2] * v2[0] - v1[0] * v2[2],
    v1[0] * v2[1] - v1[1] * v2[0]
  ];
}

export function dotProduct(v1: Vector3D, v2: Vector3D): number {
  return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
}

export function vSubtract(v1: Vector3D, v2: Vector3D): Vector3D {
  return [v1[0] - v2[0], v1[1] - v2[1], v1[2] - v2[2]];
}

export function norm(v: Vector3D): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

export function multiply4x4(A: Matrix4x4, B: Matrix4x4): Matrix4x4 {
  const C = Array(4).fill(0).map(() => Array(4).fill(0)) as any;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      C[r][c] = A[r][0] * B[0][c] + A[r][1] * B[1][c] + A[r][2] * B[2][c] + A[r][3] * B[3][c];
    }
  }
  return C;
}

// Generates the i-1 A_i transformation matrix based on DH Param
export function getDHMatrix(thetaDeg: number, d: number, a: number, alphaDeg: number): Matrix4x4 {
  const theta = (thetaDeg * Math.PI) / 180;
  const alpha = (alphaDeg * Math.PI) / 180;
  const cT = Math.cos(theta);
  const sT = Math.sin(theta);
  const cA = Math.cos(alpha);
  const sA = Math.sin(alpha);

  // Exact Denavit-Hartenberg homogeneous matrix:
  return [
    [cT, -sT * cA,  sT * sA, a * cT],
    [sT,  cT * cA, -cT * sA, a * sT],
    [0,   sA,       cA,      d],
    [0,   0,        0,       1]
  ];
}

export interface FrameInfo {
  T: Matrix4x4;
  origin: Vector3D;
  intermediate: Vector3D;
  zAxis: Vector3D; // joint motion axis
  xAxis: Vector3D;
  yAxis: Vector3D;
}

// Computes the positions and orientations of all frames using the DH parametrization
export function forwardKinematics(params: DHParam[]): FrameInfo[] {
  const frames: FrameInfo[] = [];
  
  // Base frame Info (Frame 0)
  frames.push({
    T: IDENTITY_MATRIX,
    origin: [0, 0, 0],
    intermediate: [0, 0, 0],
    zAxis: [0, 0, 1],
    xAxis: [1, 0, 0],
    yAxis: [0, 1, 0]
  });

  let currentT = IDENTITY_MATRIX;

  for (const p of params) {
    const theta = p.jointType === 'R' ? p.value + (p.theta || 0) : p.theta;
    const d = p.jointType === 'P' ? p.value + (p.d || 0) : p.d;
    const a = p.a;
    const alpha = p.alpha;

    const zPrev = [currentT[0][2], currentT[1][2], currentT[2][2]];
    const pPrev = [currentT[0][3], currentT[1][3], currentT[2][3]];
    
    const intermediate: Vector3D = [
      pPrev[0] + d * zPrev[0],
      pPrev[1] + d * zPrev[1],
      pPrev[2] + d * zPrev[2]
    ];

    const A = getDHMatrix(theta, d, a, alpha);
    currentT = multiply4x4(currentT, A);

    frames.push({
      T: currentT,
      origin: [currentT[0][3], currentT[1][3], currentT[2][3]],
      intermediate: intermediate,
      zAxis: [currentT[0][2], currentT[1][2], currentT[2][2]],
      xAxis: [currentT[0][0], currentT[1][0], currentT[2][0]],
      yAxis: [currentT[0][1], currentT[1][1], currentT[2][1]]
    });
  }

  return frames;
}

// Compute the 6xn Geometric Jacobian
// J_L: linear part [3 x n], J_A: angular part [3 x n]
export function computeJacobian(params: DHParam[], frames: FrameInfo[]): { JL: number[][]; JA: number[][] } {
  const n = params.length;
  const JL: number[][] = Array(3).fill(0).map(() => Array(n).fill(0));
  const JA: number[][] = Array(3).fill(0).map(() => Array(n).fill(0));

  const pEE = frames[frames.length - 1].origin; // End-effector position

  for (let i = 0; i < n; i++) {
    const jointType = params[i].jointType;
    // The i-th joint is directed along the z-axis of the PREVIOUS frame (i.e. frame i-1 in our array index info)
    const zPrev = frames[i].zAxis;
    const pPrev = frames[i].origin;

    if (jointType === 'R') {
      // Linear column: z_{i-1} x (p_E - p_{i-1})
      const arm = vSubtract(pEE, pPrev);
      const colL = crossProduct(zPrev, arm);
      JL[0][i] = colL[0];
      JL[1][i] = colL[1];
      JL[2][i] = colL[2];

      // Angular column: z_{i-1}
      JA[0][i] = zPrev[0];
      JA[1][i] = zPrev[1];
      JA[2][i] = zPrev[2];
    } else {
      // Prismatic: Linear column is z_{i-1}, Angular is 0
      JL[0][i] = zPrev[0];
      JL[1][i] = zPrev[1];
      JL[2][i] = zPrev[2];

      JA[0][i] = 0;
      JA[1][i] = 0;
      JA[2][i] = 0;
    }
  }

  return { JL, JA };
}

// Compute the determinat of physical Jacobian in 2D or 3D cases.
// For illustrative purposes in general n-DOF, we can extract the primary task space [2x2] or [3x3] to show singolarità.
export function computeManipulability(JL: number[][]): { w: number; sigmas: number[]; det: number } {
  const m = JL.length; // usually 3 for translation
  const n = JL[0].length;

  // Let's create the JJ^T matrix
  // If m x n, JJ^T is m x m
  const JJt: number[][] = Array(m).fill(0).map(() => Array(m).fill(0));
  for (let r = 0; r < m; r++) {
    for (let c = 0; c < m; c++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += JL[r][k] * JL[c][k];
      }
      JJt[r][c] = sum;
    }
  }

  let det = 0;
  if (m === 2) {
    det = JJt[0][0] * JJt[1][1] - JJt[0][1] * JJt[1][0];
  } else if (m === 3) {
    det = JJt[0][0] * (JJt[1][1] * JJt[2][2] - JJt[1][2] * JJt[2][1]) -
          JJt[0][1] * (JJt[1][0] * JJt[2][2] - JJt[1][2] * JJt[2][0]) +
          JJt[0][2] * (JJt[1][0] * JJt[2][1] - JJt[1][1] * JJt[2][0]);
  }

  const w = Math.sqrt(Math.max(0, det));

  // Compute primary eigenvalues for 2D ellipse plotting
  const eigenvalues: number[] = [];
  if (m === 2) {
    const trace = JJt[0][0] + JJt[1][1];
    const desc = Math.sqrt(Math.max(0, (trace / 2) ** 2 - det));
    eigenvalues.push(trace / 2 + desc);
    eigenvalues.push(trace / 2 - desc);
  } else {
    eigenvalues.push(JJt[0][0]);
    eigenvalues.push(JJt[1][1]);
  }

  const sigmas = eigenvalues.map(v => Math.sqrt(Math.max(0, v)));
  return { w, sigmas, det };
}

// STANDARD ACCADEMIC PRESETS
export const ROBOT_PRESETS: Record<string, RobotPreset> = {
  'planar_2r': {
    name: 'Planare 2R (Gomito)',
    description: 'Il classico robot d\'esame planare a due giunti rotanti con link l1=1.0, l2=0.8. Ottimo per visualizzare le singolarità sul bordo interno/esterno e le due soluzioni analitiche di IK.',
    params: [
      { jointType: 'R', alpha: 0, a: 1.0, d: 0.0, theta: 0, value: 45, minLimit: -185, maxLimit: 185 },
      { jointType: 'R', alpha: 0, a: 0.8, d: 0.0, theta: 0, value: 45, minLimit: -150, maxLimit: 150 }
    ]
  },
  'planar_3r': {
    name: 'Planare 3R (Ridondante)',
    description: 'Robot planare ridondante ad 3 giunti di rotazione coplanari. Ha un null-space 1-dimensionale utilizzabile per ottimizzare l\'orientamento o evitare i limiti dei giunti.',
    params: [
      { jointType: 'R', alpha: 0, a: 0.8, d: 0.0, theta: 0, value: 30, minLimit: -180, maxLimit: 180 },
      { jointType: 'R', alpha: 0, a: 0.6, d: 0.0, theta: 0, value: 30, minLimit: -180, maxLimit: 180 },
      { jointType: 'R', alpha: 0, a: 0.5, d: 0.0, theta: 0, value: 30, minLimit: -180, maxLimit: 180 }
    ]
  },
  'scara': {
    name: 'SCARA (4-DOF RRPR)',
    description: 'Il celebre manipolatore industriale. Ha i primi due giunti rotanti ad assi verticali paralleli (DH: alpha=0), seguiti da un giunto prismatico di traslazione verticale e un giunto rotante d\'orientamento finale.',
    params: [
      { jointType: 'R', alpha: 0, a: 0.8, d: 0.0, theta: 0, value: 45, minLimit: -150, maxLimit: 150 },
      { jointType: 'R', alpha: 180, a: 0.7, d: 0.0, theta: 0, value: -60, minLimit: -150, maxLimit: 150 },
      { jointType: 'P', alpha: 0, a: 0.0, d: 0.0, theta: 0, value: 0.2, minLimit: 0, maxLimit: 0.6 },
      { jointType: 'R', alpha: 0, a: 0.0, d: 0.0, theta: 0, value: 30, minLimit: -180, maxLimit: 180 }
    ]
  },
  'rpp': {
    name: 'RPP (Cilindrico)',
    description: 'Manipolatore con un asse di rotazione base e due assi di estensione cartesiana (cilindrico). Ottimo per movimenti verticali e radiali indipendenti.',
    params: [
      { jointType: 'R', alpha: -90, a: 0.0, d: 0.5, theta: 0, value: 45, minLimit: -180, maxLimit: 180 },
      { jointType: 'P', alpha: 90, a: 0.0, d: 0.2, theta: -90, value: 0.4, minLimit: 0.1, maxLimit: 0.8 },
      { jointType: 'P', alpha: 0, a: 0.0, d: 0.0, theta: 0, value: 0.3, minLimit: 0.1, maxLimit: 0.8 }
    ]
  },
  'prr': {
    name: 'PRR (Planare su Rotaia)',
    description: 'Base su rotaia prismatica seguita da due link planari classici rotazionali.',
    params: [
      { jointType: 'P', alpha: -90, a: 0.0, d: 0.0, theta: 0, value: 0.2, minLimit: 0, maxLimit: 1.0 },
      { jointType: 'R', alpha: 0, a: 0.8, d: 0.0, theta: 0, value: 45, minLimit: -180, maxLimit: 180 },
      { jointType: 'R', alpha: 0, a: 0.6, d: 0.0, theta: 0, value: -30, minLimit: -180, maxLimit: 180 }
    ]
  },
  'rrp': {
    name: 'RRP (Sferico Classico)',
    description: 'Configurazione tipo sferico/polare, con due rotazioni e un asse finale prismatico di estensione.',
    params: [
      { jointType: 'R', alpha: -90, a: 0.0, d: 0.4, theta: 0, value: 30, minLimit: -180, maxLimit: 180 },
      { jointType: 'R', alpha: 90, a: 0.0, d: 0.0, theta: 0, value: 45, minLimit: -180, maxLimit: 180 },
      { jointType: 'P', alpha: 0, a: 0.0, d: 0.0, theta: 0, value: 0.6, minLimit: 0.1, maxLimit: 1.2 }
    ]
  },
  'ppr': {
    name: 'PPR (Gantry Base)',
    description: 'Prismatico su due assi cartesiani (es. asse X e Z) con ultimo giunto rotazionale di manipolazione pezzo.',
    params: [
      { jointType: 'P', alpha: -90, a: 0.0, d: 0.0, theta: -90, value: 0.4, minLimit: 0, maxLimit: 1.0 },
      { jointType: 'P', alpha: 90, a: 0.0, d: 0.0, theta: 90, value: 0.5, minLimit: 0, maxLimit: 1.0 },
      { jointType: 'R', alpha: 0, a: 0.5, d: 0.0, theta: 0, value: 45, minLimit: -180, maxLimit: 180 }
    ]
  },
  'rpr': {
    name: 'RPR (Misto Spalla-Polso)',
    description: 'Robusto manipolatore misto: spalla rotante, gomito prismatico d\'estensione, polso rotante.',
    params: [
      { jointType: 'R', alpha: -90, a: 0.0, d: 0.6, theta: 0, value: 45, minLimit: -120, maxLimit: 120 },
      { jointType: 'P', alpha: 90, a: 0.0, d: 0.3, theta: -90, value: 0.5, minLimit: 0.2, maxLimit: 0.9 },
      { jointType: 'R', alpha: 0, a: 0.4, d: 0.0, theta: 0, value: -30, minLimit: -180, maxLimit: 180 }
    ]
  },
  'anthropomorphic_3r': {
    name: 'Antropomorfo 3R (Gomito 3D)',
    description: 'I primi tre giunti di un manipolatore 6R tradizionale. Soluzione per l\'estensione nello spazio cartesiano.',
    params: [
      { jointType: 'R', alpha: 90, a: 0.0, d: 0.5, theta: 0, value: 30, minLimit: -120, maxLimit: 120 },
      { jointType: 'R', alpha: 0, a: 0.8, d: 0.0, theta: 0, value: 45, minLimit: -110, maxLimit: 110 },
      { jointType: 'R', alpha: 0, a: 0.7, d: 0.0, theta: 0, value: -45, minLimit: -120, maxLimit: 120 }
    ]
  },
  'anthropomorphic_6r': {
    name: 'Antropomorfo PUMA 6R (Elbow Type)',
    description: 'Classico PUMA 560: 3 gradi di liberta (posizionamento braccio sferico) + 3 gradi di grado (orientamento del polso sferico).',
    params: [
      { jointType: 'R', alpha: -90, a: 0.0, d: 0.4, theta: 0, value: 30, minLimit: -180, maxLimit: 180 },
      { jointType: 'R', alpha: 0, a: 0.7, d: 0.0, theta: 0, value: 45, minLimit: -180, maxLimit: 180 },
      { jointType: 'R', alpha: -90, a: 0.0, d: 0.15, theta: 0, value: -45, minLimit: -180, maxLimit: 180 },
      { jointType: 'R', alpha: 90, a: 0.0, d: 0.6, theta: 0, value: 0, minLimit: -180, maxLimit: 180 },
      { jointType: 'R', alpha: -90, a: 0.0, d: 0.0, theta: 0, value: 0, minLimit: -180, maxLimit: 180 },
      { jointType: 'R', alpha: 0, a: 0.0, d: 0.2, theta: 0, value: 0, minLimit: -180, maxLimit: 180 }
    ]
  }
};
