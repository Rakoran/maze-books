const CrosswordGenerator = require('./crossword');

const words = ['ELEPHANT', 'APPLE', 'BANANA', 'CARROT', 'DOLPHIN', 'PENGUIN', 'GIRAFFE'];
const gen = new CrosswordGenerator(words, 25);
const grid = gen.generate();

console.log('Placements:');
gen.placements.forEach(p => {
  console.log(`  ${p.word} at (${p.r},${p.c}) dir=(${p.dr},${p.dc})`);
});

console.log('\nGrid dimensions:', gen.bounds);

const clues = gen.getClues();
console.log('\nAcross clues:', Object.keys(clues.across).length);
console.log('Down clues:', Object.keys(clues.down).length);

console.log('\nGrid:');
if (grid) {
  grid.forEach(row => {
    console.log(row.map(c => c || '.').join(' '));
  });
}
