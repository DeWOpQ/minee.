import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import PaymentGateway from './components/PaymentGateway';
import './components/PaymentGateway.css';

function ScratchCard({ onReveal, revealed, multiplier }) {
  const canvasRef = useRef(null);
  const [isScratching, setIsScratching] = useState(false);
  const [scratchedPixels, setScratchedPixels] = useState(0);
  const [lastPoint, setLastPoint] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Enhanced metallic gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#b0b0b0');
    gradient.addColorStop(0.5, '#888888');
    gradient.addColorStop(1, '#666666');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Improved metallic texture
    for (let i = 0; i < 3000; i++) {
      const alpha = Math.random() * 0.04;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        Math.random() * 4,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Enhanced sparkle effect
    for (let i = 0; i < 150; i++) {
      const size = Math.random() * 2;
      const alpha = Math.random() * 0.15;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        size,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }, []);

  const scratch = (e) => {
    if (!isScratching) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.globalCompositeOperation = 'destination-out';
    
    // Enhanced scratch effect
    const baseSize = 35;
    const randomSize = Math.random() * 5;
    const size = baseSize + randomSize;

    // Main scratch
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
    gradient.addColorStop(0, 'rgba(0,0,0,1)');
    gradient.addColorStop(0.5, 'rgba(0,0,0,0.8)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();

    // Smooth line between points
    if (lastPoint) {
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(x, y);
      ctx.lineWidth = size * 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.stroke();
    }
    setLastPoint({ x, y });

    // Scratch particles
    if (Math.random() < 0.4) {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.arc(
        x + (Math.random() - 0.5) * 30,
        y + (Math.random() - 0.5) * 30,
        Math.random() * 3,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Count scratched pixels
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const scratched = imageData.data.filter(x => x === 0).length / 4;
    const percentage = (scratched / (canvas.width * canvas.height)) * 100;
    setScratchedPixels(percentage);

    if (percentage > 40 && !revealed) {
      onReveal();
    }
  };

  const handleStart = () => {
    setIsScratching(true);
    setLastPoint(null);
  };

  const handleEnd = () => {
    setIsScratching(false);
    setLastPoint(null);
  };

  return (
    <div className="scratch-card-container">
      <canvas
        ref={canvasRef}
        width={200}
        height={200}
        onMouseDown={handleStart}
        onMouseUp={handleEnd}
        onMouseMove={scratch}
        onMouseLeave={handleEnd}
        onTouchStart={(e) => {
          e.preventDefault();
          handleStart();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          handleEnd();
        }}
        onTouchMove={(e) => {
          e.preventDefault();
          const touch = e.touches[0];
          scratch({
            clientX: touch.clientX,
            clientY: touch.clientY
          });
        }}
        style={{ display: revealed ? 'none' : 'block' }}
      />
      <div className="scratch-progress" style={{ width: `${scratchedPixels}%` }} />
    </div>
  );
}

function App() {
  const [balance, setBalance] = useState(1000);
  const [betAmount, setBetAmount] = useState('10');
  const [cards, setCards] = useState(Array(25).fill({ revealed: false, multiplier: '0.00x' }));
  const [selectedCard, setSelectedCard] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [gameStatus, setGameStatus] = useState('idle');
  const [showPopup, setShowPopup] = useState(false);
  const [message, setMessage] = useState('');
  const [gameStarted, setGameStarted] = useState(false);
  const [selectedMultiplier, setSelectedMultiplier] = useState('0.00x');
  const [scratchCardRevealed, setScratchCardRevealed] = useState(false);
  const [userId] = useState(() => localStorage.getItem('userId') || generateUserId());
  const MIN_WITHDRAWAL = 1000; // Minimum withdrawal amount

  // Revert to original multiplier system
  const multipliers = [
    { value: '0.00x', probability: 0.3, color: '#ff4444' },
    { value: '0.10x', probability: 0.2, color: '#ffbb33' },
    { value: '0.20x', probability: 0.15, color: '#00C851' },
    { value: '0.30x', probability: 0.15, color: '#33b5e5' },
    { value: '0.50x', probability: 0.1, color: '#aa66cc' },
    { value: '1.00x', probability: 0.05, color: '#ff8800' },
    { value: '2.00x', probability: 0.03, color: '#ff4444' },
    { value: '3.00x', probability: 0.02, color: '#ffd700' }
  ];

  const initializeGame = () => {
    if (!betAmount || parseFloat(betAmount) <= 0) {
      setMessage('Please enter a valid bet amount');
      return;
    }

    const currentBet = parseFloat(betAmount);
    const currentBalance = balance;

    if (currentBet > currentBalance || currentBalance <= 0) {
      setMessage('Insufficient balance');
      return;
    }

    // Deduct bet amount immediately when game starts
    const newBalance = currentBalance - currentBet;
    setBalance(Math.max(0, newBalance));

    const newCards = Array(25).fill(null).map(() => {
      const random = Math.random();
      let cumulativeProbability = 0;
      let selectedMultiplier = multipliers[0];

      for (const multiplier of multipliers) {
        cumulativeProbability += multiplier.probability;
        if (random <= cumulativeProbability) {
          selectedMultiplier = multiplier;
          break;
        }
      }

      return { 
        revealed: false, 
        multiplier: selectedMultiplier.value,
        color: selectedMultiplier.color
      };
    });

    setCards(newCards);
    setGameStarted(true);
    setGameStatus('playing');
    setSelectedCard(null);
    setMessage('');
  };

  const handleCardSelect = (index) => {
    if (gameStatus !== 'playing' || cards[index].revealed) return;
    
    setSelectedCard(index);
    setShowPopup(true);
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    setSelectedCard(null);
  };

  const resetGame = () => {
    setGameStarted(false);
    setGameStatus('idle');
    setCards(Array(25).fill({ revealed: false, multiplier: '0.00x' }));
    setSelectedMultiplier('0.00x');
    setSelectedCard(null);
    setMessage('');
    setBetAmount('10'); // Reset to default bet
    setShowPopup(false);
    setScratchCardRevealed(false);
  };

  const handleReveal = () => {
    if (selectedCard === null) return;

    const newCards = [...cards];
    newCards[selectedCard] = { ...newCards[selectedCard], revealed: true };
    setCards(newCards);

    const multiplier = parseFloat(newCards[selectedCard].multiplier);
    const betAmountValue = parseFloat(betAmount);
    
    setSelectedMultiplier(newCards[selectedCard].multiplier);
    setGameStatus('completed');
    setGameStarted(false);

    if (multiplier === 0) {
      // User loses - bet amount is already deducted when game started
      setMessage('😔 Better luck next time!');
    } else {
      // User wins - return bet amount + winning amount
      const winningAmount = betAmountValue * multiplier; // Calculate winning amount
      const totalReturn = betAmountValue + winningAmount; // Add bet amount back
      const newBalance = balance + totalReturn;
      setBalance(Math.max(0, newBalance));
      setMessage(`🎉 You Won ₹${totalReturn.toFixed(2)}! (Bet: ₹${betAmountValue.toFixed(2)} + Win: ₹${winningAmount.toFixed(2)})`);
    }

    setShowPopup(false);
    setSelectedCard(null);
    setScratchCardRevealed(false);
  };

  const handlePaymentSuccess = (amount) => {
    setBalance(prevBalance => prevBalance + amount);
    setShowPayment(false);
    setShowPopup(true);
    setMessage(`Successfully added ₹${amount.toLocaleString('en-IN')} to your balance!`);
    setTimeout(() => setShowPopup(false), 3000);
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-left">
          <h1>Scratch 2X</h1>
          <p className="balance">Balance: ₹{(Math.max(0, balance || 0)).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}</p>
        </div>
        <div className="header-right">
          <button 
            className="add-funds-btn"
            onClick={() => setShowPayment(true)}
          >
            Add Funds
          </button>
        </div>
      </header>

      {showPayment && (
        <div className="modal-overlay">
          <div className="modal">
            <PaymentGateway 
              onSuccess={handlePaymentSuccess} 
              onClose={() => setShowPayment(false)}
            />
          </div>
        </div>
      )}

      {message && <div className="message-popup">{message}</div>}

      <div className="game-container">
        <h1 className="game-title">Scratch & Win</h1>
        
        <div className="game-board">
          {cards.map((card, index) => (
            <div
              key={index}
              className={`card ${selectedCard === index ? 'selected' : ''} 
                ${card.revealed ? 'revealed' : ''} 
                ${!gameStarted ? 'disabled' : ''}`}
              onClick={() => handleCardSelect(index)}
            >
              {card.revealed ? (
                <div className="multiplier" style={{ color: card.color }}>
                  {card.multiplier}
                </div>
              ) : (
                <div className="card-cover" />
              )}
            </div>
          ))}
        </div>

        {/* Popup Card with Scratch Feature */}
        {showPopup && selectedCard !== null && (
          <div className="popup-overlay">
            <div className="popup-card">
              <button className="popup-close" onClick={handleClosePopup}>×</button>
              <div className="popup-content">
                <h3>Scratch to Reveal</h3>
                <ScratchCard
                  onReveal={handleReveal}
                  revealed={cards[selectedCard].revealed}
                  multiplier={cards[selectedCard].multiplier}
                />
              </div>
            </div>
          </div>
        )}

        {/* Controls Section */}
        <div className="controls-container">
          <div className="bet-controls">
            <div className="bet-input-group">
              <label htmlFor="bet">Bet Amount</label>
              <input
                type="text"
                id="bet"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder="0.00"
                className="bet-input"
                disabled={gameStarted}
              />
            </div>
            <div className="multiplier-input-group">
              <label htmlFor="multiplier">Current Multiplier</label>
              <input
                type="text"
                id="multiplier"
                value={selectedMultiplier}
                readOnly
                className="multiplier-input"
              />
            </div>
          </div>
          
          {gameStatus === 'completed' ? (
            <button 
              className="start-button play-again" 
              onClick={resetGame}
            >
              Play Again
            </button>
          ) : (
            <button 
              className="start-button" 
              onClick={initializeGame}
              disabled={!betAmount || parseFloat(betAmount) <= 0 || gameStarted}
            >
              {gameStarted ? 'Game In Progress' : 'Start Game'}
            </button>
          )}
        </div>

        {message && (
          <div className={`message-popup ${message.includes('Won') ? 'win' : 'lose'} slide-up`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

export default App; 