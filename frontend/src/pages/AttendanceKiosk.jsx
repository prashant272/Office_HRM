import React, { useRef, useEffect, useState } from "react";
import * as faceapi from "face-api.js";
import API from "../api/axios";
import { Camera, UserCheck, Loader2, ShieldCheck, XCircle, Clock } from "lucide-react";
import toast from "react-hot-toast";
import moment from "moment";

const AttendanceKiosk = () => {
    const videoRef = useRef();
    const canvasRef = useRef();
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState(null);
    const [lastDetectionTime, setLastDetectionTime] = useState(0);

    // Liveness States
    const [livenessStep, setLivenessStep] = useState("START"); // START, BLINK, MOVE, SUCCESS
    const [blinkCount, setBlinkCount] = useState(0);
    const [isEyeClosed, setIsEyeClosed] = useState(false);
    const [baseNosePos, setBaseNosePos] = useState(null);
    const [hasMoved, setHasMoved] = useState(false);

    useEffect(() => {
        const loadModels = async () => {
            const MODEL_URL = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights";
            try {
                console.log("Terminal AI Awakening...");
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                ]);

                // Warm-up SSD and WebGL to prevent the 10s hang
                console.log("Warming up Graphics Engine...");
                const dummyCanvas = document.createElement('canvas');
                dummyCanvas.width = 64;
                dummyCanvas.height = 64;
                await faceapi.detectSingleFace(dummyCanvas, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.9 }));

                console.log("Terminal Ready!");
                setModelsLoaded(true);
                startVideo();
            } catch (err) {
                console.error("AI Error:", err);
                toast.error("Models load nahi hue. Refresh karein.");
            }
        };
        loadModels();

        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const startVideo = () => {
        navigator.mediaDevices
            .getUserMedia({ video: { width: 640, height: 480 } })
            .then((stream) => {
                if (videoRef.current) videoRef.current.srcObject = stream;
            })
            .catch((err) => console.error(err));
    };

    const calculateEAR = (eye) => {
        const dist = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
        const v1 = dist(eye[1], eye[5]);
        const v2 = dist(eye[2], eye[4]);
        const h = dist(eye[0], eye[3]);
        return (v1 + v2) / (2.0 * h);
    };

    const handleVideoPlay = () => {
        setInterval(async () => {
            if (isProcessing || !modelsLoaded || Date.now() - lastDetectionTime < 5000) return;

            if (videoRef.current) {
                const detection = await faceapi
                    .detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                if (detection) {
                    const landmarks = detection.landmarks;
                    const leftEye = landmarks.getLeftEye();
                    const rightEye = landmarks.getRightEye();
                    const nose = landmarks.getNose();
                    const ear = (calculateEAR(leftEye) + calculateEAR(rightEye)) / 2;

                    // 1. Blink Detection
                    if (livenessStep === "START" || livenessStep === "BLINK") {
                        if (ear < 0.22) {
                            setIsEyeClosed(true);
                        } else if (isEyeClosed && ear > 0.25) {
                            setBlinkCount(prev => prev + 1);
                            setIsEyeClosed(false);
                            if (blinkCount >= 1) {
                                setLivenessStep("MOVE");
                                setBaseNosePos(nose[3]); // Tip of the nose
                            }
                        }
                    }

                    // 2. Movement Detection
                    if (livenessStep === "MOVE" && baseNosePos) {
                        const currentNose = nose[3];
                        const dist = Math.sqrt(Math.pow(currentNose.x - baseNosePos.x, 2) + Math.pow(currentNose.y - baseNosePos.y, 2));
                        const faceWidth = detection.detection.box.width;

                        if (dist > faceWidth * 0.08) { // 8% movement threshold
                            setHasMoved(true);
                            setLivenessStep("SUCCESS");
                        }
                    }

                    // 3. Final Verification
                    if (livenessStep === "SUCCESS") {
                        processAuthentication(Array.from(detection.descriptor));
                        // Reset for next
                        setLivenessStep("START");
                        setBlinkCount(0);
                        setHasMoved(false);
                        setBaseNosePos(null);
                    }
                } else {
                    // Reset liveness if face is lost
                    if (livenessStep !== "START") {
                        setLivenessStep("START");
                        setBlinkCount(0);
                        setBaseNosePos(null);
                    }
                }
            }
        }, 600); // Faster interval for liveness tracking
    };

    const processAuthentication = async (descriptor) => {
        setIsProcessing(true);
        try {
            const { data } = await API.post("/attendance/kiosk-mark", { descriptor });
            setResult(data);
            setLastDetectionTime(Date.now());

            // Clear result after 5 seconds to reset terminal
            setTimeout(() => setResult(null), 5000);

            if (data.type === "check-in") {
                toast.success(`Welcome, ${data.user}!`, { duration: 5000 });
            } else {
                toast.success(`Goodbye, ${data.user}!`, { icon: '👋', duration: 5000 });
            }
        } catch (err) {
            console.error("Auth error:", err);
            // Don't toast error every second, just log it. 
            // Only toast if it's a legitimate failure not recognition skip.
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-secondary flex flex-col items-center justify-center p-6 z-[9999]">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                    <ShieldCheck size={12} />
                    Biometric Secure Terminal
                </div>
                <h1 className="text-4xl font-black text-white tracking-tighter">Smart Office Attendance</h1>
                <p className="text-slate-500 font-bold mt-2">Face your terminal to clock in/out</p>
            </div>

            {/* Main Terminal Shell */}
            <div className="relative w-full max-w-2xl bg-slate-900 rounded-[50px] p-4 shadow-[0_0_100px_rgba(59,130,246,0.15)] border-4 border-slate-800">
                <div className="relative aspect-video rounded-[40px] overflow-hidden bg-black group">
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        onPlay={handleVideoPlay}
                        className="w-full h-full object-cover scale-x-[-1]"
                    />

                    {/* UI Overlays */}
                    {!result && (
                        <div className="absolute inset-0 border-[40px] border-transparent pointer-events-none transition-all">
                            <div className="w-full h-full border-2 border-white/20 border-dashed rounded-[32px] flex items-center justify-center">
                                <div className="w-48 h-48 border-2 border-primary/50 animate-pulse rounded-full"></div>
                            </div>
                        </div>
                    )}

                    {!result && livenessStep !== "SUCCESS" && modelsLoaded && (
                        <div className="absolute inset-x-0 bottom-8 flex justify-center z-10">
                            <div className="bg-black/60 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 flex items-center gap-4 animate-bounce">
                                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center font-black text-xs text-white">
                                    {livenessStep === "START" || livenessStep === "BLINK" ? "1" : "2"}
                                </div>
                                <p className="text-white font-black uppercase tracking-widest text-sm">
                                    {livenessStep === "START" || livenessStep === "BLINK"
                                        ? "Palkein Jhapkaiye (Blink Eyes)"
                                        : "Gardan Hilaiye (Move Head)"}
                                </p>
                            </div>
                        </div>
                    )}

                    {isProcessing && (
                        <div className="absolute inset-0 bg-primary/20 backdrop-blur-md flex flex-col items-center justify-center text-white gap-4">
                            <Loader2 className="animate-spin" size={64} />
                            <p className="font-black text-xl tracking-tighter uppercase">Analyzing Pattern...</p>
                        </div>
                    )}

                    {result && (
                        <div className={`absolute inset-0 ${result.type === 'check-in' ? 'bg-emerald-500' : 'bg-blue-600'} flex flex-col items-center justify-center text-white animate-in zoom-in-95 duration-300`}>
                            <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center mb-6">
                                <UserCheck size={64} />
                            </div>
                            <h2 className="text-5xl font-black tracking-tighter mb-2">{result.type === 'check-in' ? 'WELCOME' : 'GOODBYE'}</h2>
                            <p className="text-2xl font-bold opacity-90">{result.user}</p>
                            <div className="mt-8 flex items-center gap-4 bg-black/20 px-6 py-3 rounded-2xl font-black">
                                <Clock size={20} />
                                <span>{moment().format("HH:mm A")}</span>
                            </div>
                            {result.duration && (
                                <p className="mt-4 text-sm font-bold opacity-80 underline underline-offset-4 decoration-white/30">Shift Duration: {result.duration}</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Status Footer */}
                <div className="mt-6 flex items-center justify-between px-6">
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${modelsLoaded ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500 animate-pulse'}`}></div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            {modelsLoaded ? 'System Online' : 'Awakening AI Models...'}
                        </span>
                    </div>
                    <div className="text-white/40 text-[10px] font-black uppercase tracking-widest">
                        Terminal ID: OMS-T01
                    </div>
                </div>
            </div>

            {/* Hint */}
            <p className="mt-12 text-slate-600 text-sm font-bold max-w-md text-center">
                <span className="text-primary italic">Note:</span> Please ensure proper lighting and remove sunglasses for faster verification.
            </p>

            <button
                onClick={() => window.location.href = "/dashboard"}
                className="mt-8 text-white/30 hover:text-white transition-colors flex items-center gap-2 group"
            >
                <XCircle size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Close Terminal</span>
            </button>
        </div>
    );
};

export default AttendanceKiosk;
