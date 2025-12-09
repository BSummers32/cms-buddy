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

    // Generate a 6-digit code if not paired
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setPairingCode(code);

    // Register screen in DB
    const screenRef = doc(db, 'artifacts', appId, 'public', 'data', `screen_${id}`);
    
    // Initial registration (idempotent)
    setDoc(screenRef, {
      lastSeen: new Date().toISOString(),
      pairingCode: code,
      id: id
    }, { merge: true });

    // Listen for changes (e.g., Admin assigns a store)
    const unsub = onSnapshot(screenRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setScreenData(data);
        
        // If assigned to a store, fetch that store's playlist
        if (data.storeId) {
          const storeRef = doc(db, 'artifacts', appId, 'public', 'data', `store_${data.storeId}`);
          onSnapshot(storeRef, (storeSnap) => {
            if (storeSnap.exists()) {
              setPlaylist(storeSnap.data().content || []);
              setCurrentIndex(0); // Reset loop on update
            }
          });
        }
      }
    });

    // Clock ticker for scheduling
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    return () => {
      unsub();
      clearInterval(timer);
    };
  }, [db, appId, screenId]);

  // 2. Playback Logic (Loop + Schedule Check)
  useEffect(() => {
    if (!playlist.length) return;

    const item = playlist[currentIndex];
    // Default duration 10s if not set
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
      <div className="h-screen w-screen bg-slate-900 flex flex-col items-center justify-center text-white">
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
  
  // Check Schedule (Day Parting)
  const isScheduledNow = (item) => {
    if (!item.scheduleStart && !item.scheduleEnd) return true; // Always show if no schedule
    
    const now = new Date();
    const currentHour = now.getHours();
    
    const start = item.scheduleStart ? parseInt(item.scheduleStart.split(':')[0]) : 0;
    const end = item.scheduleEnd ? parseInt(item.scheduleEnd.split(':')[0]) : 24;
    
    return currentHour >= start && currentHour < end;
  };

  if (currentItem && !isScheduledNow(currentItem)) {
    // Return empty black screen if scheduled item shouldn't play now
    return <div className="bg-black h-screen w-screen" />; 
  }

  if (!currentItem) return <div className="bg-black h-screen flex items-center justify-center text-white">No Content Loaded</div>;

  return (
    <div className="h-screen w-screen bg-black overflow-hidden relative font-sans">
      {/* Dynamic Widgets Layer */}
      <div className="absolute top-4 right-4 flex gap-4 z-20">
        <div className="bg-black/50 backdrop-blur px-4 py-2 rounded-lg text-white font-bold text-2xl flex items-center gap-2">
           <Clock className="w-5 h-5 text-emerald-400" />
           {currentTime.toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}
        </div>
      </div>

      {/* Content Layer */}
      {currentItem.type === 'image' && (
        <img 
          src={currentItem.url} 
          alt="Signage" 
          className="w-full h-full object-cover animate-fade-in"
        />
      )}
      
      {currentItem.type === 'video' && (
        <video 
          src={currentItem.url} 
          autoPlay 
          muted 
          loop={false} 
          className="w-full h-full object-cover"
        />
      )}

      {currentItem.type === 'widget_weather' && (
        <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex flex-col items-center justify-center text-white">
          <CloudSun className="w-48 h-48 mb-4 animate-bounce" />
          <h1 className="text-8xl font-bold">72°F</h1>
          <h2 className="text-4xl mt-2">Sunny in Downtown</h2>
        </div>
      )}

      {currentItem.type === 'widget_ticker' && (
        <div className="w-full h-full bg-emerald-600 flex flex-col items-center justify-center p-20 text-center">
           <h1 className="text-6xl md:text-8xl font-black text-white leading-tight drop-shadow-lg animate-pulse">
             {currentItem.text || "Welcome to our store! Ask about our specials."}
           </h1>
        </div>
      )}
    </div>
  );
};

export default PlayerView;