import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { FaHome, FaFileAlt, FaUser, FaDownload, FaClock, FaBars, FaTimes, FaArrowLeft, FaEdit } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { formatDateTime } from "../utils/formatDate";
import AdminProfile from "../components/AdminProfile";
import { getAuthorizationHeader } from "../utils/authStorage";

const Period = () => {
  const navigate = useNavigate();
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  
  // State for editable subjects with localStorage persistence
  const [editablePeriods, setEditablePeriods] = useState(() => {
    const saved = localStorage.getItem('timetable_subjects');
    const defaultPeriods = [
      { name: "Period 1", subject: "DBMS / DAA / ESS / ToC", time: "9:00 - 9:50", color: "bg-orange-50 text-orange-600", start: 540, end: 590 },
      { name: "Period 2", subject: "DBMS / ToC / IOS", time: "9:50 - 10:40", color: "bg-blue-50 text-blue-600", start: 590, end: 640 },
      { name: "Period 3", subject: "ESS / P&T / DBMS", time: "10:40 - 11:30", color: "bg-green-50 text-green-600", start: 640, end: 690 },
      { name: "Period 4", subject: "DAA / DBMS / ToC", time: "11:45 - 12:35", color: "bg-purple-50 text-purple-600", start: 705, end: 755 },
      { name: "Period 5", subject: "IOS / ToC / DAA", time: "12:35 - 1:25", color: "bg-cyan-50 text-cyan-600", start: 755, end: 805 },
      { name: "Period 6", subject: "LAB / LIB", time: "2:05 - 2:55", color: "bg-pink-50 text-pink-600", start: 845, end: 895 },
      { name: "Period 7", subject: "LAB / P&T", time: "2:55 - 3:45", color: "bg-indigo-50 text-indigo-600", start: 895, end: 945 },
      { name: "Period 8", subject: "LAB / DAA", time: "3:45 - 4:35", color: "bg-amber-50 text-amber-600", start: 945, end: 995 }
    ];
    return saved ? JSON.parse(saved) : defaultPeriods;
  });

  const [editingPeriodIndex, setEditingPeriodIndex] = useState(null);
  const [tempSubject, setTempSubject] = useState("");

  const [manualForm, setManualForm] = useState({
    name: "",
    usn: "",
    period: "Period 1",
    recognizedAt: new Date().toISOString().split('T')[0]
  });

  const location = useLocation();

  const handleManualAttendance = async () => {
    if (!manualForm.name || !manualForm.usn || !manualForm.period) {
      alert("Please fill name, USN and select Period");
      return;
    }
    try {
      const selectedPeriodData = editablePeriods.find(p => p.name === manualForm.period);
      
      let finalTimestamp;
      const today = new Date().toISOString().split('T')[0];
      if (manualForm.recognizedAt === today) {
        // If today, use current precise time
        finalTimestamp = new Date().toISOString();
      } else {
        // Use selected date at midnight (standard for historical data)
        finalTimestamp = new Date(manualForm.recognizedAt).toISOString();
      }

      const res = await axios.post("http://localhost:5001/api/periodwise-attendance", {
        usn: manualForm.usn,
        period: manualForm.period,
        subject: selectedPeriodData?.subject || "---",
        recognizedAt: finalTimestamp
      });
      alert(res.data.message);
      setManualForm({ 
        ...manualForm,
        name: "", 
        usn: ""
      });
      fetchAttendanceData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to mark attendance");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin");
    navigate("/Signin");
  };

  const handleSubjectEdit = (index) => {
    setEditingPeriodIndex(index);
    setTempSubject(editablePeriods[index].subject);
  };

  const saveSubject = () => {
    const newPeriods = [...editablePeriods];
    newPeriods[editingPeriodIndex].subject = tempSubject;
    setEditablePeriods(newPeriods);
    localStorage.setItem('timetable_subjects', JSON.stringify(newPeriods));
    setEditingPeriodIndex(null);
  };

  // Helper to normalize period name for display and filtering
  const getNormalizedPeriodName = (log) => {
    if (log.period && log.period.startsWith("Period")) return log.period;
    
    // If it's a subject name or unknown, try to find period by time
    const date = new Date(log.recognizedAt);
    const timeInMinutes = date.getHours() * 60 + date.getMinutes();
    
    const period = editablePeriods.find(p => timeInMinutes >= p.start && timeInMinutes < p.end);
    return period ? period.name : log.period;
  };

  const fetchAttendanceData = async () => {
    try {
      const response = await axios.get("http://localhost:5001/api/periodwise-attendance");
      setAttendanceData(response.data);
    } catch (error) {
      console.error("Error fetching attendance data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
    const interval = setInterval(fetchAttendanceData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Filter data by selected date first
  const dateFilteredData = attendanceData.filter(log => {
    const logDate = new Date(log.recognizedAt).toISOString().split('T')[0];
    return logDate === reportDate;
  });

  const filteredData = filter === "All"
    ? dateFilteredData
    : dateFilteredData.filter((log) => getNormalizedPeriodName(log) === filter);

  const getCurrentPeriodIndex = () => {
    const now = new Date();
    const time = now.getHours() * 60 + now.getMinutes();
    const ranges = [
      { start: 540, end: 590 },
      { start: 590, end: 640 },
      { start: 640, end: 690 },
      { start: 705, end: 755 },
      { start: 755, end: 805 },
      { start: 845, end: 895 },
      { start: 895, end: 945 },
      { start: 945, end: 995 }
    ];
    return ranges.findIndex(r => time >= r.start && time < r.end);
  };

  const downloadPeriodReport = async () => {
    try {
      const periodParam = filter === "All" ? "" : `&period=${filter}`;
      const response = await fetch(`http://localhost:5001/api/report/period-excel?date=${reportDate}${periodParam}`, {
        headers: { Authorization: getAuthorizationHeader() }
      });
      if (!response.ok) throw new Error("Report download failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Period_Attendance_${filter}_${reportDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.log(error);
      alert("Download failed");
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

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="lg:hidden h-16 bg-white border-b border-gray-100 flex items-center px-4 shrink-0">
          <button onClick={() => setSidebarOpen(true)}><FaBars size={20} /></button>
          <h1 className="ml-4 font-bold text-gray-800 tracking-tight">Period Analysis</h1>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto space-y-8">
            <div className="mb-2">
              <h1 className="text-3xl font-bold text-gray-900">Academic Timetable</h1>
              <p className="text-gray-500">Track student presence across different time slots</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {editablePeriods.map((period, index) => {
                const count = dateFilteredData.filter(log => getNormalizedPeriodName(log) === period.name).length;
                const isCurrent = getCurrentPeriodIndex() === index;
                const isEditing = editingPeriodIndex === index;

                return (
                  <motion.div
                    whileHover={{ y: -5 }}
                    key={index}
                    className={`p-6 rounded-[2rem] border-2 transition-all ${
                      isCurrent ? "border-blue-500 bg-blue-50/50 shadow-blue-100 shadow-xl" : "border-gray-100 bg-white shadow-sm"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 rounded-2xl font-bold text-sm ${period.color}`}>
                        {period.name}
                      </div>
                      {isCurrent && (
                        <span className="flex items-center gap-1.5 bg-blue-600 text-white px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
                          Active
                        </span>
                      )}
                    </div>
                    
                    {isEditing ? (
                      <div className="mb-4">
                        <input 
                          autoFocus
                          value={tempSubject}
                          onChange={(e) => setTempSubject(e.target.value)}
                          className="w-full p-2 text-sm border-2 border-blue-200 rounded-xl outline-none mb-2"
                        />
                        <button 
                          onClick={saveSubject}
                          className="text-[10px] bg-blue-600 text-white px-3 py-1 rounded-lg font-bold"
                        >
                          SAVE
                        </button>
                      </div>
                    ) : (
                      <div className="group cursor-pointer" onClick={() => handleSubjectEdit(index)}>
                        <h3 className="text-lg font-black text-gray-900 mb-1 leading-tight hover:text-blue-600 flex items-center gap-2">
                          {period.subject}
                          <FaEdit className="text-xs opacity-0 group-hover:opacity-100 transition-opacity" />
                        </h3>
                      </div>
                    )}

                    <p className="text-xs text-gray-400 font-bold mb-4">{period.time}</p>
                    <div className="flex items-end justify-between">
                      <p className="text-xs text-gray-500 font-medium">Present</p>
                      <p className="text-4xl font-black text-gray-900 tracking-tighter">{count}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row justify-between items-center gap-6">
                <h3 className="text-xl font-bold text-gray-900">Attendance Stream</h3>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Date:</span>
                    <input 
                      type="date" 
                      value={reportDate} 
                      onChange={(e) => setReportDate(e.target.value)}
                      className="bg-gray-50 border-none rounded-xl px-4 py-2 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Filter:</span>
                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      className="bg-gray-50 border-none rounded-xl px-6 py-2.5 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                    >
                      <option value="All">All Periods</option>
                      {editablePeriods.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
                    </select>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={downloadPeriodReport}
                    className="p-3 bg-green-600 text-white rounded-xl shadow-lg shadow-green-100 hover:bg-green-700 transition-all"
                    title="Download Excel Report"
                  >
                    <FaDownload />
                  </motion.button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                    <tr>
                      <th className="px-8 py-5 text-center w-20">#</th>
                      <th className="px-8 py-5">Student Information</th>
                      <th className="px-8 py-5">Assigned Slot</th>
                      <th className="px-8 py-5">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredData.length > 0 ? (
                      filteredData.map((log, index) => (
                        <tr key={index} className="hover:bg-gray-50/30 transition-colors">
                          <td className="px-8 py-6 text-center text-xs font-bold text-gray-300">{index + 1}</td>
                          <td className="px-8 py-6">
                            <div>
                              <p className="font-bold text-gray-900">{log.name}</p>
                              <p className="text-[10px] font-mono text-blue-500 font-bold uppercase tracking-widest">{log.usn}</p>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter">
                              {getNormalizedPeriodName(log)}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-gray-400 text-xs font-medium uppercase tracking-tight">
                            {formatDateTime(log.recognizedAt)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="text-center py-20 text-gray-400 font-medium italic">
                          {loading ? "Synchronizing records..." : "No attendance data captured for this criteria."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Manual Entry Section */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <FaEdit className="text-blue-500" />
                Manual Period Attendance Override
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Student Name</span>
                  <input
                    placeholder="Enter Name"
                    value={manualForm.name}
                    onChange={e => setManualForm({...manualForm, name: e.target.value})}
                    className="px-5 py-3.5 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 transition-all outline-none text-sm font-bold"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">USN / ID</span>
                  <input
                    placeholder="Enter USN"
                    value={manualForm.usn}
                    onChange={e => setManualForm({...manualForm, usn: e.target.value})}
                    className="px-5 py-3.5 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 transition-all outline-none text-sm font-bold"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Date</span>
                  <input
                    type="date"
                    value={manualForm.recognizedAt}
                    onChange={e => setManualForm({...manualForm, recognizedAt: e.target.value})}
                    className="px-5 py-3.5 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 transition-all outline-none text-sm font-bold"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Select Period</span>
                  <select
                    value={manualForm.period}
                    onChange={e => setManualForm({...manualForm, period: e.target.value})}
                    className="px-5 py-3.5 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 transition-all outline-none text-sm font-bold appearance-none cursor-pointer"
                  >
                    {editablePeriods.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleManualAttendance}
                className="mt-6 w-full py-4 rounded-2xl bg-gray-900 text-white font-black text-sm tracking-widest uppercase shadow-xl hover:bg-gray-800 transition-all flex items-center justify-center space-x-3"
              >
                <span>RECORD PERIOD ATTENDANCE</span>
              </motion.button>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Period;
