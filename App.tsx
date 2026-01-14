
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Language, UserProfile, HelpRequest, ChatMessage, ChatRoom } from './types';
import { translations } from './translations';
import { GoogleGenAI } from "@google/genai";

// Using declare to avoid TS errors for globally injected scripts
declare const firebase: any;

// Helper components
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
        <div className="h-screen w-screen flex items-center justify-center bg-[#f8f9fa] text-[#3498db] font-black italic uppercase text-center">
            <i className="fas fa-spinner fa-spin text-5xl mb-4 block"></i>
            Connecting Warga Miri
        </div>
    );

    return (
        <div className="min-h-screen flex flex-col bg-[#f8f9fa] font-sans">
            <header className="bg-[#2c3e50] text-white shadow-xl sticky top-0 z-[100] h-16 sm:h-20 flex items-center">
                <div className="container mx-auto px-2 sm:px-4 flex items-center justify-between gap-1 overflow-hidden">
                    <button onClick={() => setIsMenuOpen(true)} className="p-2 hover:bg-white/10 rounded-xl transition-all flex-shrink-0">
                        <i className="fas fa-bars text-lg sm:text-xl"></i>
                    </button>
                    <div className="flex-grow text-center font-black tracking-tighter cursor-pointer text-[10px] xs:text-[13px] sm:text-lg uppercase whitespace-nowrap overflow-hidden" onClick={() => setPage('home')}>
                        MIRI <span className="text-[#3498db]">CARE</span> CONNECT
                    </div>
                    <div className="flex items-center gap-1 sm:gap-4 flex-shrink-0">
                        {user && (
                            <div className="flex items-center bg-[#f39c12] px-2 sm:px-4 py-1 rounded-full text-[8px] sm:text-xs font-black shadow-lg">
                                <i className="fas fa-star mr-1 sm:mr-2"></i> {user.points} <span className="ml-0.5">Points</span>
                            </div>
                        )}
                        {user ? (
                            <button onClick={() => firebase.auth().signOut()} className="bg-red-500 hover:bg-red-600 text-white px-2 sm:px-4 py-1.5 rounded-full text-[8px] sm:text-[10px] font-black uppercase shadow-lg flex items-center gap-1">
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
                {/* ADMIN FLOATING TOGGLE BUTTON */}
                {isAdmin && (
                    <button 
                        onClick={() => setShowAdminPanel(!showAdminPanel)}
                        className="fixed right-4 top-1/4 z-[110] bg-[#2c3e50] text-white w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-2xl flex flex-col items-center justify-center hover:scale-110 active:scale-95 transition-all group border-4 border-white"
                        title="Toggle Admin Panel"
                    >
                        <i className={`fas fa-${showAdminPanel ? 'times' : 'user-shield'} text-lg sm:text-xl`}></i>
                        <span className="text-[6px] sm:text-[7px] font-black uppercase mt-1">Panel</span>
                    </button>
                )}

                {/* AI & ADMIN SUPPORT CHAT TOGGLE - RIGHT SIDE BOTTOM (FAITHFUL TO PHOTO) */}
                {user && !isAdmin && (
                    <div className="fixed right-6 bottom-6 z-[200] flex flex-col items-end gap-4">
                        {showSupportChat && (
                            <div className="w-72 sm:w-80 h-[450px] bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 mb-2 origin-bottom-right">
                                <div className="bg-[#3498db] p-4 text-white flex justify-between items-center">
                                    <div className="font-black uppercase text-xs flex items-center gap-2">
                                        <i className="fas fa-robot"></i>
                                        Gemini Support AI
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
                            className="bg-[#3498db] text-white w-16 h-16 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all border-4 border-white z-[201]"
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

// AI INTEGRATION - SupportChatBody
const SupportChatBody: React.FC<{userId: string, userName: string}> = ({userId, userName}) => {
    const [msgs, setMsgs] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
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
    }, [msgs, isTyping]);

    const send = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isTyping) return;
        const msg = input;
        setInput('');
        
        const db = firebase.firestore();
        const chatRef = db.collection('support_chats');

        // Add user message
        await chatRef.add({
            userId,
            userName: userName || 'User',
            text: msg,
            sender: 'user',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        setIsTyping(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // Build simple context from recent messages
            const recentContext = msgs.slice(-5).map(m => `${m.sender}: ${m.text}`).join('\n');
            const prompt = `You are a friendly administrator for 'Miri Care Connect', a community donation platform for Miri, Sarawak. 
            Citizens donate extra items (food, clothes, stationary) to SMK Lutong Bilik Pengawas.
            Donor earn 5 points. Points can be spent on Koperasi vouchers.
            
            Previous messages:
            ${recentContext}
            
            User says: ${msg}
            
            Keep your answer short, professional and helpful. If you don't know, tell them an admin will check manually soon.`;

            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: prompt,
            });

            // Add AI response to firestore
            await chatRef.add({
                userId,
                userName: userName || 'User',
                text: response.text || "I'm sorry, I'm having trouble thinking right now.",
                sender: 'ai',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error("Gemini Error:", error);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {msgs.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center px-4">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                            <i className="fas fa-robot text-[#3498db] text-2xl"></i>
                        </div>
                        <div className="font-black text-[#2c3e50] uppercase text-[10px] mb-1 tracking-widest">Hi! Ask Gemini anything.</div>
                        <p className="text-[9px] text-gray-400 font-bold leading-relaxed">I'm Miri Care AI. Ask me about donations, points, or vouchers!</p>
                    </div>
                )}
                {msgs.map((m, i) => (
                    <div key={i} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-xs font-bold ${
                            m.sender === 'user' 
                            ? 'bg-[#3498db] text-white rounded-tr-none' 
                            : m.sender === 'ai' 
                                ? 'bg-[#2ecc71] text-white rounded-tl-none shadow-sm' 
                                : 'bg-white text-[#2c3e50] border border-gray-200 rounded-tl-none shadow-sm'
                        }`}>
                            {m.text}
                        </div>
                        <span className="text-[8px] text-gray-400 mt-1 uppercase font-black">
                            {m.sender === 'user' ? 'You' : m.sender === 'ai' ? 'Gemini AI' : 'Admin'}
                        </span>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex items-start">
                        <div className="bg-gray-200 p-3 rounded-2xl rounded-tl-none text-[8px] font-black uppercase tracking-widest text-gray-500 animate-pulse">
                            Gemini is thinking...
                        </div>
                    </div>
                )}
            </div>
            <form onSubmit={send} className="p-4 bg-white border-t flex gap-2">
                <input 
                    value={input} 
                    onChange={e => setInput(e.target.value)} 
                    placeholder="Ask Gemini AI..." 
                    className="flex-1 bg-gray-100 p-3 rounded-2xl text-xs font-bold outline-none focus:bg-gray-200 border-2 border-transparent focus:border-[#3498db] transition-all" 
                />
                <button className="bg-[#3498db] text-white w-10 h-10 rounded-xl flex items-center justify-center transition-transform active:scale-90 shadow-lg"><i className="fas fa-paper-plane text-xs"></i></button>
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
        const confirmResult = window.confirm(`Confirm receipt? Donor earns 5 points. This will be removed from the public list and stored in Admin records.`);
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
            alert("Confirmed! Points awarded to donor.");
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
                    <h2 className="text-lg sm:text-xl font-black text-[#2c3e50] tracking-tight uppercase">Extra Offers</h2>
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
            alert("SUCCESSFULLY POSTED! PLEASE SEND TO BILIK PENGAWAS SMK LUTONG (MON/TUE/FRI 6:15-6:50AM)");
            onNavigate('home');
        } catch (err) { alert("Failed."); } finally { setPosting(false); }
    };

    if (!user) return (
        <div className="max-w-4xl mx-auto py-24 text-center">
            <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mb-8 mx-auto shadow-inner"><i className="fas fa-lock text-5xl text-gray-300"></i></div>
            <h2 className="text-4xl font-black text-[#2c3e50] mb-2 uppercase tracking-tighter">Page Locked</h2>
            <h3 className="text-xl font-black text-[#3498db] mb-10 uppercase italic">LOG IN TO SHARE YOUR EXTRA ITEMS</h3>
            <button onClick={onAuth} className="bg-[#3498db] text-white px-12 py-5 rounded-full font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all">Log In Now</button>
        </div>
    );

    return (
        <div className="max-w-2xl mx-auto py-12 animate-in zoom-in duration-300">
            <div className="bg-white rounded-[3rem] shadow-2xl p-10 sm:p-16 border border-gray-50">
                <h2 className="text-3xl font-black text-[#2c3e50] mb-2 leading-none uppercase italic">Share Extra Items</h2>
                <h3 className="text-xs font-black text-[#3498db] mb-10 uppercase tracking-widest">Post your offer to earn points</h3>
                <form onSubmit={handlePost} className="space-y-8">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest ml-1">Item Name</label>
                        <input 
                            value={item.itemName} 
                            onChange={e => setItem({...item, itemName: e.target.value})} 
                            className="w-full p-5 rounded-2xl border-2 border-gray-100 focus:border-[#3498db] outline-none font-bold text-black bg-white placeholder-gray-300 shadow-sm" 
                            required 
                            placeholder="Enter item name here..."
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest ml-1">Category</label>
                            <select value={item.category} onChange={e => setItem({...item, category: e.target.value})} className="w-full p-5 rounded-2xl border-2 border-gray-100 outline-none font-bold text-black bg-white shadow-sm">
                                <option>Food</option><option>Clothing</option><option>Stationary</option><option>Others</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest ml-1">Quantity</label>
                            <input 
                                type="number" 
                                value={item.qty} 
                                onChange={e => setItem({...item, qty: Number(e.target.value)})} 
                                className="w-full p-5 rounded-2xl border-2 border-gray-100 outline-none font-bold text-black bg-white shadow-sm" 
                                required 
                            />
                        </div>
                    </div>
                    <button type="submit" disabled={posting} className="w-full bg-[#4285f4] hover:bg-blue-600 text-white py-6 rounded-2xl font-black text-xl shadow-xl active:scale-95 transition-all disabled:opacity-50">
                        {posting ? 'POSTING...' : 'POST DONATION'}
                    </button>
                </form>
            </div>
        </div>
    );
};

const AdminPanelContent: React.FC<{t: any, user: UserProfile | null}> = ({t, user}) => {
    const [activeTab, setActiveTab] = useState<'users' | 'items' | 'ai_chat'>('users');
    const [data, setData] = useState<{users: any[], items: any[], supportChats: any[], completedItems: any[]}>({users: [], items: [], supportChats: [], completedItems: []});
    const [editingUser, setEditingUser] = useState<any>(null);
    const [viewingItem, setViewingItem] = useState<any>(null);
    const [activeSupportUser, setActiveSupportUser] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [adminReply, setAdminReply] = useState('');

    useEffect(() => {
        const db = firebase.firestore();
        const unsubUsers = db.collection('users').onSnapshot((snap: any) => setData(prev => ({...prev, users: snap.docs.map((d: any) => ({...d.data(), uid: d.id}))})));
        const unsubItems = db.collection('donations').onSnapshot((snap: any) => setData(prev => ({...prev, items: snap.docs.map((d: any) => ({...d.data(), id: d.id}))})));
        const unsubCompleted = db.collection('completed_donations').orderBy('completedAt', 'desc').onSnapshot((snap: any) => setData(prev => ({...prev, completedItems: snap.docs.map((d: any) => ({...d.data(), id: d.id}))})));
        
        // Listen to AI support chats for the inbox
        const unsubSupport = db.collection('support_chats').orderBy('createdAt', 'desc').onSnapshot((snap: any) => {
            const grouped: any[] = [];
            const seen = new Set();
            snap.docs.forEach((d: any) => {
                const data = d.data();
                if (!seen.has(data.userId)) {
                    grouped.push({ userId: data.userId, userName: data.userName, lastMsg: data.text });
                    seen.add(data.userId);
                }
            });
            setData(prev => ({...prev, supportChats: grouped}));
        });
        return () => { unsubUsers(); unsubItems(); unsubSupport(); unsubCompleted(); };
    }, []);

    const filteredUsers = useMemo(() => {
        return data.users.filter(u => 
            (u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
             u.email?.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [data.users, searchTerm]);

    const handleSaveUser = async () => {
        if (!editingUser) return;
        try {
            await firebase.firestore().collection('users').doc(editingUser.uid).update({
                displayName: editingUser.displayName,
                phone: editingUser.phone,
                address: editingUser.address,
                points: Number(editingUser.points)
            });
            alert("User updated!");
            setEditingUser(null);
        } catch (e) { alert("Error updating user"); }
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

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 overflow-hidden bg-white">
            <h2 className="text-xl sm:text-2xl font-black italic uppercase text-[#2c3e50] mb-4 sm:mb-8 border-b-4 border-[#3498db] pb-2 inline-block">Admin Console</h2>
            
            <div className="flex gap-1 mb-4 sm:mb-6">
                <button onClick={() => { setActiveTab('users'); setEditingUser(null); setActiveSupportUser(null); }} className={`flex-1 py-2 rounded-xl text-[8px] font-black uppercase transition-all ${activeTab === 'users' ? 'bg-[#2c3e50] text-white' : 'bg-gray-100 text-gray-400'}`}>Citizens</button>
                <button onClick={() => { setActiveTab('items'); setEditingUser(null); setActiveSupportUser(null); }} className={`flex-1 py-2 rounded-xl text-[8px] font-black uppercase transition-all ${activeTab === 'items' ? 'bg-[#2c3e50] text-white' : 'bg-gray-100 text-gray-400'}`}>Offers</button>
                <button onClick={() => { setActiveTab('ai_chat'); setEditingUser(null); setActiveSupportUser(null); }} className={`flex-1 py-2 rounded-xl text-[8px] font-black uppercase transition-all ${activeTab === 'ai_chat' ? 'bg-[#2ecc71] text-white' : 'bg-gray-100 text-gray-400'}`}>AI & Help</button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {activeTab === 'users' && (
                    editingUser ? (
                        <div className="space-y-4 bg-gray-50 p-4 sm:p-6 rounded-2xl border border-gray-100">
                            <AdminInput label="Full Name" value={editingUser.displayName || ''} onChange={v => setEditingUser({...editingUser, displayName: v})} />
                            <AdminInput label="Phone Number" value={editingUser.phone || ''} onChange={v => setEditingUser({...editingUser, phone: v})} />
                            <AdminInput label="Points Balance" type="number" value={editingUser.points || 0} onChange={v => setEditingUser({...editingUser, points: v})} />
                            <div className="flex gap-2">
                                <button onClick={handleSaveUser} className="flex-1 bg-[#2ecc71] text-white py-3 rounded-xl font-black text-[10px] uppercase">Save</button>
                                <button onClick={() => setEditingUser(null)} className="flex-1 bg-gray-200 py-3 rounded-xl font-black text-[10px] uppercase">Back</button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <input type="text" placeholder="Search Citizens..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-3 bg-gray-50 border rounded-xl mb-4 text-xs font-bold" />
                            {filteredUsers.map(u => (
                                <div key={u.uid} className="bg-white p-3 border rounded-xl flex justify-between items-center">
                                    <div className="truncate flex-1">
                                        <div className="font-black text-[10px] uppercase truncate">{u.displayName}</div>
                                        <div className="text-[9px] text-gray-400 truncate">{u.email}</div>
                                    </div>
                                    <button onClick={() => setEditingUser(u)} className="p-2 text-[#3498db]"><i className="fas fa-edit"></i></button>
                                </div>
                            ))}
                        </div>
                    )
                )}

                {activeTab === 'items' && (
                    <div className="space-y-4">
                        {data.items.map(i => (
                            <div key={i.id} className="bg-white p-3 border rounded-xl">
                                <div className="font-black text-xs uppercase">{i.itemName}</div>
                                <div className="text-[10px] text-gray-400">Donor: {i.donorName} | Qty: {i.qty}</div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'ai_chat' && (
                    activeSupportUser ? (
                        <div className="flex flex-col h-full space-y-4">
                            <button onClick={() => setActiveSupportUser(null)} className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-2">
                                <i className="fas fa-arrow-left"></i> Back to AI Inbox
                            </button>
                            <div className="font-black uppercase text-xs border-b pb-2 text-[#2c3e50] italic">Chat Log: {activeSupportUser.userName}</div>
                            <AdminChatLogWindow userId={activeSupportUser.userId} />
                            <form onSubmit={sendAdminReply} className="flex gap-2">
                                <input 
                                    value={adminReply} 
                                    onChange={e => setAdminReply(e.target.value)} 
                                    placeholder="Intervene manually..." 
                                    className="flex-1 bg-gray-50 p-3 rounded-xl text-xs font-bold border outline-none focus:border-[#3498db]" 
                                />
                                <button className="bg-[#2c3e50] text-white px-4 rounded-xl text-[10px] font-black uppercase">Send</button>
                            </form>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <h3 className="text-[10px] font-black uppercase text-gray-400 mb-3 tracking-widest px-1">AI Chat History</h3>
                            {data.supportChats.length === 0 && <div className="text-center py-10 text-[10px] font-black text-gray-300">NO CHATS YET</div>}
                            {data.supportChats.map(s => (
                                <div key={s.userId} onClick={() => setActiveSupportUser(s)} className="bg-white p-4 border rounded-xl cursor-pointer hover:border-[#3498db] hover:shadow-md transition-all">
                                    <div className="font-black text-[11px] uppercase mb-1 flex justify-between">
                                        {s.userName}
                                        <i className="fas fa-robot text-[#2ecc71] opacity-50"></i>
                                    </div>
                                    <div className="text-[10px] text-gray-400 truncate font-bold">Latest: {s.lastMsg}</div>
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
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const unsub = firebase.firestore().collection('support_chats')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'asc')
            .onSnapshot((snap: any) => setMsgs(snap.docs.map((d: any) => d.data())));
        return unsub;
    }, [userId]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [msgs]);

    return (
        <div ref={scrollRef} className="flex-1 h-[400px] overflow-y-auto bg-gray-50 rounded-xl p-4 space-y-2 scrollbar-hide">
            {msgs.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.sender === 'user' ? 'items-start' : 'items-end'}`}>
                    <div className={`max-w-[85%] p-3 rounded-xl text-[10px] font-bold ${
                        m.sender === 'user' 
                        ? 'bg-white text-[#2c3e50] border' 
                        : m.sender === 'ai' 
                            ? 'bg-[#2ecc71] text-white' 
                            : 'bg-[#2c3e50] text-white'
                    }`}>
                        {m.text}
                    </div>
                    <span className="text-[7px] text-gray-400 mt-0.5 uppercase font-black px-1">
                        {m.sender === 'user' ? 'Citizen' : m.sender === 'ai' ? 'AI Response' : 'Admin Intervention'}
                    </span>
                </div>
            ))}
        </div>
    );
};

const ProfilePage: React.FC<{user: UserProfile | null, t: any, onAuth: any, onNavigate: any}> = ({user, t, onAuth}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({ displayName: '', phone: '', address: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user) {
            setEditData({
                displayName: user.displayName || '',
                phone: user.phone || '',
                address: user.address || ''
            });
        }
    }, [user]);

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            await firebase.firestore().collection('users').doc(user.uid).update(editData);
            setIsEditing(false);
            alert("Profile updated successfully!");
        } catch (e) {
            alert("Failed to update profile.");
        } finally {
            setSaving(false);
        }
    };

    if (!user) return <div className="text-center py-20"><button onClick={onAuth} className="bg-[#3498db] text-white px-12 py-4 rounded-full font-black uppercase shadow-xl">Sign In to View Profile</button></div>;
    
    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in">
            <div className="bg-[#2c3e50] p-8 sm:p-12 rounded-[2rem] sm:rounded-[3rem] shadow-xl text-white text-center border-b-8 border-[#f39c12]">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-[#3498db] rounded-full flex items-center justify-center text-3xl sm:text-4xl font-black mx-auto mb-6 uppercase shadow-2xl">
                    {user.displayName?.[0] || '?'}
                </div>
                <h1 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tighter mb-2">{user.displayName || 'No Name Set'}</h1>
                <p className="text-[#f39c12] font-black text-xl sm:text-2xl">{user.points} <span className="text-sm uppercase">Points</span></p>
                <button 
                    onClick={() => setIsEditing(!isEditing)} 
                    className="mt-4 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all"
                >
                    {isEditing ? 'Cancel Edit' : 'Edit Profile'}
                </button>
            </div>

            <div className="bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border border-gray-100 shadow-sm">
                <h2 className="text-xs font-black uppercase text-gray-300 tracking-[0.3em] mb-6 text-center">Citizen Information</h2>
                <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                        <i className="fas fa-envelope text-[#3498db] w-5 text-center"></i>
                        <div className="flex-1">
                            <label className="text-[8px] font-black uppercase text-gray-400 block mb-1">Email (Fixed)</label>
                            <div className="font-bold text-[#2c3e50] text-sm">{user.email}</div>
                        </div>
                    </div>

                    {isEditing ? (
                        <>
                            <div className="space-y-1">
                                <label className="text-[8px] font-black uppercase text-gray-400 ml-4">Full Name</label>
                                <input 
                                    value={editData.displayName} 
                                    onChange={e => setEditData({...editData, displayName: e.target.value})}
                                    className="w-full p-4 bg-white border-2 border-gray-100 rounded-2xl font-bold text-black outline-none focus:border-[#3498db]"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[8px] font-black uppercase text-gray-400 ml-4">Phone Number</label>
                                <input 
                                    value={editData.phone} 
                                    onChange={e => setEditData({...editData, phone: e.target.value})}
                                    className="w-full p-4 bg-white border-2 border-gray-100 rounded-2xl font-bold text-black outline-none focus:border-[#3498db]"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[8px] font-black uppercase text-gray-400 ml-4">Home Address</label>
                                <input 
                                    value={editData.address} 
                                    onChange={e => setEditData({...editData, address: e.target.value})}
                                    className="w-full p-4 bg-white border-2 border-gray-100 rounded-2xl font-bold text-black outline-none focus:border-[#3498db]"
                                />
                            </div>
                            <button 
                                disabled={saving}
                                onClick={handleSave}
                                className="w-full bg-[#3498db] text-white py-4 rounded-2xl font-black uppercase shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                                <i className="fas fa-phone text-[#3498db] w-5 text-center"></i>
                                <div className="flex-1">
                                    <label className="text-[8px] font-black uppercase text-gray-400 block mb-1">Phone</label>
                                    <div className="font-bold text-[#2c3e50] text-sm">{user.phone || 'Not set'}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                                <i className="fas fa-map-marker-alt text-[#3498db] w-5 text-center"></i>
                                <div className="flex-1">
                                    <label className="text-[8px] font-black uppercase text-gray-400 block mb-1">Address</label>
                                    <div className="font-bold text-[#2c3e50] text-sm">{user.address || 'Not set'}</div>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                        <i className="fas fa-birthday-cake text-[#3498db] w-5 text-center"></i>
                        <div className="flex-1">
                            <label className="text-[8px] font-black uppercase text-gray-400 block mb-1">Age Information</label>
                            <div className="font-bold text-[#2c3e50] text-sm">{user.birthdate} ({user.age} yrs)</div>
                        </div>
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
        <div className="space-y-12 py-12">
            <h1 className="text-3xl sm:text-5xl font-black italic uppercase text-[#2c3e50] text-center tracking-tighter">Kindness Shop</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {items.map(item => (
                    <div key={item.id} className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-xl text-center flex flex-col group hover:scale-105 transition-transform">
                        <div className="p-8 sm:p-12 flex-1">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl sm:text-3xl text-[#f39c12] shadow-inner"><i className="fas fa-gift"></i></div>
                            <h3 className="font-black text-lg sm:text-xl mb-2 uppercase italic text-[#2c3e50]">{item.name}</h3>
                            <div className="text-2xl sm:text-3xl font-black text-[#f39c12]">{item.cost} <span className="text-sm">Points</span></div>
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
    if (!user) return <div className="text-center py-20"><button onClick={onAuth} className="bg-[#3498db] text-white px-12 py-4 rounded-full font-black uppercase">Sign In to View History</button></div>;
    return (
        <div className="max-w-4xl mx-auto space-y-10 py-12">
            <h1 className="text-3xl sm:text-4xl font-black italic uppercase text-[#2c3e50] tracking-tighter">History</h1>
            <div className="space-y-4">
                {history.map((h, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 flex items-center justify-between shadow-sm animate-in slide-in-from-bottom">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-orange-50 text-[#f39c12] rounded-xl flex items-center justify-center text-xl shadow-inner"><i className="fas fa-ticket-alt"></i></div>
                            <div>
                                <div className="font-black uppercase italic text-[#2c3e50] text-sm sm:text-base">{h.itemName}</div>
                                <div className="text-[10px] font-bold text-gray-300 uppercase">{h.redeemedAt?.toDate().toLocaleDateString()}</div>
                            </div>
                        </div>
                        <div className="text-[#f39c12] font-black text-xl">-{h.itemPoints}</div>
                    </div>
                ))}
                {history.length === 0 && <div className="text-center py-20 text-gray-300 font-black uppercase italic">No history found</div>}
            </div>
        </div>
    );
};

const AuthModal: React.FC<{onClose: () => void, t: any}> = ({onClose}) => {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [data, setData] = useState({ email: '', password: '', name: '', birthdate: '', phone: '' });
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
                    isAdmin: data.email === 'admin@gmail.com'
                });
            }
            onClose();
        } catch (err: any) { alert(err.message); } finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[400] flex items-center justify-center p-4 backdrop-blur-md" onClick={onClose}>
            <div className="bg-white w-full max-w-md rounded-[2rem] sm:rounded-[3rem] p-8 sm:p-12 shadow-2xl relative animate-in zoom-in duration-300 overflow-y-auto max-h-[95vh]" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl sm:text-3xl font-black text-center uppercase italic text-[#2c3e50] mb-8">{mode === 'login' ? 'Welcome Back' : 'Join Us'}</h2>
                <form onSubmit={submit} className="space-y-4">
                    {mode === 'register' && (
                        <>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Full Name (As IC)</label>
                                <input placeholder="Your Name" value={data.name} onChange={e => setData({...data, name: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl outline-none font-bold text-black" required />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Birth Date</label>
                                <input type="date" value={data.birthdate} onChange={e => setData({...data, birthdate: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl outline-none font-bold text-black" required />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Phone Number</label>
                                <input type="tel" placeholder="e.g. 0123456789" value={data.phone} onChange={e => setData({...data, phone: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl outline-none font-bold text-black" required />
                            </div>
                        </>
                    )}
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Email (@moe-dl.edu.my)</label>
                        <input type="email" placeholder="email@moe-dl.edu.my" value={data.email} onChange={e => setData({...data, email: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl outline-none font-bold text-black" required />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Password</label>
                        <div className="relative">
                            <input 
                                type={showPassword ? "text" : "password"} 
                                placeholder="••••••••" 
                                value={data.password} 
                                onChange={e => setData({...data, password: e.target.value})} 
                                className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl outline-none font-bold pr-12 text-black" 
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
                    <button disabled={loading} className="w-full bg-[#3498db] text-white py-6 rounded-full font-black text-xl shadow-xl hover:scale-105 transition-all mt-6">{loading ? '...' : (mode === 'login' ? 'Login' : 'Register')}</button>
                </form>
                
                <div className="mt-8 pt-4 border-t border-gray-50 flex flex-col items-center gap-4">
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">
                        {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
                    </p>
                    <button 
                        onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setShowPassword(false); }}
                        className="text-xs font-black uppercase text-[#3498db] hover:bg-blue-50 px-8 py-3 rounded-full transition-all border-2 border-[#3498db]"
                    >
                        {mode === 'login' ? 'Switch to Register' : 'Switch to Login'}
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
            <div className="bg-white w-full max-w-md rounded-[2rem] sm:rounded-[3rem] p-10 sm:p-12 shadow-2xl relative animate-in zoom-in" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl sm:text-2xl font-black mb-8 italic uppercase text-[#2c3e50] text-center">Confirm Identity</h2>
                <form onSubmit={e => { e.preventDefault(); onConfirm(f, c); }} className="space-y-6">
                    <input value={f} onChange={e => setF(e.target.value)} placeholder="Full Name" className="w-full bg-gray-50 border-2 border-gray-100 p-5 rounded-2xl font-bold text-black" required />
                    <input value={c} onChange={e => setC(e.target.value)} placeholder="Class/Section" className="w-full bg-gray-50 border-2 border-gray-100 p-5 rounded-2xl font-bold text-black" required />
                    <button type="submit" className="w-full bg-[#3498db] text-white py-6 rounded-full font-black uppercase shadow-xl">Verify & Redeem</button>
                </form>
            </div>
        </div>
    );
};

export default App;
