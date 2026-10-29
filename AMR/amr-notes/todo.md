# TODO — AMR Notes

Stato al 29 ottobre 2026. File di lavoro personale, non parte del PDF.
Terminologia tecnica in inglese, note in italiano.

---

## Stato dei capitoli

| File | Stato | Note |
|---|---|---|
| `00_introduzione` | ✅ completo | overfull hbox in tabella |
| `01_configuration_space` | ✅ completo | piccolo fix `$` |
| `02_wmr_mechanics` | ✅ completo | rimando wriggle da migliorare |
| `03_nonlinear_controllability` | ✅ completo | rimandi a cap 2 ok |
| `04_path_and_trajectory` | 🔄 in corso | manca trajectory planning |
| `05_motion_control` | 📝 scheletro ||
| `06_regulation` | ⬜ vuoto | da scrivere (Brockett, tempo-varianti) |
| `07_localization` | ⬜ vuoto | — |
| `08_mapping` | ⬜ vuoto | — |
| `09_slam` | ⬜ vuoto | — |
| `10_decision_uncertainty` | ⬜ vuoto | — |
| `11_laboratorio` | ⬜ vuoto | — |

Legenda: ✅ completo · 🔄 in corso · 📝 scheletro · ⬜ vuoto

---

## Da fare subito (cap 04)

- [ ] Aggiungere sezione `Choice of the Timing Law`:
  - [ ] timing law lineare
  - [ ] timing law trapezoidale (bang-coast-bang)
  - [ ] vincoli su `v`, `ω` e calcolo di `k`
- [ ] Aggiungere sezione `Path Planning via Parametrized Inputs`
- [ ] Aggiornare intro per menzionare trajectory planning
- [ ] Aggiungere rimandi a cap 2:
  - `\cref{sec:chained-form}` (definizione)
  - `\cref{subsec:unicycle-chained}` (unicycle in chained form)
  - `\cref{subsec:bicycle-chained}` (bicycle in chained form)
- [ ] Aggiornare `Takeaways`

---

## Fix minori per capitolo

### 00_introduzione
- [ ] Overfull hbox in tabella manipolatori vs WMR: aggiungere `\small` o accorciare le voci

### 01_configuration_space
- [ ] `In all cases,$\dim(C) = \text{DOF of the robot}$,` — il `$` va su una riga nuova e spezza la formula. Sostituire con `\[ \dim(C) = \text{DOF of the robot}, \]` o inline corretto
- [ ] `nb` su SO(n): dice "three-dimensional space" ma la definizione è per `ℝⁿ`

### 02_wmr_mechanics
- [ ] Rimando wriggle nel modello unicycle: `\cref{ch:nonlinear-controllability}` → `\cref{sec:lie-bracket-interpretation}` (più preciso)

### 03_nonlinear_controllability
- [ ] Riconsiderare il titolo `Nonlinear Controllability in Depth` — "in Depth" è un po' pretenzioso per un capitolo che è in realtà un approfondimento. Alternativa: `Nonlinear Controllability: Advanced Topics`

---

## Notazione

- [ ] **`y` ha due significati**: coordinata cartesiana (in `q = (x,y)`) e vettore dei flat outputs (in `y = Ψ(x)`). Suggerimento: `\newcommand{\y}{{\mathbf y}}` nel preambolo e usare `\y` per i flat outputs
- [ ] Verificare che `\mathcal{C}` e `\mathcal{W}` non siano rimasti (dovrebbero essere tutti diventati `C` e `W` dopo il sed)

---

### Cap 2
- [ ] `images/balance.pdf`
- [ ] `images/wheels.png`
- [ ] `images/structures.eps`
- [ ] `images/differential.eps`

### Cap 3
- [ ] `images/lie_inputs.eps`
- [ ] `images/lie_bracket_direction.eps`
- [ ] `images/slide_vector.eps`
- [ ] `images/chained_form.eps`
- [ ] `images/z2z3.eps`

### Cap 4
- [ ] `images/inadmissible.eps`
- [ ] `images/flat_output_1.eps`
- [ ] `images/k_shape.eps`
- [ ] `images/trapezoidal_timing_law.eps` (da aggiungere, sezione timing law)

---

## Compilazione / ambiente

- [ ] `.latexmkrc` deve contenere:
  ```perl
  $pdf_mode = 1;
  $out_dir = 'build';
  $aux_dir = 'build';
  $bibtex_use = 2;
  $biber = 'biber %O %S';