import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaUserShield, FaLock, FaEnvelope, FaUser, FaArrowLeft } from "react-icons/fa";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../utils/apiConfig";

const Signin = () => {
  const [authMode, setAuthMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [retypePassword, setRetypePassword] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();
    if (password !== retypePassword) {
      alert("Passwords do not match!");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        alert(data.message || "Admin account created. Please sign in.");
        setAuthMode("login");
        setPassword("");
        setRetypePassword("");
      } else {
        alert(data.message);
      }
    } catch {
      alert("Something went wrong!");
    }
  };

  const handleSignin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem("admin", JSON.stringify({ ...data.admin, token: data.token }));
        window.location.href = "/dashboard";
      } else {
        alert(data.message);
      }
    } catch {
      alert("Signin failed!");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex flex-col md:flex-row bg-[#f8fafc] font-sans"
    >
      {/* Left Panel - Branding */}
      <div className="md:w-1/2 bg-[#1e40af] p-8 md:p-16 flex flex-col justify-between text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -ml-32 -mb-32" />
        
        <Link to="/" className="relative z-10 flex items-center space-x-2 text-white/80 hover:text-white transition-colors group">
          <FaArrowLeft className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold">Back to Frontpage</span>
        </Link>

        <div className="relative z-10 mt-12">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-blue-200 font-black uppercase tracking-widest text-sm mb-4">Official Admin Portal</p>
            <h1 className="text-4xl md:text-6xl font-black leading-[1.1] mb-8">
              Sri Ranganathar <br />
              <span className="text-blue-300">Institute of Technology.</span>
            </h1>
            <div className="h-1.5 w-24 bg-blue-400 rounded-full mb-8" />
            <p className="text-lg text-blue-100 max-w-md font-medium leading-relaxed">
              Secure access for faculty and administrators to manage real-time attendance, student enrollment, and academic reports.
            </p>
          </motion.div>
        </div>

        <div className="relative z-10 mt-12 p-6 bg-white/10 backdrop-blur-md rounded-[2rem] border border-white/10">
          <p className="text-sm font-bold text-blue-200 mb-2 uppercase tracking-tight">Computer Science Department</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/60 font-medium">Built by Bhanu</span>
            <span className="text-[10px] bg-blue-500/30 px-2 py-1 rounded-full text-white font-black tracking-widest uppercase">Admin v2.0</span>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="md:w-1/2 flex items-center justify-center p-6 md:p-12">
        <motion.div 
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl shadow-blue-900/5 p-8 md:p-12 border border-gray-100"
        >
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl shadow-inner">
              <FaUserShield />
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-2">
              {authMode === "login" ? "Welcome Back" : "Create Account"}
            </h2>
            <p className="text-gray-400 font-medium text-sm">Please enter your credentials to continue</p>
          </div>

          <div className="flex p-1.5 bg-gray-50 rounded-2xl mb-8 border border-gray-100">
            <button
              onClick={() => setAuthMode("login")}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                authMode === "login" ? "bg-white text-blue-600 shadow-lg" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setAuthMode("signup")}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                authMode === "signup" ? "bg-white text-blue-600 shadow-lg" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={authMode === "login" ? handleSignin : handleSignup} className="space-y-5">
            <AnimatePresence mode="wait">
              {authMode === "signup" && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="relative group"
                >
                  <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 transition-all outline-none text-gray-800 font-medium shadow-sm"
                    required
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative group">
              <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 transition-all outline-none text-gray-800 font-medium shadow-sm"
                required
              />
            </div>

            <div className="relative group">
              <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="password"
                placeholder="Secure Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 transition-all outline-none text-gray-800 font-medium shadow-sm"
                required
              />
            </div>

            {authMode === "signup" && (
              <div className="relative group">
                <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="password"
                  placeholder="Confirm Password"
                  value={retypePassword}
                  onChange={(e) => setRetypePassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 transition-all outline-none text-gray-800 font-medium shadow-sm"
                  required
                />
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-blue-700 to-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 transition-all mt-4"
            >
              {authMode === "login" ? "Sign In Securely" : "Create Admin Account"}
            </motion.button>
          </form>

          {authMode === "login" && (
            <div className="mt-8 text-center">
              <a href="#" className="text-xs font-bold text-gray-400 hover:text-blue-600 transition-colors">Forgot your password?</a>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Signin;
