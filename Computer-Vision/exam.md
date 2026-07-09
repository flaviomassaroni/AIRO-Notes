---

# Computer Vision: Raccolta Domande d'Esame Svolte 

---

## 1. Convoluzione Manuale e Padding (Capitolo 1)

### Esercizio d'Esame:
> Data un'immagine $Im$ di dimensione $4 \times 4$ e un filtro $f_1$ $3 \times 3$, mostrare i passaggi intermedi e l'immagine risultante $g$ applicando l'operatore di convoluzione alle coordinate $(3,3)$ e $(2,4)$ con zero padding.

### Risposta da 30L:

#### **Passaggi Intermedi Teorici:**
*   **Zero Padding:** Si aggiunge una cornice di pixel con valore $0$ attorno all'immagine di input per consentire al kernel di essere centrato anche sui pixel di bordo senza ridurre la risoluzione dell'output.
*   **Kernel Flipping:** Per definizione formale di convoluzione, il kernel deve essere ruotato di $180^\circ$ (ribaltato sia in orizzontale che in verticale) prima dello scorrimento.
*   **Prodotto Element-wise:** Si sovrappone il centro del kernel flippato sul pixel d'interesse, si esegue la moltiplicazione elemento per elemento delle celle sovrapposte e si sommano i risultati.

#### **Keywords per l'esame:**
*   `Zero-padding` (conservazione della risoluzione spaziale / gestione dei bordi).
*   `Kernel Flip` (rotazione di 180° rispetto alla cross-correlation).
*   `Element-wise multiplication` (prodotto di Hadamard seguito da sommatoria).

---

## 2. Harris Corner Detector (Capitolo 4)

### Esercizio d'Esame:
> Elencare i passi principali dell'algoritmo di Harris. Discutere la robustezza (invarianza/equivarianza) del rilevatore rispetto a: rotazione, traslazione, shift di intensità, scaling di intensità e cambiamenti di scala geometrica.

###   Risposta da 30L:

```
[Immagine] ──(Sobel)──> [Ix, Iy] ──(Gauss)──> [Matrice H] ──> [Risposta R] ──(NMS)──> [Corners]
```

#### **Fasi dell'Algoritmo (Steps):**
1.  **Calcolo dei Gradienti Spaziali:** Calcolo delle derivate parziali prima dell'immagine ($I_x, I_y$) tramite filtri differenziali (es. operatore di Sobel).
2.  **Costruzione della Second Moment Matrix ($H$):** Per ciascun pixel, si calcola la matrice di struttura locale integrando i gradienti in un intorno definito da una finestra pesata (solitamente un filtro Gaussiano $w(x,y)$):
    $$H = \sum_{W} w(x,y) \begin{bmatrix} I_x^2 & I_x I_y \\ I_x I_y & I_y^2 \end{bmatrix}$$
3.  **Calcolo della Risposta di Harris ($R$):** Per evitare il calcolo esplicito e costoso degli autovalori ($\lambda_1, \lambda_2$), si usa la funzione di risposta basata su determinante e traccia:
    $$R = \det(H) - k \cdot (\operatorname{trace}(H))^2$$
4.  **Sogliatura (Thresholding):** Filtrare la mappa di risposta $R$ eliminando i valori bassi per isolare i candidati più forti.
5.  **Soppressione dei Non-Massimi (Non-maximum suppression - NMS):** Isolare i picchi locali di risposta $R$ eliminando le rilevazioni ridondanti ravvicinate.

#### **Analisi della Robustezza:**
*   **Traslazione (Equivariante):** I gradienti si spostano solidalmente con l'immagine; i punti d'angolo vengono rilevati nelle nuove posizioni traslate.
*   **Rotazione (Invariante):** La rotazione dell'immagine ruota l'ellisse della matrice $H$ (i suoi autovettori), ma gli autovalori ($\lambda_1, \lambda_2$) rimangono identici. Di conseguenza, la risposta $R$ non cambia.
*   **Shift di Luminosità ($I' = I + b$) (Invariante):** L'operatore di derivazione (Sobel) annulla qualsiasi termine costante additivo $b$, lasciando i gradienti inalterati.
*   **Scaling di Contrasto ($I' = aI$) (Parzialmente Invariante):** Il gradiente viene scalato per $a$, la risposta $R$ viene scalata per $a^4$. Una soglia fissa potrebbe fallire, richiedendo una soglia adattiva o una normalizzazione preventiva.
*   **Scala Geometrica (NON Invariante):** Un angolo osservato a una scala molto ravvicinata (zoom) perde la sua caratteristica di discontinuità locale bidirezionale e viene interpretato come una regione piatta o un bordo rettilineo.

#### **Keywords per l'esame:**
*   `Second Moment Matrix / Structure Tensor` (riassunto della distribuzione locale dei gradienti).
*   `Eigenvalues` ($\lambda_1, \lambda_2$ grandi indicano variazione in tutte le direzioni).
*   `Scale dependence` (motivo dell'introduzione dello scale-space).

---

## 3. Derivate dell'Immagine, Bordi e Rumore (Capitolo 1 & 1.5)

### Esercizio d'Esame:
> Discutere il ruolo delle derivate nell'edge e corner detection: a) Significato di derivata prima e seconda. b) Uso del modulo e direzione del gradiente. c) Ruolo dei punti di zero-crossing. d) Sensibilità al rumore e mitigazione.

###   Risposta da 30L:

#### **a) Significato delle Derivate:**
*   **Derivata Prima:** Misura il tasso di variazione locale dell'intensità (pendenza del profilo). Indica la presenza di una transizione.
*   **Derivata Seconda:** Misura la variazione del gradiente (curvatura del profilo di intensità). Aiuta a localizzare l'esatta mezzeria della transizione.

#### **b) Modulo e Direzione del Gradiente:**
*   **Modulo ($||\nabla f||$):** Rappresenta la forza del bordo:
    $$\|\nabla f\| = \sqrt{I_x^2 + I_y^2}$$
*   **Direzione ($\theta$):** Indica la direzione di massima variazione di intensità, ed è matematicamente **ortogonale** all'andamento fisico del bordo:
    $$\theta = \operatorname{atan2}(I_y, I_x)$$

#### **c) Punti di Zero-Crossing:**
*   La derivata seconda (es. operatore Laplaciano $\nabla^2 I$) cambia segno in corrispondenza del punto di massimo gradiente.
*   Il passaggio per lo zero (**zero-crossing**) permette di localizzare il contorno con precisione millimetrica (1D), evitando le incertezze spaziali dei massimi larghi della derivata prima.

#### **d) Sensibilità al Rumore e Mitigazione:**
*   La derivata è intrinsecamente un **filtro passa-alto** che amplifica le variazioni ad alta frequenza (rumore termico, salt-and-pepper).
*   **Mitigazione:** Si applica un filtro di smoothing Gaussiano (filtro passa-basso) prima della derivazione. Grazie al teorema della convoluzione, l'operazione si compie in un unico passaggio convolvendo l'immagine con la derivata della Gaussiana (es. approccio Sobel o Difference of Gaussians - DoG).

#### **Keywords per l'esame:**
*   `Zero-crossing` (intersezione dello zero della derivata seconda).
*   `High-pass filter` (comportamento spettrale della derivata).
*   `Derivative of Gaussian` (fusione di smoothing e differenziazione).

---

## 4. Optical Flow e Aperture Problem (Capitolo 9 / 11)

### Esercizio d'Esame:
> Descrivere l'algoritmo di stima del flusso ottico di Lucas-Kanade. Spiegare l'Aperture Problem e indicare la direzione lungo la quale la stima risulta inaffidabile.

###   Risposta da 30L:

#### **L'algoritmo di Lucas-Kanade:**
*   **Assunzioni Fondamentali:**
    1.  *Brightness Constancy:* L'intensità di un punto non cambia nel tempo ($I(x,y,t) = I(x+u,y+v,t+1)$).
    2.  *Small Motion:* Lo spostamento tra frame adiacenti è piccolo (permette l'approssimazione lineare di Taylor).
    3.  *Spatial Coherence:* I pixel vicini si muovono insieme (stesso vettore di movimento).
*   **Formulazione:** L'equazione locale del flusso per un singolo pixel è sotto-determinata (1 equazione, 2 incognite $u, v$):
    $$I_x u + I_y v + I_t = 0$$
*   **Soluzione Spaziale:** LK considera una finestra locale $N \times N$, ottenendo un sistema sovradeterminato $A\mathbf{x} = \mathbf{b}$ con $N^2$ equazioni:
    $$A = \begin{bmatrix} I_x(p_1) & I_y(p_1) \\ \vdots & \vdots \\ I_x(p_n) & I_y(p_n) \end{bmatrix}, \quad \mathbf{x} = \begin{bmatrix} u \\ v \end{bmatrix}, \quad \mathbf{b} = -\begin{bmatrix} I_t(p_1) \\ \vdots \\ I_t(p_n) \end{bmatrix}$$
*   Risolvibile tramite minimizzazione dei minimi quadrati (Least Squares):
    $$\mathbf{x} = (A^T A)^{-1} A^T \mathbf{b}$$

#### **L'Aperture Problem:**
*   Se osserviamo il movimento attraverso una piccola finestra locale (apertura) contenente un bordo rettilineo omogeneo, non possiamo determinare lo spostamento reale dell'oggetto.
*   **Componente stimabile:** Solo la componente del moto **ortogonale al bordo** (normal flow).
*   **Componente ambigua:** La componente **tangenziale** (parallela al bordo) non produce variazioni locali nell'intensità del pixel, rendendo infinite le soluzioni possibili lungo la retta del gradiente.
*   **Risoluzione:** Per risolvere l'ambiguità occorre che la finestra contenga variazioni di gradiente in più direzioni (es. angoli, texture ricche), garantendo l'invertibilità della matrice $A^T A$ (entrambi gli autovalori devono essere grandi).

#### **Keywords per l'esame:**
*   `Normal flow` (flusso perpendicolare all'edge).
*   `Overdetermined system` (sistema risolvibile con pseudoinversa).
*   `Spatial coherence constraint` (assunzione di movimento uniforme nel vicinato).

---

## 5. Calibrazione della Camera (Capitolo 10)

### Esercizio d'Esame:
> Descrivere l'algoritmo di calibrazione di una camera. Indicare i dati di input, le quantità stimate e le equazioni fondamentali del processo.

###   Risposta da 30L:

```
[Punti 3D Scacchiera (Xw)] ──(Moltiplicazione per P)──> [Pixel 2D (u,v)] ──(SVD/Minimi Quadrati)──> [Matrice P 3x4] ──(Fattorizzazione RQ)──> [K] e [R|t]
```

#### **1. Dati di Input:**
*   Un set di corrispondenze note tra coordinate 3D del mondo reale ($\mathbf{X}_w$) appartenenti a un oggetto di calibrazione a geometria nota (scacchiera) e le rispettive coordinate pixel 2D ($\mathbf{u}$) misurate sul sensore.
*   Sono necessarie almeno **6 coppie di punti** (poiché la matrice di proiezione $P$ ha 11 gradi di libertà e ogni punto fornisce 2 equazioni indipendenti: $6 \times 2 = 12 \ge 11$).

#### **2. Quantità Stimate:**
*   La **Matrice di Proiezione Prospettica $P$** ($3 \times 4$), successivamente fattorizzata in:
    *   **Parametri Intrinseci (Matrice $K$ $3 \times 3$):** Lunghezze focali in pixel ($f_x, f_y$), punto principale ($o_x, o_y$).
    *   **Parametri Estrinseci (Matrice $[R|t]$ $3 \times 4$):** Rotazione $R$ ($3 \times 3$) e traslazione $t$ ($3 \times 1$) che definiscono la posa della camera rispetto al mondo.

#### **3. Equazioni Fondamentali:**
*   La proiezione in coordinate omogenee è definita da:
    $$\mathbf{u} \sim P \mathbf{X}_w \implies \begin{bmatrix} \tilde{u} \\ \tilde{v} \\ \tilde{w} \end{bmatrix} = K [R | t] \begin{bmatrix} x_w \\ y_w \\ z_w \\ 1 \end{bmatrix}$$
*   Espandendo il prodotto ed eliminando il fattore di scala omogeneo $\tilde{w}$ tramite divisione ($u = \tilde{u}/\tilde{w}$, $v = \tilde{v}/\tilde{w}$), si ottengono due equazioni lineari per ogni punto.
*   Si raccoglie il sistema omogeneo $A\mathbf{p} = 0$, dove $\mathbf{p}$ contiene i 12 elementi di $P$.
*   Si risolve minimizzando la norma $\|A\mathbf{p}\|^2$ sotto il vincolo $\|\mathbf{p}\|=1$ tramite **SVD** (prendendo l'autovettore associato all'autovalore più piccolo di $A^T A$).
*   Si scompone la parte $3 \times 3$ di $P$ tramite la **fattorizzazione RQ** per isolare $K$ (triangolare superiore) e $R$ (ortogonale).

#### **Keywords per l'esame:**
*   `Direct Linear Transformation (DLT)` (il nome formale del sistema omogeneo usato).
*   `RQ Factorization` (decomposizione della sottomatrice per separare intrinseci ed estrinseci).
*   `Scale ambiguity` (la proiezione definita a meno di un fattore di scala).

---

## 6. Geometria Epipolare (Capitolo 11)

### Esercizio d'Esame:
> Spiegare il concetto di geometria epipolare tra due viste. Definire il significato geometrico di linee epipolari ed epipoli. Spiegare perché la matrice fondamentale ha rango 2 e come riduce lo spazio di ricerca nello stereo matching.

###   Risposta da 30L:

```
[Camera Center C1] ──(Baseline)── [Camera Center C2]
       │                                 │
       └──> [Epipolo e]                  └──> [Epipolo e']
```

#### **a) Significato Geometrico:**
*   **Epipoli ($e, e'$):** Sono i punti di intersezione della **baseline** (la linea retta che congiunge i due centri ottici delle camere) con i rispettivi piani immagine. Fisicamente, l'epipolo $e'$ è la proiezione del centro ottico della camera 1 nell'immagine della camera 2, e viceversa.
*   **Linee Epipolari ($l, l'$):** Sono le linee generate dall'intersezione del **piano epipolare** (il piano passante per il punto 3D della scena $X$ e i due centri della camera) con i piani immagine. Tutte le linee epipolari in un'immagine convergono necessariamente nel rispettivo epipolo.

#### **b) Relazione tramite la Matrice Fondamentale ($F$):**
*   La matrice fondamentale $F$ ($3 \times 3$) mappa un punto $p$ della prima immagine nella sua corrispondente linea epipolare $l'$ nella seconda immagine:
    $$l' = Fp$$
*   Qualsiasi coppia di punti corrispondenti ($p, p'$) deve rispettare il vincolo epipolare:
    $$p'^T F p = 0$$

#### **c) Perché la Matrice Fondamentale ha Rango 2:**
*   La matrice fondamentale si scrive teoricamente come $F = K'^{-T} R [t]_\times K^{-1}$.
*   Il termine centrale $[t]_\times$ è una matrice antisimmetrica ricavata dal prodotto vettoriale della traslazione, ed ha intrinsecamente rango 2 (il suo nucleo è la direzione di traslazione $t$).
*   Poiché il rango del prodotto di matrici è limitato dal rango minimo dei fattori, la matrice $F$ eredita il rango 2. Geometricamente, questo vincolo ($\det(F) = 0$) garantisce che tutte le linee epipolari si intersechino in un unico punto singolare (l'epipolo), evitando configurazioni geometricamente impossibili.

#### **d) Riduzione dello Spazio di Ricerca:**
*   Senza geometria epipolare, per trovare il corrispondente di un pixel $p$ dovremmo scansionare l'intera immagine bidimensionale di arrivo (ricerca 2D costosa).
*   Il vincolo epipolare garantisce che il punto corrispondente $p'$ giaccia obbligatoriamente sulla linea epipolare $l'$. La ricerca si riduce così ad una scansione monodimensionale (ricerca 1D) lungo la linea, abbattendo drasticamente il costo computazionale e limitando i falsi accoppiamenti.

#### **Keywords per l'esame:**
*   `Baseline` (la congiungente dei centri ottici).
*   `Epipolar Constraint` ($p'^T F p = 0$).
*   `Rank 2 constraint` (condizione necessaria per la convergenza delle linee nell'epipolo, imposta tramite SVD azzerando il valore singolare più piccolo).

---

## 7. Riconoscimento in Ambienti Esterni e Background Modeling (Esercizio Pratico - Cap. 1 & 9)

### Esercizio d'Esame:
> Progettare un sistema tradizionale di video-sorveglianza outdoor per rilevare oggetti in movimento sotto forti cambiamenti di luce (nuvole, sole, ombre). Descrivere: a) Preprocessing. b) Modellazione del background. c) Distinguere i movimenti reali dalle ombre.

###   Risposta da 30L:

#### **a) Fasi di Preprocessing:**
*   **Filtro Gaussiano (Smoothing):** Applicazione di un blur spaziale per sopprimere il rumore ad alta frequenza del sensore video.
*   **CLAHE (Contrast Limited Adaptive Histogram Equalization):** Utilizzato per normalizzare localmente i contrasti, limitando l'amplificazione del rumore nelle aree a bassa texture ed evitando che passaggi improvvisi di nuvole oscurino intere zone.
*   **Conversione di Spazio Colore:** Conversione del segnale RGB a uno spazio che separi la luminanza dalla cromaticità (es. **YCbCr** o **Lab**).

#### **b) Modellazione del Background (Background Subtraction):**
*   Uso di una **Running Average (Media Mobile Temporale)** adattiva per aggiornare lo sfondo $B$ nel tempo:
    $$B_{t+1} = \alpha I_t + (1-\alpha) B_t$$
    *   Dove $\alpha$ è il *learning rate* (tasso di apprendimento). Un valore di $\alpha$ basso consente allo sfondo di assorbire i lenti cambiamenti di luce naturale (lo spostamento del sole) senza includere oggetti che si muovono velocemente.
*   La maschera di movimento viene generata tramite sogliatura della differenza assoluta: $|I_t - B_t| > \text{threshold}$.

#### **c) Gestione delle Ombre e Variazioni Luminose:**
*   **Invarianza Cromatica:** Le ombre riducono l'intensità luminosa (canale $Y$) ma non alterano significativamente i rapporti cromatici (canali $Cb, Cr$). Se in una regione di movimento cambia solo il canale di luminanza ma la cromaticità rimane coerente con il background, la regione viene classificata come ombra e scartata.
*   **Coerenza dei Gradienti (Sobel):** Un'ombra proiettata altera la luminosità di una texture, ma non ne cancella la struttura geometrica sottostante. Calcolando la somiglianza dei gradienti spaziali (tramite Sobel) tra il frame corrente e il modello di background, se le direzioni dei gradienti coincidono, si assume la presenza di un'ombra e non di un oggetto solido.

#### **Keywords per l'esame:**
*   `Chromaticity vs Luminance` (separazione dell'informazione colore dall'intensità).
*   `Running Average` (aggiornamento dinamico del background).
*   `Shadow suppression via gradient consistency` (uso dei gradienti per preservare la struttura geometrica sottostante).

## 8. Segmentazione Video: Istogrammi Classici vs. CNN Embeddings (Capitolo 8 & 9.5)

### Esercizio d'Esame:
> Confrontare due approcci per segmentare un video in segmenti visivamente simili:
> *   **Approccio A:** Istogrammi di intensità dei pixel + distanza Euclidea + K-Means.
> *   **Approccio B:** Frame embeddings estratti da una CNN profonda + similarità del coseno + metodo di clustering.
> 
> Confrontare i metodi in termini di robustezza, efficienza computazionale e scalabilità, discutendo gli scenari in cui l'approccio A supera il B (e viceversa) e come la scelta delle feature influenza la qualità della segmentazione.

###   Risposta da 30L:

#### **Analisi Comparativa:**
*   **Robustezza (Robustness):**
    *   **Approccio A (Istogrammi):** **Molto bassa**. Gli istogrammi scartano completamente il layout spaziale (*spatial layout*). Due immagini con la stessa distribuzione cromatica ma soggetti totalmente diversi (es. un prato verde con una palla bianca vs. una parete verde con un piatto bianco) avranno lo stesso istogramma. Inoltre, è estremamente sensibile ai cambi di luce globali.
    *   **Approccio B (CNN):** **Molto alta**. La CNN estrae caratteristiche semantiche di alto livello. Riconosce gli oggetti e la struttura della scena indipendentemente da variazioni di luce, contrasto o piccole traslazioni della camera.
*   **Efficienza Computazionale (Computational Efficiency):**
    *   **Approccio A:** **Estremamente efficiente**. Calcolare l'istogramma è un'operazione a costo lineare $O(N)$ rispetto ai pixel. La distanza Euclidea su vettori piccoli (es. 256 bin) è velocissima. Gira in tempo reale su qualsiasi CPU economica.
    *   **Approccio B:** **Costoso (Bottleneck)**. Richiede un *forward pass* della rete neurale profonda per ogni frame. Necessita di acceleratori hardware (GPU) e ha consumi energetici elevati.
*   **Scalabilità (Scalability):**
    *   **Approccio A:** Altamente scalabile su sistemi distribuiti o dispositivi edge a basso costo.
    *   **Approccio B:** Difficile da scalare senza infrastrutture dedicate o pesanti operazioni di ottimizzazione (es. quantizzazione del modello).

#### **Scenari d'Uso Ottimali:**
*   **Dove A supera B:** 
    *   Dispositivi edge con risorse di calcolo minime (es. droni leggeri, IoT).
    *   Rilevamento di transizioni nette e repentine (es. rilevamento di scene di "stacco" o passaggi a schermata nera nelle pubblicità).
    *   Assenza totale di dataset di addestramento o necessità di avvio istantaneo senza setup.
*   **Dove B supera A:**
    *   Scene dinamiche con inquadrature in movimento (pan, tilt, zoom) in cui i pixel cambiano continuamente ma la semantica della scena rimane la stessa.
    *   Video all'aperto soggetti a variazioni di luce naturale (es. passaggi di nuvole, transizione giorno/notte).

#### **Impatto sulla Qualità della Segmentazione:**
*   L'**Approccio A** produce una **segmentazione fotometrica/cromatica** (raggruppa i frame per colore e luminosità globale).
*   L'**Approccio B** produce una **segmentazione semantica** (raggruppa i frame in base al contesto e a *cosa accade* effettivamente nella scena).

#### **Keywords per l'esame:**
*   `Spatial layout loss` (la perdita della geometria spaziale negli istogrammi).
*   `Semantic vs Photometric gap` (la differenza nel tipo di informazione estratta).
*   `Forward pass overhead` (il costo di computazione delle CNN).

---

## 9. Influenza del Padding sull'Edge Detection ai Bordi (Capitolo 1 & 2.10)

### Esercizio d'Esame:
> Spiegare il concetto di padding nel contesto del filtraggio convoluzionale. In che modo la scelta del metodo di padding influenza l'estrazione dei contorni (edge detection), specialmente in prossimità dei bordi dell'immagine?

###   Risposta da 30L:

#### **Il Concetto di Padding:**
Il padding consiste nell'aggiungere una cornice di pixel fittizi attorno all'immagine di input prima di applicare la convoluzione. Ha due scopi principali:
1.  Permettere al centro di un kernel di dimensione $K \times K$ di posizionarsi sopra i pixel più esterni dell'immagine originale.
2.  Evitare la riduzione progressiva della dimensione spaziale dell'immagine dopo ogni livello di convoluzione.

```
Zero Padding:       [0] [0] [0] ────> Crea un forte gradino artificiale con i pixel chiari.
Mirror Padding:     [200] [180] ───> Mantiene la naturalezza dei gradienti locali.
```

#### **Influenza sull'Edge Detection:**
I filtri di edge detection (es. Sobel) si basano sul calcolo di **derivate spaziali** (differenze locali di intensità). La scelta del padding altera radicalmente questo calcolo lungo la linea di confine:

1.  **Zero Padding (La scelta peggiore per i bordi):**
    *   **Meccanismo:** Circonda l'immagine con pixel di valore `0`.
    *   **Problema:** Se l'immagine reale ha pixel chiari sul bordo (es. valore `200`), si crea una discontinuità artificiale netta ($200 \to 0$).
    *   **Effetto visivo:** L'operatore derivativo rileva questo gradino artificiale come un bordo reale intensissimo, generando vistosi **falsi contorni (spurious edge artifacts)** lungo tutto il perimetro dell'immagine di output.
2.  **Clamp / Replicate Padding:**
    *   **Meccanismo:** Copia il valore dell'ultimo pixel di bordo verso l'esterno.
    *   **Effetto:** Il gradiente calcolato sul bordo diventa nullo ($I(x) - I(x) = 0$). Questo **sopprime i bordi artificiali**, ma ha il difetto di non poter rilevare eventuali transizioni reali che attraversano il confine dell'immagine.
3.  **Mirror / Reflect Padding (La scelta ottimale):**
    *   **Meccanismo:** Riflette i pixel interni specularmente all'esterno del bordo.
    *   **Effetto:** Preserva la continuità della texture e dei gradienti locali dell'immagine senza introdurre bruschi salti di valore. È la strategia migliore perché **elimina gli artefatti di bordo** mantenendo coerente il calcolo delle derivate spaziali.

#### **Keywords per l'esame:**
*   `Spurious edge artifacts` (i contorni fantasma generati dal gradino dello zero-padding).
*   `Artificial step-discontinuity` (la natura del problema dello zero-padding).
*   `Gradient and texture statistics preservation` (il vantaggio del mirroring).

---

## 10. Lucas-Kanade e la Geometria dell'Aperture Problem (Capitolo 9 & 11)

### Esercizio d'Esame:
> Descrivere un metodo per stimare l'optical flow. Cos'è l'aperture problem e come influenza la stima del moto? In quale direzione l'optical flow risulta matematicamente ambiguo?

###   Risposta da 30L:

#### **1. Metodo di Stima: Lucas-Kanade**
L'algoritmo di Lucas-Kanade è un metodo locale basato su tre assunzioni:
1.  **Costanza di Luminosità:** L'intensità di un punto non cambia tra frame consecutivi: $I_x u + I_y v + I_t = 0$.
2.  **Piccolo Movimento:** Consente l'approssimazione del primo ordine di Taylor.
3.  **Coerenza Spaziale:** I pixel vicini dentro una finestra $N \times N$ condividono lo stesso movimento $(u, v)$.

Questo ci permette di raggruppare le $N^2$ equazioni dei singoli pixel in un sistema lineare sovrateteminato $A\mathbf{x} = \mathbf{b}$, risolvibile con il metodo dei minimi quadrati:
$$\mathbf{x} = \begin{bmatrix} u \\ v \end{bmatrix} = (A^T A)^{-1} A^T \mathbf{b}$$

#### **2. L'Aperture Problem (Analisi Algebrica e Geometrica):**
L'**Aperture Problem** si verifica quando guardiamo il movimento attraverso una finestra locale (apertura) che contiene solo un bordo rettilineo omogeneo.

*   **Comportamento Geometrico:** Possiamo rilevare solo la componente del movimento perpendicolare all'orientamento del bordo (**normal flow**). Qualsiasi movimento parallelo (tangente) al bordo non produce variazioni nell'intensità dei pixel della finestra ed è quindi invisibile.
*   **Comportamento Algebrico (Il collegamento da 30L):** 
    La matrice di sistema $A^T A$ corrisponde esattamente alla **Second Moment Matrix** (la stessa usata in Harris per trovare gli angoli):
    $$A^T A = \begin{bmatrix} \sum I_x^2 & \sum I_x I_y \\ \sum I_x I_y & \sum I_y^2 \end{bmatrix}$$
    In presenza di un bordo rettilineo, i gradienti locali puntano tutti nella stessa direzione. Di conseguenza, la matrice $A^T A$ ha rango pari a 1 (un autovettore nullo o piccolissimo) e **non è invertibile** (il sistema è ill-conditioned). 
*   **Direzione di Ambiguità:** Il moto è matematicamente ambiguo lungo la **direzione tangenziale (parallela) al bordo**. Per superare questo limite, la finestra deve includere angoli o texture ricche capaci di garantire che entrambi gli autovalori di $A^T A$ siano grandi (garantendo l'invertibilità del sistema).

#### **Keywords per l'esame:**
*   `Normal Flow` (il flusso ortogonale rilevabile).
*   `Singular Second Moment Matrix` (la rappresentazione algebrica dell'ambiguità).
*   `Underdetermined system` (il problema di avere 1 equazione per 2 incognite localmente).

---

## 11. Relazione tra Matrice Fondamentale $F$ ed Essenziale $E$ e la loro Stima (Capitolo 11)

### Esercizio d'Esame:
> a) Qual è la relazione tra la matrice fondamentale $F$ e la matrice essenziale $E$? Spiegare la derivazione matematica di una dall'altra.
> b) Descrivere come si stima la matrice fondamentale $F$ partendo da coppie di punti corrispondenti. Quali metodi si usano per renderla geometricamente coerente e robusta?

###   Risposta da 30L:

#### **a) Relazione e Derivazione:**
La matrice essenziale $E$ lavora nel sistema di **coordinate ideali (normalizzate)** delle camere, mentre la matrice fondamentale $F$ lavora direttamente nello spazio dei **pixel**.

Siano $\mathbf{p}$ e $\mathbf{p}'$ i punti espressi in pixel, e $\mathbf{x}$ e $\mathbf{x}'$ i punti espressi in coordinate normalizzate. Le matrici intrinseche delle camere $K$ e $K'$ legano i due spazi:
$$\mathbf{p} = K\mathbf{x} \implies \mathbf{x} = K^{-1}\mathbf{p}$$
$$\mathbf{p}' = K'\mathbf{x}' \implies \mathbf{x}' = K'^{-1}\mathbf{p}'$$

Partendo dal vincolo epipolare espresso tramite la matrice essenziale:
$$\mathbf{x}'^T E \mathbf{x} = 0$$

Sostituiamo le coordinate pixel:
$$(K'^{-1}\mathbf{p}')^T E (K^{-1}\mathbf{p}) = 0$$

Espandendo la trasposta del prodotto:
$$\mathbf{p}'^T \underbrace{(K'^{-T} E K^{-1})}_{F} \mathbf{p} = 0$$

Otteniamo così la definizione teorica della Matrice Fondamentale $F$:
$$F = K'^{-T} E K^{-1}$$

---

#### **b) Stima di $F$: Il metodo ad 8 Punti Normalizzato (Normalized 8-Point Algorithm)**
Per stimare $F$ da immagini non calibrate, si usa la corrispondenza dei pixel:

1.  **Normalizzazione dei punti (Cruciale per la stabilità):**
    Le coordinate dei pixel (spesso nell'ordine delle migliaia) creano instabilità numerica nella matrice dei dati $A$ (alcune colonne valgono $10^6$ mentre altre valgono $1$). 
    Si applicano due matrici di trasformazione $T$ e $T'$ per:
    *   Traslare i punti in modo che il centroide sia nell'origine $(0,0)$.
    *   Scalare le coordinate affinché la distanza media dall'origine sia $\sqrt{2}$.
2.  **Risoluzione del sistema lineare:**
    Utilizzando almeno 8 match corretti, si imposta il sistema omogeneo $Ah = 0$ (dove $h$ contiene i 9 elementi di $F$). Si risolve con la **SVD (Singular Value Decomposition)** prendendo l'autovettore associato al valore singolare più piccolo di $A^T A$.
3.  **Il Vincolo di Rango 2 (Singularity Constraint):**
    A causa del rumore, la matrice $\hat{F}$ così calcolata ha rango pieno (Rango 3). Geometricamente, $F$ **deve avere Rango 2** affinché le linee epipolari si incontrino in un epipolo comune ($\det(F)=0$).
    *   Si esegue la SVD sulla stima iniziale: $\hat{F} = U \Sigma V^T$, dove $\Sigma = \operatorname{diag}(\sigma_1, \sigma_2, \sigma_3)$.
    *   Si forza il rango 2 azzerando il valore singolare più piccolo: $\Sigma' = \operatorname{diag}(\sigma_1, \sigma_2, 0)$.
    *   Si ricompone la matrice: $F = U \Sigma' V^T$.
4.  **Denormalizzazione:**
    Si riporta la matrice nello spazio pixel originale: $F_{final} = T'^T F T$.
*   **Robustezza:** Per proteggere la stima dagli accoppiamenti errati (outliers) generati da SIFT su strutture ripetitive, l'intero algoritmo a 8 punti viene racchiuso in un ciclo **RANSAC**.

#### **Keywords per l'esame:**
*   `Normalized camera coordinates` (il dominio di lavoro di $E$).
*   `Numerical ill-conditioning` (il problema di stima dovuto alle scale sballate dei pixel).
*   `Singular value zeroing / Singularity constraint` (la forzatura matematica del Rango 2).


## 12. Il Filtro di Sobel vs. Canny Edge Detector (Capitolo 1.5)

### Esercizio d'Esame:
> Descrivere l'operatore di Sobel per l'edge detection. In cosa differisce dal Canny edge detector?

### Risposta da 30L:

#### **1. L'Operatore di Sobel (Descrizione):**
Il filtro di Sobel è un operatore differenziale di primo ordine utilizzato per approssimare il gradiente spaziale dell'immagine ($I_x, I_y$).
*   **Separabilità:** È un filtro separabile (rango 1), il che significa che una convoluzione 2D può essere calcolata come due convoluzioni 1D (una di smoothing e una di derivata), riducendo la complessità computazionale a $O(2LMN)$.
*   **Struttura (Kernel orizzontale $S_x$):** Combina una derivata di tipo *central difference* lungo un asse con uno smoothing triangolare/Gaussiano lungo l'altro asse per mitigare il rumore ad alta frequenza:
    $$S_x = \begin{bmatrix} -1 & 0 & 1 \\ -2 & 0 & 2 \\ -1 & 0 & 1 \end{bmatrix} = \underbrace{\begin{bmatrix} 1 \\ 2 \\ 1 \end{bmatrix}}_{\text{Blur 1D}} * \underbrace{\begin{bmatrix} -1 & 0 & 1 \end{bmatrix}}_{\text{Derivative 1D}}$$
*   **Output:** Produce una mappa a toni di grigio dell'intensità del gradiente. Se applicassimo una soglia fissa a questa mappa per ottenere un'immagine binaria, otterremmo **bordi molto spessi, rumorosi e frastagliati**.

---

#### **2. Canny Edge Detector: Le Differenze Fondamentali**
Canny non è un semplice filtro, ma una **pipeline multi-stadio** progettata per soddisfare tre criteri di ottimalità (Good Detection, Good Localization, Single Response). 

La differenza risiede in ciò che accade **dopo** aver calcolato il gradiente (fase in cui Canny può effettivamente usare Sobel):

| Caratteristica | Sobel Filter | Canny Edge Detector |
| :--- | :--- | :--- |
| **Tipo di Approccio** | Operatore differenziale locale (1 step). | Pipeline euristica multi-stadio (4 step). |
| **Spessore dei contorni** | Bordi **spessi** (larghi diversi pixel). | Bordi **sottili** (spessi esattamente 1 pixel). |
| **Sensibilità al rumore** | Moderata (ha un piccolo blur integrato). | Bassissima (grazie al blur Gaussiano e all'isteresi). |
| **Continuità del contorno** | Scarsa (soglie fisse creano linee interrotte). | Eccellente (l'isteresi connette i pixel deboli). |

---

#### **I 4 Step della Pipeline di Canny (Da citare sempre):**
1.  **Gaussian Smoothing:** Sfocatura dell'immagine per rimuovere il rumore ad alta frequenza.
2.  **Gradient Computation:** Calcolo di magnitudo e direzione del gradiente (spesso usando Sobel).
3.  **Non-Maximum Suppression (NMS) [Differenza Chiave 1]:** Per ogni pixel, l'algoritmo controlla se la magnitudo del gradiente è un massimo locale lungo la direzione del gradiente stesso. Se non lo è, viene azzerata. Questo step **assottiglia i bordi fino a renderli larghi un solo pixel** (Thinning).
4.  **Hysteresis Thresholding [Differenza Chiave 2]:** Uso di due soglie (alta $T_H$ e bassa $T_L$) per evitare la frammentazione dei contorni:
    *   I pixel sopra $T_H$ sono contorni forti (conservati).
    *   I pixel sotto $T_L$ sono scartati.
    *   I pixel compresi tra $T_H$ e $T_L$ sono conservati **solo se sono connessi spazialmente** a un pixel forte.

---

#### **Keywords per l'esame:**
*   `Separable filter` (proprietà computazionale di Sobel).
*   `Non-Maximum Suppression (NMS)` (step di assottigliamento spaziale in Canny).
*   `Hysteresis Thresholding / Dual thresholding` (connessione e pulizia dei contorni deboli).
*   `Single response criterion` (garanzia di avere un solo bordo per ogni transizione fisica).


## 13. Feature Matching e Stima della Matrice di Omografia tramite RANSAC (Capitolo 7.4 & 8.11)

### Esercizio d'Esame:
> Spiegare il concetto di feature matching e in che modo l'algoritmo RANSAC (Random Sample Consensus) può essere utilizzato in combinazione con il feature matching per migliorare l'accuratezza della stima di un'omografia tra due immagini.

### Risposta da 30L:

```
[Descrittori SIFT/ORB] ──> [BFMatcher + Lowe's Ratio] ──> [Match candidati (Inlier + Outlier)]
                                                                    │
┌───────────────────────── [RANSAC Loop] <──────────────────────────┘
│  1. Campiona casualmente s=4 punti
│  2. Calcola candidata H
│  3. Conta inlier usando dist(p', H*p) < epsilon
│  4. Ripete N volte
└─────────────────────────> [Set di Inlier più grande] ──> [Least Squares su tutti gli inlier] ──> [H finale]
```

#### **1. Feature Matching e Lowe's Ratio Test**
Il feature matching consiste nell'associare a un punto di interesse (keypoint) nell'immagine 1 il suo punto corrispondente nell'immagine 2, confrontando i rispettivi vettori descrittori (es. SIFT, ORB).
*   **Lowe's Ratio Test (Filtro di ambiguità):** Invece di accettare semplicemente il match più vicino (Nearest Neighbor), si calcola il rapporto tra la distanza del miglior match ($f_2$) e quella del secondo miglior match ($f'_2$):
    $$\rho = \frac{\|f_1 - f_2\|}{\|f_1 - f'_2\|} < \text{threshold} \quad (\text{tipicamente } 0.7 \text{ o } 0.8)$$
*   Se il rapporto supera la soglia, significa che il punto è **ambiguo** (es. fa parte di un pattern ripetitivo come finestre o mattoni) e il match viene scartato a priori.

---

#### **2. Il Problema dei Minimi Quadrati (Least Squares) puri**
Una volta ottenuto l'elenco dei match, dobbiamo stimare la matrice di omografia $H$ (3x3).
*   Se usassimo direttamente il metodo dei minimi quadrati su tutti i match, la stima verrebbe completamente distorta. I minimi quadrati tentano di mediare l'errore globale; di conseguenza, anche una minima percentuale di match errati (outliers) avrebbe un peso quadratico tale da "trascinare" la matrice $H$ lontano dalla corretta configurazione geometrica.

---

#### **3. RANSAC: Algoritmo di Consenso Robusto**
RANSAC è un algoritmo iterativo probabilistico che isola il set di corrispondenze corrette (**inliers**) eliminando i match errati (**outliers**):

1.  **Campionamento Minimo ($s$):** Ad ogni iterazione, seleziona casualmente il numero minimo di punti necessari per calcolare il modello. Per l'omografia, questo parametro è **$s = 4$** punti.
2.  **Stima del Modello:** Calcola la matrice candidata $H$ usando solo i 4 punti pescati.
3.  **Calcolo del Consenso (Consensus):** Applica la matrice $H$ a tutti gli altri punti della prima immagine e calcola la distanza di riproiezione geometrica (Symmetric Transfer Error):
    $$\operatorname{dist}(p'_i, H p_i) < \epsilon$$
    Tutti i punti che cadono entro la soglia di tolleranza $\epsilon$ (es. 3-5 pixel) sono dichiarati **inliers** (consenso).
4.  **Selezione e Ripetizione:** Il ciclo si ripete per un numero $N$ di iterazioni. Viene memorizzata la matrice $H$ che ha generato il più grande sottoinsieme di inliers.
5.  **Rafforzamento Finale (Least Squares):** Una volta trovato il set di inliers definitivo, la matrice $H_{final}$ viene ricalcolata usando **tutti** i punti del set di inliers tramite una regressione lineare ai minimi quadrati (SVD), garantendo la massima precisione geometrica.

#### **La formula delle Iterazioni (Il tocco da lode):**
Il numero di iterazioni $N$ necessario per garantire con probabilità $p$ (es. 99%) di pescare almeno un campione privo di outlier dipende dal tasso stimato di outlier $e$:
$$N \ge \frac{\log(1 - p)}{\log(1 - (1 - e)^s)}$$

---

#### **Keywords per l'esame:**
*   `Lowe's Ratio Test` (test di unicità del matching).
*   `Reprojection distance / Symmetric transfer error` (la metrica di inlier per l'omografia).
*   `Consensus set` (il gruppo di inliers che supporta il modello).
*   `SVD refinement` (il calcolo finale dei minimi quadrati solo sugli inlier).

## 14. Geometria Epipolare: Matrice Fondamentale ed Epipoli (Capitolo 11.3 & 11.4)

### Esercizio d'Esame:
> a) Spiegare il concetto di matrice fondamentale $F$. Come si calcola e quali informazioni trasmette sulla relazione tra due immagini?
> b) Qual è il significato geometrico degli epipoli nelle due immagini? Come sono legati algebricamente alla matrice fondamentale?

### Risposta da 30L:

#### **a) La Matrice Fondamentale $F$:**
*   **Concetto:** La matrice fondamentale $F$ ($3 \times 3$, rango 2) è una generalizzazione della matrice essenziale $E$ per telecamere non calibrate ($K$ sconosciuto). Mappa direttamente i pixel di un'immagine nelle rispettive linee epipolari dell'altra:
    $$l' = Fp \quad \text{e} \quad l = F^T p'$$
*   **Derivazione:** Si ricava applicando le matrici intrinseche $K, K'$ alla matrice essenziale: $F = K'^{-T} E K^{-1}$.
*   **Quali informazioni trasmette (Significato geometrico/informativo):**
    *   Fornisce una **"Weak Calibration" (Calibrazione debole)** del sistema stereo.
    *   Descrive l'intera **geometria proiettiva intrinseca** della scena a due viste.
    *   Contiene l'informazione sulla posa relativa delle telecamere (rotazione $R$ e direzione di traslazione $t$) e sui parametri intrinseci ($K, K'$), ma tutto ridefinito a meno di una trasformazione proiettiva tridimensionale (non consente di ricostruire la profondità metrica senza conoscere $K$).

---

#### **Come si calcola (Normalized 8-Point Algorithm):**
1.  **Risoluzione del sistema lineare:** Si parte dal vincolo epipolare $p'^T F p = 0$. Con almeno 8 corrispondenze di punti, si imposta il sistema lineare omogeneo $Ah = 0$. Si risolve con la **SVD** trovando l'autovettore associato al più piccolo valore singolare di $A^T A$.
2.  **Normalizzazione (Hartley's preprocessing):** Per evitare l'instabilità numerica dovuta alle scale sballate delle coordinate dei pixel, i punti vengono preventivamente traslati (centroide sull'origine) e scalati (distanza media pari a $\sqrt{2}$).
3.  **Vincolo di Singolarità (Rank-2 Enforcement):** Poiché la matrice stimata $\hat{F}$ inizialmente ha rango 3, si forza il rango 2 azzerando il valore singolare più piccolo tramite una seconda SVD, garantendo la coerenza geometrica del sistema ($\det(F)=0$).

---

#### **b) Significato Geometrico e Algebrico degli Epipoli:**
*   **Significato Geometrico:** Gli epipoli $e$ ed $e'$ sono i punti di intersezione della baseline (la retta che unisce i centri ottici delle due camere $O$ e $O'$) con i due piani immagine. L'epipolo $e$ è la proiezione del centro della camera 2 sul piano immagine della camera 1 (e viceversa).
*   **Relazione Algebrica (Fondamentale per l'esame):**
    Poiché l'epipolo giace su tutte le linee epipolari, l'applicazione di $F$ all'epipolo deve annullare qualsiasi proiezione. Algebricamente, gli epipoli sono i **nuclei (null spaces)** della matrice fondamentale:
    $$F \mathbf{e} = 0$$
    $$F^T \mathbf{e}' = 0$$
    *   L'epipolo destro $\mathbf{e}'$ è l'autovettore sinistro di $F$ associato all'autovalore nullo.
    *   L'epipolo sinistro $\mathbf{e}$ è l'autovettore destro di $F$ associato all'autovalore nullo.

---

#### **Keywords per l'esame:**
*   `Weak Calibration` (calibrazione proiettiva senza informazioni metriche).
*   `Right and Left Null Space of F` (la definizione algebrica degli epipoli).
*   `Singularity constraint / determinant is zero` (condizione algebrica per far convergere le linee epipolari).

## 15. Progettazione di un Pipeline Tradizionale per la Rilevazione di Keyframes (Capitoli 1, 5, 9)

### Esercizio d'Esame:
> Proporre un metodo per rilevare i keyframe in una sequenza video utilizzando tecniche tradizionali (non-deep). Spiegare le feature da estrarre, come misurare l'importanza/unicità dei frame e i criteri di selezione, giustificando ogni passaggio. Il sistema deve rilevare sia cambi di scena che azioni locali (es. espressioni facciali, cambi di speaker, esplosioni).

### Risposta da 30L:

```
                  ┌──> Feature 1: Istogramma Colore (HSV) ──> Rileva Scene Cuts / Esplosioni
                  │
[Video Frames] ───┼──> Feature 2: Optical Flow (LK) ────────> Rileva Inizio Azioni / Movimento
                  │
                  └──> Feature 3: Edge Change Ratio (ECR) ──> Rileva Nuovi Oggetti / Speaker Switch
                                     │
                             [Soglie Adattive]
                                     │
                             [Keyframe Selezionato]
```

#### **1. Feature Estratte (Cosa estraiamo e perché):**
Per catturare sia i cambiamenti globali che quelli locali, estraiamo tre tipi di caratteristiche per ogni frame:

*   **Feature A: Istogramma di Colore in spazio HSV (Cambiamenti Globali):**
    *   *Perché:* Lo spazio HSV separa la tinta ($H$) dalla luminosità ($V$). Calcoliamo l'istogramma 2D dei canali $H$ e $S$.
    *   *Obiettivo:* Rilevare interruzioni nette di scena (scene cuts) ed eventi luminosi intensi (esplosioni, flash).
*   **Feature B: Magnitudo dell'Optical Flow (Inizio dell'Azione):**
    *   *Perché:* Calcoliamo il flusso ottico (es. metodo di Lucas-Kanade) tra frame consecutivi. Estraiamo la magnitudo media del movimento di tutti i vettori:
        $$M_{motion} = \frac{1}{N} \sum \sqrt{u^2 + v^2}$$
    *   *Obiettivo:* Rilevare il momento esatto in cui inizia un'azione (picco improvviso dell'accelerazione del movimento).
*   **Feature C: Edge Change Ratio - ECR (Nuovi Oggetti, Speaker Switch ed Espressioni):**
    *   *Perché:* Applichiamo il filtro di Canny per rilevare i bordi. L'ECR misura la percentuale di bordi che appaiono ($X_{in}$) o scompaiono ($X_{out}$) tra un frame e l'altro.
    *   *Obiettivo:* Se entra un nuovo oggetto o se cambia la persona inquadrata (speaker switch), la struttura dei bordi cambia radicalmente, anche se i colori globali rimangono simili.

---

#### **2. Misura dell'Importanza / Unicità (Come misuriamo il cambiamento):**
Per misurare la differenza tra il frame corrente $I_t$ e il frame precedente $I_{t-1}$:

1.  **Distanza degli Istogrammi:** Usiamo la **Chi-Square Distance ($\chi^2$)** (più discriminativa della distanza Euclidea, vedi Cap. 5.1.2) per confrontare gli istogrammi di colore $H_t$ e $H_{t-1}$.
2.  **Soglia di Movimento:** Monitoriamo la derivata temporale della magnitudo del flusso ottico:
    $$\Delta M = |M_t - M_{t-1}|$$
3.  **Tasso di Variazione dei Bordi:** Calcoliamo l'ECR:
    $$ECR = \max \left( \frac{X_{in}}{N_{edges}}, \frac{X_{out}}{N_{edges}} \right)$$

---

#### **3. Criteri di Selezione dei Keyframe:**
Un frame viene eletto come **Keyframe** se soddisfa una delle seguenti condizioni (soglie adattive calcolate sulla media locale del video):

*   **Criterio 1 (Scene Cut / Esplosione):** La distanza $\chi^2$ dell'istogramma supera una soglia critica.
*   **Criterio 2 (Inizio Azione):** Si registra un picco locale nell'accelerazione del movimento ($\Delta M > \text{threshold}$).
*   **Criterio 3 (Nuovo Oggetto / Speaker Switch):** L'ECR supera una soglia, indicando un cambiamento nella topologia strutturale della scena.
*   **Filtro di Ridondanza Temporale:** Per evitare di selezionare troppi keyframe vicini (es. durante un'esplosione che dura 20 frame), si impone un vincolo di distanza temporale minima (es. non più di un keyframe ogni 15-30 frame).

---

#### **Keywords per l'esame:**
*   `Multi-feature fusion` (integrazione di colore, movimento e struttura).
*   `Edge Change Ratio (ECR)` (misura di variazione strutturale dei contorni).
*   `Adaptive Thresholding` (soglie che si adattano al dinamismo del video).
*   `Temporal Redundancy Filtering` (evitare keyframe duplicati).