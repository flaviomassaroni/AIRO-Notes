import cv2

# Inizializza la webcam
cap = cv2.VideoCapture(0)
orb = cv2.ORB_create(nfeatures=500)
bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)

# Leggi il primo frame per inizializzare
ret, prev_frame = cap.read()
prev_gray = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY)
kp_prev, des_prev = orb.detectAndCompute(prev_gray, None)

print("Robot avviato. Muovi la telecamera per vedere le 'briciole di pane' (match)...")

while True:
    ret, frame = cap.read()
    if not ret: break
    
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    kp_curr, des_curr = orb.detectAndCompute(gray, None)
    
    # Matching tra frame attuale e precedente
    if des_prev is not None and des_curr is not None:
        matches = bf.match(des_prev, des_curr)
        # Ordiniamo per qualità
        matches = sorted(matches, key=lambda x: x.distance)
        
        # Disegna i match
        out_img = cv2.drawMatches(prev_gray, kp_prev, gray, kp_curr, matches[:30], None)
        cv2.imshow("Robot SLAM Sim - Match tra frame", out_img)
    
    # Aggiorna il frame precedente
    prev_gray = gray.copy()
    kp_prev, des_prev = kp_curr, des_curr
    
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()