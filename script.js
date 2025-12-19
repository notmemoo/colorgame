// ===== GAME STATE =====
const gameState = {
  sequence: [],
  playerSequence: [],
  score: 0,
  highScore: 0,
  isPlaying: false,
  isWatching: false,
  round: 0
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
const startBtn = document.getElementById('start-btn');
const gameStatusEl = document.getElementById('game-status');
const gameOverModal = document.getElementById('game-over-modal');
const finalScoreEl = document.getElementById('final-score');
const playAgainBtn = document.getElementById('play-again-btn');

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
  
  if (gameState.score > gameState.highScore) {
    gameState.highScore = gameState.score;
    highScoreEl.textContent = gameState.highScore;
    localStorage.setItem('colorMemoryHighScore', gameState.highScore);
  }
}

function updateStatus(message, className = '') {
  gameStatusEl.textContent = message;
  gameStatusEl.className = 'game-status ' + className;
}

function getRandomColor() {
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
    
    // Calculate speed - gets faster as rounds progress
    const baseDelay = 600;
    const speedIncrease = Math.min(gameState.round * 20, 300);
    const delay = baseDelay - speedIncrease;
    
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
    gameOver();
    return;
  }
  
  // Check if sequence is complete
  if (gameState.playerSequence.length === gameState.sequence.length) {
    // Correct sequence!
    gameState.score++;
    updateScore();
    
    disablePads();
    updateStatus('Correct! Get ready...', 'watching');
    
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
  
  setTimeout(() => {
    finalScoreEl.textContent = gameState.score;
    gameOverModal.classList.add('show');
  }, 1000);
}

function startGame() {
  // Reset game state
  gameState.sequence = [];
  gameState.playerSequence = [];
  gameState.score = 0;
  gameState.isPlaying = true;
  gameState.isWatching = false;
  gameState.round = 0;
  
  updateScore();
  startBtn.disabled = true;
  startBtn.innerHTML = '<span>Playing...</span>';
  
  // Start first round
  playSequence();
}

function resetGame() {
  gameOverModal.classList.remove('show');
  startBtn.disabled = false;
  startBtn.innerHTML = '<span>Start Game</span>';
  updateStatus('Press Start to Begin', '');
  enablePads();
}

// ===== UTILITY FUNCTIONS =====
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== EVENT LISTENERS =====
Object.entries(pads).forEach(([color, pad]) => {
  pad.addEventListener('click', () => handlePlayerInput(color));
  
  // Add hover sound effect
  pad.addEventListener('mouseenter', () => {
    if (!gameState.isWatching && gameState.isPlaying) {
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
    }
  });
});

startBtn.addEventListener('click', startGame);
playAgainBtn.addEventListener('click', () => {
  resetGame();
  startGame();
});

// ===== INITIALIZATION =====
function init() {
  // Load high score from localStorage
  const savedHighScore = localStorage.getItem('colorMemoryHighScore');
  if (savedHighScore) {
    gameState.highScore = parseInt(savedHighScore);
    highScoreEl.textContent = gameState.highScore;
  }
  
  // Resume AudioContext on first user interaction (browser requirement)
  document.addEventListener('click', () => {
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
  }, { once: true });
}

init();
