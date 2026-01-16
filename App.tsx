
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
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [guestId, setGuestId] = useState<string>('');
    const [earnedPointsModal, setEarnedPointsModal] = useState<{show: boolean, amount: number, message: string}>({show: false, amount: 0, message: ''});
    
    const t = useCallback((key: string) => translations[lang][key] || key, [lang]);

    useEffect(() => {
        let storedGuestId = sessionStorage.getItem('support_guest_id');
        if (!storedGuestId) {
            storedGuestId = 'guest_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('support_guest_id', storedGuestId);
        }
        setGuestId(storedGuestId);
    }, []);

    useEffect(() => {
        let unsubscribeAuth: () => void = () => {};
        let unsubNotifs: () => void = () => {};

        const initFirebase = async () => {
            if (typeof firebase === 'undefined') {
                console.warn("Firebase not yet loaded...");
                setTimeout(initFirebase, 500);
                return;
            }

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

                if (!firebase.apps || !firebase.apps.length) {
                    firebase.initializeApp(firebaseConfig);
                }

                const db = firebase.firestore();

                unsubscribeAuth = firebase.auth().onAuthStateChanged(async (authUser: any) => {
                    if (authUser) {
                        db.collection('users').doc(authUser.uid).onSnapshot((doc: any) => {
                            if (doc.exists) {
                                setUser({ ...doc.data(), uid: authUser.uid } as UserProfile);
                            } else {
                                setUser({ uid: authUser.uid, email: authUser.email, points: 10 } as any);
                            }
                        }, (err: any) => console.error("User snap error:", err));

                        unsubNotifs = db.collection('notifications')
                            .where('userId', '==', authUser.uid)
                            .limit(50)
                            .onSnapshot((snap: any) => {
                                const notifs = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
                                notifs.sort((a: any, b: any) => {
                                    const timeA = a.createdAt?.toMillis?.() || 0;
                                    const timeB = b.createdAt?.toMillis?.() || 0;
                                    return timeB - timeA;
                                });
                                setNotifications(notifs);
                            }, (err: any) => console.error("Notif snap error:", err));
                    } else { 
                        setUser(null); 
                        setNotifications([]);
                        if (unsubNotifs) unsubNotifs();
                    }
                    setLoading(false);
                });
            } catch (err) {
                console.error("Firebase init error:", err);
                setLoading(false);
            }
        };

        initFirebase();
        return () => {
            if (unsubscribeAuth) unsubscribeAuth();
            if (unsubNotifs) unsubNotifs();
        };
    }, []);

    const isAdmin = user?.isAdmin || user?.email === 'admin@gmail.com';

    const markNotifRead = async (notification: any) => {
        if (typeof firebase === 'undefined') return;
        try {
            await firebase.firestore().collection('notifications').doc(notification.id).update({ read: true });
            
            const lowerMsg = notification.message.toLowerCase();
            if (notification.type === 'status' || lowerMsg.includes('earned') || lowerMsg.includes('points')) {
                const pointsMatch = notification.message.match(/(\d+)/);
                const points = pointsMatch ? parseInt(pointsMatch[1]) : 5;
                setEarnedPointsModal({
                    show: true,
                    amount: points,
                    message: notification.message
                });
                
                setTimeout(() => setEarnedPointsModal(prev => ({...prev, show: false})), 6000);
            }
        } catch (e) {
            console.error("Error marking read", e);
        }
    };

    if (loading) return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#f8f9fa] text-[#3498db] font-black italic uppercase text-center">
            <i className="fas fa-spinner fa-spin text-5xl mb-4"></i>
            Connecting citizens...
        </div>
    );

    const unreadCount = notifications.filter(n => !n.read).length;

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
                            <div className="relative">
                                <button 
                                    onClick={() => setIsNotifOpen(!isNotifOpen)}
                                    className="p-2 hover:bg-white/10 rounded-full transition-all relative"
                                >
                                    <i className="fas fa-bell text-lg"></i>
                                    {unreadCount > 0 && (
                                        <span className="absolute top-1 right-1 bg-red-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-black border-2 border-[#2c3e50]">
                                            {unreadCount}
                                        </span>
                                    )}
                                </button>
                                
                                {isNotifOpen && (
                                    <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden text-black z-[200] animate-in slide-in-from-top-2">
                                        <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                                            <span className="text-[10px] font-black uppercase text-gray-400">Notifications</span>
                                            {unreadCount > 0 && (
                                                <button onClick={() => notifications.forEach(n => !n.read && markNotifRead(n))} className="text-[8px] font-black uppercase text-[#3498db] hover:underline">Mark all read</button>
                                            )}
                                        </div>
                                        <div className="max-h-80 overflow-y-auto">
                                            {notifications.length === 0 ? (
                                                <div className="p-8 text-center text-gray-300 italic text-xs uppercase font-black">No alerts</div>
                                            ) : (
                                                notifications.map(n => (
                                                    <div key={n.id} onClick={() => markNotifRead(n)} className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors ${!n.read ? 'bg-blue-50/50' : ''}`}>
                                                        <div className="flex gap-3">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] shrink-0 ${n.type === 'offer' ? 'bg-green-500' : n.type === 'message' ? 'bg-blue-500' : 'bg-orange-500'}`}>
                                                                <i className={`fas fa-${n.type === 'offer' ? 'hand-holding-heart' : n.type === 'message' ? 'comment' : 'sync'}`}></i>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[11px] font-bold text-gray-800 leading-tight">{n.title}</p>
                                                                <p className="text-[10px] text-gray-500 line-clamp-2 mt-0.5">{n.message}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {user && (
                            <div className="flex items-center bg-[#f39c12] px-2 sm:px-4 py-1 rounded-full text-[8px] sm:text-xs font-black shadow-lg whitespace-nowrap">
                                <i className="fas fa-star mr-1 sm:mr-2"></i> {user.points} <span className="ml-0.5">{t('points')}</span>
                            </div>
                        )}
                        {user ? (
                            <button onClick={() => firebase && firebase.auth().signOut()} className="bg-red-500 hover:bg-red-600 text-white px-2 sm:px-4 py-1.5 rounded-full text-[8px] sm:text-[10px] font-black uppercase shadow-lg flex items-center gap-1 whitespace-nowrap">
                                <i className="fas fa-sign-out-alt"></i>
                                <span>{t('logout')}</span>
                            </button>
                        ) : (
                            <button onClick={() => setIsAuthModalOpen(true)} className="bg-[#3498db] hover:bg-blue-600 px-3 py-1.5 rounded-full text-[8px] sm:text-[10px] font-black uppercase shadow-lg">{t('login')}</button>
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
                        <span className="text-[6px] sm:text-[7px] font-black uppercase mt-1">{t('admin_panel')}</span>
                    </button>
                )}

                <div className="fixed right-6 bottom-6 z-[200] flex flex-col items-end gap-3 sm:gap-4">
                    {showSupportChat && (
                        <div className="w-[85vw] sm:w-80 h-[450px] bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 mb-2 origin-bottom-right">
                            <div className="bg-[#3498db] p-4 text-white flex justify-between items-center">
                                <div className="font-black uppercase text-xs flex items-center gap-2">
                                    <i className="fas fa-headset"></i>
                                    {t('admin_support')}
                                </div>
                                <button onClick={() => setShowSupportChat(false)} className="hover:rotate-90 transition-transform p-1">
                                    <i className="fas fa-times text-lg"></i>
                                </button>
                            </div>
                            <SupportChatBody userId={user ? user.uid : guestId} userName={user ? user.displayName : 'Guest'} t={t} isGuest={!user} />
                        </div>
                    )}
                    
                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <button className="bg-white text-[#2c3e50] w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all border-4 border-gray-50">
                                <i className="fas fa-language text-xl sm:text-2xl"></i>
                            </button>
                            <div className="absolute bottom-full right-0 mb-3 bg-white shadow-2xl rounded-2xl border border-gray-100 hidden group-hover:block overflow-hidden z-[210] min-w-[140px] animate-in slide-in-from-bottom-2">
                                {(Object.values(Language) as Language[]).map(l => (
                                    <button 
                                        key={l}
                                        onClick={() => setLang(l)}
                                        className={`w-full px-5 py-3 text-left text-[10px] font-black uppercase transition-colors hover:bg-gray-50 ${lang === l ? 'text-[#3498db] bg-blue-50' : 'text-gray-500'}`}
                                    >
                                        {l === Language.EN && 'English'}
                                        {l === Language.BM && 'Bahasa Melayu'}
                                        {l === Language.BC && '中文'}
                                        {l === Language.BI && 'Bahasa Iban'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button 
                            onClick={() => setShowSupportChat(!showSupportChat)}
                            className="bg-[#3498db] text-white w-16 h-16 rounded-full shadow-[0_8px_32px_rgba(52,152,219,0.3)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all border-4 border-white z-[201]"
                        >
                            <i className="fas fa-comment-dots text-3xl"></i>
                        </button>
                    </div>
                </div>

                <main className={`flex-1 overflow-y-auto transition-all duration-300 ${isAdmin && showAdminPanel ? 'lg:mr-96' : ''}`}>
                    <div className="container mx-auto px-4 py-8 max-w-6xl">
                        {page === 'home' && <HomePage t={t} user={user} />}
                        {page === 'offer_help' && <OfferHelpPage user={user} t={t} onAuth={() => setIsAuthModalOpen(true)} onNavigate={setPage} />}
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
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('kindness_level')}</div>
                            <div className="text-2xl font-black text-[#f39c12]">{user.points} <span className="text-xs">{t('points')}</span></div>
                        </div>
                    )}
                    <nav className="flex flex-col gap-2">
                        <MenuItem icon="home" label={t('home')} onClick={() => { setPage('home'); setIsMenuOpen(false); }} active={page === 'home'} />
                        <MenuItem icon="hand-holding-heart" label={t('offer_help')} onClick={() => { setPage('offer_help'); setIsMenuOpen(false); }} active={page === 'offer_help'} />
                        <MenuItem icon="user" label={t('profile')} onClick={() => { setPage('profile'); setIsMenuOpen(false); }} active={page === 'profile'} />
                        <MenuItem icon="shopping-cart" label={t('points_shop')} onClick={() => { setPage('shop'); setIsMenuOpen(false); }} active={page === 'shop'} />
                        <MenuItem icon="history" label={t('history')} onClick={() => { setPage('history'); setIsMenuOpen(false); }} active={page === 'history'} />
                    </nav>
                </div>
            </aside>
            {isMenuOpen && <div className="fixed inset-0 bg-black/50 z-[300]" onClick={() => setIsMenuOpen(false)}></div>}

            {isAuthModalOpen && <AuthModal onClose={() => setIsAuthModalOpen(false)} t={t} />}

            {earnedPointsModal.show && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
                    <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl text-center max-w-sm border-t-8 border-[#f39c12] relative overflow-hidden">
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#f39c12]/10 rounded-full blur-2xl"></div>
                        <div className="w-20 h-20 bg-[#f39c12] rounded-full flex items-center justify-center text-white text-4xl mx-auto mb-6 animate-bounce shadow-lg">
                            <i className="fas fa-star"></i>
                        </div>
                        <h2 className="text-2xl font-black uppercase italic text-[#2c3e50] mb-2">Good Job!</h2>
                        <p className="text-gray-500 font-bold mb-6 text-sm leading-relaxed">{earnedPointsModal.message}</p>
                        <div className="text-4xl font-black text-[#f39c12] mb-8 tabular-nums tracking-tighter">+{earnedPointsModal.amount} Points</div>
                        <button 
                            onClick={() => setEarnedPointsModal(prev => ({...prev, show: false}))}
                            className="w-full bg-[#2c3e50] text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all shadow-xl"
                        >
                            Awesome!
                        </button>
                    </div>
                </div>
            )}

            {itemToRedeem && (
                <RedeemConfirmModal 
                    item={itemToRedeem} 
                    user={user!} 
                    t={t}
                    onCancel={() => setItemToRedeem(null)} 
                    onConfirm={async (fullName, userClass) => {
                        if (typeof firebase === 'undefined') return;
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
                        } catch (e: any) { alert("Failed: " + e.message); }
                    }} 
                />
            )}
        </div>
    );
};

const SupportChatBody: React.FC<{userId: string, userName: string, t: any, isGuest: boolean}> = ({userId, userName, t, isGuest}) => {
    const [msgs, setMsgs] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!userId || typeof firebase === 'undefined') return;
        const db = firebase.firestore();
        const unsub = db.collection('support_chats')
            .where('userId', '==', userId)
            .onSnapshot((snap: any) => {
                const data = snap.docs.map((d: any) => d.data());
                data.sort((a: any, b: any) => {
                    const timeA = a.createdAt?.toMillis?.() || 0;
                    const timeB = b.createdAt?.toMillis?.() || 0;
                    return timeA - timeB;
                });
                setMsgs(data);
            }, (err: any) => {
                console.error("Support chat snap error:", err);
            });
        return unsub;
    }, [userId]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [msgs]);

    const send = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !userId || typeof firebase === 'undefined') return;
        const msgText = input;
        setInput('');
        
        try {
            await firebase.firestore().collection('support_chats').add({
                userId,
                userName: userName || 'Guest',
                text: msgText,
                sender: 'user',
                isGuest,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) {
            console.error("Error sending message:", e);
        }
    };

    return (
        <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {msgs.length === 0 && (
                    <div className="text-center py-10 px-4">
                        <i className="fas fa-headset text-3xl text-gray-300 mb-2"></i>
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{t('support_desc')}</p>
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
                            {m.sender === 'user' ? (m.isGuest ? 'Guest' : 'You') : 'Admin'}
                        </span>
                    </div>
                ))}
            </div>
            <form onSubmit={send} className="p-4 bg-white border-t flex gap-2">
                <input 
                    value={input} 
                    onChange={e => setInput(e.target.value)} 
                    placeholder={t('type_message')} 
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
    const [announcement, setAnnouncement] = useState<{text: string, updatedAt: any}>({text: '', updatedAt: null});
    const [isEditingAnnounce, setIsEditingAnnounce] = useState(false);
    const [announceInput, setAnnounceInput] = useState('');

    useEffect(() => {
        if (typeof firebase === 'undefined') return;
        const db = firebase.firestore();
        const unsubDonations = db.collection('donations').orderBy('createdAt', 'desc').onSnapshot((snap: any) => {
            setDonations(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
        }, (err: any) => console.error("Donations snap error:", err));

        const unsubAnnounce = db.collection('settings').doc('announcement').onSnapshot((doc: any) => {
            if (doc.exists) {
                const data = doc.data();
                setAnnouncement(data);
                setAnnounceInput(data.text);
            }
        });

        return () => { unsubDonations(); unsubAnnounce(); };
    }, []);

    const saveAnnouncement = async () => {
        if (typeof firebase === 'undefined') return;
        try {
            await firebase.firestore().collection('settings').doc('announcement').set({
                text: announceInput,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            setIsEditingAnnounce(false);
        } catch (e) {
            alert("Failed to update announcement.");
        }
    };

    const handleConfirmReceived = async (donation: any) => {
        if (!user || (!user.isAdmin && user.email !== 'admin@gmail.com') || typeof firebase === 'undefined') return;
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

            await db.collection('notifications').add({
                userId: donation.userId,
                title: 'Offer Confirmed!',
                message: `Your offer for ${donation.itemName} has been confirmed. You earned 5 points!`,
                type: 'status',
                read: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
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

            <div className="max-w-6xl mx-auto space-y-10">
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-xs font-black uppercase text-gray-400 tracking-[0.2em]">{t('admin_support')} / ANNOUNCEMENTS</h3>
                        {isAdmin && (
                            <button 
                                onClick={() => setIsEditingAnnounce(!isEditingAnnounce)}
                                className="text-[10px] font-black uppercase text-[#3498db] hover:underline"
                            >
                                {isEditingAnnounce ? t('cancel') : 'Update Announcement'}
                            </button>
                        )}
                    </div>
                    
                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 sm:p-10 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <i className="fas fa-bullhorn text-6xl rotate-12"></i>
                        </div>
                        
                        {isEditingAnnounce && isAdmin ? (
                            <div className="space-y-4 animate-in slide-in-from-top-2">
                                <textarea 
                                    value={announceInput}
                                    onChange={e => setAnnounceInput(e.target.value)}
                                    placeholder="Type important news for all users..."
                                    className="w-full h-32 p-5 bg-gray-50 rounded-2xl border-2 border-gray-100 focus:border-[#3498db] outline-none font-bold text-sm leading-relaxed"
                                />
                                <button 
                                    onClick={saveAnnouncement}
                                    className="bg-[#2c3e50] text-white px-10 py-3.5 rounded-xl font-black uppercase text-[10px] shadow-lg hover:scale-105 transition-all"
                                >
                                    Publish Update
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-start gap-6">
                                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#3498db]/10 rounded-2xl flex items-center justify-center text-[#3498db] text-2xl shrink-0">
                                    <i className="fas fa-bullhorn"></i>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm sm:text-lg font-bold text-[#2c3e50] italic leading-relaxed">
                                        {announcement.text || "No official announcements at this time. Stay safe, Miri!"}
                                    </p>
                                    <div className="text-[9px] font-black uppercase text-gray-300 flex items-center gap-2">
                                        <i className="far fa-clock"></i>
                                        {announcement.updatedAt ? announcement.updatedAt.toDate().toLocaleString() : 'Just now'}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
                        <h2 className="text-lg sm:text-xl font-black text-[#2c3e50] tracking-tight uppercase">{t('offer_help')}</h2>
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
                                        <i className="fas fa-check-circle mr-2"></i> {t('confirm_received')}
                                    </button>
                                )}
                            </div>
                        ))}
                        {donations.length === 0 && <div className="col-span-full py-20 text-center font-black text-gray-300 uppercase italic">{t('no_requests')}</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};

const OfferHelpPage: React.FC<{user: UserProfile | null, t: any, onAuth: () => void, onNavigate: (p: string) => void}> = ({user, t, onAuth, onNavigate}) => {
    const [item, setItem] = useState({ itemName: '', category: t('category_food'), qty: 1, donorName: user?.displayName || '' });
    const [posting, setPosting] = useState(false);

    const handlePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) { onAuth(); return; }
        if (typeof firebase === 'undefined') return;
        setPosting(true);
        try {
            const db = firebase.firestore();
            await db.collection('donations').add({
                ...item,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                userId: user.uid
            });
            await db.collection('users').doc(user.uid).update({ points: (user.points || 0) + 5 });
            
            const admins = await db.collection('users').where('isAdmin', '==', true).get();
            admins.forEach(async (adminDoc: any) => {
                await db.collection('notifications').add({
                    userId: adminDoc.id,
                    title: 'New Offer Received',
                    message: `${user.displayName} offered ${item.itemName}.`,
                    type: 'offer',
                    read: false,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });

            alert("SUCCESSFULLY POSTED!");
            onNavigate('home');
        } catch (err) { alert("Failed."); } finally { setPosting(false); }
    };

    if (!user) return (
        <div className="max-w-4xl mx-auto py-24 text-center">
            <h2 className="text-4xl font-black text-[#2c3e50] mb-2 uppercase tracking-tighter">{t('login_register')}</h2>
            <button onClick={onAuth} className="bg-[#3498db] text-white px-12 py-5 rounded-full font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all mt-8">{t('login')}</button>
        </div>
    );

    return (
        <div className="max-w-2xl mx-auto py-12 animate-in zoom-in duration-300">
            <div className="bg-white rounded-[3rem] shadow-2xl p-10 sm:p-16 border border-gray-50">
                <h2 className="text-3xl font-black text-[#2c3e50] mb-2 leading-none uppercase italic">{t('offer_help')}</h2>
                <form onSubmit={handlePost} className="space-y-8 mt-10">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest ml-1">Items</label>
                        <input 
                            value={item.itemName} 
                            onChange={e => setItem({...item, itemName: e.target.value})} 
                            className="w-full p-5 rounded-2xl border-2 border-gray-100 focus:border-[#3498db] outline-none font-bold bg-white text-black" 
                            required 
                            placeholder="What are you offering?"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest ml-1">Category</label>
                            <select value={item.category} onChange={e => setItem({...item, category: e.target.value})} className="w-full p-5 rounded-2xl border-2 border-gray-100 outline-none font-bold text-black bg-white">
                                <option>{t('category_food')}</option>
                                <option>{t('category_clothing')}</option>
                                <option>{t('category_books')}</option>
                                <option>{t('category_furniture')}</option>
                                <option>{t('category_toiletries')}</option>
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
                        {posting ? '...' : t('submit_request')}
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
        if (typeof firebase === 'undefined') return;
        const db = firebase.firestore();
        const unsubUsers = db.collection('users').onSnapshot((snap: any) => setData(prev => ({...prev, users: snap.docs.map((d: any) => ({...d.data(), uid: d.id}))})));
        const unsubItems = db.collection('donations').onSnapshot((snap: any) => setData(prev => ({...prev, items: snap.docs.map((d: any) => ({...d.data(), id: d.id}))})));
        const unsubCompleted = db.collection('completed_donations').onSnapshot((snap: any) => setData(prev => ({...prev, completedItems: snap.docs.map((d: any) => ({...d.data(), id: d.id}))})));
        
        const unsubSupport = db.collection('support_chats').onSnapshot((snap: any) => {
            const rawDocs = snap.docs.map((d: any) => d.data());
            rawDocs.sort((a: any, b: any) => {
                const timeA = a.createdAt?.toMillis?.() || 0;
                const timeB = b.createdAt?.toMillis?.() || 0;
                return timeB - timeA;
            });

            const grouped: any[] = [];
            const seen = new Set();
            rawDocs.forEach((docData: any) => {
                if (!seen.has(docData.userId)) {
                    grouped.push({ userId: docData.userId, userName: docData.userName || (docData.isGuest ? 'Guest' : 'User'), lastMsg: docData.text, isGuest: docData.isGuest });
                    seen.add(docData.userId);
                }
            });
            setData(prev => ({...prev, supportChats: grouped}));
        }, (err: any) => console.error("Admin support snap error:", err));

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
        if (typeof firebase === 'undefined') return;
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
        if (!adminReply.trim() || !activeSupportUser || typeof firebase === 'undefined') return;
        const reply = adminReply;
        setAdminReply('');
        const db = firebase.firestore();
        await db.collection('support_chats').add({
            userId: activeSupportUser.userId,
            userName: activeSupportUser.userName || 'User',
            text: reply,
            sender: 'admin',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        if (!activeSupportUser.isGuest) {
            await db.collection('notifications').add({
                userId: activeSupportUser.userId,
                title: 'Admin Response',
                message: 'An administrator replied to your support message.',
                type: 'message',
                read: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    };

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 overflow-hidden bg-white">
            <h2 className="text-xl sm:text-2xl font-black italic uppercase text-[#2c3e50] mb-4 border-b-4 border-[#3498db] pb-2 inline-block">{t('admin_panel')}</h2>
            
            <div className="flex gap-1 mb-4">
                <button onClick={() => { setActiveTab('users'); setActiveSupportUser(null); setSelectedOffer(null); }} className={`flex-1 py-2 rounded-xl text-[8px] font-black uppercase transition-all ${activeTab === 'users' ? 'bg-[#2c3e50] text-white' : 'bg-gray-100 text-gray-400'}`}>{t('user_management')}</button>
                <button onClick={() => { setActiveTab('items'); setActiveSupportUser(null); setSelectedOffer(null); }} className={`flex-1 py-2 rounded-xl text-[8px] font-black uppercase transition-all ${activeTab === 'items' ? 'bg-[#2c3e50] text-white' : 'bg-gray-100 text-gray-400'}`}>{t('offer_help')}</button>
                <button onClick={() => { setActiveTab('chats'); setActiveSupportUser(null); setSelectedOffer(null); }} className={`flex-1 py-2 rounded-xl text-[8px] font-black uppercase transition-all ${activeTab === 'chats' ? 'bg-[#2c3e50] text-white' : 'bg-gray-100 text-gray-400'}`}>{t('support_inbox')}</button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {activeTab === 'users' && (
                    <div className="space-y-4">
                        {editingUser ? (
                            <form onSubmit={handleUpdateUser} className="bg-gray-50 p-4 rounded-2xl border space-y-3">
                                <AdminInput label={t('full_name')} value={editingUser.displayName} onChange={v => setEditingUser({...editingUser, displayName: v})} />
                                <AdminInput label={t('points')} type="number" value={editingUser.points} onChange={v => setEditingUser({...editingUser, points: v})} />
                                <AdminInput label={t('phone_number')} value={editingUser.phone} onChange={v => setEditingUser({...editingUser, phone: v})} />
                                <AdminInput label={t('home_address')} value={editingUser.address} onChange={v => setEditingUser({...editingUser, address: v})} />
                                <div className="flex gap-2">
                                    <button type="submit" className="flex-1 bg-[#2ecc71] text-white py-2 rounded-lg font-black text-[10px] uppercase">{t('save_changes')}</button>
                                    <button type="button" onClick={() => setEditingUser(null)} className="flex-1 bg-gray-200 text-gray-600 py-2 rounded-lg font-black text-[10px] uppercase">{t('cancel')}</button>
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
                                <button onClick={() => setSelectedOffer(null)} className="w-full bg-[#2c3e50] text-white py-2 rounded-lg font-black text-[10px] uppercase">{t('cancel')}</button>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <h3 className="text-[10px] font-black uppercase text-[#e74c3c] mb-2 tracking-widest bg-red-50 p-2 rounded-lg inline-block">{t('status_pending')} ({data.items.length})</h3>
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
                                    <h3 className="text-[10px] font-black uppercase text-[#2ecc71] mb-2 tracking-widest bg-green-50 p-2 rounded-lg inline-block">{t('status_completed')} ({data.completedItems.length})</h3>
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
                                <input value={adminReply} onChange={e => setAdminReply(e.target.value)} placeholder={t('type_official_response')} className="flex-1 bg-gray-100 p-2 rounded-xl text-xs font-bold border outline-none" />
                                <button className="bg-[#2c3e50] text-white px-4 rounded-xl text-[10px] font-black">{t('send')}</button>
                            </form>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {data.supportChats.map(s => (
                                <div key={s.userId} onClick={() => setActiveSupportUser(s)} className="bg-white p-4 border rounded-xl cursor-pointer hover:border-[#3498db]">
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="font-black text-[11px] uppercase">{s.userName}</div>
                                        {s.isGuest && <span className="text-[7px] bg-gray-100 px-1.5 py-0.5 rounded font-black uppercase text-gray-400">Guest</span>}
                                    </div>
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
        if (!userId || typeof firebase === 'undefined') return;
        const db = firebase.firestore();
        const unsub = db.collection('support_chats').where('userId', '==', userId).onSnapshot((snap: any) => {
            const data = snap.docs.map((d: any) => d.data());
            data.sort((a: any, b: any) => {
                const timeA = a.createdAt?.toMillis?.() || 0;
                const timeB = b.createdAt?.toMillis?.() || 0;
                return timeA - timeB;
            });
            setMsgs(data);
        }, (err: any) => console.error("Admin chat log window snap error:", err));
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
        if (!user || typeof firebase === 'undefined') return;
        setIsSaving(true);
        try {
            await firebase.firestore().collection('users').doc(user.uid).update({
                ...editData,
                age: editData.birthdate ? (new Date().getFullYear() - new Date(editData.birthdate).getFullYear()) : (user.age || 0)
            });
            setIsEditing(false);
            alert(t('update_success'));
        } catch (err: any) {
            alert("Failed: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (!user) return <div className="text-center py-20"><button onClick={onAuth} className="bg-[#3498db] text-white px-12 py-4 rounded-full font-black uppercase">{t('login')}</button></div>;

    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in pb-20">
            <div className="bg-[#2c3e50] p-8 sm:p-12 rounded-[2rem] shadow-xl text-white text-center border-b-8 border-[#f39c12]">
                <div className="w-20 h-20 bg-[#3498db] rounded-full flex items-center justify-center text-3xl font-black mx-auto mb-6 uppercase">
                    {user.displayName?.[0] || '?'}
                </div>
                <h1 className="text-2xl font-black uppercase italic mb-2 tracking-tighter">{user.displayName || 'Guest'}</h1>
                <p className="text-[#f39c12] font-black text-xl">{user.points} {t('points')}</p>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-6">
                <div className="flex justify-between items-center border-b pb-2">
                    <h3 className="text-sm font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                        <i className="fas fa-info-circle"></i> {t('personal_info')}
                    </h3>
                    <button 
                        onClick={() => isEditing ? handleSave({ preventDefault: () => {} } as any) : setIsEditing(true)} 
                        className={`text-[10px] font-black uppercase px-4 py-1.5 rounded-full shadow-sm transition-all ${isEditing ? 'bg-[#2ecc71] text-white' : 'bg-[#3498db] text-white'}`}
                        disabled={isSaving}
                    >
                        {isSaving ? '...' : (isEditing ? t('save_changes') : t('edit_profile'))}
                    </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label className="text-[8px] font-black uppercase text-gray-400 block mb-1 tracking-widest">{t('full_name')}</label>
                        {isEditing ? (
                            <input value={editData.displayName} onChange={e => setEditData({...editData, displayName: e.target.value})} className="w-full bg-gray-50 border p-2 rounded-lg font-bold text-sm outline-none focus:border-[#3498db]" />
                        ) : (
                            <p className="font-bold text-sm text-[#2c3e50]">{user.displayName}</p>
                        )}
                    </div>
                    <div>
                        <label className="text-[8px] font-black uppercase text-gray-400 block mb-1 tracking-widest">{t('phone_number')}</label>
                        {isEditing ? (
                            <input type="tel" value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})} className="w-full bg-gray-50 border p-2 rounded-lg font-bold text-sm outline-none focus:border-[#3498db]" />
                        ) : (
                            <p className="font-bold text-sm text-[#2c3e50]">{user.phone || '...'}</p>
                        )}
                    </div>
                    <div className="sm:col-span-2">
                        <label className="text-[8px] font-black uppercase text-gray-400 block mb-1 tracking-widest">{t('home_address')}</label>
                        {isEditing ? (
                            <input value={editData.address} onChange={e => setEditData({...editData, address: e.target.value})} className="w-full bg-gray-50 border p-2 rounded-lg font-bold text-sm outline-none focus:border-[#3498db]" />
                        ) : (
                            <p className="font-bold text-sm text-[#2c3e50]">{user.address || '...'}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ShopPage: React.FC<{user: UserProfile | null, t: any, onAuth: any, onRedeemConfirm: (i: any) => void}> = ({user, t, onAuth, onRedeemConfirm}) => {
    const items = [
        { id: '1', name: t('voucher_5'), cost: 20, color: '#27ae60' },
        { id: '2', name: t('voucher_10'), cost: 40, color: '#3498db' },
        { id: '3', name: t('voucher_15'), cost: 50, color: '#f39c12' }
    ];
    return (
        <div className="space-y-12 py-12 pb-24">
            <h1 className="text-3xl font-black italic uppercase text-[#2c3e50] text-center tracking-tighter">{t('points_shop')}</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {items.map(item => (
                    <div key={item.id} className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-xl text-center flex flex-col hover:scale-105 transition-transform">
                        <div className="p-8 flex-1">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl text-[#f39c12]"><i className="fas fa-gift"></i></div>
                            <h3 className="font-black text-lg mb-2 uppercase italic text-[#2c3e50]">{item.name}</h3>
                            <div className="text-2xl font-black text-[#f39c12]">{item.cost} {t('points')}</div>
                        </div>
                        <button onClick={() => user ? onRedeemConfirm(item) : onAuth()} className="w-full py-6 font-black uppercase text-white tracking-widest text-[11px]" style={{backgroundColor: item.color}}>{t('redeem_now')}</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

const HistoryPage: React.FC<{user: UserProfile | null, t: any, onAuth: any}> = ({user, t, onAuth}) => {
    const [history, setHistory] = useState<any[]>([]);
    useEffect(() => {
        if (!user || typeof firebase === 'undefined') return;
        const unsub = firebase.firestore().collection('redeem_history').where('userId', '==', user.uid).onSnapshot((snap: any) => {
            const data = snap.docs.map((d: any) => d.data());
            data.sort((a: any, b: any) => {
                const timeA = a.redeemedAt?.toMillis?.() || 0;
                const timeB = b.redeemedAt?.toMillis?.() || 0;
                return timeB - timeA;
            });
            setHistory(data);
        }, (err: any) => console.error("History snap error:", err));
        return unsub;
    }, [user]);
    
    if (!user) return <div className="text-center py-20 font-black uppercase text-gray-300">{t('login_register')}</div>;
    
    return (
        <div className="max-w-4xl mx-auto space-y-10 py-12 pb-24">
            <h1 className="text-3xl font-black italic uppercase text-[#2c3e50] tracking-tighter">{t('history')}</h1>
            <div className="space-y-4">
                <h2 className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-2">{t('redemptions')}</h2>
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
                {history.length === 0 && <div className="text-center py-10 text-gray-300 font-black uppercase italic bg-white rounded-2xl border">...</div>}
            </div>
        </div>
    );
};

const AuthModal: React.FC<{onClose: () => void, t: any}> = ({onClose, t}) => {
    const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
    const [data, setData] = useState({ email: '', password: '', name: '', birthdate: '', phone: '', address: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (typeof firebase === 'undefined') return;
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            if (mode === 'login') {
                await firebase.auth().signInWithEmailAndPassword(data.email, data.password);
                onClose();
            } else if (mode === 'forgot') {
                await firebase.auth().sendPasswordResetEmail(data.email);
                setSuccess(t('reset_link_sent'));
                setTimeout(() => setMode('login'), 3000);
            } else {
                if (!data.email.toLowerCase().endsWith("@moe-dl.edu.my") && data.email !== 'admin@gmail.com') throw new Error("MOE Email Required (@moe-dl.edu.my)");
                
                const birthYear = new Date(data.birthdate).getFullYear();
                const age = new Date().getFullYear() - birthYear;

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
                onClose();
            }
        } catch (err: any) { 
            console.error("Auth error:", err);
            let msg = err.message;
            if (err.code === 'auth/wrong-password') msg = "Incorrect password, please try again.";
            if (err.code === 'auth/user-not-found') msg = "No account found with this email.";
            setError(msg); 
        } finally { 
            setLoading(false); 
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[400] flex items-center justify-center p-4 backdrop-blur-md" onClick={onClose}>
            <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 sm:p-12 shadow-2xl relative animate-in zoom-in duration-300 overflow-y-auto max-h-[95vh]" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-6 right-6 bg-gray-100 hover:bg-red-500 hover:text-white w-10 h-10 rounded-full flex items-center justify-center transition-all group">
                    <i className="fas fa-times text-gray-400 group-hover:text-white"></i>
                </button>

                <h2 className="text-2xl sm:text-3xl font-black text-center uppercase italic text-[#2c3e50] mb-8 tracking-tighter">
                    {mode === 'login' ? t('login') : mode === 'forgot' ? t('reset_password') : t('register')}
                </h2>

                {error && (
                    <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-xl animate-in fade-in slide-in-from-top-1">
                        <p className="text-[10px] font-black uppercase text-red-600 tracking-wider flex items-center gap-2">
                            <i className="fas fa-exclamation-circle"></i> {error}
                        </p>
                    </div>
                )}

                {success && (
                    <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-xl animate-in fade-in slide-in-from-top-1">
                        <p className="text-[10px] font-black uppercase text-green-600 tracking-wider flex items-center gap-2">
                            <i className="fas fa-check-circle"></i> {success}
                        </p>
                    </div>
                )}

                <form onSubmit={submit} className="space-y-4">
                    {mode === 'register' && (
                        <>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('full_name')}</label>
                                <input placeholder="Your Name" value={data.name} onChange={e => setData({...data, name: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl outline-none font-bold text-black text-sm" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('age')}</label>
                                    <input type="date" value={data.birthdate} onChange={e => setData({...data, birthdate: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl outline-none font-bold text-black text-sm" required />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('phone_number')}</label>
                                    <input type="tel" placeholder="012-345..." value={data.phone} onChange={e => setData({...data, phone: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl outline-none font-bold text-black text-sm" required />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('home_address')}</label>
                                <input placeholder="..." value={data.address} onChange={e => setData({...data, address: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl outline-none font-bold text-black text-sm" required />
                            </div>
                        </>
                    )}
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('email_address')}</label>
                        <input type="email" placeholder="email@moe-dl.edu.my" value={data.email} onChange={e => setData({...data, email: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl outline-none font-bold text-black text-sm" required />
                    </div>
                    {mode !== 'forgot' && (
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('password')}</label>
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
                    )}

                    {mode === 'login' && (
                        <div className="flex justify-end">
                            <button 
                                type="button" 
                                onClick={() => setMode('forgot')}
                                className="text-[10px] font-black uppercase text-[#3498db] hover:underline"
                            >
                                {t('forgot_password')}
                            </button>
                        </div>
                    )}

                    <button disabled={loading} className="w-full bg-[#3498db] text-white py-6 rounded-full font-black text-xl shadow-xl hover:scale-105 transition-all mt-6 tracking-widest uppercase">
                        {loading ? '...' : (mode === 'login' ? t('login') : mode === 'forgot' ? t('send') : t('register'))}
                    </button>
                </form>
                
                <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col items-center gap-4">
                    <button 
                        onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setShowPassword(false); setError(null); }} 
                        className="text-xs font-black uppercase text-[#3498db] hover:underline"
                    >
                        {mode === 'login' ? t('register') : t('login')}
                    </button>
                    {mode === 'forgot' && (
                        <button 
                            onClick={() => { setMode('login'); setError(null); }}
                            className="text-xs font-black uppercase text-gray-400 hover:text-[#2c3e50]"
                        >
                            Back to Login
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const RedeemConfirmModal: React.FC<{item: any, user: UserProfile, t: any, onCancel: () => void, onConfirm: (f: string, c: string) => void}> = ({item, t, onCancel, onConfirm}) => {
    const [f, setF] = useState('');
    const [c, setC] = useState('');
    return (
        <div className="fixed inset-0 bg-black/90 z-[500] flex items-center justify-center p-4 backdrop-blur-xl" onClick={onCancel}>
            <div className="bg-white w-full max-w-md rounded-[2rem] p-10 shadow-2xl animate-in zoom-in" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl sm:text-2xl font-black mb-8 italic uppercase text-[#2c3e50] text-center tracking-tighter">{t('confirm_redeem_title')}</h2>
                <form onSubmit={e => { e.preventDefault(); onConfirm(f, c); }} className="space-y-6">
                    <input value={f} onChange={e => setF(e.target.value)} placeholder={t('full_name')} className="w-full bg-gray-50 border-2 border-gray-100 p-5 rounded-2xl font-bold text-black text-sm" required />
                    <input value={c} onChange={e => setC(e.target.value)} placeholder={t('class_label')} className="w-full bg-gray-50 border-2 border-gray-100 p-5 rounded-2xl font-bold text-black text-sm" required />
                    <button type="submit" className="w-full bg-[#3498db] text-white py-6 rounded-full font-black uppercase shadow-xl tracking-widest">{t('confirm')}</button>
                </form>
            </div>
        </div>
    );
};

export default App;
