const pool  = require("../common/db");
const error422 = (message, res) => {
    return res.status(422).json({
        status: 422,
        message: message
    })
}
const error500 = (error, res) => {
    console.log(error);
    return res.status(500).json({
        status: 500,
        message: "Internal Server Error",
        error: error
    })
}
const setCalendar = async(req, res)=>{
    let holiday_calendar_id = req.body.holiday_calendar_id ? req.body.holiday_calendar_id :''
    if (!holiday_calendar_id) {
        return error422("Holiday calendar id is required.", res)
    }
    let connection
    try {
        connection = await pool.getConnection()
        const setCalendarQuery = `UPDATE employee SET holiday_calendar_id = ${holiday_calendar_id}  WHERE 1`
        await connection.query(setCalendarQuery);

        await connection.commit()
        return res.status(200).json({
            status:200,
            message:"Holiday calendar set successfully."
        })
    } catch (error) {
        if(connection) await connection.rollback()
        return error500(error, res)
    } finally {
        if(connection) await connection.release()
    }
}

module.exports = {
    setCalendar
}