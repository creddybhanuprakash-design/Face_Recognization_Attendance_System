const mongoose = require("mongoose");

const attendanceLogSchema = new mongoose.Schema({
  usn: String,
  name: String,
  course: String,
  recognizedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("AttendanceLog", attendanceLogSchema);