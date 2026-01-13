
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Language, UserProfile, HelpRequest, ChatMessage, ChatRoom } from './types';
import { translations } from './translations';

// Using declare to avoid TS errors for globally injected scripts
declare const firebase: any;

// Helper components defined outside to prevent re-renders
const MenuItem: React.FC<{icon: string, label: string, onClick: () => void, active?: boolean}> = ({icon, label, onClick, active}) => (
    <button onClick={onClick} className={`flex items-center gap-3 sm:gap-5 p-3 sm:p-5 rounded-xl sm:rounded-2xl transition-all ${active ? 'bg-[#3498db] text-white shadow-xl scale-105' : 'text-gray-400 hover:bg-gray-50 hover:text-[#2c3e50]'}`}>
        <div className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg sm:rounded-xl ${active ? 'bg-white/20' : 'bg-gray-100'}`}>
            <i className={`fas fa-${icon} text-xs sm:text-sm`}></i>
        </div>
        <span className="font-black text-[10px] sm:text-xs uppercase tracking-widest">{label}</span>
    </button>
);

const AdminMenuItem: React.FC<{icon: string, label: string, active: boolean, onClick: () => void}> = ({icon, label, active, onClick}) => (
    <button 
        onClick={onClick}
        className={`w-full flex items-center gap-5 p-5 rounded-2xl transition-all group ${active ? 'bg-[#3498db] text-white shadow-xl translate-x-2' : 'text-gray-400 hover:bg-white/5'}`}
    >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${active ? 'bg-white/20' : 'bg-white/5 group-hover:bg-[#3498db]/20 group-hover:text-[#3498db]'}`}>
            <i className={`fas fa-${icon}`}></i>
        </div>
        <span className="hidden sm:inline font-black uppercase text-[11px] tracking-widest">{label}</span>
    </button>
);

const AdminInput: React.FC<{label: string, value: any, onChange?: (v: any) => void, type?: string, disabled?: boolean, placeholder?: string}> = ({label, value, onChange, type = 'text', disabled = false, placeholder}) => (
    <div className="space-y-2">
        <label className="text-[8px] font-black uppercase text-gray-300 tracking-[0.2em] ml-1">{label}</label>
        <input 
            type={type} 
            value={value} 
            disabled={disabled}
            placeholder={placeholder}
            onChange={e => onChange?.(type === 'number' ? Number(e.target.value) : e.target.value)}
            className={`w-full p-4 rounded-2xl border-2 font-bold transition-all text-sm outline-none ${disabled ? 'bg-gray-50 border-gray-50 text-gray-300' : 'bg-white border-gray-100 focus:border-[#3498db] text-[#2c3e50]'}`}
        />
    </div>
);

// Main Application Component
const App: React.FC = () => {
    const [lang, setLang] = useState<Language>(Language.EN);
    const [user, setUser] = useState<UserProfile | null>(null);
    const [page, setPage] = useState<string>('home');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isLangOpen, setIsLangOpen] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
    const [isSupportOpen, setIsSupportOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [itemToRedeem, setItemToRedeem] = useState<any>(null);
    
    const sidebarRef = useRef<HTMLElement>(null);
    const langDropdownRef = useRef<HTMLDivElement>(null);

    const t = useCallback((key: string) => translations[lang][key] || key, [lang]);

    const langDisplayNames: Record<Language, string> = {
        [Language.EN]: 'ENGLISH',
        [Language.BM]: 'B. MELAYU',
        [Language.BC]: '中文 (BC)',
        [Language.BI]: 'B.IBAN'
    };

    useEffect(() => {
        try {
            const firebaseConfig = {
                apiKey: "AIzaSyDOl93LVxhrfcz04Kj2D2dSQkp22jaeiog",
                authDomain: "miri-care-connect-95a63.firebaseapp.com",
                projectId: "miri-care-connect-95a63",
                storageBucket: "miri-care-connect-95a63.firebasestorage.app",
                messagingSenderId: "419556521920",
                appId: "1:419556521920:web:628bc9d7195fca073a3a25",
                measurementId: "G-7F4LG9P6EC"
            };
            if (typeof firebase !== 'undefined' && !firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }

            const unsubscribeAuth = firebase.auth().onAuthStateChanged(async (authUser: any) => {
                if (authUser) {
                    const db = firebase.firestore();
                    const unsubscribeDoc = db.collection('users').doc(authUser.uid).onSnapshot((doc: any) => {
                        if (doc.exists) {
                            setUser(doc.data() as UserProfile);
                        } else {
                            const fallbackUser: UserProfile = {
                                uid: authUser.uid,
                                email: authUser.email,
                                displayName: authUser.displayName || authUser.email.split('@')[0],
                                points: 10,
                                settings: { autoShareContact: true, receiveNotifications: true, shareLocation: true, profileVisibility: 'public' }
                            };
                            setUser(fallbackUser);
                        }
                    }, (err: any) => console.error("User doc error", err));
                    return () => unsubscribeDoc();
                } else { 
                    setUser(null); 
                }
                setLoading(false);
            });

            return () => unsubscribeAuth();
        } catch (err) {
            console.error("Firebase init error:", err);
            setLoading(false);
        }
    }, []);

    const handleLogout = async () => {
        try {
            await firebase.auth().signOut();
            setUser(null);
            setPage('home');
            setIsMenuOpen(false);
            setIsAdminPanelOpen(false);
            setIsSupportOpen(false);
        } catch (err) {
            console.error("Logout error", err);
        }
    };

    if (loading) return (
        <div className="h-screen w-screen flex items-center justify-center bg-[#f8f9fa] text-[#3498db] font-black italic uppercase">
            <i className="fas fa-spinner fa-spin text-5xl mr-4"></i>Loading
        </div>
    );

    return (
        <div className="min-h-screen flex flex-col bg-[#f8f9fa] font-sans selection:bg-blue-100 selection:text-blue-900">
            <header className="bg-[#2c3e50] text-white shadow-xl sticky top-0 z-[100] h-14 sm:h-20 flex items-center">
                <div className="container mx-auto px-4 flex items-center justify-between">
                    <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(true); }} className="p-2 sm:p-3 hover:bg-white/10 rounded-xl transition-all flex items-center gap-2 sm:gap-3">
                        <i className="fas fa-bars text-lg sm:text-xl"></i>
                        <span className="hidden lg:inline font-bold uppercase tracking-widest text-xs">{t('menu')}</span>
                    </button>
                    
                    <div className="flex-1 text-center font-black tracking-tight sm:tracking-widest cursor-pointer text-sm sm:text-xl px-2 uppercase" onClick={() => setPage('home')}>
                        MIRI <span className="text-[#3498db]">CARE</span> CONNECT
                    </div>
                    
                    <div className="flex items-center gap-2 sm:gap-6">
                        {user && (user.isAdmin || user.email === 'admin@gmail.com') && (
                            <button onClick={() => setIsAdminPanelOpen(true)} className="hidden sm:flex bg-[#3498db] px-4 py-2 rounded-full text-xs font-black items-center gap-2 shadow-lg">
                                <i className="fas fa-user-shield"></i> ADMIN
                            </button>
                        )}
                        {user && (
                            <div className="flex bg-[#f39c12] px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs font-black items-center gap-1.5 sm:gap-2 shadow-lg cursor-pointer transition-all hover:scale-105" onClick={() => setPage('profile')}>
                                <i className="fas fa-coins"></i><span>{user.points || 0} PTS</span>
                            </div>
                        )}
                        {user ? (
                            <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs font-black transition-all shadow-lg uppercase tracking-tight">
                                <i className="fas fa-sign-out-alt sm:mr-2"></i><span className="hidden sm:inline">{t('logout')}</span>
                            </button>
                        ) : (
                            <button onClick={() => setIsAuthModalOpen(true)} className="bg-[#3498db] hover:bg-blue-600 px-4 sm:px-6 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-tight shadow-lg transition-all">{t('login_register')}</button>
                        )}
                    </div>
                </div>
            </header>

            <div 
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] transition-opacity duration-500 ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} 
                onClick={() => setIsMenuOpen(false)} 
            />

            <aside 
                ref={sidebarRef}
                className={`fixed top-0 left-0 h-full w-[85vw] sm:w-[33.33vw] bg-white z-[201] transform transition-transform duration-500 ease-in-out shadow-[20px_0_60px_rgba(0,0,0,0.3)] flex flex-col ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 sm:p-12 flex flex-col h-full">
                    <div className="flex justify-between items-center mb-8 sm:mb-12">
                        <h2 className="text-xl sm:text-2xl font-black italic tracking-tighter text-[#2c3e50] uppercase">Miri Connect</h2>
                        <button onClick={() => setIsMenuOpen(false)} className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:text-red-500 transition-colors">
                            <i className="fas fa-times text-lg"></i>
                        </button>
                    </div>
                    <nav className="flex flex-col gap-1.5 sm:gap-2 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        <MenuItem icon="home" label={t('home')} onClick={() => { setPage('home'); setIsMenuOpen(false); }} active={page === 'home'} />
                        <MenuItem icon="hand-holding-heart" label="Offer Help" onClick={() => { 
                            setPage('offer_help'); 
                            setIsMenuOpen(false); 
                        }} active={page === 'offer_help'} />
                        <MenuItem icon="user" label={t('profile')} onClick={() => { setPage('profile'); setIsMenuOpen(false); }} active={page === 'profile'} />
                        <MenuItem icon="shopping-cart" label={t('points_shop')} onClick={() => { setPage('shop'); setIsMenuOpen(false); }} active={page === 'shop'} />
                        <MenuItem icon="history" label={t('history')} onClick={() => { setPage('history'); setIsMenuOpen(false); }} active={page === 'history'} />
                    </nav>
                </div>
            </aside>

            <main className="flex-1 container mx-auto px-4 py-4 sm:py-8 max-w-6xl">
                {page === 'home' && <HomePage onNavigate={setPage} t={t} user={user} onAuth={() => setIsAuthModalOpen(true)} />}
                {page === 'offer_help' && <OfferHelpPage user={user} onAuth={() => setIsAuthModalOpen(true)} onNavigate={setPage} />}
                {page === 'profile' && <ProfilePage user={user} t={t} onAuth={() => setIsAuthModalOpen(true)} onNavigate={setPage} />}
                {page === 'shop' && <ShopPage user={user} t={t} onAuth={() => setIsAuthModalOpen(true)} onRedeemConfirm={setItemToRedeem} />}
                {page === 'history' && <HistoryPage user={user} t={t} onAuth={() => setIsAuthModalOpen(true)} />}
            </main>

            {isAuthModalOpen && <AuthModal onClose={() => setIsAuthModalOpen(false)} t={t} />}
            {isAdminPanelOpen && <AdminPanel onClose={() => setIsAdminPanelOpen(false)} t={t} user={user!} />}
            {isSupportOpen && <SupportWindow user={user} onClose={() => setIsSupportOpen(false)} onAuth={() => setIsAuthModalOpen(true)} t={t} />}
            
            {itemToRedeem && (
                <RedeemConfirmModal 
                    item={itemToRedeem} 
                    user={user!} 
                    onCancel={() => setItemToRedeem(null)} 
                    onConfirm={async (fullName, userClass) => {
                        const db = firebase.firestore();
                        try {
                            const userRef = db.collection('users').doc(user!.uid);
                            await db.runTransaction(async (transaction: any) => {
                                const userDoc = await transaction.get(userRef);
                                if (userDoc.data().points < itemToRedeem.cost) throw new Error("Not enough points");
                                transaction.update(userRef, { points: userDoc.data().points - itemToRedeem.cost });
                                transaction.set(db.collection('redeem_history').doc(), {
                                    userId: user!.uid, userEmail: user!.email, fullName, userClass, itemName: itemToRedeem.name, 
                                    itemPoints: itemToRedeem.cost, redeemedAt: firebase.firestore.FieldValue.serverTimestamp()
                                });
                            });
                            setItemToRedeem(null);
                            alert("Voucher redeemed! Check your collection point.");
                        } catch (e) { alert("Redemption failed: " + e); }
                    }} 
                    t={t} 
                />
            )}
        </div>
    );
};

const HomePage: React.FC<{onNavigate: (p: string) => void, t: any, user: UserProfile | null, onAuth: () => void}> = ({onNavigate, t, user, onAuth}) => {
    const [donations, setDonations] = useState<any[]>([]);

    useEffect(() => {
        const db = firebase.firestore();
        const unsubscribe = db.collection('donations').orderBy('createdAt', 'desc').onSnapshot((snap: any) => {
            setDonations(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
        });
        return () => unsubscribe();
    }, []);

    return (
        <div className="space-y-12 pb-24">
            <section className="bg-[#2c3e50] text-white rounded-2xl sm:rounded-[3rem] p-8 sm:p-24 text-center shadow-2xl relative border-b-4 sm:border-b-8 border-[#3498db]">
                <h1 className="text-3xl sm:text-7xl font-black mb-3 sm:mb-8 italic uppercase tracking-tighter leading-tight">{t('hero_title')}</h1>
                <p className="text-sm sm:text-xl opacity-80 max-w-2xl mx-auto leading-relaxed font-bold uppercase">{t('hero_description')}</p>
            </section>

            <div className="max-w-6xl mx-auto space-y-6">
                <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#3498db]">
                            <i className="fas fa-box"></i>
                        </div>
                        <h2 className="text-xl font-black text-[#2c3e50] tracking-tight">Available Extra Items</h2>
                    </div>
                    <div className="bg-blue-50 text-[#3498db] px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <i className="fas fa-bolt text-[10px]"></i> LIVE UPDATES
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {donations.length === 0 ? (
                        <div className="col-span-full py-20 text-center text-gray-300 font-black uppercase italic tracking-widest bg-white rounded-2xl border-2 border-dashed border-gray-100">
                            No active donations available
                        </div>
                    ) : donations.map(item => (
                        <div key={item.id} className="bg-white p-6 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.04)] border border-gray-100 flex flex-col hover:shadow-xl transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-2xl font-black text-[#2c3e50] leading-tight group-hover:text-[#3498db] transition-colors">{item.itemName}</h3>
                                <div className="bg-blue-50 text-[#3498db] px-4 py-1.5 rounded-full text-[10px] font-black">
                                    Qty: {item.qty}
                                </div>
                            </div>
                            
                            <div className="mb-6">
                                <span className="bg-gray-50 text-gray-400 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider">
                                    {item.category}
                                </span>
                            </div>

                            <div className="space-y-3 flex-1 mb-6">
                                <div className="flex items-center gap-3 text-gray-400">
                                    <i className="far fa-user w-4"></i>
                                    <span className="text-sm font-bold">{item.donorName}</span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-400">
                                    <i className="far fa-calendar w-4"></i>
                                    <span className="text-sm font-bold">
                                        {item.createdAt ? item.createdAt.toDate().toLocaleDateString('en-GB') : 'Just now'}
                                    </span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-50">
                                <div className="flex items-center gap-2 text-[10px] font-black italic text-gray-300 uppercase tracking-tight">
                                    <i className="fas fa-map-marker-alt"></i>
                                    <span>Destination: SMK Lutong</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const OfferHelpPage: React.FC<{user: UserProfile | null, onAuth: () => void, onNavigate: (p: string) => void}> = ({user, onAuth, onNavigate}) => {
    const [itemName, setItemName] = useState('');
    const [category, setCategory] = useState('Food');
    const [qty, setQty] = useState(1);
    const [donorName, setDonorName] = useState(user?.displayName || '');
    const [isPosting, setIsPosting] = useState(false);

    const handlePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) { onAuth(); return; }
        if (!itemName.trim() || !donorName.trim()) return;

        setIsPosting(true);
        const db = firebase.firestore();
        try {
            await db.collection('donations').add({
                itemName,
                category,
                qty,
                donorName,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                userId: user.uid
            });
            await db.collection('users').doc(user.uid).update({
                points: (user.points || 0) + 10
            });
            alert("YOU HAD SUCCESSFULLY POST YOUR OFFER , PLEASE SEND YOUR ITEM TO BILIK PENGAWAS SMK LUTONG(DONATION IS AVAILABLE ON MONDAY , TUESDAY AND FRIDAY FROM 6.15AM-6.50AM)");
            onNavigate('home');
        } catch (err) { console.error(err); } 
        finally { setIsPosting(false); }
    };

    if (!user) {
        return (
            <div className="max-w-4xl mx-auto py-24 px-4 flex flex-col items-center justify-center text-center">
                <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mb-8 shadow-inner border-4 border-white">
                    <i className="fas fa-lock text-5xl text-gray-300"></i>
                </div>
                <h2 className="text-4xl font-black text-[#2c3e50] mb-4 uppercase tracking-tighter">Page Locked</h2>
                <p className="text-gray-400 font-bold max-w-md mb-10 leading-relaxed uppercase text-sm">
                    Please log in to share your extra items with others and earn kindness points!
                </p>
                <button 
                    onClick={onAuth}
                    className="bg-[#3498db] text-white px-12 py-5 rounded-full font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 hover:scale-105 active:scale-95 transition-all"
                >
                    Log In Now
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-12 px-4">
            <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-12 border border-gray-50">
                <div className="flex items-center gap-4 mb-10">
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-[#3498db]">
                        <i className="far fa-heart text-2xl"></i>
                    </div>
                    <h2 className="text-3xl font-black text-[#2c3e50] tracking-tight">Share Your Extra Items</h2>
                </div>

                <form onSubmit={handlePost} className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                    <div className="space-y-3">
                        <label className="text-sm font-black text-[#2c3e50] uppercase tracking-widest ml-1">What are you donating?</label>
                        <input 
                            value={itemName}
                            onChange={e => setItemName(e.target.value)}
                            placeholder="Enter item name (e.g. Rice, Notebooks...)"
                            className="w-full p-5 rounded-2xl border-2 border-gray-100 focus:border-[#3498db] outline-none transition-all font-bold text-[#2c3e50] bg-white"
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-black text-[#2c3e50] uppercase tracking-widest ml-1">Category</label>
                        <select 
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            className="w-full p-5 rounded-2xl border-2 border-gray-100 focus:border-[#3498db] outline-none transition-all font-bold text-[#2c3e50] bg-white appearance-none"
                        >
                            <option>Food</option>
                            <option>Clothing</option>
                            <option>Stationary</option>
                            <option>Others</option>
                        </select>
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-black text-[#2c3e50] uppercase tracking-widest ml-1">How many pieces?</label>
                        <div className="flex items-center gap-8 bg-gray-50 p-2 rounded-2xl border-2 border-gray-100">
                            <button type="button" onClick={() => setQty(Math.max(1, qty-1))} className="w-14 h-14 rounded-xl bg-white hover:bg-gray-100 flex items-center justify-center text-xl text-[#2c3e50] shadow-sm transition-all"><i className="fas fa-minus"></i></button>
                            <span className="text-3xl font-black text-[#2c3e50] flex-1 text-center">{qty}</span>
                            <button type="button" onClick={() => setQty(qty+1)} className="w-14 h-14 rounded-xl bg-white hover:bg-gray-100 flex items-center justify-center text-xl text-[#2c3e50] shadow-sm transition-all"><i className="fas fa-plus"></i></button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-black text-[#2c3e50] uppercase tracking-widest ml-1">Your Name</label>
                        <input 
                            value={donorName}
                            onChange={e => setDonorName(e.target.value)}
                            className="w-full p-5 rounded-2xl border-2 border-gray-100 focus:border-[#3498db] outline-none transition-all font-bold text-[#2c3e50] bg-white"
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={isPosting}
                        className="md:col-span-2 bg-[#4285f4] hover:bg-blue-600 text-white py-6 rounded-2xl font-black text-xl shadow-xl shadow-blue-100 transition-all active:scale-95 disabled:opacity-50 mt-4"
                    >
                        {isPosting ? 'Posting...' : 'Post Donation'}
                    </button>
                </form>
            </div>
        </div>
    );
};

const ProfilePage: React.FC<{user: UserProfile | null, t: any, onAuth: () => void, onNavigate: any}> = ({user, t, onAuth, onNavigate}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({ displayName: '', age: 0, phone: '', address: '' });

    useEffect(() => {
        if (user) {
            setEditData({ 
                displayName: user.displayName || '', 
                age: user.age || 0, 
                phone: user.phone || '', 
                address: user.address || '' 
            });
        }
    }, [user]);

    const handleSave = async () => {
        if (!user) return;
        const db = firebase.firestore();
        try {
            await db.collection('users').doc(user.uid).update(editData);
            setIsEditing(false);
            alert(t('update_success'));
        } catch (e) { alert("Update failed: " + e); }
    };

    if (!user) return (
        <div className="text-center py-16 sm:py-24 bg-white rounded-2xl sm:rounded-[3rem] shadow-xl max-w-xl mx-auto px-6 sm:px-8 border border-gray-100">
            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gray-50 text-gray-200 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8 text-3xl sm:text-5xl">
                <i className="fas fa-user-lock"></i>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black mb-4 uppercase tracking-tighter">{t('profile')}</h2>
            <button onClick={onAuth} className="bg-[#3498db] text-white px-10 py-3 sm:px-12 sm:py-5 rounded-full font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all">Sign In</button>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-10 pb-20">
            <div className="bg-[#2c3e50] p-8 sm:p-12 rounded-2xl sm:rounded-[3rem] shadow-xl text-white relative overflow-hidden border-b-8 border-[#f39c12]">
                <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 bg-[#3498db] rounded-full flex items-center justify-center text-4xl sm:text-6xl font-black shadow-2xl ring-8 ring-white/10 uppercase">
                        {user.displayName?.[0] || '?'}
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <div className="flex flex-col md:flex-row md:items-end gap-3 mb-2">
                            <h1 className="text-3xl sm:text-5xl font-black uppercase italic tracking-tighter leading-none">{user.displayName}</h1>
                            <span className="text-[#3498db] font-black uppercase text-xs tracking-widest mb-1">Miri Citizen</span>
                        </div>
                        <p className="text-white/60 font-bold text-sm sm:text-lg mb-6">{user.email}</p>
                        <div className="flex flex-wrap justify-center md:justify-start gap-4">
                            <div className="bg-white/10 px-6 py-3 rounded-2xl border border-white/10 backdrop-blur-sm">
                                <div className="text-[10px] font-black uppercase text-white/40 tracking-widest mb-1">{t('points')}</div>
                                <div className="text-2xl font-black text-[#f39c12]">{user.points} <span className="text-xs">PTS</span></div>
                            </div>
                            <button onClick={() => onNavigate('shop')} className="bg-[#f39c12] hover:bg-orange-500 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all shadow-lg active:scale-95">
                                <i className="fas fa-shopping-basket"></i> {t('points_shop')}
                            </button>
                        </div>
                    </div>
                    <button onClick={() => setIsEditing(!isEditing)} className={`px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-2 ${isEditing ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                        <i className={`fas fa-${isEditing ? 'times' : 'user-edit'}`}></i> {isEditing ? t('cancel') : t('edit_profile')}
                    </button>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            </div>

            <div className="bg-white p-8 sm:p-12 rounded-2xl sm:rounded-[3rem] shadow-xl border border-gray-100 max-w-2xl mx-auto w-full">
                <h2 className="text-2xl font-black uppercase mb-8 text-[#2c3e50] flex items-center gap-3 justify-center">
                    <i className="fas fa-id-card text-[#3498db]"></i> {t('personal_info')}
                </h2>
                <div className="space-y-6">
                    {[
                        { key: 'displayName', label: t('full_name'), icon: 'user' },
                        { key: 'age', label: t('age'), icon: 'calendar-alt', type: 'number' },
                        { key: 'phone', label: t('phone_number'), icon: 'phone' },
                        { key: 'address', label: t('home_address'), icon: 'map-marker-alt' }
                    ].map(field => (
                        <div key={field.key} className="space-y-2">
                            <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <i className={`fas fa-${field.icon} text-[8px]`}></i> {field.label}
                            </label>
                            <input 
                                disabled={!isEditing}
                                type={field.type || 'text'}
                                value={(editData as any)[field.key]}
                                onChange={e => setEditData({...editData, [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value})}
                                className={`w-full p-5 rounded-xl border-2 font-bold outline-none transition-all text-sm ${isEditing ? 'border-[#3498db] bg-white text-[#2c3e50] shadow-inner' : 'border-gray-50 bg-gray-50 text-gray-400 cursor-not-allowed'}`}
                            />
                        </div>
                    ))}
                    {isEditing && (
                        <button onClick={handleSave} className="w-full bg-[#2c3e50] text-white py-5 rounded-xl font-black uppercase tracking-widest shadow-xl hover:bg-[#3498db] transition-all">
                            {t('save_changes')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const AdminPanel: React.FC<{ onClose: () => void, t: any, user: UserProfile }> = ({ onClose, t, user }) => {
    const [activeTab, setActiveTab] = useState<'users' | 'redemptions'>('users');
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [redeemHistory, setRedeemHistory] = useState<any[]>([]);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [userSearchTerm, setUserSearchTerm] = useState('');

    useEffect(() => {
        const db = firebase.firestore();
        const unsubsUsers = db.collection('users').onSnapshot((snap: any) => {
            setUsers(snap.docs.map((d: any) => d.data() as UserProfile));
            setLoading(false);
        });
        const unsubsRedeem = db.collection('redeem_history').orderBy('redeemedAt', 'desc').onSnapshot((snap: any) => {
            setRedeemHistory(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
        });
        return () => { unsubsUsers(); unsubsRedeem(); };
    }, []);

    const filteredUsers = useMemo(() => {
        if (!userSearchTerm.trim()) return users;
        const lowerTerm = userSearchTerm.toLowerCase();
        return users.filter(u => 
            (u.displayName && u.displayName.toLowerCase().includes(lowerTerm)) || 
            (u.email && u.email.toLowerCase().includes(lowerTerm))
        );
    }, [users, userSearchTerm]);

    const handleSaveUser = async (u: any) => {
        const db = firebase.firestore();
        try {
            await db.collection('users').doc(u.uid).update({
                points: Number(u.points),
                displayName: u.displayName,
                age: Number(u.age),
                phone: u.phone,
                address: u.address
            });
            alert("User data saved successfully!");
            setEditingUser(null);
        } catch (e) { alert("Update failed: " + e); }
    };

    return (
        <div className="fixed inset-0 bg-black/95 z-[600] flex items-center justify-center p-0 sm:p-8 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-white w-full h-full max-w-[1400px] sm:h-[90vh] sm:rounded-[3rem] flex overflow-hidden shadow-2xl relative">
                <aside className="w-20 sm:w-72 bg-[#2c3e50] text-white flex flex-col h-full border-r border-white/5">
                    <div className="p-6 sm:p-10 border-b border-white/5 mb-4">
                        <h2 className="hidden sm:block font-black text-2xl tracking-tighter italic uppercase text-[#3498db] leading-none">ADMIN<br/><span className="text-white">CONTROL</span></h2>
                    </div>
                    <nav className="flex-1 px-3 sm:px-6 space-y-2">
                        <AdminMenuItem icon="users" label={t('user_management')} active={activeTab === 'users'} onClick={() => { setActiveTab('users'); setEditingUser(null); }} />
                        <AdminMenuItem icon="ticket-alt" label="Redeem Tracker" active={activeTab === 'redemptions'} onClick={() => { setActiveTab('redemptions'); setEditingUser(null); }} />
                    </nav>
                    <div className="p-6">
                        <button onClick={onClose} className="w-full bg-red-500 py-4 rounded-xl font-black text-xs uppercase shadow-lg">Close</button>
                    </div>
                </aside>

                <main className="flex-1 flex flex-col bg-gray-50 overflow-hidden relative">
                    <header className="h-20 sm:h-24 border-b border-gray-100 flex items-center justify-between px-6 sm:px-12 bg-white">
                         <h3 className="font-black text-xl sm:text-3xl uppercase italic text-[#2c3e50]">
                            {activeTab === 'users' ? 'User Database' : 'Redemption History'}
                         </h3>
                         {activeTab === 'users' && !editingUser && (
                             <input 
                                type="text" 
                                placeholder="Search citizens..." 
                                value={userSearchTerm}
                                onChange={e => setUserSearchTerm(e.target.value)}
                                className="bg-gray-50 border-2 border-gray-100 p-3 rounded-full outline-none font-bold text-sm w-64"
                             />
                         )}
                    </header>
                    <div className="flex-1 overflow-y-auto p-6 sm:p-12">
                        {loading ? <div className="h-full flex items-center justify-center"><i className="fas fa-spinner fa-spin text-4xl text-[#3498db]"></i></div> : (
                            <>
                                {activeTab === 'users' && (
                                    editingUser ? (
                                        <div className="max-w-2xl mx-auto bg-white p-10 rounded-[3rem] shadow-2xl border border-gray-100">
                                            <h4 className="font-black text-2xl uppercase mb-8 text-[#2c3e50]">Edit Profile: {editingUser.email}</h4>
                                            <div className="space-y-6">
                                                <AdminInput label="Full Name" value={editingUser.displayName} onChange={v => setEditingUser({...editingUser, displayName: v})} />
                                                <AdminInput label="Points" type="number" value={editingUser.points} onChange={v => setEditingUser({...editingUser, points: v})} />
                                                <AdminInput label="Age" type="number" value={editingUser.age || 0} onChange={v => setEditingUser({...editingUser, age: v})} />
                                                <AdminInput label="Phone" value={editingUser.phone || ''} onChange={v => setEditingUser({...editingUser, phone: v})} />
                                                <AdminInput label="Address" value={editingUser.address || ''} onChange={v => setEditingUser({...editingUser, address: v})} />
                                                <button onClick={() => handleSaveUser(editingUser)} className="w-full bg-[#2c3e50] text-white py-5 rounded-2xl font-black uppercase shadow-xl hover:bg-[#3498db] transition-all">Save Changes</button>
                                                <button onClick={() => setEditingUser(null)} className="w-full text-gray-400 font-bold uppercase py-2">Cancel</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                            {filteredUsers.map(u => (
                                                <div key={u.uid} className="bg-white p-6 sm:p-8 rounded-[2rem] border border-gray-100 flex items-center justify-between shadow-sm group">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center text-xl font-black text-[#3498db] shadow-inner">{u.displayName?.[0] || '?'}</div>
                                                        <div>
                                                            <div className="font-black text-lg uppercase italic text-[#2c3e50]">{u.displayName}</div>
                                                            <div className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{u.email}</div>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => setEditingUser(u)} className="w-12 h-12 bg-[#2c3e50] text-white rounded-xl flex items-center justify-center hover:bg-[#3498db] transition-all shadow-lg active:scale-90"><i className="fas fa-user-edit"></i></button>
                                                </div>
                                            ))}
                                        </div>
                                    )
                                )}

                                {activeTab === 'redemptions' && (
                                    <div className="bg-white rounded-[2rem] overflow-hidden shadow-xl">
                                        <table className="w-full text-left">
                                            <thead className="bg-gray-50 font-black uppercase text-[10px] text-gray-400">
                                                <tr>
                                                    <th className="p-6">Date</th>
                                                    <th className="p-6">User</th>
                                                    <th className="p-6">Item</th>
                                                    <th className="p-6 text-right">Points</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50 font-bold text-sm">
                                                {redeemHistory.map(r => (
                                                    <tr key={r.id}>
                                                        <td className="p-6 text-gray-300">{r.redeemedAt?.toDate().toLocaleDateString()}</td>
                                                        <td className="p-6">{r.fullName} <span className="block text-[8px] text-gray-300">{r.userEmail}</span></td>
                                                        <td className="p-6 italic">{r.itemName}</td>
                                                        <td className="p-6 text-right text-red-400">-{r.itemPoints}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

const HistoryPage: React.FC<{user: UserProfile | null, t: any, onAuth: any}> = ({user, t, onAuth}) => {
    const [redemptions, setRedemptions] = useState<any[]>([]);
    useEffect(() => {
        if (!user) return;
        const db = firebase.firestore();
        return db.collection('redeem_history').where('userId', '==', user.uid).orderBy('redeemedAt', 'desc').onSnapshot((snap: any) => {
            setRedemptions(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
        });
    }, [user]);
    if (!user) return <div className="text-center py-20"><button onClick={onAuth} className="bg-[#3498db] text-white px-10 py-4 rounded-full font-black uppercase shadow-lg">Sign In</button></div>;
    return (
        <div className="space-y-12">
            <h1 className="text-4xl font-black italic uppercase text-[#2c3e50]">{t('history')}</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {redemptions.map(r => (
                    <div key={r.id} className="bg-white p-6 rounded-2xl border border-gray-100 flex items-center justify-between shadow-xl">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-orange-50 text-[#f39c12] rounded-xl flex items-center justify-center text-xl"><i className="fas fa-ticket-alt"></i></div>
                            <div>
                                <div className="font-black uppercase italic text-[#2c3e50]">{r.itemName}</div>
                                <div className="text-[10px] font-bold text-gray-300 uppercase">{r.redeemedAt?.toDate().toLocaleDateString()}</div>
                            </div>
                        </div>
                        <div className="text-[#f39c12] font-black">-{r.itemPoints} PTS</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ShopPage: React.FC<{user: UserProfile | null, t: any, onAuth: any, onRedeemConfirm: (item: any) => void}> = ({user, t, onAuth, onRedeemConfirm}) => {
    const shopItems = [
        { id: '1', name: t('voucher_5'), cost: 20, color: '#27ae60' },
        { id: '2', name: t('voucher_10'), cost: 40, color: '#3498db' },
        { id: '3', name: t('voucher_15'), cost: 50, color: '#f39c12' }
    ];
    return (
        <div className="space-y-12">
            <h1 className="text-6xl font-black italic uppercase text-[#2c3e50] text-center">{t('points_shop')}</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                {shopItems.map(item => (
                    <div key={item.id} className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-xl text-center group transition-all">
                        <div className="p-12">
                            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-8 text-4xl text-[#f39c12]"><i className="fas fa-gift"></i></div>
                            <h3 className="font-black text-2xl mb-2 uppercase italic text-[#2c3e50]">{item.name}</h3>
                            <div className="text-4xl font-black text-[#f39c12] mb-10"><span className="text-xl">PTS</span> {item.cost}</div>
                        </div>
                        <button onClick={() => { if(!user) return onAuth(); onRedeemConfirm(item); }} className="w-full text-white py-6 font-black uppercase tracking-widest text-xs" style={{backgroundColor: item.color}}>Redeem Reward</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

const SupportWindow: React.FC<{user: UserProfile | null, onClose: () => void, onAuth: () => void, t: any}> = ({user, onClose, onAuth, t}) => (
    <div className="fixed bottom-20 right-8 z-[150] bg-white w-[350px] h-[500px] rounded-[3rem] shadow-2xl flex flex-col animate-in zoom-in border border-gray-100 overflow-hidden">
        <div className="p-6 bg-[#3498db] text-white flex justify-between items-center"><h3 className="font-black uppercase italic">Admin Support</h3><button onClick={onClose}>&times;</button></div>
        <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
            <i className="fas fa-headset text-4xl text-gray-100 mb-4"></i>
            <p className="text-[10px] font-black uppercase text-gray-300">Our admin is ready to help.<br/>Start a chat below.</p>
        </div>
    </div>
);

const AuthModal: React.FC<{onClose: () => void, t: any}> = ({onClose, t}) => {
    const [authMode, setAuthMode] = useState(0); 
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [age, setAge] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthLoading(true);
        setAuthError(null);
        if (authMode === 1 && !email.toLowerCase().endsWith("moe-dl.edu.my")) {
            setAuthError(`Registration required: Please use your official MOE account (@moe-dl.edu.my).`);
            setAuthLoading(false);
            return;
        }
        try {
            if (authMode === 0) {
                await firebase.auth().signInWithEmailAndPassword(email, password);
                onClose();
            } else if (authMode === 1) {
                const { user: authUser } = await firebase.auth().createUserWithEmailAndPassword(email, password);
                await firebase.firestore().collection('users').doc(authUser.uid).set({
                    uid: authUser.uid, email, displayName: fullName, username, points: 10, age: Number(age), address, phone,
                    settings: { autoShareContact: true, receiveNotifications: true, shareLocation: true, profileVisibility: 'public' }
                });
                onClose();
            }
        } catch (err: any) { 
            setAuthError(err.message);
        } finally { setAuthLoading(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[400] flex items-center justify-center p-4 backdrop-blur-xl" onClick={onClose}>
            <div className="bg-white w-full max-w-md rounded-[4rem] flex flex-col relative shadow-2xl animate-in zoom-in border-4 border-white/20 max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-10 right-10 text-3xl text-gray-200 hover:text-red-500 z-10">&times;</button>
                <div className="overflow-y-auto p-12 custom-scrollbar">
                    <h2 className="text-3xl font-black mb-4 text-center uppercase italic text-[#2c3e50]">{authMode === 0 ? t('login') : t('register')}</h2>
                    {authError && <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl text-red-600 text-[10px] font-black uppercase">{authError}</div>}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input type="email" placeholder={t('email_address')} value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-100 p-6 rounded-[1.5rem] outline-none font-bold focus:border-[#3498db] transition-all text-sm text-[#2c3e50]" required />
                        {authMode === 1 && (
                            <>
                                <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-100 p-6 rounded-[1.5rem] outline-none font-bold focus:border-[#3498db] transition-all text-sm text-[#2c3e50]" required />
                                <input type="text" placeholder={t('full_name')} value={fullName} onChange={e => setFullName(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-100 p-6 rounded-[1.5rem] outline-none font-bold focus:border-[#3498db] transition-all text-sm text-[#2c3e50]" required />
                            </>
                        )}
                        <div className="relative">
                            <input type={showPassword ? "text" : "password"} placeholder={t('password')} value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-100 p-6 rounded-[1.5rem] outline-none font-bold focus:border-[#3498db] transition-all text-sm text-[#2c3e50] pr-14" required />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-300"><i className={`fas fa-${showPassword ? 'eye-slash' : 'eye'}`}></i></button>
                        </div>
                        {authMode === 1 && (
                            <>
                                <input type="number" placeholder={t('age')} value={age} onChange={e => setAge(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-100 p-6 rounded-[1.5rem] outline-none font-bold focus:border-[#3498db] transition-all text-sm text-[#2c3e50]" required />
                                <input type="text" placeholder={t('phone_number')} value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-100 p-6 rounded-[1.5rem] outline-none font-bold focus:border-[#3498db] transition-all text-sm text-[#2c3e50]" required />
                                <input type="text" placeholder={t('home_address')} value={address} onChange={e => setAddress(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-100 p-6 rounded-[1.5rem] outline-none font-bold focus:border-[#3498db] transition-all text-sm text-[#2c3e50]" required />
                            </>
                        )}
                        <button type="submit" disabled={authLoading} className="w-full bg-[#3498db] text-white py-6 rounded-full font-black text-xl shadow-2xl mt-6 active:scale-95 disabled:opacity-50">{authLoading ? '...' : (authMode === 0 ? t('login') : t('register'))}</button>
                    </form>
                    <p className="text-center text-[10px] font-black uppercase text-gray-300 mt-8 cursor-pointer" onClick={() => setAuthMode(authMode === 0 ? 1 : 0)}>{authMode === 0 ? t('register') : t('login')}</p>
                </div>
            </div>
        </div>
    );
};

const RedeemConfirmModal: React.FC<{item: any, user: UserProfile, onCancel: () => void, onConfirm: (f: string, c: string) => void, t: any}> = ({item, user, onCancel, onConfirm, t}) => {
    const [fullName, setFullName] = useState(user.displayName || '');
    const [userClass, setUserClass] = useState('');
    return (
        <div className="fixed inset-0 bg-black/90 z-[600] flex items-center justify-center p-4 backdrop-blur-xl animate-in fade-in" onClick={onCancel}>
            <div className="bg-white w-full max-w-lg rounded-[4rem] p-12 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-3xl font-black mb-6 italic uppercase text-[#2c3e50] text-center">Confirm Identity</h2>
                <form onSubmit={e => { e.preventDefault(); onConfirm(fullName, userClass); }} className="space-y-6">
                    <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full Name" className="w-full bg-gray-50 border-2 border-gray-100 p-6 rounded-[1.5rem] outline-none font-bold text-[#2c3e50]" required />
                    <input value={userClass} onChange={e => setUserClass(e.target.value)} placeholder="Class" className="w-full bg-gray-50 border-2 border-gray-100 p-6 rounded-[1.5rem] outline-none font-bold text-[#2c3e50]" required />
                    <button type="submit" className="w-full bg-[#3498db] text-white py-6 rounded-full font-black uppercase">Confirm Redeem</button>
                </form>
            </div>
        </div>
    );
};

export default App;
