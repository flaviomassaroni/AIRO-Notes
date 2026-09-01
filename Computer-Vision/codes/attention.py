"""
Mini Transformer — una attention head da zero
----------------------------------------------
Task: classificazione sentiment (positivo / negativo)
su frasi giocattolo in italiano.

Architettura:
  Embedding → Self-Attention (1 head) → Pool → Linear → Softmax
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import math

# ── Vocabolario ────────────────────────────────────────────────────────────────

frasi = [
    ("il gatto è felice",        1),
    ("il cane è triste",         0),
    ("amo questo posto",         1),
    ("odio questo posto",        0),
    ("che bella giornata",       1),
    ("che brutta giornata",      0),
    ("mi piace molto",           1),
    ("non mi piace per niente",  0),
    ("tutto va bene",            1),
    ("tutto va male",            0),
    ("sono contento oggi",       1),
    ("sono arrabbiato oggi",     0),
    ("che gioia",                1),
    ("che noia",                 0),
    ("meravigliosa davvero",     1),
    ("terribile davvero",        0),
]

# costruisce il vocabolario da tutte le parole
vocab = {"<PAD>": 0}
for frase, _ in frasi:
    for parola in frase.split():
        if parola not in vocab:
            vocab[parola] = len(vocab)

VOCAB_SIZE = len(vocab)
PAD_IDX    = 0

def tokenize(frase, max_len=8):
    ids = [vocab[p] for p in frase.split()]
    # padding a destra
    ids = ids[:max_len] + [PAD_IDX] * max(0, max_len - len(ids))
    return ids

# ── Dataset ────────────────────────────────────────────────────────────────────

MAX_LEN = 8

X = torch.tensor([tokenize(f) for f, _ in frasi])   # (N, MAX_LEN)
y = torch.tensor([label for _, label in frasi])      # (N,)

# ── Modello ────────────────────────────────────────────────────────────────────

class SelfAttentionHead(nn.Module):
    """
    Una singola attention head.
    d_model = dimensione embedding
    d_k     = dimensione dello spazio Q/K
    d_v     = dimensione dello spazio V
    """
    def __init__(self, d_model, d_k, d_v):
        super().__init__()
        self.d_k = d_k
        # le tre proiezioni lineari — questi sono i W^Q, W^K, W^V
        self.W_Q = nn.Linear(d_model, d_k, bias=False)
        self.W_K = nn.Linear(d_model, d_k, bias=False)
        self.W_V = nn.Linear(d_model, d_v, bias=False)

    def forward(self, x, mask=None):
        # x: (batch, seq_len, d_model)
        Q = self.W_Q(x)   # (batch, seq_len, d_k)
        K = self.W_K(x)   # (batch, seq_len, d_k)
        V = self.W_V(x)   # (batch, seq_len, d_v)

        # prodotto scalare Q·Kᵀ, scalato
        scores = torch.bmm(Q, K.transpose(1, 2)) / math.sqrt(self.d_k)
        # scores: (batch, seq_len, seq_len)

        # maschera i token di padding (non vogliamo che influenzino l'attenzione)
        if mask is not None:
            scores = scores.masked_fill(mask == 0, float('-inf'))

        # softmax → pesi di attenzione
        attn_weights = F.softmax(scores, dim=-1)
        # attn_weights: (batch, seq_len, seq_len)

        # media pesata dei values
        output = torch.bmm(attn_weights, V)
        # output: (batch, seq_len, d_v)

        return output, attn_weights


class MiniTransformer(nn.Module):
    def __init__(self, vocab_size, d_model=16, d_k=8, d_v=8, n_classes=2):
        super().__init__()
        self.embedding  = nn.Embedding(vocab_size, d_model, padding_idx=PAD_IDX)
        self.attention  = SelfAttentionHead(d_model, d_k, d_v)
        self.classifier = nn.Linear(d_v, n_classes)

    def forward(self, x):
        # x: (batch, seq_len) di interi (token ids)

        # maschera di padding: 1 dove c'è un token reale, 0 dove c'è PAD
        pad_mask = (x != PAD_IDX).unsqueeze(1)   # (batch, 1, seq_len)

        emb = self.embedding(x)                  # (batch, seq_len, d_model)
        out, attn = self.attention(emb, pad_mask) # (batch, seq_len, d_v)

        # pooling: media sui token reali (ignora il padding)
        lengths = (x != PAD_IDX).sum(dim=1, keepdim=True).unsqueeze(-1).float()
        mask    = (x != PAD_IDX).unsqueeze(-1).float()
        pooled  = (out * mask).sum(dim=1) / lengths.squeeze(-1)
        # pooled: (batch, d_v)

        logits = self.classifier(pooled)          # (batch, n_classes)
        return logits, attn

# ── Training ───────────────────────────────────────────────────────────────────

torch.manual_seed(42)
model     = MiniTransformer(VOCAB_SIZE)
optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
loss_fn   = nn.CrossEntropyLoss()

print("Training...\n")
for epoch in range(300):
    model.train()
    logits, _ = model(X)
    loss = loss_fn(logits, y)
    optimizer.zero_grad()
    loss.backward()
    optimizer.step()

    if (epoch + 1) % 50 == 0:
        preds = logits.argmax(dim=1)
        acc   = (preds == y).float().mean().item()
        print(f"  Epoch {epoch+1:3d} | loss: {loss.item():.4f} | acc: {acc:.0%}")

# ── Inferenza + visualizzazione attenzione ─────────────────────────────────────

print("\n─── Test su frasi nuove ───────────────────────────────────────────────\n")

frasi_test = [
    "il gatto è triste",
    "amo questo animale",
    "che bella cosa",
    "odio tutto oggi",
    "che bella giornata",
    "lezione meravigliosa",
]

label_str = {0: "negativo", 1: "positivo"}

model.eval()
with torch.no_grad():
    for frase in frasi_test:
        # gestisce parole fuori vocabolario
        parole = frase.split()
        parole_ok = [p for p in parole if p in vocab]
        if len(parole_ok) < len(parole):
            unk = [p for p in parole if p not in vocab]
            print(f" '{frase}' — parole fuori vocabolario: {unk}, salto.")
            continue

        ids    = torch.tensor([tokenize(frase)])          # (1, MAX_LEN)
        logits, attn = model(ids)
        prob   = F.softmax(logits, dim=1)[0]
        pred   = logits.argmax(dim=1).item()

        print(f"  Frase: \"{frase}\"")
        print(f"  Predizione: {label_str[pred]}  "
              f"(P_pos={prob[1]:.2f}, P_neg={prob[0]:.2f})")

        # mostra i pesi di attenzione del primo token verso tutti gli altri
        # attn: (1, seq_len, seq_len) — prendiamo la riga del token 0
        n_tok = len(parole)
        w = attn[0, :n_tok, :n_tok]   # (n_tok, n_tok), ignora padding

        print(f"  Pesi di attenzione (righe=query, colonne=key):")
        header = "       " + "".join(f"{p:>10}" for p in parole)
        print(f"  {header}")
        for i, p_q in enumerate(parole):
            row = "  ".join(f"{w[i,j].item():.2f}" for j in range(n_tok))
            print(f"  {p_q:>7}: {row}")
        print()

# ── Curiosità: cosa ha imparato W^Q? ──────────────────────────────────────────

print("─── Proiezioni apprese (norme di W^Q per embedding) ───────────────────\n")
with torch.no_grad():
    interessanti = ["felice", "triste", "amo", "odio", "bella", "brutta",
                    "gatto", "cane", "il", "è"]
    emb_w = model.embedding.weight
    WQ    = model.attention.W_Q.weight  # (d_k, d_model)
    for parola in interessanti:
        if parola not in vocab:
            continue
        idx  = vocab[parola]
        e    = emb_w[idx]               # (d_model,)
        q    = WQ @ e                   # (d_k,)   — proiezione in Q
        print(f"  {parola:>10}: ‖Q‖ = {q.norm().item():.3f}")