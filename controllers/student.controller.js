const db = require('../db/db.js');



module.exports.showAttendanceForm = async (req, res) => {
    try {
        const { attendance_id } = req.params;

        // Check if attendance sheet exists and is not expired
        const [sheet] = await db.execute(
            "SELECT * FROM attendancesheet WHERE attendance_id = ? AND expires_at > NOW()",
            [attendance_id]
        );

        if (sheet.length === 0) {
            return res.status(400).send('This attendance session has expired or does not exist.');
        }

        // Get classes associated with this attendance sheet
        const [classes] = await db.execute(
            `SELECT class.* FROM class 
             INNER JOIN attendancesheet_class ON class.class_id = attendancesheet_class.class_id 
             WHERE attendancesheet_class.attendance_id = ?`,
            [attendance_id]
        );

        res.render('studentAttendance', {
            classes: classes,
            attendance_id: attendance_id
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
};

const { v4: uuidv4 } = require('uuid'); // Generate device_id if needed

// Function to calculate distance using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371000; // Radius of Earth in meters

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
};

module.exports.markAttendance = async (req, res) => {
    try {
        console.log(req.body);

        const { name, roll, class_id, latitude, longitude, device_id } = req.body;
        let finalDeviceId = device_id || uuidv4(); // Use frontend-sent device_id or generate one
        
        // 🔹 1️⃣ Get attendance_id from params
        const { attendance_id } = req.params;

        // 🔹 2️⃣ Check if the attendance sheet is active
        const [attendance] = await db.execute(
            `SELECT latitude, longitude, expires_at 
             FROM attendancesheet 
             WHERE attendance_id = ? AND expires_at > NOW()`,
            [attendance_id]
        );

        if (attendance.length === 0) {
            return res.status(400).json({ error: "No active attendance session found or attendance expired." });
        }

        const { latitude: storedLat, longitude: storedLng } = attendance[0];

        // 🔹 3️⃣ Check if the student already marked attendance
        const [existingAttendance] = await db.execute(
            `SELECT * FROM studentattendance 
             WHERE attendance_id = ? AND (roll_no = ? OR device_id = ?)`,
            [attendance_id, roll, finalDeviceId]
        );

        if (existingAttendance.length > 0) {
            return res.status(400).json({ error: "Attendance already marked from this device!" });
        }

        // 🔹 4️⃣ Calculate distance in meters
        const distance = calculateDistance(
            parseFloat(latitude), parseFloat(longitude),
            parseFloat(storedLat), parseFloat(storedLng)
        );

        console.log(`Student is ${distance.toFixed(2)} meters away.`);

        // 🔹 5️⃣ Check if student is within 50 meters
        if (distance > 50) {
            return res.status(400).json({ error: "You are too far from the class location to mark attendance." });
        }

        // 🔹 6️⃣ Mark attendance with device ID
        await db.execute(
            `INSERT INTO studentattendance (attendance_id, student_name, roll_no, status, device_id, class_id) 
             VALUES (?, ?, ?, 'Present', ?, ?)`,
            [attendance_id, name, roll, finalDeviceId, class_id]
        );

        res.status(201).json({ message: "Attendance marked successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Database error" });
    }
};




