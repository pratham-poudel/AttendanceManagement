const jwt = require('jsonwebtoken');
const db = require('../db/db.js');
const QRCode = require('qrcode');

module.exports.register = async(req, res) => {
    const { name, email, password, subject } = req.body;
    try {
        // Check if the teacher already exists
        const [existingTeacher] = await db.execute("SELECT * FROM Teacher WHERE email = ?", [email]);
        if (existingTeacher.length > 0) {
            return res.status(400).json({ message: 'Teacher already exists' });
        }

        // Register the new teacher
        const teacher = await db.execute("INSERT INTO Teacher (name, email, password, subject) VALUES (?, ?, ?, ?)", 
            [name, email, password, subject]);
        const token = jwt.sign({ email: email }, process.env.JWT_SECRET);
        res.cookie('token', token);
        res.redirect('/teachers/profile');
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
module.exports.login = async(req, res) => {
    const { email, password } = req.body;
    try {
        // Check if the teacher exists
        const [teacher] = await db.execute("SELECT * FROM Teacher WHERE email = ? AND password = ?", [email, password]);
        if (teacher.length === 0) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ email: email }, process.env.JWT_SECRET);
        res.cookie('token', token);

        res.redirect('/teachers/profile');
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
module.exports.profile = async (req, res) => {
    const { email } = req.teacher;
    try {
        // Get the teacher's profile
        const [teacher] = await db.execute("SELECT * FROM Teacher WHERE email = ?", [email]);

        // Get the total number of attendance sheets created by the teacher
        const [attendanceCount] = await db.execute(
            "SELECT COUNT(*) AS totalAttendances FROM AttendanceSheet WHERE attendance_id IN (SELECT attendance_id FROM Teacher_AttendanceSheet WHERE teacher_id = ?)",
            [teacher[0].teacher_id]
        );

        // Get the list of attendance sheets created by the teacher
        const [attendanceSheets] = await db.execute(
            "SELECT AttendanceSheet.* FROM AttendanceSheet INNER JOIN Teacher_AttendanceSheet ON AttendanceSheet.attendance_id = Teacher_AttendanceSheet.attendance_id WHERE Teacher_AttendanceSheet.teacher_id = ?",
            [teacher[0].teacher_id]
        );

        // 🔹 Get the classes assigned to the teacher
        const [classes] = await db.execute(
            "SELECT Class.* FROM Class INNER JOIN Teacher_Class ON Class.class_id = Teacher_Class.class_id WHERE Teacher_Class.teacher_id = ?",
            [teacher[0].teacher_id]
        );
        console.log(attendanceSheets);

        res.render('profile', { 
            teacher: teacher[0], 
            totalAttendances: attendanceCount[0].totalAttendances || 0,
            attendanceSheets: attendanceSheets || [], // Always send an array
            classes: classes || [] // Ensure classes are available in EJS
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports.logout = async(req, res) => {
    res.clearCookie('token');
    res.redirect('/teachers/login');
};

module.exports.createAttendanceForm = async (req, res) => {
    try {
        const { name, class_ids, latitude, longitude } = req.body;
        const { email } = req.teacher;

        // Get teacher ID
        const [teacher] = await db.execute(
            "SELECT teacher_id FROM Teacher WHERE email = ?",
            [email]
        );

        // Insert into AttendanceSheet
        const [result] = await db.execute(
            `INSERT INTO AttendanceSheet (sheet_name, date, expires_at, latitude, longitude) 
             VALUES (?, NOW(), DATE_ADD(NOW(), INTERVAL 5 MINUTE), ?, ?)`,
            [name, latitude, longitude]
        );

        const attendance_id = result.insertId;

        // Associate with teacher
        await db.execute(
            "INSERT INTO Teacher_AttendanceSheet (teacher_id, attendance_id) VALUES (?, ?)",
            [teacher[0].teacher_id, attendance_id]
        );

        // Handle multiple class IDs
        const classIdArray = Array.isArray(class_ids) ? class_ids : [class_ids];
        
        // Associate with selected classes
        for (const class_id of classIdArray) {
            await db.execute(
                "INSERT INTO AttendanceSheet_Class (attendance_id, class_id) VALUES (?, ?)",
                [attendance_id, class_id]
            );
        }

        // Generate QR code URL using QR Server API
        const qrUrl = `${req.protocol}://${req.get('host')}/student/${attendance_id}`;
        const qrCodeDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrUrl)}`;

        // Update AttendanceSheet with QR code URL
        await db.execute(
            "UPDATE AttendanceSheet SET qr_code = ? WHERE attendance_id = ?",
            [qrCodeDataUrl, attendance_id]
        );

        // Render QR code page
        res.render('showQrCode', {
            attendance_id,
            qrCodeDataUrl,
            sheetName: name,
            expiresIn: 5 // minutes
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Error creating attendance form');
    }
};



module.exports.attendanceDetails = async (req, res) => {
    try {
        const { attendance_id } = req.params;

        // Fetch student attendance records along with class details
        const [students] = await db.execute(
            `SELECT DISTINCT
                sa.student_name, 
                sa.roll_no, 
                c.class_name
             FROM StudentAttendance sa
             INNER JOIN Class c ON sa.class_id = c.class_id
             WHERE sa.attendance_id = ?`,
            [attendance_id]
        );
        

        if (students.length === 0) {
            return res.status(404).json({ message: "No attendance records found for this session." });
        }

        res.render('attendanceDetails', { students });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
};


