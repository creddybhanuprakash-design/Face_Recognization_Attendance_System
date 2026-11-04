const express = require("express");
const cors = require("cors");
const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const studentRoutes = require("./routes/students");
const attendanceRoutes = require("./routes/attendance");
const periodwiseRoutes = require("./routes/periodwiseAttendance");
const adminRoutes = require("./routes/admin");
const reportRoutes = require("./routes/report");
const connectedDB = require("./config/db");
const { getSecret, requireAuth } = require("./middleware/auth");

const app = express();
const PORT = Number(process.env.PORT) || 5001;

getSecret();

app.use(cors({
  origin: ["http://localhost:5173", "http://127.0.0.1:5173"]
}));
app.use(express.json({ limit: "10mb" }));
app.use("/api", requireAuth);
app.use("/api/students", studentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/periodwise-attendance", periodwiseRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/report", reportRoutes);

connectedDB()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Server startup failed:", error.message);
    process.exitCode = 1;
  });