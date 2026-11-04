const express = require("express");
const router = express.Router();
const ExcelJS = require("exceljs");
const Student = require("../models/Student");
const AttendanceLog = require("../models/AttendanceLog");
const PeriodwiseAttendance = require("../models/PeriodwiseAttendanceLog");

// Get Day, Month, Year
const getDates = (dateInput) => {
  const d = dateInput ? new Date(dateInput) : new Date();
  const start = new Date(d.setHours(0,0,0,0));
  const end = new Date(d.setHours(23,59,59,999));
  return { start, end, dateStr: start.toISOString().split('T')[0] };
};

/* =============================
   DAILY EXCEL REPORT (9:00 - 9:15 AM)
   ============================= */
router.get("/daily-excel", async (req, res) => {
  try {
    const { start, end, dateStr } = getDates(req.query.date);
    const students = await Student.find().sort({ usn: 1 });
    
    // For daily report, we check AttendanceLog (main entry) between 9:00 and 9:15
    const attendance = await AttendanceLog.find({
      recognizedAt: { $gte: start, $lte: end }
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Daily Attendance");

    worksheet.columns = [
      { header: "USN", key: "usn", width: 15 },
      { header: "Student Name", key: "name", width: 30 },
      { header: "Course", key: "course", width: 15 },
      { header: "Status (9:00-9:15 AM)", key: "status", width: 25 },
      { header: "Time Recorded", key: "time", width: 20 }
    ];

    // Styling
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    students.forEach(student => {
      const log = attendance.find(a => a.usn === student.usn);
      let status = "Absent";
      let time = "---";

      if (log) {
        const logTime = new Date(log.recognizedAt);
        const hours = logTime.getHours();
        const minutes = logTime.getMinutes();
        
        // Check if between 9:00 and 9:15
        if (hours === 9 && minutes <= 15) {
          status = "Present (On Time)";
        } else {
          status = "Late Entry";
        }
        time = logTime.toLocaleTimeString();
      }

      worksheet.addRow({
        usn: student.usn,
        name: student.name,
        course: student.course,
        status: status,
        time: time
      });
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=Daily_Attendance_${dateStr}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating excel");
  }
});

/* =============================
   PERIOD-WISE EXCEL REPORT
   ============================= */
router.get("/period-excel", async (req, res) => {
  try {
    const { start, end, dateStr } = getDates(req.query.date);
    const periodFilter = req.query.period; // Optional filter by period name (e.g. "Period 1")
    const students = await Student.find().sort({ usn: 1 });
    
    const query = { recognizedAt: { $gte: start, $lte: end } };
    const attendance = await PeriodwiseAttendance.find(query);

    const timetable = [
      { name: "Period 1", start: 540, end: 590 },
      { name: "Period 2", start: 590, end: 640 },
      { name: "Period 3", start: 640, end: 690 },
      { name: "Period 4", start: 705, end: 755 },
      { name: "Period 5", start: 755, end: 805 },
      { name: "Period 6", start: 845, end: 895 },
      { name: "Period 7", start: 895, end: 945 },
      { name: "Period 8", start: 945, end: 995 }
    ];

    const getNormalizedPeriod = (log) => {
      if (log.period && log.period.startsWith("Period")) return log.period;
      const date = new Date(log.recognizedAt);
      const timeInMinutes = date.getHours() * 60 + date.getMinutes();
      const p = timetable.find(t => timeInMinutes >= t.start && timeInMinutes < t.end);
      return p ? p.name : log.period;
    };

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(periodFilter ? periodFilter : "Periodwise Attendance");

    worksheet.columns = [
      { header: "USN", key: "usn", width: 15 },
      { header: "Student Name", key: "name", width: 30 },
      { header: "Course", key: "course", width: 15 },
      { header: "Assigned Slot", key: "period", width: 15 },
      { header: "Subject Recorded", key: "subject", width: 20 },
      { header: "Status", key: "status", width: 15 },
      { header: "Time Recorded", key: "time", width: 20 }
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    students.forEach(student => {
      let studentLogs = attendance.filter(a => a.usn === student.usn);
      
      // If filtering by specific period
      if (periodFilter) {
        studentLogs = studentLogs.filter(l => getNormalizedPeriod(l) === periodFilter);
      }

      if (studentLogs.length > 0) {
        studentLogs.forEach(l => {
          worksheet.addRow({
            usn: student.usn,
            name: student.name,
            course: student.course,
            period: getNormalizedPeriod(l),
            subject: l.period.startsWith("Period") ? (l.subject || "---") : l.period,
            status: "Present",
            time: new Date(l.recognizedAt).toLocaleTimeString()
          });
        });
      } else {
        worksheet.addRow({
          usn: student.usn,
          name: student.name,
          course: student.course,
          period: periodFilter || "---",
          subject: "---",
          status: "Absent",
          time: "---"
        });
      }
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=Period_Attendance_${periodFilter ? periodFilter.replace(' ', '')+'_' : ''}${dateStr}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating report");
  }
});

/* =============================
   MONTHLY EXCEL REPORT
   ============================= */
router.get("/monthly-excel", async (req, res) => {
  try {
    const month = req.query.month ? parseInt(req.query.month) - 1 : new Date().getMonth();
    const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();
    
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

    const students = await Student.find().sort({ usn: 1 });
    const attendance = await AttendanceLog.find({
      recognizedAt: { $gte: startOfMonth, $lte: endOfMonth }
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Monthly Summary");

    worksheet.columns = [
      { header: "USN", key: "usn", width: 15 },
      { header: "Student Name", key: "name", width: 30 },
      { header: "Course", key: "course", width: 15 },
      { header: "Days Present", key: "days", width: 15 },
      { header: "Attendance %", key: "percentage", width: 15 }
    ];

    worksheet.getRow(1).font = { bold: true };

    const totalDaysInMonth = endOfMonth.getDate();
    // In a real scenario, you'd only count working days. Here we count days up to today if current month.
    const effectiveDays = (month === new Date().getMonth() && year === new Date().getFullYear()) 
      ? new Date().getDate() 
      : totalDaysInMonth;

    students.forEach(student => {
      const logs = attendance.filter(a => a.usn === student.usn);
      const uniqueDays = [...new Set(logs.map(l => new Date(l.recognizedAt).toDateString()))].length;
      const percentage = ((uniqueDays / effectiveDays) * 100).toFixed(2);

      worksheet.addRow({
        usn: student.usn,
        name: student.name,
        course: student.course,
        days: uniqueDays,
        percentage: `${percentage}%`
      });
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=Monthly_Report_${month+1}_${year}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).send("Error");
  }
});

module.exports = router;
