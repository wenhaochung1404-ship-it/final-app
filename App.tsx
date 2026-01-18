
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Language, UserProfile } from './types';
import { translations } from './translations';

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
    const [user, setUser] = useState<any | null>(null);
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
    const [isLangOpen, setIsLangOpen] = useState(false);
    const [isQuickOfferOpen, setIsQuickOfferOpen] = useState(false);
    const [emailVerified, setEmailVerified] = useState(true);
    
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
            if (typeof firebase === 'undefined' || !firebase.auth) {
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
                        setEmailVerified(!!authUser.emailVerified);
                        db.collection('users').doc(authUser.uid).onSnapshot((doc: any) => {
                            if (doc.exists) {
                                setUser({ ...doc.data(), uid: authUser.uid });
                            } else {
                                setUser({ uid: authUser.uid, email: authUser.email, points: 5 } as any);
                            }
                        }, (err: any) => {});

                        unsubNotifs = db.collection('notifications')
                            .where('userId', '==', authUser.uid)
                            .onSnapshot((snap: any) => {
                                const notifs = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
                                notifs.sort((a: any, b: any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
                                setNotifications(notifs);
                            }, (err: any) => {});
                    } else { 
                        setUser(null); 
                        setNotifications([]);
                        setEmailVerified(true);
                        if (unsubNotifs) unsubNotifs();
                    }
                    setLoading(false);
                }, (err: any) => {
                    setLoading(false);
                });
            } catch (err) {
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
        if (typeof firebase === 'undefined' || !firebase.firestore) return;
        try {
            await firebase.firestore().collection('notifications').doc(notification.id).update({ read: true });
        } catch (e) {}
    };

    const resendVerification = async () => {
        try {
            if (firebase.auth().currentUser) {
                await firebase.auth().currentUser.sendEmailVerification();
                alert("Verification email sent! Please check your inbox.");
            }
        } catch (e: any) {
            alert(e.message);
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
        <div className="min-h-screen flex flex-col bg-[#f8f9fa] font-sans" onClick={() => { setIsLangOpen(false); setIsQuickOfferOpen(false); }}>
            <header className="bg-[#2c3e50] text-white shadow-xl sticky top-0 z-[100] h-16 sm:h-20 flex items-center">
                <div className="container mx-auto px-2 sm:px-4 flex items-center justify-between gap-1 overflow-hidden">
                    <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(true); }} className="p-2 hover:bg-white/10 rounded-xl transition-all flex-shrink-0">
                        <i className="fas fa-bars text-lg sm:text-xl"></i>
                    </button>
                    <div className="flex-grow text-center font-black tracking-tighter cursor-pointer text-[10px] xs:text-[13px] sm:text-lg uppercase whitespace-nowrap overflow-hidden px-1" onClick={() => setPage('home')}>
                        MIRI <span className="text-[#3498db]">CARE</span> CONNECT
                    </div>
                    
                    <div className="flex items-center gap-1 sm:gap-4 flex-shrink-0">
                        {user && (
                            <div className="relative">
                                <button onClick={(e) => { e.stopPropagation(); setIsNotifOpen(true); }} className="p-2 hover:bg-white/10 rounded-full transition-all relative">
                                    <i className="fas fa-bell text-lg"></i>
                                    {unreadCount > 0 && <span className="absolute top-1 right-1 bg-red-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-black border-2 border-[#2c3e50]">{unreadCount}</span>}
                                </button>
                            </div>
                        )}
                        {user && <div className="flex items-center bg-[#f39c12] px-2 sm:px-4 py-1 rounded-full text-[8px] sm:text-xs font-black shadow-lg whitespace-nowrap"><i className="fas fa-star mr-1 sm:mr-2"></i> {user.points} <span className="ml-0.5">{t('points')}</span></div>}
                        {user ? (
                            <button onClick={() => firebase.auth().signOut()} className="bg-red-500 hover:bg-red-600 text-white px-2 sm:px-4 py-1.5 rounded-full text-[8px] sm:text-[10px] font-black uppercase shadow-lg flex items-center gap-1 whitespace-nowrap">
                                <i className="fas fa-sign-out-alt"></i> <span>{t('logout')}</span>
                            </button>
                        ) : (
                            <button onClick={(e) => { e.stopPropagation(); setIsAuthModalOpen(true); }} className="bg-[#3498db] hover:bg-blue-600 px-3 py-1.5 rounded-full text-[8px] sm:text-[10px] font-black uppercase shadow-lg">{t('login')}</button>
                        )}
                    </div>
                </div>
            </header>

            {!emailVerified && user && (
                <div className="bg-amber-500 text-white p-2 text-center text-[10px] font-black uppercase tracking-widest animate-pulse">
                    Please verify your email address to access all features. 
                    <button onClick={resendVerification} className="ml-4 underline hover:text-black">Resend Link</button>
                </div>
            )}

            <div className="flex flex-1 overflow-hidden relative">
                {isAdmin && (
                    <button onClick={() => setShowAdminPanel(!showAdminPanel)} className="fixed right-4 top-1/4 z-[110] bg-[#2c3e50] text-white w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-2xl flex flex-col items-center justify-center hover:scale-110 active:scale-95 transition-all group border-4 border-white">
                        <i className={`fas fa-${showAdminPanel ? 'times' : 'user-shield'} text-lg sm:text-xl`}></i>
                        <span className="text-[6px] sm:text-[7px] font-black uppercase mt-1">{t('admin_panel')}</span>
                    </button>
                )}

                <div className="fixed right-6 bottom-6 z-[200] flex flex-col items-end gap-3 sm:gap-4">
                    {showSupportChat && (
                        <div className="w-[85vw] sm:w-80 h-[450px] bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 mb-2 origin-bottom-right" onClick={(e) => e.stopPropagation()}>
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
                        <button 
                            onClick={(e) => { e.stopPropagation(); if(user) setIsQuickOfferOpen(true); else setIsAuthModalOpen(true); }}
                            className="bg-[#2ecc71] text-white w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all border-4 border-gray-50"
                            title={t('quick_offer')}
                        >
                            <i className="fas fa-plus text-xl sm:text-2xl"></i>
                        </button>

                        <div className="relative">
                            <button 
                                onClick={(e) => { e.stopPropagation(); setIsLangOpen(!isLangOpen); }}
                                className="bg-white text-[#2c3e50] w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all border-4 border-gray-50"
                            >
                                <i className="fas fa-language text-xl sm:text-2xl"></i>
                            </button>
                            {isLangOpen && (
                                <div className="absolute bottom-full right-0 mb-3 bg-white shadow-2xl rounded-2xl border border-gray-100 overflow-hidden z-[210] min-w-[140px] animate-in slide-in-from-bottom-2">
                                    {(Object.values(Language) as Language[]).map(l => (
                                        <button 
                                            key={l}
                                            onClick={() => { setLang(l); setIsLangOpen(false); }}
                                            className={`w-full px-5 py-3 text-left text-[10px] font-black uppercase transition-colors hover:bg-gray-50 ${lang === l ? 'text-[#3498db] bg-blue-50' : 'text-gray-500'}`}
                                        >
                                            {l === Language.EN && 'English'}
                                            {l === Language.BM && 'Bahasa Melayu'}
                                            {l === Language.BC && '中文'}
                                            {l === Language.BI && 'Bahasa Iban'}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button 
                            onClick={(e) => { e.stopPropagation(); setShowSupportChat(!showSupportChat); }}
                            className="bg-[#3498db] text-white w-16 h-16 rounded-full shadow-[0_8px_32px_rgba(52,152,219,0.3)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all border-4 border-white z-[201]"
                        >
                            <i className="fas fa-comment-dots text-3xl"></i>
                        </button>
                    </div>
                </div>

                <main className={`flex-1 overflow-y-auto transition-all duration-300 ${isAdmin && showAdminPanel ? 'lg:mr-96' : ''}`}>
                    <div className="container mx-auto px-4 py-8 max-w-6xl">
                        {page === 'home' && <HomePage t={t} user={user} />}
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
                <div className="p-8 flex flex-col h-full" onClick={(e) => e.stopPropagation()}>
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
                        <MenuItem icon="user" label={t('profile')} onClick={() => { setPage('profile'); setIsMenuOpen(false); }} active={page === 'profile'} />
                        <MenuItem icon="shopping-cart" label={t('points_shop')} onClick={() => { setPage('shop'); setIsMenuOpen(false); }} active={page === 'shop'} />
                        <MenuItem icon="history" label={t('history')} onClick={() => { setPage('history'); setIsMenuOpen(false); }} active={page === 'history'} />
                    </nav>
                </div>
            </aside>
            {isMenuOpen && <div className="fixed inset-0 bg-black/50 z-[300]" onClick={() => setIsMenuOpen(false)}></div>}

            {isNotifOpen && (
                <div className="fixed inset-0 bg-black/80 z-[600] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsNotifOpen(false)}>
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300 max-h-[80vh]" onClick={e => e.stopPropagation()}>
                        <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
                            <h3 className="font-black uppercase text-sm italic text-[#2c3e50] tracking-tighter">Activity Logs</h3>
                            <button onClick={() => setIsNotifOpen(false)} className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"><i className="fas fa-times text-xs"></i></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {notifications.length === 0 ? (
                                <div className="py-20 text-center flex flex-col items-center gap-4">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-300"><i className="fas fa-bell-slash text-2xl"></i></div>
                                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Nothing here yet.</p>
                                </div>
                            ) : (
                                notifications.map(n => (
                                    <div key={n.id} onClick={() => markNotifRead(n)} className={`p-5 rounded-3xl border transition-all ${!n.read ? 'bg-blue-50/50 border-blue-100 ring-1 ring-blue-100' : 'bg-white border-gray-100'}`}>
                                        <div className="flex gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white text-[14px] shrink-0 shadow-sm ${n.type === 'offer' ? 'bg-green-500' : n.type === 'message' ? 'bg-blue-500' : 'bg-[#f39c12]'}`}>
                                                <i className={`fas fa-${n.type === 'offer' ? 'hand-holding-heart' : n.type === 'message' ? 'comment' : 'star'}`}></i>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-[11px] font-black text-gray-800 uppercase tracking-tighter">{n.title}</p>
                                                <p className="text-[10px] text-gray-500 font-medium">{n.message}</p>
                                                <div className="mt-2 text-[8px] font-black text-gray-400 uppercase">{n.createdAt?.toDate?.() ? n.createdAt.toDate().toLocaleString() : 'Recent'}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {isAuthModalOpen && <AuthModal onClose={() => setIsAuthModalOpen(false)} t={t} lang={lang} />}
            
            {isQuickOfferOpen && user && (
                <div className="fixed inset-0 bg-black/80 z-[600] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsQuickOfferOpen(false)}>
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in relative" onClick={e => e.stopPropagation()}>
                         <button onClick={() => setIsQuickOfferOpen(false)} className="absolute top-6 right-6 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-all z-10">
                            <i className="fas fa-times"></i>
                         </button>
                         <QuickOfferModalContent user={user} t={t} onComplete={() => setIsQuickOfferOpen(false)} />
                    </div>
                </div>
            )}

            {itemToRedeem && (
                <RedeemConfirmModal 
                    item={itemToRedeem} user={user!} t={t} onCancel={() => setItemToRedeem(null)} 
                    onConfirm={async (fullName, userClass) => {
                        if (typeof firebase === 'undefined' || !firebase.firestore) return;
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

const QuickOfferModalContent: React.FC<{user: any, t: any, onComplete: () => void}> = ({user, t, onComplete}) => {
    const [item, setItem] = useState({ itemName: '', category: translations[Language.EN]['category_food'], qty: 1 });
    const [posting, setPosting] = useState(false);

    const handlePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (typeof firebase === 'undefined' || !firebase.firestore || !user) return;
        setPosting(true);
        try {
            const db = firebase.firestore();
            await db.collection('donations').add({
                ...item, 
                createdAt: firebase.firestore.FieldValue.serverTimestamp(), 
                userId: user.uid, 
                donorName: user.displayName || 'Donor',
                userClass: user.userClass || 'N/A'
            });

            const adminQuery = await db.collection('users').where('isAdmin', '==', true).get();
            adminQuery.forEach(async (adminDoc: any) => {
                await db.collection('notifications').add({
                    userId: adminDoc.id,
                    title: `New Offer: ${item.itemName}`,
                    message: `${user.displayName} from ${user.userClass || 'unknown class'} has offered an item.`,
                    type: 'offer', read: false, createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });

            alert("Offer Posted Successfully!");
            onComplete();
        } catch (err) { 
            alert("Failed to post offer."); 
        } finally { 
            setPosting(false); 
        }
    };

    return (
        <div className="pt-4">
            <h2 className="text-3xl font-black text-[#2c3e50] mb-8 uppercase italic">{t('offer_help')}</h2>
            <form onSubmit={handlePost} className="space-y-6">
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('item_name')}</label>
                    <input value={item.itemName} onChange={e => setItem({...item, itemName: e.target.value})} className="w-full p-4 rounded-2xl border-2 outline-none font-bold" required placeholder={t('item_name')} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('status')}</label>
                        <select value={item.category} onChange={e => setItem({...item, category: e.target.value})} className="w-full p-4 rounded-2xl border-2 outline-none font-bold">
                            <option>{t('category_food')}</option>
                            <option>{t('category_clothing')}</option>
                            <option>{t('category_books')}</option>
                            <option>{t('category_furniture')}</option>
                            <option>{t('category_toiletries')}</option>
                            <option>{t('category_others')}</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('quantity')}</label>
                        <input type="number" value={item.qty} min="1" onChange={e => setItem({...item, qty: Number(e.target.value)})} className="w-full p-4 rounded-2xl border-2 outline-none font-bold" required />
                    </div>
                </div>
                <button type="submit" disabled={posting} className="w-full bg-[#3498db] text-white py-5 rounded-2xl font-black text-xl shadow-xl uppercase transition-transform active:scale-95">
                    {posting ? '...' : t('post_offer')}
                </button>
            </form>
        </div>
    );
};

const SupportChatBody: React.FC<{userId: string, userName: string, t: any, isGuest: boolean}> = ({userId, userName, t, isGuest}) => {
    const [msgs, setMsgs] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!userId || typeof firebase === 'undefined' || !firebase.firestore) return;
        const db = firebase.firestore();
        const unsub = db.collection('support_chats')
            .where('userId', '==', userId)
            .onSnapshot((snap: any) => {
                const data = snap.docs.map((d: any) => d.data());
                data.sort((a: any, b: any) => (a.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
                setMsgs(data);
            }, (err: any) => {});
        return unsub;
    }, [userId]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [msgs]);

    const send = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !userId || typeof firebase === 'undefined' || !firebase.firestore) return;
        const msgText = input;
        setInput('');
        await firebase.firestore().collection('support_chats').add({
            userId, userName: userName || 'Guest', text: msgText, sender: 'user', isGuest,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    };

    return (
        <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {msgs.map((m, i) => (
                    <div key={i} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-xs font-bold ${m.sender === 'user' ? 'bg-[#3498db] text-white' : 'bg-[#2c3e50] text-white'}`}>
                            {m.text}
                        </div>
                    </div>
                ))}
            </div>
            <form onSubmit={send} className="p-4 bg-white border-t flex gap-2">
                <input value={input} onChange={e => setInput(e.target.value)} placeholder={t('type_message')} className="flex-1 bg-gray-100 p-3 rounded-2xl text-xs font-bold outline-none border-2 border-transparent focus:border-[#3498db] transition-all" />
                <button className="bg-[#3498db] text-white w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"><i className="fas fa-paper-plane text-xs"></i></button>
            </form>
        </div>
    );
};

const HomePage: React.FC<{t: any, user: any | null}> = ({t, user}) => {
    const [donations, setDonations] = useState<any[]>([]);
    const [announcement, setAnnouncement] = useState<{text: string, updatedAt: any}>({text: '', updatedAt: null});
    const [isEditingAnnounce, setIsEditingAnnounce] = useState(false);
    const [announceInput, setAnnounceInput] = useState('');

    useEffect(() => {
        if (typeof firebase === 'undefined' || !firebase.firestore) return;
        const db = firebase.firestore();
        const unsubDonations = db.collection('donations').orderBy('createdAt', 'desc').onSnapshot((snap: any) => {
            setDonations(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
        }, (err: any) => {});
        const unsubAnnounce = db.collection('settings').doc('announcement').onSnapshot((doc: any) => {
            if (doc.exists) {
                const data = doc.data();
                setAnnouncement(data);
                setAnnounceInput(data.text);
            }
        }, (err: any) => {});
        return () => { unsubDonations(); unsubAnnounce(); };
    }, []);

    const saveAnnouncement = async () => {
        if (typeof firebase === 'undefined' || !firebase.firestore) return;
        await firebase.firestore().collection('settings').doc('announcement').set({
            text: announceInput, updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        setIsEditingAnnounce(false);
    };

    const handleConfirmReceived = async (donation: any) => {
        if (!user || (!user.isAdmin && user.email !== 'admin@gmail.com') || typeof firebase === 'undefined' || !firebase.firestore) return;
        const itemQty = donation.qty || 1;
        const pointsToEarn = itemQty * 5;
        const confirmResult = window.confirm(`Confirm receipt? Donor offered ${itemQty} item(s) and will earn ${pointsToEarn} points.`);
        if (!confirmResult) return;
        const db = firebase.firestore();
        try {
            const donorRef = db.collection('users').doc(donation.userId);
            await db.runTransaction(async (transaction: any) => {
                const donorDoc = await transaction.get(donorRef);
                const currentPoints = donorDoc.exists ? (donorDoc.data().points || 0) : 0;
                transaction.update(donorRef, { points: currentPoints + pointsToEarn });
                transaction.set(db.collection('completed_donations').doc(donation.id), {
                    ...donation, completedAt: firebase.firestore.FieldValue.serverTimestamp(), confirmedBy: user.uid, earnedPoints: pointsToEarn
                });
                transaction.delete(db.collection('donations').doc(donation.id));
            });
            await db.collection('notifications').add({
                userId: donation.userId,
                title: `You earned ${pointsToEarn} points!`,
                message: `Thank you for offering ${itemQty} ${donation.itemName}. Your kindness matters!`,
                type: 'status', read: false, createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            alert("Confirmed!");
        } catch (err) {}
    };

    const isAdmin = user?.isAdmin || user?.email === 'admin@gmail.com';

    return (
        <div className="space-y-12 pb-24">
            {user === null && (
                <section className="bg-[#2c3e50] text-white rounded-[2.5rem] p-12 text-center shadow-2xl border-b-8 border-[#3498db]">
                    <h1 className="text-3xl sm:text-6xl font-black mb-6 italic uppercase tracking-tighter">{t('hero_title')}</h1>
                    <p className="text-sm sm:text-lg opacity-80 font-bold uppercase">{t('hero_description')}</p>
                </section>
            )}
            <div className="max-w-6xl mx-auto space-y-10">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest">{t('announcements')}</h3>
                        {isAdmin && <button onClick={() => setIsEditingAnnounce(!isEditingAnnounce)} className="text-[10px] font-black uppercase text-[#3498db]">{isEditingAnnounce ? t('cancel') : t('update')}</button>}
                    </div>
                    <div className="bg-white rounded-[2rem] border p-6 shadow-sm overflow-hidden">
                        {isEditingAnnounce ? (
                            <div className="space-y-4">
                                <textarea 
                                    value={announceInput} 
                                    onChange={e => setAnnounceInput(e.target.value)} 
                                    className="w-full min-h-[120px] p-4 bg-gray-50 rounded-xl outline-none font-bold text-sm resize-y" 
                                />
                                <button onClick={saveAnnouncement} className="bg-[#2c3e50] text-white px-8 py-2 rounded-lg font-black uppercase text-[10px]">{t('publish')}</button>
                            </div>
                        ) : (
                            <div className="flex items-start gap-4">
                                <i className="fas fa-bullhorn text-[#3498db] mt-1"></i>
                                <p className="text-sm font-bold text-[#2c3e50] whitespace-pre-wrap flex-1">
                                    {announcement.text || "No announcements today."}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
                <div className="space-y-6">
                    <h2 className="text-lg font-black text-[#2c3e50] uppercase tracking-tight">{t('offer_help')}</h2>
                    {donations.length === 0 ? (
                        <div className="bg-white p-12 rounded-3xl border-4 border-dashed border-gray-100 text-center flex flex-col items-center gap-6">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-[#3498db] text-3xl">
                                <i className="fas fa-hand-holding-heart"></i>
                            </div>
                            <p className="text-[#2c3e50] font-black text-xl italic uppercase tracking-tighter max-w-md mx-auto">
                                {t('empty_offers_msg')}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {donations.map(item => (
                                <div key={item.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col group">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-xl font-black text-[#2c3e50]">{item.itemName}</h3>
                                        <div className="bg-blue-50 text-[#3498db] px-3 py-1 rounded-full text-[10px] font-black">{t('quantity')}: {item.qty}</div>
                                    </div>
                                    <div className="mb-4 flex flex-wrap gap-2">
                                        <span className="bg-gray-50 text-gray-400 px-3 py-1 rounded-md text-[10px] font-black uppercase">{item.category}</span>
                                        {item.createdAt && (
                                            <span className="bg-gray-50 text-gray-400 px-3 py-1 rounded-md text-[10px] font-black uppercase">
                                                <i className="far fa-calendar-alt mr-1"></i> {item.createdAt.toDate?.() ? item.createdAt.toDate().toLocaleDateString() : 'Today'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="space-y-2 flex-1 mb-6 text-gray-400 font-bold text-sm">
                                        <div><i className="far fa-user mr-2"></i>{item.donorName}</div>
                                        {item.userClass && <div className="text-[10px]"><i className="fas fa-school mr-2"></i>{item.userClass}</div>}
                                    </div>
                                    {isAdmin && (
                                        <button onClick={() => handleConfirmReceived(item)} className="w-full bg-[#2ecc71] hover:bg-[#27ae60] text-white py-3 rounded-xl text-xs font-black uppercase shadow-md transition-all">
                                            <i className="fas fa-check-circle mr-2"></i> {t('confirm')}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const AdminPanelContent: React.FC<{t: any, user: any | null}> = ({t, user}) => {
    const [activeTab, setActiveTab] = useState<'users' | 'items' | 'vouchers' | 'chats'>('users');
    const [data, setData] = useState<{users: any[], items: any[], redemptions: any[], completedItems: any[], supportChats: any[]}>({users: [], items: [], redemptions: [], completedItems: [], supportChats: []});
    const [searchQuery, setSearchQuery] = useState('');
    const [editingUser, setEditingUser] = useState<any>(null);
    const [activeSupportUser, setActiveSupportUser] = useState<any>(null);
    const [adminReply, setAdminReply] = useState('');
    const [selectedOffer, setSelectedOffer] = useState<any>(null);

    useEffect(() => {
        if (typeof firebase === 'undefined' || !firebase.firestore) return;
        const db = firebase.firestore();
        const unsubUsers = db.collection('users').onSnapshot((snap: any) => setData(prev => ({...prev, users: snap.docs.map((d: any) => ({...d.data(), uid: d.id}))})), (err: any) => {});
        const unsubItems = db.collection('donations').onSnapshot((snap: any) => setData(prev => ({...prev, items: snap.docs.map((d: any) => ({...d.data(), id: d.id}))})), (err: any) => {});
        const unsubCompleted = db.collection('completed_donations').onSnapshot((snap: any) => setData(prev => ({...prev, completedItems: snap.docs.map((d: any) => ({...d.data(), id: d.id}))})), (err: any) => {});
        const unsubRedemptions = db.collection('redeem_history').orderBy('redeemedAt', 'desc').onSnapshot((snap: any) => setData(prev => ({...prev, redemptions: snap.docs.map((d: any) => ({...d.data(), id: d.id}))})), (err: any) => {});
        
        const unsubSupport = db.collection('support_chats').onSnapshot((snap: any) => {
            const rawDocs = snap.docs.map((d: any) => d.data());
            const grouped: any[] = [];
            const seen = new Set();
            rawDocs.sort((a: any, b: any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
            rawDocs.forEach((doc: any) => {
                if (!seen.has(doc.userId)) {
                    grouped.push({ userId: doc.userId, userName: doc.userName, lastMsg: doc.text, isGuest: doc.isGuest });
                    seen.add(doc.userId);
                }
            });
            setData(prev => ({...prev, supportChats: grouped}));
        }, (err: any) => {});

        return () => { unsubUsers(); unsubItems(); unsubCompleted(); unsubRedemptions(); unsubSupport(); };
    }, []);

    const filteredUsers = useMemo(() => {
        if (!searchQuery) return data.users;
        const q = searchQuery.toLowerCase();
        return data.users.filter(u => 
            u.displayName?.toLowerCase().includes(q) || 
            u.email?.toLowerCase().includes(q) ||
            u.userClass?.toLowerCase().includes(q)
        );
    }, [data.users, searchQuery]);

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (typeof firebase === 'undefined' || !firebase.firestore) return;
        try {
            await firebase.firestore().collection('users').doc(editingUser.uid).update({
                displayName: editingUser.displayName,
                points: Number(editingUser.points),
                phone: editingUser.phone || '',
                address: editingUser.address || '',
                birthdate: editingUser.birthdate || '',
                userClass: editingUser.userClass || ''
            });
            alert("User updated successfully");
            setEditingUser(null);
        } catch (err) {}
    };

    const sendAdminReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!adminReply.trim() || !activeSupportUser || typeof firebase === 'undefined' || !firebase.firestore) return;
        const text = adminReply;
        setAdminReply('');
        await firebase.firestore().collection('support_chats').add({
            userId: activeSupportUser.userId,
            userName: activeSupportUser.userName,
            text, sender: 'admin',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    };

    const approveOffer = async (offer: any) => {
        if (typeof firebase === 'undefined' || !firebase.firestore) return;
        const itemQty = offer.qty || 1;
        const pointsToEarn = itemQty * 5;
        const db = firebase.firestore();
        try {
            const donorRef = db.collection('users').doc(offer.userId);
            await db.runTransaction(async (transaction: any) => {
                const donorDoc = await transaction.get(donorRef);
                const currentPoints = donorDoc.exists ? (donorDoc.data().points || 0) : 0;
                transaction.update(donorRef, { points: currentPoints + pointsToEarn });
                transaction.set(db.collection('completed_donations').doc(offer.id), {
                    ...offer, completedAt: firebase.firestore.FieldValue.serverTimestamp(), confirmedBy: user.uid, earnedPoints: pointsToEarn
                });
                transaction.delete(db.collection('donations').doc(offer.id));
            });
            await db.collection('notifications').add({
                userId: offer.userId,
                title: `Offer Approved: ${offer.itemName}`,
                message: `Your donation was verified. You earned ${pointsToEarn} points!`,
                type: 'status', read: false, createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            alert("Approved!");
            setSelectedOffer(null);
        } catch (err) {}
    };

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 overflow-hidden bg-white">
            <h2 className="text-xl font-black italic uppercase text-[#2c3e50] mb-6 border-b-4 border-[#3498db] pb-2 inline-block">Admin</h2>
            <div className="flex flex-wrap gap-1 mb-6">
                <button onClick={() => { setActiveTab('users'); setEditingUser(null); setActiveSupportUser(null); setSelectedOffer(null); }} className={`flex-1 min-w-[60px] py-2 rounded-xl text-[7px] font-black uppercase ${activeTab === 'users' ? 'bg-[#2c3e50] text-white' : 'bg-gray-100'}`}>{t('users')}</button>
                <button onClick={() => { setActiveTab('items'); setEditingUser(null); setActiveSupportUser(null); setSelectedOffer(null); }} className={`flex-1 min-w-[60px] py-2 rounded-xl text-[7px] font-black uppercase ${activeTab === 'items' ? 'bg-[#2c3e50] text-white' : 'bg-gray-100'}`}>{t('offers')}</button>
                <button onClick={() => { setActiveTab('vouchers'); setEditingUser(null); setActiveSupportUser(null); setSelectedOffer(null); }} className={`flex-1 min-w-[60px] py-2 rounded-xl text-[7px] font-black uppercase ${activeTab === 'vouchers' ? 'bg-[#2c3e50] text-white' : 'bg-gray-100'}`}>{t('vouchers')}</button>
                <button onClick={() => { setActiveTab('chats'); setEditingUser(null); setActiveSupportUser(null); setSelectedOffer(null); }} className={`flex-1 min-w-[60px] py-2 rounded-xl text-[7px] font-black uppercase ${activeTab === 'chats' ? 'bg-[#2c3e50] text-white' : 'bg-gray-100'}`}>{t('support')}</button>
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
                                <AdminInput label={t('birthdate')} value={editingUser.birthdate} onChange={v => setEditingUser({...editingUser, birthdate: v})} />
                                <AdminInput label={t('class_label')} value={editingUser.userClass} onChange={v => setEditingUser({...editingUser, userClass: v})} />
                                <div className="flex gap-2">
                                    <button type="submit" className="flex-1 bg-[#2ecc71] text-white py-2 rounded-lg font-black text-[10px] uppercase">{t('save')}</button>
                                    <button type="button" onClick={() => setEditingUser(null)} className="flex-1 bg-gray-200 text-gray-600 py-2 rounded-lg font-black text-[10px] uppercase">{t('cancel')}</button>
                                </div>
                            </form>
                        ) : (
                            <>
                                <input placeholder={t('search_placeholder')} className="w-full bg-gray-50 border p-3 rounded-xl text-xs font-bold outline-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                                {filteredUsers.map(u => (
                                    <div key={u.uid} className="bg-white p-3 border rounded-xl flex justify-between items-center group">
                                        <div>
                                            <div className="font-black text-[10px] uppercase">{u.displayName}</div>
                                            <div className="text-[9px] text-gray-400">{u.points} Points • {u.email}</div>
                                        </div>
                                        <button onClick={() => setEditingUser(u)} className="text-[#3498db] opacity-0 group-hover:opacity-100 transition-opacity"><i className="fas fa-edit"></i></button>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'items' && (
                    selectedOffer ? (
                        <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100 space-y-5 animate-in slide-in-from-right-2">
                            <button onClick={() => setSelectedOffer(null)} className="text-[10px] font-black uppercase text-gray-400 hover:text-[#2c3e50] transition-colors flex items-center gap-2">
                                <i className="fas fa-arrow-left"></i> {t('back_to_list')}
                            </button>
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-xl font-black uppercase italic text-[#2c3e50] leading-tight">{selectedOffer.itemName}</h3>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="bg-[#3498db] text-white px-3 py-1 rounded-full text-[10px] font-black uppercase">{t('quantity')}: {selectedOffer.qty}</span>
                                        <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-[10px] font-black uppercase">{selectedOffer.category}</span>
                                    </div>
                                </div>
                                <div className="space-y-4 pt-4 border-t border-gray-200">
                                    <div>
                                        <p className="text-[8px] font-black uppercase text-gray-400 tracking-widest mb-1">{t('donor_details')}</p>
                                        <div className="bg-white p-3 rounded-2xl border border-gray-100">
                                            <p className="text-sm font-bold text-[#2c3e50]">{selectedOffer.donorName}</p>
                                            <p className="text-[10px] font-bold text-[#3498db] uppercase">{selectedOffer.userClass || 'No Class Info'}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black uppercase text-gray-400 tracking-widest mb-1">{t('status')}</p>
                                        <p className="text-[10px] font-black uppercase italic text-[#f39c12]">
                                            {data.completedItems.find(c => c.id === selectedOffer.id) ? t('verified_completed') : t('pending_approval')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            {!data.completedItems.find(c => c.id === selectedOffer.id) && (
                                <button onClick={() => approveOffer(selectedOffer)} className="w-full bg-[#2ecc71] hover:bg-[#27ae60] text-white py-4 rounded-2xl font-black uppercase text-xs shadow-xl shadow-green-100 transition-all active:scale-95">
                                    <i className="fas fa-check-circle mr-2"></i> {t('approve_award')}
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest flex items-center gap-2 px-1">
                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> {t('pending_approval')}
                                </h3>
                                {data.items.length === 0 ? <p className="text-[10px] text-gray-300 italic px-1">No pending offers.</p> : data.items.map(i => (
                                    <div key={i.id} onClick={() => setSelectedOffer(i)} className="bg-white p-4 border border-gray-100 rounded-2xl mb-2 flex justify-between items-center cursor-pointer hover:border-[#3498db] hover:shadow-md transition-all group">
                                        <div className="flex-1">
                                            <div className="font-black text-xs uppercase text-[#2c3e50]">{i.itemName}</div>
                                            <div className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Donor: {i.donorName} ({i.userClass}) • Qty: {i.qty}</div>
                                        </div>
                                        <i className="fas fa-chevron-right text-gray-200 group-hover:text-[#3498db] transition-colors"></i>
                                    </div>
                                ))}
                            </div>
                            <div>
                                <h3 className="text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest flex items-center gap-2 px-1">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span> {t('verified')}
                                </h3>
                                {data.completedItems.length === 0 ? <p className="text-[10px] text-gray-300 italic px-1">No approved offers.</p> : data.completedItems.map(i => (
                                    <div key={i.id} onClick={() => setSelectedOffer(i)} className="bg-white p-4 border border-green-50 rounded-2xl mb-2 flex justify-between items-center opacity-70 cursor-pointer hover:opacity-100 hover:border-green-200 transition-all group">
                                        <div className="flex-1">
                                            <div className="font-black text-xs uppercase text-[#2c3e50]">{i.itemName}</div>
                                            <div className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Donor: {i.donorName} ({i.userClass})</div>
                                        </div>
                                        <div className="text-green-500 font-black text-[9px] uppercase italic">{t('verified')}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                )}

                {activeTab === 'vouchers' && data.redemptions.map(r => (
                    <div key={r.id} className="bg-white p-4 border-2 border-orange-50 rounded-2xl">
                        <div className="font-black text-[11px] text-[#f39c12] uppercase">{r.itemName}</div>
                        <div className="text-[10px] font-bold text-gray-700 uppercase">User: {r.fullName}</div>
                        <div className="text-[9px] font-black text-[#3498db] uppercase">Class: {r.userClass}</div>
                    </div>
                ))}

                {activeTab === 'chats' && (
                    activeSupportUser ? (
                        <div className="flex flex-col h-full space-y-4">
                            <button onClick={() => setActiveSupportUser(null)} className="text-[10px] font-black uppercase text-gray-400 hover:text-[#2c3e50] transition-colors"><i className="fas fa-arrow-left mr-2"></i> Back to inbox</button>
                            <div className="flex-1 h-[300px] overflow-y-auto bg-gray-50 rounded-xl p-3 space-y-2">
                                <AdminChatLogWindow userId={activeSupportUser.userId} />
                            </div>
                            <form onSubmit={sendAdminReply} className="flex gap-2">
                                <input value={adminReply} onChange={e => setAdminReply(e.target.value)} placeholder="Type official response..." className="flex-1 bg-gray-100 p-2 rounded-xl text-xs font-bold border outline-none focus:border-[#2c3e50] transition-all" />
                                <button className="bg-[#2c3e50] text-white px-4 rounded-xl text-[10px] font-black hover:bg-black transition-colors">{t('send')}</button>
                            </form>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {data.supportChats.length === 0 ? <p className="text-[10px] text-gray-300 italic px-1">No support chats found.</p> : data.supportChats.map(s => (
                                <div key={s.userId} onClick={() => setActiveSupportUser(s)} className="bg-white p-4 border border-gray-100 rounded-2xl cursor-pointer hover:border-[#3498db] hover:shadow-md transition-all">
                                    <div className="font-black text-[11px] uppercase text-[#2c3e50]">{s.userName}</div>
                                    <div className="text-[10px] text-gray-400 truncate italic mt-1 font-medium">"{s.lastMsg}"</div>
                                </div>
                            ))}
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

const AdminChatLogWindow: React.FC<{userId: string}> = ({userId}) => {
    const [msgs, setMsgs] = useState<any[]>([]);
    useEffect(() => {
        if (!userId || typeof firebase === 'undefined' || !firebase.firestore) return;
        const unsub = firebase.firestore().collection('support_chats').where('userId', '==', userId).onSnapshot((snap: any) => {
            const data = snap.docs.map((d: any) => d.data());
            data.sort((a: any, b: any) => (a.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
            setMsgs(data);
        }, (err: any) => {});
        return unsub;
    }, [userId]);

    return (
        <>
            {msgs.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.sender === 'user' ? 'items-start' : 'items-end'}`}>
                    <div className={`max-w-[90%] p-2 rounded-xl text-[10px] font-bold ${m.sender === 'user' ? 'bg-white text-[#2c3e50] border shadow-sm' : 'bg-[#2c3e50] text-white'}`}>
                        {m.text}
                    </div>
                </div>
            ))}
        </>
    );
};

const ShopPage: React.FC<{user: any | null, t: any, onAuth: any, onRedeemConfirm: (i: any) => void}> = ({user, t, onAuth, onRedeemConfirm}) => {
    const [shopItems, setShopItems] = useState<any[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [newProduct, setNewProduct] = useState({ name: '', cost: 20, color: '#3498db', id: '' });
    const isAdmin = user?.isAdmin || user?.email === 'admin@gmail.com';

    useEffect(() => {
        if (typeof firebase === 'undefined' || !firebase.firestore) return;
        const db = firebase.firestore();
        const unsub = db.collection('shop_items').orderBy('createdAt', 'desc').onSnapshot((snap: any) => {
            setShopItems(snap.docs.map((d: any) => ({ ...d.data(), id: d.id })));
        }, (err: any) => {});
        return unsub;
    }, []);

    const handleAddOrUpdateProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        if (typeof firebase === 'undefined' || !firebase.firestore) return;
        try {
            const db = firebase.firestore();
            if (newProduct.id) {
                await db.collection('shop_items').doc(newProduct.id).update({
                    name: newProduct.name, cost: newProduct.cost, color: newProduct.color
                });
            } else {
                await db.collection('shop_items').add({
                    name: newProduct.name, cost: newProduct.cost, color: newProduct.color,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            setIsAdding(false);
            setNewProduct({ name: '', cost: 20, color: '#3498db', id: '' });
        } catch (e) {}
    };

    const handleDeleteProduct = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this reward?")) return;
        try {
            await firebase.firestore().collection('shop_items').doc(id).delete();
            alert("Reward deleted!");
        } catch (e) {}
    };

    return (
        <div className="space-y-12 py-12">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-black italic uppercase text-[#2c3e50] tracking-tighter">{t('points_shop')}</h1>
                {isAdmin && (
                    <button onClick={() => { setNewProduct({ name: '', cost: 20, color: '#3498db', id: '' }); setIsAdding(true); }} className="bg-[#2ecc71] text-white px-6 py-2 rounded-full font-black text-[10px] uppercase shadow-lg hover:scale-105 transition-all">
                        <i className="fas fa-plus mr-2"></i> {t('add_reward')}
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="fixed inset-0 bg-black/80 z-[600] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsAdding(false)}>
                    <div className="bg-white w-full max-w-md rounded-[2rem] p-8 shadow-2xl animate-in zoom-in" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-black uppercase italic mb-6">{newProduct.id ? t('edit_content') : t('add_reward')}</h2>
                        <form onSubmit={handleAddOrUpdateProduct} className="space-y-4">
                            <AdminInput label={t('product_name')} value={newProduct.name} onChange={v => setNewProduct({...newProduct, name: v})} placeholder="e.g. Free Coffee" />
                            <AdminInput label={t('point_cost')} type="number" value={newProduct.cost} onChange={v => setNewProduct({...newProduct, cost: v})} />
                            <AdminInput label={t('color_code')} value={newProduct.color} onChange={v => setNewProduct({...newProduct, color: v})} placeholder="#3498db" />
                            <div className="flex gap-2 pt-4">
                                <button type="submit" className="flex-1 bg-[#3498db] text-white py-3 rounded-xl font-black uppercase text-xs">{t('save')}</button>
                                <button type="button" onClick={() => setIsAdding(false)} className="flex-1 bg-gray-100 text-gray-500 py-3 rounded-xl font-black uppercase text-xs">{t('cancel')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {shopItems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {shopItems.map(item => (
                        <div key={item.id} className="bg-white rounded-[2.5rem] border overflow-hidden shadow-xl text-center flex flex-col hover:scale-105 transition-transform">
                            <div className="p-8 flex-1">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl text-[#f39c12]"><i className="fas fa-gift"></i></div>
                                <h3 className="font-black text-lg mb-2 uppercase italic text-[#2c3e50]">{item.name}</h3>
                                <div className="text-2xl font-black text-[#f39c12]">{item.cost} {t('points')}</div>
                            </div>
                            {isAdmin ? (
                                <div className="flex w-full bg-gray-700">
                                    <button onClick={() => { setNewProduct(item); setIsAdding(true); }} className="flex-1 py-6 font-black uppercase text-white tracking-widest text-[11px] hover:bg-gray-800 transition-colors border-r border-white/10">
                                        <i className="fas fa-edit mr-2"></i> {t('edit_content')}
                                    </button>
                                    <button onClick={() => handleDeleteProduct(item.id)} className="px-6 py-6 font-black uppercase text-red-400 tracking-widest text-[11px] hover:bg-red-900/20 transition-colors">
                                        <i className="fas fa-trash"></i> {t('delete')}
                                    </button>
                                </div>
                            ) : (
                                <button onClick={() => user ? onRedeemConfirm(item) : onAuth()} className="w-full py-6 font-black uppercase text-white tracking-widest text-[11px]" style={{backgroundColor: item.color}}>{t('redeem_now')}</button>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-24 text-center border-4 border-dashed border-gray-100 rounded-[3rem]">
                    <i className="fas fa-hourglass-half text-6xl text-gray-100 mb-6"></i>
                    <h2 className="text-4xl font-black text-gray-200 uppercase italic tracking-tighter">Points Shop Coming Soon</h2>
                    <p className="text-gray-300 font-bold uppercase text-xs mt-2">We are currently curating local rewards for you.</p>
                </div>
            )}
        </div>
    );
};

const HistoryPage: React.FC<{user: any | null, t: any, onAuth: any}> = ({user, t, onAuth}) => {
    const [activeHistoryTab, setActiveHistoryTab] = useState<'offers' | 'redeems'>('offers');
    const [offers, setOffers] = useState<any[]>([]);
    const [redeems, setRedeems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditingOffer, setIsEditingOffer] = useState<any>(null);

    useEffect(() => {
        if (!user || typeof firebase === 'undefined' || !firebase.firestore) return;
        const db = firebase.firestore();
        
        const unsubOffers = db.collection('donations').where('userId', '==', user.uid).onSnapshot((snapOffer: any) => {
            const pending = snapOffer.docs.map((d: any) => ({ ...d.data(), type: 'offer_pending', id: d.id }));
            
            const unsubCompleted = db.collection('completed_donations').where('userId', '==', user.uid).onSnapshot((snapComp: any) => {
                const completed = snapComp.docs.map((d: any) => ({ ...d.data(), type: 'offer_completed', id: d.id }));
                const combined = [...pending, ...completed];
                combined.sort((a, b) => ((b.createdAt || b.completedAt)?.toMillis?.() || 0) - ((a.createdAt || a.completedAt)?.toMillis?.() || 0));
                setOffers(combined);
                setLoading(false);
            }, (err: any) => {});
            return unsubCompleted;
        }, (err: any) => {});

        const unsubRedeem = db.collection('redeem_history').where('userId', '==', user.uid).onSnapshot((snap: any) => {
            const data = snap.docs.map((d: any) => ({ ...d.data(), type: 'redeem', id: d.id }));
            data.sort((a: any, b: any) => (b.redeemedAt?.toMillis?.() || 0) - (a.redeemedAt?.toMillis?.() || 0));
            setRedeems(data);
        }, (err: any) => {});

        return () => { unsubOffers(); unsubRedeem(); };
    }, [user]);

    const deleteOffer = async (id: string) => {
        if (typeof firebase === 'undefined' || !firebase.firestore) return;
        if (!window.confirm("Are you sure you want to delete this offer?")) return;
        try {
            await firebase.firestore().collection('donations').doc(id).delete();
            alert("Deleted successfully.");
        } catch (e) {}
    };

    const updateOffer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (typeof firebase === 'undefined' || !firebase.firestore) return;
        try {
            await firebase.firestore().collection('donations').doc(isEditingOffer.id).update({
                itemName: isEditingOffer.itemName,
                qty: Number(isEditingOffer.qty),
                category: isEditingOffer.category
            });
            setIsEditingOffer(null);
            alert("Updated successfully.");
        } catch (e) {}
    };
    
    if (!user) return <div className="text-center py-20 font-black uppercase text-gray-300">{t('login_register')}</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-10 py-12">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                <h1 className="text-4xl font-black italic uppercase text-[#2c3e50] tracking-tighter">{t('my_activity')}</h1>
                <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-gray-100">
                    <button 
                        onClick={() => setActiveHistoryTab('offers')}
                        className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeHistoryTab === 'offers' ? 'bg-[#3498db] text-white shadow-lg' : 'text-gray-400 hover:text-[#2c3e50]'}`}
                    >
                        <i className="fas fa-hand-holding-heart"></i> {t('contributions')}
                    </button>
                    <button 
                        onClick={() => setActiveHistoryTab('redeems')}
                        className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeHistoryTab === 'redeems' ? 'bg-[#3498db] text-white shadow-lg' : 'text-gray-400 hover:text-[#2c3e50]'}`}
                    >
                        <i className="fas fa-gift"></i> {t('rewards')}
                    </button>
                </div>
            </div>

            {isEditingOffer && (
                <div className="fixed inset-0 bg-black/80 z-[600] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsEditingOffer(null)}>
                    <div className="bg-white w-full max-w-md rounded-[2rem] p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-black uppercase mb-6">{t('edit_content')}</h2>
                        <form onSubmit={updateOffer} className="space-y-4">
                            <AdminInput label={t('item_name')} value={isEditingOffer.itemName} onChange={v => setIsEditingOffer({...isEditingOffer, itemName: v})} />
                            <AdminInput label={t('quantity')} type="number" value={isEditingOffer.qty} onChange={v => setIsEditingOffer({...isEditingOffer, qty: v})} />
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{t('status')}</label>
                                <select value={isEditingOffer.category} onChange={e => setIsEditingOffer({...isEditingOffer, category: e.target.value})} className="w-full p-3 bg-white border-2 border-gray-100 rounded-xl font-bold text-sm outline-none">
                                    <option>{t('category_food')}</option>
                                    <option>{t('category_clothing')}</option>
                                    <option>{t('category_books')}</option>
                                    <option>{t('category_furniture')}</option>
                                    <option>{t('category_toiletries')}</option>
                                    <option>{t('category_others')}</option>
                                </select>
                            </div>
                            <div className="flex gap-2 pt-4">
                                <button type="submit" className="flex-1 bg-[#3498db] text-white py-3 rounded-xl font-black uppercase text-xs">{t('update')}</button>
                                <button type="button" onClick={() => setIsEditingOffer(null)} className="flex-1 bg-gray-100 text-gray-500 py-3 rounded-xl font-black uppercase text-xs">{t('cancel')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeHistoryTab === 'offers' ? (
                    offers.length > 0 ? (
                        offers.map((h) => (
                            <div key={h.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between shadow-sm hover:shadow-md transition-shadow group gap-4">
                                <div className="flex items-center gap-6">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl shadow-inner ${h.type === 'offer_pending' ? 'bg-amber-50 text-amber-500' : 'bg-green-50 text-green-500'}`}>
                                        <i className={`fas fa-${h.type === 'offer_pending' ? 'hourglass-half' : 'check-double'}`}></i>
                                    </div>
                                    <div>
                                        <div className="font-black uppercase italic text-[#2c3e50] text-lg leading-tight">{h.itemName} <span className="text-xs opacity-40 ml-1">x{h.qty}</span></div>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">
                                                {h.createdAt?.toDate?.() ? h.createdAt.toDate().toLocaleDateString() : (h.completedAt?.toDate?.() ? h.completedAt.toDate().toLocaleDateString() : 'Recent')}
                                            </span>
                                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${h.type === 'offer_pending' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                                                {h.type === 'offer_pending' ? t('pending_approval') : t('verified')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-6 justify-between sm:justify-end">
                                    {h.type === 'offer_pending' && (
                                        <div className="flex gap-2">
                                            <button onClick={() => setIsEditingOffer(h)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><i className="fas fa-edit"></i></button>
                                            <button onClick={() => deleteOffer(h.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><i className="fas fa-trash"></i></button>
                                        </div>
                                    )}
                                    <div className="text-right flex flex-col items-end min-w-[100px]">
                                        <div className="text-[10px] font-black uppercase text-gray-400 tracking-tighter">{t('points_earned')}</div>
                                        <div className={`font-black text-2xl ${h.type === 'offer_pending' ? 'text-gray-300' : 'text-green-500'}`}>
                                            {h.type === 'offer_pending' ? '--' : `+${h.earnedPoints || '??'}`}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-24 text-center bg-white rounded-[3rem] border border-dashed border-gray-200">
                            <i className="fas fa-seedling text-4xl text-gray-100 mb-4"></i>
                            <p className="font-black uppercase text-xs text-gray-300">You haven't offered any help yet. Start small!</p>
                        </div>
                    )
                ) : (
                    redeems.length > 0 ? (
                        redeems.map((h) => (
                            <div key={h.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow group border-l-8 border-l-[#f39c12]">
                                <div className="flex items-center gap-6">
                                    <div className={`w-14 h-14 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center text-xl shadow-inner`}>
                                        <i className="fas fa-ticket-alt"></i>
                                    </div>
                                    <div>
                                        <div className="font-black uppercase italic text-[#2c3e50] text-lg leading-tight">{h.itemName}</div>
                                        <div className="text-[8px] font-black text-gray-300 uppercase tracking-widest mt-1">
                                            {h.redeemedAt?.toDate?.() ? h.redeemedAt.toDate().toLocaleString() : 'Recent'}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] font-black uppercase text-gray-400 tracking-tighter">{t('points_spent')}</div>
                                    <div className={`font-black text-2xl text-red-500`}>-{h.itemPoints}</div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-24 text-center bg-white rounded-[3rem] border border-dashed border-gray-200">
                            <i className="fas fa-shopping-basket text-4xl text-gray-100 mb-4"></i>
                            <p className="font-black uppercase text-xs text-gray-300">No rewards redeemed yet. Earn more points!</p>
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

const AuthModal: React.FC<{onClose: () => void, t: any, lang: Language}> = ({onClose, t, lang}) => {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [data, setData] = useState({ email: '', password: '', name: '', birthdate: '', phone: '', address: '', userClass: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (typeof firebase === 'undefined' || !firebase.auth) return;
        setLoading(true); setError(null);
        try {
            if (mode === 'login') {
                await firebase.auth().signInWithEmailAndPassword(data.email, data.password);
                onClose();
            } else if (mode === 'register') {
                if (!data.email.toLowerCase().endsWith("@moe-dl.edu.my") && data.email !== 'admin@gmail.com') {
                    throw new Error(lang === Language.BC ? "需要教育邮箱" : "MOE Email Required");
                }
                const {user} = await firebase.auth().createUserWithEmailAndPassword(data.email, data.password);
                
                if (user) {
                    await user.sendEmailVerification();
                    
                    await firebase.firestore().collection('users').doc(user.uid).set({ 
                        email: data.email, displayName: data.name, points: 5, birthdate: data.birthdate, 
                        phone: data.phone, address: data.address, userClass: data.userClass, 
                        isAdmin: data.email === 'admin@gmail.com'
                    });
                    alert("Account created! A verification link has been sent to your email.");
                }
                onClose();
            }
        } catch (err: any) { setError(err.message); } finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[400] flex items-center justify-center p-4 backdrop-blur-md" onClick={onClose}>
            <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative animate-in zoom-in overflow-y-auto max-h-[95vh]" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-6 right-6 bg-gray-100 w-10 h-10 rounded-full flex items-center justify-center transition-all"><i className="fas fa-times text-gray-400"></i></button>
                <h2 className="text-2xl font-black text-center uppercase italic text-[#2c3e50] mb-8">
                    {mode === 'login' ? t('login') : t('register')}
                </h2>
                {error && <div className="mb-6 bg-red-50 p-4 rounded-xl text-red-600 text-[10px] font-black uppercase tracking-wider">{error}</div>}
                <form onSubmit={submit} className="space-y-4">
                    {mode === 'register' && (
                        <>
                            <input placeholder={t('full_name')} value={data.name} onChange={e => setData({...data, name: e.target.value})} className="w-full bg-gray-50 border-2 p-4 rounded-2xl outline-none font-bold text-sm" required />
                            <input placeholder={t('class_label')} value={data.userClass} onChange={e => setData({...data, userClass: e.target.value})} className="w-full bg-gray-50 border-2 p-4 rounded-2xl outline-none font-bold text-sm" required />
                            <input type="date" value={data.birthdate} onChange={e => setData({...data, birthdate: e.target.value})} className="w-full bg-gray-50 border-2 p-4 rounded-2xl outline-none font-bold text-sm" required />
                            <input type="tel" placeholder={t('phone_number')} value={data.phone} onChange={e => setData({...data, phone: e.target.value})} className="w-full bg-gray-50 border-2 p-4 rounded-2xl outline-none font-bold text-sm" required />
                            <input placeholder={t('home_address')} value={data.address} onChange={e => setData({...data, address: e.target.value})} className="w-full bg-gray-50 border-2 p-4 rounded-2xl outline-none font-bold text-sm" required />
                        </>
                    )}
                    <input type="email" placeholder="m-xxxxxxxx@moe-dl.edu.my" value={data.email} onChange={e => setData({...data, email: e.target.value})} className="w-full bg-gray-50 border-2 p-4 rounded-2xl outline-none font-bold text-sm placeholder:text-gray-300" required />
                    
                    <div className="relative">
                        <input type={showPassword ? "text" : "password"} placeholder={t('password')} value={data.password} onChange={e => setData({...data, password: e.target.value})} className="w-full bg-gray-50 border-2 p-4 rounded-2xl outline-none font-bold text-sm" required />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300"><i className={`fas fa-${showPassword ? 'eye-slash' : 'eye'}`}></i></button>
                    </div>
                    
                    <button disabled={loading} className="w-full bg-[#3498db] text-white py-6 rounded-full font-black text-xl shadow-xl hover:scale-105 transition-all mt-6 uppercase tracking-widest">{loading ? '...' : (mode === 'login' ? t('login') : t('register'))}</button>
                </form>
                <div className="mt-6 flex flex-col items-center gap-3">
                    <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-xs font-black uppercase text-[#3498db] hover:underline">{mode === 'login' ? t('register') : t('login')}</button>
                </div>
            </div>
        </div>
    );
};

const RedeemConfirmModal: React.FC<{item: any, user: any, t: any, onCancel: () => void, onConfirm: (f: string, c: string) => void}> = ({item, user, t, onCancel, onConfirm}) => {
    const [f, setF] = useState(user?.displayName || '');
    const [c, setC] = useState(user?.userClass || '');
    return (
        <div className="fixed inset-0 bg-black/90 z-[500] flex items-center justify-center p-4 backdrop-blur-xl" onClick={onCancel}>
            <div className="bg-white w-full max-w-md rounded-[2rem] p-10 shadow-2xl animate-in zoom-in" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-black mb-8 italic uppercase text-[#2c3e50] text-center">{t('confirm')}</h2>
                <form onSubmit={e => { e.preventDefault(); onConfirm(f, c); }} className="space-y-6">
                    <input value={f} onChange={e => setF(e.target.value)} placeholder={t('full_name')} className="w-full bg-gray-50 border-2 p-5 rounded-2xl font-bold text-sm" required />
                    <input value={c} onChange={e => setC(e.target.value)} placeholder={t('class_label')} className="w-full bg-gray-50 border-2 p-5 rounded-2xl font-bold text-sm" required />
                    <button type="submit" className="w-full bg-[#3498db] text-white py-6 rounded-full font-black uppercase shadow-xl tracking-widest mt-4">{t('confirm')}</button>
                </form>
            </div>
        </div>
    );
};

const ProfilePage: React.FC<{user: any | null, t: any, onAuth: any, onNavigate: any}> = ({user, t, onAuth}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user) {
            setEditData({
                displayName: user.displayName || '',
                userClass: user.userClass || '',
                phone: user.phone || '',
                birthdate: user.birthdate || '',
                address: user.address || ''
            });
        }
    }, [user, isEditing]);

    if (!user) return <div className="text-center py-20"><button onClick={onAuth} className="bg-[#3498db] text-white px-12 py-4 rounded-full font-black uppercase shadow-xl">{t('login')}</button></div>;

    const handleSave = async () => {
        if (!editData || !user || typeof firebase === 'undefined' || !firebase.firestore) return;
        setSaving(true);
        try {
            await firebase.firestore().collection('users').doc(user.uid).update(editData);
            setIsEditing(false);
            alert("Profile updated successfully!");
        } catch (err) {
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8 pb-20">
            <div className="bg-[#2c3e50] p-12 rounded-[2rem] shadow-xl text-white text-center border-b-8 border-[#f39c12] relative overflow-hidden">
                <div className="w-20 h-20 bg-[#3498db] rounded-full flex items-center justify-center text-3xl font-black mx-auto mb-6 uppercase border-4 border-white/20 shadow-inner">
                    {user.displayName?.[0] || '?'}
                </div>
                {isEditing ? (
                    <div className="space-y-4 max-w-xs mx-auto">
                        <input 
                            value={editData.displayName} 
                            onChange={e => setEditData({...editData, displayName: e.target.value})}
                            placeholder={t('full_name')}
                            className="w-full bg-white/10 border-2 border-white/20 rounded-xl p-3 text-white font-black uppercase text-center placeholder:text-white/40 outline-none focus:border-[#3498db] transition-all"
                        />
                        <input 
                            value={editData.userClass} 
                            onChange={e => setEditData({...editData, userClass: e.target.value})}
                            placeholder={t('class_label')}
                            className="w-full bg-white/10 border-2 border-white/20 rounded-xl p-3 text-white font-black uppercase text-center placeholder:text-white/40 outline-none focus:border-[#3498db] transition-all"
                        />
                    </div>
                ) : (
                    <>
                        <h1 className="text-2xl font-black uppercase italic mb-2 tracking-tighter">{user.displayName || 'Guest'}</h1>
                        <p className="text-[#f39c12] font-black text-xl flex items-center justify-center gap-2">
                            <i className="fas fa-star"></i> {user.points} {t('points')}
                        </p>
                        {user.userClass && <p className="text-xs font-bold uppercase tracking-widest text-white/60 mt-2">{user.userClass}</p>}
                    </>
                )}
                
                <button 
                    onClick={() => isEditing ? handleSave() : setIsEditing(true)} 
                    disabled={saving}
                    className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all border border-white/10 group"
                >
                    <i className={`fas fa-${isEditing ? (saving ? 'spinner fa-spin' : 'check') : 'pen'} text-xs text-white`}></i>
                </button>
                {isEditing && (
                    <button 
                        onClick={() => setIsEditing(false)} 
                        className="absolute top-6 left-6 w-12 h-12 bg-red-500/20 hover:bg-red-500/40 rounded-full flex items-center justify-center transition-all border border-red-500/20"
                    >
                        <i className="fas fa-times text-xs text-white"></i>
                    </button>
                )}
            </div>

            <div className="bg-white p-8 rounded-[2rem] border shadow-sm space-y-6 relative group border-gray-100">
                <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-50 pb-3">{t('personal_info')}</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('phone_number')}</label>
                        {isEditing ? (
                            <input 
                                value={editData.phone} 
                                onChange={e => setEditData({...editData, phone: e.target.value})}
                                className="w-full p-3 bg-gray-50 border-2 border-gray-100 rounded-xl font-bold text-xs outline-none focus:border-[#3498db]"
                            />
                        ) : (
                            <p className="font-bold text-[#2c3e50] bg-gray-50/50 p-3 rounded-xl border border-transparent">{user.phone || 'Not Set'}</p>
                        )}
                    </div>
                    
                    <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('birthdate')}</label>
                        {isEditing ? (
                            <input 
                                type="date"
                                value={editData.birthdate} 
                                onChange={e => setEditData({...editData, birthdate: e.target.value})}
                                className="w-full p-3 bg-gray-50 border-2 border-gray-100 rounded-xl font-bold text-xs outline-none focus:border-[#3498db]"
                            />
                        ) : (
                            <p className="font-bold text-[#2c3e50] bg-gray-50/50 p-3 rounded-xl border border-transparent">{user.birthdate || 'Not Set'}</p>
                        )}
                    </div>

                    <div className="col-span-1 sm:col-span-2 space-y-1">
                        <label className="text-[8px] font-black uppercase text-gray-400 tracking-widest ml-1">{t('home_address')}</label>
                        {isEditing ? (
                            <textarea 
                                value={editData.address} 
                                onChange={e => setEditData({...editData, address: e.target.value})}
                                className="w-full p-3 bg-gray-50 border-2 border-gray-100 rounded-xl font-bold text-xs outline-none focus:border-[#3498db] min-h-[80px]"
                            />
                        ) : (
                            <p className="font-bold text-[#2c3e50] bg-gray-50/50 p-3 rounded-xl border border-transparent">{user.address || 'Not Set'}</p>
                        )}
                    </div>
                </div>

                {isEditing && (
                    <div className="pt-4">
                        <button 
                            onClick={handleSave} 
                            disabled={saving}
                            className="w-full bg-[#3498db] text-white py-4 rounded-2xl font-black uppercase text-xs shadow-xl shadow-blue-100 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                        >
                            {saving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                            {t('save_profile')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default App;
