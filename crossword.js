#!/usr/bin/env node
const fs = require('fs');

// Crossword Generator with Golden Standards for Kids
class CrosswordGenerator {
  constructor(words, maxSize = 20) {
    this.words = words.filter(w => w.length >= 3).sort((a, b) => b.length - a.length);
    this.maxSize = maxSize;
    this.grid = {};
    this.placements = [];
    this.bounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }

  // Check if a cell is adjacent to an existing word (violates Personal Space)
  isAdjacentToWord(r, c) {
    const neighbors = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];
    
    for (const [dr, dc] of neighbors) {
      const key = `${r + dr},${c + dc}`;
      if (this.grid[key]) return true;
    }
    return false;
  }

  // Check if placement is valid (no side-by-side adjacency except intersections)
  isValidPlacement(word, r, c, dr, dc) {
    const isHorizontal = dc !== 0;
    const placement = [];
    let hasIntersection = false;

    for (let i = 0; i < word.length; i++) {
      const rr = r + dr * i;
      const cc = c + dc * i;
      const key = `${rr},${cc}`;
      const char = word[i];

      // Check bounds
      if (rr < 0 || rr >= this.maxSize || cc < 0 || cc >= this.maxSize) return false;

      if (this.grid[key]) {
        // Intersection: must match existing letter
        if (this.grid[key] !== char) return false;
        hasIntersection = true;
      } else {
        placement.push({ r: rr, c: cc, char });

        // Check perpendicular adjacency ONLY if not an intersection point
        if (isHorizontal) {
          // Check above and below
          const above = `${rr - 1},${cc}`;
          const below = `${rr + 1},${cc}`;
          if (this.grid[above] || this.grid[below]) return false;
        } else {
          // Check left and right
          const left = `${rr},${cc - 1}`;
          const right = `${rr},${cc + 1}`;
          if (this.grid[left] || this.grid[right]) return false;
        }
      }
    }

    // Check start/end adjacency (no word directly before/after)
    if (isHorizontal) {
      const before = `${r},${c - 1}`;
      const after = `${r},${c + dc * (word.length - 1) + 1}`;
      if (this.grid[before] || this.grid[after]) return false;
    } else {
      const before = `${r - 1},${c}`;
      const after = `${r + dr * (word.length - 1) + 1},${c}`;
      if (this.grid[before] || this.grid[after]) return false;
    }

    return placement.length > 0 || hasIntersection ? placement : false;
  }

  // Check if placement intersects with existing words (Single Island)
  hasIntersection(word, r, c, dr, dc) {
    if (this.placements.length === 0) return true; // First word is always valid

    for (let i = 0; i < word.length; i++) {
      const rr = r + dr * i;
      const cc = c + dc * i;
      const key = `${rr},${cc}`;
      if (this.grid[key]) return true;
    }
    return false;
  }

  // Update bounding box
  updateBounds(r, c, dr, dc, len) {
    const endR = r + dr * (len - 1);
    const endC = c + dc * (len - 1);
    const minR = Math.min(r, endR);
    const maxR = Math.max(r, endR);
    const minC = Math.min(c, endC);
    const maxC = Math.max(c, endC);

    this.bounds.minX = Math.min(this.bounds.minX, minC);
    this.bounds.maxX = Math.max(this.bounds.maxX, maxC);
    this.bounds.minY = Math.min(this.bounds.minY, minR);
    this.bounds.maxY = Math.max(this.bounds.maxY, maxR);
  }

  // Count intersections for a word
  countIntersections(word, r, c, dr, dc) {
    let count = 0;
    for (let i = 0; i < word.length; i++) {
      const rr = r + dr * i;
      const cc = c + dc * i;
      // Check if this letter matches an existing placement
      for (const p of this.placements) {
        if (p.word !== word) { // Different word
          for (let j = 0; j < p.word.length; j++) {
            const prr = p.r + p.dr * j;
            const pcc = p.c + p.dc * j;
            if (prr === rr && pcc === cc) count++;
          }
        }
      }
    }
    return count;
  }

  // Place remaining words
  placeRemaining() {
    const directions = [[0, 1], [1, 0]]; // H, V

    for (let i = 1; i < this.words.length; i++) {
      const w = this.words[i];
      let placed = false;

      // Try to find valid placement
      for (let attempt = 0; attempt < 150 && !placed; attempt++) {
        const [dr, dc] = directions[Math.floor(Math.random() * directions.length)];
        
        // Try random position
        for (let tryPos = 0; tryPos < 30; tryPos++) {
          const r = Math.floor(Math.random() * this.maxSize);
          const c = Math.floor(Math.random() * this.maxSize);

          const placement = this.isValidPlacement(w, r, c, dr, dc);
          if (!placement) continue;

          // MUST have at least one intersection with existing words
          // An intersection is where our letter matches an existing letter
          let hasIntersection = false;
          for (let j = 0; j < w.length; j++) {
            const rr = r + dr * j;
            const cc = c + dc * j;
            const key = `${rr},${cc}`;
            const existingLetter = this.grid[key];
            if (existingLetter && existingLetter === w[j]) {
              hasIntersection = true;
              break;
            }
          }

          if (!hasIntersection) continue;

          // Check intersection density - count actual intersections
          let intersectionCount = 0;
          for (let j = 0; j < w.length; j++) {
            const rr = r + dr * j;
            const cc = c + dc * j;
            const key = `${rr},${cc}`;
            if (this.grid[key] && this.grid[key] === w[j]) {
              intersectionCount++;
            }
          }
          
          if (intersectionCount > 2) continue;

          // Valid placement found!
          placement.forEach(({ r, c, char }) => {
            this.grid[`${r},${c}`] = char;
          });

          this.placements.push({ word: w, r, c, dr, dc, number: this.placements.length + 1 });
          this.updateBounds(r, c, dr, dc, w.length);
          placed = true;
          break;
        }
      }

      if (!placed) console.warn('Could not place:', w);
    }
  }

  generate() {
    if (this.words.length === 0) return null;

    // Start with longest word in center
    const word = this.words[0];
    const startR = Math.floor(this.maxSize / 2);
    const startC = Math.floor(this.maxSize / 2);

    // Place first word horizontally
    for (let i = 0; i < word.length; i++) {
      const key = `${startR},${startC + i}`;
      this.grid[key] = word[i];
    }

    this.placements.push({ word, r: startR, c: startC, dr: 0, dc: 1, number: 1 });
    this.updateBounds(startR, startC, 0, 1, word.length);

    // Place remaining words
    this.placeRemaining();

    return this.toGrid();
  }

  toGrid() {
    const width = this.bounds.maxX - this.bounds.minX + 1;
    const height = this.bounds.maxY - this.bounds.minY + 1;
    const grid = Array(height).fill(null).map(() => Array(width).fill(null));

    for (const [key, char] of Object.entries(this.grid)) {
      const [r, c] = key.split(',').map(Number);
      grid[r - this.bounds.minY][c - this.bounds.minX] = char;
    }

    return grid;
  }

  getClues() {
    const across = {};
    const down = {};

    // Sort placements by position (top-left to bottom-right) for numbering
    const sorted = this.placements.slice().sort((a, b) => {
      if (a.r !== b.r) return a.r - b.r;
      return a.c - b.c;
    });

    // Assign numbers based on position
    let clueNumber = 1;
    sorted.forEach(p => {
      const clue = p.clue || `${p.word.length} letters`;
      if (p.dc !== 0) {
        // Horizontal (Across)
        across[clueNumber] = clue;
      } else {
        // Vertical (Down)
        down[clueNumber] = clue;
      }
      clueNumber++;
    });

    return { across, down };
  }
}

module.exports = CrosswordGenerator;
