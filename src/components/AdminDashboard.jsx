import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { 
  Settings, Smartphone, Plus, LogOut, ArrowUp, ArrowDown, 
  Trash2, Image as ImageIcon, Play, CloudSun, Type, Calendar, Layout,
  Clock 
} from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-lg w-full max-w-lg p-6 border border-slate-700 shadow-2xl animate-fade-in">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

const AdminDashboard = ({ db, user, appId, setMode }) => {
  const [stores, setStores] = useState([]);
  const [screens, setScreens] = useState([]);
  const [activeStoreId, setActiveStoreId] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({ type: 'image', url: '', duration: 10, scheduleStart: '', scheduleEnd: '' });
  const [pairCodeInput, setPairCodeInput] = useState('');

  // Fetch Stores
  useEffect(() => {
    // FIXED: Removed 'public' to ensure path has 3 segments (Collection)
    // Path: artifacts/{appId}/data
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
      // Default to first store if none selected
      if (!activeStoreId && s.length > 0) setActiveStoreId(s[0].id);
    });
    return () => unsub();
  }, [db, appId]);

  // Actions
  const handleAddStore = async () => {
    const name = prompt("Enter new Store Name:");
    if (!name) return;
    const newId = name.toLowerCase().replace(/\s/g, '_');
    // FIXED: Removed 'public'
    await setDoc(doc(db, 'artifacts', appId, 'data', `store_${newId}`), {
      name,
      content: []
    });
  };

  const handlePairScreen = async () => {
    if (!activeStoreId) return alert("Select a store first");
    // Find screen with this code
    const targetScreen = screens.find(s => s.pairingCode === pairCodeInput);
    if (targetScreen) {
      // FIXED: Removed 'public'
      await updateDoc(doc(db, 'artifacts', appId, 'data', `screen_${targetScreen.id}`), {
        storeId: activeStoreId
      });
      setPairCodeInput('');
      alert("Screen Paired Successfully!");
    } else {
      alert("Invalid Code or Screen Offline");
    }
  };

  const handleAddItem = async () => {
    if (!activeStoreId) return;
    // FIXED: Removed 'public'
    const storeRef = doc(db, 'artifacts', appId, 'data', `store_${activeStoreId}`);
    
    const itemToAdd = {
      ...newItem,
      id: Date.now().toString(),
    };

    const currentStore = stores.find(s => s.id === activeStoreId);
    const newContent = [...(currentStore?.content || []), itemToAdd];

    await updateDoc(storeRef, { content: newContent });
    setIsAddModalOpen(false);
    setNewItem({ type: 'image', url: '', duration: 10, scheduleStart: '', scheduleEnd: '' });
  };

  const handleDeleteItem = async (itemId) => {
    const currentStore = stores.find(s => s.id === activeStoreId);
    const newContent = currentStore.content.filter(i => i.id !== itemId);
    // FIXED: Removed 'public'
    await updateDoc(doc(db, 'artifacts', appId, 'data', `store_${activeStoreId}`), { content: newContent });
  };

  const handleMoveItem = async (index, direction) => {
    const currentStore = stores.find(s => s.id === activeStoreId);
    const newContent = [...currentStore.content];
    if (direction === 'up' && index > 0) {
      [newContent[index], newContent[index - 1]] = [newContent[index - 1], newContent[index]];
    } else if (direction === 'down' && index < newContent.length - 1) {
      [newContent[index], newContent[index + 1]] = [newContent[index + 1], newContent[index]];
    }
    // FIXED: Removed 'public'
    await updateDoc(doc(db, 'artifacts', appId, 'data', `store_${activeStoreId}`), { content: newContent });
  };

  // Get screens for current store
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
          {/* Store Selector */}
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

          {/* Connected Screens Status */}
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
               
               {/* Pair Input */}
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
                <p className="text-slate-500">Manage what plays on your screens here.</p>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 font-medium transition-all hover:scale-105 active:scale-95"
              >
                <Plus size={20} /> Add Content
              </button>
            </header>

            {/* Playlist Grid */}
            <div className="space-y-4">
              {currentStoreData.content && currentStoreData.content.length > 0 ? (
                currentStoreData.content.map((item, index) => (
                  <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-6 group hover:shadow-md transition-shadow">
                    <div className="flex flex-col gap-1 text-slate-400">
                      <button onClick={() => handleMoveItem(index, 'up')} disabled={index === 0} className="hover:text-indigo-600 disabled:opacity-30 transition-colors"><ArrowUp size={20} /></button>
                      <button onClick={() => handleMoveItem(index, 'down')} disabled={index === currentStoreData.content.length - 1} className="hover:text-indigo-600 disabled:opacity-30 transition-colors"><ArrowDown size={20} /></button>
                    </div>

                    {/* Thumbnail / Icon */}
                    <div className="w-32 h-20 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden border border-slate-200 shrink-0">
                      {item.type === 'image' && (item.url ? <img src={item.url} className="w-full h-full object-cover" /> : <ImageIcon className="text-slate-400" />)}
                      {item.type === 'video' && <Play className="text-slate-400" />}
                      {item.type === 'widget_weather' && <CloudSun className="text-blue-500" />}
                      {item.type === 'widget_ticker' && <Type className="text-emerald-500" />}
                    </div>

                    {/* Details */}
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
                        {item.type === 'widget_ticker' ? item.text : (item.url || 'Untitled Item')}
                      </h3>
                      <p className="text-sm text-slate-500">{item.duration} seconds</p>
                    </div>

                    {/* Actions */}
                    <button 
                      onClick={() => handleDeleteItem(item.id)}
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

      {/* Add Content Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add to Playlist">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Content Type</label>
            <div className="grid grid-cols-4 gap-2">
              {['image', 'video', 'widget_weather', 'widget_ticker'].map(t => (
                <button
                  key={t}
                  onClick={() => setNewItem({ ...newItem, type: t })}
                  className={`p-2 rounded text-xs font-bold uppercase transition-colors ${newItem.type === t ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                >
                  {t.replace('widget_', '')}
                </button>
              ))}
            </div>
          </div>

          {['image', 'video'].includes(newItem.type) && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Media URL</label>
              <input 
                type="text" 
                placeholder="https://..." 
                value={newItem.url}
                onChange={(e) => setNewItem({ ...newItem, url: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm focus:border-emerald-500 outline-none transition-colors"
              />
              <p className="text-xs text-slate-500 mt-1">Paste a direct link to an image or video.</p>
            </div>
          )}

          {newItem.type === 'widget_ticker' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Message Text</label>
              <textarea 
                rows="3"
                value={newItem.text || ''}
                onChange={(e) => setNewItem({ ...newItem, text: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm focus:border-emerald-500 outline-none transition-colors"
                placeholder="Enter your announcement here..."
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium text-slate-300 mb-1">Duration (sec)</label>
               <input 
                 type="number" 
                 value={newItem.duration}
                 onChange={(e) => setNewItem({ ...newItem, duration: parseInt(e.target.value) })}
                 className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm focus:border-emerald-500 outline-none transition-colors"
               />
             </div>
             <div className="flex items-end">
               <span className="text-xs text-slate-400 pb-3">Default is 10s</span>
             </div>
          </div>

          <div className="border-t border-slate-700 pt-4 mt-2">
             <label className="block text-sm font-medium text-emerald-400 mb-2 flex items-center gap-2">
               <Calendar size={16} /> Day Parting (Optional)
             </label>
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="text-xs text-slate-400">Start Hour (0-23)</label>
                 <select 
                   value={newItem.scheduleStart || ''}
                   onChange={(e) => setNewItem({ ...newItem, scheduleStart: e.target.value })}
                   className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm focus:border-emerald-500 outline-none transition-colors"
                 >
                   <option value="">Always</option>
                   {Array.from({length: 24}).map((_, i) => (
                     <option key={i} value={`${i}:00`}>{i}:00</option>
                   ))}
                 </select>
               </div>
               <div>
                 <label className="text-xs text-slate-400">End Hour</label>
                 <select 
                   value={newItem.scheduleEnd || ''}
                   onChange={(e) => setNewItem({ ...newItem, scheduleEnd: e.target.value })}
                   className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm focus:border-emerald-500 outline-none transition-colors"
                 >
                   <option value="">Always</option>
                   {Array.from({length: 24}).map((_, i) => (
                     <option key={i} value={`${i}:00`}>{i}:00</option>
                   ))}
                 </select>
               </div>
             </div>
          </div>

          <button 
            onClick={handleAddItem}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg mt-4 transition-colors"
          >
            Add to Playlist
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminDashboard;