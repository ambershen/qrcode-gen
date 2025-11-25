import { useState, useEffect } from 'react';
import { FiDownload, FiCopy, FiSun, FiMoon } from 'react-icons/fi';
import QRCode from 'qrcode';

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, Math.min(w, h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

async function composeQrWithLogo(qrDataUrl: string, logoDataUrl: string, opts: { sizeRatio: number; paddingRatio: number; rounded: boolean; darkMode: boolean; }) {
  const canBitmap = typeof createImageBitmap === 'function';
  const safeSizeRatio = Math.min(Math.max(opts.sizeRatio, 0.10), 0.30);
  const safePaddingRatio = Math.min(Math.max(opts.paddingRatio, 0), 0.08);
  if (canBitmap) {
    const qrBlob = await fetch(qrDataUrl).then(r => r.blob());
    const logoBlob = await fetch(logoDataUrl).then(r => r.blob());
    const qrBmp = await createImageBitmap(qrBlob);
    const logoBmp = await createImageBitmap(logoBlob);
    const size = Math.max(qrBmp.width, qrBmp.height);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(qrBmp, 0, 0, size, size);
    const boxSize = Math.round(size * safeSizeRatio);
    const padding = Math.round(size * safePaddingRatio);
    const centerX = Math.round(size / 2 - boxSize / 2);
    const centerY = Math.round(size / 2 - boxSize / 2);
    const backdropColor = '#FFFFFF';
    ctx.fillStyle = backdropColor;
    if (opts.rounded) {
      drawRoundedRect(ctx, centerX, centerY, boxSize, boxSize, Math.round(boxSize * 0.12));
      ctx.fill();
    } else {
      ctx.fillRect(centerX, centerY, boxSize, boxSize);
    }
    const maxLogoW = boxSize - padding * 2;
    const maxLogoH = boxSize - padding * 2;
    const logoAspect = logoBmp.width / logoBmp.height;
    const fitW = maxLogoW;
    const fitH = Math.round(fitW / logoAspect);
    let drawW = fitW;
    let drawH = fitH;
    if (drawH > maxLogoH) {
      drawH = maxLogoH;
      drawW = Math.round(drawH * logoAspect);
    }
    const drawX = Math.round(size / 2 - drawW / 2);
    const drawY = Math.round(size / 2 - drawH / 2);
    ctx.drawImage(logoBmp, drawX, drawY, drawW, drawH);
    return canvas.toDataURL('image/png');
  }
  return await new Promise<string>((resolve, reject) => {
    const qrImg = new Image();
    qrImg.onload = () => {
      const size = Math.max(qrImg.width, qrImg.height);
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(qrImg, 0, 0, size, size);
      const logoImg = new Image();
      logoImg.onload = () => {
        const boxSize = Math.round(size * safeSizeRatio);
        const padding = Math.round(size * safePaddingRatio);
        const centerX = Math.round(size / 2 - boxSize / 2);
        const centerY = Math.round(size / 2 - boxSize / 2);
        const backdropColor = '#FFFFFF';
        ctx.fillStyle = backdropColor;
        if (opts.rounded) {
          drawRoundedRect(ctx, centerX, centerY, boxSize, boxSize, Math.round(boxSize * 0.12));
          ctx.fill();
        } else {
          ctx.fillRect(centerX, centerY, boxSize, boxSize);
        }
        const maxLogoW = boxSize - padding * 2;
        const maxLogoH = boxSize - padding * 2;
        const logoAspect = logoImg.width / logoImg.height;
        const fitW = maxLogoW;
        const fitH = Math.round(fitW / logoAspect);
        let drawW = fitW;
        let drawH = fitH;
        if (drawH > maxLogoH) {
          drawH = maxLogoH;
          drawW = Math.round(drawH * logoAspect);
        }
        const drawX = Math.round(size / 2 - drawW / 2);
        const drawY = Math.round(size / 2 - drawH / 2);
        ctx.drawImage(logoImg, drawX, drawY, drawW, drawH);
        resolve(canvas.toDataURL('image/png'));
      };
      logoImg.onerror = () => reject(new Error('Failed to load logo image'));
      logoImg.src = logoDataUrl;
    };
    qrImg.onerror = () => reject(new Error('Failed to load QR image'));
    qrImg.src = qrDataUrl;
  });
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [logoSizeRatio, setLogoSizeRatio] = useState(0.18);
  const [logoPaddingRatio, setLogoPaddingRatio] = useState(0.04);
  const [logoRounded, setLogoRounded] = useState(true);

  // Load theme preference from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    } else {
      // Default to system preference
      setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    if (!logoDataUrl) return;
    if (!url.trim()) return;
    if (isGenerating) return;
    const t = setTimeout(() => {
      generateQRCode();
    }, 250);
    return () => clearTimeout(t);
  }, [logoDataUrl, logoSizeRatio, logoPaddingRatio, logoRounded]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const generateQRCode = async () => {
    if (!url.trim()) {
      console.log('No URL entered');
      return;
    }
    
    console.log('Generating QR code for:', url);
    setIsGenerating(true);
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 256,
        height: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: logoDataUrl ? 'H' : 'M'
      });
      let finalUrl = dataUrl;
      if (logoDataUrl) {
        try {
          finalUrl = await composeQrWithLogo(dataUrl, logoDataUrl, {
            sizeRatio: logoSizeRatio,
            paddingRatio: logoPaddingRatio,
            rounded: logoRounded,
            darkMode: isDarkMode
          });
        } catch (e) {
          console.error('Logo composition failed, using plain QR:', e);
          finalUrl = dataUrl;
        }
      }
      console.log('QR code generated successfully');
      setQrCodeDataUrl(finalUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeDataUrl) return;
    
    const link = document.createElement('a');
    link.download = `qrcode-${Date.now()}.png`;
    link.href = qrCodeDataUrl;
    link.click();
  };

  const copyToClipboard = async () => {
    if (!qrCodeDataUrl) return;
    
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="min-h-screen spatial-bg spatial-grid nebula-effect flex items-center justify-center p-4 crt">
      <div className="w-full max-w-md relative z-10">
        {/* Theme Toggle */}
        <div className="absolute -top-16 right-0">
          <button
            onClick={toggleTheme}
            className="neutral-button p-3 rounded-lg text-[var(--brand-color)] hover:opacity-90 transition-colors duration-200"
            style={{fontFamily: 'VT323, Courier New, monospace'}}
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? <FiSun className="w-5 h-5" /> : <FiMoon className="w-5 h-5" />}
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-bold text-[var(--brand-color)] mb-2 tracking-wider" style={{fontFamily: 'VT323, Courier New, monospace', fontWeight: 400, letterSpacing: '0.1em', textShadow: '0 0 20px var(--glow-brand)'}}>
            PIXEL QR
          </h1>
          <p className="text-[var(--text-secondary)] text-xl font-mono tracking-wider" style={{fontFamily: 'VT323, Courier New, monospace'}}>MONOCHROME CODE GENERATOR</p>
          <div className="w-32 h-px mx-auto mt-4 opacity-80" style={{backgroundColor: 'var(--brand-color)'}}></div>
        </div>

        {/* Main Card */}
        <div className="rounded-none shadow-2xl" style={{backgroundColor: 'var(--bg-secondary)', border: '2px solid var(--border-primary)', backdropFilter: 'blur(8px)'}}>
          {/* Screen Effect */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-current to-transparent animate-pulse pointer-events-none opacity-10" style={{color: 'var(--text-primary)'}}></div>
            
            {/* Input Section */}
            <div className="p-6 space-y-4 relative z-10">
              <div className="relative z-10">
                <label className="block text-[var(--text-secondary)] font-mono text-sm mb-2 uppercase tracking-wider" style={{fontFamily: 'VT323, Courier New, monospace'}}>
                  ENTER URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                className="w-full px-4 py-3 border-2 text-[var(--text-primary)] font-mono text-lg placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand-color)] focus:ring-2 focus:ring-[var(--brand-color)] hover:border-[var(--brand-color)] transition-all duration-200 relative z-20 cursor-text" 
                style={{fontFamily: 'VT323, Courier New, monospace', backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-secondary)'}}
                onKeyPress={(e) => e.key === 'Enter' && generateQRCode()}
              />
              </div>

              <div className="relative z-10">
                <label className="block text-[var(--text-secondary)] font-mono text-sm mb-2 uppercase tracking-wider" style={{fontFamily: 'VT323, Courier New, monospace'}}>
                  UPLOAD LOGO (PNG/JPG/SVG)
                </label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  onChange={(e) => {
                    const file = e.target.files && e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      const result = reader.result as string;
                      setLogoDataUrl(result);
                    };
                    reader.readAsDataURL(file);
                  }}
                  className="w-full px-4 py-2 border-2 text-[var(--text-primary)] font-mono text-base placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand-color)] focus:ring-2 focus:ring-[var(--brand-color)] hover:border-[var(--brand-color)] transition-all duration-200"
                  style={{fontFamily: 'VT323, Courier New, monospace', backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-secondary)'}}
                />
                {logoDataUrl && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="block text-[var(--text-secondary)] font-mono text-sm mb-1 uppercase tracking-wider" style={{fontFamily: 'VT323, Courier New, monospace'}}>LOGO SIZE</label>
                      <input
                        type="range"
                        min={10}
                        max={30}
                        value={Math.round(logoSizeRatio * 100)}
                        onChange={(e) => setLogoSizeRatio(parseInt(e.target.value, 10) / 100)}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--text-secondary)] font-mono text-sm mb-1 uppercase tracking-wider" style={{fontFamily: 'VT323, Courier New, monospace'}}>LOGO PADDING</label>
                      <input
                        type="range"
                        min={0}
                        max={8}
                        value={Math.round(logoPaddingRatio * 100)}
                        onChange={(e) => setLogoPaddingRatio(parseInt(e.target.value, 10) / 100)}
                        className="w-full"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-[var(--text-secondary)] font-mono text-sm tracking-wider" style={{fontFamily: 'VT323, Courier New, monospace'}}>
                        <input
                          type="checkbox"
                          checked={logoRounded}
                          onChange={(e) => setLogoRounded(e.target.checked)}
                        />
                        ROUNDED BACKDROP
                      </label>
                      <button
                        onClick={() => setLogoDataUrl(null)}
                        className="neutral-button px-3 py-1 text-white font-mono text-sm uppercase tracking-wider hover:border-[var(--brand-color)] focus:ring-2 focus:ring-[var(--brand-color)]"
                        style={{fontFamily: 'VT323, Courier New, monospace'}}
                      >
                        CLEAR LOGO
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={generateQRCode}
                disabled={!url.trim() || isGenerating}
                className="w-full py-3 neutral-button text-white font-mono font-bold text-lg uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed relative z-20 focus:ring-2 focus:ring-[var(--brand-color)] hover:border-[var(--brand-color)]" style={{fontFamily: 'VT323, Courier New, monospace'}}
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    GENERATING
                  </span>
                ) : (
                  'GENERATE'
                )}
              </button>
            </div>

            {/* QR Code Display */}
            {qrCodeDataUrl && (
              <div className="px-6 pb-6">
                <div className="bg-white p-4 border-2 border-[var(--brand-color)] mb-4">
                  <img
                    src={qrCodeDataUrl}
                    alt="Generated QR Code"
                    className="w-full h-auto pixelated"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={downloadQRCode}
                    className="flex-1 py-2 neutral-button text-white font-mono font-bold text-base uppercase tracking-wider flex items-center justify-center gap-2 hover:border-[var(--brand-color)] focus:ring-2 focus:ring-[var(--brand-color)]" style={{fontFamily: 'VT323, Courier New, monospace'}}
                  >
                    <FiDownload className="w-4 h-4" />
                    SAVE
                  </button>
                  
                  <button
                    onClick={copyToClipboard}
                    className="flex-1 py-2 neutral-button text-white font-mono font-bold text-base uppercase tracking-wider flex items-center justify-center gap-2 hover:border-[var(--brand-color)] focus:ring-2 focus:ring-[var(--brand-color)]" style={{fontFamily: 'VT323, Courier New, monospace', background: 'linear-gradient(145deg, #1a1a1a, #2a2a2a)'}}
                  >
                    <FiCopy className="w-4 h-4" />
                    {copied ? 'COPIED' : 'COPY'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-[var(--text-tertiary)] font-mono text-sm uppercase tracking-wider" style={{fontFamily: 'VT323, Courier New, monospace'}}>
            POWERED BY MONOCHROME TECHNOLOGY
          </p>
          <div className="flex justify-center gap-1 mt-2">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 animate-pulse`}
                style={{ 
                  animationDelay: `${i * 0.1}s`,
                  backgroundColor: i % 2 === 0 ? 'var(--text-primary)' : 'var(--text-secondary)'
                }}
              ></div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
