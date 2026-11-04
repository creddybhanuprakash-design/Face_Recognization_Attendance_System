import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUserCircle, FaTimes, FaEnvelope, FaShieldAlt } from 'react-icons/fa';

const AdminProfile = () => {
  const [isOpen, setIsOpen] = useState(false);
  const adminData = JSON.parse(localStorage.getItem('admin')) || { username: 'Admin', email: 'admin@example.com' };

  return (
    <div className="relative mt-auto pt-6 border-t border-gray-100">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 w-full p-2 rounded-2xl hover:bg-gray-50 transition-all group"
      >
        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-200 group-hover:shadow-blue-300 transition-all">
          <FaUserCircle size={24} />
        </div>
        <div className="text-left overflow-hidden">
          <p className="text-sm font-black text-gray-900 truncate">{adminData.username}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Administrator</p>
        </div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full left-0 w-64 mb-4 bg-white rounded-[2rem] shadow-2xl shadow-blue-100 border border-blue-50 p-6 z-50"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <FaShieldAlt size={20} />
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 transition-all"
              >
                <FaTimes size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Full Name</p>
                <p className="text-sm font-bold text-gray-900">{adminData.username}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Email Address</p>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                  <FaEnvelope className="text-blue-400" />
                  <span>{adminData.email}</span>
                </div>
              </div>
              <div className="pt-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black bg-green-50 text-green-600 uppercase tracking-widest">
                  Active Session
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminProfile;
