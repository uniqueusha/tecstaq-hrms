const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
  
  
const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, "1f7d5d6e0b0c0e3123f4d65f4e12c6bde56232");
        req.user = decoded; // ✅ set decoded payload here
        next();
    } catch (err) {
        return res.status(401).json({ status :401, success: false, message: 'Invalid token' });
    }

};
