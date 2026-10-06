# P01 report — <your name>, <student ID>

Keep it to one page, about five lines per answer, written in the body of your
email. Three figures: `regret.png`, the one for Q2, and the one after your Part C
change. Delete these instructions before submitting.

---

## Q1. The three growth rates

Attach `regret.png`. For each of the five algorithms, say which of the slopes in
the right-hand panel it matches, if any, and explain **why** in one sentence per
algorithm, referring to what the algorithm does — not to what the theorem says.

Greedy is the interesting one: its curve is a straight line in the left panel and
its spread across seeds is enormous. Explain both facts with the same argument.

ETC: slope 1 during the exploration phase (mK steps, round-robin, independent of the data); then it pulls the empirically best arm â for the remaining T−mK steps and never revisits the choice, so the curve goes flat if â = a* and continues linear if â ≠ a*, matching none of the three slopes overall.

Greedy: slope 1. It tries each arm once, commits to the best of those K single samples and never looks back, so after t = K it pays the gap of whichever arm it locked onto at every step. One Bernoulli draw per arm is nearly a coin flip, so which arm it locks onto depends on the seed: some seeds land on the best arm (flat curve), most on a worse one (linear), which is also why the spread across seeds is as large as the mean.

ε-greedy: linear (slope 1) in the long run, though at T = 4000 the curve still bends below that line. At every step, with probability ε it pulls a random arm and otherwise the arm with the best running mean. The running means keep correcting an unlucky start by updating the argmax with respect to the newly computed means, but the random pulls never stop: a fixed fraction ε of the steps is wasted forever, at about ε times the average gap, so the regret keeps growing, at a rate that settles to a constant per step.


UCB: slope ≈ 1/2 in theory (√T up to a log). At each step it pulls the arm with the highest mean plus a confidence bonus that is large for rarely pulled arms and shrinks as 1/√N, so a bad arm is pulled only until its upper bound falls below the best arm's, after which it is dropped. Unlike ε-greedy, wasted pulls stop by themselves; at T = 4000 the curve is still steeper than the asymptotic slope because it is still exploring.



## Q2. The bound is 17x loose. Is that a problem?

`experiments.py` prints the empirical UCB regret and the gap-dependent bound
$\sum_a 8\log T / \Delta_a$. The bound is about seventeen times larger than what
actually happens. Answer, in five lines: is the theorem wrong, is the experiment
wrong, or neither? What is the bound good for, if not for predicting the number?

Second part, and there is no "official" answer: at $T = 4000$ on this instance,
the median curve of explore-then-commit ends far **below** UCB, even though its
bound is $T^{2/3}$ and UCB's is $\sqrt{T}\log T$; its mean, printed by
`experiments.py`, is about level with UCB's. Reconcile the three facts. What
experiment would settle which of the two is better? Run it and attach the second
figure.

## Q3. Breaking UCB

State the prediction you made **before** running Part C, then what happened, then
whether your explanation survived. If you predicted correctly for the wrong
reason, say so: it is worth more than a lucky guess.

## Declaration

Time spent: ~__ h. Collaborators: ______. AI tools used and for what: ______.
(Using them is allowed and expected to be declared, exactly as for a human
collaborator: you may not ask for the solution, and you are responsible for what
you submit.)
