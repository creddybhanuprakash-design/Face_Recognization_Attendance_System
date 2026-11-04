const mongoose = require("mongoose");

const periodwiseAttendanceSchema = new mongoose.Schema({
  usn: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  course: {
    type: String,
    required: true
  },
  period: {
    type: String,
    required: true
  },
  subject: {
    type: String
  },
  recognizedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model(
  "PeriodwiseAttendance",
  periodwiseAttendanceSchema
);
