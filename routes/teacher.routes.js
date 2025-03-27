const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacher.controller.js');
const isLoggedin = require('../middleware/isLoggedin.js');

router.get('/register',(req,res)=>{
    res.render('register');
});
router.post('/register',teacherController.register);
router.get('/login',(req,res)=>{
    res.render('login');
});
router.get('/register',(req,res)=>{
    res.render('register');
});
router.post('/login',teacherController.login);
router.get('/profile',isLoggedin,teacherController.profile);
router.get('/logout',teacherController.logout);
router.post('/create-attendanceform', isLoggedin, teacherController.createAttendanceForm);
router.get('/attendance/:attendance_id', isLoggedin, teacherController.attendanceDetails);

module.exports = router;