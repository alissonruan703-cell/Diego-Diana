/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Calendar, Camera, Share2, MapPin, Loader2, Play, Pause, ChevronRight, ChevronLeft, Sparkles, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';

// Messages for the story mode
const defaultMessages = [
  "Tudo começou em Maio de 2009...",
  "Diego & Diana: Uma história escrita pelas estrelas.",
  "Cada sorriso seu é minha paz.",
  "17 anos de cumplicidade e sonhos realizados.",
  "Nossa família é nosso maior tesouro.",
  "Pelo mundo, sempre de mãos dadas.",
  "O amor que floresce a cada Maio.",
  "Você é meu eterno sim.",
  "Bodas de Rosa: A suavidade de 17 anos juntos.",
  "Amo cada detalhe da nossa jornada.",
  "Diego & Diana: Para todo o sempre."
];

export default function App() {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isStoryMode, setIsStoryMode] = useState(false);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [storySlides, setStorySlides] = useState<any[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const clickSfx = useRef<HTMLAudioElement | null>(null);
  const popSfx = useRef<HTMLAudioElement | null>(null);
  const confettiInstance = useRef<any>(null);

  // Generate slides whenever images or messages change
  useEffect(() => {
    if (images.length === 0) return;

    const slides: any[] = [];
    let imagePointer = 0;
    let messagePointer = 0;

    // A pattern of layouts to cycle through
    const layoutPattern = ['text', 'single-image', 'double-image', 'single-image'];
    let patternCounter = 0;

    // Loop until all images are assigned
    while (imagePointer < images.length) {
      const type = layoutPattern[patternCounter % layoutPattern.length];
      patternCounter++;

      if (type === 'text') {
        slides.push({
          type: 'text',
          message: defaultMessages[messagePointer % defaultMessages.length],
          images: []
        });
        messagePointer++;
      } else if (type === 'single-image') {
        slides.push({
          type: 'single-image',
          images: [images[imagePointer]],
          message: defaultMessages[messagePointer % defaultMessages.length]
        });
        imagePointer += 1;
        messagePointer++;
      } else if (type === 'double-image') {
        // If only 1 image left, fallback to single-image
        if (imagePointer + 1 < images.length) {
          slides.push({
            type: 'double-image',
            images: [images[imagePointer], images[imagePointer + 1]],
            message: defaultMessages[messagePointer % defaultMessages.length]
          });
          imagePointer += 2;
          messagePointer++;
        } else {
          slides.push({
            type: 'single-image',
            images: [images[imagePointer]],
            message: defaultMessages[messagePointer % defaultMessages.length]
          });
          imagePointer += 1;
          messagePointer++;
        }
      }

      if (slides.length > 500) break; // Infinite loop protection
    }

    // Always end with a meaningful text slide if the last one wasn't text
    if (slides[slides.length - 1].type !== 'text') {
      slides.push({
        type: 'text',
        message: "Diego & Diana: Para todo o sempre.",
        images: []
      });
    }

    setStorySlides(slides);
  }, [images]);

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchImages = async () => {
    try {
      const response = await fetch('/api/images');
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("Failed to parse JSON response", text);
        throw new Error("Resposta do servidor inválida");
      }
      
      if (data.error) {
        setError(data.error);
      } else if (data.images && data.images.length > 0) {
        setImages(data.images);
      } else {
        setImages([
           'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&q=80',
           'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80',
           'https://images.unsplash.com/photo-1464347601390-25e2840a3b3a?auto=format&fit=crop&q=80',
           'https://images.unsplash.com/photo-1522673607200-16488bcdd397?auto=format&fit=crop&q=80'
        ]);
      }
    } catch (err) {
      console.error("Failed to fetch images", err);
      setError("Não foi possível carregar as imagens do Vercel Blob.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        await fetchImages();
        safeConfetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } else {
        const data = await response.json();
        alert(data.error || "Erro ao fazer upload");
      }
    } catch (err) {
      console.error("Upload error", err);
      alert("Erro ao conectar com o servidor para upload");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const safeConfetti = (options: any) => {
    if (typeof window === 'undefined') return;
    try {
      if (!confettiInstance.current) {
        const canvas = document.getElementById('story-confetti') as HTMLCanvasElement;
        if (canvas) {
          confettiInstance.current = confetti.create(canvas, {
            resize: true,
            useWorker: false
          });
        }
      }

      if (confettiInstance.current) {
        confettiInstance.current({
          ...options,
          zIndex: 9999,
        });
      }
    } catch (e) {
      console.warn("Confetti failed", e);
    }
  };

  useEffect(() => {
    fetchImages();

    // Celebration effect on mount
    const duration = 4 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      safeConfetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() * 0.5 } });
      safeConfetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() * 0.5 } });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(e => {
          if (e.name !== 'AbortError') {
            console.error("Audio failed", e);
          }
        });
      }
    }
  };

  useEffect(() => {
    const handleInit = () => {
      if (audioRef.current && !isPlaying) {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
          window.removeEventListener('click', handleInit);
          window.removeEventListener('touchstart', handleInit);
        }).catch(e => {
          if (e.name !== 'AbortError') {
             console.log("Autoplay blocked or interrupted");
          }
        });
      }
    };
    window.addEventListener('click', handleInit);
    window.addEventListener('touchstart', handleInit);
    return () => {
      window.removeEventListener('click', handleInit);
      window.removeEventListener('touchstart', handleInit);
    };
  }, [isPlaying]);

  const playSfx = (type: 'click' | 'pop') => {
    const sfx = type === 'click' ? clickSfx.current : popSfx.current;
    if (sfx) {
      sfx.currentTime = 0;
      sfx.play().catch(() => {});
    }
  };

  const nextStory = () => {
    playSfx('click');
    if (currentStoryIndex < storySlides.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
    } else {
      setIsStoryMode(false);
      setCurrentStoryIndex(0);
      safeConfetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.7 }
      });
    }
  };

  const prevStory = () => {
    playSfx('click');
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
    }
  };

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  if (loading) {
    return (
      <div className="min-h-screen bg-rose-50 flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 360] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="mb-8"
        >
          <Heart className="size-16 text-rose-500 fill-rose-500" />
        </motion.div>
        <h2 className="text-2xl font-serif text-rose-900 mb-2">Preparando nossa história...</h2>
        <p className="text-rose-400 font-light">Buscando as nossas melhores memórias</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fffafa] text-slate-800 font-sans selection:bg-rose-100 overflow-x-hidden">
      {/* Configuration Error Alert */}
      {error && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-50 border-b border-amber-200 p-4 text-center">
           <p className="text-amber-800 text-sm">
             <span className="font-bold">Nota:</span> {error} 
             <br />
             <span className="text-xs opacity-70">Enquanto isso, estamos exibindo algumas imagens de exemplo.</span>
           </p>
        </div>
      )}
      {/* Background Audio and SFX */}
      <audio 
        ref={audioRef} 
        loop 
        src="https://1zeobazjs4hzhzb8.public.blob.vercel-storage.com/YTDown_YouTube_Lady-Gaga-Bruno-Mars-Die-With-A-Smile-Of_Media_kPa7bsKwL-c_009_128k.mp3" 
      />
      <canvas id="story-confetti" className="fixed inset-0 pointer-events-none z-[1000]" />
      <audio ref={clickSfx} src="https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3" />
      <audio ref={popSfx} src="https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3" />

      {/* Animated Handwriting Illustration (Sketchy Style) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Animated Drawing 1: Floating Couple Sketch */}
        <motion.div
           animate={{ 
             y: [0, -30, 0],
             rotate: [-2, 2, -2],
             scale: [1, 1.05, 1]
           }}
           transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
           className="absolute bottom-[10%] left-[5%] opacity-[0.25] hidden md:block"
        >
          <svg width="320" height="320" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <motion.path 
              d="M60 70 Q70 50 80 70 Q70 90 60 70 M120 70 Q130 50 140 70 Q130 90 120 70" 
              stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 4, repeat: Infinity, repeatDelay: 2 }}
            />
            <motion.path 
              d="M70 90 Q100 110 130 90 M70 90 L60 160 M130 90 L140 160" 
              stroke="#fb7185" strokeWidth="2" strokeLinecap="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 5, repeat: Infinity, delay: 1 }}
            />
            <motion.path 
              d="M100 55 C80 25 45 45 100 110 C155 45 120 25 100 55" 
              stroke="#f43f5e" strokeWidth="4" strokeLinecap="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 6, repeat: Infinity, delay: 0.5 }}
            />
            <path d="M30 140 Q100 160 170 140" stroke="#fda4af" strokeWidth="1.5" strokeDasharray="6 6" />
          </svg>
        </motion.div>
        
        {/* Animated Drawing 2: Heart Tree Sketch */}
        <motion.div
           animate={{ 
             y: [0, 40, 0],
             x: [0, 20, 0],
             rotate: [0, 5, 0],
             scale: [1, 1.1, 1]
           }}
           transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
           className="absolute top-[8%] right-[5%] opacity-[0.2] hidden lg:block"
        >
          <svg width="280" height="380" viewBox="0 0 100 150">
             <motion.path 
               d="M50 140 Q50 100 50 60" 
               stroke="#f43f5e" strokeWidth="5" strokeLinecap="round"
               initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 3, repeat: Infinity }}
             />
             {[0, 1, 2, 3].map((i) => (
               <motion.path 
                 key={i}
                 d={`M50 ${80 - i*15} Q${i%2 ? 25 : 75} ${70 - i*15} ${i%2 ? 15 : 85} ${60 - i*15}`} 
                 stroke="#fb7185" strokeWidth="3"
                 initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 4, delay: i * 0.5, repeat: Infinity }}
               />
             ))}
             <motion.path 
                d="M50 35 C25 0 0 25 50 65 C100 25 75 0 50 35" 
                fill="#fecdd3" opacity="0.6" 
                animate={{ scale: [1, 1.2, 1], rotate: [-5, 5, -5] }} 
                transition={{ duration: 4, repeat: Infinity }}
             />
          </svg>
        </motion.div>

        {/* Floating Stars/Sparkles */}
        {[1,2,3,4,5].map(i => (
          <motion.div
            key={i}
            animate={{ 
              opacity: [0, 1, 0],
              scale: [0.5, 1.2, 0.5],
              y: [0, -100, 0]
            }}
            transition={{ 
              duration: 5 + i, 
              repeat: Infinity, 
              delay: i * 2,
              ease: "easeInOut" 
            }}
            className="absolute text-rose-300"
            style={{ 
              left: `${i * 20 - 10}%`, 
              top: `${(i % 3) * 30 + 10}%` 
            }}
          >
            <Sparkles size={20 + i * 10} />
          </motion.div>
        ))}
      </div>

      {/* Floating Audio Control */}
      <button 
        onClick={toggleAudio}
        className="fixed bottom-6 right-6 z-50 bg-white/90 backdrop-blur-md p-4 rounded-full shadow-2xl border border-rose-100 text-rose-500 hover:scale-110 transition-transform flex items-center gap-2 group"
      >
        {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 whitespace-nowrap text-xs font-serif italic pr-2">
          {isPlaying ? "Nossa trilha" : "Ouvir nossa música"}
        </span>
      </button>

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-rose-50/20 py-20 px-4">
        {/* Animated Background Gradients */}
        <div className="absolute inset-0 pointer-events-none opacity-40">
           <motion.div 
             animate={{ 
               scale: [1, 1.2, 1],
               rotate: [0, 90, 0],
               x: [0, 100, 0],
               y: [0, 50, 0]
             }}
             transition={{ duration: 20, repeat: Infinity }}
             className="absolute top-0 -left-20 w-96 h-96 bg-rose-300 rounded-full blur-[120px]" 
           />
           <motion.div 
             animate={{ 
               scale: [1.2, 1, 1.2],
               rotate: [0, -90, 0],
               x: [0, -100, 0],
               y: [0, -50, 0]
             }}
             transition={{ duration: 15, repeat: Infinity }}
             className="absolute bottom-0 -right-20 w-96 h-96 bg-pink-200 rounded-full blur-[120px]" 
           />
        </div>

        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 p-2 h-full opacity-50">
            {images.map((img, i) => (
              <img key={i} src={img} alt="" className="w-full h-full object-cover rounded-lg grayscale" referrerPolicy="no-referrer" />
            ))}
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="relative z-10 text-center w-full max-w-5xl"
        >
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex justify-center mb-8"
          >
            <div className="relative group">
              <Heart className="text-rose-500 fill-rose-500 size-20 drop-shadow-lg" />
              <motion.div 
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.2, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-rose-400 rounded-full blur-2xl -z-10"
              />
            </div>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="text-5xl md:text-8xl lg:text-9xl font-serif text-rose-950 mb-3 md:mb-6 tracking-tighter leading-[1.1] md:leading-[0.9]"
          >
            Diego & Diana
          </motion.h1>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="flex items-center justify-center gap-2 md:gap-6 mb-4 md:mb-8"
          >
            <div className="h-px w-4 md:w-16 bg-rose-300" />
            <p className="text-lg md:text-4xl text-rose-800 font-serif italic text-shadow-sm whitespace-nowrap">
               17 Anos Juntos
            </p>
            <div className="h-px w-4 md:w-16 bg-rose-300" />
          </motion.div>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="text-sm md:text-xl lg:text-2xl text-rose-700/70 font-light max-w-2xl mx-auto uppercase tracking-[0.2em] md:tracking-[0.4em] mb-8 md:mb-12 leading-relaxed"
          >
            Bodas de Rosa • Desde Maio de 2009
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 mb-20 md:mb-32"
          >
            <button 
              onClick={() => {
                playSfx('pop');
                setIsStoryMode(true);
                if (!isPlaying) toggleAudio();
              }}
              className="group relative flex items-center gap-3 bg-rose-500 text-white px-8 md:px-12 py-4 md:py-5 rounded-full shadow-2xl hover:bg-rose-600 transition-all font-medium text-lg md:text-xl overflow-hidden w-full sm:w-auto justify-center active:scale-95"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <Sparkles size={24} className="group-hover:scale-125 transition-transform" />
              Nossa História
            </button>
            <button 
              onClick={() => setShowQR(!showQR)}
              className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-rose-100 px-8 py-4 md:py-5 rounded-full shadow-lg hover:shadow-xl transition-all text-rose-800 font-medium cursor-pointer w-full sm:w-auto justify-center active:scale-95"
            >
              <Share2 size={20} />
              {showQR ? "Fechar QR" : "Compartilhar"}
            </button>
          </motion.div>
        </motion.div>

        <motion.div 
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2.5 }}
          className="absolute bottom-10 md:bottom-12 left-1/2 -translate-x-1/2 text-rose-400 opacity-50 flex flex-col items-center gap-2"
        >
          <span className="text-[10px] uppercase tracking-[0.3em] font-mono">Deslize para ver</span>
          <div className="w-6 h-10 border-2 border-rose-300 rounded-full flex justify-center p-1">
            <motion.div 
              animate={{ opacity: [1, 0, 1] }} 
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-1 h-2 bg-rose-400 rounded-full" 
            />
          </div>
        </motion.div>
      </section>

      {/* Intro Message Section */}
      <section className="relative bg-white py-32 px-6 overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
          >
            <h2 className="text-5xl md:text-7xl font-serif text-rose-950 mb-16 italic leading-tight text-shadow-sm">
              "Dezessete anos caminhando lado a lado."
            </h2>
            <div className="space-y-10 text-xl md:text-2xl text-slate-700 leading-relaxed max-w-3xl mx-auto font-light">
              <p className="relative">
                <span className="absolute -left-8 -top-8 text-8xl text-rose-100 font-serif -z-10 select-none">“</span>
                Tudo começou em <span className="font-serif italic text-rose-600 font-medium">Maio de 2009</span>. Dezessete anos se passaram, e cada dia tem sido uma prova de que fomos feitos um para o outro.
              </p>
              <p>
                As <strong>Bodas de Rosa</strong> refletem a suavidade e a beleza da nossa jornada. Diana, seu sorriso é minha bússola. Diego, sua força é meu porto seguro.
              </p>
              <motion.p 
                whileHover={{ scale: 1.02 }}
                className="bg-rose-50 p-10 rounded-[2.5rem] border border-rose-100 text-rose-900 italic font-serif text-2xl shadow-inner-lg"
              >
                "Obrigado por cada memória, cada desafio superado e por construir essa família linda comigo. Diego & Diana, para todo o sempre."
              </motion.p>
              <p className="text-sm font-mono tracking-[0.5em] text-rose-300 uppercase">Desde 2009 — Para a Eternidade</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQR && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-rose-950/40 backdrop-blur-xl"
            onClick={() => setShowQR(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="flex flex-col items-center justify-center p-12 bg-white rounded-[3rem] shadow-2xl max-w-sm w-full border border-rose-50 overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-rose-500" />
              <h3 className="text-rose-950 font-serif text-3xl mb-8 text-center tracking-tight">Nossa História</h3>
              <div className="p-8 bg-rose-50 rounded-[2rem] shadow-inner mb-8 border border-rose-100">
                <QRCodeSVG value={currentUrl} size={200} fgColor="#881337" />
              </div>
              <p className="text-rose-400 text-xs font-mono mb-8 break-all text-center px-4">{currentUrl}</p>
              <button 
                onClick={() => setShowQR(false)}
                className="w-full bg-rose-500 text-white py-4 rounded-full font-medium hover:bg-rose-600 transition-all shadow-lg hover:shadow-rose-200"
              >
                Fechar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Story Mode */}
      <AnimatePresence>
        {isStoryMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-rose-950 flex items-center justify-center overflow-hidden"
          >
            {/* Ambient Background */}
            <div className="absolute inset-0 flex items-center justify-center opacity-40 blur-3xl scale-125">
               <motion.img 
                  key={`bg-${currentStoryIndex}`}
                  src={storySlides[currentStoryIndex]?.images?.[0] || (images.length > 0 ? images[0] : "")} 
                  className="w-full h-full object-cover transition-all duration-1000" 
                  referrerPolicy="no-referrer" 
               />
            </div>

            <div className="relative z-10 w-full max-w-7xl h-full flex flex-col items-center justify-between py-6 md:py-8 px-4">
              {/* Close Button */}
              <button 
                onClick={() => {
                  playSfx('click');
                  setIsStoryMode(false);
                  setCurrentStoryIndex(0);
                }}
                className="absolute top-4 right-4 md:top-6 md:right-8 text-white/50 hover:text-white transition-colors z-[130] bg-white/5 hover:bg-white/10 p-2 md:p-3 rounded-full backdrop-blur-md border border-white/10"
              >
                <X className="size-6 md:size-8" />
              </button>

              {/* Side Navigation - Left */}
              <button 
                onClick={prevStory}
                disabled={currentStoryIndex === 0}
                className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 p-2 md:p-4 bg-white/5 hover:bg-white/10 rounded-full text-white disabled:opacity-0 transition-all border border-white/5 active:scale-95 z-[110] backdrop-blur-sm"
                aria-label="Anterior"
              >
                <ChevronLeft className="size-8 md:size-12" />
              </button>

              {/* Side Navigation - Right */}
              <button 
                onClick={nextStory}
                className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 p-2 md:p-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white shadow-2xl flex items-center justify-center transition-all border border-white/20 active:scale-95 z-[110] group"
                aria-label="Próximo"
              >
                <ChevronRight className="size-8 md:size-14" />
              </button>

              <div className="w-full flex-1 flex flex-col items-center justify-center min-h-0 pt-16 md:pt-14 overflow-hidden relative">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStoryIndex}
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 1.05, y: -20 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full flex-1 flex flex-col items-center justify-center"
                  >
                    <div className="w-full max-w-5xl flex flex-col items-center justify-center gap-6 md:gap-10">
                      {/* Variety Layouts based on slide type */}
                      {storySlides[currentStoryIndex]?.type === 'text' ? (
                        /* Type: TEXT ONLY */
                        <div className="py-10 md:py-20 px-8 text-center relative max-w-3xl">
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 0.15 }}
                            className="absolute inset-0 flex items-center justify-center -z-10"
                          >
                             <Heart className="fill-white size-32 md:size-48" />
                          </motion.div>
                          <motion.h4 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-white text-xl md:text-4xl lg:text-5xl font-serif italic drop-shadow-xl leading-tight"
                          >
                            {storySlides[currentStoryIndex].message}
                          </motion.h4>
                        </div>
                      ) : storySlides[currentStoryIndex]?.type === 'single-image' ? (
                        /* Type: IMAGE ONLY */
                        <div className="w-full h-full flex flex-col items-center px-4">
                           <div className="w-full max-w-sm md:max-w-4xl max-h-[60vh] md:max-h-[70vh] rounded-[2rem] md:rounded-[3rem] overflow-hidden border border-white/20 shadow-2xl bg-black/30 flex items-center justify-center">
                             <img 
                               src={storySlides[currentStoryIndex].images[0]} 
                               className="w-full h-full object-contain"
                               alt="Memória"
                               referrerPolicy="no-referrer"
                             />
                           </div>
                           <motion.p 
                             initial={{ opacity: 0 }}
                             animate={{ opacity: 0.5 }}
                             transition={{ delay: 0.4 }}
                             className="mt-6 text-white text-[10px] md:text-xs font-mono tracking-[0.3em] uppercase text-center max-w-xl"
                           >
                             {storySlides[currentStoryIndex].message}
                           </motion.p>
                        </div>
                      ) : storySlides[currentStoryIndex]?.type === 'double-image' ? (
                        /* Type: MIXED - Two images */
                        <div className="flex flex-col items-center gap-6 w-full h-full px-6">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-5xl justify-items-center">
                              {storySlides[currentStoryIndex].images.map((img: string, idx: number) => (
                                <motion.div 
                                  key={idx}
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: 0.1 + idx * 0.1 }}
                                  className={`rounded-[1.5rem] md:rounded-[2rem] overflow-hidden border border-white/10 shadow-xl bg-black/40 h-56 md:h-80 lg:h-[450px] w-full flex items-center justify-center`}
                                >
                                  <img 
                                    src={img} 
                                    className="w-full h-full object-contain" 
                                    referrerPolicy="no-referrer" 
                                    alt=""
                                  />
                                </motion.div>
                              ))}
                           </div>
                           <h4 className="text-white text-lg md:text-3xl font-serif italic text-center drop-shadow-lg max-w-xl leading-relaxed">
                             {storySlides[currentStoryIndex].message}
                           </h4>
                        </div>
                      ) : (
                        <div className="text-white text-center">
                          <p>Nenhuma imagem para exibir ainda.</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-8 flex items-center justify-center gap-2 opacity-20">
                       <span className="text-rose-100 font-mono text-[9px] md:text-[10px] tracking-widest uppercase">
                         Parte {currentStoryIndex + 1}
                       </span>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Progress Bar (at the bottom) */}
              <div className="w-full max-w-xl flex flex-col items-center pb-8 md:pb-12 relative z-20">
                <div className="flex justify-between w-full h-1 gap-1 md:gap-2 px-10">
                   {storySlides.map((_, i) => (
                     <motion.div 
                        key={i} 
                        initial={false}
                        animate={{ 
                           backgroundColor: i === currentStoryIndex ? "#f43f5e" : i < currentStoryIndex ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)",
                           scaleY: i === currentStoryIndex ? 2 : 1
                        }}
                        className="rounded-full flex-1 h-full"
                     />
                   ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gallery Section */}
      <section id="galeria" className="max-w-7xl mx-auto px-6 py-32">
        <div className="text-center mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-rose-500 font-mono text-sm tracking-[0.5em] uppercase mb-4 block">Álbum de Memórias</span>
            <h2 className="text-6xl font-serif text-rose-950 tracking-tight">Diego & Diana</h2>
            <p className="text-rose-400 mt-4 text-xl font-serif italic">Capítulos de uma vida juntos</p>
            <div className="h-0.5 w-32 bg-rose-100 mx-auto mt-8 rounded-full" />
            
            {/* Hidden File Input */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleUpload} 
              accept="image/*" 
              className="hidden" 
            />
            
            {/* Upload Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="mt-12 inline-flex items-center gap-2 bg-rose-100 text-rose-700 px-8 py-3 rounded-full hover:bg-rose-200 transition-colors font-medium border border-rose-200 shadow-sm disabled:opacity-50"
            >
              <div className={isUploading ? "animate-spin" : ""}>
                {isUploading ? <Loader2 size={18} /> : <Camera size={18} />}
              </div>
              {isUploading ? "Enviando..." : "Adicionar Foto Especial"}
            </motion.button>
          </motion.div>
        </div>

        <div className="columns-1 sm:columns-2 lg:columns-3 gap-10 space-y-10">
          {images.map((img, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8, delay: (index % 3) * 0.15 }}
              onClick={() => {
                playSfx('pop');
                setSelectedImage(img);
              }}
              className="relative group cursor-pointer overflow-hidden rounded-[3rem] bg-rose-50 shadow-sm hover:shadow-2xl transition-all duration-700 hover:-translate-y-2"
            >
              <img 
                src={img} 
                alt={`Momento ${index + 1}`} 
                className="w-full h-auto object-cover transform transition-transform duration-1000 group-hover:scale-105"
                referrerPolicy="no-referrer"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-rose-950/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-end p-10">
                <Heart className="text-white fill-white size-10 mb-4" />
                <span className="text-white/80 font-mono text-xs tracking-widest uppercase">Ver Detalhes</span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-32 text-center text-rose-950/20 bg-rose-50/10">
        <div className="flex justify-center gap-16 mb-12 text-rose-200">
           <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 4 }}><Calendar size={32} /></motion.div>
           <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 4, delay: 1 }}><MapPin size={32} /></motion.div>
           <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 4, delay: 2 }}><Heart size={32} /></motion.div>
        </div>
        <p className="font-serif italic text-3xl text-rose-950/40 mb-4">Diego & Diana</p>
        <p className="text-[10px] uppercase tracking-[0.6em] font-mono mb-8">Maio de 2009 — Infinito</p>
        <div className="h-px w-24 bg-rose-100 mx-auto" />
      </footer>

      {/* Lightbox / Image Zoom */}
      <AnimatePresence>
        {selectedImage && !isStoryMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 z-[110] bg-black/95 flex items-center justify-center p-4 backdrop-blur-2xl cursor-zoom-out"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative max-w-7xl max-h-[90vh] flex flex-col items-center"
            >
              <img
                src={selectedImage}
                alt="Momento Ampliado"
                className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border-4 border-white/5"
                referrerPolicy="no-referrer"
              />
              <button 
                className="absolute -top-12 -right-12 text-white/50 hover:text-white p-4 transition-colors"
                onClick={() => setSelectedImage(null)}
              >
                <ChevronRight size={48} className="rotate-45" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700;1,900&family=Inter:wght@100;200;300;400;500;600&display=swap');
        
        :root {
          --font-sans: 'Inter', sans-serif;
          --font-serif: 'Playfair Display', serif;
        }

        .font-serif { font-family: var(--font-serif); }
        .font-sans { font-family: var(--font-sans); }
        
        /* Smooth Scrolling */
        html { scroll-behavior: smooth; }

        /* Custom Scrollbar */
        ::-webkit-scrollbar { width: 10px; }
        ::-webkit-scrollbar-track { background: #fffafa; }
        ::-webkit-scrollbar-thumb { background: #fecdd3; border-radius: 5px; }
        ::-webkit-scrollbar-thumb:hover { background: #fda4af; }

        .text-shadow-sm { text-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .shadow-inner-lg { box-shadow: inset 0 2px 10px rgba(159, 18, 57, 0.05); }
      `}} />
    </div>
  );
}
