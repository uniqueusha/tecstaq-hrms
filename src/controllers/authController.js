const pool = require('../common/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


// Helper function to log activity
async function logUserActivity({ user_id, session_id, ip_address, device_info, status }) {
    try {
        if (status === "login") {
            await pool.query(
                `INSERT INTO user_activity_log 
                 (user_id, session_id, login_time, ip_address, device_info, status) 
                 VALUES (?, ?, NOW(), ?, ?, 'login')`,
                [user_id, session_id, ip_address, device_info]
            );
        } else if (status === "logout" || status === "timeout") {
            await pool.query(
                `UPDATE user_activity_log 
                 SET logout_time = NOW(), status = ? 
                 WHERE user_id = ? AND session_id = ? AND logout_time IS NULL`,
                [status, user_id, session_id]
            );
        }
    } catch (err) {
        console.error("Error logging user activity:", err);
    }
}



exports.login = async (req, res) => {
    const { email_id, password } = req.body;

    if (!email_id || !password) {
        return res.status(400).json({ message: 'Email ID and password are required' });
    }

    try {
        const [rows] = await pool.query(
            `SELECT u.*, t.extenstions AS password, e.reporting_manager_id, ee.first_name AS reporting_manager_first_name, ee.last_name AS reporting_manager_last_name 
             FROM users u
             LEFT JOIN untitled t ON u.user_id = t.user_id
             LEFT JOIN employee e ON e.employee_id = u.employee_id
             LEFT JOIN employee ee ON e.reporting_manager_id = ee.employee_id
             WHERE u.email_id = ?`,
            [email_id]
        );
        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid Email ID or password' });
        }
        
        const user = rows[0];  
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid Email ID or password' });
        }
        
        const session_id = Date.now().toString() + "_" + user.user_id; // simple unique session
        const token = jwt.sign(
            { user_id: user.user_id, email: user.email_id, session_id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
            );
            
            // Log login activity
            const ip_address = req.ip;
            const device_info = req.headers['user-agent'] || "Unknown device";
            
            await logUserActivity({ 
                user_id: user.user_id, 
                session_id, 
                ip_address, 
                device_info, 
                status: "login" 
            });
            
            
            // ✅ pick only required fields
            const User = {
                user_id: user.user_id,
                session_id:session_id,
                first_name: user.first_name,           
                employee_id: user.employee_id,           
                role:user.role,
                reporting_manager_id:user.reporting_manager_id,
                reporting_manager_first_name:user.reporting_manager_first_name, 
                reporting_manager_last_name:user.reporting_manager_last_name
            };

        return res.status(200).json({
            status: 200,
            message: 'Login successful',
            token,
            tokenExpiresIn: 3600,
            user:User
            
        });

    } catch (err) {
        res.status(500).json({ 
            status:200,
            message: 'Internal server error',
            error:err
        });
    }
};

// Logout handler (optional)
exports.logout = async (req, res) => {
    try {
        const { user_id, session_id } = req.body; // or decode from JWT
        await logUserActivity({ user_id, session_id, status: "logout" });

        return res.status(200).json({
            status: 200,
            message: "Logout successful"
        });
    } catch (err) {
        console.error("Logout error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
};