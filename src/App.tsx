import { useState, useRef, useCallback, useEffect } from 'react';
import './App.css';

type Tool = 'pencil' | 'eraser' | 'fill' | 'eyedropper';

const GRID_SIZES = [8, 16, 32, 64];

const DEFAULT_PALETTE = [
  '#000000', '#1d2b53', '#7e2553', '#008751',
  '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8',
  '#ff004d', '#ffa300', '#ffec27', '#00e436',
  '#29adff', '#83769c', '#ff77a8', '#ffccaa',
];

function App() {
  const [gridSize, setGridSize] = useState(16);
  const [pixels, setPixels] = useState<string[]>(() =>
    Array(16 * 16).fill('transparent')
  );
  const [currentColor, setCurrentColor] = useState('#ff004d');
  const [tool, setTool] = useState<Tool>('pencil');
  const [isDrawing, setIsDrawing] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);

  useEffect(() => {
    setPixels(Array(gridSize * gridSize).fill('transparent'));
  }, [gridSize]);

  const getPixelIndex = useCallback((x: number, y: number) => {
    return y * gridSize + x;
  }, [gridSize]);

  const floodFill = useCallback((startX: number, startY: number, targetColor: string, fillColor: string) => {
    if (targetColor === fillColor) return;

    const newPixels = [...pixels];
    const stack: [number, number][] = [[startX, startY]];
    const visited = new Set<string>();

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const key = `${x},${y}`;

      if (visited.has(key)) continue;
      if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) continue;

      const idx = getPixelIndex(x, y);
      if (newPixels[idx] !== targetColor) continue;

      visited.add(key);
      newPixels[idx] = fillColor;

      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    setPixels(newPixels);
  }, [pixels, gridSize, getPixelIndex]);

  const handlePixelInteraction = useCallback((x: number, y: number) => {
    const idx = getPixelIndex(x, y);

    if (tool === 'pencil') {
      setPixels(prev => {
        const next = [...prev];
        next[idx] = currentColor;
        return next;
      });
    } else if (tool === 'eraser') {
      setPixels(prev => {
        const next = [...prev];
        next[idx] = 'transparent';
        return next;
      });
    } else if (tool === 'fill') {
      floodFill(x, y, pixels[idx], currentColor);
    } else if (tool === 'eyedropper') {
      if (pixels[idx] !== 'transparent') {
        setCurrentColor(pixels[idx]);
        setTool('pencil');
      }
    }
  }, [tool, currentColor, getPixelIndex, floodFill, pixels]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, x: number, y: number) => {
    e.preventDefault();
    setIsDrawing(true);
    handlePixelInteraction(x, y);
  };

  const handleMouseEnter = (x: number, y: number) => {
    if (isDrawing && (tool === 'pencil' || tool === 'eraser')) {
      handlePixelInteraction(x, y);
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>, x: number, y: number) => {
    e.preventDefault();
    setIsDrawing(true);
    handlePixelInteraction(x, y);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDrawing || (tool !== 'pencil' && tool !== 'eraser')) return;

    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
    if (element?.dataset?.x && element?.dataset?.y) {
      const x = parseInt(element.dataset.x);
      const y = parseInt(element.dataset.y);
      handlePixelInteraction(x, y);
    }
  };

  const clearCanvas = () => {
    setPixels(Array(gridSize * gridSize).fill('transparent'));
  };

  const exportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = gridSize;
    canvas.height = gridSize;

    pixels.forEach((color, idx) => {
      const x = idx % gridSize;
      const y = Math.floor(idx / gridSize);
      if (color !== 'transparent') {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      }
    });

    const link = document.createElement('a');
    link.download = `pixel-art-${gridSize}x${gridSize}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const pixelSize = `calc((min(70vw, 70vh, 500px)) / ${gridSize})`;

  return (
    <div className="app" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      <div className="scanlines" />
      <div className="crt-flicker" />

      <header className="header">
        <h1 className="title">
          <span className="title-pixel">[</span>
          PIXEL<span className="title-accent">FORGE</span>
          <span className="title-pixel">]</span>
        </h1>
        <p className="subtitle">// RETRO ART STATION v1.0</p>
      </header>

      <main className="main-content">
        {/* Mobile Tools Toggle */}
        <button
          className="mobile-tools-toggle"
          onClick={() => setMobileToolsOpen(!mobileToolsOpen)}
        >
          {mobileToolsOpen ? '[-] TOOLS' : '[+] TOOLS'}
        </button>

        {/* Toolbar */}
        <aside className={`toolbar ${mobileToolsOpen ? 'toolbar-open' : ''}`}>
          <div className="tool-section">
            <h3 className="section-title">&gt; TOOLS</h3>
            <div className="tool-buttons">
              {[
                { id: 'pencil', icon: '/', label: 'DRAW' },
                { id: 'eraser', icon: 'X', label: 'ERASE' },
                { id: 'fill', icon: '#', label: 'FILL' },
                { id: 'eyedropper', icon: '?', label: 'PICK' },
              ].map((t) => (
                <button
                  key={t.id}
                  className={`tool-btn ${tool === t.id ? 'active' : ''}`}
                  onClick={() => setTool(t.id as Tool)}
                >
                  <span className="tool-icon">{t.icon}</span>
                  <span className="tool-label">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="tool-section">
            <h3 className="section-title">&gt; GRID</h3>
            <div className="grid-buttons">
              {GRID_SIZES.map((size) => (
                <button
                  key={size}
                  className={`grid-btn ${gridSize === size ? 'active' : ''}`}
                  onClick={() => setGridSize(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className="tool-section">
            <h3 className="section-title">&gt; COLOR</h3>
            <div
              className="current-color"
              style={{ backgroundColor: currentColor }}
            >
              <span className="color-hex">{currentColor.toUpperCase()}</span>
            </div>
            <div className="color-palette">
              {DEFAULT_PALETTE.map((color) => (
                <button
                  key={color}
                  className={`palette-color ${currentColor === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setCurrentColor(color)}
                />
              ))}
            </div>
            <input
              type="color"
              value={currentColor}
              onChange={(e) => setCurrentColor(e.target.value)}
              className="color-picker"
            />
          </div>

          <div className="tool-section">
            <h3 className="section-title">&gt; OPTIONS</h3>
            <label className="option-toggle">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
              />
              <span className="toggle-indicator">{showGrid ? '[X]' : '[ ]'}</span>
              GRID
            </label>
          </div>

          <div className="tool-section">
            <h3 className="section-title">&gt; ACTIONS</h3>
            <button className="action-btn clear-btn" onClick={clearCanvas}>
              CLEAR
            </button>
            <button className="action-btn export-btn" onClick={exportPNG}>
              EXPORT PNG
            </button>
          </div>
        </aside>

        {/* Canvas Area */}
        <div className="canvas-container">
          <div className="canvas-frame">
            <div className="frame-corner tl" />
            <div className="frame-corner tr" />
            <div className="frame-corner bl" />
            <div className="frame-corner br" />

            <div
              className={`pixel-grid ${showGrid ? 'show-grid' : ''}`}
              style={{
                gridTemplateColumns: `repeat(${gridSize}, ${pixelSize})`,
                gridTemplateRows: `repeat(${gridSize}, ${pixelSize})`,
              }}
              onTouchEnd={() => setIsDrawing(false)}
              onTouchCancel={() => setIsDrawing(false)}
            >
              {pixels.map((color, idx) => {
                const x = idx % gridSize;
                const y = Math.floor(idx / gridSize);
                return (
                  <div
                    key={idx}
                    data-x={x}
                    data-y={y}
                    className="pixel"
                    style={{
                      backgroundColor: color === 'transparent' ? 'transparent' : color,
                    }}
                    onMouseDown={(e) => handleMouseDown(e, x, y)}
                    onMouseEnter={() => handleMouseEnter(x, y)}
                    onTouchStart={(e) => handleTouchStart(e, x, y)}
                    onTouchMove={handleTouchMove}
                  />
                );
              })}
            </div>
          </div>

          <div className="canvas-info">
            <span className="info-item">SIZE: {gridSize}x{gridSize}</span>
            <span className="info-item">PIXELS: {gridSize * gridSize}</span>
            <span className="info-item">TOOL: {tool.toUpperCase()}</span>
          </div>
        </div>
      </main>

      <footer className="footer">
        <p>Requested by @nplxdesign · Built by @clonkbot</p>
      </footer>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}

export default App;
