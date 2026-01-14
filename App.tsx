
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Language, UserProfile, HelpRequest, ChatMessage, ChatRoom } from './types';
import { translations } from './translations';

// Using declare to avoid TS errors for globally injected scripts
declare const firebase: any;

const MenuItem: React.FC<{icon: string, label: string, onClick: () => void, active?: boolean}> = ({icon, label, onClick, active}) => (
    <button onClick={onClick} className={`flex items-center gap-3 sm:gap-5 p-3 sm:p-5 rounded-xl sm:rounded-2xl transition-all ${active ? 'bg-[#3498db] text-white shadow-xl scale-105' : 'text-gray-400 hover:bg-gray-50 hover:text-[#2c3e50]'}`}>
        <div className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg sm:rounded-xl ${active ? 'bg-white/20' : 'bg-gray-100'}`}>
            <i className={`fas fa-${icon} text-xs sm:text-sm`}></i>
        </div>
        <span className="font-black text-[10px] sm:text-xs uppercase tracking-widest">{label}</span>
    </button>
);

const AdminInput: React.FC<{label: string, value: any, onChange?: (v: any) => void, type?: string, disabled?: boolean, placeholder?: string}> = ({label, value, onChange, type = 'text', disabled = false, placeholder}) => (
    <div className="space-y-2">
        <label className="text-[8px] font-black uppercase text-gray-400 tracking-[0.2em] ml-1">{label}</label>
        <input 
            type={type} 
            value={value} 
            disabled={disabled}
            placeholder={placeholder}
            onChange={e => onChange?.(type === 'number' ? Number(e.target.value) : e.target.value)}
            className={`w-full p-3 rounded-xl border-2 font-bold transition-all text-sm outline-none ${disabled ? 'bg-gray-50 border-gray-50 text-gray-300' : 'bg-white border-gray-100 focus:border-[#3498db] text-[#2c3e50]'}`}
        />
    </div>
);

const App: React.FC = () => {
    const [lang, setLang] = useState<Language>(Language.EN);
    const [user, setUser] = useState<UserProfile | null>(null);
    const [page, setPage] = useState<string>('home');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [itemToRedeem, setItemToRedeem] = useState<any>(null);
    const [showAdminPanel, setShowAdminPanel] = useState(false);
    const [showSupportChat, setShowSupportChat] = useState(false);
    
    const t = useCallback((key: string) => translations[lang][key] || key, [lang]);

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
                    db.collection('users').doc(authUser.uid).onSnapshot((doc: any) => {
                        if (doc.exists) {
                            setUser({ ...doc.data(), uid: authUser.uid } as UserProfile);
                        } else {
                            setUser({ uid: authUser.uid, email: authUser.email, points: 10 } as any);
                        }
                    });
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

    const isAdmin = user?.isAdmin || user?.email === 'admin@gmail.com';

    if (loading) return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#f8f9fa] text-[#3498db] font-black italic uppercase text-center">
            <i className="fas fa-spinner fa-spin text-5xl mb-4"></i>
            Connecting citizens...
        </div>
    );

    return (
        <div className="min-h-screen flex flex-col bg-[#f8f9fa] font-sans">
            <header className="bg-[#2c3e50] text-white shadow-xl sticky top-0 z-[100] h-16 sm:h-20 flex items-center">
                <div className="container mx-auto px-2 sm:px-4 flex items-center justify-between gap-1 overflow-hidden">
                    <button onClick={() => setIsMenuOpen(true)} className="p-2 hover:bg-white/10 rounded-xl transition-all flex-shrink-0">
                        <i className="fas fa-bars text-lg sm:text-xl"></i>
                    </button>
                    <div className="flex-grow text-center font-black tracking-tighter cursor-pointer text-[10px] xs:text-[13px] sm:text-lg uppercase whitespace-nowrap overflow-hidden px-1" onClick={() => setPage('home')}>
                        MIRI <span className="text-[#3498db]">CARE</span> CONNECT
                    </div>
                    <div className="flex items-center gap-1 sm:gap-4 flex-shrink-0">
                        {user && (
                            <div className="flex items-center bg-[#f39c12] px-2 sm:px-4 py-1 rounded-full text-[8px] sm:text-xs font-black shadow-lg whitespace-nowrap">
                                <i className="fas fa-star mr-1 sm:mr-2"></i> {user.points} <span className="ml-0.5">Points</span>
                            </div>
                        )}
                        {user ? (
                            <button onClick={() => firebase.auth().signOut()} className="bg-red-500 hover:bg-red-600 text-white px-2 sm:px-4 py-1.5 rounded-full text-[8px] sm:text-[10px] font-black uppercase shadow-lg flex items-center gap-1 whitespace-nowrap">
                                <i className="fas fa-sign-out-alt"></i>
                                <span>Logout</span>
                            </button>
                        ) : (
                            <button onClick={() => setIsAuthModalOpen(true)} className="bg-[#3498db] hover:bg-blue-600 px-3 py-1.5 rounded-full text-[8px] sm:text-[10px] font-black uppercase shadow-lg">Login</button>
                        )}
                    </div>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden relative">
                {isAdmin && (
                    <button 
                        onClick={() => setShowAdminPanel(!showAdminPanel)}
                        className="fixed right-4 top-1/4 z-[110] bg-[#2c3e50] text-white w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-2xl flex flex-col items-center justify-center hover:scale-110 active:scale-95 transition-all group border-4 border-white"
                    >
                        <i className={`fas fa-${showAdminPanel ? 'times' : 'user-shield'} text-lg sm:text-xl`}></i>
                        <span className="text-[6px] sm:text-[7px] font-black uppercase mt-1">Panel</span>
                    </button>
                )}

                {user && !isAdmin && (
                    <div className="fixed right-6 bottom-6 z-[200] flex flex-col items-end gap-4">
                        {showSupportChat && (
                            <div className="w-[85vw] sm:w-80 h-[450px] bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 mb-2 origin-bottom-right">
                                <div className="bg-[#3498db] p-4 text-white flex justify-between items-center">
                                    <div className="font-black uppercase text-xs flex items-center gap-2">
                                        <i className="fas fa-comment-dots"></i>
                                        Admin Support
                                    </div>
                                    <button onClick={() => setShowSupportChat(false)} className="hover:rotate-90 transition-transform p-1">
                                        <i className="fas fa-times text-lg"></i>
                                    </button>
                                </div>
                                <SupportChatBody userId={user.uid} userName={user.displayName} />
                            </div>
                        )}
                        <button 
                            onClick={() => setShowSupportChat(!showSupportChat)}
                            className="bg-[#3498db] text-white w-16 h-16 rounded-full shadow-[0_8px_32px_rgba(52,152,219,0.3)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all border-4 border-white z-[201]"
                        >
                            <i className="fas fa-comment-dots text-3xl"></i>
                        </button>
                    </div>
                )}

                <main className={`flex-1 overflow-y-auto transition-all duration-300 ${isAdmin && showAdminPanel ? 'lg:mr-96' : ''}`}>
                    <div className="container mx-auto px-4 py-8 max-w-6xl">
                        {page === 'home' && <HomePage t={t} user={user} />}
                        {page === 'offer_help' && <OfferHelpPage user={user} onAuth={() => setIsAuthModalOpen(true)} onNavigate={setPage} />}
                        {page === 'profile' && <ProfilePage user={user} t={t} onAuth={() => setIsAuthModalOpen(true)} onNavigate={setPage} />}
                        {page === 'shop' && <ShopPage user={user} t={t} onAuth={() => setIsAuthModalOpen(true)} onRedeemConfirm={setItemToRedeem} />}
                        {page === 'history' && <HistoryPage user={user} t={t} onAuth={() => setIsAuthModalOpen(true)} />}
                    </div>
                </main>

                {isAdmin && (
                    <aside className={`fixed top-16 sm:top-20 right-0 bottom-0 w-80 sm:w-96 bg-white border-l border-gray-100 shadow-2xl z-[100] transition-transform duration-300 transform ${showAdminPanel ? 'translate-x-0' : 'translate-x-full'}`}>
                        <AdminPanelContent t={t} user={user} />
                    </aside>
                )}
            </div>

            <aside className={`fixed inset-y-0 left-0 w-[80vw] sm:w-80 bg-white z-[301] transform transition-transform duration-500 shadow-2xl flex flex-col ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-8 flex flex-col h-full">
                    <div className="flex justify-between items-center mb-12">
                        <h2 className="text-xl font-black italic text-[#2c3e50] uppercase tracking-tighter">Miri Connect</h2>
                        <button onClick={() => setIsMenuOpen(false)} className="text-gray-400 hover:text-red-500"><i className="fas fa-times text-2xl"></i></button>
                    </div>
                    {user && (
                        <div className="mb-8 p-4 bg-gray-50 rounded-2xl">
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Your Balance</div>
                            <div className="text-2xl font-black text-[#f39c12]">{user.points} <span className="text-xs">Points</span></div>
                        </div>
                    )}
                    <nav className="flex flex-col gap-2">
                        <MenuItem icon="home" label="Home" onClick={() => { setPage('home'); setIsMenuOpen(false); }} active={page === 'home'} />
                        <MenuItem icon="hand-holding-heart" label="Offer Help" onClick={() => { setPage('offer_help'); setIsMenuOpen(false); }} active={page === 'offer_help'} />
                        <MenuItem icon="user" label="Profile" onClick={() => { setPage('profile'); setIsMenuOpen(false); }} active={page === 'profile'} />
                        <MenuItem icon="shopping-cart" label="Points Shop" onClick={() => { setPage('shop'); setIsMenuOpen(false); }} active={page === 'shop'} />
                        <MenuItem icon="history" label="History" onClick={() => { setPage('history'); setIsMenuOpen(false); }} active={page === 'history'} />
                    </nav>
                </div>
            </aside>
            {isMenuOpen && <div className="fixed inset-0 bg-black/50 z-[300]" onClick={() => setIsMenuOpen(false)}></div>}

            {isAuthModalOpen && <AuthModal onClose={() => setIsAuthModalOpen(false)} t={t} />}
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
                                    userId: user!.uid, fullName, userClass, itemName: itemToRedeem.name, 
                                    itemPoints: itemToRedeem.cost, redeemedAt: firebase.firestore.FieldValue.serverTimestamp()
                                });
                            });
                            setItemToRedeem(null);
                            alert("Voucher redeemed!");
                        } catch (e) { alert("Failed: " + e); }
                    }} 
                />
            )}
        </div>
    );
};

const SupportChatBody: React.FC<{userId: string, userName: string}> = ({userId, userName}) => {
    const [msgs, setMsgs] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const db = firebase.firestore();
        const unsub = db.collection('support_chats')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'asc')
            .onSnapshot((snap: any) => {
                setMsgs(snap.docs.map((d: any) => d.data()));
            });
        return unsub;
    }, [userId]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [msgs]);

    const send = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        const msgText = input;
        setInput('');
        
        await firebase.firestore().collection('support_chats').add({
            userId,
            userName: userName || 'User',
            text: msgText,
            sender: 'user',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    };

    return (
        <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {msgs.length === 0 && (
                    <div className="text-center py-10 px-4">
                        <i className="fas fa-headset text-3xl text-gray-300 mb-2"></i>
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Hi! Ask an admin anything.</p>
                    </div>
                )}
                {msgs.map((m, i) => (
                    <div key={i} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-xs font-bold ${
                            m.sender === 'user' 
                            ? 'bg-[#3498db] text-white rounded-tr-none' 
                            : 'bg-[#2c3e50] text-white rounded-tl-none'
                        }`}>
                            {m.text}
                        </div>
                        <span className="text-[8px] text-gray-400 mt-1 uppercase font-black">
                            {m.sender === 'user' ? 'You' : 'Admin'}
                        </span>
                    </div>
                ))}
            </div>
            <form onSubmit={send} className="p-4 bg-white border-t flex gap-2">
                <input 
                    value={input} 
                    onChange={e => setInput(e.target.value)} 
                    placeholder="Type a message..." 
                    className="flex-1 bg-gray-100 p-3 rounded-2xl text-xs font-bold outline-none border-2 border-transparent focus:border-[#3498db] transition-all" 
                />
                <button className="bg-[#3498db] text-white w-10 h-10 rounded-xl flex items-center justify-center transition-transform active:scale-90 shadow-lg">
                    <i className="fas fa-paper-plane text-xs"></i>
                </button>
            </form>
        </div>
    );
};

const HomePage: React.FC<{t: any, user: UserProfile | null}> = ({t, user}) => {
    const [donations, setDonations] = useState<any[]>([]);
    const [itemsAnnouncement, setItemsAnnouncement] = useState('');
    const [isEditingAnn, setIsEditingAnn] = useState(false);
    const [newAnn, setNewAnn] = useState('');

    useEffect(() => {
        const db = firebase.firestore();
        const unsubDonations = db.collection('donations').orderBy('createdAt', 'desc').onSnapshot((snap: any) => {
            setDonations(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
        });
        const unsubAnn = db.collection('settings').doc('items_announcement').onSnapshot((doc: any) => {
            if (doc.exists) {
                setItemsAnnouncement(doc.data().text);
                setNewAnn(doc.data().text);
            }
        });
        return () => { unsubDonations(); unsubAnn(); };
    }, []);

    const handleConfirmReceived = async (donation: any) => {
        if (!user || (!user.isAdmin && user.email !== 'admin@gmail.com')) return;
        const confirmResult = window.confirm(`Confirm receipt? Donor earns 5 points.`);
        if (!confirmResult) return;
        const db = firebase.firestore();
        try {
            const donorRef = db.collection('users').doc(donation.userId);
            await db.runTransaction(async (transaction: any) => {
                const donorDoc = await transaction.get(donorRef);
                const currentPoints = donorDoc.exists ? (donorDoc.data().points || 0) : 0;
                
                transaction.update(donorRef, { points: currentPoints + 5 });
                transaction.set(db.collection('completed_donations').doc(donation.id), {
                    ...donation,
                    completedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    confirmedBy: user.uid
                });
                transaction.delete(db.collection('donations').doc(donation.id));
            });
            alert("Confirmed!");
        } catch (err) { alert("Failed."); }
    };

    const isAdmin = user?.isAdmin || user?.email === 'admin@gmail.com';

    return (
        <div className="space-y-12 pb-24 animate-in fade-in duration-500">
            <section className="bg-[#2c3e50] text-white rounded-3xl p-12 sm:p-24 text-center shadow-2xl relative border-b-8 border-[#3498db]">
                <h1 className="text-3xl sm:text-7xl font-black mb-6 italic uppercase tracking-tighter leading-tight">{t('hero_title')}</h1>
                <p className="text-sm sm:text-xl opacity-80 max-w-2xl mx-auto leading-relaxed font-bold uppercase">{t('hero_description')}</p>
            </section>

            <div className="max-w-6xl mx-auto">
                <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl sm:text-3xl font-black text-[#2c3e50] tracking-tighter italic uppercase">Announcement</h2>
                        {isAdmin && (
                            <button onClick={() => isEditingAnn ? (firebase.firestore().collection('settings').doc('items_announcement').set({text: newAnn}), setIsEditingAnn(false)) : setIsEditingAnn(true)} className="bg-[#3498db] text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase">
                                {isEditingAnn ? 'Save' : 'Edit'}
                            </button>
                        )}
                    </div>
                    {isEditingAnn ? (
                        <textarea value={newAnn} onChange={e => setNewAnn(e.target.value)} className="w-full h-32 p-4 border-2 border-gray-100 rounded-xl font-bold text-[#2c3e50] outline-none focus:border-[#3498db]" />
                    ) : (
                        <div className="min-h-[60px] text-gray-400 font-bold whitespace-pre-wrap">{itemsAnnouncement || "No updates for items today."}</div>
                    )}
                </div>
            </div>

            <div className="max-w-6xl mx-auto space-y-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
                    <h2 className="text-lg sm:text-xl font-black text-[#2c3e50] tracking-tight uppercase">Recent Offers</h2>
                    <div className="bg-blue-50 text-[#3498db] px-4 py-1.5 rounded-full text-[10px] font-black flex items-center gap-2">
                        <i className="fas fa-bolt"></i> LIVE
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {donations.map(item => (
                        <div key={item.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col group relative">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-xl sm:text-2xl font-black text-[#2c3e50] leading-tight group-hover:text-[#3498db] transition-colors">{item.itemName}</h3>
                                <div className="bg-blue-50 text-[#3498db] px-3 py-1 rounded-full text-[10px] font-black">Qty: {item.qty}</div>
                            </div>
                            <div className="mb-6 flex gap-2">
                                <span className="bg-gray-50 text-gray-400 px-3 py-1 rounded-md text-[10px] font-black uppercase">{item.category}</span>
                            </div>
                            <div className="space-y-3 flex-1 mb-6 text-gray-400 font-bold text-sm">
                                <div><i className="far fa-user mr-2"></i>{item.donorName}</div>
                                <div><i className="fas fa-map-marker-alt mr-2"></i>SMK Lutong</div>
                            </div>
                            {isAdmin && (
                                <button onClick={() => handleConfirmReceived(item)} className="w-full bg-[#2ecc71] hover:bg-[#27ae60] text-white py-3 rounded-xl text-xs font-black uppercase shadow-md transition-all mt-auto">
                                    <i className="fas fa-check-circle mr-2"></i> Confirm Received
                                </button>
                            )}
                        </div>
                    ))}
                    {donations.length === 0 && <div className="col-span-full py-20 text-center font-black text-gray-300 uppercase italic">No active offers</div>}
                </div>
            </div>
        </div>
    );
};

const OfferHelpPage: React.FC<{user: UserProfile | null, onAuth: () => void, onNavigate: (p: string) => void}> = ({user, onAuth, onNavigate}) => {
    const [item, setItem] = useState({ itemName: '', category: 'Food', qty: 1, donorName: user?.displayName || '' });
    const [posting, setPosting] = useState(false);

    const handlePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) { onAuth(); return; }
        setPosting(true);
        try {
            const db = firebase.firestore();
            await db.collection('donations').add({
                ...item,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                userId: user.uid
            });
            await db.collection('users').doc(user.uid).update({ points: (user.points || 0) + 5 });
            alert("SUCCESSFULLY POSTED!");
            onNavigate('home');
        } catch (err) { alert("Failed."); } finally { setPosting(false); }
    };

    if (!user) return (
        <div className="max-w-4xl mx-auto py-24 text-center">
            <h2 className="text-4xl font-black text-[#2c3e50] mb-2 uppercase tracking-tighter">Login Required</h2>
            <button onClick={onAuth} className="bg-[#3498db] text-white px-12 py-5 rounded-full font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all mt-8">Log In Now</button>
        </div>
    );

    return (
        <div className="max-w-2xl mx-auto py-12 animate-in zoom-in duration-300">
            <div className="bg-white rounded-[3rem] shadow-2xl p-10 sm:p-16 border border-gray-50">
                <h2 className="text-3xl font-black text-[#2c3e50] mb-2 leading-none uppercase italic">Offer Assistance</h2>
                <form onSubmit={handlePost} className="space-y-8 mt-10">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest ml-1">Item Name</label>
                        <input 
                            value={item.itemName} 
                            onChange={e => setItem({...item, itemName: e.target.value})} 
                            className="w-full p-5 rounded-2xl border-2 border-gray-100 focus:border-[#3498db] outline-none font-bold bg-white text-black" 
                            required 
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest ml-1">Category</label>
                            <select value={item.category} onChange={e => setItem({...item, category: e.target.value})} className="w-full p-5 rounded-2xl border-2 border-gray-100 outline-none font-bold text-black bg-white">
                                <option>Food</option><option>Clothing</option><option>Stationary</option><option>Others</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest ml-1">Quantity</label>
                            <input 
                                type="number" 
                                value={item.qty} 
                                onChange={e => setItem({...item, qty: Number(e.target.value)})} 
                                className="w-full p-5 rounded-2xl border-2 border-gray-100 outline-none font-bold bg-white text-black" 
                                required 
                            />
                        </div>
                    </div>
                    <button type="submit" disabled={posting} className="w-full bg-[#4285f4] hover:bg-blue-600 text-white py-6 rounded-2xl font-black text-xl shadow-xl active:scale-95 transition-all disabled:opacity-50 uppercase">
                        {posting ? 'POSTING...' : 'Post Offer'}
                    </button>
                </form>
            </div>
        </div>
    );
};

const AdminPanelContent: React.FC<{t: any, user: UserProfile | null}> = ({t, user}) => {
    const [activeTab, setActiveTab] = useState<'users' | 'items' | 'chats'>('users');
    const [data, setData] = useState<{users: any[], items: any[], completedItems: any[], supportChats: any[]}>({users: [], items: [], completedItems: [], supportChats: []});
    const [activeSupportUser, setActiveSupportUser] = useState<any>(null);
    const [adminReply, setAdminReply] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [editingUser, setEditingUser] = useState<any>(null);
    const [selectedOffer, setSelectedOffer] = useState<any>(null);

    useEffect(() => {
        const db = firebase.firestore();
        const unsubUsers = db.collection('users').onSnapshot((snap: any) => setData(prev => ({...prev, users: snap.docs.map((d: any) => ({...d.data(), uid: d.id}))})));
        const unsubItems = db.collection('donations').onSnapshot((snap: any) => setData(prev => ({...prev, items: snap.docs.map((d: any) => ({...d.data(), id: d.id}))})));
        const unsubCompleted = db.collection('completed_donations').onSnapshot((snap: any) => setData(prev => ({...prev, completedItems: snap.docs.map((d: any) => ({...d.data(), id: d.id}))})));
        
        const unsubSupport = db.collection('support_chats').orderBy('createdAt', 'desc').onSnapshot((snap: any) => {
            const grouped: any[] = [];
            const seen = new Set();
            snap.docs.forEach((d: any) => {
                const docData = d.data();
                if (!seen.has(docData.userId)) {
                    grouped.push({ userId: docData.userId, userName: docData.userName, lastMsg: docData.text });
                    seen.add(docData.userId);
                }
            });
            setData(prev => ({...prev, supportChats: grouped}));
        });
        return () => { unsubUsers(); unsubItems(); unsubCompleted(); unsubSupport(); };
    }, []);

    const filteredUsers = useMemo(() => {
        if (!searchQuery) return data.users;
        const q = searchQuery.toLowerCase();
        return data.users.filter(u => 
            u.displayName?.toLowerCase().includes(q) || 
            u.email?.toLowerCase().includes(q)
        );
    }, [data.users, searchQuery]);

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await firebase.firestore().collection('users').doc(editingUser.uid).update({
                displayName: editingUser.displayName,
                points: Number(editingUser.points),
                phone: editingUser.phone || '',
                address: editingUser.address || ''
            });
            alert("User updated successfully");
            setEditingUser(null);
        } catch (err) { alert("Failed to update user"); }
    };

    const sendAdminReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!adminReply.trim() || !activeSupportUser) return;
        const reply = adminReply;
        setAdminReply('');
        await firebase.firestore().collection('support_chats').add({
            userId: activeSupportUser.userId,
            userName: activeSupportUser.userName || 'User',
            text: reply,
            sender: 'admin',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    };

    const handleApproveFromPanel = async (donation: any) => {
        const confirmResult = window.confirm(`Confirm receipt for ${donation.itemName}?`);
        if (!confirmResult) return;
        const db = firebase.firestore();
        try {
            const donorRef = db.collection('users').doc(donation.userId);
            await db.runTransaction(async (transaction: any) => {
                const donorDoc = await transaction.get(donorRef);
                const currentPoints = donorDoc.exists ? (donorDoc.data().points || 0) : 0;
                transaction.update(donorRef, { points: currentPoints + 5 });
                transaction.set(db.collection('completed_donations').doc(donation.id), {
                    ...donation,
                    completedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    confirmedBy: user?.uid
                });
                transaction.delete(db.collection('donations').doc(donation.id));
            });
            setSelectedOffer(null);
            alert("Approved!");
        } catch (err) { alert("Failed."); }
    };

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 overflow-hidden bg-white">
            <h2 className="text-xl sm:text-2xl font-black italic uppercase text-[#2c3e50] mb-4 border-b-4 border-[#3498db] pb-2 inline-block">Admin Control</h2>
            
            <div className="flex gap-1 mb-4">
                <button onClick={() => { setActiveTab('users'); setActiveSupportUser(null); setSelectedOffer(null); }} className={`flex-1 py-2 rounded-xl text-[8px] font-black uppercase transition-all ${activeTab === 'users' ? 'bg-[#2c3e50] text-white' : 'bg-gray-100 text-gray-400'}`}>Users</button>
                <button onClick={() => { setActiveTab('items'); setActiveSupportUser(null); setSelectedOffer(null); }} className={`flex-1 py-2 rounded-xl text-[8px] font-black uppercase transition-all ${activeTab === 'items' ? 'bg-[#2c3e50] text-white' : 'bg-gray-100 text-gray-400'}`}>Offers</button>
                <button onClick={() => { setActiveTab('chats'); setActiveSupportUser(null); setSelectedOffer(null); }} className={`flex-1 py-2 rounded-xl text-[8px] font-black uppercase transition-all ${activeTab === 'chats' ? 'bg-[#2c3e50] text-white' : 'bg-gray-100 text-gray-400'}`}>Support</button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {activeTab === 'users' && (
                    <div className="space-y-4">
                        {editingUser ? (
                            <form onSubmit={handleUpdateUser} className="bg-gray-50 p-4 rounded-2xl border space-y-3">
                                <AdminInput label="Username" value={editingUser.displayName} onChange={v => setEditingUser({...editingUser, displayName: v})} />
                                <AdminInput label="Points" type="number" value={editingUser.points} onChange={v => setEditingUser({...editingUser, points: v})} />
                                <AdminInput label="Phone" value={editingUser.phone} onChange={v => setEditingUser({...editingUser, phone: v})} />
                                <AdminInput label="Address" value={editingUser.address} onChange={v => setEditingUser({...editingUser, address: v})} />
                                <div className="flex gap-2">
                                    <button type="submit" className="flex-1 bg-[#2ecc71] text-white py-2 rounded-lg font-black text-[10px] uppercase">Save</button>
                                    <button type="button" onClick={() => setEditingUser(null)} className="flex-1 bg-gray-200 text-gray-600 py-2 rounded-lg font-black text-[10px] uppercase">Cancel</button>
                                </div>
                            </form>
                        ) : (
                            <>
                                <div className="relative">
                                    <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs"></i>
                                    <input 
                                        placeholder="Search by Name/Email..." 
                                        className="w-full bg-gray-50 border p-3 pl-10 rounded-xl text-xs font-bold outline-none focus:border-[#3498db]"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                {filteredUsers.map(u => (
                                    <div key={u.uid} className="bg-white p-3 border rounded-xl flex justify-between items-center group">
                                        <div className="overflow-hidden">
                                            <div className="font-black text-[10px] uppercase truncate">{u.displayName}</div>
                                            <div className="text-[9px] text-gray-400 truncate">{u.email}</div>
                                        </div>
                                        <button onClick={() => setEditingUser(u)} className="bg-gray-50 p-2 rounded-lg hover:bg-[#3498db] hover:text-white transition-all">
                                            <i className="fas fa-user-edit text-xs"></i>
                                        </button>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'items' && (
                    <div className="space-y-6">
                        {selectedOffer ? (
                            <div className="bg-gray-50 p-4 rounded-2xl border space-y-4">
                                <div className="flex justify-between items-center border-b pb-2">
                                    <h3 className="font-black uppercase text-xs">Offer Details</h3>
                                    <button onClick={() => setSelectedOffer(null)} className="text-gray-400 hover:text-red-500"><i className="fas fa-times"></i></button>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-[10px] font-bold">
                                    <div className="col-span-2"><label className="text-gray-400 block uppercase text-[8px]">Item Name</label> {selectedOffer.itemName}</div>
                                    <div><label className="text-gray-400 block uppercase text-[8px]">Qty</label> {selectedOffer.qty}</div>
                                    <div><label className="text-gray-400 block uppercase text-[8px]">Category</label> {selectedOffer.category}</div>
                                    <div><label className="text-gray-400 block uppercase text-[8px]">Donor</label> {selectedOffer.donorName}</div>
                                    <div><label className="text-gray-400 block uppercase text-[8px]">Status</label> 
                                        <span className={selectedOffer.completedAt ? 'text-green-500' : 'text-red-500'}>
                                            {selectedOffer.completedAt ? 'Approved' : 'Pending Approval'}
                                        </span>
                                    </div>
                                </div>
                                {!selectedOffer.completedAt && (
                                    <button onClick={() => handleApproveFromPanel(selectedOffer)} className="w-full bg-[#2ecc71] text-white py-3 rounded-xl font-black text-xs uppercase shadow-md transition-all">
                                        Approve & Gift Points
                                    </button>
                                )}
                                <button onClick={() => setSelectedOffer(null)} className="w-full bg-[#2c3e50] text-white py-2 rounded-lg font-black text-[10px] uppercase">Back</button>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <h3 className="text-[10px] font-black uppercase text-[#e74c3c] mb-2 tracking-widest bg-red-50 p-2 rounded-lg inline-block">Pending Approval ({data.items.length})</h3>
                                    <div className="space-y-2">
                                        {data.items.map(i => (
                                            <div key={i.id} onClick={() => setSelectedOffer(i)} className="bg-white p-3 border border-red-100 rounded-xl cursor-pointer hover:shadow-md transition-all">
                                                <div className="font-black text-xs uppercase">{i.itemName}</div>
                                                <div className="text-[9px] text-gray-400">Donor: {i.donorName}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-[10px] font-black uppercase text-[#2ecc71] mb-2 tracking-widest bg-green-50 p-2 rounded-lg inline-block">Approved Offers ({data.completedItems.length})</h3>
                                    <div className="space-y-2">
                                        {data.completedItems.map(i => (
                                            <div key={i.id} onClick={() => setSelectedOffer(i)} className="bg-white p-3 border border-green-100 rounded-xl cursor-pointer opacity-80 hover:opacity-100 hover:shadow-md transition-all">
                                                <div className="font-black text-xs uppercase">{i.itemName}</div>
                                                <div className="text-[9px] text-gray-400">Donor: {i.donorName}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'chats' && (
                    activeSupportUser ? (
                        <div className="flex flex-col h-full space-y-4">
                            <button onClick={() => setActiveSupportUser(null)} className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-2"><i className="fas fa-arrow-left"></i> All</button>
                            <ChatLogWindow userId={activeSupportUser.userId} />
                            <form onSubmit={sendAdminReply} className="flex gap-2">
                                <input value={adminReply} onChange={e => setAdminReply(e.target.value)} placeholder="Reply..." className="flex-1 bg-gray-100 p-2 rounded-xl text-xs font-bold border outline-none" />
                                <button className="bg-[#2c3e50] text-white px-4 rounded-xl text-[10px] font-black">Send</button>
                            </form>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {data.supportChats.map(s => (
                                <div key={s.userId} onClick={() => setActiveSupportUser(s)} className="bg-white p-4 border rounded-xl cursor-pointer hover:border-[#3498db]">
                                    <div className="font-black text-[11px] uppercase mb-1">{s.userName}</div>
                                    <div className="text-[10px] text-gray-400 truncate">{s.lastMsg}</div>
                                </div>
                            ))}
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

const ChatLogWindow: React.FC<{userId: string}> = ({userId}) => {
    const [msgs, setMsgs] = useState<any[]>([]);
    useEffect(() => {
        const unsub = firebase.firestore().collection('support_chats').where('userId', '==', userId).orderBy('createdAt', 'asc').onSnapshot((snap: any) => setMsgs(snap.docs.map((d: any) => d.data())));
        return unsub;
    }, [userId]);

    return (
        <div className="flex-1 h-[300px] overflow-y-auto bg-gray-50 rounded-xl p-3 space-y-2">
            {msgs.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.sender === 'user' ? 'items-start' : 'items-end'}`}>
                    <div className={`max-w-[90%] p-2 rounded-xl text-[10px] font-bold ${m.sender === 'user' ? 'bg-white text-[#2c3e50] border' : 'bg-[#2c3e50] text-white'}`}>
                        {m.text}
                    </div>
                </div>
            ))}
        </div>
    );
};

const ProfilePage: React.FC<{user: UserProfile | null, t: any, onAuth: any, onNavigate: any}> = ({user, t, onAuth}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({ displayName: '', phone: '', address: '', birthdate: '' });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (user) {
            setEditData({
                displayName: user.displayName || '',
                phone: user.phone || '',
                address: user.address || '',
                birthdate: user.birthdate || ''
            });
        }
    }, [user]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsSaving(true);
        try {
            await firebase.firestore().collection('users').doc(user.uid).update({
                ...editData,
                age: editData.birthdate ? (new Date().getFullYear() - new Date(editData.birthdate).getFullYear()) : (user.age || 0)
            });
            setIsEditing(false);
            alert("Profile updated successfully!");
        } catch (err) {
            alert("Failed to update profile.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!user) return <div className="text-center py-20"><button onClick={onAuth} className="bg-[#3498db] text-white px-12 py-4 rounded-full font-black uppercase">Sign In</button></div>;

    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in pb-20">
            <div className="bg-[#2c3e50] p-8 sm:p-12 rounded-[2rem] shadow-xl text-white text-center border-b-8 border-[#f39c12]">
                <div className="w-20 h-20 bg-[#3498db] rounded-full flex items-center justify-center text-3xl font-black mx-auto mb-6 uppercase">
                    {user.displayName?.[0] || '?'}
                </div>
                <h1 className="text-2xl font-black uppercase italic mb-2 tracking-tighter">{user.displayName || 'Guest'}</h1>
                <p className="text-[#f39c12] font-black text-xl">{user.points} Points</p>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-6">
                <div className="flex justify-between items-center border-b pb-2">
                    <h3 className="text-sm font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                        <i className="fas fa-info-circle"></i> Personal Information
                    </h3>
                    <button 
                        onClick={() => isEditing ? handleSave({ preventDefault: () => {} } as any) : setIsEditing(true)} 
                        className={`text-[10px] font-black uppercase px-4 py-1.5 rounded-full shadow-sm transition-all ${isEditing ? 'bg-[#2ecc71] text-white' : 'bg-[#3498db] text-white'}`}
                        disabled={isSaving}
                    >
                        {isSaving ? 'Saving...' : (isEditing ? 'Save Changes' : 'Edit Info')}
                    </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label className="text-[8px] font-black uppercase text-gray-400 block mb-1 tracking-widest">Full Name</label>
                        {isEditing ? (
                            <input value={editData.displayName} onChange={e => setEditData({...editData, displayName: e.target.value})} className="w-full bg-gray-50 border p-2 rounded-lg font-bold text-sm outline-none focus:border-[#3498db]" />
                        ) : (
                            <p className="font-bold text-sm text-[#2c3e50]">{user.displayName}</p>
                        )}
                    </div>
                    <div>
                        <label className="text-[8px] font-black uppercase text-gray-400 block mb-1 tracking-widest">Contact Number</label>
                        {isEditing ? (
                            <input type="tel" value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})} className="w-full bg-gray-50 border p-2 rounded-lg font-bold text-sm outline-none focus:border-[#3498db]" />
                        ) : (
                            <p className="font-bold text-sm text-[#2c3e50]">{user.phone || 'Not Provided'}</p>
                        )}
                    </div>
                    <div className="sm:col-span-2">
                        <label className="text-[8px] font-black uppercase text-gray-400 block mb-1 tracking-widest">Home Area</label>
                        {isEditing ? (
                            <input value={editData.address} onChange={e => setEditData({...editData, address: e.target.value})} className="w-full bg-gray-50 border p-2 rounded-lg font-bold text-sm outline-none focus:border-[#3498db]" />
                        ) : (
                            <p className="font-bold text-sm text-[#2c3e50]">{user.address || 'Not Provided'}</p>
                        )}
                    </div>
                    <div>
                        <label className="text-[8px] font-black uppercase text-gray-400 block mb-1 tracking-widest">Birthdate</label>
                        {isEditing ? (
                            <input type="date" value={editData.birthdate} onChange={e => setEditData({...editData, birthdate: e.target.value})} className="w-full bg-gray-50 border p-2 rounded-lg font-bold text-sm outline-none focus:border-[#3498db]" />
                        ) : (
                            <p className="font-bold text-sm text-[#2c3e50]">{user.birthdate || 'Not Provided'}</p>
                        )}
                    </div>
                    <div>
                        <label className="text-[8px] font-black uppercase text-gray-400 block mb-1 tracking-widest">Email (Login Only)</label>
                        <p className="font-bold text-sm text-gray-400 italic">{user.email}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ShopPage: React.FC<{user: UserProfile | null, t: any, onAuth: any, onRedeemConfirm: (i: any) => void}> = ({user, onAuth, onRedeemConfirm}) => {
    const items = [
        { id: '1', name: 'Koperasi RM5 Voucher', cost: 20, color: '#27ae60' },
        { id: '2', name: 'Koperasi RM10 Voucher', cost: 40, color: '#3498db' },
        { id: '3', name: 'Koperasi RM15 Voucher', cost: 50, color: '#f39c12' }
    ];
    return (
        <div className="space-y-12 py-12 pb-24">
            <h1 className="text-3xl font-black italic uppercase text-[#2c3e50] text-center tracking-tighter">Kindness Shop</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {items.map(item => (
                    <div key={item.id} className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-xl text-center flex flex-col hover:scale-105 transition-transform">
                        <div className="p-8 flex-1">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl text-[#f39c12]"><i className="fas fa-gift"></i></div>
                            <h3 className="font-black text-lg mb-2 uppercase italic text-[#2c3e50]">{item.name}</h3>
                            <div className="text-2xl font-black text-[#f39c12]">{item.cost} Points</div>
                        </div>
                        <button onClick={() => user ? onRedeemConfirm(item) : onAuth()} className="w-full py-6 font-black uppercase text-white tracking-widest text-[11px]" style={{backgroundColor: item.color}}>Redeem Now</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

const HistoryPage: React.FC<{user: UserProfile | null, t: any, onAuth: any}> = ({user, t, onAuth}) => {
    const [history, setHistory] = useState<any[]>([]);
    useEffect(() => {
        if (!user) return;
        const unsub = firebase.firestore().collection('redeem_history').where('userId', '==', user.uid).orderBy('redeemedAt', 'desc').onSnapshot((snap: any) => setHistory(snap.docs.map((d: any) => d.data())));
        return unsub;
    }, [user]);
    
    if (!user) return <div className="text-center py-20 font-black uppercase text-gray-300">Login to view history</div>;
    
    return (
        <div className="max-w-4xl mx-auto space-y-10 py-12 pb-24">
            <h1 className="text-3xl font-black italic uppercase text-[#2c3e50] tracking-tighter">Activity History</h1>
            <div className="space-y-4">
                <h2 className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-2">Redemptions</h2>
                {history.map((h, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 flex items-center justify-between shadow-sm animate-in slide-in-from-bottom">
                        <div className="flex items-center gap-4">
                            <i className="fas fa-ticket-alt text-[#f39c12] text-xl"></i>
                            <div>
                                <div className="font-black uppercase italic text-[#2c3e50] text-sm">{h.itemName}</div>
                                <div className="text-[10px] font-bold text-gray-300 uppercase">{h.redeemedAt?.toDate().toLocaleDateString()}</div>
                            </div>
                        </div>
                        <div className="text-[#e74c3c] font-black text-xl">-{h.itemPoints}</div>
                    </div>
                ))}
                {history.length === 0 && <div className="text-center py-10 text-gray-300 font-black uppercase italic bg-white rounded-2xl border">No redemptions found</div>}
            </div>
        </div>
    );
};

const AuthModal: React.FC<{onClose: () => void, t: any}> = ({onClose}) => {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [data, setData] = useState({ email: '', password: '', name: '', birthdate: '', phone: '', address: '' });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (mode === 'login') {
                await firebase.auth().signInWithEmailAndPassword(data.email, data.password);
            } else {
                if (!data.email.toLowerCase().endsWith("@moe-dl.edu.my") && data.email !== 'admin@gmail.com') throw new Error("MOE Email Required (@moe-dl.edu.my)");
                
                const birthYear = new Date(data.birthdate).getFullYear();
                const currentYear = new Date().getFullYear();
                const age = currentYear - birthYear;

                const {user} = await firebase.auth().createUserWithEmailAndPassword(data.email, data.password);
                await firebase.firestore().collection('users').doc(user.uid).set({ 
                    email: data.email, 
                    displayName: data.name, 
                    points: 10,
                    birthdate: data.birthdate,
                    age: age,
                    phone: data.phone,
                    address: data.address,
                    isAdmin: data.email === 'admin@gmail.com'
                });
            }
            onClose();
        } catch (err: any) { alert(err.message); } finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[400] flex items-center justify-center p-4 backdrop-blur-md" onClick={onClose}>
            <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 sm:p-12 shadow-2xl relative animate-in zoom-in duration-300 overflow-y-auto max-h-[95vh]" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-6 right-6 bg-gray-100 hover:bg-red-500 hover:text-white w-10 h-10 rounded-full flex items-center justify-center transition-all group">
                    <i className="fas fa-times text-gray-400 group-hover:text-white"></i>
                </button>

                <h2 className="text-2xl sm:text-3xl font-black text-center uppercase italic text-[#2c3e50] mb-8 tracking-tighter">{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
                <form onSubmit={submit} className="space-y-4">
                    {mode === 'register' && (
                        <>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Full Name (As IC)</label>
                                <input placeholder="Your Name" value={data.name} onChange={e => setData({...data, name: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl outline-none font-bold text-black text-sm" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Birth Date</label>
                                    <input type="date" value={data.birthdate} onChange={e => setData({...data, birthdate: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl outline-none font-bold text-black text-sm" required />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Phone</label>
                                    <input type="tel" placeholder="012-345..." value={data.phone} onChange={e => setData({...data, phone: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl outline-none font-bold text-black text-sm" required />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Home Address (Miri Area)</label>
                                <input placeholder="e.g. Lutong, Piasau..." value={data.address} onChange={e => setData({...data, address: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl outline-none font-bold text-black text-sm" required />
                            </div>
                        </>
                    )}
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Email Address</label>
                        <input type="email" placeholder="email@moe-dl.edu.my" value={data.email} onChange={e => setData({...data, email: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl outline-none font-bold text-black text-sm" required />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Password</label>
                        <div className="relative">
                            <input 
                                type={showPassword ? "text" : "password"} 
                                placeholder="••••••••" 
                                value={data.password} 
                                onChange={e => setData({...data, password: e.target.value})} 
                                className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl outline-none font-bold pr-12 text-black text-sm" 
                                required 
                            />
                            <button 
                                type="button" 
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-[#3498db] transition-colors"
                            >
                                <i className={`fas fa-eye${showPassword ? '-slash' : ''}`}></i>
                            </button>
                        </div>
                    </div>
                    <button disabled={loading} className="w-full bg-[#3498db] text-white py-6 rounded-full font-black text-xl shadow-xl hover:scale-105 transition-all mt-6 tracking-widest uppercase">
                        {loading ? 'Processing...' : (mode === 'login' ? 'Log In' : 'Create Account')}
                    </button>
                </form>
                
                <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col items-center gap-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">
                        {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
                    </p>
                    <button 
                        onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setShowPassword(false); }} 
                        className="text-xs font-black uppercase text-[#3498db] hover:underline"
                    >
                        {mode === 'login' ? 'Register Now' : 'Log In Here'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const RedeemConfirmModal: React.FC<{item: any, user: UserProfile, onCancel: () => void, onConfirm: (f: string, c: string) => void}> = ({onCancel, onConfirm}) => {
    const [f, setF] = useState('');
    const [c, setC] = useState('');
    return (
        <div className="fixed inset-0 bg-black/90 z-[500] flex items-center justify-center p-4 backdrop-blur-xl" onClick={onCancel}>
            <div className="bg-white w-full max-w-md rounded-[2rem] p-10 shadow-2xl animate-in zoom-in" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl sm:text-2xl font-black mb-8 italic uppercase text-[#2c3e50] text-center tracking-tighter">Confirmation</h2>
                <form onSubmit={e => { e.preventDefault(); onConfirm(f, c); }} className="space-y-6">
                    <input value={f} onChange={e => setF(e.target.value)} placeholder="Full Name (IC)" className="w-full bg-gray-50 border-2 border-gray-100 p-5 rounded-2xl font-bold text-black text-sm" required />
                    <input value={c} onChange={e => setC(e.target.value)} placeholder="Class / Group" className="w-full bg-gray-50 border-2 border-gray-100 p-5 rounded-2xl font-bold text-black text-sm" required />
                    <button type="submit" className="w-full bg-[#3498db] text-white py-6 rounded-full font-black uppercase shadow-xl tracking-widest">Complete Redemption</button>
                </form>
            </div>
        </div>
    );
};

export default App;
