const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const logger = require('morgan');
const app = express();
const cookieParser = require('cookie-parser');
const teachersRouter = require('./routes/teacher.routes.js');
const path = require('path');
const cors = require('cors');
const studentRoutes = require('./routes/student.routes.js');
app.use(cors({ origin: '*' }));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.json());
app.use(logger('dev'));
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());
app.use('/teachers',teachersRouter);
app.use('/student', studentRoutes);
app.get('/',(req,res)=>{
    res.render('welcome');
});
app.use(express.static(path.join(__dirname, 'public')));


module.exports =app;