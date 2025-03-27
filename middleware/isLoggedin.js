const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        return res.redirect('/teachers/login');
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.teacher = decoded;
        next();
    } catch (error) {
        res.redirect('/teachers/login');
    }
};