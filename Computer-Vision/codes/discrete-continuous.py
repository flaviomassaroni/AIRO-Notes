import numpy as np
import matplotlib.pyplot as plt

def show_discrete_domain(image_path):
    """
    Mostra l'immagine nel dominio discreto.
    """
    image = plt.imread(image_path)
    plt.imshow(image)
    plt.title('Discrete Domain (Image)')
    plt.axis('off')
    plt.show()

def show_continuous_domain(image_path):
    """
    Mostra una rappresentazione continua dell'immagine come una mappa di intensità.
    Qui utilizziamo la griglia che mappa coordinate continue a valori discreti.
    """
    image = plt.imread(image_path)
    grey_img = np.mean(image, axis=2)  # convert to grayscale
    plt.imshow(grey_img, cmap='gray', interpolation='bicubic')
    plt.title('Continuous Domain (Grayscale Image)')
    plt.axis('off')
    plt.show()

# Specifica il percorso dell'immagine - esempio: 'path/to/your/image.jpg'
image_path = './images/Ho-oh.png'

show_discrete_domain(image_path)
show_continuous_domain(image_path)
