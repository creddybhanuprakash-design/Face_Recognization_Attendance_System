import "../styles/App.css";
import { FaHome, FaFileAlt, FaUser, FaClock, FaBars, FaTimes, FaSearch, FaChevronRight, FaCamera, FaDownload, FaEdit, FaTrash, FaArrowLeft } from 'react-icons/fa';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDateOnly } from "../utils/formatDate";
import AdminProfile from "../components/AdminProfile";
import { API_BASE_URL, FACE_API_URL } from "../utils/apiConfig";

const Enrolled = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isUpdatingFace, setIsUpdatingFace] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', course: '', phone: '', age: '' });

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const location = useLocation();

  const fetchData = async () => {
    try {
      const [studentsRes, attendanceRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/students`),
        axios.get(`${API_BASE_URL}/api/students/attendance`),
      ]);
      setStudents(studentsRes.data);
      setAttendanceLogs(attendanceRes.data);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (usn) => {
    if (!window.confirm(`Are you sure you want to delete student ${usn}?`)) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/students/${usn}`);
      alert("Student deleted successfully");
      fetchData();
      setSelectedStudent(null);
    } catch {
      alert("Failed to delete student");
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_BASE_URL}/api/students/${selectedStudent.usn}`, editForm);
      alert("Student updated successfully");
      setIsEditing(false);
      fetchData();
      setSelectedStudent(prev => ({ ...prev, ...editForm }));
    } catch {
      alert("Failed to update student");
    }
  };

  useEffect(() => {
    let stream = null;
    if (isUpdatingFace) {
      const getCamera = async () => {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } 
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              videoRef.current.play().catch(e => console.error("Play error:", e));
            };
          }
        } catch (err) {
          console.error("Camera error:", err);
          alert("Could not access camera");
        }
      };
      getCamera();
    }
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [isUpdatingFace]);

  const handleUpdateFace = async () => {
    if (!selectedStudent) return;
    setUpdateLoading(true);
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    
    if (!video || video.readyState < 2) {
      alert("Camera stream not ready. Please wait.");
      setUpdateLoading(false);
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;
    
    if (width === 0 || height === 0) {
      alert("Invalid camera dimensions");
      setUpdateLoading(false);
      return;
    }

    canvas.width = width;
    canvas.height = height;
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
      setUpdateLoading(false);
      return;
    }

    const imageData = canvas.toDataURL("image/jpeg", 0.9);

    try {
      await axios.post(`${FACE_API_URL}/enroll`, {
        usn: selectedStudent.usn,
        image: imageData
      });
      alert("Face updated successfully!");
      setIsUpdatingFace(false);
    } catch (err) {
      console.error(err);
      alert("Failed to update face");
    } finally {
      setUpdateLoading(false);
    }
  };

  const startEditing = () => {
    setEditForm({
      name: selectedStudent.name,
      course: selectedStudent.course,
      phone: selectedStudent.phone,
      age: selectedStudent.age
    });
    setIsEditing(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("admin");
    navigate("/Signin");
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  };

  const filteredStudents = students.filter(s => 
    s.name?.toLowerCase().includes(search.toLowerCase()) || 
    s.usn?.toLowerCase().includes(search.toLowerCase())
  );

  const todayDate = new Date().toISOString().split("T")[0];

  const getAttendanceStatus = (usn) => {
    const hasLogToday = attendanceLogs.some(log => {
      const logDate = new Date(log.recognizedAt).toISOString().split("T")[0];
      return log.usn === usn && logDate === todayDate;
    });
    return hasLogToday ? "Present" : "Absent";
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
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent">Admin Panel</h2>
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
          className="w-full mt-4 py-3 rounded-xl bg-gray-900 text-white flex items-center justify-center space-x-2 font-bold hover:bg-gray-800 transition-all"
        >
          <FaDownload /> <span>Logout</span>
        </button>
      </aside>

      {/* Sidebar - Mobile */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden" />
            <motion.aside initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} className="fixed inset-y-0 left-0 w-72 bg-white z-50 p-6 shadow-2xl lg:hidden flex flex-col">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-2xl font-bold text-blue-700">Admin</h2>
                <button onClick={() => setSidebarOpen(false)}><FaTimes size={24} /></button>
              </div>
              <nav className="flex-1 space-y-3">
                {navItems.map((item) => (
                  <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}>
                    <button className={`flex items-center space-x-4 w-full py-4 px-5 rounded-2xl ${location.pathname === item.path ? "bg-blue-600 text-white" : "text-gray-600"}`}>
                      {item.icon} <span>{item.label}</span>
                    </button>
                  </Link>
                ))}
              </nav>
              <div className="mt-auto pt-6 border-t border-gray-100">
                <AdminProfile />
                <button 
                  onClick={handleLogout}
                  className="w-full mt-4 py-4 rounded-2xl bg-gray-900 text-white flex items-center justify-center space-x-3 font-bold"
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
        <header className="lg:hidden h-16 bg-white border-b border-gray-100 flex items-center px-4 shrink-0">
          <button onClick={() => setSidebarOpen(true)}><FaBars size={20} /></button>
          <h1 className="ml-4 font-bold text-gray-800">Enrolled Students</h1>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Student Directory</h1>
                <p className="text-gray-500">Manage and view all registered students</p>
              </div>
              <div className="relative w-full md:w-96 group">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Search name or USN..."
                  value={search}
                  onChange={handleSearchChange}
                  className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none shadow-sm"
                />
              </div>
            </div>

            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                      <th className="px-8 py-5">Student Information</th>
                      <th className="px-8 py-5">Course</th>
                      <th className="px-8 py-5">Contact</th>
                      <th className="px-8 py-5">Enrollment Date</th>
                      <th className="px-8 py-5">Status Today</th>
                      <th className="px-8 py-5">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map((s, i) => (
                        <motion.tr 
                          initial={{ opacity: 0 }} 
                          animate={{ opacity: 1 }} 
                          transition={{ delay: i * 0.05 }}
                          key={s._id} 
                          className="hover:bg-gray-50/50 transition-colors group"
                        >
                          <td className="px-8 py-5">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                                {s.name?.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900">{s.name}</p>
                                <p className="text-xs text-gray-500 font-mono uppercase">{s.usn}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-xs font-bold">{s.course}</span>
                          </td>
                          <td className="px-8 py-5 text-gray-600 text-sm">{s.phone}</td>
                          <td className="px-8 py-5 text-gray-500 text-sm">{formatDateOnly(s.enrolledAt)}</td>
                          <td className="px-8 py-5">
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${getAttendanceStatus(s.usn) === "Present" ? "bg-green-500 animate-pulse" : "bg-red-400"}`} />
                              <span className={`text-sm font-bold ${getAttendanceStatus(s.usn) === "Present" ? "text-green-600" : "text-red-500"}`}>
                                {getAttendanceStatus(s.usn)}
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <button 
                              onClick={() => setSelectedStudent(s)}
                              className="p-2 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-lg transition-all"
                            >
                              <FaChevronRight />
                            </button>
                          </td>
                        </motion.tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center py-20 text-gray-400">
                          {loading ? "Loading database..." : "No students found matching your search."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Student Details Modal */}
      <AnimatePresence>
        {selectedStudent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setSelectedStudent(null)} 
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700 p-8 flex justify-end">
                <button onClick={() => setSelectedStudent(null)} className="text-white/80 hover:text-white transition-colors">
                  <FaTimes size={24} />
                </button>
              </div>
              <div className="px-8 pb-10 -mt-12 text-center">
                <div className="w-24 h-24 mx-auto rounded-3xl bg-white p-1.5 shadow-xl mb-4">
                  <div className="w-full h-full rounded-[1.2rem] bg-blue-50 text-blue-700 flex items-center justify-center text-3xl font-black uppercase">
                    {selectedStudent.name?.charAt(0)}
                  </div>
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-1">{selectedStudent.name}</h2>
                <p className="text-blue-600 font-bold text-sm tracking-widest uppercase mb-8">{selectedStudent.usn}</p>
                
                {isEditing ? (
                  <form onSubmit={handleEditSubmit} className="space-y-4 mb-8 text-left">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase ml-1">Student Name</label>
                      <input 
                        value={editForm.name} 
                        onChange={e => setEditForm({...editForm, name: e.target.value})}
                        className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 focus:bg-white focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase ml-1">Course</label>
                      <input 
                        value={editForm.course} 
                        onChange={e => setEditForm({...editForm, course: e.target.value})}
                        className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 focus:bg-white focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Phone</label>
                        <input 
                          value={editForm.phone} 
                          onChange={e => setEditForm({...editForm, phone: e.target.value})}
                          className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 focus:bg-white focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Age</label>
                        <input 
                          value={editForm.age} 
                          onChange={e => setEditForm({...editForm, age: e.target.value})}
                          className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 focus:bg-white focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold">Cancel</button>
                      <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">Save Changes</button>
                    </div>
                  </form>
                ) : isUpdatingFace ? (
                  <div className="space-y-4 mb-8">
                    <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border-2 border-blue-500 shadow-lg">
                      <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
                      <canvas ref={canvasRef} className="hidden" />
                    </div>
                    <div className="flex gap-2">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsUpdatingFace(false)}
                        className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-all"
                      >
                        Cancel
                      </motion.button>
                      <motion.button
                        disabled={updateLoading}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleUpdateFace}
                        className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center justify-center space-x-2"
                      >
                        {updateLoading ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <FaCamera />
                            <span>Update Face</span>
                          </>
                        )}
                      </motion.button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 mb-8">
                    <button 
                      onClick={startEditing}
                      className="w-full py-4 rounded-2xl bg-white border-2 border-gray-100 text-gray-700 font-bold hover:border-blue-500 hover:text-blue-600 transition-all flex items-center justify-center space-x-3 shadow-sm"
                    >
                      <FaEdit /> <span>Edit Details</span>
                    </button>
                    <button 
                      onClick={() => setIsUpdatingFace(true)}
                      className="w-full py-4 rounded-2xl bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 transition-all flex items-center justify-center space-x-3"
                    >
                      <FaCamera /> <span>Update Face Recognition</span>
                    </button>
                    <button 
                      onClick={() => handleDelete(selectedStudent.usn)}
                      className="w-full py-4 rounded-2xl bg-red-50 text-red-600 font-bold hover:bg-red-100 transition-all flex items-center justify-center space-x-3"
                    >
                      <FaTrash /> <span>Delete Student</span>
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-left">
                  {[
                    { label: "Course", value: selectedStudent.course },
                    { label: "Age", value: selectedStudent.age },
                    { label: "Contact", value: selectedStudent.phone },
                    { label: "Enrollment", value: new Date(selectedStudent.enrolledAt).toLocaleDateString() },
                  ].map(item => (
                    <div key={item.label} className="bg-gray-50 p-4 rounded-2xl">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-1">{item.label}</p>
                      <p className="text-sm font-bold text-gray-800">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Enrolled;
