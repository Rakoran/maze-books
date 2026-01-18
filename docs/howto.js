// How-to-play helper for puzzle pages
(function(){
  const HOWTO = {
    'index.html': {
      intro: 'Wordsearch is a hidden-word puzzle. Words can run in any allowed direction in the grid.',
      steps: [
        'Pick a theme and/or add custom words.',
        'Click Generate to build the puzzle.',
        'Scan the grid for the first and last letters of each word.',
        'Trace the word in a straight line (horizontal, vertical, or diagonal).',
        'Repeat until all words are found.',
        'Use Show Answers to reveal word locations if needed.',
        'Save PNG for printing or sharing.'
      ],
      examples: [
        'Example: WORD can appear left-to-right, top-to-bottom, or diagonally.',
        'Example: If teacher mode is on, words only go right or down.'
      ],
      tips: [
        'Circle words you find to avoid double-counting.',
        'Start with longer words first; they are easier to spot.'
      ]
    },
    'crossword.html': {
      intro: 'Crosswords use intersecting words. Each clue has a matching word in the grid.',
      steps: [
        'Read the Across and Down clue lists.',
        'Find the numbered start cell for each clue.',
        'Fill the answer one letter per cell in the correct direction.',
        'Use intersections to confirm letters.',
        'Continue until all clues are filled.',
        'Show Answers reveals the full filled grid.',
        'Save PNG for a printable page.'
      ],
      examples: [
        'Example: 3-Across and 2-Down share a letter at their crossing.',
        'Example: If 5-Down is CAT, then C-A-T goes top to bottom.'
      ],
      tips: [
        'Fill short clues first to give you crossing letters.',
        'If a word does not fit, re-check crossings for errors.'
      ]
    },
    'maze.html': {
      intro: 'Find a path through the maze from start to finish without crossing walls.',
      steps: [
        'Start at the entrance (top-left).',
        'Move one cell at a time through open paths.',
        'Avoid crossing walls or leaving the maze.',
        'Reach the exit (bottom-right).',
        'Show Answers reveals the solution path.',
        'Save PNG for print or sharing.'
      ],
      examples: [
        'Example: Trace a continuous line from the entrance to the exit.',
        'Example: If you hit a dead end, backtrack to the last split.'
      ],
      tips: [
        'Use a pencil so you can erase dead ends.',
        'Try following one wall; it often leads to the exit.'
      ]
    },
    'sudoku.html': {
      intro: 'Sudoku uses digits 1-9. Each row, column, and 3x3 box must contain all digits exactly once.',
      steps: [
        'Look for rows or columns with many given numbers.',
        'Fill any cell that has only one possible number.',
        'Check each 3x3 box for missing digits.',
        'Repeat until the grid is complete.',
        'Show Answers reveals the full solution.',
        'Save PNG to print.'
      ],
      examples: [
        'Example: If a row already has 1-8, the missing number is 9.',
        'Example: In a 3x3 box, if 2 and 7 are missing and a cell already has a 2 in its column, that cell must be 7.'
      ],
      tips: [
        'Mark pencil notes for possible digits in each cell.',
        'Solve the easiest rows/boxes first to unlock harder areas.'
      ]
    },
    'patterns.html': {
      intro: 'Counting patterns repeat by adding or subtracting a number each step.',
      steps: [
        'Read several numbers in a row to find the step.',
        'Check that the same step works across the row and down the column.',
        'Fill all missing numbers.',
        'Show Answers to reveal the full pattern.',
        'Save PNG when done.'
      ],
      examples: [
        'Example: 2, 4, 6, 8 is +2 each step.',
        'Example: 10, 15, 20, 25 is +5 each step.'
      ],
      tips: [
        'Look at differences between numbers to find the step.',
        'Verify the pattern in multiple rows.'
      ]
    },
    'sorting.html': {
      intro: 'Sort the list into ascending order from smallest to largest.',
      steps: [
        'Read the unsorted list.',
        'Find the smallest number and place it first.',
        'Continue with the next smallest number until finished.',
        'Show Answers reveals the sorted list.',
        'Save PNG for print.'
      ],
      examples: [
        'Example: 9, 2, 5 becomes 2, 5, 9.',
        'Example: 14, 7, 20 becomes 7, 14, 20.'
      ],
      tips: [
        'Cross off numbers as you place them in order.',
        'Double-check for ties or repeated values.'
      ]
    },
    'riddles.html': {
      intro: 'Each riddle describes something in a creative way. Guess the simplest answer.',
      steps: [
        'Read the riddle carefully.',
        'Think of objects that match every clue.',
        'Write your guess.',
        'Show Answers to check.',
        'Save PNG for print.'
      ],
      examples: [
        'Example: "I shine in the day" -> Sun.',
        'Example: "I have pages and tell stories" -> Book.'
      ],
      tips: [
        'Focus on key words in the riddle.',
        'Try saying the riddle out loud.'
      ]
    },
    'differences.html': {
      intro: 'Two images are almost the same. Find and circle all differences.',
      steps: [
        'Compare Image A and Image B carefully.',
        'Scan row by row or section by section.',
        'Circle each difference you find.',
        'Show Answers highlights all differences.',
        'Save PNG to print.'
      ],
      examples: [
        'Example: A shape might be missing in one image.',
        'Example: A color might change between images.'
      ],
      tips: [
        'Look for small changes at the edges and corners.',
        'Use a ruler or cover parts to focus on one area at a time.'
      ]
    },
    'cryptograms.html': {
      intro: 'Each letter is replaced by a different letter. Decode the message.',
      steps: [
        'Use the hint mappings to start decoding.',
        'Find repeating letter patterns (like A_A or THE).',
        'Replace letters consistently throughout the phrase.',
        'Show Answers reveals the plain text.',
        'Save PNG to print.'
      ],
      examples: [
        'Example: If A->T, every A becomes T.',
        'Example: A three-letter word with pattern _H_ often suggests THE.'
      ],
      tips: [
        'Common letters in English: E, T, A, O, N.',
        'Short words like A, I, THE, AND are good anchors.'
      ]
    },
    'wordladders.html': {
      intro: 'Change one letter at a time to get from the first word to the last word.',
      steps: [
        'Start with the first word.',
        'Change exactly one letter to make a new word.',
        'Repeat until you reach the last word.',
        'All intermediate words must be real words.',
        'Show Answers reveals the full ladder.',
        'Save PNG to print.'
      ],
      examples: [
        'Example: COLD -> CORD -> CARD -> WARD -> WARM.',
        'Example: HAT -> HOT -> DOT -> DOG.'
      ],
      tips: [
        'Try changing letters that appear in the final word.',
        'Use common word endings like -AT, -OT, -ING.'
      ]
    },
    'logicgrids.html': {
      intro: 'Logic grids match items across categories using clues.',
      steps: [
        'Read all categories and items.',
        'Use each clue to mark a match or a non-match.',
        'Eliminate impossibilities as you go.',
        'Continue until each item has exactly one match in each category.',
        'Show Answers reveals the solution grid.',
        'Save PNG for print.'
      ],
      examples: [
        'Example: "Ava has the cat" means Ava cannot have any other pet.',
        'Example: If Ben is not blue and only blue is left, Ben must be green.'
      ],
      tips: [
        'Make a quick table on paper to track matches and X marks.',
        'Look for clues that lock a unique choice.'
      ]
    },
    'ispy.html': {
      intro: 'Find and count specific objects hidden in a busy scene.',
      steps: [
        'Read the list of targets.',
        'Scan the picture to find each target.',
        'Count each matching item.',
        'Show Answers circles all targets.',
        'Save PNG to print.'
      ],
      examples: [
        'Example: "3 blue circles" means find three blue circles.',
        'Example: "2 red stars" means find two red star shapes.'
      ],
      tips: [
        'Trace with your finger while counting to avoid skipping.',
        'Count one color at a time.'
      ]
    },
    'kakuro.html': {
      intro: 'Kakuro is a number crossword. Each run sums to the clue and uses digits 1-9 without repeats.',
      steps: [
        'Find a run (a set of connected white cells).',
        'Use the clue sum to decide which digits can fit.',
        'Remember digits cannot repeat within a run.',
        'Use crossings to narrow choices.',
        'Show Answers reveals the filled grid.',
        'Save PNG to print.'
      ],
      examples: [
        'Example: A 2-cell run with sum 4 must be 1 and 3.',
        'Example: A 3-cell run with sum 6 could be 1,2,3.'
      ],
      tips: [
        'Start with small sums and short runs.',
        'Check crossings to confirm digits.'
      ]
    },
    'battleships.html': {
      intro: 'Place ships so each row and column matches the given count. Ships cannot touch, even diagonally.',
      steps: [
        'Use the row and column numbers as totals.',
        'Mark rows or columns with 0 as empty.',
        'Place ships to satisfy counts without touching.',
        'Use logic to fill the remaining squares.',
        'Show Answers reveals all ships.',
        'Save PNG to print.'
      ],
      examples: [
        'Example: A row count of 0 has no ship squares.',
        'Example: If a column needs 1 and only one cell is possible, that cell must be a ship.'
      ],
      tips: [
        'Ships cannot touch diagonally; leave gaps around placed ships.',
        'Track remaining ship sizes as you place them.'
      ]
    },
    'kenken.html': {
      intro: 'Fill each row and column with 1 to N with no repeats. Each cage uses an operation to reach its target.',
      steps: [
        'Check each cage for possible number combinations.',
        'Place numbers so each row/column has no repeats.',
        'Use intersections between cages to confirm values.',
        'Show Answers reveals the solution.',
        'Save PNG to print.'
      ],
      examples: [
        'Example: A 6+ cage with two cells could be 1 and 5 or 2 and 4.',
        'Example: A 2-cell 3÷ cage must be 3 and 1.'
      ],
      tips: [
        'Small cages are easiest. Solve them first.',
        'Use elimination when a number already appears in a row/column.'
      ]
    },
    'nonograms.html': {
      intro: 'Nonograms use hints to reveal a hidden picture. Each hint shows runs of filled squares.',
      steps: [
        'Read the hints for each row and column.',
        'Mark any rows or columns where the hints fill the entire line.',
        'Continue filling and marking empty spaces.',
        'Show Answers reveals the picture.',
        'Save PNG to print.'
      ],
      examples: [
        'Example: Hint "5" in a 5-cell row means all 5 are filled.',
        'Example: Hint "3 1" means three filled, a gap, then one filled.'
      ],
      tips: [
        'Use X marks for cells that must be empty.',
        'Work from the largest hints first.'
      ]
    },
    'memory.html': {
      intro: 'Memory match is a card game. Find pairs of matching cards.',
      steps: [
        'Print and cut out the cards.',
        'Shuffle and lay them face down.',
        'Flip two cards. If they match, keep the pair.',
        'If not, turn them back over and try again.',
        'Show Answers reveals the full layout.',
        'Save PNG to print.'
      ],
      examples: [
        'Example: If you flip CAT and CAT, you keep the pair.',
        'Example: If you flip CAT and DOG, turn them back over.'
      ],
      tips: [
        'Try to remember positions of cards you have seen.',
        'Play with fewer pairs for younger players.'
      ]
    },
    'colorby.html': {
      intro: 'Color by Number uses a legend to match numbers to colors. You can upload an image to convert it into a paint-by-number outline.',
      steps: [
        'Look at the legend to see which number matches each color.',
        'Find all cells with the same number.',
        'Color those cells with the matching color.',
        'Repeat until every numbered cell is colored.',
        'Optional: upload an image and click Generate to auto-convert it.',
        'Show Answers fills the picture automatically.',
        'Save PNG or PDF to print.'
      ],
      examples: [
        'Example: If 1 is red, color every 1 cell red.',
        'Example: If 3 is green, color all 3 cells green.'
      ],
      tips: [
        'Color one number at a time to avoid mistakes.',
        'Start with the most common number to reveal the shape.'
      ]
    }
  };

  function renderHowTo(){
    const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    const entry = HOWTO[page];
    const steps = Array.isArray(entry) ? entry : entry.steps;
    if(!steps) return;
    const main = document.querySelector('main');
    if(!main || document.querySelector('.howto')) return;
    const section = document.createElement('section');
    section.className = 'howto';
    const h = document.createElement('h2');
    h.textContent = 'How to play';
    section.appendChild(h);
    if(entry && entry.intro){
      const intro = document.createElement('div');
      intro.className = 'howto-intro';
      intro.textContent = entry.intro;
      section.appendChild(intro);
    }
    const ul = document.createElement('ul');
    steps.forEach(s=>{
      const li = document.createElement('li');
      li.textContent = s;
      ul.appendChild(li);
    });
    section.appendChild(ul);
    if(entry && entry.examples){
      const exTitle = document.createElement('div');
      exTitle.className = 'howto-subtitle';
      exTitle.textContent = 'Examples';
      section.appendChild(exTitle);
      const exList = document.createElement('ul');
      entry.examples.forEach(e=>{
        const li = document.createElement('li');
        li.textContent = e;
        exList.appendChild(li);
      });
      section.appendChild(exList);
    }
    if(entry && entry.tips){
      const tipTitle = document.createElement('div');
      tipTitle.className = 'howto-subtitle';
      tipTitle.textContent = 'Tips';
      section.appendChild(tipTitle);
      const tipList = document.createElement('ul');
      entry.tips.forEach(t=>{
        const li = document.createElement('li');
        li.textContent = t;
        tipList.appendChild(li);
      });
      section.appendChild(tipList);
    }
    main.appendChild(section);
  }

  document.addEventListener('DOMContentLoaded', renderHowTo);
})();
