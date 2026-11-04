import React, { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaUserCircle, FaCheckCircle, FaExclamationCircle, FaThList, FaClock } from "react-icons/fa";
import { formatDateTime } from "../utils/formatDate";
import { API_BASE_URL, FACE_API_URL } from "../utils/apiConfig";

const Front = () => {
  const [recognizedName, setRecognizedName] = useState("");
  const [recognizedStudentName, setRecognizedStudentName] = useState("");
  const [attendanceStatus, setAttendanceStatus] = useState("idle"); // idle, success, error, loading
  const [statusMessage, setStatusMessage] = useState("");
  const [students, setStudents] = useState([]);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/students`);
        setStudents(response.data);
      } catch (err) {
        console.error("Error fetching students:", err);
      }
    };
    fetchStudents();
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsCameraActive(false);
    setAttendanceStatus("idle");
    setStatusMessage("");
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().catch(e => {
              if (e.name !== "AbortError") console.error("Play error:", e);
            });

            const renderFrame = () => {
              if (videoRef.current && canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                const vWidth = videoRef.current.videoWidth;
                const vHeight = videoRef.current.videoHeight;
                
                if (vWidth > 0 && vHeight > 0) {
                  canvasRef.current.width = vWidth;
                  canvasRef.current.height = vHeight;
                  ctx.drawImage(videoRef.current, 0, 0);
                }
                animationFrameRef.current = requestAnimationFrame(renderFrame);
              }
            };
            renderFrame();
            setIsCameraActive(true);
          }
        };
      }
    } catch (err) {
      console.error("Camera error:", err);
      setStatusMessage("Camera access denied or failed.");
    }
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const handleRecognize = useCallback(async () => {
    if (attendanceStatus === "loading") return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!video || video.readyState < 2) return;

    // 1. Immediately clear previous results to prevent showing stale data
    setRecognizedName("");
    setRecognizedStudentName("");
    setAttendanceStatus("loading");
    setStatusMessage("Scanning face...");
    
    try {
      const vWidth = video.videoWidth;
      const vHeight = video.videoHeight;
      
      if (vWidth > 0 && vHeight > 0) {
        canvas.width = vWidth;
        canvas.height = vHeight;
        canvas.getContext("2d").drawImage(video, 0, 0);
      }
      
      const imageData = canvas.toDataURL("image/jpeg", 0.8);

      // 2. Call Python Recognition API
      const { data } = await axios.post(`${FACE_API_URL}/recognize`, { image: imageData });
      const currentUsn = data.usn; // Use a distinct local variable name

      if (!currentUsn || currentUsn === "Unknown" || currentUsn === "No face detected") {
        setAttendanceStatus("error");
        setRecognizedName("Unknown");
        setRecognizedStudentName("");
        setStatusMessage(currentUsn === "No face detected" ? "No face detected in frame." : "Face not recognized.");
        return;
      }

      // 3. Find student details locally using the FRESH USN
      const studentMatch = students.find((s) => String(s.usn) === String(currentUsn));
      
      if (!studentMatch) {
        setAttendanceStatus("error");
        setRecognizedName(currentUsn);
        setRecognizedStudentName("Details not found");
        setStatusMessage("Recognized USN " + currentUsn + " but details are missing.");
        return;
      }

      // 4. Update UI with the CURRENTly recognized student
      setRecognizedName(studentMatch.usn);
      setRecognizedStudentName(studentMatch.name);

      // 5. Log Attendance using the LOCAL variables to guarantee consistency
      try {
        const res = await axios.post(`${API_BASE_URL}/api/periodwise-attendance`, {
          usn: studentMatch.usn,
          recognizedAt: new Date().toISOString()
        });
        setAttendanceStatus("success");
        setStatusMessage(res.data.message);
      } catch (error) {
        setAttendanceStatus("error");
        setStatusMessage(error.response?.data?.message || "Logging failed");
      }
    } catch {
      setAttendanceStatus("error");
      setStatusMessage("Recognition system offline.");
      setRecognizedName("");
      setRecognizedStudentName("");
    }
  }, [attendanceStatus, students]);

  useEffect(() => {
    if (!isCameraActive || attendanceStatus === "loading") return undefined;

    const interval = setInterval(handleRecognize, 5000);
    return () => clearInterval(interval);
  }, [attendanceStatus, handleRecognize, isCameraActive]);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col overflow-hidden font-sans">
      {/* Dynamic Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      {/* Nav */}
      <header className="relative z-10 px-8 py-6 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <FaCheckCircle className="text-white text-xl" />
          </div>
          <span className="font-black text-xl tracking-tighter uppercase">FaceAttend <span className="text-blue-500">Pro</span></span>
        </div>
        <div className="flex items-center space-x-4">
          <Link to="/dashboard">
            <motion.button 
              whileHover={{ y: -2 }} 
              className="bg-blue-600/10 hover:bg-blue-600/20 backdrop-blur-md border border-blue-500/20 px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center space-x-2 text-blue-400"
            >
              <FaThList />
              <span>Dashboard</span>
            </motion.button>
          </Link>
          <Link to="/Signin">
            <motion.button whileHover={{ y: -2 }} className="bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 px-6 py-2.5 rounded-xl font-bold text-sm transition-all">
              Admin Access
            </motion.button>
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-center p-6 lg:p-12 gap-12 max-w-7xl mx-auto w-full">
        {/* Camera Section */}
        <div className="w-full lg:w-3/5 relative group">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative rounded-[2.5rem] overflow-hidden bg-gray-900 border-4 border-white/5 shadow-2xl aspect-video"
          >
            <video 
              ref={videoRef} 
              className="hidden" 
              autoPlay 
              muted 
              playsInline 
            />
            <canvas ref={canvasRef} className={`w-full h-full object-cover scale-x-[-1] ${isCameraActive ? "bg-black" : "bg-gray-800"}`} />
            
            {/* HUD Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {!isCameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center p-8 rounded-3xl border border-white/10 bg-white/5"
                  >
                    <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
                      <FaUserCircle className="text-blue-500 text-4xl" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Camera Offline</h3>
                    <p className="text-gray-400 text-sm max-w-[240px]">The attendance system is currently paused. Please start it during class hours.</p>
                  </motion.div>
                </div>
              )}
              <div className="absolute top-8 left-8 w-12 h-12 border-t-4 border-l-4 border-blue-500/50 rounded-tl-lg" />
              <div className="absolute top-8 right-8 w-12 h-12 border-t-4 border-r-4 border-blue-500/50 rounded-tr-lg" />
              <div className="absolute bottom-8 left-8 w-12 h-12 border-b-4 border-l-4 border-blue-500/50 rounded-bl-lg" />
              <div className="absolute bottom-8 right-8 w-12 h-12 border-b-4 border-r-4 border-blue-500/50 rounded-br-lg" />
              
              <AnimatePresence>
                {attendanceStatus === "loading" && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-blue-600/10 backdrop-blur-[2px] flex items-center justify-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
                      <span className="font-bold tracking-widest uppercase text-xs">Scanning...</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="absolute bottom-6 left-6 right-6 flex justify-between items-center bg-black/40 backdrop-blur-xl border border-white/10 p-4 rounded-2xl">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${attendanceStatus === "success" ? "bg-green-500" : "bg-blue-500"} animate-pulse`} />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/70">System Ready</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-white/40 font-mono text-[10px] uppercase font-bold">
                  <FaClock className="text-blue-500/50" />
                  <span>{formatDateTime(new Date())}</span>
                </div>
                <span className="text-[10px] font-mono text-white/40">720P // 30FPS</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Control Section */}
        <div className="w-full lg:w-2/5 flex flex-col space-y-8 text-center lg:text-left">
          <div className="space-y-4">
            <motion.h2 initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="text-4xl lg:text-6xl font-black leading-none">
              Next-Gen <br /><span className="text-blue-500">Attendance.</span>
            </motion.h2>
            <p className="text-gray-400 font-medium">Position your face within the frame and tap the button to record presence instantly.</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
             <div className="grid grid-cols-2 gap-3 mb-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={startCamera}
                  disabled={isCameraActive}
                  className={`py-3 rounded-2xl font-bold text-xs transition-all border ${
                    isCameraActive 
                      ? "bg-white/5 border-white/5 text-gray-500 cursor-not-allowed" 
                      : "bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20"
                  }`}
                >
                  START ATTENDANCE
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={stopCamera}
                  disabled={!isCameraActive}
                  className={`py-3 rounded-2xl font-bold text-xs transition-all border ${
                    !isCameraActive 
                      ? "bg-white/5 border-white/5 text-gray-500 cursor-not-allowed" 
                      : "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                  }`}
                >
                  STOP ATTENDANCE
                </motion.button>
             </div>
             <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Recognized USN</span>
                <span className="font-mono text-blue-400 font-bold">{recognizedName || "----"}</span>
             </div>
             <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Student Name</span>
                <span className="font-bold text-white">{recognizedStudentName || "----"}</span>
             </div>

             <AnimatePresence mode="wait">
               {statusMessage && (
                 <motion.div 
                   initial={{ opacity: 0, y: 10 }} 
                   animate={{ opacity: 1, y: 0 }} 
                   exit={{ opacity: 0, y: -10 }}
                   className={`p-3 rounded-xl flex items-center space-x-3 text-xs font-bold ${
                     attendanceStatus === "success" ? "bg-green-500/10 text-green-400 border border-green-500/20" : 
                     attendanceStatus === "error" ? "bg-red-500/10 text-red-400 border border-red-500/20" : 
                     "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                   }`}
                 >
                   {attendanceStatus === "success" ? <FaCheckCircle /> : <FaExclamationCircle />}
                   <span>{statusMessage}</span>
                 </motion.div>
               )}
             </AnimatePresence>
          </div>

          <motion.button
            whileHover={{ scale: 1.02, boxShadow: "0 20px 40px -10px rgba(59, 130, 246, 0.4)" }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRecognize}
            disabled={attendanceStatus === "loading"}
            className="w-full py-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-lg shadow-xl transition-all flex items-center justify-center space-x-3"
          >
            <span>RECORD ATTENDANCE</span>
          </motion.button>

          <p className="text-[10px] text-gray-600 font-medium text-center italic">Powered by Advanced Computer Vision & LBPH Algorithms</p>
        </div>
      </main>
    </div>
  );
};

export default Front;
