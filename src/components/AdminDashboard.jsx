import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { 
  Settings, Smartphone, Plus, LogOut, ArrowUp, ArrowDown, 
  Trash2, Image as ImageIcon, Play, CloudSun, Type, Calendar, Layout,
  Clock, Upload, Palette, FileText, MonitorPlay, Loader2
} from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 rounded-2xl w-full max-w-6xl h-[90vh] border border-slate-700 shadow-2xl animate-fade-in flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-slate-700 bg-slate-900/50">
          <h3 className="text-2xl font-bold text-white flex items-center gap-2">
            {title}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-full">✕</button>
        </div>
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
};

const ContentPreview = ({ item }) => {
  const containerStyle = {
    backgroundColor: item.styles?.backgroundColor || '#000000',
    color: item.styles?.color || '#ffffff',
    justifyContent: item.styles?.justifyContent || 'center',
    alignItems: item.styles?.alignItems || 'center',
    fontFamily: item.styles?.fontFamily || 'sans-serif',
  };

  const textStyle = {
    fontSize: item.styles?.fontSize || '2rem',
  };

  if (!item.url && !item.text && item.type !== 'widget_weather') {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-slate-500 bg-slate-950 border-2 border-dashed border-slate-800 rounded-xl">
        <MonitorPlay className="w-16 h-16 mb-4 opacity-20" />
        <p>Preview Area</p>
      </div>
    );
  }

  return (
    <div 
      className="h-full w-full overflow-hidden flex relative shadow-2xl" 
      style={containerStyle}
    >
      {item.type === 'image' && item.url && (
        <img src={item.url} alt="Preview" className="max-w-full max-h-full object-contain" />
      )}

      {item.type === 'video' && item.url && (
        <video src={item.url} controls className="max-w-full max-h-full" />
      )}
      
      {item.type === 'pdf' && item.url && (
        <iframe src={item.url} className="w-full h-full" title="PDF Preview" />
      )}

      {item.type === 'widget_ticker' && (
        <div className="p-8 text-center" style={textStyle}>
          {item.text || "Ticker Text Preview"}
        </div>
      )}

      {item.type === 'widget_weather' && (
        <div className="flex flex-col items-center">
          <CloudSun size={64} className="mb-4" />
          <h2 className="text-4xl font-bold">72°F</h2>
          <p className="text-xl opacity-75">Sunny</p>
        </div>
      )}
    </div>
  );
};

const AdminDashboard = ({ db, storage, user, appId, setMode }) => {
  const [stores, setStores] = useState([]);
  const [screens, setScreens] = useState([]);
  const [activeStoreId, setActiveStoreId] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [newItem, setNewItem] = useState({ 
    type: 'image', 
    url: '', 
    file: null, // Hold raw file here
    text: '',
    duration: 10, 
    scheduleStart: '', 
    scheduleEnd: '',
    styles: {
      backgroundColor: '#000000',
      color: '#ffffff',
      fontSize: '3rem',
      fontFamily: 'ui-sans-serif',
      justifyContent: 'center',
      alignItems: 'center'
    }
  });

  const [pairCodeInput, setPairCodeInput] = useState('');

  // Fetch Data
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

  const handleAddStore = async () => {
    const name = prompt("Enter new Location Name:");
    if (!name) return;
    const newId = name.toLowerCase().replace(/\s/g, '_');
    await setDoc(doc(db, 'artifacts', appId, 'data', `store_${newId}`), {
      name,
      content: []
    });
  };

  const handlePairScreen = async () => {
    if (!activeStoreId) return alert("Select a location first");
    const targetScreen = screens.find(s => s.pairingCode === pairCodeInput);
    if (targetScreen) {
      await updateDoc(doc(db, 'artifacts', appId, 'data', `screen_${targetScreen.id}`), {
        storeId: activeStoreId
      });
      setPairCodeInput('');
      alert("Screen Paired Successfully!");
    } else {
      alert("Invalid Code or Screen Offline");
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Create a local preview URL so we don't have to upload just to see it
    const objectUrl = URL.createObjectURL(file);
    
    setNewItem({ 
      ...newItem, 
      url: objectUrl, // For previewing now
      file: file      // For uploading later
    });
  };

  const handleAddItem = async () => {
    if (!activeStoreId) return;
    setIsUploading(true);

    try {
      let finalUrl = newItem.url;
      let storagePath = null;

      // 1. Upload File if exists
      if (newItem.file) {
        // Create unique path: artifacts/{appId}/media/{timestamp}_{filename}
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
        storagePath: storagePath, // Save this so we can delete it later!
        file: null // Don't save the file object to DB
      };

      const currentStore = stores.find(s => s.id === activeStoreId);
      const newContent = [...(currentStore?.content || []), itemToAdd];

      await updateDoc(storeRef, { content: newContent });
      
      setIsAddModalOpen(false);
      resetNewItem();
    } catch (error) {
      console.error("Error adding item:", error);
      alert("Failed to upload content.");
    } finally {
      setIsUploading(false);
    }
  };

  const resetNewItem = () => {
    setNewItem({ 
      type: 'image', 
      url: '', 
      file: null,
      text: '', 
      duration: 10, 
      scheduleStart: '', 
      scheduleEnd: '',
      styles: {
        backgroundColor: '#000000',
        color: '#ffffff',
        fontSize: '3rem',
        fontFamily: 'ui-sans-serif',
        justifyContent: 'center',
        alignItems: 'center'
      }
    });
  };

  const handleDeleteItem = async (item) => {
    if(!confirm("Are you sure you want to delete this item?")) return;

    try {
      // 1. Delete from Storage if it's a file
      if (item.storagePath) {
        const fileRef = ref(storage, item.storagePath);
        await deleteObject(fileRef).catch(err => {
          console.warn("Could not delete file from storage (might already be gone):", err);
        });
      }

      // 2. Delete from Firestore
      const currentStore = stores.find(s => s.id === activeStoreId);
      const newContent = currentStore.content.filter(i => i.id !== item.id);
      await updateDoc(doc(db, 'artifacts', appId, 'data', `store_${activeStoreId}`), { content: newContent });

    } catch (error) {
      console.error("Error deleting item:", error);
      alert("Error deleting item.");
    }
  };

  const handleMoveItem = async (index, direction) => {
    const currentStore = stores.find(s => s.id === activeStoreId);
    const newContent = [...currentStore.content];
    if (direction === 'up' && index > 0) {
      [newContent[index], newContent[index - 1]] = [newContent[index - 1], newContent[index]];
    } else if (direction === 'down' && index < newContent.length - 1) {
      [newContent[index], newContent[index + 1]] = [newContent[index + 1], newContent[index]];
    }
    await updateDoc(doc(db, 'artifacts', appId, 'data', `store_${activeStoreId}`), { content: newContent });
  };

  const activeScreens = screens.filter(s => s.storeId === activeStoreId);
  const currentStoreData = stores.find(s => s.id === activeStoreId);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-slate-900 text-white flex flex-col h-auto md:h-screen sticky top-0 border-r border-slate-700">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold flex items-center gap-2 tracking-tight">
            <Settings className="text-emerald-400" /> CMS Admin
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Locations</label>
            <div className="space-y-2">
              {stores.map(store => (
                <button
                  key={store.id}
                  onClick={() => setActiveStoreId(store.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-2 transition-all ${activeStoreId === store.id ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                >
                  <Smartphone size={18} />
                  {store.name}
                </button>
              ))}
              <button onClick={handleAddStore} className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-2 bg-slate-800/50 text-slate-400 hover:bg-slate-800 border border-dashed border-slate-700 transition-colors">
                <Plus size={18} /> Add Location
              </button>
            </div>
          </div>

          {activeStoreId && (
             <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
               <h3 className="text-sm font-bold text-slate-300 mb-3">Linked Screens</h3>
               {activeScreens.length === 0 ? (
                 <p className="text-xs text-slate-500 italic">No screens linked yet.</p>
               ) : (
                 <ul className="space-y-2">
                   {activeScreens.map(scr => (
                     <li key={scr.id} className="flex items-center gap-2 text-xs text-emerald-400">
                       <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                       Screen {scr.id.slice(-4)}
                     </li>
                   ))}
                 </ul>
               )}
               
               <div className="mt-4 pt-4 border-t border-slate-700">
                  <label className="text-xs text-slate-400 mb-1 block">Pair New Screen</label>
                  <div className="flex gap-1">
                    <input 
                      type="text" 
                      placeholder="Code"
                      value={pairCodeInput}
                      onChange={(e) => setPairCodeInput(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white text-xs px-2 py-1 rounded focus:border-emerald-500 outline-none transition-colors"
                    />
                    <button onClick={handlePairScreen} className="bg-emerald-600 hover:bg-emerald-500 text-white p-1 rounded transition-colors">
                      <Plus size={14} />
                    </button>
                  </div>
               </div>
             </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-700">
          <button onClick={() => setMode('selection')} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
            <LogOut size={16} /> Exit Admin
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-8 overflow-y-auto bg-slate-50">
        {activeStoreId && currentStoreData ? (
          <div className="max-w-4xl mx-auto">
            <header className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-800">{currentStoreData.name} Playlist</h1>
                <p className="text-slate-500">Manage your digital signage content.</p>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 font-medium transition-all hover:scale-105 active:scale-95"
              >
                <Plus size={20} /> Add Content
              </button>
            </header>

            <div className="space-y-4">
              {currentStoreData.content && currentStoreData.content.length > 0 ? (
                currentStoreData.content.map((item, index) => (
                  <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-6 group hover:shadow-md transition-shadow">
                    <div className="flex flex-col gap-1 text-slate-400">
                      <button onClick={() => handleMoveItem(index, 'up')} disabled={index === 0} className="hover:text-indigo-600 disabled:opacity-30 transition-colors"><ArrowUp size={20} /></button>
                      <button onClick={() => handleMoveItem(index, 'down')} disabled={index === currentStoreData.content.length - 1} className="hover:text-indigo-600 disabled:opacity-30 transition-colors"><ArrowDown size={20} /></button>
                    </div>

                    <div 
                      className="w-32 h-20 rounded-lg flex items-center justify-center overflow-hidden border border-slate-200 shrink-0 shadow-inner"
                      style={{ backgroundColor: item.styles?.backgroundColor || '#f1f5f9' }}
                    >
                      {item.type === 'image' && (item.url ? <img src={item.url} className="w-full h-full object-cover" /> : <ImageIcon className="text-slate-400" />)}
                      {item.type === 'video' && <Play className="text-slate-400" />}
                      {item.type === 'pdf' && <FileText className="text-red-400" />}
                      {item.type === 'widget_weather' && <CloudSun className="text-blue-500" />}
                      {item.type === 'widget_ticker' && <Type className="text-emerald-500" />}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${
                          item.type.includes('widget') ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {item.type.replace('_', ' ')}
                        </span>
                        {item.scheduleStart && (
                           <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded flex items-center gap-1">
                             <Clock size={10} /> {item.scheduleStart} - {item.scheduleEnd}
                           </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-slate-800 truncate">
                        {item.type === 'widget_ticker' ? item.text : (item.text || 'Media Content')}
                      </h3>
                      <p className="text-sm text-slate-500">{item.duration}s • {item.styles?.fontFamily || 'Default Font'}</p>
                    </div>

                    <button 
                      onClick={() => handleDeleteItem(item)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-slate-200">
                  <Layout className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No content yet. Click "Add Content" to start.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
             <Smartphone className="w-16 h-16 mb-4 opacity-20" />
            <p>Select or Create a Location to begin.</p>
          </div>
        )}
      </div>

      {/* New Enhanced Split-Screen Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create Content">
        <div className="flex flex-col md:flex-row h-full relative">
          
          {/* Loading Overlay */}
          {isUploading && (
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-white">
              <Loader2 className="w-16 h-16 animate-spin text-emerald-500 mb-4" />
              <p className="text-xl font-bold">Uploading Media...</p>
              <p className="text-slate-400">Please wait while we save your file.</p>
            </div>
          )}

          {/* LEFT: Controls */}
          <div className="w-full md:w-1/3 bg-slate-800 p-6 overflow-y-auto border-r border-slate-700 space-y-6">
            
            {/* 1. Type Selection */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Content Type</label>
              <div className="grid grid-cols-3 gap-2">
                {['image', 'video', 'pdf', 'widget_ticker', 'widget_weather'].map(t => (
                  <button
                    key={t}
                    onClick={() => setNewItem({ ...newItem, type: t })}
                    className={`p-2 rounded text-xs font-bold uppercase transition-all ${newItem.type === t ? 'bg-emerald-500 text-white ring-2 ring-emerald-300' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                  >
                    {t.replace('widget_', '')}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Content Input */}
            <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-700">
              {['image', 'video', 'pdf'].includes(newItem.type) && (
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2 flex items-center gap-2">
                    <Upload size={16} className="text-emerald-400" /> Upload File
                  </label>
                  <input 
                    type="file" 
                    accept={newItem.type === 'video' ? "video/*" : newItem.type === 'pdf' ? ".pdf" : "image/*"}
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    {newItem.type.toUpperCase()} • Max 10MB
                  </p>
                </div>
              )}

              {newItem.type === 'widget_ticker' && (
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">Message Text</label>
                  <textarea 
                    rows="3"
                    value={newItem.text || ''}
                    onChange={(e) => setNewItem({ ...newItem, text: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white text-sm focus:border-emerald-500 outline-none"
                    placeholder="Enter your announcement here..."
                  />
                </div>
              )}
            </div>

            {/* 3. Custom Styles */}
            <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-700">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Palette size={14} /> Customization
              </label>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs text-slate-300 mb-1 block">Background</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={newItem.styles.backgroundColor}
                      onChange={(e) => setNewItem({ ...newItem, styles: { ...newItem.styles, backgroundColor: e.target.value } })}
                      className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
                    />
                    <span className="text-xs text-slate-400 font-mono">{newItem.styles.backgroundColor}</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-300 mb-1 block">Text Color</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={newItem.styles.color}
                      onChange={(e) => setNewItem({ ...newItem, styles: { ...newItem.styles, color: e.target.value } })}
                      className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
                    />
                    <span className="text-xs text-slate-400 font-mono">{newItem.styles.color}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs text-slate-300 mb-1 block">Font Family</label>
                  <select 
                    value={newItem.styles.fontFamily}
                    onChange={(e) => setNewItem({ ...newItem, styles: { ...newItem.styles, fontFamily: e.target.value } })}
                    className="w-full bg-slate-900 border border-slate-600 rounded text-xs text-white p-2"
                  >
                    <option value="ui-sans-serif">Sans Serif</option>
                    <option value="ui-serif">Serif</option>
                    <option value="ui-monospace">Monospace</option>
                    <option value="cursive">Handwritten</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-300 mb-1 block">Font Size</label>
                  <select 
                    value={newItem.styles.fontSize}
                    onChange={(e) => setNewItem({ ...newItem, styles: { ...newItem.styles, fontSize: e.target.value } })}
                    className="w-full bg-slate-900 border border-slate-600 rounded text-xs text-white p-2"
                  >
                    <option value="1.5rem">Small</option>
                    <option value="3rem">Medium</option>
                    <option value="5rem">Large</option>
                    <option value="8rem">Huge</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 mb-2 block">Content Placement</label>
                <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded border border-slate-600">
                  {['flex-start', 'center', 'flex-end'].map((align) => (
                    <button
                      key={align}
                      onClick={() => setNewItem({ ...newItem, styles: { ...newItem.styles, justifyContent: align } })} // Vertical in flex-col
                      className={`p-1 rounded text-[10px] uppercase ${newItem.styles.justifyContent === align ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                    >
                      {align === 'flex-start' ? 'Top' : align === 'center' ? 'Mid' : 'Bot'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. Timing */}
            <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-700">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block flex items-center gap-2">
                <Calendar size={14} /> Schedule & Duration
              </label>
              <div className="space-y-3">
                 <div>
                   <label className="text-xs text-slate-300">Duration (seconds)</label>
                   <input 
                     type="number" 
                     value={newItem.duration}
                     onChange={(e) => setNewItem({ ...newItem, duration: parseInt(e.target.value) })}
                     className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white text-sm"
                   />
                 </div>
                 <div className="grid grid-cols-2 gap-2">
                   <div>
                     <label className="text-xs text-slate-300">Start Hour</label>
                     <select 
                       value={newItem.scheduleStart} 
                       onChange={(e) => setNewItem({ ...newItem, scheduleStart: e.target.value })}
                       className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white text-xs"
                     >
                       <option value="">Always</option>
                       {Array.from({length: 24}).map((_, i) => <option key={i} value={`${i}:00`}>{i}:00</option>)}
                     </select>
                   </div>
                   <div>
                     <label className="text-xs text-slate-300">End Hour</label>
                     <select 
                       value={newItem.scheduleEnd} 
                       onChange={(e) => setNewItem({ ...newItem, scheduleEnd: e.target.value })}
                       className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white text-xs"
                     >
                       <option value="">Always</option>
                       {Array.from({length: 24}).map((_, i) => <option key={i} value={`${i}:00`}>{i}:00</option>)}
                     </select>
                   </div>
                 </div>
              </div>
            </div>
            
            <button 
              onClick={handleAddItem}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-4 rounded-lg shadow-lg transition-all transform hover:scale-[1.02]"
            >
              Add to Playlist
            </button>
          </div>

          {/* RIGHT: Live Preview */}
          <div className="w-full md:w-2/3 bg-slate-950 flex flex-col">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h4 className="text-slate-400 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                <MonitorPlay size={16} /> Live Device Preview
              </h4>
              <span className="text-xs text-slate-600">1920x1080 Aspect Ratio</span>
            </div>
            <div className="flex-1 p-8 flex items-center justify-center bg-slate-900/50">
              {/* Aspect Ratio Box mimicking a TV */}
              <div className="aspect-video w-full max-h-full bg-black shadow-2xl border-4 border-slate-800 rounded-lg overflow-hidden relative">
                <ContentPreview item={newItem} />
                
                {/* Simulated Widget Overlay for realism */}
                <div className="absolute top-4 right-4 bg-black/40 backdrop-blur px-3 py-1 rounded text-white text-xs font-mono border border-white/10">
                  12:00 PM
                </div>
              </div>
            </div>
          </div>

        </div>
      </Modal>
    </div>
  );
};

export default AdminDashboard;