import "../styles/App.css";
import { FaHome, FaFileAlt, FaUser, FaDownload, FaBars, FaTimes, FaUsers, FaUserCheck, FaUserTimes, FaCalendarAlt, FaClock, FaArrowLeft } from "react-icons/fa";
import { useNavigate, Link, useLocation } from "react-router-dom";
import axios from "axios";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatDateOnly, formatDateTime } from "../utils/formatDate";
import AdminProfile from "../components/AdminProfile";
import { API_BASE_URL } from "../utils/apiConfig";

const Dashboard = () => {
  const navigate = useNavigate();
  const [attendance, setAttendance] = useState([]);
  const [students, setStudents] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);
  const [selectedCourse, setSelectedCourse] = useState("All");
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  
  const location = useLocation();

  const [manualForm, setManualForm] = useState({
    name: "",
    usn: "",
    course: "",
    recognizedAt: ""
  });

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [attendanceRes, studentsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/students/attendance`),
          axios.get(`${API_BASE_URL}/api/students`)
        ]);
        setAttendance(attendanceRes.data);
        setStudents(studentsRes.data);
      } catch (err) {
        console.error("Fetch error:", err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  const presentToday = attendance.filter((log) => 
    new Date(log.recognizedAt).toISOString().split("T")[0] === today
  );

  const totalStudents = students.length;
  const absentStudents = Math.max(0, totalStudents - presentToday.length);

  const chartData = [
    { name: "Present", value: presentToday.length },
    { name: "Absent", value: absentStudents },
  ];

  const COLORS = ["#3b82f6", "#ef4444"];

  const handleManualAttendance = async () => {
    if (!manualForm.name || !manualForm.usn) {
      alert("Please fill name and USN");
      return;
    }
    try {
      let finalTimestamp;
      const today = new Date().toISOString().split("T")[0];
      const selectedDate = manualForm.recognizedAt || today;

      if (selectedDate === today) {
        finalTimestamp = new Date().toISOString();
      } else {
        finalTimestamp = new Date(selectedDate).toISOString();
      }

      // Manual entry goes to the main attendance log
      const res = await axios.post(`${API_BASE_URL}/api/attendance`, {
        ...manualForm,
        recognizedAt: finalTimestamp
      });
      alert(res.data.message);
      setManualForm({ name: "", usn: "", course: "", recognizedAt: "" });
      const response = await axios.get(`${API_BASE_URL}/api/students/attendance`);
      setAttendance(response.data);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to mark attendance");
    }
  };

  const downloadReport = async (type) => {
    try {
      let endpoint = "";
      let filename = "";
      
      if (type === 'daily') {
        endpoint = `daily-excel?date=${reportDate}`;
        filename = `Daily_Attendance_${reportDate}.xlsx`;
      } else {
        const [year, month] = reportDate.split('-');
        endpoint = `monthly-excel?month=${month}&year=${year}`;
        filename = `Monthly_Report_${month}_${year}.xlsx`;
      }

      const response = await axios.get(`${API_BASE_URL}/api/report/${endpoint}`, {
        responseType: "blob" 
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert("Report generation failed");
    }
  };

  const courseList = ["All", ...new Set(students.map((s) => s.course))];
  const filteredAttendance = selectedCourse === "All" 
    ? attendance 
    : attendance.filter((log) => log.course === selectedCourse);

  const paginatedData = filteredAttendance.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleLogout = () => {
    localStorage.removeItem("admin");
    navigate("/Signin");
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
                <button onClick={() => setSidebarOpen(false)} className="p-2"><FaTimes size={24} /></button>
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
        <header className="lg:hidden h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center">
            <button onClick={() => setSidebarOpen(true)} className="p-2"><FaBars size={20} /></button>
            <h1 className="ml-4 font-bold text-gray-800 tracking-tight">Dashboard</h1>
          </div>
          <Link to="/" className="text-blue-600 text-sm font-bold flex items-center gap-1">
            <FaArrowLeft /> Face Mode
          </Link>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Top Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Attendance Overview</h1>
                <p className="text-gray-500">Real-time status of students for {formatDateOnly(new Date())}</p>
              </div>
              <div className="flex flex-wrap gap-3 items-center">
                <input 
                  type="date" 
                  value={reportDate} 
                  onChange={(e) => setReportDate(e.target.value)}
                  className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => downloadReport('daily')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-blue-100 flex items-center space-x-2 transition-all"
                >
                  <FaFileAlt /> <span>Daily Excel</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => downloadReport('monthly')}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-purple-100 flex items-center space-x-2 transition-all"
                >
                  <FaCalendarAlt /> <span>Monthly Excel</span>
                </motion.button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: "Total Enrolled", value: totalStudents, icon: <FaUsers />, color: "blue" },
                { label: "Present Today", value: presentToday.length, icon: <FaUserCheck />, color: "green" },
                { label: "Absent Today", value: absentStudents, icon: <FaUserTimes />, color: "red" },
              ].map((stat, i) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  key={stat.label}
                  className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">{stat.label}</p>
                    <p className="text-4xl font-black text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${
                    stat.color === "blue" ? "bg-blue-50 text-blue-600" :
                    stat.color === "green" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                  }`}>
                    {stat.icon}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Content Grid */}
            <div className="grid lg:grid-cols-12 gap-8">
              {/* Chart Section */}
              <div className="lg:col-span-4 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col min-h-[400px]">
                <h3 className="text-xl font-bold text-gray-900 mb-6 shrink-0">Distribution</h3>
                <div className="relative h-[300px] w-full">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                    minWidth={0}
                    minHeight={300}
                    initialDimension={{ width: 300, height: 300 }}
                  >
                    <PieChart>
                      <Pie data={chartData} innerRadius={80} outerRadius={100} paddingAngle={5} dataKey="value">
                        {chartData.map((entry, index) => <Cell key={index} fill={COLORS[index]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Logs Section */}
              <div className="lg:col-span-8 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <h3 className="text-xl font-bold text-gray-900">Recent Activity</h3>
                  <select
                    value={selectedCourse}
                    onChange={(e) => { setSelectedCourse(e.target.value); setCurrentPage(1); }}
                    className="bg-gray-50 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                    {courseList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50/50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Student</th>
                        <th className="px-6 py-4">USN</th>
                        <th className="px-6 py-4">Course</th>
                        <th className="px-6 py-4">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {paginatedData.map((log, i) => (
                        <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-gray-900">{log.name}</td>
                          <td className="px-6 py-4 text-gray-600">{log.usn}</td>
                          <td className="px-6 py-4"><span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase">{log.course || "N/A"}</span></td>
                          <td className="px-6 py-4 text-gray-500 text-sm font-medium uppercase tracking-tight">
                            {formatDateTime(log.recognizedAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Manual Entry Section */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Manual Attendance Override</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <input
                  placeholder="Student Name"
                  value={manualForm.name}
                  onChange={e => setManualForm({...manualForm, name: e.target.value})}
                  className="px-5 py-3.5 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 transition-all outline-none"
                />
                <input
                  placeholder="USN"
                  value={manualForm.usn}
                  onChange={e => setManualForm({...manualForm, usn: e.target.value})}
                  className="px-5 py-3.5 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 transition-all outline-none"
                />
                <input
                  placeholder="Course (Optional)"
                  value={manualForm.course}
                  onChange={e => setManualForm({...manualForm, course: e.target.value})}
                  className="px-5 py-3.5 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 transition-all outline-none"
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleManualAttendance}
                  className="bg-gray-900 text-white font-bold rounded-2xl px-6 py-3.5 hover:bg-blue-600 transition-all"
                >
                  Mark Present
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
