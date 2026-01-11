import React, { useState, useEffect, useRef } from 'react';
import { QrCode, MapPin, Award, Camera, RefreshCw, CheckCircle2, XCircle, Anchor } from 'lucide-react';

// 野母崎・樺島スタンプスポットの定義
const STAMP_CONFIG = [
  { 
    id: 'Spot1', 
    name: '樺島灯台', 
    location: '樺島町', 
    icon: '🚨', 
    imageDescription: '青空にそびえ立つ白い樺島灯台' 
  },
  { 
    id: 'Spot2', 
    name: '樺島灯台先展望所', 
    location: '樺島町', 
    icon: '🔭', 
    imageDescription: '展望所から望む広大な東シナ海と断崖絶壁' 
  },
  { 
    id: 'Spot3', 
    name: 'オオウナギ井戸', 
    location: '樺島町', 
    icon: '🐍', 
    imageDescription: '天然記念物オオウナギが住む、石造りの神秘的な井戸' 
  },
  { 
    id: 'Spot4', 
    name: 'ふれあい公園', 
    location: '樺島町', 
    icon: '🌳', 
    imageDescription: '樺島漁港を望む、芝生が広がる開放的な海辺の公園' 
  },
  { 
    id: 'Spot5', 
    name: '熊野神社', 
    location: '樺島町', 
    icon: '⛩️', 
    imageDescription: '樺島漁港を見下ろす高台に佇む、歴史ある神社の石鳥居' 
  },
  { 
    id: 'Spot6', 
    name: '無量寺', 
    location: '樺島町', 
    icon: '🙏', 
    imageDescription: '静寂に包まれた無量寺の本堂' 
  },
  { 
    id: 'Spot7', 
    name: '鰮神社', 
    location: '樺島町', 
    icon: '🐟', 
    imageDescription: '大漁を祈願する海辺の鰮神社の祠' 
  },
  { 
    id: 'Spot8', 
    name: 'お大師様', 
    location: '樺島町', 
    icon: '🧘', 
    imageDescription: '路地の傍らで地域を見守る、赤い前掛けをした穏やかなお大師様の石像' 
  },
  { 
    id: 'Spot9', 
    name: 'えのきの祠', 
    location: '樺島町', 
    icon: '🪵', 
    imageDescription: '圧倒的な生命力を感じる巨木・エノキの根元に静かに佇む祠' 
  },
];

export default function App() {
  const [collectedStamps, setCollectedStamps] = useState(() => {
    const saved = localStorage.getItem('kabashima_walk_rally_v2');
    return saved ? JSON.parse(saved) : [];
  });
  const [isScanning, setIsScanning] = useState(false);
  const [lastCollectedSpot, setLastCollectedSpot] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [jsqrLoaded, setJsqrLoaded] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const requestRef = useRef(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
    script.async = true;
    script.onload = () => setJsqrLoaded(true);
    document.head.appendChild(script);
    
    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('kabashima_walk_rally_v2', JSON.stringify(collectedStamps));
  }, [collectedStamps]);

  const stopCamera = () => {
    setIsScanning(false);
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
  };

  const startCamera = async () => {
    if (!jsqrLoaded) {
      setMessage({ text: 'システム準備中...', type: 'info' });
      return;
    }
    setLastCollectedSpot(null);
    setIsScanning(true);
    setMessage({ text: 'スポットのQRをスキャンしてください', type: 'info' });
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", true);
        videoRef.current.play();
        requestRef.current = requestAnimationFrame(tick);
      }
    } catch (err) {
      setMessage({ text: 'カメラの使用を許可してください', type: 'error' });
      setIsScanning(false);
    }
  };

  const tick = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      
      if (window.jsQR) {
        const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code) {
          handleScanSuccess(code.data);
          return;
        }
      }
    }
    requestRef.current = requestAnimationFrame(tick);
  };

  const handleScanSuccess = (data) => {
    const spot = STAMP_CONFIG.find(s => s.id === data);
    
    if (spot) {
      if (collectedStamps.includes(spot.id)) {
        setMessage({ text: `「${spot.name}」は既に獲得済みです`, type: 'warning' });
      } else {
        setCollectedStamps(prev => [...prev, spot.id]);
        setLastCollectedSpot(spot);
        setMessage({ text: `やった！「${spot.name}」スタンプをゲット！`, type: 'success' });
      }
      stopCamera();
    } else {
      setMessage({ text: '有効なスタンプQRではありません', type: 'error' });
    }
  };

  const resetData = () => {
    if (window.confirm('スタンプをすべてリセットしますか？')) {
      setCollectedStamps([]);
      setLastCollectedSpot(null);
      setMessage({ text: 'リセットしました', type: 'info' });
    }
  };

  return (
    <div className="min-h-screen bg-sky-50 text-slate-800 font-sans pb-32 select-none">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md shadow-sm p-5 sticky top-0 z-20 border-b border-sky-100">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-sky-500 p-2 rounded-xl shadow-lg shadow-sky-500/20">
              <Anchor className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-800">
                野母崎樺島<span className="text-sky-500 ml-1">スタンプラリー</span>
              </h1>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Kabashima Historical Walk</p>
            </div>
          </div>
          <button 
            onClick={resetData}
            className="p-2 text-slate-300 hover:text-red-400 transition-colors"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        
        {/* Progress Card */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-sky-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 blur-[40px] rounded-full -mr-10 -mt-10" />
          <div className="flex justify-between items-end mb-4 relative z-10">
            <span className="text-xs font-black text-sky-600 uppercase tracking-tighter">Current Progress</span>
            <span className="text-4xl font-black text-slate-800 tabular-nums">
              {collectedStamps.length}<span className="text-lg text-slate-300 mx-1">/</span><span className="text-lg text-slate-300">{STAMP_CONFIG.length}</span>
            </span>
          </div>
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden relative z-10">
            <div 
              className="bg-gradient-to-r from-sky-400 to-blue-500 h-full transition-all duration-1000 ease-out"
              style={{ width: `${(collectedStamps.length / STAMP_CONFIG.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Status Message */}
        {message.text && (
          <div className={`p-4 rounded-2xl flex items-center gap-3 transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${
            message.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' :
            message.type === 'error' ? 'bg-red-100 text-red-700 border border-red-200' :
            message.type === 'warning' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' : 
            'bg-sky-100 text-sky-700 border border-sky-200'
          }`}>
            <span className="text-sm font-bold">{message.text}</span>
          </div>
        )}

        {/* Success Modal / Spot Reveal */}
        {lastCollectedSpot && (
          <div className="bg-white rounded-[2.5rem] p-6 shadow-2xl border-4 border-sky-400 animate-in zoom-in-95 duration-500">
            <div className="aspect-video bg-slate-100 rounded-2xl overflow-hidden mb-4 relative flex items-center justify-center">
               <div className="text-center p-4">
                 <div className="font-bold text-slate-600 italic"></div>
               </div>
               <div className="absolute top-3 right-3 bg-green-500 text-white p-2 rounded-full shadow-lg">
                 <CheckCircle2 size={24} />
               </div>
            </div>
            <h3 className="text-xl font-black text-slate-800 text-center mb-1">{lastCollectedSpot.name}</h3>
            <p className="text-center text-sm text-slate-500 mb-4">{lastCollectedSpot.location}</p>
            <button 
              onClick={() => setLastCollectedSpot(null)}
              className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold"
            >
              閉じる
            </button>
          </div>
        )}

        {/* Scanner Portal */}
        {!lastCollectedSpot && (
          <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 aspect-square shadow-xl flex items-center justify-center border-4 border-white">
            {!isScanning ? (
              <div className="text-center p-8 z-10">
                <div className="w-20 h-20 bg-sky-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-sky-200 animate-pulse">
                  <Camera className="text-white" size={36} />
                </div>
                <button 
                  onClick={startCamera}
                  className="bg-white text-slate-900 px-8 py-3 rounded-2xl font-black shadow-md hover:scale-105 active:scale-95 transition-all uppercase tracking-wide text-xs"
                >
                  QRをスキャンする
                </button>
              </div>
            ) : (
              <>
                <video ref={videoRef} className="w-full h-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 border-[40px] border-black/50 flex items-center justify-center">
                  <div className="w-full h-full border-2 border-sky-400 rounded-xl relative">
                     <div className="absolute w-full h-0.5 bg-sky-400 top-0 animate-scanline shadow-[0_0_10px_#38bdf8]" />
                  </div>
                </div>
                <button 
                  onClick={stopCamera}
                  className="absolute bottom-6 bg-red-500 text-white px-8 py-2 rounded-full font-bold shadow-lg"
                >
                  キャンセル
                </button>
              </>
            )}
          </div>
        )}

        {/* Stamp Spot Grid */}
        <div className="grid grid-cols-2 gap-4">
          {STAMP_CONFIG.map((spot) => {
            const isOwned = collectedStamps.includes(spot.id);
            return (
              <div 
                key={spot.id}
                className={`relative rounded-[2rem] border transition-all duration-500 overflow-hidden flex flex-col ${
                  isOwned 
                    ? 'bg-white border-sky-400 shadow-md scale-100' 
                    : 'bg-white/40 border-slate-100 opacity-60 scale-95'
                }`}
              >
                {/* Spot Thumbnail */}
                <div className={`aspect-square w-full flex items-center justify-center relative ${isOwned ? 'bg-sky-50' : 'bg-slate-100'}`}>
                  {isOwned ? (
                    <div className="w-full h-full flex items-center justify-center p-4 text-center leading-tight">
                      <div className="text-[10px] text-sky-600/50 font-bold mb-1 absolute top-2 left-2 uppercase tracking-tighter italic">Collected</div>
                      <div className="text-[10px] font-bold text-slate-400 italic"></div>
                    </div>
                  ) : (
                    <div className="text-4xl grayscale opacity-20">💠</div>
                  )}
                  {isOwned && (
                    <div className="absolute inset-0 bg-sky-500/5 backdrop-blur-[1px]" />
                  )}
                </div>

                <div className="p-4 bg-white flex-1">
                  <h3 className={`font-black text-[11px] leading-tight mb-1 h-8 flex items-center ${isOwned ? 'text-slate-800' : 'text-slate-400'}`}>
                    {spot.name}
                  </h3>
                  <p className="text-[8px] text-slate-400 flex items-center gap-1 font-bold">
                    <MapPin size={8} className={isOwned ? 'text-sky-500' : 'text-slate-300'} /> 
                    {spot.location}
                  </p>
                </div>

                {isOwned && (
                  <div className="absolute top-3 right-3 text-green-500 drop-shadow-sm">
                    <CheckCircle2 size={18} strokeWidth={3} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Complete Message */}
        {collectedStamps.length === STAMP_CONFIG.length && (
          <div className="bg-gradient-to-br from-sky-500 to-blue-600 p-8 rounded-[2.5rem] text-center text-white shadow-xl animate-in zoom-in-95">
            <h2 className="text-2xl font-black mb-1">樺島完全制覇！ 🎉</h2>
            <p className="text-xs font-bold opacity-90 mb-6">全9箇所のスタンプが集まりました！<br/>樺島マスターの証です。</p>
            <div className="text-6xl animate-bounce">🎌</div>
          </div>
        )}
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-100 p-4 flex justify-around items-center max-w-md mx-auto rounded-t-[2rem] shadow-lg z-30">
        <div className="flex flex-col items-center gap-1 text-sky-500">
          <QrCode size={24} strokeWidth={2.5} />
          <span className="text-[9px] font-black uppercase tracking-widest">Scan</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-slate-300">
          <MapPin size={24} />
          <span className="text-[9px] font-bold uppercase tracking-widest">Map</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-slate-300">
          <Award size={24} />
          <span className="text-[9px] font-bold uppercase tracking-widest">Info</span>
        </div>
      </nav>
      
      <style>{`
        @keyframes scanline {
          0% { top: 0; }
          100% { top: 100%; }
        }
        .animate-scanline {
          animation: scanline 2s linear infinite;
        }
      `}</style>
    </div>
  );
}