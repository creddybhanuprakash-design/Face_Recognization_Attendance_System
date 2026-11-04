const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  name: String,
  usn: String,
  age: String,
  course: String,
  phone: String,
  enrolledAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Student", studentSchema);