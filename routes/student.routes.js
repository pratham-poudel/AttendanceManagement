const express = require('express');
const router = express.Router();
const studentController = require('../controllers/student.controller.js');

router.get('/:attendance_id', studentController.showAttendanceForm);
router.post('/:attendance_id', studentController.markAttendance);

module.exports = router; 