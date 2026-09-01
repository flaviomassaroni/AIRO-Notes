"""
Mini Transformer v2
───────────────────
Novità rispetto a v1:
  1. Subword tokenization minimale (prefisso + ##suffisso)
  2. Token <UNK> per parole sconosciute non scomponibili
  3. Embedding inizializzato con prior semantico per parole emotive
  4. Dataset espanso con maschili/femminili/plurali
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import math

# ══════════════════════════════════════════════════════════════════════════════
# 1. DATASET ESPANSO
# ══════════════════════════════════════════════════════════════════════════════

frasi = [
    # originali
    ("il gatto è felice",           1),
    ("il cane è triste",            0),
    ("amo questo posto",            1),
    ("odio questo posto",           0),
    ("che bella giornata",          1),
    ("che brutta giornata",         0),
    ("mi piace molto",              1),
    ("non mi piace per niente",     0),
    ("tutto va bene",               1),
    ("tutto va male",               0),
    ("sono contento oggi",          1),
    ("sono arrabbiato oggi",        0),
    ("che gioia",                   1),
    ("che noia",                    0),
    ("meraviglioso davvero",        1),
    ("terribile davvero",           0),
    # varianti morfologiche — qui si vede l'utilità del subword
    ("che bella lezione",           1),
    ("che brutta lezione",          0),
    ("meravigliosa lezione",        1),
    ("terribile lezione",           0),
    ("il gatto è triste",           0),   # caso che prima sbagliava
    ("il cane è felice",            1),
    ("sono contenta oggi",          1),
    ("sono arrabbiata oggi",        0),
    ("che bel momento",             1),
    ("che brutto momento",          0),
    ("lezione meravigliosa",        1),
    ("lezione terribile",           0),
    ("giornata meravigliosa",       1),
    ("giornata terribile",          0),
    ("odio questa lezione",         0),
    ("amo questa lezione",          1),
    ("tutto molto bello",           1),
    ("tutto molto brutto",          0),
]

# ══════════════════════════════════════════════════════════════════════════════
# 2. SUBWORD TOKENIZER
# ══════════════════════════════════════════════════════════════════════════════
# Strategia: se la parola è nel vocabolario → token intero
#            altrimenti → cerca il prefisso più lungo nel vocabolario,
#                         il resto diventa "##suffisso"
#            se neanche il prefisso esiste → <UNK>
#
# Il vocabolario viene costruito automaticamente dal dataset,
# poi arricchito con prefissi delle parole viste.

def build_vocab(frasi, min_prefix=4):
    """
    Costruisce il vocabolario con:
    - tutte le parole intere del dataset
    - prefissi di lunghezza >= min_prefix per ogni parola
    - suffissi ##xxx per i finali più comuni
    - token speciali <PAD> e <UNK>
    """
    full_words = set()
    for frase, _ in frasi:
        for p in frase.split():
            full_words.add(p)

    vocab = {"<PAD>": 0, "<UNK>": 1}

    # parole intere
    for w in sorted(full_words):
        if w not in vocab:
            vocab[w] = len(vocab)

    # prefissi (radici morfologiche)
    for w in sorted(full_words):
        for length in range(min_prefix, len(w)):
            prefix = w[:length]
            if prefix not in vocab:
                vocab[prefix] = len(vocab)

    # suffissi comuni italiani come token separati
    suffissi = ["##o", "##a", "##i", "##e", "##oso", "##osa",
                "##oso", "##bile", "##mente", "##ata", "##ato",
                "##ione", "##ioso", "##iosa"]
    for s in suffissi:
        if s not in vocab:
            vocab[s] = len(vocab)

    return vocab

vocab = build_vocab(frasi)
PAD_IDX = vocab["<PAD>"]
UNK_IDX = vocab["<UNK>"]
VOCAB_SIZE = len(vocab)


def subword_tokenize(word, vocab):
    """
    Tokenizza una singola parola in subword:
      - se la parola è nel vocabolario → [word]
      - altrimenti → cerca il prefisso più lungo noto,
                     poi prova ##suffisso
      - fallback → [<UNK>]

    Esempio:
      "meravigliosa" non è nel vocabolario
      → prefisso "meravigli" è nel vocabolario (da "meraviglioso")
      → suffisso "##osa" è nel vocabolario
      → ["meravigli", "##osa"]
    """
    if word in vocab:
        return [word]

    # cerca il prefisso più lungo noto
    best_prefix = None
    for length in range(len(word) - 1, 3, -1):
        candidate = word[:length]
        if candidate in vocab:
            best_prefix = candidate
            break

    if best_prefix is None:
        return ["<UNK>"]

    # il resto diventa suffisso
    suffix = "##" + word[len(best_prefix):]
    if suffix in vocab:
        return [best_prefix, suffix]
    else:
        # suffisso sconosciuto → solo il prefisso (perdiamo la desinenza)
        return [best_prefix]


def tokenize_frase(frase, vocab, max_len=10):
    """Tokenizza una frase in subword ids con padding."""
    ids = []
    parole_debug = []
    for word in frase.split():
        subwords = subword_tokenize(word, vocab)
        parole_debug.extend(subwords)
        ids.extend(vocab[sw] for sw in subwords)
    ids = ids[:max_len] + [PAD_IDX] * max(0, max_len - len(ids))
    return ids, parole_debug


MAX_LEN = 10
X = torch.tensor([tokenize_frase(f, vocab)[0] for f, _ in frasi])
y = torch.tensor([label for _, label in frasi])


# ══════════════════════════════════════════════════════════════════════════════
# 3. PRIOR SEMANTICO SULL'EMBEDDING
# ══════════════════════════════════════════════════════════════════════════════
# Ogni parola emotiva viene inizializzata con un vettore a 4 dimensioni:
#
#   [valenza, intensità, certezza, soggettività]
#
#   valenza      : −1.0 (molto negativo) → +1.0 (molto positivo)
#   intensità    :  0.0 (neutro/debole)  → +1.0 (forte)
#   certezza     :  0.0 (vago)           → +1.0 (preciso/diretto)
#   soggettività :  0.0 (oggettivo)      → +1.0 (carico di sentimento)
#
# Queste 4 dimensioni vengono inserite come prime 4 componenti dell'embedding.
# Le restanti d_model-4 dimensioni rimangono random e vengono apprese.
# In questo modo la rete "parte già orientata" senza essere vincolata.

SEMANTIC_PRIOR = {
    # parola          val    int    cert   sogg
    "felice":       [ 0.9,  0.7,   0.8,   0.8],
    "triste":       [-0.9,  0.7,   0.8,   0.8],
    "amo":          [ 0.9,  0.9,   1.0,   1.0],
    "odio":         [-1.0,  0.9,   1.0,   1.0],
    "bella":        [ 0.8,  0.6,   0.8,   0.7],
    "bello":        [ 0.8,  0.6,   0.8,   0.7],
    "bel":          [ 0.8,  0.5,   0.7,   0.6],
    "brutta":       [-0.8,  0.6,   0.8,   0.7],
    "brutto":       [-0.8,  0.6,   0.8,   0.7],
    "meraviglioso": [ 1.0,  0.9,   0.9,   0.9],
    "meravigliosa": [ 1.0,  0.9,   0.9,   0.9],
    # prefisso condiviso — è qui la magia del subword + prior
    "meravigli":    [ 0.95, 0.85,  0.85,  0.85],
    "terribile":    [-1.0,  0.9,   0.9,   0.9],
    "contento":     [ 0.8,  0.6,   0.8,   0.7],
    "contenta":     [ 0.8,  0.6,   0.8,   0.7],
    "arrabbiato":   [-0.8,  0.7,   0.8,   0.8],
    "arrabbiata":   [-0.8,  0.7,   0.8,   0.8],
    "gioia":        [ 0.9,  0.8,   0.9,   0.9],
    "noia":         [-0.5,  0.4,   0.7,   0.6],
    "bene":         [ 0.7,  0.5,   0.7,   0.5],
    "male":         [-0.7,  0.5,   0.7,   0.5],
    "piace":        [ 0.6,  0.5,   0.7,   0.7],
    "##osa":        [ 0.1,  0.0,   0.0,   0.0],  # desinenza femminile — neutro
    "##oso":        [ 0.1,  0.0,   0.0,   0.0],
}


def init_embeddings(embedding_layer, vocab, prior_dict, d_model):
    """
    Sovrascrive le prime 4 dimensioni dell'embedding con il prior semantico
    per le parole che lo hanno definito. Le altre dimensioni restano random.
    """
    with torch.no_grad():
        for word, values in prior_dict.items():
            if word in vocab:
                idx = vocab[word]
                embedding_layer.weight[idx, :4] = torch.tensor(values)


# ══════════════════════════════════════════════════════════════════════════════
# 4. MODELLO (identico a v1, solo più pulito)
# ══════════════════════════════════════════════════════════════════════════════

class SelfAttentionHead(nn.Module):
    def __init__(self, d_model, d_k, d_v):
        super().__init__()
        self.d_k = d_k
        self.W_Q = nn.Linear(d_model, d_k, bias=False)
        self.W_K = nn.Linear(d_model, d_k, bias=False)
        self.W_V = nn.Linear(d_model, d_v, bias=False)

    def forward(self, x, mask=None):
        Q = self.W_Q(x)
        K = self.W_K(x)
        V = self.W_V(x)
        scores = torch.bmm(Q, K.transpose(1, 2)) / math.sqrt(self.d_k)
        if mask is not None:
            scores = scores.masked_fill(mask == 0, float('-inf'))
        attn = F.softmax(scores, dim=-1)
        return torch.bmm(attn, V), attn


class MiniTransformer(nn.Module):
    def __init__(self, vocab_size, d_model=16, d_k=8, d_v=8, n_classes=2):
        super().__init__()
        self.embedding  = nn.Embedding(vocab_size, d_model, padding_idx=PAD_IDX)
        self.attention  = SelfAttentionHead(d_model, d_k, d_v)
        self.classifier = nn.Linear(d_v, n_classes)
        # applica il prior semantico dopo l'init random
        init_embeddings(self.embedding, vocab, SEMANTIC_PRIOR, d_model)

    def forward(self, x):
        pad_mask = (x != PAD_IDX).unsqueeze(1)
        emb = self.embedding(x)
        out, attn = self.attention(emb, pad_mask)
        lengths = (x != PAD_IDX).sum(dim=1, keepdim=True).unsqueeze(-1).float()
        mask    = (x != PAD_IDX).unsqueeze(-1).float()
        pooled  = (out * mask).sum(dim=1) / lengths.squeeze(-1)
        return self.classifier(pooled), attn


# ══════════════════════════════════════════════════════════════════════════════
# 5. TRAINING
# ══════════════════════════════════════════════════════════════════════════════

torch.manual_seed(42)
model     = MiniTransformer(VOCAB_SIZE)
optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
loss_fn   = nn.CrossEntropyLoss()

print("Training...\n")
for epoch in range(400):
    model.train()
    logits, _ = model(X)
    loss = loss_fn(logits, y)
    optimizer.zero_grad()
    loss.backward()
    optimizer.step()
    if (epoch + 1) % 100 == 0:
        preds = logits.argmax(dim=1)
        acc   = (preds == y).float().mean().item()
        print(f"  Epoch {epoch+1:3d} | loss: {loss.item():.4f} | acc: {acc:.0%}")

# ══════════════════════════════════════════════════════════════════════════════
# 6. INFERENZA
# ══════════════════════════════════════════════════════════════════════════════

label_str = {0: "negativo", 1: "positivo"}

frasi_test = [
    "il gatto è triste",        # v1 sbagliava questo
    "lezione meravigliosa",     # subword: meravigli + ##osa
    "lezione meraviglioso",     # prefisso condiviso, suffisso diverso
    "che bella lezione",
    "odio questa lezione",
    "amo questa lezione",
    "giornata meravigliosa",
    "giornata terribile",
    "sono contentissima oggi",  # parola nuova — vediamo come la scompone
]

print("\n─── Test ──────────────────────────────────────────────────────────────\n")
model.eval()
with torch.no_grad():
    for frase in frasi_test:
        ids, subwords = tokenize_frase(frase, vocab)
        x_t = torch.tensor([ids])
        logits, attn = model(x_t)
        prob = F.softmax(logits, dim=1)[0]
        pred = logits.argmax(dim=1).item()

        n = len(subwords)
        print(f"  \"{frase}\"")
        print(f"  → subwords: {subwords}")
        print(f"  → {label_str[pred]}  (P+={prob[1]:.2f}  P-={prob[0]:.2f})")

        # matrice attenzione sui subword reali
        w = attn[0, :n, :n]
        header = "".join(f"{s:>12}" for s in subwords)
        print(f"  {'':>14}{header}")
        for i, sw in enumerate(subwords):
            row = "  ".join(f"{w[i,j].item():.2f}" for j in range(n))
            print(f"  {sw:>14}: {row}")
        print()

# ══════════════════════════════════════════════════════════════════════════════
# 7. ISPEZIONE DEL PRIOR SEMANTICO
# ══════════════════════════════════════════════════════════════════════════════

print("─── Embedding: prime 4 dim (valenza, intensità, certezza, sogg) ───────\n")
parole_da_mostrare = [
    "meraviglioso", "meravigliosa", "meravigli",
    "terribile", "bella", "brutta", "amo", "odio",
    "felice", "triste", "##osa", "##oso"
]
with torch.no_grad():
    print(f"  {'parola':>16}  val    int    cert   sogg")
    print(f"  {'─'*50}")
    for p in parole_da_mostrare:
        if p in vocab:
            e = model.embedding.weight[vocab[p], :4]
            dims = "  ".join(f"{v.item():+.3f}" for v in e)
            marker = " ← subword" if p.startswith("##") or (p == "meravigli") else ""
            print(f"  {p:>16}: {dims}{marker}")