const express = require("express");
const router = express.Router();

const Student = require("../models/Student");
const PeriodwiseAttendance = require("../models/PeriodwiseAttendanceLog");
const getPeriodForCurrentTime = require("../utils/timetable");


/* =============================
   MARK PERIODWISE ATTENDANCE
============================= */

router.post("/", async (req, res) => {

  const { usn, recognizedAt, period: manualPeriod, subject: manualSubject } = req.body;

  if (!usn) {
    return res.status(400).json({
      message: "USN is required"
    });
  }

  try {

    const student = await Student.findOne({ usn });

    if (!student) {
      return res.status(404).json({
        message: "Student not found"
      });
    }

    const now = recognizedAt ? new Date(recognizedAt) : new Date();
    
    let periodName = manualPeriod;
    let subject = manualSubject;

    if (!periodName) {
      const timetableInfo = getPeriodForCurrentTime(now);
      periodName = timetableInfo.periodName;
      subject = timetableInfo.subject;
    }

    if (
      !manualPeriod && (
      periodName === "Break" ||
      periodName === "Lunch" ||
      periodName === "Closed" ||
      periodName === "No Period")
    ) {
      return res.status(400).json({
        message: `Attendance not allowed (${periodName})`
      });
    }

    const today = new Date(now.toISOString().split("T")[0]);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const existing = await PeriodwiseAttendance.findOne({
      usn,
      period: periodName,
      recognizedAt: { $gte: today, $lt: tomorrow }
    });

    if (existing) {
      return res.status(400).json({
        message: `Attendance already marked for ${periodName}`
      });
    }

    const log = new PeriodwiseAttendance({
      usn: student.usn,
      name: student.name,
      course: student.course,
      period: periodName, 
      subject: subject || "---",
      recognizedAt: now
    });

    await log.save();

    res.status(200).json({
      message: `Attendance recorded for ${periodName}`,
      log
    });

  } catch (err) {

    console.error("Periodwise attendance error:", err);

    res.status(500).json({
      message: "Internal server error"
    });

  }

});


/* =============================
   GET ALL PERIODWISE LOGS
============================= */

router.get("/", async (req, res) => {

  try {

    const logs = await PeriodwiseAttendance
      .find()
      .sort({ recognizedAt: -1 });

    res.json(logs);

  } catch (err) {

    console.error("Error fetching logs:", err);

    res.status(500).json({
      message: "Failed to fetch logs"
    });

  }

});

module.exports = router;