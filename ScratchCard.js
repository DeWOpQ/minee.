import React, { useRef, useEffect, useState } from 'react';

const ScratchCard = ({ onReveal, revealed, multiplier }) => {
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
      {revealed && (
        <div className="revealed-content">
          <span className="multiplier-text">{multiplier}</span>
        </div>
      )}
      <div 
        className="scratch-progress" 
        style={{ width: `${scratchedPixels}%` }} 
      />
    </div>
  );
};

export default ScratchCard; 