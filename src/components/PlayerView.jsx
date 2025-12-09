import React, { useState, useEffect } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { Monitor, Clock, CloudSun } from 'lucide-react';

const PlayerView = ({ db, appId }) => {
  const [screenId, setScreenId] = useState(localStorage.getItem('screen_id'));
  const [pairingCode, setPairingCode] = useState('');
  const [screenData, setScreenData] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  // 1. Initialize Screen Identity
  useEffect(() => {
    let id = screenId;
    if (!id) {
      id = 'scr_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('screen_id', id);
      setScreenId(id);
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setPairingCode(code);

    const screenRef = doc(db, 'artifacts', appId, 'data', `screen_${id}`);
    
    setDoc(screenRef, {
      lastSeen: new Date().toISOString(),
      pairingCode: code,
      id: id
    }, { merge: true });

    const unsub = onSnapshot(screenRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setScreenData(data);
        
        if (data.storeId) {
          const storeRef = doc(db, 'artifacts', appId, 'data', `store_${data.storeId}`);
          onSnapshot(storeRef, (storeSnap) => {
            if (storeSnap.exists()) {
              setPlaylist(storeSnap.data().content || []);
              setCurrentIndex(0); 
            }
          });
        }
      }
    });

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    return () => {
      unsub();
      clearInterval(timer);
    };
  }, [db, appId, screenId]);

  // 2. Playback Logic
  useEffect(() => {
    if (!playlist.length) return;

    const item = playlist[currentIndex];
    const duration = (item.duration || 10) * 1000;

    const loopTimer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % playlist.length);
    }, duration);

    return () => clearTimeout(loopTimer);
  }, [currentIndex, playlist]);

  // 3. Render Logic
  
  // A. Pairing Screen
  if (!screenData?.storeId) {
    return (
      <div className="h-screen w-screen bg-slate-900 flex flex-col items-center justify-center text-white font-sans">
        <div className="animate-pulse mb-8">
          <Monitor className="w-32 h-32 text-indigo-500" />
        </div>
        <h1 className="text-4xl font-bold mb-4">Pair this Screen</h1>
        <p className="text-xl text-slate-400 mb-8">Go to Admin Dashboard and enter code:</p>
        <div className="bg-white text-slate-900 text-8xl font-black py-8 px-16 rounded-2xl tracking-widest shadow-2xl">
          {pairingCode}
        </div>
        <p className="mt-8 text-slate-500 font-mono text-sm">Device ID: {screenId}</p>
      </div>
    );
  }

  // B. Content Player
  const currentItem = playlist[currentIndex];
  
  const isScheduledNow = (item) => {
    if (!item.scheduleStart && !item.scheduleEnd) return true;
    
    const now = new Date();
    const currentHour = now.getHours();
    
    const start = item.scheduleStart ? parseInt(item.scheduleStart.split(':')[0]) : 0;
    const end = item.scheduleEnd ? parseInt(item.scheduleEnd.split(':')[0]) : 24;
    
    return currentHour >= start && currentHour < end;
  };

  if (currentItem && !isScheduledNow(currentItem)) {
    return <div className="bg-black h-screen w-screen" />; 
  }

  if (!currentItem) return <div className="bg-black h-screen flex items-center justify-center text-white">No Content Loaded</div>;

  // Render Styles based on Item Configuration
  const containerStyles = {
    backgroundColor: currentItem.styles?.backgroundColor || '#000000',
    color: currentItem.styles?.color || '#ffffff',
    justifyContent: currentItem.styles?.justifyContent || 'center',
    alignItems: currentItem.styles?.alignItems || 'center',
    fontFamily: currentItem.styles?.fontFamily || 'ui-sans-serif',
  };

  const textStyle = {
    fontSize: currentItem.styles?.fontSize || '4rem',
  };

  return (
    <div className="h-screen w-screen overflow-hidden relative font-sans flex flex-col" style={containerStyles}>
      
      {/* Clock Overlay (optional, usually sits on top) */}
      <div className="absolute top-6 right-6 z-50">
        <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full text-white font-bold text-2xl flex items-center gap-2 border border-white/10 shadow-lg">
           <Clock className="w-5 h-5 text-emerald-400" />
           {currentTime.toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}
        </div>
      </div>

      {/* Media Type Rendering */}
      
      {currentItem.type === 'image' && (
        <img 
          src={currentItem.url} 
          alt="Signage" 
          className="max-w-full max-h-full object-contain animate-fade-in"
        />
      )}
      
      {currentItem.type === 'video' && (
        <video 
          src={currentItem.url} 
          autoPlay 
          muted 
          loop={false} 
          className="max-w-full max-h-full object-contain"
        />
      )}

      {currentItem.type === 'pdf' && (
        <iframe 
            src={currentItem.url} 
            className="w-full h-full border-0" 
            title="PDF Viewer"
        />
      )}

      {currentItem.type === 'widget_weather' && (
        <div className="flex flex-col items-center animate-fade-in">
          <CloudSun className="w-64 h-64 mb-8 animate-bounce" />
          <h1 className="text-9xl font-bold">72°F</h1>
          <h2 className="text-5xl mt-4 opacity-90">Sunny in Downtown</h2>
        </div>
      )}

      {currentItem.type === 'widget_ticker' && (
        <div className="p-20 text-center animate-fade-in w-full">
           <h1 className="font-black leading-tight drop-shadow-lg" style={textStyle}>
             {currentItem.text || "Welcome!"}
           </h1>
        </div>
      )}
    </div>
  );
};

export default PlayerView;