import React, { useState, useEffect, useRef } from 'react';
import { QrCode, MapPin, Award, Camera, RefreshCw, CheckCircle2, Anchor } from 'lucide-react';

// 野母崎・樺島スタンプスポットの定義
const STAMP_CONFIG = [
  { id: 'Spot1', name: '樺島灯台', location: '樺島町', imageDescription: '青空にそびえ立つ白い樺島灯台' },
  { id: 'Spot2', name: '樺島灯台先展望所', location: '樺島町', imageDescription: '展望所から望む広大な東シナ海' },
  { id: 'Spot3', name: 'オオウナギ井戸', location: '樺島町', imageDescription: '天然記念物オオウナギが住む井戸' },
  { id: 'Spot4', name: 'ふれあい公園', location: '樺島町', imageDescription: '樺島漁港を望む開放的な公園' },
  { id: 'Spot5', name: '熊野神社', location: '樺島町', imageDescription: '歴史ある神社の石鳥居' },
  { id: 'Spot6', name: '無量寺', location: '樺島町', imageDescription: '静寂に包まれた無量寺の本堂' },
  { id: 'Spot7', name: '鰮神社', location: '樺島町', imageDescription: '大漁を祈願する海辺の祠' },
  { id: 'Spot8', name: 'お大師様', location: '樺島町', imageDescription: '地域を見守るお大師様の石像' },
  { id: 'Spot9', name: 'えのきの祠', location: '樺島町', imageDescription: '巨木エノキの根元にある祠' },
];

export default function App() {
  const [collectedStamps, setCollectedStamps] = useState(() => {
    try {
      const saved = localStorage.getItem('kabashima_walk_rally_v2');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [isScanning, setIsScanning] = useState(false);
  const [lastCollectedSpot, setLastCollectedSpot] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [jsqrLoaded, setJsqrLoaded] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const requestRef = useRef(null);

  useEffect(() => {
    // jsQRライブラリの読み込み
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
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
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
            <div className="bg-sky-500 p-2 rounded-xl shadow-lg">
              <Anchor className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-800">
                野母崎樺島<span className="text-sky-500 ml-1">スタンプラリー</span>
              </h1>
            </div>
          </div>
          <button onClick={resetData} className="p-2 text-slate-300 hover:text-red-400">
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        {/* Progress Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-sky-100">
          <div className="flex justify-between items-end mb-4">
            <span className="text-xs font-bold text-sky-600 uppercase">Progress</span>
            <span className="text-4xl font-black text-slate-800">
              {collectedStamps.length}<span className="text-lg text-slate-300 mx-1">/</span>{STAMP_CONFIG.length}
            </span>
          </div>
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
            <div 
              className="bg-sky-500 h-full transition-all duration-1000"
              style={{ width: `${(collectedStamps.length / STAMP_CONFIG.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Status Message */}
        {message.text && (
          <div className={`p-4 rounded-2xl font-bold text-sm ${
            message.type === 'success' ? 'bg-green-100 text-green-700' :
            message.type === 'error' ? 'bg-red-100 text-red-700' :
            'bg-sky-100 text-sky-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Success Reveal */}
        {lastCollectedSpot && (
          <div className="bg-white rounded-[2.5rem] p-6 shadow-2xl border-4 border-sky-400">
            <div className="aspect-video bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
               <div className="font-bold text-slate-400 italic"></div>
            </div>
            <h3 className="text-xl font-black text-center mb-4">{lastCollectedSpot.name}</h3>
            <button onClick={() => setLastCollectedSpot(null)} className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold">
              閉じる
            </button>
          </div>
        )}

        {/* Scanner */}
        {!lastCollectedSpot && (
          <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 aspect-square shadow-xl flex items-center justify-center border-4 border-white">
            {!isScanning ? (
              <div className="text-center">
                <div className="w-20 h-20 bg-sky-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Camera className="text-white" size={36} />
                </div>
                <button onClick={startCamera} className="bg-white text-slate-900 px-8 py-3 rounded-2xl font-black">
                  QRをスキャンする
                </button>
              </div>
            ) : (
              <>
                <video ref={videoRef} className="w-full h-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 border-[40px] border-black/50 flex items-center justify-center">
                  <div className="w-full h-full border-2 border-sky-400 rounded-xl relative">
                     <div className="absolute w-full h-0.5 bg-sky-400 top-0 animate-scan" />
                  </div>
                </div>
                <button onClick={stopCamera} className="absolute bottom-6 bg-red-500 text-white px-8 py-2 rounded-full font-bold">
                  キャンセル
                </button>
              </>
            )}
          </div>
        )}

        {/* Spot Grid */}
        <div className="grid grid-cols-2 gap-4">
          {STAMP_CONFIG.map((spot) => {
            const isOwned = collectedStamps.includes(spot.id);
            return (
              <div key={spot.id} className={`rounded-3xl border p-4 transition-all ${isOwned ? 'bg-white border-sky-400' : 'bg-white/40 border-slate-100 opacity-50'}`}>
                <div className="aspect-square flex items-center justify-center mb-2">
                  {isOwned ? (
                    <div className="text-center">
                       <CheckCircle2 className="text-green-500 mx-auto mb-1" size={24} />
                       <div className="text-[10px] font-bold text-slate-400"></div>
                    </div>
                  ) : <div className="text-4xl">💠</div>}
                </div>
                <h3 className="font-black text-[11px] h-8 flex items-center">{spot.name}</h3>
                <p className="text-[8px] text-slate-400 flex items-center gap-1"><MapPin size={8} /> {spot.location}</p>
              </div>
            );
          })}
        </div>
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-lg p-4 flex justify-around rounded-t-3xl max-w-md mx-auto">
        <div className="flex flex-col items-center text-sky-500"><QrCode size={24} /><span className="text-[9px] font-bold">SCAN</span></div>
        <div className="flex flex-col items-center text-slate-300"><MapPin size={24} /><span className="text-[9px] font-bold">MAP</span></div>
        <div className="flex flex-col items-center text-slate-300"><Award size={24} /><span className="text-[9px] font-bold">INFO</span></div>
      </nav>
      
      <style>{`
        @keyframes scan { 0% { top: 0; } 100% { top: 100%; } }
        .animate-scan { animation: scan 2s linear infinite; position: absolute; }
      `}</style>
    </div>
  );
}