```react
import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithCustomToken, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';

// --- CONFIGURASI FIREBASE ---
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
      apiKey: "",
      authDomain: "minecraft-hub-placeholder.firebaseapp.com",
      projectId: "minecraft-hub-placeholder",
      storageBucket: "minecraft-hub-placeholder.appspot.com",
      messagingSenderId: "123456789",
      appId: "1:123456789:web:abcdef"
    };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'minecraft-hub-mobile';

export default function App() {
  // --- STATE ---
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [siteName, setSiteName] = useState('CraftHub');
  const [siteSub, setSiteSub] = useState('Download Maps & Add-ons');
  const [adminPassword, setAdminPassword] = useState('admin123');
  const [adminUsername] = useState('admin');

  const [view, setView] = useState('landing');
  const [selectedItem, setSelectedItem] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Semua');

  // Admin states
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return sessionStorage.getItem('mc_hub_is_logged') === 'true';
  });
  const [adminTab, setAdminTab] = useState('tambah'); // tambah, kelola, settings_web, settings_pw

  // Add Item states
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState('Map');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemLink, setNewItemLink] = useState('');
  const [newItemImage, setNewItemImage] = useState('');
  const [imagePreview, setImagePreview] = useState('');

  // Form states
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [tempSiteName, setTempSiteName] = useState('');
  const [tempSiteSub, setTempSiteSub] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [loading, setLoading] = useState(true);

  const showNotification = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 2500);
  };

  // --- FIREBASE AUTH (RULE 3) ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // --- FIREBASE DATA SINKRONISASI ---
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const itemsRef = collection(db, 'artifacts', appId, 'public', 'data', 'mc_items');
    const unsubscribeItems = onSnapshot(itemsRef, (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setItems(list);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });

    const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'site_config', 'settings');
    const unsubscribeConfig = onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.siteName) {
          setSiteName(data.siteName);
          setTempSiteName(data.siteName);
        }
        if (data.siteSub) {
          setSiteSub(data.siteSub);
          setTempSiteSub(data.siteSub);
        }
        if (data.adminPassword) {
          setAdminPassword(data.adminPassword);
        }
      } else {
        setDoc(configRef, {
          siteName: 'CraftHub',
          siteSub: 'Download Maps & Add-ons',
          adminPassword: 'admin123'
        });
        setTempSiteName('CraftHub');
        setTempSiteSub('Download Maps & Add-ons');
      }
    });

    return () => {
      unsubscribeItems();
      unsubscribeConfig();
    };
  }, [user]);

  // --- NAVIGASI HASH ---
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash === '#/admin') {
        setView(isLoggedIn ? 'admin-dashboard' : 'admin-login');
      } else if (hash.startsWith('#/detail/')) {
        const id = hash.replace('#/detail/', '');
        const found = items.find(i => i.id === id);
        if (found) {
          setSelectedItem(found);
          setView('detail');
        } else {
          setView('landing');
        }
      } else {
        setView('landing');
      }
    };
    window.addEventListener('hashchange', handleHash);
    handleHash();
    return () => window.removeEventListener('hashchange', handleHash);
  }, [isLoggedIn, items]);

  // Handle image upload & compression sederhana di HP
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1.5 * 1024 * 1024) {
        showNotification('Ukuran foto terlalu besar! Maksimal 1.5 MB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setNewItemImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginUser === adminUsername && loginPass === adminPassword) {
      setIsLoggedIn(true);
      sessionStorage.setItem('mc_hub_is_logged', 'true');
      showNotification('Login Sukses!', 'success');
      window.location.hash = '#/admin';
    } else {
      showNotification('Sandi salah!', 'error');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    sessionStorage.removeItem('mc_hub_is_logged');
    showNotification('Berhasil keluar.', 'success');
    window.location.hash = '#/';
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItemName || !newItemDesc || !newItemLink) {
      showNotification('Lengkapi semua data!', 'error');
      return;
    }

    const defaultImg = newItemType === 'Map' 
      ? 'https://images.unsplash.com/photo-1607988795691-3d0147b43231?w=600&q=60'
      : 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&q=60';

    try {
      const collRef = collection(db, 'artifacts', appId, 'public', 'data', 'mc_items');
      await addDoc(collRef, {
        name: newItemName,
        type: newItemType,
        description: newItemDesc,
        downloadUrl: newItemLink,
        image: newItemImage || defaultImg,
        createdAt: Date.now()
      });
      showNotification('Berhasil dipublikasikan!', 'success');
      setNewItemName('');
      setNewItemDesc('');
      setNewItemLink('');
      setNewItemImage('');
      setImagePreview('');
    } catch (err) {
      showNotification('Gagal menyimpan!', 'error');
    }
  };

  const handleDeleteItem = async (id) => {
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'mc_items', id));
      showNotification('Item berhasil dihapus!', 'success');
    } catch (err) {
      showNotification('Gagal menghapus!', 'error');
    }
  };

  const handleUpdateSite = async (e) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'site_config', 'settings'), {
        siteName: tempSiteName,
        siteSub: tempSiteSub,
        adminPassword
      }, { merge: true });
      showNotification('Nama website diperbarui!', 'success');
    } catch (err) {
      showNotification('Gagal memperbarui!', 'error');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (oldPassword !== adminPassword) {
      showNotification('Sandi lama salah!', 'error');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showNotification('Konfirmasi sandi salah!', 'error');
      return;
    }
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'site_config', 'settings'), {
        adminPassword: newPassword
      }, { merge: true });
      showNotification('Sandi diperbarui!', 'success');
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      showNotification('Gagal mengganti sandi!', 'error');
    }
  };

  const filteredItems = items.filter(item => {
    const matchSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTab = activeTab === 'Semua' || item.type === activeTab;
    return matchSearch && matchTab;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-24 md:pb-0">
      
      {/* TOAST POPUP (Melayang Kecil di Atas Layar HP) */}
      {toast.show && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-11/12 max-w-xs animate-bounce-short">
          <div className={`px-4 py-3 rounded-2xl shadow-xl flex items-center justify-center gap-2 border text-xs font-bold ${
            toast.type === 'success' 
              ? 'bg-emerald-950/95 border-emerald-500 text-emerald-400' 
              : 'bg-rose-950/95 border-rose-500 text-rose-400'
          }`}>
            <span>{toast.type === 'success' ? '✅' : '❌'}</span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* 1. LANDING PAGE VIEW */}
      {view === 'landing' && (
        <div>
          {/* Header Mobile */}
          <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-900 px-4 py-4 flex items-center justify-between">
            <a href="#/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center font-black text-slate-950 text-sm">
                {siteName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-sm font-black tracking-wider text-white uppercase">{siteName}</h1>
                <p className="text-[9px] text-slate-400 truncate max-w-[150px]">{siteSub}</p>
              </div>
            </a>
            <a 
              href="#/admin" 
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 border border-slate-800 text-emerald-400 flex items-center gap-1 active:scale-95 transition-transform"
            >
              🔑 Admin
            </a>
          </header>

          {/* Hero Banner HP */}
          <section className="px-4 py-8 text-center bg-gradient-to-b from-emerald-950/20 to-transparent">
            <span className="inline-block px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-[10px] text-emerald-400 font-bold mb-4">
              🟢 ONLINE CLOUD DATABASE
            </span>
            <h2 className="text-2xl font-black text-white leading-tight">
              Katalog Modifikasi <span className="text-emerald-400">{siteName}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
              Temukan map petualangan seru dan add-on Minecraft PE gratis & aman tanpa ribet langsung dari HP-mu.
            </p>

            {/* Kotak Pencarian HP */}
            <div className="mt-6 max-w-sm mx-auto">
              <input 
                type="text" 
                placeholder="Cari map atau mod add-on..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
              />
            </div>
          </section>

          {/* Kategori Tab HP */}
          <main className="px-4 pb-12">
            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-none mb-6">
              {['Semua', 'Map', 'Add-on'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap active:scale-95 transition-transform ${
                    activeTab === tab 
                      ? 'bg-emerald-500 text-slate-950' 
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  {tab === 'Semua' ? '🔥 Semua' : tab === 'Map' ? '🗺️ Maps' : '⚙️ Add-ons'}
                </button>
              ))}
            </div>

            {/* Daftar Grid Item */}
            {loading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Loading database...</p>
              </div>
            ) : filteredItems.length > 0 ? (
              <div className="grid grid-cols-1 gap-6">
                {filteredItems.map((item) => (
                  <article key={item.id} className="bg-slate-900/40 rounded-2xl border border-slate-900 overflow-hidden flex flex-col">
                    <div className="relative aspect-video w-full bg-slate-950">
                      <span className={`absolute top-3 left-3 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                        item.type === 'Map' ? 'bg-indigo-600 text-white' : 'bg-emerald-500 text-slate-950'
                      }`}>
                        {item.type}
                      </span>
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="w-full h-full object-cover" 
                        loading="lazy"
                        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1607988795691-3d0147b43231?w=600&q=60'; }}
                      />
                    </div>
                    <div className="p-4 flex flex-col flex-grow">
                      <h3 className="font-bold text-white text-base truncate">{item.name}</h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed flex-grow">{item.description}</p>
                      
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-900">
                        <a 
                          href={`#/detail/${item.id}`} 
                          className="text-[11px] font-bold text-emerald-400 active:underline flex items-center gap-1"
                        >
                          Lihat Selengkapnya →
                        </a>
                        <a 
                          href={item.downloadUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="px-4 py-2 bg-emerald-500 text-slate-950 font-black text-[10px] rounded-lg active:scale-95"
                        >
                          UNDUH
                        </a>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-slate-900/10 rounded-2xl border border-slate-900">
                <p className="text-xs text-slate-500">Belum ada item ditambahkan.</p>
              </div>
            )}
          </main>

          <footer className="text-center py-8 border-t border-slate-900">
            <p className="text-[10px] text-slate-600">© 2026 {siteName}. Powered by Firebase Cloud.</p>
          </footer>
        </div>
      )}

      {/* 2. DETAIL VIEW */}
      {view === 'detail' && selectedItem && (
        <div className="px-4 py-6">
          <a href="#/" className="inline-flex items-center gap-1.5 text-xs text-slate-400 active:text-emerald-400 font-bold mb-6">
            ← Kembali ke Beranda
          </a>

          <div className="bg-slate-900/60 rounded-2xl border border-slate-900 overflow-hidden">
            <div className="relative aspect-video w-full bg-slate-950">
              <img src={selectedItem.image} alt={selectedItem.name} className="w-full h-full object-cover" />
            </div>
            <div className="p-5">
              <span className="px-2.5 py-1 rounded bg-slate-800 text-[9px] text-slate-400 uppercase font-black">{selectedItem.type}</span>
              <h2 className="text-xl font-black text-white mt-2 mb-3">{selectedItem.name}</h2>
              
              <div className="border-l-2 border-emerald-500 pl-3 py-1 my-5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Deskripsi Lengkap</h4>
                <p className="text-xs text-slate-300 leading-relaxed mt-2 whitespace-pre-wrap">{selectedItem.description}</p>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-900 mt-6 flex flex-col gap-4 text-center">
                <div>
                  <h4 className="text-xs font-bold text-white">Sudah Siap Bermain?</h4>
                  <p className="text-[10px] text-slate-500 mt-1">Dapatkan file instalasinya sekarang secara langsung dan aman.</p>
                </div>
                <a 
                  href={selectedItem.downloadUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="w-full py-3 bg-emerald-500 text-slate-950 font-black text-xs rounded-xl active:scale-95 shadow-lg shadow-emerald-500/10 text-center block"
                >
                  🚀 DOWNLOAD FILE
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. ADMIN LOGIN VIEW */}
      {view === 'admin-login' && (
        <div className="px-4 py-16 flex items-center justify-center min-h-[80vh]">
          <div className="w-full max-w-sm bg-slate-900 rounded-2xl border border-slate-900 p-6 shadow-xl">
            <div className="text-center mb-6">
              <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center font-black text-slate-950 mx-auto text-lg">🔑</div>
              <h3 className="text-lg font-black text-white mt-3">Portal Admin</h3>
              <p className="text-[10px] text-slate-500 mt-1">Silakan masuk menggunakan kredensial database Anda</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Username</label>
                <input 
                  type="text" 
                  required
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                  placeholder="admin"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Password</label>
                <input 
                  type="password" 
                  required
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                />
              </div>
              <button 
                type="submit" 
                className="w-full py-3 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl active:scale-95"
              >
                Masuk
              </button>
            </form>
            <div className="text-center mt-5">
              <a href="#/" className="text-xs text-slate-500 active:text-white">← Kembali ke Beranda</a>
            </div>
          </div>
        </div>
      )}

      {/* 4. ADMIN DASHBOARD VIEW (Bottom Bar Optimized for Mobile Touch) */}
      {view === 'admin-dashboard' && (
        <div className="min-h-screen bg-slate-950 flex flex-col">
          
          {/* Header Dashboard HP */}
          <header className="sticky top-0 bg-slate-900 border-b border-slate-850 px-4 py-4 flex items-center justify-between z-10">
            <div>
              <span className="text-[9px] font-black uppercase text-emerald-500">Database Cloud</span>
              <h2 className="text-sm font-bold text-white truncate max-w-[180px]">
                {adminTab === 'tambah' && 'Tambah Karya'}
                {adminTab === 'kelola' && 'Kelola Katalog'}
                {adminTab === 'settings_web' && 'Ubah Nama Web'}
                {adminTab === 'settings_pw' && 'Ganti Sandi'}
              </h2>
            </div>
            <a href="#/" className="px-3 py-1.5 bg-slate-800 text-xs text-slate-300 rounded-lg active:scale-95">
              👁️ Lihat Web
            </a>
          </header>

          {/* Form / Content area */}
          <main className="flex-grow p-4 pb-28">
            
            {/* TAB: TAMBAH ITEM */}
            {adminTab === 'tambah' && (
              <form onSubmit={handleAddItem} className="space-y-5 bg-slate-900/40 p-4 rounded-2xl border border-slate-900">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nama Item</label>
                  <input 
                    type="text" 
                    required
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="Contoh: World Survival Extreme"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tipe</label>
                  <select 
                    value={newItemType}
                    onChange={(e) => setNewItemType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                  >
                    <option value="Map">🗺️ Map</option>
                    <option value="Add-on">⚙️ Add-on</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Deskripsi Ringkas</label>
                  <textarea 
                    rows="3" 
                    required
                    value={newItemDesc}
                    onChange={(e) => setNewItemDesc(e.target.value)}
                    placeholder="Tulis deskripsi detail map atau mod ini..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                  ></textarea>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tautan Unduhan (Download Link)</label>
                  <input 
                    type="url" 
                    required
                    value={newItemLink}
                    onChange={(e) => setNewItemLink(e.target.value)}
                    placeholder="https://mediafire.com/..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Pilih Foto Thumbnail</label>
                  <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-850">
                    <label className="cursor-pointer px-4 py-2 bg-slate-800 active:bg-slate-700 text-[10px] font-bold rounded-lg text-white text-center">
                      📁 Ambil Foto
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-10 h-10 object-cover rounded-lg" />
                    ) : (
                      <span className="text-[9px] text-slate-500">Belum ada foto</span>
                    )}
                  </div>
                </div>
                <button type="submit" className="w-full py-3 bg-emerald-500 text-slate-950 font-black text-xs rounded-xl active:scale-95 shadow-lg">
                  🚀 PUBLIKASIKAN KARYA
                </button>
              </form>
            )}

            {/* TAB: KELOLA ITEM */}
            {adminTab === 'kelola' && (
              <div className="space-y-4">
                {items.length > 0 ? (
                  items.map(item => (
                    <div key={item.id} className="p-3 bg-slate-900/40 rounded-xl border border-slate-900 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 truncate">
                        <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded-lg bg-slate-950 flex-shrink-0" />
                        <div className="truncate">
                          <h4 className="font-bold text-white text-xs truncate">{item.name}</h4>
                          <span className="text-[8px] uppercase bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">{item.type}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-2.5 bg-rose-500/15 text-rose-400 hover:text-white rounded-lg active:scale-95"
                      >
                        🗑️
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-8 text-xs text-slate-500">Katalog kosong.</p>
                )}
              </div>
            )}

            {/* TAB: UBAH NAMA WEB */}
            {adminTab === 'settings_web' && (
              <form onSubmit={handleUpdateSite} className="space-y-5 bg-slate-900/40 p-4 rounded-2xl border border-slate-900">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nama Website Baru</label>
                  <input 
                    type="text" 
                    required
                    value={tempSiteName}
                    onChange={(e) => setTempSiteName(e.target.value)}
                    placeholder="Contoh: MineCraft Indo Hub"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Slogan Website Baru</label>
                  <input 
                    type="text" 
                    required
                    value={tempSiteSub}
                    onChange={(e) => setTempSiteSub(e.target.value)}
                    placeholder="Pusat Download Map Terpopuler"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                  />
                </div>
                <button type="submit" className="w-full py-3 bg-emerald-500 text-slate-950 font-black text-xs rounded-xl active:scale-95">
                  💾 SIMPAN PERUBAHAN NAMA
                </button>
              </form>
            )}

            {/* TAB: GANTI SANDI */}
            {adminTab === 'settings_pw' && (
              <form onSubmit={handleChangePassword} className="space-y-5 bg-slate-900/40 p-4 rounded-2xl border border-slate-900">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Sandi Lama</label>
                  <input 
                    type="password" 
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Sandi Baru</label>
                  <input 
                    type="password" 
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 5 karakter"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Ulangi Sandi Baru</label>
                  <input 
                    type="password" 
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                  />
                </div>
                <button type="submit" className="w-full py-3 bg-emerald-500 text-slate-950 font-black text-xs rounded-xl active:scale-95">
                  🔐 SIMPAN SANDI BARU
                </button>
              </form>
            )}

          </main>

          {/* BOTTOM NAVIGATION BAR (Sangat Nyaman diakses di HP) */}
          <nav className="fixed bottom-0 left-0 right-0 h-16 bg-slate-900/95 backdrop-blur-md border-t border-slate-850 flex items-center justify-around z-20 px-2 pb-1">
            <button 
              onClick={() => setAdminTab('tambah')}
              className={`flex flex-col items-center justify-center flex-1 py-1 ${adminTab === 'tambah' ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}
            >
              <span className="text-lg">➕</span>
              <span className="text-[9px] mt-0.5">Tambah</span>
            </button>
            <button 
              onClick={() => setAdminTab('kelola')}
              className={`flex flex-col items-center justify-center flex-1 py-1 ${adminTab === 'kelola' ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}
            >
              <span className="text-lg">🗂️</span>
              <span className="text-[9px] mt-0.5">Kelola</span>
            </button>
            <button 
              onClick={() => setAdminTab('settings_web')}
              className={`flex flex-col items-center justify-center flex-1 py-1 ${adminTab === 'settings_web' ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}
            >
              <span className="text-lg">✏️</span>
              <span className="text-[9px] mt-0.5">Edit Web</span>
            </button>
            <button 
              onClick={() => setAdminTab('settings_pw')}
              className={`flex flex-col items-center justify-center flex-1 py-1 ${adminTab === 'settings_pw' ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}
            >
              <span className="text-lg">🔒</span>
              <span className="text-[9px] mt-0.5">Sandi</span>
            </button>
            <button 
              onClick={handleLogout}
              className="flex flex-col items-center justify-center flex-1 py-1 text-rose-500"
            >
              <span className="text-lg">🚪</span>
              <span className="text-[9px] mt-0.5">Keluar</span>
            </button>
          </nav>

        </div>
      )}

    </div>
  );
}

```
