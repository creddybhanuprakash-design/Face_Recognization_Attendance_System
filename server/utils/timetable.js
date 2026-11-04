function getPeriodForCurrentTime(currentTime) {

  const day = currentTime.getDay();
  const hour = currentTime.getHours();
  const minute = currentTime.getMinutes();

  const time = hour * 60 + minute;

  let period = null;
  let periodStart = null;

  // Period ranges
  if (time >= 540 && time < 590) { period = 1; periodStart = 540; }
  else if (time >= 590 && time < 640) { period = 2; periodStart = 590; }
  else if (time >= 640 && time < 690) { period = 3; periodStart = 640; }
  else if (time >= 705 && time < 755) { period = 4; periodStart = 705; }
  else if (time >= 755 && time < 805) { period = 5; periodStart = 755; }
  else if (time >= 845 && time < 895) { period = 6; periodStart = 845; }
  else if (time >= 895 && time < 945) { period = 7; periodStart = 895; }
  else if (time >= 945 && time < 995) { period = 8; periodStart = 945; }

  if (time >= 690 && time < 705) return { periodName: "Break" };
  if (time >= 805 && time < 845) return { periodName: "Lunch" };

  if (!period) return { periodName: "No Period" };

  // 🔐 Auto closing after 45 minutes (allow almost full period)
  if (time > periodStart + 45) {
    return { periodName: "Closed" };
  }

  const timetable = {

    1: ["DBMS","DAA","ESS","ToC","DBMS"],
    2: ["DBMS","ToC","IOS","ESS","DBMS"],
    3: ["ESS","P&T","DBMS","IOS","ToC"],
    4: ["DAA","DAA","DBMS","ToC","DAA"],
    5: ["IOS","IOS","ToC","DAA","IOS"],
    6: ["ToC","DAA LAB","LIB/TWM","OS LAB","DBMS LAB"],
    7: ["ToC","DAA LAB","P&T","OS LAB","DBMS LAB"],
    8: ["IOS","DAA LAB","DAA","OS LAB","DBMS LAB"]

  };

  return {
    periodIndex: period,
    periodName: `Period ${period}`,
    subject: timetable[period][day - 1] || "No Period"
  };

}

module.exports = getPeriodForCurrentTime;