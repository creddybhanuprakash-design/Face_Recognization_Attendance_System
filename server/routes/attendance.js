const express = require("express");
const router = express.Router();

const AttendanceLog = require("../models/AttendanceLog");
const Student = require("../models/Student");
const PeriodwiseAttendance = require("../models/PeriodwiseAttendanceLog");
const getPeriodForCurrentTime = require("../utils/timetable");

router.post("/", async (req, res) => {
  const { usn, name, course, recognizedAt } = req.body;

  if (!usn) {
    return res.status(400).json({ message: "USN is required" });
  }

  try {
    let student = await Student.findOne({ usn });

    if (!student && (!name || !course)) {
      return res.status(404).json({
        message: "Student not found, and insufficient manual data provided"
      });
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const recognizedDate = recognizedAt ? new Date(recognizedAt) : new Date();

    const existingLog = await AttendanceLog.findOne({
      usn,
      recognizedAt: {
        $gte: new Date(todayStr),
        $lt: new Date(new Date(todayStr).setDate(new Date(todayStr).getDate() + 1))
      }
    });

    if (existingLog) {
      // We still proceed to check periodwise if today's main log exists
      // but let's log the daily one if it doesn't.
    } else {
      const log = new AttendanceLog({
        usn,
        name: student ? student.name : name,
        course: student ? student.course : course,
        recognizedAt: recognizedDate
      });
      await log.save();
    }

    // ALSO LOG PERIODWISE FOR MANUAL ENTRY
    const { periodName, subject } = getPeriodForCurrentTime(recognizedDate);
    
    if (periodName && !["Break", "Lunch", "Closed", "No Period"].includes(periodName)) {
      const todayStart = new Date(recognizedDate);
      todayStart.setHours(0,0,0,0);
      const todayEnd = new Date(recognizedDate);
      todayEnd.setHours(23,59,59,999);

      const existingPeriodLog = await PeriodwiseAttendance.findOne({
        usn,
        period: periodName,
        recognizedAt: { $gte: todayStart, $lte: todayEnd }
      });

      if (!existingPeriodLog) {
        const pLog = new PeriodwiseAttendance({
          usn,
          name: student ? student.name : name,
          course: student ? student.course : course,
          period: periodName,
          subject: subject,
          recognizedAt: recognizedDate
        });
        await pLog.save();
      }
    }

    res.status(200).json({
      message: "Attendance logged successfully (Daily & Period-wise)"
    });

  } catch (err) {
    console.error("Error logging attendance:", err);
    res.status(500).json({
      message: "Failed to log attendance"
    });
  }
});


router.get("/", async (req, res) => {
  try {
    const logs = await AttendanceLog.find().sort({ recognizedAt: -1 });
    res.json(logs);
  } catch (err) {
    console.error("Error fetching logs:", err);
    res.status(500).json({
      message: "Failed to fetch attendance logs"
    });
  }
});

module.exports = router;