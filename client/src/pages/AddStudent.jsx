import "../styles/App.css";
import { FaHome, FaFileAlt, FaUser, FaDownload, FaClock, FaBars, FaTimes, FaArrowLeft } from "react-icons/fa";
import { useNavigate, Link, useLocation } from "react-router-dom";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AdminProfile from "../components/AdminProfile";
import { getAuthorizationHeader } from "../utils/authStorage";
import { API_BASE_URL, FACE_API_URL } from "../utils/apiConfig";

const Addstudent = () => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [student, setStudent] = useState({
    name: "",
    usn: "",
    age: "",
    course: "",
    phone: "",
  });

  useEffect(() => {
    let stream = null;
    const getCameraStream = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user"
          } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().catch(e => console.error("Play error:", e));
          };
        }
      } catch (err) {
        console.error("Camera error:", err);
        alert("Could not access camera. Please check permissions.");
      }
    };

    getCameraStream();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("admin");
    navigate("/Signin");
  };

  const handleChange = (e) => {
    setStudent({ ...student, [e.target.name]: e.target.value });
  };

  const captureAndSend = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!student.name || !student.usn || !student.age || !student.course || !student.phone) {
      alert("Fill all student details");
      return;
    }

    setLoading(true);

    const context = canvas.getContext("2d");
    
    // Explicitly check for video availability and actual stream data
    if (!video || video.readyState < 2) {
      alert("Camera stream is still initializing. Please wait a moment.");
      setLoading(false);
      return;
    }

    // Ensure video dimensions are valid from the actual stream
    const width = video.videoWidth;
    const height = video.videoHeight;
    
    if (width === 0 || height === 0) {
      alert("Invalid video dimensions. Please ensure your camera is active.");
      setLoading(false);
      return;
    }

    canvas.width = width;
    canvas.height = height;
    
    // Draw and verify if the frame is actually captured
    context.drawImage(video, 0, 0, width, height);
    
    // Safety check: verify if the image is blank/solid color
    const pixelData = context.getImageData(0, 0, width, height).data;
    let isBlank = true;
    for (let i = 0; i < pixelData.length; i += 4) {
      if (pixelData[i] !== pixelData[0] || pixelData[i+1] !== pixelData[1] || pixelData[i+2] !== pixelData[2]) {
        isBlank = false;
        break;
      }
    }
    
    if (isBlank) {
      alert("Captured image is blank or solid color. Please move and try again.");
      setLoading(false);
      return;
    }
    
    // Optional: Small delay to ensure hardware buffers are flushed (not usually needed but safe)
    const imageData = canvas.toDataURL("image/jpeg", 0.9);

    try {
      // 1. Enroll Face in Python API
      const pythonRes = await fetch(`${FACE_API_URL}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usn: student.usn, image: imageData }),
      });
      
      if (!pythonRes.ok) throw new Error("Python API enrollment failed");

      // 2. Save Student Data in Node Backend
      const nodeRes = await fetch(`${API_BASE_URL}/api/students`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: getAuthorizationHeader()
        },
        body: JSON.stringify(student),
      });

      if (!nodeRes.ok) {
        const errData = await nodeRes.json();
        throw new Error(errData.message || "Node API failed");
      }

      alert("Student enrolled successfully!");

      setStudent({
        name: "",
        usn: "",
        age: "",
        course: "",
        phone: "",
      });

    } catch (err) {
      console.error(err);
      alert(err.message || "Enrollment failed");
    } finally {
      setLoading(false);
    }
  };

  const navItems = [
    { path: "/dashboard", label: "Home", icon: <FaHome className="text-purple-600" /> },
    { path: "/Addstudent", label: "Add Students", icon: <FaUser className="text-blue-600" /> },
    { path: "/Enrolled", label: "Enrolled", icon: <FaFileAlt className="text-red-500" /> },
    { path: "/Period", label: "Period Wise", icon: <FaClock className="text-green-500" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-72 bg-white border-r border-gray-100 flex-col p-6 shadow-sm">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent">
            Admin Panel
          </h2>
        </div>

        <nav className="flex-1 space-y-2">
          <Link to="/">
            <motion.button
              whileHover={{ x: 5 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center space-x-3 w-full py-3 px-4 rounded-xl text-indigo-600 hover:bg-indigo-50 mb-4 font-bold border border-indigo-100"
            >
              <FaArrowLeft />
              <span>Face Recognition</span>
            </motion.button>
          </Link>
          {navItems.map((item) => (
            <Link key={item.path} to={item.path}>
              <motion.button
                whileHover={{ x: 5 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center space-x-3 w-full py-3 px-4 rounded-xl transition-all ${
                  location.pathname === item.path ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </motion.button>
            </Link>
          ))}
        </nav>

        <AdminProfile />

        <button 
          onClick={handleLogout}
          className="w-full mt-4 py-3 rounded-xl bg-gray-900 text-white flex items-center justify-center space-x-2 font-bold hover:bg-gray-800 transition-all shadow-lg"
        >
          <FaDownload /> <span>Logout</span>
        </button>
      </aside>

      {/* Sidebar - Mobile */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-white z-50 p-6 shadow-2xl lg:hidden flex flex-col"
            >
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-2xl font-bold text-blue-700">Admin</h2>
                <button onClick={() => setSidebarOpen(false)} className="p-2 text-gray-500">
                  <FaTimes size={24} />
                </button>
              </div>

              <nav className="flex-1 space-y-3">
                {navItems.map((item) => (
                  <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}>
                    <button
                      className={`flex items-center space-x-4 w-full py-4 px-5 rounded-2xl transition-all ${
                        location.pathname === item.path ? "bg-blue-600 text-white shadow-lg" : "text-gray-600"
                      }`}
                    >
                      {React.cloneElement(item.icon, { className: location.pathname === item.path ? "text-white" : item.icon.props.className })}
                      <span className="text-lg">{item.label}</span>
                    </button>
                  </Link>
                ))}
              </nav>

              <div className="mt-auto pt-6 border-t border-gray-100">
                <AdminProfile />
                <button 
                  onClick={handleLogout}
                  className="w-full mt-4 py-4 rounded-2xl bg-gray-900 text-white flex items-center justify-center space-x-3 font-bold shadow-xl"
                >
                  <FaDownload /> <span>Logout</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header - Mobile */}
        <header className="lg:hidden h-16 bg-white border-b border-gray-100 flex items-center px-4 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <FaBars size={20} />
          </button>
          <h1 className="ml-4 font-bold text-gray-800">Add Student</h1>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto"
          >
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 md:p-10">
                <div className="mb-8">
                  <h1 className="text-2xl font-bold text-gray-900">Student Enrollment</h1>
                  <p className="text-gray-500">Please provide student details and capture their face.</p>
                </div>

                <div className="grid lg:grid-cols-12 gap-10">
                  {/* Left: Form */}
                  <div className="lg:col-span-5 space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700 ml-1">Full Name</label>
                        <input
                          name="name"
                          value={student.name}
                          onChange={handleChange}
                          placeholder="John Doe"
                          className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700 ml-1">USN / ID Number</label>
                        <input
                          name="usn"
                          value={student.usn}
                          onChange={handleChange}
                          placeholder="4SR21CS001"
                          className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-700 ml-1">Age</label>
                          <input
                            name="age"
                            type="number"
                            value={student.age}
                            onChange={handleChange}
                            placeholder="20"
                            className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-700 ml-1">Course</label>
                          <input
                            name="course"
                            value={student.course}
                            onChange={handleChange}
                            placeholder="CSE"
                            className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700 ml-1">Phone Number</label>
                        <input
                          name="phone"
                          value={student.phone}
                          onChange={handleChange}
                          placeholder="+91 9876543210"
                          className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right: Camera */}
                  <div className="lg:col-span-7 flex flex-col">
                    <div className="relative group flex-1 min-h-[300px] md:min-h-[400px]">
                      <div className="absolute inset-0 bg-gray-900 rounded-3xl overflow-hidden shadow-2xl ring-8 ring-gray-100 transition-all group-hover:ring-blue-50">
                        <video
                          ref={videoRef}
                          autoPlay
                          muted
                          playsInline
                          className="w-full h-full object-cover scale-x-[-1]"
                        />
                        <div className="absolute inset-0 border-2 border-white/20 pointer-events-none rounded-3xl" />
                        
                        {/* Camera Indicator */}
                        <div className="absolute top-4 right-4 flex items-center space-x-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                          <span className="text-[10px] font-bold text-white uppercase tracking-wider">Live</span>
                        </div>
                      </div>

                      <canvas
                        ref={canvasRef}
                        className="hidden"
                      ></canvas>
                    </div>

                    <div className="mt-8 flex flex-col items-center text-center">
                      <p className="text-sm text-gray-500 mb-6 max-w-xs">
                        Ensure good lighting and face the camera directly for optimal enrollment.
                      </p>

                      <motion.button
                        disabled={loading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={captureAndSend}
                        className={`w-full sm:w-auto px-12 py-4 rounded-2xl font-bold text-white shadow-xl transition-all ${
                          loading ? "bg-gray-400 cursor-not-allowed" : "bg-gradient-to-r from-blue-700 to-indigo-600 hover:shadow-blue-200"
                        }`}
                      >
                        {loading ? "Enrolling..." : "Capture & Enroll Face"}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Addstudent;
