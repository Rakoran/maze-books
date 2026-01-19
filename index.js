#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const CrosswordGenerator = require('./crossword');

function shuffle(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

const DIRS = [
	[0,1],[1,0],[0,-1],[-1,0], // orthogonal
	[1,1],[1,-1],[-1,1],[-1,-1] // diagonal
];

function nonBackwardsDirs(){
	// Teacher mode: only allow right and down so words never appear backwards.
	return [ [0,1], [1,0] ];
}

function makeEmptyGrid(n){return Array.from({length:n},()=>Array.from({length:n},()=>null))}

function canPlace(grid, word, r, c, dr, dc){
	const n = grid.length;
	for(let i=0;i<word.length;i++){
		const rr = r + dr*i, cc = c + dc*i;
		if(rr<0||cc<0||rr>=n||cc>=n) return false;
		const ch = grid[rr][cc];
		if(ch && ch !== word[i]) return false;
	}
	// Check buffer zones: ensure no adjacent cells are occupied
	for(let i=0;i<word.length;i++){
		const rr = r + dr*i, cc = c + dc*i;
		for(let d=0;d<DIRS.length;d++){
			const ar = rr + DIRS[d][0], ac = cc + DIRS[d][1];
			if(ar>=0 && ac>=0 && ar<n && ac<n && grid[ar][ac]) return false;
		}
	}
	return true;
}

function placeWord(grid, word, r, c, dr, dc){
	for(let i=0;i<word.length;i++){
		grid[r+dr*i][c+dc*i] = word[i];
	}
}

function fillGrid(grid){
	const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	const weights = [8.12, 1.54, 2.71, 4.32, 12.02, 2.30, 1.73, 5.92, 7.31, 0.23, 0.87, 3.98, 2.61, 6.95, 7.68, 1.66, 0.14, 6.02, 6.28, 9.10, 2.88, 1.06, 2.11, 0.06, 2.11, 0.23]; // A to Z
	const total = weights.reduce((a,b)=>a+b,0);
	const cumulative = weights.map((w,i)=> weights.slice(0,i+1).reduce((a,b)=>a+b,0) / total);
	for(let r=0;r<grid.length;r++){
		for(let c=0;c<grid.length;c++){
			if(!grid[r][c]){
				const rand = Math.random();
				const idx = cumulative.findIndex(c=> rand <= c);
				grid[r][c] = letters[idx];
			}
		}
	}
}

function checkGrid(grid, words) {
	const n = grid.length;
	const blocklist = ['ASS', 'DAMN', 'HELL', 'FUCK', 'SHIT', 'CUNT', 'DICK', 'PISS', 'TITS', 'BOOB', 'COCK', 'BALLS', 'BUTT', 'POOP', 'PEE', 'SEX', 'PORN', 'NAZI', 'KKK', 'RAPE', 'KILL', 'DIE', 'DEAD', 'BOMB', 'GUN', 'DRUG', 'WEED', 'CRACK', 'HEROIN', 'METH', 'COCAINE', 'ALCOHOL', 'BEER', 'WINE', 'BOOZE'];
	const wordSet = new Set(words.map(w => w.toUpperCase()));
	const foundWords = new Map();
	for (let r = 0; r < n; r++) {
		for (let c = 0; c < n; c++) {
			for (let d = 0; d < DIRS.length; d++) {
				const dr = DIRS[d][0], dc = DIRS[d][1];
				let word = '';
				let rr = r, cc = c;
				while (rr >= 0 && rr < n && cc >= 0 && cc < n) {
					word += grid[rr][cc];
					if (word.length >= 3) {
						const upper = word.toUpperCase();
						if (blocklist.includes(upper)) return false;
						if (wordSet.has(upper)) {
							foundWords.set(upper, (foundWords.get(upper) || 0) + 1);
						}
					}
					rr += dr;
					cc += dc;
				}
			}
		}
	}
	for (let count of foundWords.values()) {
		if (count > 1) return false;
	}
	return true;
}

function generate(words, size, opts){
	const n = size || Math.max(10, ...words.map(w=>w.length));
	const grid = makeEmptyGrid(n);
	const placements = [];
	const order = shuffle(words.slice()).sort((a,b)=>b.length-a.length);
	const level = opts && opts.level ? parseInt(opts.level) : 3;
	let dirs;
	if(level === 1) dirs = [[0,1],[1,0]];
	else if(level === 2) dirs = [[0,1],[1,0],[1,1]];
	else dirs = DIRS;

	for(const raw of order){
		const word = raw.toUpperCase().replace(/[^A-Z]/g,'');
		let placed=false;
		const attempts = 500;
		for(let t=0;t<attempts && !placed;t++){
			const dir = dirs[Math.floor(Math.random()*dirs.length)];
			const dr = dir[0], dc = dir[1];
			const r = Math.floor(Math.random()*n);
			const c = Math.floor(Math.random()*n);
			// adjust start so word fits
			const endR = r + dr*(word.length-1);
			const endC = c + dc*(word.length-1);
			if(endR<0||endC<0||endR>=n||endC>=n) continue;
			if(canPlace(grid, word, r, c, dr, dc)){
				placeWord(grid, word, r, c, dr, dc);
				placements.push({word, r, c, dr, dc});
				placed = true;
			}
		}
		if(!placed) console.warn('Could not place', raw);
	}

	fillGrid(grid);
	let tries = 0;
	while (!checkGrid(grid, words) && tries < 10) {
		fillGrid(grid);
		tries++;
	}
	if (tries >= 10) console.warn('Could not generate clean grid');
	return {grid, placements};
}

function renderConsole(grid){
	return grid.map(row=>row.join(' ')).join('\n');
}

function renderHTML(grid, placements, title, opts){
	const n = grid.length;
	const cellSize = opts && opts.print ? 44 : 30;
	const letters = grid.map(r=>r.map(c=>c));
	const placedWords = placements.map(p=>p.word);
	const html = [];
	html.push(`<!doctype html><html><head><meta charset="utf-8"><title>${title||'Wordsearch'}</title><style>`);
	html.push(`body{font-family:sans-serif;padding:20px;color:#000} table{border-collapse:collapse;margin:0 auto}`);
	html.push(`td{width:${cellSize}px;height:${cellSize}px;text-align:center;border:1px solid #999;font-weight:700;font-size:${Math.floor(cellSize*0.5)}px}`);
	html.push(`.list{margin-top:16px}`);
	if(opts && opts.print){
		html.push(`@media print{ @page {size: landscape; margin: 10mm;} .list{display:none} body{padding:0} }`);
	}
	html.push(`</style></head><body>`);
	html.push(`<h1>${title||'Wordsearch'}</h1>`);
	html.push('<table>');
	for(let r=0;r<n;r++){
		html.push('<tr>');
		for(let c=0;c<n;c++) html.push(`<td>${letters[r][c]}</td>`);
		html.push('</tr>');
	}
	html.push('</table>');
	if(!(opts && opts.print)){
		html.push('<div style="text-align:center;margin:12px 0"><button id="toggleWords">Toggle Word List</button></div>');
		html.push('<div class="list" style="margin-top:16px"><strong>Words:</strong><ul>');
		for(const w of placedWords) html.push(`<li>${w}</li>`);
		html.push('</ul></div>');
		html.push(`<script>document.getElementById('toggleWords').addEventListener('click',function(){var l=document.querySelector('.list'); if(!l) return; l.style.display = (l.style.display==='none') ? 'block' : 'none';});</script>`);
	}
	html.push('</body></html>');
	return html.join('\n');
}

function renderCrosswordHTML(crosswordGen, themesObj, title, opts){
	const cellSize = opts && opts.print ? 40 : 32;
	const grid = crosswordGen.grid;
	const bounds = crosswordGen.bounds;
	const clues = crosswordGen.getClues();
	
	// Convert grid to 2D array for rendering
	const gridArray = crosswordGen.toGrid();
	const width = bounds.maxX - bounds.minX + 1;
	const height = bounds.maxY - bounds.minY + 1;
	
	const html = [];
	html.push(`<!doctype html><html><head><meta charset="utf-8"><title>${title||'Crossword'}</title><style>`);
	html.push(`body{font-family:sans-serif;padding:20px;color:#000;background:#fff}`);
	html.push(`table{border-collapse:collapse;margin:20px auto;float:left;margin-right:40px}`);
	html.push(`td{width:${cellSize}px;height:${cellSize}px;text-align:center;border:1px solid #000;font-weight:700;font-size:${Math.floor(cellSize*0.6)}px}`);
	html.push(`td.empty{background:#000;border:1px solid #000}`);
	html.push(`.clues{float:left;margin-top:20px}`);
	html.push(`.clues h3{margin-top:0}`);
	html.push(`.clues ol{margin:10px 0;padding-left:20px}`);
	html.push(`.clues li{margin:6px 0;font-size:14px}`);
	html.push(`@media (max-width:900px){table,div{float:none;margin:20px auto!important}}`);
	if(opts && opts.print){
		html.push(`@media print{@page{size:landscape;margin:10mm}body{padding:10mm}}`);
	}
	html.push(`</style></head><body>`);
	html.push(`<h1>${title||'Crossword'}</h1>`);
	
	// Render grid
	html.push('<table>');
	for(let r = bounds.minY; r <= bounds.maxY; r++){
		html.push('<tr>');
		for(let c = bounds.minX; c <= bounds.maxX; c++){
			const key = `${r},${c}`;
			const letter = grid[key];
			if(letter){
				html.push(`<td>${opts && opts.print ? '' : letter}</td>`);
			} else {
				html.push(`<td class="empty"></td>`);
			}
		}
		html.push('</tr>');
	}
	html.push('</table>');
	
	// Render clues
	html.push('<div class="clues">');
	if(Object.keys(clues.across).length > 0){
		html.push('<h3>Across</h3><ol>');
		for(const [num, clueText] of Object.entries(clues.across)){
			html.push(`<li><strong>${num}.</strong> ${clueText}</li>`);
		}
		html.push('</ol>');
	}
	
	if(Object.keys(clues.down).length > 0){
		html.push('<h3>Down</h3><ol>');
		for(const [num, clueText] of Object.entries(clues.down)){
			html.push(`<li><strong>${num}.</strong> ${clueText}</li>`);
		}
		html.push('</ol>');
	}
	html.push('</div>');
	
	html.push('<div style="clear:both"></div>');
	html.push('</body></html>');
	return html.join('\n');
}

function loadThemes(){
	const p = path.join(process.cwd(),'themes.json');
	try{const raw = fs.readFileSync(p,'utf8'); return JSON.parse(raw)}catch(e){return{}};
}

/**
 * Transforms the old themes structure into the new wordDatabase format.
 */
function transformThemesToWordDatabase(themesObj) {
  const wordDatabase = [];
  const themes = themesObj.themes || {};
  for (const theme in themes) {
    if (Array.isArray(themes[theme])) {
      for (const word of themes[theme]) {
        const analyzed = analyzeCustomWord(word, theme);
        if (!analyzed.error) {
          wordDatabase.push({
            word: analyzed.word,
            level: analyzed.level,
            tags: [theme],
            associations: [] // Can be populated later
          });
        }
      }
    }
  }
  return wordDatabase;
}

/**
 * Analyzes a custom word and returns a standardized word object.
 * @param {string} inputWord - The raw string typed by the user.
 * @param {string} currentTheme - (Optional) The currently selected theme in the UI.
 */
function analyzeCustomWord(inputWord, currentTheme = "Custom") {
  // 1. Sanitize: Remove spaces, uppercase it
  const cleanWord = inputWord.trim().toUpperCase();

  // 2. Filter: Reject invalid inputs (optional safety check)
  if (!cleanWord.match(/^[A-Z]+$/)) {
    return { error: "Invalid characters. Use letters only." };
  }

  // 3. Calculate "Complexity Score"
  // Start with length as the base score
  let score = cleanWord.length;
  
  // Add penalty for "Rare Letters" (Harder for kids to find)
  // J, K, Q, V, X, Z usually add difficulty
  const rareLetters = ['J', 'K', 'Q', 'V', 'X', 'Z'];
  const letters = cleanWord.split('');
  
  letters.forEach(char => {
    if (rareLetters.includes(char)) {
      score += 1.5; // Bump the score up for hard letters
    }
  });

  // 4. Assign Level based on Score
  // Standards:
  // Level 1 (Age 4-6): Simple, short words (Score < 6)
  // Level 2 (Age 7-9): Standard vocabulary (Score 6 - 9)
  // Level 3 (Age 10+): Long or complex words (Score > 9)
  let level = 1;
  if (score >= 9) {
    level = 3;
  } else if (score >= 6) {
    level = 2;
  }

  // 5. Construct the Object
  return {
    word: cleanWord,
    level: level,
    tags: [currentTheme, "User-Generated"], // Auto-tagging
    length: cleanWord.length
  };
}

/**
 * Generates a filtered and randomized list of words based on theme, level, and max count.
 * @param {Array} wordDatabase - The array of word objects.
 * @param {string} targetTheme - The theme tag to filter by.
 * @param {number} targetLevel - The maximum level to include.
 * @param {number} maxWords - The maximum number of words to return.
 */
function generateWordList(wordDatabase, targetTheme, targetLevel, maxWords) {
  // 1. Filter the Master List
  const candidateWords = wordDatabase.filter(item => {
    // Does the word have the requested theme tag? (case-insensitive)
    const hasTheme = item.tags.some(tag => tag.toLowerCase() === targetTheme.toLowerCase());
    
    // Is it appropriate for this age group?
    // Allow lower levels in higher difficulties (e.g., "CAT" is okay in a Level 3 puzzle),
    // But DON'T allow Level 3 words in a Level 1 puzzle.
    const isLevelAppropriate = item.level <= targetLevel;

    // Minimum length 3
    const isLongEnough = item.word.length >= 3;

    return hasTheme && isLevelAppropriate && isLongEnough;
  });

  // Remove duplicates based on word
  const uniqueCandidates = candidateWords.filter((item, index, arr) => 
    arr.findIndex(i => i.word === item.word) === index
  );

  // 2. Shuffle (Fisher-Yates Algorithm) - Standard for randomness
  // Prevents the same words from always appearing first
  for (let i = uniqueCandidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [uniqueCandidates[i], uniqueCandidates[j]] = [uniqueCandidates[j], uniqueCandidates[i]];
  }

  // 3. The "Cap" (Slice the array)
  // Only take the first 'maxWords' (e.g., 10) to avoid overcrowding
  const finalSelection = uniqueCandidates.slice(0, maxWords);

  // Return just the word strings for the generator to use
  return finalSelection.map(item => item.word); 
}

function usage(){
	console.log('Usage: node index.js --theme=animals --size=15 --html=out.html');
	console.log('Or: node index.js --words="cat,dog,fish" --size=12 --html=out.html');
	console.log('Or: node index.js --crossword --theme=animals --size=15 --html=out.html');
	console.log('Or: node index.js --transform-themes --output=new-themes.json');
}

function parseArgs(){
	const args = process.argv.slice(2);
	const opts = {};
	for(const a of args){
		if(a.startsWith('--')){
			const arg = a.slice(2);
			if(arg.includes('=')){
				const [k,v] = arg.split('=');
				opts[k] = v;
			} else {
				opts[arg] = true;
			}
		}
	}
	return opts;
}

// dynamic age presets will be loaded from themes.json; this function looks them up
function ageToOptions(age, themesObj){
	if(!age || !themesObj) return null;
	const map = themesObj.agePresets || themesObj.agePresets;
	return (map && map[age]) ? map[age] : null;
}

function main(){
	const opts = parseArgs();
	if(opts.help) return usage();
	const themesObj = loadThemes();
	const themes = (themesObj && themesObj.themes) ? themesObj.themes : themesObj || {};
	if(opts['transform-themes']){
		const wordDatabase = transformThemesToWordDatabase(themesObj);
		const newThemesObj = {wordDatabase, ...themesObj};
		delete newThemesObj.themes; // Remove old themes
		const output = JSON.stringify(newThemesObj, null, 2);
		if(opts.output){
			fs.writeFileSync(opts.output, output, 'utf8');
			console.log('Transformed themes written to', opts.output);
		} else {
			console.log(output);
		}
		return;
	}
	let words = [];
	if(opts.theme){
		if(themesObj.wordDatabase){
			// Use new structure
			words = generateWordList(themesObj.wordDatabase, opts.theme, opts.level || 3, 20); // default level 3, max 20
		} else {
			const t = themes[opts.theme];
			if(!t) {console.error('Theme not found:',opts.theme); process.exit(1)}
			words = t.slice();
		}
	}
	if(opts.words){
		words = words.concat(opts.words.split(/[,;\n]+/).map(s=>s.trim()).filter(Boolean));
	}
	if(words.length===0){usage(); process.exit(1)}
	// apply age presets if provided (from themes.json)
	const ageOpts = opts.age ? ageToOptions(opts.age, themesObj) : null;
	let size = parseInt(opts.size||Math.max(10, ...words.map(w=>w.length))) || Math.max(10,...words.map(w=>w.length));
	let teacherFlag = !!opts.teacher;
	if(ageOpts){
		size = ageOpts.size;
		teacherFlag = !!ageOpts.teacher;
		if(ageOpts.maxWords && words.length > ageOpts.maxWords) words = shuffle(words).slice(0, ageOpts.maxWords);
	}
	
	// Check if crossword generation requested
	if(opts.crossword){
		const crosswordGen = new CrosswordGenerator(words, size);
		crosswordGen.generate();
		
		// Attach clues to placements
		crosswordGen.placements.forEach(p => {
			const entry = themesObj.wordDatabase && themesObj.wordDatabase.find(w => w.word === p.word);
			p.clue = entry && entry.clue ? entry.clue : `${p.word.length} letters`;
		});
		
		console.log('Crossword generated with', crosswordGen.placements.length, 'words');
		const clues = crosswordGen.getClues();
		console.log('Across clues:', Object.keys(clues.across).length);
		console.log('Down clues:', Object.keys(clues.down).length);
		
		if(opts.html){
			const out = renderCrosswordHTML(crosswordGen, themesObj, opts.title||`Crossword: ${opts.theme||'custom'}`, {print: !!opts.print});
			fs.writeFileSync(opts.html, out, 'utf8');
			console.log('Wrote HTML to', opts.html);
		}
	} else {
		// Word search generation (default)
		const {grid, placements} = generate(words, size, {teacher: teacherFlag});
		console.log(renderConsole(grid));
		console.log('\nWords:');
		console.log(words.map(w=>w.toUpperCase()).join(', '));
		if(opts.html){
			const out = renderHTML(grid, placements, opts.title||`Wordsearch: ${opts.theme||'custom'}`, {print: !!opts.print});
			fs.writeFileSync(opts.html, out, 'utf8');
			console.log('Wrote HTML to', opts.html);
		}
	}
}

function generateCrossword(words, opts) {
	if(words.length === 0) {console.error('No words to place'); return null}
	const gen = new CrosswordGenerator(words, opts && opts.size ? opts.size : 20);
	gen.generate();
	
	// Attach clues to placements
	const themesObj = loadThemes();
	gen.placements.forEach(p => {
		const entry = themesObj.wordDatabase && themesObj.wordDatabase.find(w => w.word === p.word);
		p.clue = entry && entry.clue ? entry.clue : `${p.word.length} letters`;
	});
	
	return gen;
}

if(require.main === module) main();


