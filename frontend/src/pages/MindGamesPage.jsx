import React, { useState, useEffect } from 'react';
import { 
  Gamepad2, Brain, RefreshCw, Trophy, Zap, 
  Smile, Award, CheckCircle, XCircle 
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function MindGamesPage() {
  const [activeGame, setActiveGame] = useState('memory');

  // Trigger win confetti
  const triggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#C5A880', '#4E3629', '#FAF6EE', '#D97706']
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-cafe-gold/10 text-cafe-darkgold dark:text-cafe-gold border border-cafe-gold/20 rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
          <Brain className="w-3.5 h-3.5" />
          <span>Refreshing Waiting Room</span>
        </div>
        <h2 className="font-serif text-3xl md:text-4xl font-bold dark:text-white mb-2">Mind Refreshing Games</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-light max-w-lg mx-auto">
          Pass the time productively! Choose from the games below. Your progress will be saved.
        </p>
      </div>

      {/* Navigation tabs */}
      <div className="flex overflow-x-auto pb-3 gap-2 no-scrollbar border-b border-cafe-gold/15 mb-8">
        {[
          { id: 'memory', label: 'Memory Match', desc: 'Find cafe pairs' },
          { id: 'tictactoe', label: 'Tic Tac Toe', desc: 'Beat the AI' },
          { id: 'puzzle', label: 'Number Puzzle', desc: 'Slide tiles' },
          { id: 'emojiquiz', label: 'Emoji Quiz', desc: 'Guess food emojis' },
          { id: 'trivia', label: 'Quick Trivia', desc: 'Coffee & Food IQ' }
        ].map(game => (
          <button
            key={game.id}
            onClick={() => setActiveGame(game.id)}
            className={`flex flex-col items-start px-5 py-3 rounded-xl border text-left whitespace-nowrap transition-all ${
              activeGame === game.id
                ? 'bg-cafe-wood text-white border-cafe-wood dark:bg-cafe-gold dark:text-cafe-chocolate dark:border-cafe-gold shadow-md'
                : 'bg-white border-gray-100 text-gray-600 hover:border-cafe-gold/30 dark:bg-cafe-chocolate/20 dark:border-cafe-wood/20 dark:text-gray-300'
            }`}
          >
            <span className="text-sm font-bold">{game.label}</span>
            <span className="text-[10px] font-light opacity-80 mt-0.5">{game.desc}</span>
          </button>
        ))}
      </div>

      {/* Active Game Window */}
      <div className="bg-white dark:bg-cafe-chocolate/10 border border-cafe-gold/20 rounded-2xl p-6 shadow-sm min-h-[400px]">
        {activeGame === 'memory' && <MemoryGame triggerWin={triggerConfetti} />}
        {activeGame === 'tictactoe' && <TicTacToeGame triggerWin={triggerConfetti} />}
        {activeGame === 'puzzle' && <NumberPuzzleGame triggerWin={triggerConfetti} />}
        {activeGame === 'emojiquiz' && <EmojiQuizGame triggerWin={triggerConfetti} />}
        {activeGame === 'trivia' && <TriviaGame triggerWin={triggerConfetti} />}
      </div>
    </div>
  );
}

/* ==========================================================================
   1. MEMORY MATCH GAME
   ========================================================================== */
function MemoryGame({ triggerWin }) {
  const emojis = ['☕', '🥐', '🍰', '🍪', '🥤', '🍨', '🍩', '🥑'];
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [solved, setSolved] = useState([]);
  const [moves, setMoves] = useState(0);
  const [bestScore, setBestScore] = useState(() => localStorage.getItem('bestMemoryMoves') || '-');

  const initGame = () => {
    // Duplicate and shuffle
    const deck = [...emojis, ...emojis]
      .map((emoji, idx) => ({ id: idx, emoji, isFlipped: false }))
      .sort(() => Math.random() - 0.5);
    setCards(deck);
    setFlipped([]);
    setSolved([]);
    setMoves(0);
  };

  useEffect(() => {
    initGame();
  }, []);

  const handleClick = (idx) => {
    if (flipped.length === 2 || solved.includes(idx) || flipped.includes(idx)) return;

    const newFlipped = [...flipped, idx];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(prev => prev + 1);
      const [first, second] = newFlipped;
      
      if (cards[first].emoji === cards[second].emoji) {
        const newSolved = [...solved, first, second];
        setSolved(newSolved);
        setFlipped([]);

        if (newSolved.length === cards.length) {
          triggerWin();
          const currentBest = localStorage.getItem('bestMemoryMoves');
          const currentMoves = moves + 1;
          if (!currentBest || currentMoves < parseInt(currentBest, 10)) {
            localStorage.setItem('bestMemoryMoves', currentMoves);
            setBestScore(currentMoves);
          }
        }
      } else {
        setTimeout(() => setFlipped([]), 1000);
      }
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="flex justify-between items-center mb-6 text-sm">
        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
          <Zap className="w-4 h-4 text-cafe-gold" />
          <span>Moves: <strong>{moves}</strong></span>
        </div>
        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
          <Trophy className="w-4 h-4 text-cafe-gold" />
          <span>Best Score: <strong>{bestScore} moves</strong></span>
        </div>
        <button onClick={initGame} className="p-2 rounded bg-gray-100 dark:bg-cafe-chocolate/40 hover:bg-cafe-gold/20 text-gray-700 dark:text-gray-200">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3 max-w-xs mx-auto">
        {cards.map((card, idx) => {
          const isCardFlipped = flipped.includes(idx) || solved.includes(idx);
          return (
            <button
              key={card.id}
              onClick={() => handleClick(idx)}
              className="h-16 w-16 bg-cafe-wood/5 dark:bg-cafe-chocolate/20 border border-cafe-gold/20 rounded-xl relative overflow-hidden focus:outline-none flex items-center justify-center text-3xl transition-all duration-300"
            >
              <div className={`w-full h-full flex items-center justify-center transition-all ${
                isCardFlipped ? 'bg-cafe-gold/20 text-black dark:text-white' : 'bg-cafe-wood dark:bg-cafe-chocolate/80 text-transparent'
              }`}>
                {isCardFlipped ? card.emoji : '?'}
              </div>
            </button>
          );
        })}
      </div>

      {solved.length === cards.length && cards.length > 0 && (
        <div className="text-center mt-6 text-green-500 dark:text-green-400 font-bold flex items-center justify-center gap-1">
          <CheckCircle className="w-5 h-5" />
          <span>You found all matches in {moves} moves!</span>
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   2. TIC TAC TOE GAME
   ========================================================================== */
function TicTacToeGame({ triggerWin }) {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [winner, setWinner] = useState(null); // 'X', 'O', 'Draw'
  const [stats, setStats] = useState(() => {
    const wins = localStorage.getItem('tttWins') || 0;
    return { wins: parseInt(wins, 10) };
  });

  const checkWinner = (squares) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    if (squares.every(s => s !== null)) return 'Draw';
    return null;
  };

  const handlePlayerMove = (idx) => {
    if (board[idx] || winner || !isPlayerTurn) return;

    const newBoard = [...board];
    newBoard[idx] = 'X';
    setBoard(newBoard);

    const winCheck = checkWinner(newBoard);
    if (winCheck) {
      handleGameEnd(winCheck);
      return;
    }

    setIsPlayerTurn(false);
  };

  // AI Move logic (Simple logic: checks to win, block block, or random)
  useEffect(() => {
    if (isPlayerTurn || winner) return;

    const getBestMove = () => {
      // 1. Try to win
      for (let i = 0; i < 9; i++) {
        if (!board[i]) {
          const testBoard = [...board];
          testBoard[i] = 'O';
          if (checkWinner(testBoard) === 'O') return i;
        }
      }
      // 2. Block player
      for (let i = 0; i < 9; i++) {
        if (!board[i]) {
          const testBoard = [...board];
          testBoard[i] = 'X';
          if (checkWinner(testBoard) === 'X') return i;
        }
      }
      // 3. Center
      if (!board[4]) return 4;
      // 4. Random empty space
      const empties = board.map((val, idx) => val === null ? idx : null).filter(v => v !== null);
      return empties[Math.floor(Math.random() * empties.length)];
    };

    const timer = setTimeout(() => {
      const aiIdx = getBestMove();
      if (aiIdx !== undefined) {
        const newBoard = [...board];
        newBoard[aiIdx] = 'O';
        setBoard(newBoard);
        
        const winCheck = checkWinner(newBoard);
        if (winCheck) {
          handleGameEnd(winCheck);
        } else {
          setIsPlayerTurn(true);
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [isPlayerTurn, board, winner]);

  const handleGameEnd = (result) => {
    setWinner(result);
    if (result === 'X') {
      triggerWin();
      const newWins = stats.wins + 1;
      localStorage.setItem('tttWins', newWins);
      setStats({ wins: newWins });
    }
  };

  const restartGame = () => {
    setBoard(Array(9).fill(null));
    setWinner(null);
    setIsPlayerTurn(true);
  };

  return (
    <div className="max-w-md mx-auto text-center">
      <div className="flex justify-between items-center mb-6 text-sm max-w-xs mx-auto">
        <span className="text-gray-500 dark:text-gray-400">Wins vs AI: <strong>{stats.wins}</strong></span>
        <button onClick={restartGame} className="p-2 rounded bg-gray-100 dark:bg-cafe-chocolate/40 hover:bg-cafe-gold/20 text-gray-700 dark:text-gray-200">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 w-64 h-64 mx-auto mb-6">
        {board.map((cell, idx) => (
          <button
            key={idx}
            onClick={() => handlePlayerMove(idx)}
            className={`w-full h-full text-4xl font-extrabold rounded-xl border flex items-center justify-center transition-all ${
              cell === 'X' 
                ? 'bg-cafe-wood/5 text-cafe-wood dark:text-cafe-gold border-cafe-gold/20' 
                : cell === 'O' 
                ? 'bg-red-500/5 text-red-500 border-red-500/20' 
                : 'bg-white border-gray-100 dark:bg-cafe-chocolate/20 dark:border-cafe-wood/20 hover:bg-cafe-gold/10'
            }`}
          >
            {cell}
          </button>
        ))}
      </div>

      {winner && (
        <div className="font-bold flex items-center justify-center gap-1.5 text-lg">
          {winner === 'X' && (
            <span className="text-green-500 dark:text-green-400 flex items-center gap-1">
              <CheckCircle className="w-5 h-5" /> You Won!
            </span>
          )}
          {winner === 'O' && (
            <span className="text-red-500 dark:text-red-400 flex items-center gap-1">
              <XCircle className="w-5 h-5" /> AI Won! Try again.
            </span>
          )}
          {winner === 'Draw' && <span className="text-gray-500">It's a Draw!</span>}
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   3. NUMBER SLIDING PUZZLE
   ========================================================================== */
function NumberPuzzleGame({ triggerWin }) {
  const goal = [1, 2, 3, 4, 5, 6, 7, 8, ''];
  const [board, setBoard] = useState([]);
  const [moves, setMoves] = useState(0);
  const [solved, setSolved] = useState(false);
  const [bestScore, setBestScore] = useState(() => localStorage.getItem('bestPuzzleMoves') || '-');

  const isSolvable = (arr) => {
    let inversions = 0;
    const nums = arr.filter(n => n !== '');
    for (let i = 0; i < nums.length; i++) {
      for (let j = i + 1; j < nums.length; j++) {
        if (nums[i] > nums[j]) inversions++;
      }
    }
    return inversions % 2 === 0;
  };

  const initGame = () => {
    let arr;
    do {
      arr = [1, 2, 3, 4, 5, 6, 7, 8, '']
        .sort(() => Math.random() - 0.5);
    } while (!isSolvable(arr) || arr.every((v, i) => v === goal[i])); // Solvable and not already solved
    
    setBoard(arr);
    setMoves(0);
    setSolved(false);
  };

  useEffect(() => {
    initGame();
  }, []);

  const moveTile = (idx) => {
    if (solved) return;
    const emptyIdx = board.indexOf('');
    const row = Math.floor(idx / 3);
    const col = idx % 3;
    const emptyRow = Math.floor(emptyIdx / 3);
    const emptyCol = emptyIdx % 3;

    // Check adjacency (left, right, up, down)
    const isAdjacent = (Math.abs(row - emptyRow) + Math.abs(col - emptyCol)) === 1;

    if (isAdjacent) {
      const newBoard = [...board];
      newBoard[emptyIdx] = board[idx];
      newBoard[idx] = '';
      setBoard(newBoard);
      setMoves(prev => prev + 1);

      // Check win condition
      if (newBoard.every((val, i) => val === goal[i])) {
        setSolved(true);
        triggerWin();
        const currentBest = localStorage.getItem('bestPuzzleMoves');
        const currentMoves = moves + 1;
        if (!currentBest || currentMoves < parseInt(currentBest, 10)) {
          localStorage.setItem('bestPuzzleMoves', currentMoves);
          setBestScore(currentMoves);
        }
      }
    }
  };

  return (
    <div className="max-w-md mx-auto text-center">
      <div className="flex justify-between items-center mb-6 text-sm max-w-xs mx-auto">
        <span className="text-gray-500 dark:text-gray-400">Moves: <strong>{moves}</strong></span>
        <span className="text-gray-500 dark:text-gray-400">Best: <strong>{bestScore} moves</strong></span>
        <button onClick={initGame} className="p-2 rounded bg-gray-100 dark:bg-cafe-chocolate/40 hover:bg-cafe-gold/20 text-gray-700 dark:text-gray-200">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2.5 w-60 h-60 mx-auto mb-6">
        {board.map((cell, idx) => (
          <button
            key={idx}
            onClick={() => moveTile(idx)}
            className={`w-full h-full text-3xl font-extrabold rounded-xl border flex items-center justify-center transition-all ${
              cell === '' 
                ? 'bg-transparent border-transparent cursor-default' 
                : 'bg-white border-gray-100 dark:bg-cafe-chocolate/20 dark:border-cafe-wood/20 hover:bg-cafe-gold/15 dark:text-white shadow-sm'
            }`}
          >
            {cell}
          </button>
        ))}
      </div>

      {solved && (
        <div className="text-green-500 dark:text-green-400 font-bold flex items-center justify-center gap-1.5 text-lg">
          <CheckCircle className="w-5 h-5" /> Completed in {moves} moves!
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   4. EMOJI QUIZ GAME
   ========================================================================== */
function EmojiQuizGame({ triggerWin }) {
  const quiz = [
    { emojis: '☕ + 🧊', options: ['Hot Mocha', 'Cold Brew', 'Lemon Tea'], correct: 'Cold Brew' },
    { emojis: '🥐 + ☕', options: ['Parisian Combo', 'Dessert Box', 'Choc Shake'], correct: 'Parisian Combo' },
    { emojis: '🍵 + 🥛 + 🧊', options: ['Matcha Latte', 'Green Mojito', 'Latte Macchiato'], correct: 'Matcha Latte' },
    { emojis: '🍫 + 🥛 + ☕', options: ['Americano', 'Caffé Mocha', 'Espresso Macchiato'], correct: 'Caffé Mocha' },
    { emojis: '🍋 + 🥤', options: ['Lemon Tea', 'Lemonade', 'Espresso Tonic'], correct: 'Lemonade' }
  ];

  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [gameFinished, setGameFinished] = useState(false);

  const handleAnswer = (option) => {
    setSelectedOpt(option);
    if (option === quiz[currentIdx].correct) {
      setScore(prev => prev + 1);
    }

    setTimeout(() => {
      setSelectedOpt(null);
      if (currentIdx + 1 < quiz.length) {
        setCurrentIdx(prev => prev + 1);
      } else {
        setGameFinished(true);
        triggerWin();
      }
    }, 1200);
  };

  const restartQuiz = () => {
    setCurrentIdx(0);
    setScore(0);
    setSelectedOpt(null);
    setGameFinished(false);
  };

  return (
    <div className="max-w-md mx-auto text-center">
      {!gameFinished ? (
        <div className="space-y-6">
          <div>
            <span className="text-xs font-semibold text-cafe-gold uppercase tracking-widest block mb-1">
              Emoji Question {currentIdx + 1} of {quiz.length}
            </span>
            <div className="text-5xl font-bold py-6 bg-cafe-gold/5 dark:bg-cafe-chocolate/10 border border-dashed border-cafe-gold/25 rounded-2xl">
              {quiz[currentIdx].emojis}
            </div>
          </div>

          <div className="space-y-3">
            {quiz[currentIdx].options.map(opt => {
              let btnStyle = 'border-gray-200 dark:border-cafe-wood/20 hover:border-cafe-gold';
              if (selectedOpt) {
                if (opt === quiz[currentIdx].correct) {
                  btnStyle = 'bg-green-500 border-green-500 text-white';
                } else if (opt === selectedOpt) {
                  btnStyle = 'bg-red-500 border-red-500 text-white';
                }
              }
              return (
                <button
                  key={opt}
                  disabled={!!selectedOpt}
                  onClick={() => handleAnswer(opt)}
                  className={`w-full py-3.5 px-4 rounded-xl border text-sm font-medium transition ${btnStyle}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="py-6">
          <Award className="w-16 h-16 text-cafe-gold mx-auto mb-3 animate-bounce-subtle" />
          <h4 className="font-serif text-xl font-bold dark:text-white mb-2">Quiz Completed!</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            You scored <strong className="text-cafe-wood dark:text-cafe-gold">{score} out of {quiz.length}</strong> correct guesses!
          </p>
          <button
            onClick={restartQuiz}
            className="px-6 py-3 bg-cafe-wood text-white dark:bg-cafe-gold dark:text-cafe-chocolate rounded-xl font-bold hover:bg-cafe-chocolate dark:hover:bg-cafe-darkgold hover:scale-102 transition"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   5. QUICK TRIVIA QUIZ GAME
   ========================================================================== */
function TriviaGame({ triggerWin }) {
  const trivia = [
    { q: "Which country is credited with the invention of the espresso machine?", options: ["Ethiopia", "Italy", "Brazil", "France"], correct: "Italy" },
    { q: "What kind of tea leaves are ground into fine powder to make matcha?", options: ["Assam", "Oolong", "Tencha", "Darjeeling"], correct: "Tencha" },
    { q: "What is the name of the chemical compound that gives coffee its stimulant properties?", options: ["Caffeine", "Nicotine", "Teanine", "Serotonin"], correct: "Caffeine" },
    { q: "What is the primary ingredient in falafel and hummus?", options: ["Lentils", "Soybeans", "Chickpeas", "Kidney Beans"], correct: "Chickpeas" },
    { q: "Which type of milk is traditionally used to make a flat white?", options: ["Almond Milk", "Skimmed Milk", "Microfoamed Whole Milk", "Condensed Milk"], correct: "Microfoamed Whole Milk" }
  ];

  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [gameFinished, setGameFinished] = useState(false);

  const handleAnswer = (option) => {
    setSelectedOpt(option);
    if (option === trivia[currentIdx].correct) {
      setScore(prev => prev + 1);
    }

    setTimeout(() => {
      setSelectedOpt(null);
      if (currentIdx + 1 < trivia.length) {
        setCurrentIdx(prev => prev + 1);
      } else {
        setGameFinished(true);
        triggerWin();
      }
    }, 1200);
  };

  const restartQuiz = () => {
    setCurrentIdx(0);
    setScore(0);
    setSelectedOpt(null);
    setGameFinished(false);
  };

  return (
    <div className="max-w-md mx-auto text-center">
      {!gameFinished ? (
        <div className="space-y-6">
          <div className="text-left">
            <span className="text-xs font-semibold text-cafe-gold uppercase tracking-widest block mb-2 text-center md:text-left">
              Trivia Question {currentIdx + 1} of {trivia.length}
            </span>
            <h4 className="font-serif text-lg font-bold text-gray-800 dark:text-white leading-snug">
              {trivia[currentIdx].q}
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {trivia[currentIdx].options.map(opt => {
              let btnStyle = 'border-gray-200 dark:border-cafe-wood/20 hover:border-cafe-gold bg-white dark:bg-cafe-chocolate/20 text-gray-700 dark:text-gray-200';
              if (selectedOpt) {
                if (opt === trivia[currentIdx].correct) {
                  btnStyle = 'bg-green-500 border-green-500 text-white';
                } else if (opt === selectedOpt) {
                  btnStyle = 'bg-red-500 border-red-500 text-white';
                }
              }
              return (
                <button
                  key={opt}
                  disabled={!!selectedOpt}
                  onClick={() => handleAnswer(opt)}
                  className={`w-full py-4 px-4 rounded-xl border text-sm font-medium transition ${btnStyle}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="py-6">
          <Trophy className="w-16 h-16 text-cafe-gold mx-auto mb-3 animate-bounce-subtle" />
          <h4 className="font-serif text-xl font-bold dark:text-white mb-2">Trivia Completed!</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            You scored <strong className="text-cafe-wood dark:text-cafe-gold">{score} out of {trivia.length}</strong> correct answers!
          </p>
          <button
            onClick={restartQuiz}
            className="px-6 py-3 bg-cafe-wood text-white dark:bg-cafe-gold dark:text-cafe-chocolate rounded-xl font-bold hover:bg-cafe-chocolate dark:hover:bg-cafe-darkgold hover:scale-102 transition"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}
