"""Part C, Q2 - counts for the email. Needs rl_lab/pi_original.py (a copy of your
finished pi.py, saved BEFORE you edit it).

    python part_c_counts.py
"""
import numpy as np
from rl_lab.pi_original import gridworld, is_monotone, policy_iteration, q_from_v
from rl_lab.exact import value_iteration

GAMMA, SLIP, M = 0.95, 0.15, 3


def mpi(P, R, gamma, m=M, warm=True, tol=1e-9, max_rounds=5000):
    """3 sweeps of B^pi per round; improvement greedy w.r.t. the truncated V."""
    S = P.shape[0]; idx = np.arange(S)
    pi = np.zeros(S, dtype=int); V = np.zeros(S)
    rows, seen = [], {tuple(pi)}
    for _ in range(max_rounds):
        W = V if warm else np.zeros(S)
        for _ in range(m):
            W = R[idx, pi] + gamma * P[idx, pi] @ W
        rows.append(W)
        Q = q_from_v(P, R, W, gamma)
        new = np.where(Q[idx, pi] >= Q.max(axis=1) - 1e-10, pi, Q.argmax(axis=1))
        stop = np.array_equal(new, pi) and np.max(np.abs(W - V)) < tol
        V, pi = W, new
        seen.add(tuple(pi))
        if stop:
            break
    return pi, np.array(rows), len(seen)


P, R = gridworld(5, 5, slip=SLIP, seed=1)
v_star = value_iteration(P, R, GAMMA)
_, ve = policy_iteration(P, R, GAMMA)
_, vm, n = mpi(P, R, GAMMA)
print(f"seed 1  exact PI : {len(ve)} policies, {len(ve)} solves, error {np.abs(ve[-1]-v_star).max():.1e}")
print(f"seed 1  MPI warm : {len(vm)} rounds, {n} distinct policies, {M*len(vm)} sweeps, "
      f"monotone {is_monotone(vm)}, error {np.abs(vm[-1]-v_star).max():.1e}")

pol, mono_w, mono_c = [], 0, 0
for s in range(40):
    Ps, Rs = gridworld(5, 5, slip=SLIP, seed=s)
    pol.append((len(policy_iteration(Ps, Rs, GAMMA)[1]), mpi(Ps, Rs, GAMMA)[2]))
    mono_w += is_monotone(mpi(Ps, Rs, GAMMA)[1])
    mono_c += is_monotone(mpi(Ps, Rs, GAMMA, warm=False)[1])
pol = np.array(pol)
print(f"40 seeds: median policies  PI {int(np.median(pol[:,0]))}  MPI {int(np.median(pol[:,1]))}")
print(f"40 seeds: monotone  warm {mono_w}/40   cold {mono_c}/40")