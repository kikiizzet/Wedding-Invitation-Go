import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'framer-motion';
import { 
  MailOpen, Music, ChevronDown, Heart, 
  BookOpen, Image as ImageIcon, Gift, Copy, Check, Send, 
  Moon, Star, MapPin, Clock, Utensils, Calendar, QrCode,
  Video, Shirt, Share2, Plus, Minus, Home, ArrowDown
} from 'lucide-react';
import confetti from 'canvas-confetti';

// --- COMPONENTS ---

const Visualizer = ({ isPlaying }) => (
  <div className="flex items-end gap-1 h-4">
    {[1, 2, 3, 4].map((i) => (
      <motion.div
        key={i}
        className="visualizer-bar"
        animate={{
          height: isPlaying ? [4, 16, 8, 14, 4] : 4
        }}
        transition={{
          repeat: Infinity,
          duration: 0.5 + i * 0.1,
          ease: "easeInOut"
        }}
      />
    ))}
  </div>
);

const FloatingOrnament = ({ delay = 0, x = "0%", y = "0%", size = 40 }) => (
  <motion.div
    initial={{ y: 0, rotate: 0 }}
    animate={{ 
      y: [0, -30, 0],
      rotate: [0, 10, -10, 0]
    }}
    transition={{
      duration: 8 + Math.random() * 4,
      repeat: Infinity,
      delay: delay,
      ease: "easeInOut"
    }}
    className="absolute pointer-events-none opacity-20"
    style={{ left: x, top: y }}
  >
    <Star size={size} className="text-[#D4AF37]" fill="#D4AF37" />
  </motion.div>
);

const App = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [guestName, setGuestName] = useState('Tamu Undangan');
  const [chatName, setChatName] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [copied, setCopied] = useState(false);
  const [rsvpStatus, setRsvpStatus] = useState(null);
  const [guestCount, setGuestCount] = useState(1);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [rsvpSubmitted, setRsvpSubmitted] = useState(false);
  const [isRsvpSubmitting, setIsRsvpSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  
  const audioRef = useRef(null);
  const socketRef = useRef(null);
  
  const { scrollY } = useScroll();
  
  const sealOpacity = useTransform(scrollY, [0, 100], [1, 0]);
  const flapRotateX = useTransform(scrollY, [100, 400], [0, -170]);
  // Letter opacity: only shows up when flap starts opening (around 200px scroll)
  const letterOpacity = useTransform(scrollY, [200, 400], [0, 1]);
  const letterY = useTransform(scrollY, [400, 900], [0, -900]);
  const letterScale = useTransform(scrollY, [400, 900], [0.95, 1.05]);
  
  const envelopeOpacity = useTransform(scrollY, [1100, 1250], [1, 0]);
  
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const to = params.get('to');
    if (to) {
      setGuestName(to);
      setChatName(to);
    }

    const timer = setInterval(() => {
      const targetDate = new Date("2026-05-30T09:00:00").getTime();
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Trigger main site entry when scroll reaches threshold OR on button click
  const handleManualOpen = () => {
    setIsOpen(true);
    try {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#D4AF37', '#FCFBF7', '#1A1A1A']
      });
    } catch(e) {}
    if (audioRef.current && !isPlaying) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    if (isOpen) {
      connectWebSocket();
      try {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#D4AF37', '#FCFBF7', '#1A1A1A']
        });
      } catch(e) {}
    }
    return () => {
      if (socketRef.current) socketRef.current.close();
    };
  }, [isOpen]);

  useEffect(() => {
    return scrollY.onChange((latest) => {
      if (latest > 1300 && !isOpen) {
        handleManualOpen();
      }
    });
  }, [scrollY, isOpen]);

  const toggleMusic = () => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const connectWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    socketRef.current = new WebSocket(`${protocol}//${window.location.host}/ws`);
    socketRef.current.onopen = () => fetchHistory();
    socketRef.current.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      setMessages(prev => [msg, ...prev]);
    };
  };

  const fetchHistory = () => {
    fetch('/api/messages')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMessages(data);
        }
      })
      .catch(err => console.error("History fetch error:", err));
  };

  const handleRsvpSubmit = () => {
    if (!rsvpStatus) {
      alert("Silakan pilih status kehadiran terlebih dahulu.");
      return;
    }
    setIsRsvpSubmitting(true);
    // Simulating API call
    setTimeout(() => {
      setIsRsvpSubmitting(false);
      setRsvpSubmitted(true);
      try {
        confetti({
          particleCount: 200,
          spread: 90,
          origin: { y: 0.7 },
          colors: ['#D4AF37', '#FCFBF7']
        });
      } catch(e) {}
    }, 1500);
  };

  const sendMessage = () => {
    if (!inputValue.trim() || !socketRef.current) return;
    socketRef.current.send(JSON.stringify({
      guest_name: chatName || 'Tamu Undangan',
      content: inputValue,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));
    setInputValue('');
  };

  return (
    <div className="min-h-[200vh] bg-[#FCFBF7] text-[#1A1A1A] font-serif selection:bg-[#D4AF37] selection:text-white overflow-x-hidden">
      <audio ref={audioRef} loop src="/music.mp3" />
      
      <motion.div className="fixed top-0 left-0 right-0 h-1 bg-[#D4AF37] origin-left z-[10000]" style={{ scaleX }} />

      <AnimatePresence>
        {!isOpen && (
          <motion.div 
            style={{ opacity: envelopeOpacity }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#FCFBF7] paper-texture"
          >
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5, duration: 1 }}
              className="absolute bottom-10 flex flex-col items-center gap-4 z-50 pointer-events-none"
            >
                <div className="flex flex-col items-center gap-1 opacity-40">
                  <span className="text-[9px] uppercase tracking-[0.8em] font-sans font-bold text-[#D4AF37]">Click / Scroll</span>
                  <motion.div 
                    animate={{ y: [0, 15, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="w-[1px] h-12 bg-gradient-to-b from-[#D4AF37] to-transparent" 
                  />
                  <ChevronDown size={14} className="text-[#D4AF37] -mt-2" />
                </div>
            </motion.div>

            <div className="envelope-wrapper">
               <div className="envelope-back" />
               <motion.div 
                style={{ y: letterY, opacity: letterOpacity, scale: letterScale }}
                className="envelope-paper shadow-2xl pointer-events-auto"
               >
                  <div className="w-full h-full border border-[#D4AF37]/10 flex flex-col items-center justify-center p-4 md:p-8 bg-white relative">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/pinstripe-light.png')] opacity-[0.03]" />
                    <p className="text-[7px] md:text-[8px] uppercase tracking-[0.3em] md:tracking-[0.4em] opacity-40 mb-2 md:mb-4 font-sans font-bold text-[#D4AF37]">Walimatul 'Urs</p>
                    <h1 className="font-['Birthstone'] text-4xl md:text-6xl text-[#D4AF37] mb-3 md:mb-6 leading-none">Izzet & Kezia</h1>
                    <div className="w-8 md:w-12 h-[1px] bg-[#D4AF37]/20 mb-4 md:mb-8" />
                    <div className="relative mb-6 md:mb-10 text-center">
                      <p className="text-[8px] md:text-[9px] uppercase tracking-[0.2em] opacity-30 mb-1 md:mb-2 font-bold font-sans">Special Invitation to:</p>
                      <p className="text-xl md:text-3xl font-bold tracking-tighter text-stone-900 border-b border-[#D4AF37]/10 pb-1 uppercase px-4">{guestName}</p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log("Button Clicked");
                        handleManualOpen();
                      }}
                      className="relative z-[999] pointer-events-auto px-8 md:px-12 py-3 md:py-4 bg-[#D4AF37] text-white rounded-full text-[9px] md:text-[10px] font-bold tracking-[0.3em] md:tracking-[0.4em] uppercase shadow-2xl hover:bg-[#C5A028] transition-all flex items-center gap-2 md:gap-3"
                    >
                      <MailOpen size={14} /> Buka Undangan
                    </motion.button>
                  </div>
               </motion.div>
               <div className="envelope-fold-left" />
               <div className="envelope-fold-right" />
               <div className="envelope-fold-bottom" />
               <motion.div style={{ rotateX: flapRotateX }} className="envelope-flap-top" />
               <motion.div 
                 style={{ opacity: sealOpacity }} 
                 className="wax-seal"
                 onClick={handleManualOpen}
                 whileHover={{ scale: 1.1 }}
                 whileTap={{ scale: 0.9 }}
               >
                 <Heart size={32} fill="white" className="text-white opacity-20 pointer-events-none" />
               </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2 }}>
          {/* LUXURY FLOATING MUSIC CONTROLLER */}
          <div className="fixed bottom-8 right-8 z-[1001] flex flex-col items-center gap-6">
            <AnimatePresence>
               {isPlaying && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                  >
                    <Visualizer isPlaying={isPlaying} />
                  </motion.div>
               )}
            </AnimatePresence>
            
            <motion.button 
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleMusic}
              className={`relative w-16 h-16 rounded-full flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all duration-500 overflow-hidden ${
                isPlaying ? "bg-[#D4AF37] text-white" : "bg-white text-stone-400 border border-stone-200"
              }`}
            >
              {/* Pulse Background for Playing State */}
              {isPlaying && (
                <motion.div 
                  animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  className="absolute inset-0 bg-white/40 rounded-full"
                />
              )}

              {/* Music Icon with Rotation */}
              <motion.div
                animate={{ rotate: isPlaying ? 360 : 0 }}
                transition={{ repeat: isPlaying ? Infinity : 0, duration: 8, ease: "linear" }}
                className="relative z-10"
              >
                <Music size={28} strokeWidth={1.5} />
              </motion.div>

              {/* Mute Slash for Paused State */}
              {!isPlaying && (
                <motion.div 
                   initial={{ scale: 0 }} 
                   animate={{ scale: 1 }} 
                   className="absolute z-20 w-10 h-[2px] bg-red-400 rotate-45 shadow-sm"
                />
              )}
            </motion.button>
          </div>

          <section className="h-[120vh] relative flex items-center justify-center text-white text-center overflow-hidden">
            <motion.div initial={{ scale: 1.3 }} animate={{ scale: 1 }} transition={{ duration: 40 }} className="absolute inset-0 bg-cover bg-center shrink-0" style={{ backgroundImage: "url('/zetka.png')" }} />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-[#FCFBF7]" />
            <div className="relative z-10 px-6 max-w-6xl mx-auto">
              <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 2 }}>
                <p className="text-xl md:text-2xl font-sans tracking-[0.8em] uppercase mb-8 md:mb-12 text-white/90 drop-shadow-lg">The Wedding of</p>
                <h2 className="text-7xl md:text-[12rem] font-bold mb-12 md:mb-16 tracking-tighter drop-shadow-2xl font-serif">Izzet & Kezia</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-10 max-w-4xl mx-auto mb-16 md:mb-24">
                  {[
                    { label: "Hari", val: timeLeft.days },
                    { label: "Jam", val: timeLeft.hours },
                    { label: "Menit", val: timeLeft.minutes },
                    { label: "Detik", val: timeLeft.seconds }
                  ].map((tile, i) => (
                    <div key={i} className="bg-black/20 backdrop-blur-xl rounded-[30px] md:rounded-[40px] p-6 md:p-12 border border-white/10 shadow-2xl">
                      <div className="text-4xl md:text-7xl font-bold mb-2 md:mb-3 font-sans text-[#D4AF37]">{tile.val}</div>
                      <div className="text-[10px] md:text-sm uppercase tracking-[0.4em] opacity-60 font-sans">{tile.label}</div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col items-center gap-8 md:gap-12 font-sans tracking-[0.4em] md:tracking-[0.6em] text-lg md:text-2xl uppercase opacity-80">
                  <span>Sabtu, 30 Mei 2026</span>
                  <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 3 }} className="opacity-40"><ArrowDown size={60} strokeWidth={1} /></motion.div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* QURAN VERSE (AR-RUM) */}
          <section className="py-24 md:py-48 bg-[#FCFBF7] text-center px-6">
             <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
                <Moon className="mx-auto text-[#D4AF37] mb-10 opacity-40" size={50} strokeWidth={1} />
                <h3 className="text-4xl md:text-6xl font-['Birthstone'] text-[#D4AF37] mb-10">Surah Ar-Rum : 21</h3>
                <p className="text-2xl md:text-5xl font-serif leading-loose text-stone-800 mb-12 tracking-wide dir-rtl">
                  وَمِنْ ءَايَٰتِهِۦٓ أَنْ خَلَقَ لَكُم مِّنْ أَنفُسِكُمْ أَزْوَٰجًا لِّتَسْكُنُوٓا۟ إِلَيْهَا وَجَعَلَ بَيْنَكُم مَّوَدَّةً وَرَحْمَةً ۚ إِنَّ فِى ذَٰلِكَ لَءَايَٰتٍ لِّقَوْمٍ يَتَفَكَّرُونَ
                </p>
                <div className="w-16 h-[1px] bg-[#D4AF37]/30 mx-auto mb-12" />
                <p className="text-base md:text-xl italic text-stone-500 font-serif leading-relaxed max-w-2xl mx-auto">
                  "Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya, dan Dia menjadikan di antaramu rasa kasih dan sayang. Sungguh, pada yang demikian itu benar-benar terdapat tanda-tanda bagi kaum yang berpikir."
                </p>
             </motion.div>
          </section>

          {/* OUR MOMENTS GALLERY */}
          <section className="py-24 md:py-48 bg-[#FCFBF7] overflow-hidden">
             <div className="container mx-auto px-6">
                <div className="text-center mb-24 md:mb-32">
                   <ImageIcon className="mx-auto text-[#D4AF37] mb-8 opacity-30" size={50} strokeWidth={1} />
                   <h2 className="text-6xl md:text-[8rem] font-['Birthstone'] text-[#D4AF37] mb-6 leading-none">Our Eternal Moments</h2>
                   <p className="text-stone-400 font-serif italic text-sm md:text-xl tracking-widest uppercase opacity-60">"Setiap detik adalah anugerah, setiap kenangan adalah harta."</p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 max-w-7xl mx-auto">
                   {[
                     { src: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=1200", size: "col-span-2 row-span-2" },
                     { src: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=1200", size: "col-span-1 row-span-1" },
                     { src: "https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&q=80&w=1200", size: "col-span-1 row-span-2" },
                     { src: "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&q=80&w=1200", size: "col-span-1 row-span-1" },
                     { src: "https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=1200", size: "col-span-2 row-span-1" },
                     { src: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&q=80&w=1200", size: "col-span-1 row-span-1" }
                   ].map((img, i) => (
                     <motion.div 
                       key={i}
                       initial={{ opacity: 0, scale: 0.9, y: 50 }}
                       whileInView={{ opacity: 1, scale: 1, y: 0 }}
                       transition={{ delay: i * 0.1, duration: 0.8 }}
                       viewport={{ once: true }}
                       onClick={() => setSelectedImage(img.src)}
                       className={`${img.size} relative group cursor-pointer overflow-hidden rounded-[30px] md:rounded-[50px] shadow-2xl border border-white/20`}
                     >
                        <motion.img 
                          whileHover={{ scale: 1.15 }}
                          transition={{ duration: 1.2, ease: "easeOut" }}
                          src={img.src} 
                          className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 transition-all duration-700 bg-stone-100"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-end p-8 md:p-12">
                           <div className="text-white">
                              <p className="text-[10px] uppercase tracking-[0.4em] font-bold text-[#D4AF37] mb-2">Moments</p>
                              <h4 className="text-2xl font-serif italic">Izzet & Kezia</h4>
                           </div>
                        </div>
                     </motion.div>
                   ))}
                </div>
             </div>

             {/* LIGHTBOX MODAL */}
             <AnimatePresence>
                {selectedImage && (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    onClick={() => setSelectedImage(null)}
                    className="fixed inset-0 z-[5000] bg-stone-950/95 backdrop-blur-2xl flex items-center justify-center p-4 md:p-12 cursor-zoom-out"
                  >
                     <motion.div 
                       initial={{ scale: 0.8 }}
                       animate={{ scale: 1 }}
                       className="relative max-w-6xl w-full h-full flex flex-col items-center justify-center"
                     >
                        <img src={selectedImage} className="max-w-full max-h-[80vh] object-contain rounded-[20px] md:rounded-[40px] shadow-3xl" />
                        <motion.button 
                           onClick={() => setSelectedImage(null)}
                           className="mt-12 text-white/50 hover:text-white uppercase tracking-[0.6em] text-[10px] font-bold transition-colors"
                        >
                           Close Gallery
                        </motion.button>
                     </motion.div>
                  </motion.div>
                )}
             </AnimatePresence>
          </section>

          <section className="py-32 md:py-64 bg-stone-900 text-white overflow-hidden">
            <div className="max-w-6xl mx-auto px-6 relative z-10">
              <div className="flex flex-col items-center mb-32 md:mb-56 text-center">
                <BookOpen className="text-[#D4AF37] mb-8 md:mb-12" size={60} strokeWidth={1} />
                <h2 className="text-6xl md:text-9xl font-['Birthstone'] text-[#D4AF37] mb-8 leading-none">The Chronicles of Serendipity</h2>
                <div className="w-40 h-[1px] bg-[#D4AF37]/30" />
              </div>
              <div className="space-y-48 md:space-y-80">
                {[
                  { num: "I", title: "Cinta Masa Remaja", text: "Dimulai di bangku sekolah, di antara tawa dan seragam biru putih. Takdir yang ramah mempertemukan Izzet dan Kezia dalam jalinan persahabatan yang kemudian bertumbuh menjadi benih kasih suci." },
                  { num: "II", title: "Melewati Waktu", text: "Tahun-tahun berlalu, kami bertumbuh menjadi dewasa dengan impian masing-masing. Namun, doa yang sama selalu terucap, mengikat hati kami meski di tengah kesibukan dunia." },
                  { num: "III", title: "Pelabuhan Terakhir", text: "Hari ini, di hadapan saksi dan Sang Pencipta, kami mengukir janji untuk sehidup sesurga. Langkah ini adalah awal dari ibadah terpanjang kami." }
                ].map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: i % 2 === 0 ? -100 : 100 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ margin: "-10%" }} transition={{ duration: 1.2 }} className={`flex flex-col lg:flex-row ${i % 2 === 0 ? '' : 'lg:flex-row-reverse'} items-center gap-16 md:gap-24 group`}>
                    <div className="w-full lg:w-1/2 p-12 md:p-24 bg-stone-800/50 shadow-2xl rounded-[60px] md:rounded-[80px] text-[10rem] md:text-[18rem] font-bold text-[#D4AF37]/5 font-sans leading-none flex items-center justify-center border border-white/5 transition-all group-hover:border-[#D4AF37]/20 relative overflow-hidden">
                      {item.num}
                    </div>
                    <div className={`w-full lg:w-1/2 text-center ${i % 2 === 0 ? 'lg:text-left' : 'lg:text-right'}`}>
                       <h3 className="text-5xl md:text-7xl font-['Birthstone'] text-[#D4AF37] mb-8 md:mb-12">{item.title}</h3>
                       <p className="text-xl md:text-3xl leading-[2.2] md:leading-[2.6] text-stone-400 font-serif italic">{item.text}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* GROOM & BRIDE */}
          <section className="py-32 md:py-64 bg-[#FCFBF7]">
            <div className="container mx-auto px-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 md:gap-40 max-w-6xl mx-auto">
                 <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} className="flex flex-col items-center">
                    <div className="w-64 h-64 md:w-80 md:h-80 rounded-full border-8 border-white shadow-2xl bg-stone-100 mb-12 flex items-center justify-center">
                       <span className="font-['Birthstone'] text-8xl text-[#D4AF37]/20">Izzet</span>
                    </div>
                    <h3 className="text-4xl md:text-5xl font-['Birthstone'] text-[#D4AF37] mb-4">Muhammad Izzet Sakovic Sahal</h3>
                    <div className="space-y-3 text-center">
                       <p className="text-[9px] tracking-[0.4em] font-bold uppercase text-[#D4AF37] opacity-60 mb-4">Putra Pertama dari:</p>
                       <h4 className="text-2xl md:text-3xl font-serif text-stone-800 tracking-tight">Bp. Qomaruddin Fatony</h4>
                       <div className="text-[#D4AF37]/30 font-['Birthstone'] text-3xl leading-none">&</div>
                       <h4 className="text-2xl md:text-3xl font-serif text-stone-800 tracking-tight">Ibu Marfuah Humaira</h4>
                    </div>
                 </motion.div>
                 <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} className="flex flex-col items-center lg:mt-32">
                    <div className="w-64 h-64 md:w-80 md:h-80 rounded-full border-8 border-white shadow-2xl bg-stone-100 mb-12 flex items-center justify-center">
                       <span className="font-['Birthstone'] text-8xl text-[#D4AF37]/20">Kezia</span>
                    </div>
                    <h3 className="text-4xl md:text-5xl font-['Birthstone'] text-[#D4AF37] mb-4">Kezia Mikayla Almahyra</h3>
                    <div className="space-y-3 text-center">
                       <p className="text-[9px] tracking-[0.4em] font-bold uppercase text-[#D4AF37] opacity-60 mb-4">Putri Bungsu dari:</p>
                       <h4 className="text-2xl md:text-3xl font-serif text-stone-800 tracking-tight">Bp. Khairul Azam</h4>
                       <div className="text-[#D4AF37]/30 font-['Birthstone'] text-3xl leading-none">&</div>
                       <h4 className="text-2xl md:text-3xl font-serif text-stone-800 tracking-tight">Ibu Siti Naimah</h4>
                    </div>
                 </motion.div>
              </div>
            </div>
          </section>

          {/* RSVP DIGITAL SECTION (RESTORED) */}
          <section className="py-24 md:py-48 bg-[#FBF9F2]">
             <div className="container mx-auto px-6 max-w-4xl">
               <div className="bg-white rounded-[3rem] p-10 md:p-20 shadow-2xl border border-[#D4AF37]/10 text-center">
                  <Heart className="mx-auto text-[#D4AF37] mb-12" size={50} strokeWidth={1} />
                  <h2 className="text-5xl md:text-7xl font-['Birthstone'] text-[#D4AF37] mb-8">Konfirmasi Kehadiran</h2>
                  <p className="text-stone-500 font-sans text-sm md:text-lg mb-16">Merupakan suatu kehormatan bagi kami atas kehadiran Bapak/Ibu/Saudara/i.</p>
                  
                  <div className="space-y-10 max-w-lg mx-auto">
                     <div className="flex justify-center gap-6">
                        <button 
                           onClick={() => setRsvpStatus('hadir')}
                           className={`px-10 py-4 rounded-full text-xs font-bold tracking-widest uppercase transition-all duration-500 ${rsvpStatus === 'hadir' ? "bg-[#D4AF37] text-white shadow-xl scale-110" : "bg-stone-100 text-stone-400"}`}
                        >
                           Hadir
                        </button>
                        <button 
                           onClick={() => setRsvpStatus('tidak')}
                           className={`px-10 py-4 rounded-full text-xs font-bold tracking-widest uppercase transition-all duration-500 ${rsvpStatus === 'tidak' ? "bg-stone-800 text-white shadow-xl scale-110" : "bg-stone-100 text-stone-400"}`}
                        >
                           Berhalangan
                        </button>
                     </div>
                     
                     <div className="bg-stone-50 rounded-3xl p-8 space-y-6">
                        <p className="text-[10px] uppercase font-bold text-stone-400 tracking-widest">Jumlah Tamu</p>
                        <div className="flex items-center justify-center gap-10">
                           <button onClick={() => setGuestCount(Math.max(1, guestCount - 1))} className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-[#D4AF37]"><Minus size={20} /></button>
                           <span className="text-4xl font-bold font-sans text-stone-800">{guestCount}</span>
                           <button onClick={() => setGuestCount(Math.min(5, guestCount + 1))} className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-[#D4AF37]"><Plus size={20} /></button>
                        </div>
                     </div>
                     
                     <button 
                         onClick={handleRsvpSubmit}
                         disabled={isRsvpSubmitting}
                         className={`w-full py-6 bg-[#D4AF37] text-white rounded-full text-xs font-bold tracking-[0.3em] uppercase shadow-2xl hover:bg-[#C5A028] transition-all flex items-center justify-center gap-4 ${isRsvpSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                         {isRsvpSubmitting ? (
                           <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                             <Music size={16} />
                           </motion.div>
                         ) : "Kirim Konfirmasi"}
                      </button>
                  </div>
               </div>
             </div>

             {/* LUXURY SUCCESS MODAL */}
             <AnimatePresence>
                {rsvpSubmitted && (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }} 
                    className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-stone-900/40 backdrop-blur-md"
                  >
                     <motion.div 
                       initial={{ scale: 0.9, y: 20 }} 
                       animate={{ scale: 1, y: 0 }} 
                       className="bg-[#FCFBF7] p-10 md:p-16 rounded-[40px] shadow-3xl max-w-lg w-full text-center border border-[#D4AF37]/20 relative overflow-hidden"
                     >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#D4AF37] via-[#FBF9F2] to-[#D4AF37]" />
                        <div className="w-20 h-20 bg-[#D4AF37] rounded-full flex items-center justify-center text-white mx-auto mb-8 shadow-xl">
                           <Check size={40} strokeWidth={3} />
                        </div>
                        <h3 className="text-4xl md:text-5xl font-['Birthstone'] text-[#D4AF37] mb-6">Terima Kasih!</h3>
                        <p className="text-stone-600 font-serif italic text-lg leading-relaxed mb-10">
                           "Konfirmasi kehadiran Anda telah kami terima. Doa restu Anda adalah kado terindah bagi kami."
                        </p>
                        <button 
                           onClick={() => setRsvpSubmitted(false)}
                           className="px-12 py-4 bg-stone-900 text-white rounded-full text-[10px] font-bold tracking-widest uppercase hover:bg-stone-800 transition-all"
                        >
                           Tutup
                        </button>
                     </motion.div>
                  </motion.div>
                )}
             </AnimatePresence>
          </section>

          {/* GIFT & EVENT SECTION */}
          <section className="py-24 md:py-48 bg-[#FCFBF7] px-6">
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
               {/* BCA Transfer */}
               <div className="bg-stone-900 text-[#FCFBF7] p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
                  <p className="text-[#D4AF37] text-[10px] font-bold uppercase tracking-[0.4em] mb-10">BCA Transfer</p>
                  <p className="text-3xl lg:text-4xl font-bold font-sans tracking-[0.2em] mb-6">772 522 9101</p>
                  <p className="text-xs uppercase opacity-30 font-bold mb-12">Muhammad Izzet Sakovic Sahal</p>
                  <button onClick={() => copyToClipboard('7725229101')} className="px-8 py-3 bg-[#D4AF37] text-white rounded-full text-[10px] font-bold tracking-widest uppercase">
                    {copied ? 'Tersalin' : 'Salin Nomor'}
                  </button>
               </div>
               {/* Digital QRIS */}
               <div className="bg-[#FBF9F2] p-12 rounded-[3.5rem] shadow-xl border border-[#D4AF37]/10 flex flex-col items-center text-center">
                  <p className="text-[#D4AF37] text-[10px] font-bold uppercase tracking-[0.4em] mb-10">Cashless Gift</p>
                  <div className="w-48 h-48 bg-white p-3 rounded-[30px] shadow-sm mb-10">
                     <img src="/qris.png" alt="QRIS" className="w-full h-full object-contain" />
                  </div>
                  <p className="text-stone-400 text-[10px] uppercase font-bold tracking-widest">Kezia Mikayla Almahyra</p>
               </div>
            </div>
          </section>

          {/* GUEST BOOK (MODERN CHAT ROOM STYLE) */}
          <section className="py-24 md:py-48 bg-stone-900 text-white">
             <div className="max-w-4xl mx-auto px-6">
                <div className="text-center mb-16">
                  <div className="flex items-center justify-center gap-3 mb-6">
                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="w-3 h-3 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                    <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-stone-400">Live Guest Book</span>
                  </div>
                  <h2 className="text-5xl md:text-7xl font-['Birthstone'] text-[#D4AF37] mb-6">Ucapan & Doa Restu</h2>
                  <p className="text-stone-400 font-serif italic text-sm md:text-lg">"Bergabunglah dalam percakapan dan bagikan doa tulus Anda."</p>
                </div>

                <div className="bg-white/5 backdrop-blur-xl rounded-[40px] md:rounded-[60px] border border-white/10 overflow-hidden shadow-3xl flex flex-col h-[700px] md:h-[800px]">
                   
                   {/* Messages Timeline */}
                   <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-8 custom-scrollbar">
                      {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-stone-500 space-y-4">
                           <Send size={40} className="opacity-20" />
                           <p className="italic font-serif">Belum ada pesan. Jadilah yang pertama!</p>
                        </div>
                      ) : (
                        messages.map((m, i) => (
                          <motion.div 
                            initial={{ opacity: 0, x: -20 }} 
                            animate={{ opacity: 1, x: 0 }} 
                            key={i} 
                            className="flex items-start gap-4"
                          >
                             {/* Avatar */}
                             <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#C5A028] flex items-center justify-center text-white font-bold text-sm md:text-lg shadow-lg shrink-0">
                                {m.guest_name ? m.guest_name.charAt(0).toUpperCase() : 'T'}
                             </div>

                             {/* Bubble Content */}
                             <div className="flex flex-col gap-1 max-w-[85%]">
                                <div className="flex items-baseline gap-3 px-2">
                                   <span className="text-[10px] md:text-xs font-bold text-[#D4AF37] uppercase tracking-wider">{m.guest_name}</span>
                                   <span className="text-[8px] md:text-[10px] text-stone-500 font-sans">{m.timestamp}</span>
                                </div>
                                <div className="bg-white/5 border border-white/5 p-4 md:p-6 rounded-2xl rounded-tl-none shadow-sm backdrop-blur-sm relative group overflow-hidden">
                                   <div className="absolute top-0 left-0 w-1 h-full bg-[#D4AF37] opacity-20" />
                                   <p className="text-[#FCFBF7]/90 text-sm md:text-lg font-serif italic leading-relaxed">"{m.content}"</p>
                                </div>
                             </div>
                          </motion.div>
                        ))
                      )}
                   </div>

                   {/* Input Area */}
                   <div className="p-6 md:p-10 bg-black/20 border-t border-white/5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                         <div className="relative">
                            <input 
                              value={chatName} 
                              onChange={(e) => setChatName(e.target.value)} 
                              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:ring-1 focus:ring-[#D4AF37] outline-none transition-all" 
                              placeholder="Ketik Nama Anda..." 
                            />
                         </div>
                         <div className="flex gap-4">
                            <input 
                              value={inputValue} 
                              onChange={(e) => setInputValue(e.target.value)} 
                              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                              className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:ring-1 focus:ring-[#D4AF37] outline-none transition-all" 
                              placeholder="Ketik Doa Restu..."
                            />
                            <motion.button 
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={sendMessage} 
                              className="w-14 h-14 bg-[#D4AF37] text-white rounded-2xl flex items-center justify-center shadow-xl hover:bg-[#C5A028] transition-all shrink-0"
                            >
                              <Send size={20} />
                            </motion.button>
                         </div>
                      </div>
                      <p className="text-[9px] text-center text-stone-500 uppercase tracking-widest opacity-50">Tekan Enter untuk mengirim pesan</p>
                   </div>
                </div>
             </div>
          </section>

          <footer className="py-40 text-center bg-[#FCFBF7]">
            <h2 className="font-['Birthstone'] text-[10rem] md:text-[15rem] text-[#D4AF37] opacity-10 leading-none">Izzet & Kezia</h2>
            <p className="text-xs uppercase tracking-[1em] opacity-30 font-bold font-sans">Baraka Allahu Lakuma</p>
          </footer>
        </motion.div>
      )}
    </div>
  );
};

export default App;
