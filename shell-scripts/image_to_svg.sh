#!/bin/bash

# sudo apt-get update
# sudo apt-get install -y imagemagick potrace inkscape

# Check if required tools are installed
if ! command -v convert &> /dev/null; then
    echo "ImageMagick (convert) could not be found, please install it."
    exit 1
fi
if ! command -v potrace &> /dev/null; then
    echo "Potrace could not be found, please install it."
    exit 1
fi

# Check if input file is provided
if [ "$#" -ne 1 ]; then
    echo "Usage: $0 input.png"
    exit 1
fi

input_file="$1"
pgm_file="${input_file%.*}.pgm"
svg_file="${input_file%.*}.svg"

# Convert PNG to PGM
convert "$input_file" -background white -alpha remove -alpha off "$pgm_file"

# Convert PGM to SVG using Potrace
potrace -s -o "$svg_file" "$pgm_file"

echo "Conversion complete: $svg_file"