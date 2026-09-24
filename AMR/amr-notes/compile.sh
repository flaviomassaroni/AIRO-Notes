#!/bin/bash
mkdir -p build build/chapters build/appendices build/frontmatter

pdflatex -output-directory=build main.tex
makeindex build/main.idx -o build/main.ind
biber build/main
pdflatex -output-directory=build main.tex
pdflatex -output-directory=build main.tex
echo "Compilazione completata. PDF in build/main.pdf"
