import React, { useRef, useEffect, useState } from "react";
import * as faceapi from "face-api.js";
import API from "../api/axios";
import { Camera, UserCheck, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";

const FaceEnrollment = () => {
    const videoRef = useRef();
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState("");
    const [isCapturing, setIsCapturing] = useState(false);
    const [previewDescriptor, setPreviewDescriptor] = useState(null);

    useEffect(() => {
        const loadModels = async () => {
            const MODEL_URL = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights";
            try {
                console.log("Loading AI models...");
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                ]);

                // Warm-up SSD and WebGL
                console.log("Warming up AI engine...");
                const dummyCanvas = document.createElement('canvas');
                dummyCanvas.width = 64;
                dummyCanvas.height = 64;
                await faceapi.detectSingleFace(dummyCanvas, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.9 }));

                console.log("AI ready for high-speed action!");
                setModelsLoaded(true);
            } catch (err) {
                console.error("AI Error:", err);
                toast.error("Models load nahi hue. Refresh karein.");
            }
        };

        const fetchEmployees = async () => {
            try {
                const { data } = await API.get("/employees");
                setEmployees(data);
            } catch (err) {
                console.error("Error fetching employees:", err);
            }
        };

        loadModels();
        fetchEmployees();
    }, []);

    const startVideo = () => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices
                .getUserMedia({ video: { width: 640, height: 480, frameRate: { ideal: 30 } } })
                .then((stream) => {
                    if (videoRef.current) videoRef.current.srcObject = stream;
                })
                .catch((err) => {
                    console.error("Camera error:", err);
                    toast.error("Camera chalu nahi hua.");
                });
        }
    };

    const captureFace = async () => {
        if (!selectedEmployee) {
            toast.error("Pehle employee select karein");
            return;
        }

        setIsCapturing(true);
        try {
            console.log("Starting SSD detection...");
            const detection = await faceapi
                .detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (detection) {
                setPreviewDescriptor(Array.from(detection.descriptor));
                toast.success("Face capture ho gaya! Ab Enroll karein.");
            } else {
                toast.error("Face nahi mila. Camera ke seedhe saamne dekhein.");
            }
        } catch (err) {
            console.error("SSD capture error:", err);
            toast.error("Recognition crash ho gaya. Page refresh karein.");
        } finally {
            setIsCapturing(false);
        }
    };

    const handleEnroll = async () => {
        try {
            await API.put(`/employees/${selectedEmployee}/enroll-face`, {
                descriptor: previewDescriptor,
            });
            toast.success("Biometric enrollment complete!");
            setPreviewDescriptor(null);
            setSelectedEmployee("");
        } catch (err) {
            toast.error(err.response?.data?.message || "Enrollment failed");
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black text-secondary tracking-tight">Biometric Enrollment</h2>
                    <p className="text-text-muted font-bold">Register employee face patterns for the Smart Terminal</p>
                </div>
                <div className={`px-4 py-2 rounded-full border text-xs font-black flex items-center gap-2 ${modelsLoaded ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                    {modelsLoaded ? <ShieldCheck size={14} /> : <Loader2 size={14} className="animate-spin" />}
                    {modelsLoaded ? "AI MODELS ACTIVE" : "LOADING AI..."}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Camera Feed */}
                <div className="glass-card p-6 space-y-4">
                    <div className="relative aspect-video bg-slate-900 rounded-[32px] overflow-hidden shadow-2xl">
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            onPlay={startVideo}
                            className="w-full h-full object-cover"
                        />
                        {!videoRef.current?.srcObject && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-4">
                                <Camera size={48} />
                                <button onClick={startVideo} className="bg-primary text-white px-6 py-2 rounded-xl font-bold">
                                    Start Camera
                                </button>
                            </div>
                        )}
                        {isCapturing && (
                            <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm flex items-center justify-center">
                                <Loader2 className="animate-spin text-white" size={48} />
                            </div>
                        )}
                    </div>
                    <p className="text-[10px] text-center font-black text-text-muted uppercase tracking-widest">
                        Center the face in the frame
                    </p>
                </div>

                {/* Enrollment Controls */}
                <div className="glass-card p-8 space-y-8">
                    <div className="space-y-4">
                        <label className="text-xs font-black text-secondary uppercase tracking-widest">Select Employee</label>
                        <select
                            value={selectedEmployee}
                            onChange={(e) => setSelectedEmployee(e.target.value)}
                            className="w-full bg-slate-50 border-0 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none"
                        >
                            <option value="">Choose an employee...</option>
                            {employees.map(emp => (
                                <option key={emp._id} value={emp._id}>{emp.name} ({emp.designation})</option>
                            ))}
                        </select>
                    </div>

                    {previewDescriptor ? (
                        <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 space-y-4">
                            <div className="flex items-center gap-3 text-blue-600">
                                <UserCheck size={20} />
                                <span className="text-sm font-black uppercase tracking-widest">Pattern Ready</span>
                            </div>
                            <p className="text-xs text-blue-800 font-bold">A high-precision biometric map has been generated for this employee.</p>
                            <button
                                onClick={handleEnroll}
                                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-200 hover:scale-[1.02] transition-transform"
                            >
                                SAVE ENROLLMENT
                            </button>
                            <button
                                onClick={() => setPreviewDescriptor(null)}
                                className="w-full text-blue-600 py-2 text-xs font-black"
                            >
                                RETAKE
                            </button>
                        </div>
                    ) : (
                        <button
                            disabled={!modelsLoaded || !selectedEmployee}
                            onClick={captureFace}
                            className="w-full bg-secondary text-white py-5 rounded-[24px] font-black flex items-center justify-center gap-3 shadow-xl hover:bg-slate-800 disabled:opacity-50 transition-all border-b-4 border-slate-900"
                        >
                            <RefreshCw className={isCapturing ? "animate-spin" : ""} size={20} />
                            GET BIOMETRIC MAP
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FaceEnrollment;
