# P01 report — <your name>, <student ID>


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

Thompson: slope below 1. At each step it draws one random value per arm from that arm's Beta belief and pulls the arm with the highest draw, then updates only that arm's successes or failures. A rarely pulled arm has a wide belief, so its draw is sometimes high and it gets tried; as it is pulled its belief narrows around its true mean, so a worse arm is chosen less and less often and the wasted pulls fade out on their own, unlike ε-greedy.

## Q2. The bound is 17x loose. Is that a problem?

`experiments.py` prints the empirical UCB regret and the gap-dependent bound
$\sum_a 8\log T / \Delta_a$. The bound is about seventeen times larger than what
actually happens. Answer, in five lines: is the theorem wrong, is the experiment
wrong, or neither? What is the bound good for, if not for predicting the number?

Neither: the theorem is not wrong and the experiment is not wrong. The bound is worst-case, valid for every instance with probability 1−δ, and it is loose because its proof assumes an allocation of pulls that UCB does not follow. At T = 4000 the bound exceeds the largest regret that is possible at all, so at this horizon it is vacuous as a number. What it is good for is the shape, not the value: how regret grows with T (logarithmically) and with the gaps (1/Δ), on any instance, which one experiment cannot show. It becomes informative only for much larger T.

Second part, and there is no "official" answer: at $T = 4000$ on this instance,
the median curve of explore-then-commit ends far **below** UCB, even though its
bound is $T^{2/3}$ and UCB's is $\sqrt{T}\log T$; its mean, printed by
`experiments.py`, is about level with UCB's. Reconcile the three facts. What
experiment would settle which of the two is better? Run it and attach the second
figure.

At T = 4000, ETC's median (47) is far below UCB's (153) while its mean (142) is level with UCB's (155): most seeds commit correctly and pay only the exploration cost, but a minority commit to a wrong arm and pay Δ for thousands of steps, which drags the mean up and explains the huge std. The T^{2/3} versus √T log T ordering is asymptotic, and at this horizon ETC has stopped exploring after 430 steps while UCB is still exploring. Two horizons show who is accelerating but not who wins; an actual crossover would need a larger T.

## Q3. Breaking UCB

State the prediction you made **before** running Part C, then what happened, then
whether your explanation survived. If you predicted correctly for the wrong
reason, say so: it is worth more than a lucky guess.

Prediction. With δ_t = δ the confidence radius no longer depends on t, and at T = 4000 it is about 3× smaller than with δ/t³. I expect UCB to become less reliable on some seeds, with a regret curve that bends less and tends towards a straight line, and I expect the effect to grow with T.
Each interval now fails with probability δ at every step, so over thousands of steps there is no guarantee that the best arm's interval holds throughout. If its empirical mean drops below its true value by more than the (smaller) radius, its upper bound falls below another arm's and it stops being pulled. In the original rule t sits inside the logarithm, so the bonus of an unpulled arm keeps growing and eventually forces it to be pulled again.
I expect a larger std across seeds and a mean above the baseline at large T. At T = 4000 I am less sure: a smaller radius also means less wasted exploration, so the two effects may partly cancel.

Did the explanation survive? Only in part. The hedge for T = 4000, that a smaller radius means less wasted exploration, is what happened. No increasing in std happened
and ne curves didn't flatten and the regret didn't increase.


## Declaration

Time spent: ~15 h. Collaborators: No. AI tools used and for what: better comprehension and topics analysis, reasoning by questions.
(Using them is allowed and expected to be declared, exactly as for a human
collaborator: you may not ask for the solution, and you are responsible for what
you submit.)
