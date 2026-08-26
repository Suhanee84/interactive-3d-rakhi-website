import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronRight,
  Heart,
  ImagePlus,
  RefreshCcw,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

type Screen = "intro" | "choose" | "gift" | "camera" | "tying" | "crying" | "budhu" | "returning";
type Sister = "Sanya" | "Suhanee";
type StoredMediaKey = Sister | "crying-reaction" | "budhu-reaction" | "gift-proof" | "rakhi-ceremony" | "waiting-gift";

const sisters: Record<Sister, { shade: string; note: string; initial: string }> = {
  Sanya: { shade: "sanya", note: "Rakhi ki saari tayyari Sanya ki taraf se", initial: "S" },
  Suhanee: { shade: "suhanee", note: "Dil se ek pyari si surprise Suhanee ki taraf se", initial: "S" },
};

const sceneMotion = {
  initial: { opacity: 0, scale: 0.985, y: 14 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 1.015, y: -10 },
  transition: { duration: 0.52, ease: [0.22, 1, 0.36, 1] as const },
};

const portraitDatabaseName = "rakhi-surprise-portraits";
const portraitStoreName = "photos";

function openPortraitDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(portraitDatabaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(portraitStoreName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function savePersonalMedia(key: StoredMediaKey, media: Blob) {
  const database = await openPortraitDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(portraitStoreName, "readwrite");
    transaction.objectStore(portraitStoreName).put(media, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

async function loadPortraitPhotos() {
  const database = await openPortraitDatabase();
  const photos = await Promise.all((Object.keys(sisters) as Sister[]).map((sister) => new Promise<[Sister, Blob | undefined]>((resolve, reject) => {
    const request = database.transaction(portraitStoreName, "readonly").objectStore(portraitStoreName).get(sister);
    request.onsuccess = () => resolve([sister, request.result as Blob | undefined]);
    request.onerror = () => reject(request.error);
  })));
  database.close();
  return photos.reduce<Partial<Record<Sister, string>>>((storedPhotos, [sister, photo]) => {
    if (photo) storedPhotos[sister] = URL.createObjectURL(photo);
    return storedPhotos;
  }, {});
}

async function loadPersonalMedia(key: StoredMediaKey) {
  const database = await openPortraitDatabase();
  const media = await new Promise<Blob | undefined>((resolve, reject) => {
    const request = database.transaction(portraitStoreName, "readonly").objectStore(portraitStoreName).get(key);
    request.onsuccess = () => resolve(request.result as Blob | undefined);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return media;
}

const soundVideos = new Set<HTMLVideoElement>();

function playWithSound(video: HTMLVideoElement) {
  video.muted = false;
  video.volume = 1;
  video.play().catch(() => {
    // Browser blocked audible autoplay, so fall back to muted playback.
    video.muted = true;
    void video.play().catch(() => undefined);
  });
}

function forcePlay(event: React.SyntheticEvent<HTMLVideoElement>) {
  const video = event.currentTarget;
  soundVideos.add(video);
  playWithSound(video);
}

function unmuteAllVideos() {
  soundVideos.forEach((video) => {
    if (!video.isConnected) { soundVideos.delete(video); return; }
    video.muted = false;
    video.volume = 1;
    void video.play().catch(() => undefined);
  });
}

function RakhiMark({ large = false }: { large?: boolean }) {
  return (
    <div className={`rakhi-mark ${large ? "rakhi-mark--large" : ""}`} aria-hidden="true">
      <span className="rakhi-thread rakhi-thread--left" />
      <span className="rakhi-thread rakhi-thread--right" />
      <span className="rakhi-ring rakhi-ring--outer" />
      <span className="rakhi-ring rakhi-ring--mid" />
      <span className="rakhi-ring rakhi-ring--core" />
      <span className="rakhi-gem" />
      {[...Array(10)].map((_, index) => <span className="rakhi-bead" key={index} style={{ "--bead": index } as React.CSSProperties} />)}
    </div>
  );
}

function SparkField() {
  return <div className="spark-field" aria-hidden="true">{[...Array(16)].map((_, index) => <i className="spark" key={index} style={{ "--spark": index } as React.CSSProperties} />)}</div>;
}

function Portrait({ sister, photoSrc, onPhotoMissing, onPhotoLoaded }: { sister: Sister; photoSrc?: string; onPhotoMissing?: () => void; onPhotoLoaded?: () => void }) {
  const info = sisters[sister];
  const defaultPhoto = sister === "Sanya" ? "/sanya-rakhi.jpg" : "/suhanee-rakhi.jpg";
  return (
    <div className={`portrait-3d portrait-3d--${info.shade}`}>
      <div className="portrait-glow" /><div className="portrait-sun" />
      <div className="portrait-arch"><div className="portrait-pattern" /><div className="portrait-silhouette"><span className="silhouette-hair" /><span className="silhouette-face" /><span className="silhouette-neck" /><span className="silhouette-dress" /><span className="silhouette-dupatta" /></div></div>
      <img className="portrait-photo" key={photoSrc ?? `${sister}-default`} src={photoSrc ?? defaultPhoto} alt={`${sister} holding the Raksha Bandhan thali`} onLoad={onPhotoLoaded} onError={(event) => { event.currentTarget.style.display = "none"; onPhotoMissing?.(); }} />
      <div className="portrait-letter">{info.initial}</div><div className="portrait-floor" /><span className="portrait-shine" />
    </div>
  );
}

function AartiThali() {
  return <div className="thali-wrap" aria-label="Animated aarti thali"><div className="thali-shadow" /><div className="thali-3d"><img src="/rakhi-thali.jpg" alt="Festive Raksha Bandhan aarti thali" /><div className="thali-rim thali-rim--one" /><div className="thali-rim thali-rim--two" /><div className="diya-flame"><i /></div></div></div>;
}

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <motion.main className="scene intro-scene" {...sceneMotion}>
      <div className="intro-halo intro-halo--one" /><div className="intro-halo intro-halo--two" /><SparkField />
      <div className="intro-content">
        <motion.div className="intro-rakhi" initial={{ opacity: 0, scale: 0.55, rotate: -80 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}><RakhiMark large /></motion.div>
        <motion.p className="eyebrow" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.5 }}>A little surprise for</motion.p>
        <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.82, duration: 0.6 }}>Adarsh Singh</motion.h1>
        <motion.p className="intro-message" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.55 }}>Aaj sirf rakhi nahi, dono chhoti behnon ka pyaar bhi bandhne wala hai.</motion.p>
        <motion.button className="primary-button intro-button" onClick={onStart} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.18, duration: 0.55 }}>Surprise kholo <ChevronRight size={18} strokeWidth={2.4} /></motion.button>
      </div>
      <div className="intro-footer">from Sanya and Suhanee</div>
    </motion.main>
  );
}

function ChooseSister({ onSelect }: { onSelect: (sister: Sister) => void }) {
  const [sisterPhotos, setSisterPhotos] = useState<Partial<Record<Sister, string>>>({});
  const [portraitStatus, setPortraitStatus] = useState<Partial<Record<Sister, "saving" | "saved" | "error">>>({});

  useEffect(() => {
    let isMounted = true;
    loadPortraitPhotos().then((storedPhotos) => {
      if (!isMounted) return;
      setSisterPhotos(storedPhotos);
      setPortraitStatus((current) => ({ ...current, ...Object.fromEntries(Object.keys(storedPhotos).map((sister) => [sister, "saved"])) }));
    }).catch(() => undefined);
    return () => { isMounted = false; };
  }, []);

  const pickSisterPhoto = (sister: Sister, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSisterPhotos((current) => ({ ...current, [sister]: URL.createObjectURL(file) }));
    setPortraitStatus((current) => ({ ...current, [sister]: "saving" }));
    savePersonalMedia(sister, file).then(() => setPortraitStatus((current) => ({ ...current, [sister]: "saved" }))).catch(() => setPortraitStatus((current) => ({ ...current, [sister]: "error" })));
  };

  return (
    <motion.main className="scene choose-scene" {...sceneMotion}>
      <SparkField /><div className="top-line"><span>Raksha Bandhan</span><Heart size={15} fill="currentColor" /><span>for Adarsh bhaiya</span></div>
      <div className="choice-copy"><p className="eyebrow">Pehle kis behen se miloge?</p><h2>Choose your<br /><em>rakhi moment.</em></h2></div>
      <div className="sister-options">
        {(Object.keys(sisters) as Sister[]).map((sister, index) => <motion.div className="sister-option-wrap" key={sister} initial={{ opacity: 0, y: 36, rotateY: index ? 8 : -8 }} animate={{ opacity: 1, y: 0, rotateY: index ? -4 : 4 }} transition={{ delay: 0.22 + index * 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] }} whileHover={{ y: -8, rotateY: 0, transition: { duration: 0.25 } }} whileTap={{ scale: 0.96 }}><button className={`sister-option sister-option--${sisters[sister].shade}`} onClick={() => onSelect(sister)}><Portrait sister={sister} photoSrc={sisterPhotos[sister]} /><span className="option-name">{sister}</span><span className="option-note">{sisters[sister].note}</span><span className="option-arrow"><ChevronRight size={17} /></span></button><label className={`portrait-upload ${portraitStatus[sister] ? `portrait-upload--${portraitStatus[sister]}` : ""}`}><ImagePlus size={12} /> {portraitStatus[sister] === "saving" ? "Saving..." : portraitStatus[sister] === "saved" ? "Saved: change" : portraitStatus[sister] === "error" ? "Save failed" : "Photo choose"}<input type="file" accept="image/*" onChange={(event) => pickSisterPhoto(sister, event)} /></label></motion.div>)}
      </div>
      <p className="choice-help">Tap a portrait to continue</p>
    </motion.main>
  );
}

function GiftQuestion({ sister, onGift, onBack }: { sister: Sister; onGift: (answer: "yes" | "no" | "later") => void; onBack: () => void }) {
  return (
    <motion.main className={`scene gift-scene gift-scene--${sisters[sister].shade}`} {...sceneMotion}>
      <button className="back-button" onClick={onBack} aria-label="Choose another sister"><ArrowLeft size={19} /></button><SparkField />
      <motion.div className="gift-rakhi" initial={{ rotate: -30, scale: 0.7, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} transition={{ duration: 0.7 }}><RakhiMark /></motion.div>
      <div className="gift-copy"><p className="eyebrow">{sister} wants to know</p><h2>Adarsh bhaiya,<br />gift laye ho?</h2><p>Bas sach bolna, hum dono ko sab pata chal jata hai.</p></div>
      <div className="gift-options" aria-label="Gift response options">
        <motion.button className="gift-answer gift-answer--yes" onClick={() => onGift("yes")} whileTap={{ scale: 0.97 }}><span><Check size={18} /></span> Haan, gift laya hu</motion.button>
        <motion.button className="gift-answer" onClick={() => onGift("later")} whileTap={{ scale: 0.97 }}><span><Sparkles size={17} /></span> Abhi le kar aaya</motion.button>
        <motion.button className="gift-answer gift-answer--no" onClick={() => onGift("no")} whileTap={{ scale: 0.97 }}><span><X size={18} /></span> Gift nahi laya</motion.button>
      </div>
    </motion.main>
  );
}

function CameraScene({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"image" | "video">("image");
  const stopCamera = useCallback(() => { stream?.getTracks().forEach((track) => track.stop()); setStream(null); setCameraOpen(false); }, [stream]);
  const openCamera = async () => {
    setMessage("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage("Camera sirf https ya localhost par khulta hai. Abhi neeche se photo upload kar dijiye.");
      return;
    }
    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      setPreview(null);
      setStream(nextStream);
      setCameraOpen(true);
    } catch (error) {
      const name = (error as DOMException)?.name;
      setMessage(name === "NotAllowedError" ? "Camera permission block hai. Address bar ke lock icon se camera Allow kijiye." : name === "NotFoundError" ? "Is device par camera nahi mila. Neeche se photo upload kar dijiye." : "Camera abhi open nahi ho paya. Neeche se photo upload kar dijiye.");
    }
  };
  useEffect(() => { if (stream && videoRef.current) videoRef.current.srcObject = stream; }, [stream]);
  useEffect(() => () => stream?.getTracks().forEach((track) => track.stop()), [stream]);
  useEffect(() => {
    // Gift proof is always captured fresh, so the camera opens automatically.
    void openCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const saveGiftMedia = (media: Blob) => savePersonalMedia("gift-proof", media).then(() => setMessage("Gift photo save ho gayi.")).catch(() => setMessage("File bahut badi hai, lekin abhi screen par dikh rahi hai."));
  const handleGiftPreviewError = () => setPreview(null);
  const capturePhoto = () => { const video = videoRef.current; const canvas = canvasRef.current; if (!video || !canvas) return; canvas.width = video.videoWidth || 720; canvas.height = video.videoHeight || 960; canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height); canvas.toBlob((photo) => { if (!photo) return; setPreview(URL.createObjectURL(photo)); setPreviewType("image"); saveGiftMedia(photo); }, "image/jpeg", 0.9); stopCamera(); };
  const uploadPhoto = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; setPreview(URL.createObjectURL(file)); setPreviewType(file.type.startsWith("video/") ? "video" : "image"); saveGiftMedia(file); stopCamera(); };
  return (
    <motion.main className="scene camera-scene" {...sceneMotion}>
      <button className="back-button" onClick={onBack} aria-label="Go back"><ArrowLeft size={19} /></button><SparkField />
      <div className="camera-copy"><p className="eyebrow">Proof, please</p><h2>Gift ki ek<br /><em>photo bhejo.</em></h2><p>Hum dono ko dekhna hai bhaiya ne kya surprise laya hai.</p></div>
      <div className={`camera-stage ${preview ? "has-preview" : ""}`}>{preview ? previewType === "video" ? <video className="gift-preview" src={preview} controls playsInline onError={handleGiftPreviewError} /> : <img className="gift-preview" src={preview} alt="Selected gift" onError={handleGiftPreviewError} /> : cameraOpen ? <video className="camera-video" ref={videoRef} autoPlay playsInline muted /> : <div className="camera-idle"><span className="camera-icon"><Camera size={27} /></span><span>Gift spotlight</span></div>}<div className="camera-corners" aria-hidden="true"><i /><i /><i /><i /></div><canvas className="hidden" ref={canvasRef} /></div>
      {message && <p className="camera-message">{message}</p>}
      <div className="camera-actions">{cameraOpen ? <button className="capture-button" onClick={capturePhoto}><i /> Tap to capture</button> : preview ? <><button className="primary-button" onClick={onComplete}>Submit gift <Check size={18} strokeWidth={2.5} /></button><button className="subtle-button" onClick={() => { setPreview(null); void openCamera(); }}><Camera size={15} /> Retake with camera</button><label className="subtle-button upload-label"><RefreshCcw size={15} /> Change photo / video<input type="file" accept="image/*,video/*" capture="environment" onChange={uploadPhoto} /></label></> : <><button className="primary-button" onClick={openCamera}><Camera size={18} /> Open camera</button><label className="subtle-button upload-label"><ImagePlus size={16} /> Upload photo / video<input type="file" accept="image/*,video/*" capture="environment" onChange={uploadPhoto} /></label></>}</div>
    </motion.main>
  );
}

function TyingScene({ sister, onRestart }: { sister: Sister; onRestart: () => void }) {
  const [ceremonySrc, setCeremonySrc] = useState<string>("/Video Project 4.mp4");
  const [ceremonyType, setCeremonyType] = useState<"image" | "video">("video");
  const [ceremonyNote, setCeremonyNote] = useState("");

  useEffect(() => {
    let isMounted = true;
    loadPersonalMedia("rakhi-ceremony").then((media) => {
      if (!media || !isMounted) return;
      setCeremonySrc(URL.createObjectURL(media));
      setCeremonyType(media.type.startsWith("video/") ? "video" : "image");
    }).catch(() => undefined);
    return () => { isMounted = false; };
  }, []);

  const chooseCeremonyMedia = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCeremonySrc(URL.createObjectURL(file));
    setCeremonyType(file.type.startsWith("video/") ? "video" : "image");
    setCeremonyNote("");
    savePersonalMedia("rakhi-ceremony", file).then(() => setCeremonyNote("Video permanently saved hai.")).catch(() => setCeremonyNote("File bahut badi hai, reload ke baad dobara choose karni padegi."));
  };

  const handleCeremonyError = () => {
    if (ceremonySrc === "/Video Project 4.mp4") { setCeremonySrc("/rakhi-video.mp4"); setCeremonyType("video"); return; }
    if (ceremonySrc === "/rakhi-video.mp4") { setCeremonySrc("/rakhi-video.jpg"); setCeremonyType("image"); return; }
    setCeremonySrc("");
  };

  return (
    <motion.main className={`scene tying-scene tying-scene--${sisters[sister].shade}`} {...sceneMotion}>
      <SparkField /><motion.div className="success-stamp" initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, type: "spring", stiffness: 230, damping: 14 }}><Check size={16} /> Gift received</motion.div>
      <div className="aarti-copy"><p className="eyebrow">The ceremony begins</p><h2>Rakhi bandhne ka<br /><em>shubh samay.</em></h2></div>
      {ceremonySrc ? (
        <div className="ceremony-stage">
          {ceremonyType === "video"
            ? <video className="ceremony-media" key={ceremonySrc} src={ceremonySrc} controls autoPlay playsInline loop onLoadedData={forcePlay} onCanPlay={forcePlay} onError={handleCeremonyError} />
            : <img className="ceremony-media" src={ceremonySrc} alt="Rakhi ceremony" onError={handleCeremonyError} />}
          <label className="reaction-upload"><ImagePlus size={14} /> Video / photo change<input type="file" accept="image/*,video/*" onChange={chooseCeremonyMedia} /></label>
        </div>
      ) : (
        <div className="ceremony-stage">
          <div className="tying-stage"><div className="arm arm--top"><div className="arm-band" /></div><div className="wrist"><RakhiMark /></div><div className="aarti-hand"><span /></div><AartiThali /></div>
          <label className="reaction-upload"><ImagePlus size={14} /> Apna video ya photo lagao<input type="file" accept="image/*,video/*" onChange={chooseCeremonyMedia} /></label>
        </div>
      )}
      {ceremonyNote && <p className="reaction-save-error">{ceremonyNote}</p>}
      <p className="blessing">Sanya aur Suhanee ki taraf se, hamesha khush raho bhaiya.</p><button className="subtle-button end-button" onClick={onRestart}><RefreshCcw size={15} /> Ek baar aur dekho</button>
    </motion.main>
  );
}

function CryingScene({ onGoingForGift }: { onGoingForGift: () => void }) {
  const [reactionSrc, setReactionSrc] = useState<string>("/jaiye le kr aaiye.mp4");
  const [reactionType, setReactionType] = useState<"image" | "video">("video");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let isMounted = true;
    loadPersonalMedia("crying-reaction").then((media) => {
      if (!media || !isMounted) return;
      setReactionSrc(URL.createObjectURL(media));
      setReactionType(media.type.startsWith("video/") ? "video" : "image");
    }).catch(() => undefined);
    return () => { isMounted = false; };
  }, []);

  const chooseReaction = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setReactionSrc(URL.createObjectURL(file));
    setReactionType(file.type.startsWith("video/") ? "video" : "image");
    setSaveError("");
    savePersonalMedia("crying-reaction", file).then(() => setSaveError("Photo/video permanently saved hai.")).catch(() => setSaveError("Video bahut bada hai, isliye reload ke baad dobara choose karna padega."));
  };

  const handleReactionError = () => {
    if (reactionSrc === "/jaiye le kr aaiye.mp4") { setReactionSrc("/crying-reaction.jpg"); setReactionType("image"); return; }
    setReactionSrc("");
  };

  return (
    <motion.main className="scene crying-scene" {...sceneMotion}>
      <SparkField />
      <div className="reaction-stage">
        {reactionSrc
          ? reactionType === "video"
            ? <video className="reaction-media" key={reactionSrc} src={reactionSrc} controls autoPlay playsInline loop onLoadedData={forcePlay} onCanPlay={forcePlay} onError={handleReactionError} />
            : <img className="reaction-media" key={reactionSrc} src={reactionSrc} alt="Personal reaction" onError={handleReactionError} />
          : <motion.div className="cry-face" animate={{ y: [0, 8, 0], rotate: [0, -2, 2, 0] }} transition={{ duration: 2.6, repeat: Infinity }}><span className="cry-hair" /><span className="cry-eye cry-eye--one" /><span className="cry-eye cry-eye--two" /><span className="cry-tear cry-tear--one" /><span className="cry-tear cry-tear--two" /><span className="cry-mouth" /></motion.div>}
        <label className="reaction-upload"><ImagePlus size={14} /> {reactionSrc ? "Photo / video change" : "Apna photo ya video lagao"}<input type="file" accept="image/*,video/*" onChange={chooseReaction} /></label>
      </div>
      {saveError && <p className="reaction-save-error">{saveError}</p>}
      <div className="cry-copy">
        <p className="eyebrow">Oh no, bhaiya...</p><h2>Gift le ke<br /><em>aaiye pehle.</em></h2><p>Rakhi ke saath thoda sa pyaar packed hona bhi zaroori hai na.</p>
      </div>
      <button className="primary-button" onClick={onGoingForGift}><Upload size={17} /> Main gift lene ja raha hu</button>
    </motion.main>
  );
}

function BudhuScene({ onRestart }: { onRestart: () => void }) {
  const [budhuSrc, setBudhuSrc] = useState<string>("/Video Project 5.mp4");
  const [budhuType, setBudhuType] = useState<"image" | "video">("video");
  const [budhuNote, setBudhuNote] = useState("");
  const [showPopup, setShowPopup] = useState(true);

  useEffect(() => {
    let isMounted = true;
    loadPersonalMedia("budhu-reaction").then((media) => {
      if (!media || !isMounted) return;
      setBudhuSrc(URL.createObjectURL(media));
      setBudhuType(media.type.startsWith("video/") ? "video" : "image");
    }).catch(() => undefined);
    return () => { isMounted = false; };
  }, []);

  const chooseBudhuMedia = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBudhuSrc(URL.createObjectURL(file));
    setBudhuType(file.type.startsWith("video/") ? "video" : "image");
    setBudhuNote("");
    savePersonalMedia("budhu-reaction", file).then(() => setBudhuNote("Video permanently saved hai.")).catch(() => setBudhuNote("Video bahut bada hai, reload ke baad dobara choose karna padega."));
  };

  const handleBudhuError = () => {
    if (budhuSrc === "/Video Project 5.mp4") { setBudhuSrc("/budhu-video.mp4"); setBudhuType("video"); return; }
    if (budhuSrc === "/budhu-video.mp4") { setBudhuSrc("/budhu-video.jpg"); setBudhuType("image"); return; }
    setBudhuSrc("");
  };

  return (
    <motion.main className="scene budhu-scene" {...sceneMotion}>
      <SparkField />
      <div className="ceremony-stage">
        {budhuSrc
          ? budhuType === "video"
            ? <video className="ceremony-media" key={budhuSrc} src={budhuSrc} controls autoPlay playsInline loop onLoadedData={forcePlay} onCanPlay={forcePlay} onError={handleBudhuError} />
            : <img className="ceremony-media" key={budhuSrc} src={budhuSrc} alt="Budhu reaction" onError={handleBudhuError} />
          : <motion.div className="budhu-emoji" animate={{ rotate: [-7, 7, -7], scale: [1, 1.08, 1] }} transition={{ duration: 2.3, repeat: Infinity }}>😏</motion.div>}
        <label className="reaction-upload"><ImagePlus size={14} /> {budhuSrc ? "Video / photo change" : "Choose your video"}<input type="file" accept="image/*,video/*" onChange={chooseBudhuMedia} /></label>
      </div>
      {budhuNote && <p className="reaction-save-error">{budhuNote}</p>}
      <div className="cry-copy">
        <p className="eyebrow">Sach bol diya humne</p>
        <h2>Jra bhi akal<br /><em>nhi budhhu 😏</em></h2>
        <p>Bina gift ke rakhi bandhwane chale the! Jaldi se gift le aao bhaiya.</p>
      </div>
      <button className="primary-button" onClick={onRestart}><RefreshCcw size={16} /> Wapas shuru karo</button>

      <AnimatePresence>
        {showPopup && (
          <motion.div className="budhu-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} onClick={() => setShowPopup(false)}>
            <motion.div className="budhu-popup budhu-popup--compact" initial={{ opacity: 0, scale: 0.65, y: 40, rotate: -5 }} animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }} exit={{ opacity: 0, scale: 0.82, y: 26 }} transition={{ type: "spring", stiffness: 215, damping: 17 }} onClick={(event) => event.stopPropagation()}>
              <button className="budhu-close" onClick={() => setShowPopup(false)} aria-label="Close"><X size={17} /></button>
              <motion.div className="budhu-emoji" animate={{ rotate: [-8, 8, -8], scale: [1, 1.1, 1] }} transition={{ duration: 2.2, repeat: Infinity }}>😏</motion.div>
              <motion.h3 className="budhu-title" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16, duration: 0.4 }}>Jra bhi akal nhi budhhu 😏</motion.h3>
              <motion.p className="budhu-text" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26, duration: 0.4 }}>Chalo ab video dekh lo, phir gift lekar hi wapas aana.</motion.p>
              <button className="primary-button budhu-action" onClick={() => setShowPopup(false)}>Video dekho <ChevronRight size={17} /></button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.main>
  );
}

function ReturningScene({ onBack }: { onBack: () => void }) {
  const [waitingSrc, setWaitingSrc] = useState<string>("/sad-video.mp4");
  const [waitingType, setWaitingType] = useState<"image" | "video">("video");
  const [waitingNote, setWaitingNote] = useState("");

  useEffect(() => {
    let isMounted = true;
    loadPersonalMedia("waiting-gift").then((media) => {
      if (!media || !isMounted) return;
      setWaitingSrc(URL.createObjectURL(media));
      setWaitingType(media.type.startsWith("video/") ? "video" : "image");
    }).catch(() => undefined);
    return () => { isMounted = false; };
  }, []);

  const chooseWaitingMedia = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setWaitingSrc(URL.createObjectURL(file));
    setWaitingType(file.type.startsWith("video/") ? "video" : "image");
    setWaitingNote("");
    savePersonalMedia("waiting-gift", file).then(() => setWaitingNote("Video permanently saved hai.")).catch(() => setWaitingNote("File bahut badi hai, reload ke baad dobara choose karni padegi."));
  };

  const handleWaitingError = () => {
    if (waitingSrc === "/sad-video.mp4") { setWaitingSrc("/waiting-video.mp4"); setWaitingType("video"); return; }
    if (waitingSrc === "/waiting-video.mp4") { setWaitingSrc("/waiting-video.jpg"); setWaitingType("image"); return; }
    setWaitingSrc("");
  };

  return (
    <motion.main className="scene returning-scene" {...sceneMotion}>
      <SparkField />
      <div className="ceremony-stage">
        {waitingSrc
          ? waitingType === "video"
            ? <video className="ceremony-media" key={waitingSrc} src={waitingSrc} controls autoPlay playsInline loop onLoadedData={forcePlay} onCanPlay={forcePlay} onError={handleWaitingError} />
            : <img className="ceremony-media" key={waitingSrc} src={waitingSrc} alt="Waiting for the gift" onError={handleWaitingError} />
          : <motion.div className="gift-box" initial={{ y: -170, rotate: -18, scale: 0.7 }} animate={{ y: [0, -10, 0], rotate: [5, -3, 5], scale: 1 }} transition={{ duration: 1.5, repeat: Infinity, repeatType: "mirror" }}><span className="gift-box-lid" /><span className="gift-box-ribbon gift-box-ribbon--vertical" /><span className="gift-box-ribbon gift-box-ribbon--horizontal" /><span className="gift-box-bow" /></motion.div>}
        <label className="reaction-upload"><ImagePlus size={14} /> {waitingSrc ? "Video / photo change" : "Apna video ya photo lagao"}<input type="file" accept="image/*,video/*" onChange={chooseWaitingMedia} /></label>
      </div>
      {waitingNote && <p className="reaction-save-error">{waitingNote}</p>}
      <div className="return-copy"><p className="eyebrow">Theek hai!</p><h2>Jaldi aana,<br /><em>intezaar rahega.</em></h2><p>Hum dono diya jala kar rakhi ki thali saja rahe hain.</p></div>
      <button className="primary-button" onClick={onBack}>Gift le aaya hu <ChevronRight size={18} /></button>
    </motion.main>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("intro");
  const [sister, setSister] = useState<Sister>("Sanya");
  useEffect(() => {
    // Ask the browser to protect the saved personal media from routine storage cleanup.
    void navigator.storage?.persist?.().catch(() => undefined);
  }, []);
  useEffect(() => {
    // Every tap counts as a user gesture, which lets the videos play with sound.
    const enableSound = () => unmuteAllVideos();
    window.addEventListener("pointerdown", enableSound);
    window.addEventListener("keydown", enableSound);
    return () => {
      window.removeEventListener("pointerdown", enableSound);
      window.removeEventListener("keydown", enableSound);
    };
  }, []);
  useEffect(() => { if (screen !== "intro") return; const timer = window.setTimeout(() => setScreen("choose"), 5200); return () => window.clearTimeout(timer); }, [screen]);
  const chooseSister = (nextSister: Sister) => { setSister(nextSister); setScreen("gift"); };
  const reset = () => setScreen("choose");
  return <div className="app-shell"><div className="grain" /><AnimatePresence mode="wait">{screen === "intro" && <Intro key="intro" onStart={() => setScreen("choose")} />}{screen === "choose" && <ChooseSister key="choose" onSelect={chooseSister} />}{screen === "gift" && <GiftQuestion key="gift" sister={sister} onBack={() => setScreen("choose")} onGift={(answer) => setScreen(answer === "yes" ? "camera" : answer === "no" ? "crying" : "returning")} />}{screen === "camera" && <CameraScene key="camera" onBack={() => setScreen("gift")} onComplete={() => setScreen("tying")} />}{screen === "tying" && <TyingScene key="tying" sister={sister} onRestart={reset} />}{screen === "crying" && <CryingScene key="crying" onGoingForGift={() => setScreen("budhu")} />}{screen === "budhu" && <BudhuScene key="budhu" onRestart={reset} />}{screen === "returning" && <ReturningScene key="returning" onBack={() => setScreen("camera")} />}</AnimatePresence></div>;
}