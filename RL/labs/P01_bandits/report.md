# P01 report — <Flavio Massaroni>, <1990975>

Keep it to one page, about five lines per answer, written in the body of your
email. Three figures: `regret.png`, the one for Q2, and the one after your Part C
change. Delete these instructions before submitting.

---

## Q1. The three growth rates

Attach `regret.png`. For each of the five algorithms, say which of the slopes in
the right-hand panel it matches, and explain **why** in one sentence per
algorithm, referring to what the algorithm does — not to what the theorem says.

Greedy is the interesting one: its curve is a straight line in the left panel and
its spread across seeds is enormous. Explain both facts with the same argument.


Greedy extracts an arm and keeps it all the time. The 

## Q2. The bound is 17x loose. Is that a problem?

`experiments.py` prints the empirical UCB regret and the gap-dependent bound
$\sum_a 8\log T / \Delta_a$. The bound is about seventeen times larger than what
actually happens. Answer, in five lines: is the theorem wrong, is the experiment
wrong, or neither? What is the bound good for, if not for predicting the number?

Second part, and there is no "official" answer: at $T = 4000$ on this instance,
explore-then-commit ends up **below** UCB, even though its bound is $T^{2/3}$ and
UCB's is $\sqrt{T}\log T$. Reconcile the two facts. What experiment would settle
it? Run it and attach the second figure.

## Q3. Breaking UCB

State the prediction you made **before** running Part C, then what happened, then
whether your explanation survived. If you predicted correctly for the wrong
reason, say so: it is worth more than a lucky guess.

## Declaration

Time spent: ~__ h. Collaborators: ______. AI tools used and for what: ______.
(Using them is allowed and expected to be declared, exactly as for a human
collaborator: you may not ask for the solution, and you are responsible for what
you submit.)
