import React, { useState, useEffect } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { Monitor, Clock, CloudSun, Sun, CloudRain, CloudSnow, Cloud, Wind, Droplets, MapPin, QrCode } from 'lucide-react';

const CountdownDisplay = ({ targetDate, style }) => {
  const calculateTimeLeft = () => {
    const difference = +new Date(targetDate) - +new Date();
    let timeLeft = {};
    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      };
    } else {
      timeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }
    return timeLeft;
  };
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
  useEffect(() => {
    const timer = setTimeout(() => { setTimeLeft(calculateTimeLeft()); }, 1000);
    return () => clearTimeout(timer);
  });
  const TimeUnit = ({ value, label }) => (
    <div className="flex flex-col items-center mx-4">
      <div className="text-6xl font-black tabular-nums bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20 shadow-lg min-w-[120px] text-center">
        {String(value).padStart(2, '0')}
      </div>
      <span className="text-sm uppercase tracking-widest opacity-80 mt-2 font-medium">{label}</span>
    </div>
  );
  return (
    <div className="flex flex-wrap justify-center mt-6" style={style}>
      <TimeUnit value={timeLeft.days} label="Days" />
      <TimeUnit value={timeLeft.hours} label="Hours" />
      <TimeUnit value={timeLeft.minutes} label="Mins" />
      <TimeUnit value={timeLeft.seconds} label="Secs" />
    </div>
  );
};

const WeatherBackground = ({ condition }) => {
  if (condition === 'sunny') return <div className="absolute inset-0 bg-gradient-to-tr from-orange-400 via-amber-200 to-sky-300 overflow-hidden"><div className="absolute top-[-20%] right-[-20%] opacity-40 text-yellow-100 mix-blend-screen"><Sun size={800} className="animate-spin-slow" /></div><div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div></div>;
  if (condition === 'rainy') return <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-900 overflow-hidden">{Array.from({ length: 60 }).map((_, i) => (<div key={i} className="absolute bg-blue-400/30 w-0.5 rounded-full animate-fall" style={{ height: `${Math.random() * 30 + 10}px`, left: `${Math.random() * 100}%`, animationDuration: `${Math.random() * 0.4 + 0.3}s`, animationDelay: `${Math.random() * 2}s` }} />))}<div className="absolute top-0 w-full h-full bg-black/10" /></div>;
  if (condition === 'snowy') return <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 overflow-hidden">{Array.from({ length: 80 }).map((_, i) => (<div key={i} className="absolute bg-white/80 rounded-full animate-fall blur-[1px]" style={{ width: `${Math.random() * 5 + 2}px`, height: `${Math.random() * 5 + 2}px`, left: `${Math.random() * 100}%`, animationDuration: `${Math.random() * 8 + 4}s`, animationDelay: `${Math.random() * 5}s` }} />))}</div>;
  if (condition === 'cloudy') return <div className="absolute inset-0 bg-gradient-to-br from-gray-500 via-slate-400 to-gray-300 overflow-hidden"><Cloud size={500} className="absolute top-[-100px] left-[-150px] text-white/30 animate-drift blur-2xl" style={{ animationDuration: '60s' }} /><Cloud size={400} className="absolute bottom-[20%] right-[-100px] text-white/20 animate-drift blur-xl" style={{ animationDuration: '45s', animationDelay: '5s' }} /><div className="absolute inset-0 bg-black/5" /></div>;
  return <div className="absolute inset-0 bg-slate-900" />;
};

const PlayerView = ({ db, appId }) => {
  const [screenId, setScreenId] = useState(localStorage.getItem('screen_id'));
  const [pairingCode, setPairingCode] = useState('');
  const [screenData, setScreenData] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Helper: Hex to RGBA
  const hexToRgba = (hex, alpha) => {
    if (!hex) return 'rgba(0,0,0,1)';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // 1. Initialize Screen Identity & Heartbeat
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
    
    // Heartbeat Interval
    const heartbeat = setInterval(() => {
      setDoc(screenRef, {
        lastSeen: new Date().toISOString(),
        pairingCode: code,
        id: id
      }, { merge: true });
    }, 30000); // 30s heartbeat

    // Initial Set
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
      clearInterval(heartbeat);
    };
  }, [db, appId, screenId]);

  // 2. Playback Logic
  useEffect(() => {
    if (!playlist.length) return;

    const item = playlist[currentIndex];
    const duration = (item.duration || 10) * 1000;

    const loopTimer = setTimeout(() => {
      // Find next valid item
      let nextIndex = (currentIndex + 1) % playlist.length;
      let attempts = 0;
      
      // Loop until we find a valid item or cycle through everything
      while (!isValidItem(playlist[nextIndex]) && attempts < playlist.length) {
        nextIndex = (nextIndex + 1) % playlist.length;
        attempts++;
      }
      
      setCurrentIndex(nextIndex);
    }, duration);

    return () => clearTimeout(loopTimer);
  }, [currentIndex, playlist]);

  // 3. Validation Logic (Active, Schedule, Days)
  const isValidItem = (item) => {
    if (item.active === false) return false;

    const now = new Date();
    
    // Day Check
    if (item.scheduleDays) {
      const daysMap = ['sun','mon','tue','wed','thu','fri','sat'];
      const todayKey = daysMap[now.getDay()];
      if (!item.scheduleDays[todayKey]) return false;
    }

    // Time Check (Simple HH:MM string compare works for same-day schedules)
    if (item.scheduleStart && item.scheduleEnd) {
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const [startH, startM] = item.scheduleStart.split(':').map(Number);
      const [endH, endM] = item.scheduleEnd.split(':').map(Number);
      const startTotal = startH * 60 + startM;
      const endTotal = endH * 60 + endM;
      
      if (currentMinutes < startTotal || currentMinutes > endTotal) return false;
    }

    return true;
  };

  // 4. Render Logic
  
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

  const currentItem = playlist[currentIndex];

  if (!currentItem || !isValidItem(currentItem)) {
    return (
      <div className="bg-black h-screen flex items-center justify-center text-white">
        <p className="opacity-50">Waiting for scheduled content...</p>
      </div>
    );
  }

  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: currentItem.styles?.justifyContent || 'center',
    alignItems: currentItem.styles?.alignItems || 'center',
    padding: `${currentItem.styles?.padding || 0}px`,
    color: currentItem.styles?.color || '#ffffff',
    fontFamily: currentItem.styles?.fontFamily || 'sans-serif',
    fontWeight: currentItem.styles?.fontWeight || '400',
    letterSpacing: `${currentItem.styles?.letterSpacing || 0}px`,
    backgroundColor: currentItem.type === 'widget_weather' ? 'transparent' : hexToRgba(currentItem.styles?.backgroundColor || '#000000', currentItem.styles?.opacity || 1),
  };

  const mediaStyle = {
    borderRadius: `${currentItem.styles?.borderRadius || 0}px`,
    boxShadow: currentItem.styles?.boxShadow ? '0 20px 25px -5px rgba(0, 0, 0, 0.5)' : 'none',
  };

  const weatherBarStyle = {
    backgroundColor: hexToRgba(currentItem.styles?.backgroundColor || '#000000', currentItem.styles?.opacity || 0.4),
    backdropFilter: 'blur(16px)',
    borderRadius: `${currentItem.styles?.borderRadius || 24}px`,
    color: currentItem.styles?.color || '#ffffff',
    boxShadow: currentItem.styles?.boxShadow ? '0 25px 50px -12px rgba(0, 0, 0, 0.25)' : 'none',
  };

  return (
    <div className="h-screen w-screen overflow-hidden relative font-sans flex flex-col" style={containerStyle}>
      
      {/* Dynamic Backgrounds */}
      {currentItem.type === 'widget_weather' && <WeatherBackground condition={currentItem.weatherCondition || 'sunny'} />}

      {/* Clock Overlay */}
      <div className="absolute top-6 right-6 z-50">
        <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full text-white font-bold text-2xl flex items-center gap-2 border border-white/10 shadow-lg">
           <Clock className="w-5 h-5 text-emerald-400" />
           {currentTime.toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}
        </div>
      </div>

      {/* Content Layer */}
      <div className="relative z-10 w-full h-full flex flex-col" style={{ justifyContent: containerStyle.justifyContent, alignItems: containerStyle.alignItems }}>
        
        {currentItem.type === 'image' && (
          <img src={currentItem.url} alt="Signage" className="max-w-full max-h-full object-contain animate-fade-in" style={mediaStyle} />
        )}
        
        {currentItem.type === 'video' && (
          <video src={currentItem.url} autoPlay muted loop={false} className="max-w-full max-h-full object-contain" style={mediaStyle} />
        )}

        {currentItem.type === 'pdf' && (
          <iframe src={currentItem.url} className="w-full h-full border-0" title="PDF Viewer" />
        )}

        {/* --- QR CODE WIDGET --- */}
        {currentItem.type === 'widget_qr' && (
          <div className="flex flex-col md:flex-row items-center gap-16 max-w-7xl p-8 animate-fade-in">
            <div className="bg-white p-6" style={{ borderRadius: `${currentItem.styles?.borderRadius || 20}px`, boxShadow: currentItem.styles?.boxShadow ? '0 20px 50px rgba(0,0,0,0.5)' : 'none' }}>
               <img src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(currentItem.qrLink || 'https://example.com')}`} alt="QR Code" className="w-96 h-96 object-contain mix-blend-multiply" />
            </div>
            <div className="text-center md:text-left space-y-6 max-w-3xl">
               <h1 className="text-7xl md:text-9xl font-bold leading-tight" style={{ textShadow: currentItem.styles?.textShadow ? '0 4px 20px rgba(0,0,0,0.5)' : 'none' }}>
                 {currentItem.text || "Scan Me"}
               </h1>
               <p className="text-4xl md:text-5xl opacity-80" style={{ fontWeight: 300 }}>
                 {currentItem.subText || "Use your phone camera to scan the code."}
               </p>
            </div>
          </div>
        )}

        {/* --- COUNTDOWN WIDGET --- */}
        {currentItem.type === 'widget_countdown' && (
          <div className="flex flex-col items-center justify-center p-8 w-full animate-fade-in">
             <div className="text-center space-y-6 mb-12">
               <h1 className="text-6xl md:text-8xl font-bold uppercase tracking-tight" style={{ textShadow: currentItem.styles?.textShadow ? '0 4px 20px rgba(0,0,0,0.5)' : 'none' }}>
                 {currentItem.text || "Event Starts In"}
               </h1>
               <p className="text-3xl md:text-4xl opacity-80 max-w-4xl mx-auto">
                 {currentItem.subText || "Don't miss the big moment."}
               </p>
             </div>
             <CountdownDisplay targetDate={currentItem.targetDate} style={{ color: currentItem.styles?.color || '#fff' }} />
          </div>
        )}

        {/* --- WEATHER WIDGET --- */}
        {currentItem.type === 'widget_weather' && (
          <div className="w-full h-full flex flex-col justify-end p-12 font-sans animate-fade-in">
             <div className="flex-1 p-4">
                <div className="inline-flex items-center gap-2 px-6 py-3 text-white/80 border border-white/10 text-xl" style={{ backgroundColor: weatherBarStyle.backgroundColor, borderRadius: '99px', backdropFilter: 'blur(8px)' }}>
                   <MapPin size={24} />
                   <span className="font-medium uppercase tracking-wider">Downtown District</span>
                </div>
             </div>
             <div className="w-full p-8 flex flex-col md:flex-row items-center justify-between gap-12" style={weatherBarStyle}>
                <div className="flex items-center gap-8 border-r border-white/10 pr-12 w-auto justify-start">
                   <div className="animate-float">
                      {(!currentItem.weatherCondition || currentItem.weatherCondition === 'sunny') && <Sun size={120} className="text-yellow-400 drop-shadow-lg" />}
                      {currentItem.weatherCondition === 'rainy' && <CloudRain size={120} className="text-blue-300 drop-shadow-lg" />}
                      {currentItem.weatherCondition === 'snowy' && <CloudSnow size={120} className="text-white drop-shadow-lg" />}
                      {currentItem.weatherCondition === 'cloudy' && <Cloud size={120} className="text-slate-300 drop-shadow-lg" />}
                   </div>
                   <div style={{ textShadow: currentItem.styles?.textShadow ? '2px 2px 4px rgba(0,0,0,0.5)' : 'none' }}>
                      <h2 className="text-9xl font-bold leading-none tracking-tighter">
                        {currentItem.weatherCondition === 'snowy' ? '28' : currentItem.weatherCondition === 'rainy' ? '65' : '72'}°
                      </h2>
                      <p className="text-3xl opacity-80 font-medium capitalize mt-2">
                        {currentItem.weatherCondition || 'Sunny'}
                      </p>
                   </div>
                </div>
                <div className="flex gap-16 justify-center flex-1">
                   <div className="text-center">
                      <div className="flex items-center gap-2 justify-center opacity-70 text-lg uppercase font-bold mb-2">
                         <Wind size={20} /> Wind
                      </div>
                      <span className="text-4xl font-semibold">8 <span className="text-xl font-normal opacity-70">mph</span></span>
                   </div>
                   <div className="text-center border-l border-white/10 pl-16">
                      <div className="flex items-center gap-2 justify-center opacity-70 text-lg uppercase font-bold mb-2">
                         <Droplets size={20} /> Humidity
                      </div>
                      <span className="text-4xl font-semibold">
                        {currentItem.weatherCondition === 'rainy' ? '85' : '42'}<span className="text-xl font-normal opacity-70">%</span>
                      </span>
                   </div>
                </div>
                <div className="hidden lg:flex gap-8 border-l border-white/10 pl-12">
                   <div className="text-center"><p className="text-sm opacity-60 mb-2">Tomorrow</p><CloudSun size={40} className="mx-auto mb-2 opacity-90" /><span className="font-bold text-2xl">74°</span></div>
                   <div className="text-center"><p className="text-sm opacity-60 mb-2">Wed</p><Sun size={40} className="mx-auto mb-2 opacity-90" /><span className="font-bold text-2xl">78°</span></div>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerView;