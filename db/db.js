// Used to connect to the database
const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '5326',
    database: 'attendancedb'
});

module.exports = pool.promise();

