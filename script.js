// ===== GAME STATE =====
const gameState = {
  sequence: [],
  playerSequence: [],
  score: 0,
  highScores: {
    easy: 0,
    normal: 0,
    hard: 0,
    insane: 0,
    daily: 0
  },
  isPlaying: false,
  isWatching: false,
  round: 0,
  isMuted: false,
  difficulty: 'easy',
  combo: 0,
  maxCombo: 0,
  isDailyChallenge: false,
  dailySeed: null,
  timeouts: [] // Track timeouts to clear them
};

// Difficulty settings
const difficultySettings = {
  easy: { baseDelay: 800, speedIncrease: 10, maxSpeedIncrease: 200 },
  normal: { baseDelay: 600, speedIncrease: 20, maxSpeedIncrease: 300 },
  hard: { baseDelay: 450, speedIncrease: 30, maxSpeedIncrease: 350 },
  insane: { baseDelay: 300, speedIncrease: 40, maxSpeedIncrease: 250 }
};

// ===== DOM ELEMENTS =====
const pads = {
  red: document.getElementById('pad-red'),
  blue: document.getElementById('pad-blue'),
  green: document.getElementById('pad-green'),
  yellow: document.getElementById('pad-yellow')
};

const currentScoreEl = document.getElementById('current-score');
const highScoreEl = document.getElementById('high-score');
const comboDisplayEl = document.getElementById('combo-display');
const comboValueEl = document.getElementById('combo-value');
const startBtn = document.getElementById('start-btn');
const gameStatusEl = document.getElementById('game-status');
const gameOverModal = document.getElementById('game-over-modal');
const finalScoreEl = document.getElementById('final-score');
const playAgainBtn = document.getElementById('play-again-btn');
const closeGameOverBtn = document.getElementById('close-game-over');

// Leaderboard elements
const leaderboardBtn = document.getElementById('leaderboard-btn');
const leaderboardModal = document.getElementById('leaderboard-modal');
const closeLeaderboardBtn = document.getElementById('close-leaderboard');
const leaderboardList = document.getElementById('leaderboard-list');
const nameModal = document.getElementById('name-modal');
const playerNameInput = document.getElementById('player-name-input');
const submitNameBtn = document.getElementById('submit-name-btn');
const soundToggleBtn = document.getElementById('sound-toggle');
const difficultyBtns = document.querySelectorAll('.difficulty-btn');
const themeToggleBtn = document.getElementById('theme-toggle');
const themeModal = document.getElementById('theme-modal');
const closeThemeBtn = document.getElementById('close-theme');
const themeOptions = document.querySelectorAll('.theme-option');
const dailyChallengeBtn = document.getElementById('daily-challenge-btn');

// ===== FIREBASE CONFIGURATION =====
const firebaseConfig = {
  apiKey: "AIzaSyDEdrGKf7ePa0qzxSVHdc2bUFhYcRXrymw",
  authDomain: "memory-color-game.firebaseapp.com",
  databaseURL: "https://memory-color-game-default-rtdb.firebaseio.com",
  projectId: "memory-color-game",
  storageBucket: "memory-color-game.firebasestorage.app",
  messagingSenderId: "68555277764",
  appId: "1:68555277764:web:46cba175845af603165091",
  measurementId: "G-Z1M1NG5PPV"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// ===== AUDIO CONTEXT =====
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioContext = new AudioContext();

// Sound frequencies for each color
const frequencies = {
  red: 329.63,    // E4
  blue: 392.00,   // G4
  green: 523.25,  // C5
  yellow: 659.25  // E5
};

// ===== AUDIO FUNCTIONS =====
function playSound(color, duration = 300) {
  if (gameState.isMuted) return;

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = frequencies[color];
  oscillator.type = 'sine';

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration / 1000);
}

function playErrorSound() {
  if (gameState.isMuted) return;

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = 100;
  oscillator.type = 'sawtooth';

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.3);
}

function playSuccessSound() {
  if (gameState.isMuted) return;

  [329.63, 392.00, 523.25].forEach((freq, index) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = freq;
    oscillator.type = 'sine';

    const startTime = audioContext.currentTime + (index * 0.1);
    gainNode.gain.setValueAtTime(0.2, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);

    oscillator.start(startTime);
    oscillator.stop(startTime + 0.2);
  });
}

// ===== VISUAL FEEDBACK =====
function lightUpPad(color, duration = 300) {
  const pad = pads[color];
  pad.classList.add('active');
  playSound(color, duration);

  setTimeout(() => {
    pad.classList.remove('active');
  }, duration);
}

function disablePads() {
  Object.values(pads).forEach(pad => {
    pad.classList.add('disabled');
  });
}

function enablePads() {
  Object.values(pads).forEach(pad => {
    pad.classList.remove('disabled');
  });
}

// ===== GAME LOGIC =====
function updateScore() {
  currentScoreEl.textContent = gameState.score;

  // Determine the current category (difficulty or daily)
  const category = gameState.isDailyChallenge ? 'daily' : gameState.difficulty;

  if (gameState.score > gameState.highScores[category]) {
    gameState.highScores[category] = gameState.score;
    highScoreEl.textContent = gameState.highScores[category];
    localStorage.setItem('colorMemoryHighScores', JSON.stringify(gameState.highScores));
  }
}

// Update high score display when switching difficulties
function updateHighScoreDisplay() {
  const category = gameState.isDailyChallenge ? 'daily' : gameState.difficulty;
  highScoreEl.textContent = gameState.highScores[category];
}

// Clear all pending timeouts
function clearTimeouts() {
  gameState.timeouts.forEach(timeoutId => clearTimeout(timeoutId));
  gameState.timeouts = [];
}

function updateStatus(message, className = '') {
  gameStatusEl.textContent = message;
  gameStatusEl.className = 'game-status ' + className;
}

function updateCombo(increment = true) {
  if (increment) {
    gameState.combo++;

    // Update max combo
    if (gameState.combo > gameState.maxCombo) {
      gameState.maxCombo = gameState.combo;
    }

    // Show combo display
    if (gameState.combo >= 3) {
      comboDisplayEl.classList.add('active');
      comboValueEl.textContent = gameState.combo;

      // Add mega animation for high combos
      if (gameState.combo >= 5) {
        comboDisplayEl.classList.add('mega');
        setTimeout(() => comboDisplayEl.classList.remove('mega'), 600);
      }
    }
  } else {
    // Reset combo
    gameState.combo = 0;
    comboDisplayEl.classList.remove('active');
    comboValueEl.textContent = '0';
  }
}

function getComboBonus() {
  // Bonus points based on combo
  if (gameState.combo >= 10) return 3;
  if (gameState.combo >= 5) return 2;
  if (gameState.combo >= 3) return 1;
  return 0;
}

// ===== DAILY CHALLENGE FUNCTIONS =====
function getTodaySeed() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  return `${year}-${month}-${day}`;
}

function seededRandom(seed) {
  // Simple seeded random number generator
  let value = 0;
  for (let i = 0; i < seed.length; i++) {
    value = ((value << 5) - value) + seed.charCodeAt(i);
    value = value | 0; // Convert to 32-bit integer
  }
  return function () {
    value = (value * 9301 + 49297) % 233280;
    return Math.abs(value / 233280); // Ensure positive value
  };
}

function getSeededColor(rng) {
  const colors = ['red', 'blue', 'green', 'yellow'];
  return colors[Math.floor(rng() * colors.length)];
}

function getRandomColor() {
  if (gameState.isDailyChallenge && gameState.dailySeed) {
    // For daily challenge, use a progression of seeds to ensure different sequence each round
    // but consistent for everyone on that day
    const rng = seededRandom(gameState.dailySeed + '-' + gameState.sequence.length);
    return getSeededColor(rng);
  }
  const colors = ['red', 'blue', 'green', 'yellow'];
  return colors[Math.floor(Math.random() * colors.length)];
}

async function playSequence() {
  gameState.isWatching = true;
  disablePads();
  updateStatus('Watch the sequence...', 'watching');

  // Add new color to sequence
  gameState.sequence.push(getRandomColor());
  gameState.round++;

  // Delay before starting
  await sleep(500);

  // Play each color in sequence
  for (let i = 0; i < gameState.sequence.length; i++) {
    const color = gameState.sequence[i];

    // Calculate speed - gets faster as rounds progress, based on difficulty
    const settings = difficultySettings[gameState.difficulty];
    const speedIncrease = Math.min(gameState.round * settings.speedIncrease, settings.maxSpeedIncrease);
    const delay = settings.baseDelay - speedIncrease;

    lightUpPad(color, delay * 0.5);
    await sleep(delay);
  }

  // Ready for player input
  gameState.isWatching = false;
  gameState.playerSequence = [];
  enablePads();
  updateStatus('Your turn! Repeat the sequence', 'playing');
}

function handlePlayerInput(color) {
  if (gameState.isWatching || !gameState.isPlaying) return;

  // Light up the pad
  lightUpPad(color, 200);

  // Add to player sequence
  gameState.playerSequence.push(color);

  // Check if correct
  const currentIndex = gameState.playerSequence.length - 1;

  if (gameState.playerSequence[currentIndex] !== gameState.sequence[currentIndex]) {
    // Wrong color - game over
    updateCombo(false); // Reset combo
    gameOver();
    return;
  }

  // Check if sequence is complete
  if (gameState.playerSequence.length === gameState.sequence.length) {
    // Correct sequence!
    const bonus = getComboBonus();
    gameState.score += 1 + bonus;
    updateCombo(true); // Increment combo
    updateScore();

    disablePads();

    // Show bonus message if applicable
    if (bonus > 0) {
      updateStatus(`Correct! +${1 + bonus} points (${bonus} combo bonus) 🔥`, 'watching');
    } else {
      updateStatus('Correct! Get ready...', 'watching');
    }

    // Add success animation
    Object.values(pads).forEach(pad => {
      pad.classList.add('success');
    });

    playSuccessSound();

    setTimeout(() => {
      Object.values(pads).forEach(pad => {
        pad.classList.remove('success');
      });
      playSequence();
    }, 1500);
  }
}

function gameOver() {
  gameState.isPlaying = false;
  disablePads();
  updateStatus('Game Over!', 'error');
  playErrorSound();

  // Shake animation
  gameStatusEl.classList.add('error');

  // Check if score qualifies for leaderboard
  checkIfHighScore(gameState.score);
}

function startGame() {
  // Clear any pending timeouts first
  clearTimeouts();

  // Reset game state
  gameState.sequence = [];
  gameState.playerSequence = [];
  gameState.score = 0;
  gameState.isPlaying = true;
  gameState.isWatching = false;
  gameState.round = 0;
  gameState.isDailyChallenge = false; // Reset daily challenge flag

  updateScore();
  updateCombo(false);

  startBtn.disabled = true;
  startBtn.innerHTML = '<span>Playing...</span>';
  dailyChallengeBtn.disabled = true;

  toggleDifficultyButtons(true);

  // Start first round
  playSequence();
}

function resetGame() {
  // Clear any pending timeouts to prevent hangs
  clearTimeouts();

  gameOverModal.classList.remove('show');
  nameModal.classList.remove('show');
  startBtn.disabled = false;
  startBtn.innerHTML = '<span>Start Game</span>';
  dailyChallengeBtn.disabled = false;
  gameState.isDailyChallenge = false;
  gameState.isPlaying = false;
  gameState.isWatching = false;

  toggleDifficultyButtons(false);
  updateStatus('Press Start to Begin', '');
  enablePads();
}

function startDailyChallenge() {
  // Clear any pending timeouts first
  clearTimeouts();

  gameState.isDailyChallenge = true;
  gameState.dailySeed = getTodaySeed();

  // Reset game state
  gameState.sequence = [];
  gameState.playerSequence = [];
  gameState.score = 0;
  gameState.isPlaying = true;
  gameState.isWatching = false;
  gameState.round = 0;
  gameState.combo = 0;
  gameState.maxCombo = 0;

  // Daily Challenge is always on "Hard" or "Insane" speed to make it challenging
  // but we store the original difficulty to restore it later
  gameState.originalDifficulty = gameState.difficulty;
  gameState.difficulty = 'hard';

  updateScore();
  updateCombo(false);
  updateHighScoreDisplay();
  startBtn.disabled = true;
  dailyChallengeBtn.disabled = true;

  toggleDifficultyButtons(true);
  updateStatus(`Daily Challenge: ${gameState.dailySeed} (Hard Mode)`, 'watching');

  // Start first round
  playSequence();
}

// ===== UTILITY FUNCTIONS =====
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== LEADERBOARD FUNCTIONS =====
async function submitScore(name, score, category) {
  try {
    const leaderboardRef = database.ref(`leaderboard/${category}`);
    await leaderboardRef.push({
      name: name.trim(),
      score: score,
      timestamp: Date.now()
    });
    return true;
  } catch (error) {
    console.error('Error submitting score:', error);
    return false;
  }
}

async function fetchLeaderboard(category = 'easy') {
  try {
    const leaderboardRef = database.ref(`leaderboard/${category}`);
    const snapshot = await leaderboardRef.orderByChild('score').limitToLast(10).once('value');

    const scores = [];
    snapshot.forEach((childSnapshot) => {
      scores.push({
        id: childSnapshot.key,
        ...childSnapshot.val()
      });
    });

    // Sort by score descending
    return scores.sort((a, b) => b.score - a.score);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
}

async function checkIfHighScore(score) {
  // Determine the current category
  const category = gameState.isDailyChallenge ? 'daily' : gameState.difficulty;
  const leaderboard = await fetchLeaderboard(category);

  // Check if score qualifies for top 10
  const qualifies = leaderboard.length < 10 || score > leaderboard[leaderboard.length - 1].score;

  if (qualifies && score > 0) {
    // Show name input modal
    const t = setTimeout(() => {
      nameModal.classList.add('show');
      playerNameInput.value = '';
      playerNameInput.focus();
    }, 1000);
    gameState.timeouts.push(t);
  } else {
    // Show regular game over modal
    const t = setTimeout(() => {
      finalScoreEl.textContent = score;
      gameOverModal.classList.add('show');
    }, 1000);
    gameState.timeouts.push(t);
  }
}

// Current leaderboard category
let currentLeaderboardCategory = 'easy';

async function showLeaderboard(category = null) {
  // Use provided category or current difficulty
  if (category) {
    currentLeaderboardCategory = category;
  } else {
    currentLeaderboardCategory = gameState.isDailyChallenge ? 'daily' : gameState.difficulty;
  }

  leaderboardModal.classList.add('show');
  leaderboardList.innerHTML = '<div class="loading">Loading scores...</div>';

  // Update active category button
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.category === currentLeaderboardCategory);
  });

  const scores = await fetchLeaderboard(currentLeaderboardCategory);

  if (scores.length === 0) {
    leaderboardList.innerHTML = '<div class="no-scores">No scores yet. Be the first!</div>';
    return;
  }

  // Render leaderboard entries
  leaderboardList.innerHTML = scores.map((entry, index) => {
    const rank = index + 1;
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
    const rankClass = `rank-${rank}`;

    return `
      <div class="leaderboard-entry ${rank <= 3 ? rankClass : ''}">
        <div class="rank-badge ${medal ? 'medal' : ''}">${medal || rank}</div>
        <div class="player-info">
          <div class="player-name">${escapeHtml(entry.name)}</div>
        </div>
        <div class="player-score">${entry.score}</div>
      </div>
    `;
  }).join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function handleNameSubmit() {
  const name = playerNameInput.value.trim();

  if (!name) {
    playerNameInput.style.borderColor = 'rgba(255, 107, 107, 0.5)';
    setTimeout(() => {
      playerNameInput.style.borderColor = '';
    }, 500);
    return;
  }

  // Determine the current category
  const category = gameState.isDailyChallenge ? 'daily' : gameState.difficulty;

  // Submit score to Firebase with category
  const success = await submitScore(name, gameState.score, category);

  if (success) {
    // Close name modal
    nameModal.classList.remove('show');

    // Show game over modal
    finalScoreEl.textContent = gameState.score;
    gameOverModal.classList.add('show');

    // Show leaderboard after delay, then reset game state
    const t = setTimeout(() => {
      gameOverModal.classList.remove('show');
      showLeaderboard(category);
      // Reset game state so player can start a new game
      resetGame();
    }, 2000);
    gameState.timeouts.push(t);
  }
}

// ===== EVENT LISTENERS =====
Object.entries(pads).forEach(([color, pad]) => {
  pad.addEventListener('click', () => {
    if (gameState.isPlaying) {
      handlePlayerInput(color);
    } else {
      // Play sound even if not playing the game (Feedback requested)
      lightUpPad(color, 200);
    }
  });

  // Add hover sound effect (only when not playing)
  pad.addEventListener('mouseenter', () => {
    if (gameState.isMuted) return;
    if (gameState.isPlaying) return; // No sounds during active gameplay

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequencies[color];
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  });
});

startBtn.addEventListener('click', startGame);
playAgainBtn.addEventListener('click', () => {
  resetGame();
  startGame();
});

dailyChallengeBtn.addEventListener('click', startDailyChallenge);

closeGameOverBtn.addEventListener('click', () => {
  resetGame();
});

// Leaderboard event listeners
leaderboardBtn.addEventListener('click', showLeaderboard);
closeLeaderboardBtn.addEventListener('click', () => {
  leaderboardModal.classList.remove('show');
});

// Category button event listeners
document.querySelectorAll('.category-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const category = btn.dataset.category;
    showLeaderboard(category);
  });
});

submitNameBtn.addEventListener('click', handleNameSubmit);

playerNameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    handleNameSubmit();
  }
});

// Close modals when clicking outside
leaderboardModal.addEventListener('click', (e) => {
  if (e.target === leaderboardModal) {
    leaderboardModal.classList.remove('show');
  }
});

// Sound toggle
function toggleSound() {
  gameState.isMuted = !gameState.isMuted;
  soundToggleBtn.classList.toggle('muted', gameState.isMuted);
  localStorage.setItem('colorMemorySoundMuted', gameState.isMuted);
}

soundToggleBtn.addEventListener('click', toggleSound);

// Difficulty selection
function selectDifficulty(difficulty) {
  if (gameState.isPlaying) return; // Can't change during game

  gameState.difficulty = difficulty;
  localStorage.setItem('colorMemoryDifficulty', difficulty);

  // Update button states
  difficultyBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.difficulty === difficulty);
  });

  // Update high score display when switching difficulties
  updateHighScoreDisplay();
}

difficultyBtns.forEach(btn => {
  btn.addEventListener('click', () => selectDifficulty(btn.dataset.difficulty));
});

// Disable difficulty buttons during game
function toggleDifficultyButtons(disabled) {
  difficultyBtns.forEach(btn => {
    btn.disabled = disabled;
    if (disabled) {
      btn.style.opacity = '0.5';
      btn.style.cursor = 'not-allowed';
    } else {
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
    }
  });
}

// Theme selection
function selectTheme(theme) {
  // Remove all theme classes
  document.body.classList.remove('theme-dark', 'theme-light', 'theme-neon', 'theme-pastel');

  // Add selected theme class (dark is default, no class needed)
  if (theme !== 'dark') {
    document.body.classList.add(`theme-${theme}`);
  }

  // Save preference
  localStorage.setItem('colorMemoryTheme', theme);

  // Update button states
  themeOptions.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });
}

themeToggleBtn.addEventListener('click', () => {
  themeModal.classList.add('show');
});

closeThemeBtn.addEventListener('click', () => {
  themeModal.classList.remove('show');
});

themeOptions.forEach(btn => {
  btn.addEventListener('click', () => {
    selectTheme(btn.dataset.theme);
  });
});

// Close theme modal when clicking outside
themeModal.addEventListener('click', (e) => {
  if (e.target === themeModal) {
    themeModal.classList.remove('show');
  }
});

// ===== INITIALIZATION =====
function init() {
  // Load high scores from localStorage
  const savedHighScores = localStorage.getItem('colorMemoryHighScores');
  if (savedHighScores) {
    try {
      gameState.highScores = JSON.parse(savedHighScores);
    } catch (e) {
      console.error('Failed to parse high scores:', e);
    }
  }

  // Update high score display
  updateHighScoreDisplay();

  // Load sound preference
  const savedMuteState = localStorage.getItem('colorMemorySoundMuted');
  if (savedMuteState === 'true') {
    gameState.isMuted = true;
    soundToggleBtn.classList.add('muted');
  }

  // Load difficulty preference
  const savedDifficulty = localStorage.getItem('colorMemoryDifficulty');
  if (savedDifficulty && difficultySettings[savedDifficulty]) {
    selectDifficulty(savedDifficulty);
  }

  // Load theme preference
  const savedTheme = localStorage.getItem('colorMemoryTheme');
  if (savedTheme) {
    selectTheme(savedTheme);
  }

  // Resume AudioContext on first user interaction (browser requirement)
  document.addEventListener('click', () => {
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
  }, { once: true });

  // Register service worker for PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('Service Worker registered'))
      .catch((err) => console.log('Service Worker registration failed:', err));
  }
}

init();
