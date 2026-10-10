#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

mapfile -t F < <(ls images-20 | sort -V)   # ordine numerico
N=${#F[@]}                                  # 21

pick() {  # uso: pick <cartella> <quante> <offset>
  local dir=$1 k=$2 off=${3:-0}
  rm -rf "$dir"; mkdir -p "$dir"
  for ((j=0; j<k; j++)); do
    local i=$(( (off + j * N / k) % N ))
    cp "images-20/${F[$i]}" "$dir/"
  done
}

pick images-10 10 0
pick images-5  5  0
pick images-3  3  0

for d in images-10 images-5 images-3; do
  echo "$d: $(ls $d | sort -V | tr '\n' ' ')"
done