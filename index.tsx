
import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenAI, Modality } from "@google/genai";

// --- Types ---

type AnimationType = "anim-heave" | "anim-float" | "anim-wiggle" | "anim-glitch" | "anim-jelly" | "anim-doze";

type Hero = {
  id: string;
  name: string;
  emoji: string;
  trait: string;
  promptDesc: string;
  color: string;
  shadow: string;
  animation: AnimationType;
};

type Worry = {
  id: string;
  name: string;
  emoji: string;
  monsterName: string;
  promptDesc: string;
  color: string;
  shadow: string;
  animation: AnimationType;
};

type AdventureState = "hero-select" | "photo-upload" | "worry-select" | "loading" | "mission-briefing";

// --- Data ---

const HEROES: Hero[] = [
  { id: "dino", name: "霸王龙", emoji: "🦖", trait: "强壮", promptDesc: "A cute T-Rex dinosaur wearing a superhero cape, 3d pixar style, friendly smile", color: "#FCD34D", shadow: "#D97706", animation: "anim-heave" },
  { id: "elsa", name: "冰雪公主", emoji: "❄️", trait: "魔法", promptDesc: "A cute ice princess with a sparkling blue dress and crown, 3d pixar style, magical", color: "#7DD3FC", shadow: "#0284C7", animation: "anim-float" },
  { id: "paw", name: "汪汪队", emoji: "🐶", trait: "勇敢", promptDesc: "A cute rescue puppy with a high-tech backpack and helmet, 3d pixar style, heroic pose", color: "#FDA4AF", shadow: "#E11D48", animation: "anim-wiggle" },
  { id: "robot", name: "机甲战士", emoji: "🤖", trait: "聪明", promptDesc: "A cute futuristic robot with glowing lights, rounded edges, 3d pixar style, friendly", color: "#A78BFA", shadow: "#7C3AED", animation: "anim-glitch" },
];

const WORRIES: Worry[] = [
  { id: "miss_mom", name: "想妈妈", emoji: "🥺", monsterName: "黏黏怪", promptDesc: "A cute round sticky slime monster, pink color, slightly sad eyes, 3d pixar style, soft texture", color: "#FCA5A5", shadow: "#B91C1C", animation: "anim-jelly" },
  { id: "food", name: "不吃饭", emoji: "🥦", monsterName: "挑食魔王", promptDesc: "A funny broccoli monster with a grumpy face, 3d pixar style, vegetable texture", color: "#86EFAC", shadow: "#15803D", animation: "anim-heave" },
  { id: "nap", name: "不睡觉", emoji: "💤", monsterName: "瞌睡虫", promptDesc: "A sleepy pillow-shaped monster with heavy eyelids, holding a blanket, 3d pixar style", color: "#C4B5FD", shadow: "#6D28D9", animation: "anim-doze" },
  { id: "shy", name: "害羞", emoji: "😶", monsterName: "静音幽灵", promptDesc: "A shy cute ghost, semi-transparent white, hiding behind hands, 3d pixar style", color: "#CBD5E1", shadow: "#475569", animation: "anim-float" },
];

// --- Audio Utilities ---

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// --- 3D / Animation Components ---

const TiltCard = ({ 
    children, 
    isSelected, 
    onClick, 
    color, 
    shadow 
}: { 
    children: React.ReactNode, 
    isSelected: boolean, 
    onClick: () => void, 
    color: string, 
    shadow: string 
}) => {
    const [rotate, setRotate] = useState({ x: 0, y: 0 });
    const cardRef = useRef<HTMLDivElement>(null);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        // Calculate rotation based on cursor position (max 15 degrees)
        const rotateX = ((y - centerY) / centerY) * -10; 
        const rotateY = ((x - centerX) / centerX) * 10;

        setRotate({ x: rotateX, y: rotateY });
    };

    const handleMouseLeave = () => {
        setRotate({ x: 0, y: 0 });
    };

    return (
        <div 
            ref={cardRef}
            onClick={onClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
                perspective: '1000px',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
                zIndex: isSelected ? 10 : 1
            }}
        >
            <div style={{
                background: 'white',
                borderRadius: '24px',
                border: isSelected ? `6px solid ${color}` : '6px solid white',
                boxShadow: isSelected 
                    ? `0 20px 30px ${shadow}66, 0 0 0 4px white` 
                    : '0 10px 20px rgba(0,0,0,0.05), 0 6px 0 rgba(0,0,0,0.05)',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) scale(${isSelected ? 1.05 : 1})`,
                transition: 'transform 0.1s ease-out, box-shadow 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
                height: '100%',
                boxSizing: 'border-box'
            }}>
                {children}
                
                {/* Gloss Effect */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 60%)',
                    pointerEvents: 'none',
                    borderRadius: '18px'
                }}></div>
                
                {isSelected && <div style={{
                    position: 'absolute', 
                    top: 10, 
                    right: 10, 
                    fontSize: '20px', 
                    background: '#10B981',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    boxShadow: '0 4px 0 #059669',
                    zIndex: 20
                }}>✓</div>}
            </div>
        </div>
    );
};

const LiveAsset = ({ 
    item, 
    assetUrl,
    isLoading
}: { 
    item: Hero | Worry, 
    assetUrl?: string,
    isLoading?: boolean
}) => {
    // Generate a consistent random delay based on item ID so it looks natural but persists
    const randomDelay = useRef(Math.random() * -5).current;

    return (
        <div style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '1/1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '10px'
        }}>
            {assetUrl ? (
                <img 
                    src={assetUrl} 
                    style={{
                        width: '120%', 
                        height: '120%', 
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 10px 10px rgba(0,0,0,0.2))',
                        animation: `${item.animation} 4s ease-in-out infinite`,
                        animationDelay: `${randomDelay}s`,
                        transformOrigin: 'bottom center',
                        willChange: 'transform' // Optimize performance
                    }} 
                />
            ) : (
                <div style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <div style={{
                        fontSize: '60px', 
                        filter: isLoading ? 'blur(2px) grayscale(0.5)' : 'drop-shadow(0 4px 0 rgba(0,0,0,0.1))',
                        animation: isLoading ? 'pulse 1s infinite' : 'none',
                        transition: 'all 0.5s ease',
                        opacity: isLoading ? 0.7 : 1
                    }}>
                        {item.emoji}
                    </div>
                    {isLoading && (
                        <div style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                             <div style={{
                                 width: '40px', height: '40px',
                                 border: `4px solid ${item.color}`,
                                 borderTop: '4px solid transparent',
                                 borderRadius: '50%',
                                 animation: 'spin 1s linear infinite'
                             }}></div>
                        </div>
                    )}
                </div>
            )}
            
            {/* Sparkles for loading finished or alive effect could go here */}
        </div>
    );
};

const GameButton = ({ 
  onClick, 
  children, 
  color = "#60A5FA", 
  shadow = "#2563EB", 
  disabled = false,
  style = {}
}: { onClick: () => void, children: React.ReactNode, color?: string, shadow?: string, disabled?: boolean, style?: React.CSSProperties }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? '#E2E8F0' : color,
        boxShadow: disabled ? '0 6px 0 #94A3B8' : `0 8px 0 ${shadow}, 0 15px 20px rgba(0,0,0,0.15)`,
        color: disabled ? '#94A3B8' : 'white',
        border: 'none',
        borderRadius: '25px',
        padding: '15px 30px',
        fontSize: '22px',
        fontWeight: 'bold',
        fontFamily: "'Fredoka', sans-serif",
        cursor: disabled ? 'not-allowed' : 'pointer',
        transform: disabled ? 'none' : 'translateY(0)',
        transition: 'all 0.1s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        position: 'relative',
        width: '100%',
        textShadow: disabled ? 'none' : '1px 1px 0 rgba(0,0,0,0.2)',
        overflow: 'hidden',
        ...style
      }}
      onMouseDown={(e) => {
        if (!disabled) {
            e.currentTarget.style.transform = 'translateY(6px)';
            e.currentTarget.style.boxShadow = `0 2px 0 ${shadow}`;
        }
      }}
      onMouseUp={(e) => {
        if (!disabled) {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = `0 8px 0 ${shadow}, 0 15px 20px rgba(0,0,0,0.15)`;
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = `0 8px 0 ${shadow}, 0 15px 20px rgba(0,0,0,0.15)`;
        }
      }}
    >
      {/* Shine effect */}
      <div style={{
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: 'linear-gradient(to bottom right, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0) 100%)',
          transform: 'rotate(30deg)',
          pointerEvents: 'none'
      }}></div>
      <div style={{position: 'relative', zIndex: 1}}>{children}</div>
    </button>
  );
};

// --- Main App Component ---

const App = () => {
  const [step, setStep] = useState<AdventureState>("hero-select");
  const [selectedHero, setSelectedHero] = useState<Hero | null>(null);
  const [userPhotos, setUserPhotos] = useState<string[]>([]);
  const [selectedWorry, setSelectedWorry] = useState<Worry | null>(null);
  
  const [assetCache, setAssetCache] = useState<Record<string, string>>({});
  const [generatingAssets, setGeneratingAssets] = useState<Set<string>>(new Set());

  // Results
  const [storyText, setStoryText] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Asset Generation System ---
  useEffect(() => {
    // 1. Load Photos
    const savedPhotos = localStorage.getItem("khero_user_photos");
    if (savedPhotos) {
      try {
        const parsed = JSON.parse(savedPhotos);
        if (Array.isArray(parsed) && parsed.length > 0) setUserPhotos(parsed);
      } catch (e) { console.error("Failed to load saved photos"); }
    }

    // 2. Load Asset Cache
    const savedAssets = localStorage.getItem("khero_asset_cache");
    const currentCache = savedAssets ? JSON.parse(savedAssets) : {};
    setAssetCache(currentCache);

    // 3. Generate Missing Assets (Parallelized)
    const generateMissingAssets = async () => {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const itemsToGenerate = [...HEROES, ...WORRIES].filter(item => !currentCache[item.id]);

        if (itemsToGenerate.length === 0) return;

        // Mark as generating
        setGeneratingAssets(prev => {
            const next = new Set(prev);
            itemsToGenerate.forEach(item => next.add(item.id));
            return next;
        });

        // Batch requests to speed up (3 at a time)
        const BATCH_SIZE = 3;
        for (let i = 0; i < itemsToGenerate.length; i += BATCH_SIZE) {
            const batch = itemsToGenerate.slice(i, i + BATCH_SIZE);
            
            await Promise.all(batch.map(async (item) => {
                try {
                    const response = await ai.models.generateContent({
                        model: "gemini-2.5-flash-image",
                        contents: {
                            parts: [{
                                text: `Generate a high-quality 3D rendered icon of: ${item.name} (${item.promptDesc}). 
                                       Style: Pixar animation style, soft studio lighting, cute, vibrant colors, clay material, isometric view. 
                                       White background. No text. High resolution.`
                            }]
                        }
                    });

                    const parts = response.candidates?.[0]?.content?.parts;
                    let assetBase64 = null;
                    if (parts) {
                        for (const part of parts) {
                            if (part.inlineData) {
                                assetBase64 = `data:image/png;base64,${part.inlineData.data}`;
                                break;
                            }
                        }
                    }

                    if (assetBase64) {
                        setAssetCache(prev => {
                            const newState = {...prev, [item.id]: assetBase64!};
                            // Attempt to save to local storage
                            try {
                                localStorage.setItem("khero_asset_cache", JSON.stringify(newState));
                            } catch (e) {
                                console.warn("LocalStorage quota exceeded, asset will be memory-only for this session.");
                            }
                            return newState;
                        });
                    }
                } catch (e) {
                    console.error("Asset Gen Failed", item.id, e);
                } finally {
                    setGeneratingAssets(prev => {
                        const next = new Set(prev);
                        next.delete(item.id);
                        return next;
                    });
                }
            }));
        }
    };

    // Delay slightly to let UI render first
    setTimeout(generateMissingAssets, 500);

  }, []);

  const handleHeroNext = () => {
    if (userPhotos.length > 0) {
      setStep("worry-select");
    } else {
      setStep("photo-upload");
    }
  };

  const clearPhotos = () => {
    if (confirm("要重新录入照片吗？")) {
      localStorage.removeItem("khero_user_photos");
      setUserPhotos([]);
      setStep("photo-upload");
    }
  };

  const resetAssets = () => {
      if (confirm("要重新生成所有游戏图标吗？(需要一点时间)")) {
          localStorage.removeItem("khero_asset_cache");
          setAssetCache({});
          window.location.reload();
      }
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newPhotos: string[] = [];
      let loadedCount = 0;
      const filesToProcess = Array.from(files).slice(0, 3);
      
      filesToProcess.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) {
            newPhotos.push(reader.result as string);
            loadedCount++;
            if (loadedCount === filesToProcess.length) {
              setUserPhotos(newPhotos);
              try {
                localStorage.setItem("khero_user_photos", JSON.stringify(newPhotos));
              } catch (err) {
                console.error("Storage full or error", err);
                alert("照片有点大，可能无法保存到下次哦。建议用小一点的图。");
              }
            }
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const startMission = async () => {
    if (!selectedHero || !selectedWorry) return;
    setStep("loading");

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const textPrompt = `
        Target: 3-year-old child.
        Context: The child is playing a game to overcome fear of Kindergarten.
        Characters: Hero "${selectedHero.name}" vs Monster "${selectedWorry.monsterName}".
        Task: Write a simplified Chinese mission text (Max 40 words).
        Structure: 1. Identify problem. 2. Give solution. 3. Set goal.
        Tone: Exciting, Encouraging.
      `;

      let imageParts: any[] = [];
      if (userPhotos.length > 0) {
        userPhotos.forEach(photo => {
           const base64Data = photo.split(',')[1];
           imageParts.push({ inlineData: { data: base64Data, mimeType: 'image/jpeg' } });
        });
      }

      const promptString = `
        Reference Images: The images provided are of a specific real boy.
        Task: Generate a high-quality 3D Disney/Pixar style cartoon image of THIS EXACT BOY.
        CRITICAL: PRESERVE facial features (eye shape, nose, mouth).
        Scene: The boy in a cool ${selectedHero.name} costume (${selectedHero.promptDesc}) in a kindergarten playground.
        He is facing a cute, funny monster: ${selectedWorry.monsterName}.
        Style: 3D render, mobile game asset, vibrant colors, expressive face, soft lighting, 8k.
      `;
      
      imageParts.push({ text: promptString });

      const [textResponse, imageResponse] = await Promise.all([
          ai.models.generateContent({ model: "gemini-2.5-flash", contents: textPrompt }),
          ai.models.generateContent({ model: "gemini-2.5-flash-image", contents: { parts: imageParts } })
      ]);

      const generatedText = textResponse.text || "任务准备中...";
      setStoryText(generatedText);

      const parts = imageResponse.candidates?.[0]?.content?.parts;
      if (parts) {
          for (const part of parts) {
              if (part.inlineData) {
                  setImageUrl(`data:image/png;base64,${part.inlineData.data}`);
                  break;
              }
          }
      }

      const ttsResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: generatedText }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        },
      });

      const audioBase64 = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (audioBase64) {
        if (!audioContextRef.current) {
           audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
        }
        const buffer = await decodeAudioData(decodeBase64(audioBase64), audioContextRef.current, 24000, 1);
        setAudioBuffer(buffer);
      }

      setStep("mission-briefing");

    } catch (error) {
      console.error(error);
      alert("AI 正在休息，请再试一次！");
      setStep("worry-select");
    }
  };

  const playAudio = async () => {
    if (!audioBuffer || !audioContextRef.current) return;
    if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    source.onended = () => setIsPlaying(false);
    source.start();
    setIsPlaying(true);
  };

  const reset = () => {
    setStep("hero-select");
    setSelectedHero(null);
    setSelectedWorry(null);
    setStoryText("");
    setImageUrl("");
    setAudioBuffer(null);
    setIsPlaying(false);
  };

  const renderHeader = (title: string, subtitle: string) => (
      <div style={{textAlign: 'center', marginBottom: '15px', position: 'relative', zIndex: 5}}>
        <div style={{
            fontFamily: "'Bubblegum Sans', cursive", 
            fontSize: '24px', 
            color: '#64748B', 
            marginBottom: '0px',
            textTransform: 'uppercase',
            letterSpacing: '2px'
        }}>{subtitle}</div>
        <div style={{
            fontFamily: "'Fredoka', sans-serif", 
            fontSize: '32px', 
            fontWeight: '900', 
            color: '#1E293B',
            textShadow: '3px 3px 0px white, 5px 5px 10px rgba(0,0,0,0.1)',
            lineHeight: '1.2'
        }} dangerouslySetInnerHTML={{__html: title}} />
      </div>
  );

  const renderGrid = (items: Hero[] | Worry[], type: 'hero' | 'worry') => (
      <div style={styles.gridContainer}>
        {items.map(item => (
            <TiltCard 
                key={item.id} 
                isSelected={(type === 'hero' ? selectedHero : selectedWorry)?.id === item.id} 
                onClick={() => type === 'hero' ? setSelectedHero(item as Hero) : setSelectedWorry(item as Worry)}
                color={item.color}
                shadow={item.shadow}
            >
                <LiveAsset 
                    item={item} 
                    assetUrl={assetCache[item.id]} 
                    isLoading={generatingAssets.has(item.id)}
                />
                <div style={{
                    fontSize: '18px',
                    fontWeight: '800',
                    textAlign: 'center',
                    background: (type === 'hero' ? selectedHero : selectedWorry)?.id === item.id ? item.color : '#F1F5F9',
                    padding: '8px 12px',
                    borderRadius: '16px',
                    width: '100%',
                    boxSizing: 'border-box',
                    color: (type === 'hero' ? selectedHero : selectedWorry)?.id === item.id ? 'white' : '#64748B',
                    transition: 'all 0.3s ease',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
                }}>
                    {type === 'hero' ? item.name : (item as Worry).monsterName}
                </div>
            </TiltCard>
        ))}
      </div>
  )

  const renderHeroSelect = () => (
    <div className="animate-slide-up" style={{width: '100%', display: 'flex', flexDirection: 'column', height: '100%'}}>
      {renderHeader("选择你的<br/><span style='color:#F59E0B; font-size:38px'>超级英雄!</span>", "Step 1")}
      {renderGrid(HEROES, 'hero')}
      <div style={{marginTop: 'auto'}}>
        <GameButton 
            onClick={handleHeroNext} 
            disabled={!selectedHero}
            color="#FF6B6B"
            shadow="#D64545"
        >
            下一步: 变身! 🚀
        </GameButton>
      </div>
    </div>
  );

  const renderWorrySelect = () => (
    <div className="animate-slide-up" style={{width: '100%', display: 'flex', flexDirection: 'column', height: '100%'}}>
       {renderHeader("打败哪只<br/><span style='color:#EF4444; font-size:38px'>捣蛋鬼?</span>", "Step 2")}
       {renderGrid(WORRIES, 'worry')}
      <div style={{marginTop: 'auto', display: 'flex', gap: '15px'}}>
         <GameButton onClick={() => setStep("hero-select")} color="white" shadow="#CBD5E1" style={{color: '#64748B', width: '30%'}}>🔙</GameButton>
         <GameButton onClick={startMission} disabled={!selectedWorry} color="#3B82F6" shadow="#1D4ED8" style={{width: '70%'}}>开始战斗! ⚔️</GameButton>
      </div>
    </div>
  );

  const renderLoading = () => (
      <div style={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
          <h2 style={{fontFamily: "'Bubblegum Sans', cursive", fontSize: '40px', color: '#3B82F6', textShadow: '3px 3px 0 white', marginBottom: '20px'}}>GETTING READY...</h2>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', perspective: '500px'}}>
             <div style={{width: '100px', height: '100px', borderRadius: '50%', overflow: 'hidden', border: '5px solid #FCD34D', animation: 'bounceIn 1s infinite alternate'}}>
                 {userPhotos.length > 0 ? (
                    <img src={userPhotos[0]} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                 ) : (
                    <div style={{fontSize: '50px', lineHeight:'90px', textAlign:'center'}}>{selectedHero?.emoji}</div>
                 )}
             </div>
             <div style={{fontSize: '40px', fontStyle: 'italic', fontWeight: '900', color: '#F59E0B', zIndex: 10}}>VS</div>
             <div style={{width: '100px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'bounceIn 1s infinite alternate-reverse'}}>
                {assetCache[selectedWorry?.id!] ? (
                    <img src={assetCache[selectedWorry?.id!]} style={{width: '120%', filter: 'drop-shadow(0 5px 5px rgba(0,0,0,0.2))'}} />
                ) : (
                    <div style={{fontSize: '80px'}}>{selectedWorry?.emoji}</div>
                )}
             </div>
          </div>
          <div style={{marginTop: '40px', width: '70%', height: '16px', background: 'rgba(0,0,0,0.05)', borderRadius: '10px', overflow: 'hidden'}}>
              <div style={{width: '50%', height: '100%', background: 'linear-gradient(90deg, #F59E0B, #FCD34D)', borderRadius: '10px', animation: 'shine 1s infinite linear'}}></div>
          </div>
          <p style={{color: '#64748B', fontWeight: 'bold', marginTop: '15px', fontSize: '14px'}}>正在召唤 {selectedHero?.name}...</p>
      </div>
  );

  const renderMission = () => (
    <div className="animate-pop" style={{width: '100%', display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center'}}>
      <div style={{
          background: 'white', padding: '8px', borderRadius: '24px', 
          boxShadow: '0 20px 40px rgba(0,0,0,0.15), 0 0 0 5px rgba(255,255,255,0.5)',
          transform: 'rotate(-1deg)', marginBottom: '20px', width: '100%', boxSizing: 'border-box'
      }}>
        {imageUrl ? (
            <img src={imageUrl} style={{width: '100%', borderRadius: '18px', display: 'block'}} />
        ) : (
            <div style={{width: '100%', aspectRatio: '1/1', background: '#F1F5F9', borderRadius: '18px'}}></div>
        )}
      </div>

      <div style={{
          background: '#FFFBEB', border: '4px solid #F59E0B', borderRadius: '24px', padding: '25px',
          width: '100%', boxSizing: 'border-box', position: 'relative', marginBottom: 'auto',
          boxShadow: '0 10px 20px rgba(245, 158, 11, 0.2)'
      }}>
          <div style={{
              position: 'absolute', top: '-18px', left: '50%', transform: 'translateX(-50%)', 
              background: '#F59E0B', color: 'white', padding: '6px 20px', borderRadius: '20px', 
              fontWeight: 'bold', border: '3px solid white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>任务指令</div>
          <p style={{fontSize: '22px', lineHeight: '1.5', fontWeight: '700', color: '#4B5563', margin: '10px 0 0 0', textAlign: 'center'}}>
              {storyText}
          </p>
      </div>

      <div style={{width: '100%', display: 'flex', gap: '15px', marginTop: '20px'}}>
        {audioBuffer && (
             <GameButton onClick={playAudio} color="#8B5CF6" shadow="#7C3AED" style={{width: '80px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', padding: 0, height: '70px'}}>
                {isPlaying ? '🔊' : '▶️'}
            </GameButton>
        )}
        <GameButton onClick={reset} color="#10B981" shadow="#059669">任务完成! 🌟</GameButton>
      </div>
    </div>
  );

  const renderPhotoSelect = () => (
    <div className="animate-slide-up" style={{width: '100%', display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center'}}>
      {renderHeader("建立你的<br/><span style='color:#8B5CF6; font-size:38px'>英雄档案!</span>", "档案录入")}
      <div style={{display: 'flex', gap: '10px', marginBottom: '30px', justifyContent: 'center', width: '100%'}}>
          {[0, 1, 2].map((index) => (
            <div key={index} style={{
                width: '80px', height: '80px', background: userPhotos[index] ? 'white' : '#F1F5F9',
                borderRadius: '20px', border: '4px solid white', boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
                overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                transform: `rotate(${index * 5 - 5}deg)`
            }}>
                {userPhotos[index] ? (
                    <img src={userPhotos[index]} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                ) : <div style={{fontSize: '30px', opacity: 0.3}}>📸</div>}
                {userPhotos[index] && <div style={{position: 'absolute', bottom: 0, right: 0, background: '#10B981', width: '25px', height: '25px', borderRadius: '10px 0 0 0', zIndex: 2}}></div>}
            </div>
          ))}
      </div>
      <input type="file" multiple ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" style={{display: 'none'}} />
      <GameButton onClick={() => fileInputRef.current?.click()} color="#3B82F6" shadow="#2563EB" style={{marginBottom: '15px'}}>
          {userPhotos.length > 0 ? '重新选择 3张 🔄' : '选择 3张 帅照 📂'}
      </GameButton>
      <div style={{marginTop: 'auto', width: '100%', display: 'flex', gap: '15px'}}>
        <GameButton onClick={() => setStep("hero-select")} color="white" shadow="#CBD5E1" style={{color: '#64748B', width: '30%'}}>🔙</GameButton>
        <GameButton onClick={() => setStep("worry-select")} disabled={userPhotos.length === 0} color="#10B981" shadow="#059669" style={{width: '70%'}}>保存并继续! ✨</GameButton>
      </div>
    </div>
  );

  return (
    <div style={styles.appContainer}>
        <div style={{position: 'absolute', top: '15px', left: '15px', zIndex: 20, display: 'flex', gap: '10px'}}>
             <button onClick={clearPhotos} style={styles.iconButton} title="重置照片">👤</button>
             <button onClick={resetAssets} style={styles.iconButton} title="重新生成图标">🎨</button>
        </div>
        <div style={styles.gameFrame}>
            <div style={styles.gameScreen}>
                {step === "hero-select" && renderHeroSelect()}
                {step === "photo-upload" && renderPhotoSelect()}
                {step === "worry-select" && renderWorrySelect()}
                {step === "loading" && renderLoading()}
                {step === "mission-briefing" && renderMission()}
            </div>
        </div>
    </div>
  );
};

// --- Styles ---

const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center',
    position: 'relative', zIndex: 10, padding: '20px', boxSizing: 'border-box',
  },
  gameFrame: {
    width: '100%', maxWidth: '420px', height: '100%', maxHeight: '820px',
    background: 'rgba(255, 255, 255, 0.8)', borderRadius: '45px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 12px rgba(255, 255, 255, 0.4)',
    padding: '12px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
    backdropFilter: 'blur(20px)', position: 'relative'
  },
  gameScreen: {
    background: '#F8FAFC', width: '100%', height: '100%', borderRadius: '35px',
    border: 'none', boxSizing: 'border-box', padding: '24px', overflowY: 'auto',
    display: 'flex', flexDirection: 'column',
    boxShadow: 'inset 0 10px 20px rgba(0,0,0,0.05)'
  },
  gridContainer: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px',
  },
  iconButton: {
      background: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px',
      fontSize: '18px', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.1s'
  }
};

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
