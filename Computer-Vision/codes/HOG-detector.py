import cv2
import numpy as np

# Inizializza l'HOG descriptor standard di OpenCV per le persone
hog = cv2.HOGDescriptor()
hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())

cap = cv2.VideoCapture(0)

while True:
    ret, frame = cap.read()
    if not ret: break
    
    # HOG lavora meglio su immagini ridimensionate per velocità
    frame = cv2.resize(frame, (640, 480))
    
    # Rilevamento persone (qui HOG estrae le feature di forma)
    # hitThreshold: soglia di confidenza
    rects, weights = hog.detectMultiScale(frame, winStride=(8, 8), padding=(8, 8), scale=1.05)
    
    # Disegna i rettangoli trovati
    for (x, y, w, h) in rects:
        cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
        cv2.putText(frame, 'Persona', (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
        
    cv2.imshow("Robot che cerca persone con HOG", frame)
    
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()