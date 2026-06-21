/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type JointType = 'R' | 'P';

export interface DHParam {
  id: string;
  jointType: JointType;
  alpha: number; // in degrees
  a: number;     // in meters / scaling units
  d: number;     // in meters / scaling units (variable if Prismatic)
  theta: number; // in degrees (variable if Revolute)
  value: number; // current sliding value (theta in deg if R, d in units if P)
  minLimit: number;
  maxLimit: number;
}

export interface QuizQuestion {
  id: string;
  category: 'DH' | 'Orientation' | 'DK' | 'IK' | 'Jacobian' | 'Trajectory' | 'Statics';
  questionType: 'multiple-choice' | 'formula-match' | 'structure-match' | 'numerical-estimation';
  questionText: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  visualCue?: string; // name of preset to load to visualizer
  points: number;
}

export type ActiveSection = 
  | 'overview' 
  | 'theory' 
  | 'builder' 
  | 'ik_solver' 
  | 'jacobian_lab' 
  | 'trajectory_studio' 
  | 'exam_simulator'
  | 'dynamics_control'
  | 'inverse_diff_lab'
  | 'statics_lab'
  | 'orientation_lab';

export interface RobotPreset {
  name: string;
  description: string;
  params: Omit<DHParam, 'id'>[];
}
