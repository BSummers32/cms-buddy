import React, { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { 
  Upload, Palette, MonitorPlay, CloudSun, Loader2, Image as ImageIcon, 
  Play, FileText, Layout, Wind, Droplets, Sun, CloudRain, CloudSnow, Cloud, MapPin,
  QrCode, Timer, Link, Clock, Eye, EyeOff, Plus, Trash2, Smartphone, Settings, LogOut, ArrowLeft,
  Wifi, CalendarDays, Server, Activity
} from 'lucide-react';

const WeatherBackground = ({ condition }) => {
  if (condition === 'sunny') return <div className="absolute inset-0 bg-gradient-to-tr from-orange-400 via-amber-200 to-sky-300 overflow-hidden"><div className="absolute top-[-20%] right-[-20%] opacity-40 text-yellow-100 mix-blend-screen"><Sun size={800} className="animate-spin-slow" /></div><div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div></div>;
  if (condition === 'rainy') return <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-900 overflow-hidden">{Array.from({ length: 60 }).map((_, i) => (<div key={i} className="absolute bg-blue-400/30 w-0.5 rounded-full animate-fall" style={{ height: `${Math.random() * 30 + 10}px`, left: `${Math.random() * 100}%`, animationDuration: `${Math.random() * 0.4 + 0.3}s`, animationDelay: `${Math.random() * 2}s` }} />))}<div className="absolute top-0 w-full h-full bg-black/10" /></div>;
  if (condition === 'snowy') return <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 overflow-hidden">{Array.from({ length: 80 }).map((_, i) => (<div key={i} className="absolute bg-white/80 rounded-full animate-fall blur-[1px]" style={{ width: `${Math.random() * 5 + 2}px`, height: `${Math.random() * 5 + 2}px`, left: `${Math.random() * 100}%`, animationDuration: `${Math.random() * 8 + 4}s`, animationDelay: `${Math.random() * 5}s` }} />))}</div>;
  if (condition === 'cloudy') return <div className="absolute inset-0 bg-gradient-to-br from-gray-500 via-slate-400 to-gray-300 overflow-hidden"><Cloud size={500} className="absolute top-[-100px] left-[-150px] text-white/30 animate-drift blur-2xl" style={{ animationDuration: '60s' }} /><Cloud size={400} className="absolute bottom-[20%] right-[-100px] text-white/20 animate-drift blur-xl" style={{ animationDuration: '45s', animationDelay: '5s' }} /><div className="absolute inset-0 bg-black/5" /></div>;
  return <div className="absolute inset-0 bg-slate-900" />;
};

const ContentPreview = ({ item }) => {
  const hexToRgba = (hex, alpha) => {
    if (!hex) return 'rgba(0,0,0,1)';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const containerStyle = {
    display: 'flex', flexDirection: 'column', justifyContent: item.styles?.justifyContent || 'center', alignItems: item.styles?.alignItems || 'center',
    padding: `${item.styles?.padding || 0}px`, color: item.styles?.color || '#ffffff', fontFamily: item.styles?.fontFamily || 'sans-serif',
    fontWeight: item.styles?.fontWeight || '400', letterSpacing: `${item.styles?.letterSpacing || 0}px`,
    backgroundColor: item.type === 'widget_weather' ? 'transparent' : hexToRgba(item.styles?.backgroundColor || '#000000', item.styles?.opacity || 1),
  };
  
  const mediaStyle = {
    borderRadius: `${item.styles?.borderRadius || 0}px`,
    boxShadow: item.styles?.boxShadow ? '0 20px 25px -5px rgba(0, 0, 0, 0.5)' : 'none',
  };

  const weatherBarStyle = {
    backgroundColor: hexToRgba(item.styles?.backgroundColor || '#000000', item.styles?.opacity || 0.4),
    backdropFilter: 'blur(16px)', borderRadius: `${item.styles?.borderRadius || 24}px`,
    color: item.styles?.color || '#ffffff', boxShadow: item.styles?.boxShadow ? '0 25px 50px -12px rgba(0, 0, 0, 0.25)' : 'none',
  };

  const isInactive = item.active === false;

  return (
    <div className="h-full w-full overflow-hidden relative shadow-2xl transition-all duration-300" style={{ ...containerStyle, filter: isInactive ? 'grayscale(100%) opacity(0.5)' : 'none' }}>
      
      {item.type === 'widget_weather' && <WeatherBackground condition={item.weatherCondition || 'sunny'} />}
      
      <div className="relative z-10 w-full h-full flex flex-col" style={{ justifyContent: containerStyle.justifyContent, alignItems: containerStyle.alignItems }}>
        {isInactive && <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"><div className="bg-black/80 text-white px-6 py-3 rounded-full font-bold border border-white/20 uppercase tracking-widest">Disabled</div></div>}
        
        {item.type === 'image' && item.url && <img src={item.url} alt="Preview" className="max-w-full max-h-full object-contain transition-all duration-300" style={mediaStyle} />}
        {item.type === 'video' && item.url && <video src={item.url} controls className="max-w-full max-h-full transition-all duration-300" style={mediaStyle} />}
        {item.type === 'pdf' && item.url && <iframe src={item.url} className="w-full h-full border-0" title="PDF Preview" />}
        
        {item.type === 'widget_qr' && (
          <div className="flex flex-col md:flex-row items-center gap-12 max-w-5xl p-8">
            <div className="bg-white p-4" style={{ borderRadius: `${item.styles?.borderRadius || 20}px`, boxShadow: item.styles?.boxShadow ? '0 20px 50px rgba(0,0,0,0.5)' : 'none' }}>
               <img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(item.qrLink || 'https://example.com')}`} alt="QR Code" className="w-48 h-48 md:w-64 md:h-64 object-contain mix-blend-multiply" />
            </div>
            <div className="text-center md:text-left space-y-4 max-w-2xl">
               <h2 className="text-5xl md:text-7xl font-bold leading-tight" style={{ textShadow: item.styles?.textShadow ? '0 4px 20px rgba(0,0,0,0.5)' : 'none' }}>{item.text || "Scan Me"}</h2>
               <p className="text-2xl md:text-3xl opacity-80" style={{ fontWeight: 300 }}>{item.subText || "Use your phone camera to scan the code."}</p>
            </div>
          </div>
        )}

        {item.type === 'widget_countdown' && (
          <div className="flex flex-col items-center justify-center p-8 w-full">
             <div className="text-center space-y-4 mb-8">
               <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tight" style={{ textShadow: item.styles?.textShadow ? '0 4px 20px rgba(0,0,0,0.5)' : 'none' }}>{item.text || "Event Starts In"}</h2>
               <p className="text-xl md:text-2xl opacity-80 max-w-3xl mx-auto">{item.subText || "Don't miss the big moment."}</p>
             </div>
             <div className="text-6xl font-mono font-bold bg-white/10 p-4 rounded backdrop-blur border border-white/20">00:00:00:00</div>
          </div>
        )}

        {item.type === 'widget_weather' && (
          <div className="w-full h-full flex flex-col justify-end p-6 md:p-10 font-sans">
             <div className="flex-1 p-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 text-white/80 border border-white/10" style={{ backgroundColor: weatherBarStyle.backgroundColor, borderRadius: '99px', backdropFilter: 'blur(8px)' }}>
                   <MapPin size={16} />
                   <span className="text-sm font-medium uppercase tracking-wider">Downtown District</span>
                </div>
             </div>
             <div className="w-full p-6 flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-300" style={weatherBarStyle}>
                <div className="flex items-center gap-6 border-b md:border-b-0 md:border-r border-white/10 pb-4 md:pb-0 md:pr-8 w-full md:w-auto justify-center md:justify-start">
                   <div className="animate-float">
                      {(!item.weatherCondition || item.weatherCondition === 'sunny') && <Sun size={64} className="text-yellow-400 drop-shadow-lg" />}
                      {item.weatherCondition === 'rainy' && <CloudRain size={64} className="text-blue-300 drop-shadow-lg" />}
                      {item.weatherCondition === 'snowy' && <CloudSnow size={64} className="text-white drop-shadow-lg" />}
                      {item.weatherCondition === 'cloudy' && <Cloud size={64} className="text-slate-300 drop-shadow-lg" />}
                   </div>
                   <div style={{ textShadow: item.styles?.textShadow ? '2px 2px 4px rgba(0,0,0,0.5)' : 'none' }}>
                      <h2 className="text-6xl font-bold leading-none tracking-tighter">{item.weatherCondition === 'snowy' ? '28' : item.weatherCondition === 'rainy' ? '65' : '72'}°</h2>
                      <p className="text-lg opacity-80 font-medium capitalize mt-1">{item.weatherCondition || 'Sunny'}</p>
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

const AdminDashboard = ({ db, storage, user, appId, setMode }) => {
  const [stores, setStores] = useState([]);
  const [screens, setScreens] = useState([]);
  const [activeStoreId, setActiveStoreId] = useState(null);
  const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard' | 'editor'
  const [isUploading, setIsUploading] = useState(false);
  
  // Default new item state
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultItem = { 
    id: 'draft', active: true, type: 'widget_qr', url: '', file: null, text: '', subText: '', 
    qrLink: 'https://www.google.com', targetDate: tomorrow.toISOString().slice(0, 16), duration: 10, 
    scheduleDays: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: true },
    scheduleStart: '', scheduleEnd: '', weatherCondition: 'sunny', 
    styles: { backgroundColor: '#4f46e5', opacity: 1, color: '#ffffff', fontSize: '3rem', fontWeight: '700', letterSpacing: 0, fontFamily: 'ui-sans-serif', justifyContent: 'center', alignItems: 'center', borderRadius: 20, padding: 0, boxShadow: true, textShadow: true }
  };

  const [newItem, setNewItem] = useState(defaultItem);

  // Fetch Data (Stores/Screens)
  useEffect(() => {
    const q = collection(db, 'artifacts', appId, 'data');
    const unsub = onSnapshot(q, (snapshot) => {
      const s = [];
      const scr = [];
      snapshot.forEach(doc => {
        if (doc.id.startsWith('store_')) s.push({ id: doc.id.replace('store_', ''), ...doc.data() });
        if (doc.id.startsWith('screen_')) scr.push({ id: doc.id.replace('screen_', ''), ...doc.data() });
      });
      setStores(s);
      setScreens(scr);
      if (!activeStoreId && s.length > 0) setActiveStoreId(s[0].id);
    });
    return () => unsub();
  }, [db, appId]);

  const currentStoreData = stores.find(s => s.id === activeStoreId);
  const activeScreens = screens.filter(s => s.storeId === activeStoreId);
  const onlineCount = activeScreens.filter(s => {
    if (!s.lastSeen) return false;
    const lastSeen = new Date(s.lastSeen).getTime();
    return (Date.now() - lastSeen) < 60000; // Online if seen in last 60s
  }).length;

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setNewItem({ ...newItem, url: objectUrl, file: file });
  };

  const handleAddItem = async () => {
    if (!activeStoreId) return;
    setIsUploading(true);

    try {
      let finalUrl = newItem.url;
      let storagePath = null;

      // 1. Upload File if exists
      if (newItem.file) {
        const filename = `${Date.now()}_${newItem.file.name}`;
        storagePath = `artifacts/${appId}/media/${filename}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, newItem.file);
        finalUrl = await getDownloadURL(storageRef);
      }

      // 2. Add to Firestore
      const storeRef = doc(db, 'artifacts', appId, 'data', `store_${activeStoreId}`);
      const itemToAdd = {
        ...newItem,
        id: Date.now().toString(),
        url: finalUrl,
        storagePath: storagePath,
        file: null // Don't save file object
      };

      const newContent = [...(currentStoreData?.content || []), itemToAdd];
      await updateDoc(storeRef, { content: newContent });
      
      setViewMode('dashboard');
      setNewItem(defaultItem);
    } catch (error) {
      console.error("Error adding item:", error);
      alert("Failed to upload content.");
    } finally {
      setIsUploading(false);
    }
  };

  const toggleItemActive = async (itemId) => {
    const storeRef = doc(db, 'artifacts', appId, 'data', `store_${activeStoreId}`);
    const newContent = currentStoreData.content.map(item => 
      item.id === itemId ? { ...item, active: !item.active } : item
    );
    await updateDoc(storeRef, { content: newContent });
  };

  const deleteItem = async (item) => {
    if(!confirm("Delete this item?")) return;
    try {
      if (item.storagePath) {
        const fileRef = ref(storage, item.storagePath);
        await deleteObject(fileRef).catch(console.warn);
      }
      const storeRef = doc(db, 'artifacts', appId, 'data', `store_${activeStoreId}`);
      const newContent = currentStoreData.content.filter(i => i.id !== item.id);
      await updateDoc(storeRef, { content: newContent });
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  const toggleDay = (day) => {
    setNewItem(prev => ({ 
      ...prev, 
      scheduleDays: { ...prev.scheduleDays, [day]: !prev.scheduleDays[day] } 
    }));
  };

  const updateStyle = (key, value) => {
    setNewItem(prev => ({ ...prev, styles: { ...prev.styles, [key]: value } }));
  };

  const getDayString = (days) => {
    if (!days) return 'Everyday';
    const allDays = ['mon','tue','wed','thu','fri','sat','sun'];
    const active = allDays.filter(d => days[d]);
    if (active.length === 7) return 'Everyday';
    if (active.length === 0) return 'Never';
    return active.map(d => d.charAt(0).toUpperCase() + d.slice(1,3)).join(', ');
  };

  // --- EDITOR VIEW ---
  if (viewMode === 'editor') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 md:p-8 font-sans">
        <div className="w-full max-w-7xl bg-slate-800 rounded-2xl shadow-2xl overflow-hidden border border-slate-700 flex flex-col md:flex-row h-[90vh]">
          
          {/* Controls */}
          <div className="w-full md:w-1/3 bg-slate-800 border-r border-slate-700 flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm z-10 shrink-0 flex items-center gap-2">
               <button onClick={() => setViewMode('dashboard')} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors">
                 <ArrowLeft size={20} />
               </button>
               <h2 className="text-xl font-bold text-white flex items-center gap-2">
                 <Layout className="text-emerald-400" size={24} /> Content Editor
               </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
               {/* 1. Type */}
               <section>
                <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3 block">1. Select Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {[{ id: 'image', icon: ImageIcon, label: 'Image' }, { id: 'video', icon: Play, label: 'Video' }, { id: 'pdf', icon: FileText, label: 'PDF' }, { id: 'widget_qr', icon: QrCode, label: 'QR Code' }, { id: 'widget_countdown', icon: Timer, label: 'Timer' }, { id: 'widget_weather', icon: CloudSun, label: 'Weather' }].map((type) => (
                    <button key={type.id} onClick={() => setNewItem({ ...newItem, type: type.id })} className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${newItem.type === type.id ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-slate-700/30 border-slate-700 text-slate-400 hover:bg-slate-700'}`}>
                      <type.icon size={20} className="mb-2" />
                      <span className="text-[10px] font-bold uppercase">{type.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* 2. Inputs */}
              <section className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                 <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3 block">2. Content Source</label>
                 
                 {['image', 'video', 'pdf'].includes(newItem.type) && (
                  <div className="group relative border-2 border-dashed border-slate-600 rounded-lg p-6 hover:border-emerald-500 hover:bg-slate-800/50 transition-all text-center">
                    <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept={newItem.type === 'video' ? "video/*" : newItem.type === 'pdf' ? ".pdf" : "image/*"} onChange={handleFileUpload} />
                    <div className="flex flex-col items-center pointer-events-none">
                      <div className="p-3 bg-slate-700 rounded-full mb-3"><Upload className="text-emerald-400" size={24} /></div>
                      <p className="text-sm text-slate-300 font-medium">Click to upload {newItem.type}</p>
                    </div>
                  </div>
                )}

                {newItem.type === 'widget_qr' && (
                  <div className="space-y-4">
                    <div><label className="block text-xs text-slate-400 mb-2">Headline</label><input type="text" value={newItem.text || ''} onChange={(e) => setNewItem({ ...newItem, text: e.target.value })} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white text-sm focus:border-emerald-500 outline-none font-bold" placeholder="e.g. SCAN ME" /></div>
                    <div><label className="block text-xs text-slate-400 mb-2">Body Text</label><textarea rows="2" value={newItem.subText || ''} onChange={(e) => setNewItem({ ...newItem, subText: e.target.value })} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white text-sm focus:border-emerald-500 outline-none" placeholder="e.g. Scan to visit our website" /></div>
                    <div><label className="block text-xs text-emerald-400 font-bold mb-2 flex items-center gap-2"><Link size={12}/> Target URL</label><input type="text" value={newItem.qrLink} onChange={(e) => setNewItem({ ...newItem, qrLink: e.target.value })} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-emerald-400 text-sm focus:border-emerald-500 outline-none font-mono" placeholder="https://..." /></div>
                  </div>
                )}

                 {newItem.type === 'widget_countdown' && (
                  <div className="space-y-4">
                    <div><label className="block text-xs text-slate-400 mb-2">Event Title</label><input type="text" value={newItem.text || ''} onChange={(e) => setNewItem({ ...newItem, text: e.target.value })} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white text-sm focus:border-emerald-500 outline-none font-bold" placeholder="e.g. GRAND OPENING" /></div>
                    <div><label className="block text-xs text-slate-400 mb-2">Description</label><textarea rows="2" value={newItem.subText || ''} onChange={(e) => setNewItem({ ...newItem, subText: e.target.value })} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white text-sm focus:border-emerald-500 outline-none" placeholder="e.g. Doors open in..." /></div>
                    <div><label className="block text-xs text-emerald-400 font-bold mb-2 flex items-center gap-2"><Clock size={12}/> Target Date & Time</label><input type="datetime-local" value={newItem.targetDate} onChange={(e) => setNewItem({ ...newItem, targetDate: e.target.value })} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white text-sm focus:border-emerald-500 outline-none" /></div>
                  </div>
                )}

                {newItem.type === 'widget_weather' && (
                  <div>
                     <label className="block text-xs text-slate-400 mb-2">Mock Condition</label>
                     <div className="grid grid-cols-4 gap-1">
                        {['sunny', 'rainy', 'cloudy', 'snowy'].map(cond => (
                          <button key={cond} onClick={() => setNewItem({ ...newItem, weatherCondition: cond })} className={`p-1.5 rounded text-[10px] capitalize border ${newItem.weatherCondition === cond ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>{cond}</button>
                        ))}
                     </div>
                  </div>
                )}
              </section>

               {/* 3. Scheduling */}
               <section className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                 <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2"><CalendarDays size={14} /> 3. Advanced Scheduling</label>
                 <div className="space-y-4">
                   <div>
                      <label className="text-xs text-slate-400 mb-2 block">Active Days</label>
                      <div className="flex justify-between gap-1">
                         {['sun','mon','tue','wed','thu','fri','sat'].map(day => (
                            <button key={day} onClick={() => toggleDay(day)} className={`w-8 h-8 rounded text-[10px] font-bold uppercase transition-all ${newItem.scheduleDays?.[day] ? 'bg-emerald-600 text-white shadow-lg scale-105' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}>{day.charAt(0)}</button>
                         ))}
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div><label className="text-xs text-slate-400 mb-1 block">Start Time</label><input type="time" value={newItem.scheduleStart} onChange={(e) => setNewItem({...newItem, scheduleStart: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white text-xs" /></div>
                      <div><label className="text-xs text-slate-400 mb-1 block">End Time</label><input type="time" value={newItem.scheduleEnd} onChange={(e) => setNewItem({...newItem, scheduleEnd: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white text-xs" /></div>
                   </div>
                 </div>
               </section>

               {/* 4. Styles */}
               <section className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                 <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Palette size={14} /> 4. Styles</label>
                 <div className="space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                      <div><label className="text-xs text-slate-400 mb-1 block">Background</label><input type="color" value={newItem.styles.backgroundColor} onChange={(e) => updateStyle('backgroundColor', e.target.value)} className="w-full h-8 rounded bg-transparent border border-slate-600" /></div>
                      <div><label className="text-xs text-slate-400 mb-1 block">Text Color</label><input type="color" value={newItem.styles.color} onChange={(e) => updateStyle('color', e.target.value)} className="w-full h-8 rounded bg-transparent border border-slate-600" /></div>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div><label className="text-xs text-slate-400 mb-1 block">Opacity</label><input type="range" min="0" max="1" step="0.1" value={newItem.styles.opacity} onChange={(e) => updateStyle('opacity', parseFloat(e.target.value))} className="w-full accent-emerald-500" /></div>
                      <div><label className="text-xs text-slate-400 mb-1 block">Duration (s)</label><input type="number" value={newItem.duration} onChange={(e) => setNewItem({...newItem, duration: parseInt(e.target.value)})} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white text-xs" /></div>
                   </div>
                 </div>
               </section>
            </div>
            
            <div className="p-6 border-t border-slate-700 bg-slate-800 shrink-0">
              <button onClick={handleAddItem} disabled={isUploading} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 text-white font-bold py-3 rounded-lg shadow-lg transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2">
                {isUploading ? <Loader2 className="animate-spin" /> : 'Add to Playlist'}
              </button>
            </div>
          </div>

          {/* Preview */}
          <div className="w-full md:w-2/3 bg-black/50 flex flex-col relative overflow-hidden">
            <div className="p-4 flex justify-between items-center relative z-10">
              <h4 className="text-white/50 font-bold uppercase tracking-widest text-xs flex items-center gap-2 bg-slate-900/80 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
                <MonitorPlay size={14} className="text-emerald-400" /> Editor Preview
              </h4>
            </div>
            <div className="flex-1 p-8 flex items-center justify-center relative z-10">
              <div className="aspect-video w-full max-w-4xl bg-black shadow-2xl border-8 border-slate-800 rounded-2xl overflow-hidden relative group">
                <ContentPreview item={newItem} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- DASHBOARD VIEW ---
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* Sidebar */}
      <div className="w-full md:w-72 bg-slate-900 text-white flex flex-col h-auto md:h-screen sticky top-0 border-r border-slate-700 shadow-xl z-20">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold flex items-center gap-2 tracking-tight"><Settings className="text-emerald-400" /> CMS Admin</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-8">
          <div>
            <div className="flex items-center justify-between mb-3 px-2">
               <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Stores</label>
            </div>
            <div className="space-y-1">
              {stores.map(store => (
                <button
                  key={store.id}
                  onClick={() => setActiveStoreId(store.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-all border ${activeStoreId === store.id ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800/50 text-slate-300 border-transparent hover:bg-slate-800'}`}
                >
                  <Smartphone size={16} />
                  <span className="text-sm font-medium">{store.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-700 bg-slate-900/50">
          <div className="flex items-center gap-3 text-xs text-slate-400 mb-4 px-2">
             <Activity size={14} className="text-emerald-400" />
             System Status: <span className="text-emerald-400 font-bold">98% Uptime</span>
          </div>
          <button onClick={() => setMode('selection')} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors w-full px-2">
            <LogOut size={16} /> Exit Admin
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto bg-slate-50">
        <div className="max-w-5xl mx-auto">
           {activeStoreId && currentStoreData ? (
             <>
               <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                    {currentStoreData.name} Playlist 
                    <span className="text-sm font-normal bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-2">
                       <Wifi size={14} /> Live Sync
                    </span>
                  </h1>
                  <p className="text-slate-500 mt-1">Manage content for {activeScreens.length} connected screens.</p>
                </div>
                <button 
                  onClick={() => setViewMode('editor')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 font-medium transition-all hover:scale-105"
                >
                  <Plus size={20} /> Add Content
                </button>
              </header>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Server size={24} /></div>
                    <div>
                       <h3 className="font-bold text-slate-800">Device Health Check</h3>
                       <p className="text-sm text-slate-500">{onlineCount} of {activeScreens.length} screens are online.</p>
                    </div>
                 </div>
              </div>

              <div className="space-y-4">
                {(!currentStoreData.content || currentStoreData.content.length === 0) ? (
                  <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-slate-200">
                    <Layout className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">No content yet. Click "Add Content" to start.</p>
                  </div>
                ) : (
                  currentStoreData.content.map((item) => (
                    <div 
                      key={item.id} 
                      className={`bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-6 transition-all ${!item.active ? 'opacity-50 grayscale bg-slate-50' : 'hover:shadow-md'}`}
                    >
                      <div className="w-20 h-16 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 shrink-0">
                         {item.type === 'image' && <ImageIcon size={20} />}
                         {item.type === 'video' && <Play size={20} />}
                         {item.type === 'widget_qr' && <QrCode size={20} />}
                         {item.type === 'widget_countdown' && <Timer size={20} />}
                         {item.type === 'widget_weather' && <CloudSun size={20} />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${item.type.includes('widget') ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                            {item.type.replace('widget_', '')}
                          </span>
                          {!item.active && <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">Disabled</span>}
                        </div>
                        <h3 className={`font-semibold text-slate-800 truncate ${!item.active ? 'line-through text-slate-400' : ''}`}>
                          {item.text || 'Untitled Item'}
                        </h3>
                        <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                           <span className="flex items-center gap-1"><Clock size={12} /> {item.duration}s</span>
                           <span className="flex items-center gap-1"><CalendarDays size={12} /> {getDayString(item.scheduleDays)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 border-l border-slate-100 pl-4">
                        <button 
                           onClick={() => toggleItemActive(item.id)}
                           className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${item.active ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' : 'text-slate-500 bg-slate-100 hover:bg-slate-200'}`}
                           title={item.active ? "Deactivate" : "Activate"}
                         >
                           {item.active ? <Eye size={18} /> : <EyeOff size={18} />}
                           <span className="hidden md:inline">{item.active ? 'Active' : 'Hidden'}</span>
                         </button>

                         <button 
                           onClick={() => deleteItem(item)}
                           className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                           title="Delete Item"
                         >
                           <Trash2 size={20} />
                         </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
             </>
           ) : (
             <div className="h-full flex flex-col items-center justify-center text-slate-400 mt-20">
               <Smartphone className="w-16 h-16 mb-4 opacity-20" />
               <p>Select a location from the sidebar.</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;