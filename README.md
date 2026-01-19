# Maze Books - Puzzle Generators

Simple Node.js CLI and web interface to create themed wordsearch and crossword puzzles for children.

## Features

### Word Search
- Themed puzzles (Animals, Fruits, Space, Ocean, Transport, Sports, School)
- Level-based difficulty (1-3)
- Buffer zones to prevent accidental word formations
- Unintentional word filter (offensive word detection)
- Teacher mode (no backwards words)
- Print-friendly HTML output

### Crossword (NEW!)
- Comprehensive crossword generator with Golden Standards compliance
- Personal Space Protocol (no unintended adjacencies)
- Single Island Constraint (one connected component)
- Compactness Score (minimized bounding box)
- Intersection Density limits (1-2 intersections per word for kids)
- Minimum word length (3+ letters)
- Backtracking algorithm for smart placement
- Automatic clue attachment from theme database
- HTML rendering with interactive grid and clue lists

## CLI Usage

### Word Search Examples

Generate a word search from the animals theme and print to console:
\\\
node index.js --theme=animals --size=12
\\\

Generate from a custom list and save an HTML file:
\\\
node index.js --words= cat,dog,fox --size=10 --html=out.html
\\\

Generate a printer-friendly HTML:
\\\
node index.js --theme=animals --size=12 --html=out_print.html --print
\\\

### Crossword Examples

Generate a crossword from the animals theme:
\\\
node index.js --theme=animals --crossword --size=25 --html=out_crossword.html
\\\

## Web UI

- Word Search: Visit web/index.html
- Crossword: Visit web/crossword.html (NEW!)

## Requirements

- Node.js 12+
- Modern web browser for UI
