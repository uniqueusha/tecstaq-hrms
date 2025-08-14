const pool = require('../common/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
    const { email_id, password } = req.body;

    if (!email_id || !password) {
        return res.status(400).json({ message: 'Email ID and password are required' });
    }

    try {
        // Join users with untitled table to get email & hashed password
        const [rows] = await pool.query(
            `SELECT u.user_id, u.email_id, u.first_name, t.extenstions AS password
             FROM users u
             JOIN untitled t ON u.user_id = t.user_id
             WHERE u.email_id = ?`,
            [email_id]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid Email ID or password' });
        }

        const user = rows[0];       

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid Email ID or password' });
        }

        // Generate token
        const token = jwt.sign(
            { user_id: user.user_id, email: user.email_id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: { user_id: user.user_id, name: user.first_name }
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};
