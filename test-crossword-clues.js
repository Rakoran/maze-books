const CrosswordGenerator = require('./crossword');

// Create a simpler test with well-known words
const words = ['CAT', 'DOG', 'BIRD', 'FISH', 'ANT'];
const gen = new CrosswordGenerator(words, 20);
gen.generate();

// Attach clues manually for testing
const clueMap = {
  'CAT': 'Purr-fect pet',
  'DOG': 'Man\'s best friend',
  'BIRD': 'Flies in the sky',
  'FISH': 'Lives in water',
  'ANT': 'Tiny insect'
};

gen.placements.forEach(p => {
  p.clue = clueMap[p.word] || `${p.word.length} letters`;
});

const clues = gen.getClues();

console.log('Generated Crossword:');
console.log('Placements:', gen.placements.length);
console.log('\nPlacements:');
gen.placements.forEach(p => {
  console.log(`  ${p.word} at (${p.r},${p.c}) ${p.dr === 0 ? 'ACROSS' : 'DOWN'} - ${p.clue}`);
});

console.log('\nClues for rendering:');
console.log('Across:', clues.across);
console.log('Down:', clues.down);

// Test grid
const grid = gen.toGrid();
console.log('\nGrid:');
grid.forEach(row => {
  console.log(row.map(c => c || '.').join(' '));
});
