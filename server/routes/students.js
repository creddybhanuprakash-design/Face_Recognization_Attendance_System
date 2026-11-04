const express = require("express");
const router = express.Router();

const Student = require("../models/Student");
const AttendanceLog = require("../models/AttendanceLog");

router.post("/", async (req, res) => {
  const { name, usn, age, course, phone } = req.body;

  if (!name || !usn || !age || !course || !phone) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const newStudent = new Student({ name, usn, age, course, phone });
    await newStudent.save();
    res.status(200).json({ message: "Student saved to database!" });
  } catch (err) {
    console.error("Error saving student:", err);
    res.status(500).json({ message: "Failed to save student" });
  }
});


router.get("/", async (req, res) => {
  try {
    const students = await Student.find().sort({ enrolledAt: -1 });
    res.json(students);
  } catch (err) {
    console.error("Error fetching students:", err);
    res.status(500).json({ message: "Failed to fetch students" });
  }
});

// Edit student
router.put("/:usn", async (req, res) => {
  const { name, age, course, phone } = req.body;
  try {
    const updatedStudent = await Student.findOneAndUpdate(
      { usn: req.params.usn },
      { name, age, course, phone },
      { new: true }
    );
    if (!updatedStudent) return res.status(404).json({ message: "Student not found" });
    res.json({ message: "Student updated successfully", student: updatedStudent });
  } catch (err) {
    console.error("Error updating student:", err);
    res.status(500).json({ message: "Failed to update student" });
  }
});

// Delete student
router.delete("/:usn", async (req, res) => {
  try {
    const deletedStudent = await Student.findOneAndDelete({ usn: req.params.usn });
    if (!deletedStudent) return res.status(404).json({ message: "Student not found" });
    
    // Also delete attendance logs for this USN
    await AttendanceLog.deleteMany({ usn: req.params.usn });
    
    res.json({ message: "Student and logs deleted successfully" });
  } catch (err) {
    console.error("Error deleting student:", err);
    res.status(500).json({ message: "Failed to delete student" });
  }
});

router.get("/attendance", async (req, res) => {
  try {
    const logs = await AttendanceLog.find().sort({ recognizedAt: -1 });
    res.json(logs);
  } catch (err) {
    console.error("Error fetching logs:", err);
    res.status(500).json({ message: "Failed to fetch attendance logs" });
  }
});

module.exports = router;