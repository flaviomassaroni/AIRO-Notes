# P01 — Bandits and regret

**~30 min at home, 2 hours in class, ~30 min for the report.**

A Bernoulli bandit is fifteen lines of numpy: no simulator, no dataset, no GPU.
It is the first lab because the regret bounds proved in the lecture are visible
directly in the numbers it prints.

By the end you can write greedy, explore-then-commit, $\epsilon$-greedy, UCB and
Thompson sampling as pure selection rules, and read the three regret rates
($T$, $T^{2/3}$, $\sqrt{T}$) off a log-log plot.

## Part A — at home, before class

Eight `# TODO`s in `rl_lab/bandits.py`, checked by
twenty-four tests.

```bash
pip install -r requirements.txt
python autograder.py
```

See [HOWTO](HOWTO.md) if this is your first lab.

You implement the Hoeffding confidence radius, the five selection rules, and the
pseudo-regret.

Start with `test_q1_radius_halves_when_samples_quadruple`: it fails if the
constant inside the square root is wrong, which is the mistake that survives
everything else.

**Come to class even if you are stuck.** The first fifteen minutes are about the
three most common failures, and where you got stuck is useful.

## Part B — in class

```bash
python experiments.py            # ~40 s, writes regret.png
```

Five algorithms, 40 seeds, $T = 4000$, with the theory on the same axes.

The right panel is log-log, so a growth rate is a **slope**. Greedy sits on
slope 1; the others do not.

Then, together: the arms are close here (the hardest gap is 0.05). Change the
gaps and see which algorithm degrades first.

## Part C — break it

**Predict first, then run.** In `select_ucb`, replace

```python
delta_t = delta / max(t, 1) ** 3
```

with `delta_t = delta` — a confidence level that never shrinks. What happens to
the regret curve, and why? Report question 3 asks what you predicted.

## What to hand in

This is a **long lab**: Part B is a real training run, and you write a report.
Both kinds count the same toward the lab requirement, except that three of your
five accepted labs must be long ones. See [HOWTO](HOWTO.md).

One email, before this lab's deadline, with:

1. **Two figures your code produced**, attached as files:
   - `regret.png`, from `python experiments.py` as given;
   - the same figure after your change for Part C, saved under a new
     name so the first one is kept:
     `python experiments.py --out regret_partc.png`.
2. **The report in the body of the email**: the three questions in `report.md`,
   answered there, at least 150 words in total. A `report.md` attached on its
   own is not counted.

Pass/fail, decided by a program: two images, 150 words in the body, on time.
The address and the subject line are in "How to submit a lab" on Classroom.
