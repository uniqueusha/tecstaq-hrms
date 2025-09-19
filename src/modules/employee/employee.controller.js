const pool = require('../../common/db');
const fs = require('fs');
const path = require('path');
const xlsx = require("xlsx");


//function to obtain a database connection 
const getConnection = async () => {
    try {
        const connection = await pool.getConnection();
        return connection;
    } catch (error) {
        throw new Error("Failed to obtain database connection:" + error.message);
    }
}
//error handle 422...
error422 = (message, res) => {
    return res.status(422).json({
        status: 422,
        message: message
    });
}
//error handle 500...
error500 = (error, res) => {
    console.log(error);
    return res.status(500).json({
        status: 500,
        message: "Internal Server Error",
        error: error
    });
}

//create employee
const createEmployee = async (req, res) => {
    const company_id = req.body.company_id ? req.body.company_id : '';
    const departments_id = req.body.departments_id ? req.body.departments_id : '';
    const designation_id = req.body.designation_id ? req.body.designation_id : '';
    const employment_type_id = req.body.employment_type_id ? req.body.employment_type_id : '';
    const employee_code = req.body.employee_code ? req.body.employee_code : '';
    const title = req.body.title ? req.body.title : '';
    const employee_first_name = req.body.employee_first_name ? req.body.employee_first_name : '';
    const employee_last_name = req.body.employee_last_name ? req.body.employee_last_name : '';
    const employee_email = req.body.employee_email ? req.body.employee_email : '';
    const dob = req.body.dob ? req.body.dob.trim() : null;
    const gender = req.body.gender ? req.body.gender.trim() : '';
    const father_name = req.body.father_name ? req.body.father_name.trim() : '';
    const mother_name = req.body.mother_name ? req.body.mother_name.trim() : '';
    const blood_group = req.body.blood_group ? req.body.blood_group.trim() : '';
    const marital_status = req.body.marital_status ? req.body.marital_status.trim() : '';
    const personal_email = req.body.personal_email ? req.body.personal_email.trim() : '';
    const country_code = req.body.country_code ? req.body.country_code : '';
    const mobile_number = req.body.mobile_number ? req.body.mobile_number : '';
    const profile_photo = req.body.profile_photo ? req.body.profile_photo.trim() : '';
    const current_address = req.body.current_address ? req.body.current_address.trim() : '';
    const permanent_address = req.body.permanent_address ? req.body.permanent_address.trim() : '';
    const signed_in = req.body.signed_in ? req.body.signed_in : '';
    const alternate_contact_number = req.body.alternate_contact_number ? req.body.alternate_contact_number : '';
    const doj = req.body.doj ? req.body.doj.trim() : null
    const office_location = req.body.office_location ? req.body.office_location.trim() : '';
    const work_location = req.body.work_location ? req.body.work_location.trim() : '';
    const employee_status = req.body.employee_status ? req.body.employee_status : '';
    const holiday_calendar_id = req.body.holiday_calendar_id ? req.body.holiday_calendar_id : '';
    const reporting_manager = req.body.reporting_manager ? req.body.reporting_manager : '';
    const uan_number = req.body.uan_number ? req.body.uan_number : '';
    const esic_number = req.body.esic_number ? req.body.esic_number : '';
    const pf_number = req.body.pf_number ? req.body.pf_number : '';
    const pan_card_number = req.body.pan_card_number ? req.body.pan_card_number : '';
    const aadhar_number = req.body.aadhar_number ? req.body.aadhar_number : '';
    const passport_no = req.body.passport_no ? req.body.passport_no : '';
    const passport_expiry = req.body.passport_expiry ? req.body.passport_expiry : '';
    const payment_mode = req.body.payment_mode ? req.body.payment_mode.trim() : '';
    const account_number = req.body.account_number ? req.body.account_number : '';
    const bank_name = req.body.bank_name ? req.body.bank_name.trim() : '';
    const ifsc_code = req.body.ifsc_code ? req.body.ifsc_code.trim() : '';
    const branch_name = req.body.branch_name ? req.body.branch_name.trim() : '';
    const family_member_name = req.body.family_member_name ? req.body.family_member_name.trim() : '';
    const relationship = req.body.relationship ? req.body.relationship.trim() : '';
    const family_dob = req.body.family_dob ? req.body.family_dob.trim() : null
    const is_dependent = req.body.is_dependent ? req.body.is_dependent : '';
    const is_nominee = req.body.is_nominee ? req.body.is_nominee : '';
    const family_mobile_number = req.body.family_mobile_number ? req.body.family_mobile_number : '';
    const company_name = req.body.company_name ? req.body.company_name : '';
    const start_date = req.body.start_date ? req.body.start_date : null
    const end_date = req.body.end_date ? req.body.end_date : null
    const last_drawn_salary = req.body.last_drawn_salary ? req.body.last_drawn_salary : null
    const designation = req.body.designation ? req.body.designation : '';
    const hr_email = req.body.hr_email ? req.body.hr_email : '';
    const hr_mobile = req.body.hr_mobile ? req.body.hr_mobile : '';
    const probation_start_date = req.body.probation_start_date ? req.body.probation_start_date : null
    const probation_end_date = req.body.probation_end_date ? req.body.probation_end_date : null
    const shift_type_header_id = req.body.shift_type_header_id ? req.body.shift_type_header_id : '';
    const shift_start_date = req.body.shift_start_date ? req.body.shift_start_date : null
    const shift_end_date = req.body.shift_end_date ? req.body.shift_end_date : null
    const work_week_pattern_id = req.body.work_week_pattern_id ? req.body.work_week_pattern_id : '';
    const work_start_date = req.body.work_start_date ? req.body.work_start_date : null
    const work_end_date = req.body.work_end_date ? req.body.work_end_date : null
    const employeeDocuments = req.body.employeeDocuments ? req.body.employeeDocuments : [];
    const employeeEducation = req.body.employeeEducation ? req.body.employeeEducation : [];
    const userId = req.user?.user_id;

    if (!dob) {
        return error422("Birth Of Date id is required.", res);
    } else if (!gender) {
        return error422("Gender is required.", res);
    } else if (!father_name) {
        return error422("Father Name is required.", res);
    } else if (!mother_name) {
        return error422("Mother Name is required.", res);
    } else if (!blood_group) {
        return error422("Blood group is required.", res);
    } else if (!marital_status) {
        return error422("Marital status is required.", res);
    } else if (!personal_email) {
        return error422("Personal email is required.", res);
    } else if (!country_code) {
        return error422("country code is required.", res);
    } else if (!mobile_number) {
        return error422("Mobile number is required.", res);
    } else if (!profile_photo) {
        return error422("Profile photo is required.", res);
    } else if (!current_address) {
        return error422("Current address is required.", res);
    } else if (!permanent_address) {
        return error422("Permanent address is required.", res);
    } else if (!doj) {
        return error422("Date Of Joining in is required.", res);
    } else if (!office_location) {
        return error422("Office location is required.", res);
    } else if (!work_location) {
        return error422("Work location is required.", res);
    } else if (!employee_status) {
        return error422("Employee status is required.", res);
    } else if (!holiday_calendar_id) {
        return error422("Holiday calendar id is required.", res);
    } else if (!reporting_manager) {
        return error422("Reporting manager is required.", res);
    } else if (!aadhar_number) {
        return error422("Aadhar number is required.", res);
    } else if (!title) {
        return error422("Title is required.", res);
    }

    let connection = await getConnection();

    try {
        //start a transaction
        await connection.beginTransaction();

        const allowedMimeTypes = [
            'image/jpeg',
            'image/jpg',
            'image/png'
        ];

        const fileType = await import("file-type");
        const uploadFile = async (base64Str, prefix) => {
            if (!base64Str) return '';

            const cleanedBase64 = base64Str.replace(/^data:.*;base64,/, "");
            const pdfBuffer = Buffer.from(cleanedBase64, "base64");
            const fileTypeResult = await fileType.fileTypeFromBuffer(pdfBuffer);

            if (!fileTypeResult || !allowedMimeTypes.includes(fileTypeResult.mime)) {
                throw new Error("Only JPG, JPEG, PNG files are allowed");
            }

            if (pdfBuffer.length > 10 * 1024 * 1024) {
                throw new Error("File size must be under 10MB");
            }

            const fileName = `${prefix}_${Date.now()}.${fileTypeResult.ext}`;
            const uploadDir = path.join(__dirname, "..", "..", "..", "images");
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            const filePath = path.join(uploadDir, fileName);

            fs.writeFileSync(filePath, pdfBuffer);
            return `${fileName}`;
        };

        // Upload GST and PAN files if provided
        const profilePhotoPath = await uploadFile(profile_photo, 'profile_photo');

        // start the transaction
        await connection.beginTransaction();
        const insertQuery = "INSERT INTO employee (company_id, departments_id, designation_id, employment_type_id, employee_code, title, employee_first_name, employee_last_name, employee_email, dob, gender, father_name, mother_name, blood_group, marital_status, personal_email, country_code, mobile_number, profile_photo, current_address, permanent_address, signed_in, alternate_contact_number, doj, office_location, work_location, employee_status, holiday_calendar_id, reporting_manager, uan_number, esic_number, pf_number, pan_card_number, aadhar_number, passport_no, passport_expiry, user_id)VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        const result = await connection.query(insertQuery, [company_id, departments_id, designation_id, employment_type_id, employee_code, title, employee_first_name, employee_last_name, employee_email, dob, gender, father_name, mother_name, blood_group, marital_status, personal_email, country_code, mobile_number, profilePhotoPath, current_address, permanent_address, signed_in, alternate_contact_number, doj, office_location, work_location, employee_status, holiday_calendar_id, reporting_manager, uan_number, esic_number, pf_number, pan_card_number, aadhar_number, passport_no, passport_expiry, userId]);
        const employeeId = result[0].insertId;

        //insert employee_bank_deatils
        const insertBankQuery = "INSERT INTO employee_bank_details (employee_id, payment_mode, account_number, bank_name, ifsc_code, branch_name)VALUES( ?, ?, ?, ?, ?, ?)";
        const insertBankResult = await connection.query(insertBankQuery, [employeeId, payment_mode, account_number, bank_name, ifsc_code, branch_name]);

        //insert employee_family
        const insertFamilyQuery = "INSERT INTO employee_family (employee_id, family_member_name, relationship, dob, is_dependent, is_nominee, mobile_number)VALUES( ?, ?, ?, ?, ?, ?, ?)";
        const insertFamilyResult = await connection.query(insertFamilyQuery, [employeeId, family_member_name, relationship, family_dob, is_dependent, is_nominee, family_mobile_number]);

        //insert employee_probation
        const insertProbationQuery = "INSERT INTO employee_probation (employee_id, probation_start_date, probation_end_date)VALUES( ?, ?, ?)";
        const insertProbationResult = await connection.query(insertProbationQuery, [employeeId, probation_start_date, probation_end_date]);

        //insert employee_previous_company
        const insertPreviousQuery = "INSERT INTO employee_previous_company (employee_id, company_name, start_date, end_date, last_drawn_salary, designation, hr_email, hr_mobile)VALUES( ?, ?, ?, ?, ?, ?, ?, ?)";
        const insertPreviousResult = await connection.query(insertPreviousQuery, [employeeId, company_name, start_date, end_date, last_drawn_salary, designation, hr_email, hr_mobile]);

        //insert employee_shift
        const insertShiftQuery = "INSERT INTO employee_shift (employee_id, shift_type_header_id , start_date, end_date)VALUES( ?, ?, ?, ?)";
        const insertShiftResult = await connection.query(insertShiftQuery, [employeeId, shift_type_header_id, shift_start_date, shift_end_date]);

        //insert employee_work_week
        const insertWorkQuery = "INSERT INTO employee_work_week (employee_id, work_week_pattern_id, start_date, end_date)VALUES( ?, ?, ?, ?)";
        const insertWorkResult = await connection.query(insertWorkQuery, [employeeId, work_week_pattern_id, work_start_date, work_end_date]);

        let documentsArray = employeeDocuments
        for (let i = 0; i < documentsArray.length; i++) {
            const element = documentsArray[i];
            const document_type_id = element.document_type_id ? element.document_type_id : '';
            const document_name = element.document_name ? element.document_name.trim() : '';
            const file_path = element.file_path ? element.file_path.trim() : '';

            // if (!assigned_to) {
            //     await query("ROLLBACK");
            //     return error422("assigned id is require", res);
            // }

            const allowedMimeTypes = [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'image/jpeg',
                'image/jpg',
                'image/png'
            ];

            const fileType = await import("file-type");
            const uploadFile = async (base64Str, prefix) => {
                if (!base64Str) return '';

                const cleanedBase64 = base64Str.replace(/^data:.*;base64,/, "");
                const pdfBuffer = Buffer.from(cleanedBase64, "base64");
                const fileTypeResult = await fileType.fileTypeFromBuffer(pdfBuffer);

                if (!fileTypeResult || !allowedMimeTypes.includes(fileTypeResult.mime)) {
                    return error422("Only PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG files are allowed", res);
                }

                if (pdfBuffer.length > 10 * 1024 * 1024) {
                    return error422("File size must be under 10MB", res);
                }

                const fileName = `${prefix}_${Date.now()}.${fileTypeResult.ext}`;
                const uploadDir = path.join(__dirname, "..", "..", "uploads");
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }

                const filePath = path.join(uploadDir, fileName);

                fs.writeFileSync(filePath, pdfBuffer);
                return `${fileName}`;
            };

            // Upload GST and PAN files if provided
            const filePath = await uploadFile(file_path, 'file_path');

            //check document_type is exists or not
            const isExistDocumentTypeQuery = `SELECT * FROM document_type WHERE document_type_id = ? `;
            const isExistDocumentTypeResult = await connection.query(isExistDocumentTypeQuery, [document_type_id]);
            if (isExistDocumentTypeResult[0].length === 0) {
                return error422("Document type not found.", res);
            }

            let insertEmployeeDocumentsQuery = 'INSERT INTO employee_documents (employee_id, document_type_id, document_name, file_path) VALUES (?, ?, ?, ?)';
            let insertEmployeeDocumentsValues = [employeeId, document_type_id, document_name, filePath];
            let insertEmployeeDocumentsResult = await connection.query(insertEmployeeDocumentsQuery, insertEmployeeDocumentsValues);
        }

        let educationArray = employeeEducation
        for (let i = 0; i < educationArray.length; i++) {
            const element = educationArray[i];
            const education_type = element.education_type ? element.education_type : '';
            const education_name = element.education_name ? element.education_name.trim() : '';
            const passing_year = element.passing_year ? element.passing_year : '';
            const university = element.university ? element.university.trim() : '';



            let insertEmployeeDocumentsQuery = 'INSERT INTO employee_education (employee_id, education_type, education_name, passing_year, university) VALUES (?, ?, ?, ?, ?)';
            let insertEmployeeDocumentsValues = [employeeId, education_type, education_name, passing_year, university];
            let insertEmployeeDocumentsResult = await connection.query(insertEmployeeDocumentsQuery, insertEmployeeDocumentsValues);
        }

        await connection.commit()
        return res.status(200).json({
            status: 200,
            message: "Employee created successfully."
        })
    } catch (error) {
        if (connection) connection.rollback();
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
}

// get employee list...
const getEmployees = async (req, res) => {
    const { page, perPage, key, user_id, status_id, fromDate, toDate, employee_id, department_id, company_id, project_id } = req.query;

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getEmployeesQuery = `SELECT e.*, ebd.payment_mode, ebd.account_number,ebd.bank_name,ebd.ifsc_code,ebd.branch_name,ef.family_member_name,ef.relationship,ef.dob,ef.is_dependent,ef.is_nominee,ef.mobile_number AS family_mobile_number,empc.start_date,empc.end_date,empc.last_drawn_salary,empc.designation,empc.hr_email,empc.hr_mobile,
        ep.probation_start_date,ep.probation_end_date,es.shift_type_header_id,es.start_date AS shift_start_date,es.end_date AS shift_end_date,eww.work_week_pattern_id,eww.start_date AS work_start_date,eww.end_date AS work_end_date, c.name AS company_name, d.designation FROM employee e
        LEFT JOIN employee_bank_details ebd ON ebd.employee_id = e.employee_id
        LEFT JOIN company c ON c.company_id = e.company_id
        LEFT JOIN designation d ON d.designation_id = e.designation_id
        LEFT JOIN employee_family ef ON ef.employee_id = e.employee_id
        LEFT JOIN employee_previous_company empc ON empc.employee_id = e.employee_id
        LEFT JOIN employee_probation ep ON ep.employee_id = e.employee_id
        LEFT JOIN employee_shift es ON es.employee_id = e.employee_id
        LEFT JOIN employee_work_week eww ON eww.employee_id = e.employee_id
        WHERE 1`;

        let countQuery = `SELECT COUNT(*) AS total FROM employee e
        LEFT JOIN employee_bank_details ebd ON ebd.employee_id = e.employee_id
        LEFT JOIN employee_family ef ON ef.employee_id = e.employee_id
        LEFT JOIN employee_previous_company empc ON empc.employee_id = e.employee_id
        LEFT JOIN employee_probation ep ON ep.employee_id = e.employee_id
        LEFT JOIN employee_shift es ON es.employee_id = e.employee_id
        LEFT JOIN employee_work_week eww ON eww.employee_id = e.employee_id
        WHERE 1`;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            if (lowercaseKey === "activated") {
                getEmployeesQuery += ` AND e.status = 1`;
                countQuery += ` AND e.status = 1`;
            } else if (lowercaseKey === "deactivated") {
                getEmployeesQuery += ` AND e.status = 0`;
                countQuery += ` AND e.status = 0`;
            } else {
                getEmployeesQuery += ` AND (LOWER(e.employee_first_name) LIKE '%${lowercaseKey}%' || LOWER(e.employee_last_name) LIKE '%${lowercaseKey}%' || LOWER(e.employee_email) LIKE '%${lowercaseKey}%' || LOWER(e.mobile_number) LIKE '%${lowercaseKey}%')`;
                countQuery += ` AND (LOWER(e.employee_first_name) LIKE '%${lowercaseKey}%' || LOWER(e.employee_last_name) LIKE '%${lowercaseKey}%' || LOWER(e.employee_email) LIKE '%${lowercaseKey}%' || LOWER(e.mobile_number) LIKE '%${lowercaseKey}%')`;
            }
        }

        // from date and to date
        // if (fromDate && toDate) {
        //     getTaskHeaterQuery += ` AND DATE(th.cts) BETWEEN '${fromDate}' AND '${toDate}'`;
        //     countQuery += ` AND DATE(th.cts) BETWEEN '${fromDate}' AND '${toDate}'`;
        // }

        // if (department_id) {
        //     getTaskHeaterQuery += ` AND th.department_id = ${department_id}`;
        //     countQuery += `  AND th.department_id = ${department_id}`;
        // }

        // if (company_id) {
        //     getTaskHeaterQuery += ` AND th.company_id = ${company_id}`;
        //     countQuery += `  AND th.company_id = ${company_id}`;
        // }

        // if (project_id) {
        //     getTaskHeaterQuery += ` AND th.project_id = ${project_id}`;
        //     countQuery += `  AND th.project_id = ${project_id}`;
        // }

        // if (user_id) {
        //     getTaskHeaterQuery += ` AND th.user_id = ${user_id}`;
        //     countQuery += `  AND th.user_id = ${user_id}`;
        // }

        // if (employee_id) {
        //     getTaskHeaterQuery += ` AND th.employee_id = ${employee_id}`;
        //     countQuery += `  AND th.employee_id = ${employee_id}`;
        // }

        // if (status_id) {
        //     getTaskHeaterQuery += ` AND tf.employee_status_id = ${status_id}`;
        //     countQuery += `  AND tf.employee_status_id = ${status_id}`;
        // }

        getEmployeesQuery += " ORDER BY e.cts DESC";

        // Apply pagination if both page and perPage are provided
        let total = 0;
        if (page && perPage) {
            const totalResult = await connection.query(countQuery);
            total = parseInt(totalResult[0][0].total);
            const start = (page - 1) * perPage;
            getEmployeesQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }

        const result = await connection.query(getEmployeesQuery);
        const employees = result[0];

        //get employee_documents
        for (let i = 0; i < employees.length; i++) {
            const element = employees[i];
            let employeeDocumentsQuery = `SELECT ed.*,dt.document_type FROM employee_documents ed
            LEFT JOIN document_type dt ON dt.document_type_id = ed.document_type_id
            WHERE ed.employee_id = ${element.employee_id}`;
            employeeDocumentsResult = await connection.query(employeeDocumentsQuery);
            employees[i]['employeeDocuments'] = employeeDocumentsResult[0];
        }

        //get employee_education
        for (let i = 0; i < employees.length; i++) {
            const element = employees[i];
            let employeeEducationQuery = `SELECT ee.* FROM employee_education ee
            WHERE ee.employee_id = ${element.employee_id}`;
            employeeEducationResult = await connection.query(employeeEducationQuery);
            employees[i]['employeeEducation'] = employeeEducationResult[0];
        }

        // Commit the transaction
        await connection.commit();
        const data = {
            status: 200,
            message: "Employees retrieved successfully",
            data: employees,
        };
        // Add pagination information if provided
        if (page && perPage) {
            data.pagination = {
                per_page: perPage,
                total: total,
                current_page: page,
                last_page: Math.ceil(total / perPage),
            };
        }

        return res.status(200).json(data);
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//Employee list by id
const getEmployee = async (req, res) => {
    const employeeId = parseInt(req.params.id);

    // attempt to obtain a database connection
    let connection = await getConnection();
    try {

        //start a transaction
        await connection.beginTransaction();

        const employeeQuery = `SELECT e.*, ebd.payment_mode, ebd.account_number,ebd.bank_name,ebd.ifsc_code,ebd.branch_name,ef.family_member_name,ef.relationship,ef.dob as family_dob ,ef.is_dependent,ef.is_nominee,ef.mobile_number AS family_mobile_number,empc.start_date,empc.end_date,empc.last_drawn_salary,empc.designation AS employee_previous_designation ,empc.hr_email,empc.hr_mobile,
        ep.probation_start_date,ep.probation_end_date,es.shift_type_header_id, sth.shift_type_name, es.start_date AS shift_start_date,es.end_date AS shift_end_date,eww.work_week_pattern_id, wwp.pattern_name , eww.start_date AS work_start_date,eww.end_date AS work_end_date , empc.company_name AS employee_previous_company, d.designation, c.name AS company_name, dp.department_name, et.employment_type, ee.employee_first_name as reporting_manager_first_name, ee.employee_last_name as reporting_manager_last_name,
        hc.calendar_name FROM employee e
        LEFT JOIN company c ON c.company_id = e.company_id
        LEFT JOIN designation d ON d.designation_id = e.designation_id
        LEFT JOIN departments dp ON dp.departments_id = e.departments_id
        LEFT JOIN employee_bank_details ebd ON ebd.employee_id = e.employee_id
        LEFT JOIN employee_family ef ON ef.employee_id = e.employee_id
        LEFT JOIN employee_previous_company empc ON empc.employee_id = e.employee_id
        LEFT JOIN employee_probation ep ON ep.employee_id = e.employee_id
        LEFT JOIN employee_shift es ON es.employee_id = e.employee_id
        LEFT JOIN shift_type_header sth ON sth.shift_type_header_id = es.shift_type_header_id
        LEFT JOIN employee_work_week eww ON eww.employee_id = e.employee_id
        LEFT JOIN employment_type et ON et.employment_type_id = e.employment_type_id
        LEFT JOIN employee ee ON ee.employee_id = e.reporting_manager
        LEFT JOIN holiday_calendar hc ON hc.holiday_calendar_id = e.holiday_calendar_id
        LEFT JOIN work_week_pattern wwp ON wwp.work_week_pattern_id = eww.work_week_pattern_id
        WHERE e.employee_id = ?`;
        const employeeResult = await connection.query(employeeQuery, [employeeId]);

        if (employeeResult[0].length == 0) {
            return error422("Employee Not Found.", res);
        }
        const employee = employeeResult[0][0];

        if (employee.profile_photo) {
                // Read the image file from the filesystem
                const imagePath = path.join(__dirname, "..", "..", "..", "images", employee.profile_photo);
                
                if (fs.existsSync(imagePath)) {
                    const imageBuffer = fs.readFileSync(imagePath);
                    if (imageBuffer) {
                        // Convert the image buffer to base64
                        const imageBase64 = imageBuffer.toString('base64');
                        // Add the base64 image to the file upload object
                        employee.profile_photo_base64 = imageBase64;
                    }
                }

            }

        //get employee_documents
        let employeeDocumentsQuery = `SELECT ed.*,dt.document_type FROM employee_documents ed
            LEFT JOIN document_type dt ON dt.document_type_id = ed.document_type_id
            WHERE ed.employee_id = ?`;
        let employeeDocumentsResult = await connection.query(employeeDocumentsQuery, [employeeId]);
          for (let index = 0; index < employeeDocumentsResult[0].length; index++) {
            const element = employeeDocumentsResult[0][index];
            if (element.file_path) {
                // Read the image file from the filesystem
                
                const imagePath = path.join(__dirname, "..", "..", "uploads", element.file_path);
                if (fs.existsSync(imagePath)) {
                    const imageBuffer = fs.readFileSync(imagePath);
                    if (imageBuffer) {
                        // Convert the image buffer to base64
                        const imageBase64 = imageBuffer.toString('base64');
                        // Add the base64 image to the file upload object
                        element.image_base64 = imageBase64;
                    }
                }

            }
        }
        employee['employeeDocuments'] = employeeDocumentsResult[0];


        //get employee_education
        let employeeEducationQuery = `SELECT ee.* FROM employee_education ee
            WHERE ee.employee_id = ?`;
        let employeeEducationResult = await connection.query(employeeEducationQuery, [employeeId]);
        employee['employeeEducation'] = employeeEducationResult[0];


        return res.status(200).json({
            status: 200,
            message: "Employee Retrived Successfully",
            data: employee
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//Update employee
const updateEmployee = async (req, res) => {
    const employeeId = parseInt(req.params.id);
    const company_id = req.body.company_id ? req.body.company_id : '';
    const departments_id = req.body.departments_id ? req.body.departments_id : '';
    const designation_id = req.body.designation_id ? req.body.designation_id : '';
    const employment_type_id = req.body.employment_type_id ? req.body.employment_type_id : '';
    const employee_code = req.body.employee_code ? req.body.employee_code : '';
    const title = req.body.title ? req.body.title : '';
    const employee_first_name = req.body.employee_first_name ? req.body.employee_first_name : '';
    const employee_last_name = req.body.employee_last_name ? req.body.employee_last_name : '';
    const employee_email = req.body.employee_email ? req.body.employee_email : '';
    const dob = req.body.dob ? req.body.dob.trim() : null
    const gender = req.body.gender ? req.body.gender.trim() : '';
    const father_name = req.body.father_name ? req.body.father_name.trim() : '';
    const mother_name = req.body.mother_name ? req.body.mother_name.trim() : '';
    const blood_group = req.body.blood_group ? req.body.blood_group.trim() : '';
    const marital_status = req.body.marital_status ? req.body.marital_status.trim() : '';
    const personal_email = req.body.personal_email ? req.body.personal_email.trim() : '';
    const country_code = req.body.country_code ? req.body.country_code : '';
    const mobile_number = req.body.mobile_number ? req.body.mobile_number : '';
    const profile_photo = req.body.profile_photo ? req.body.profile_photo.trim() : '';
    const current_address = req.body.current_address ? req.body.current_address.trim() : '';
    const permanent_address = req.body.permanent_address ? req.body.permanent_address.trim() : '';
    const signed_in = req.body.signed_in ? req.body.signed_in : '';
    const alternate_contact_number = req.body.alternate_contact_number ? req.body.alternate_contact_number : '';
    const doj = req.body.doj ? req.body.doj.trim() : null
    const office_location = req.body.office_location ? req.body.office_location.trim() : '';
    const work_location = req.body.work_location ? req.body.work_location.trim() : '';
    const employee_status = req.body.employee_status ? req.body.employee_status : '';
    const holiday_calendar_id = req.body.holiday_calendar_id ? req.body.holiday_calendar_id : '';
    const reporting_manager = req.body.reporting_manager ? req.body.reporting_manager : '';
    const uan_number = req.body.uan_number ? req.body.uan_number : '';
    const esic_number = req.body.esic_number ? req.body.esic_number : '';
    const pf_number = req.body.pf_number ? req.body.pf_number : '';
    const pan_card_number = req.body.pan_card_number ? req.body.pan_card_number : '';
    const aadhar_number = req.body.aadhar_number ? req.body.aadhar_number : '';
    const passport_no = req.body.passport_no ? req.body.passport_no : '';
    const passport_expiry = req.body.passport_expiry ? req.body.passport_expiry : '';
    const payment_mode = req.body.payment_mode ? req.body.payment_mode.trim() : '';
    const account_number = req.body.account_number ? req.body.account_number : '';
    const bank_name = req.body.bank_name ? req.body.bank_name.trim() : '';
    const ifsc_code = req.body.ifsc_code ? req.body.ifsc_code.trim() : '';
    const branch_name = req.body.branch_name ? req.body.branch_name.trim() : '';
    const family_member_name = req.body.family_member_name ? req.body.family_member_name.trim() : '';
    const relationship = req.body.relationship ? req.body.relationship.trim() : '';
    const family_dob = req.body.family_dob ? req.body.family_dob.trim() : null
    const is_dependent = req.body.is_dependent ? req.body.is_dependent : '';
    const is_nominee = req.body.is_nominee ? req.body.is_nominee : '';
    const family_mobile_number = req.body.family_mobile_number ? req.body.family_mobile_number : '';
    const company_name = req.body.company_name ? req.body.company_name : '';
    const start_date = req.body.start_date ? req.body.start_date : null
    const end_date = req.body.end_date ? req.body.end_date : null
    const last_drawn_salary = req.body.last_drawn_salary ? req.body.last_drawn_salary : null
    const designation = req.body.designation ? req.body.designation : '';
    const hr_email = req.body.hr_email ? req.body.hr_email : '';
    const hr_mobile = req.body.hr_mobile ? req.body.hr_mobile : '';
    const probation_start_date = req.body.probation_start_date ? req.body.probation_start_date : null
    const probation_end_date = req.body.probation_end_date ? req.body.probation_end_date : null
    const shift_type_header_id = req.body.shift_type_header_id ? req.body.shift_type_header_id : '';
    const shift_start_date = req.body.shift_start_date ? req.body.shift_start_date : null
    const shift_end_date = req.body.shift_end_date ? req.body.shift_end_date : null
    const work_week_pattern_id = req.body.work_week_pattern_id ? req.body.work_week_pattern_id : '';
    const work_start_date = req.body.work_start_date ? req.body.work_start_date : null
    const work_end_date = req.body.work_end_date ? req.body.work_end_date : null;
    const employeeDocument = req.body.employeeDocument ? req.body.employeeDocument : [];
    const employeeEducation = req.body.employeeEducation ? req.body.employeeEducation : [];

    if (!dob) {
        return error422("Birth Of Date id is required.", res);
    } else if (!gender) {
        return error422("Gender is required.", res);
    } else if (!father_name) {
        return error422("Father Name is required.", res);
    } else if (!mother_name) {
        return error422("Mother Name is required.", res);
    } else if (!blood_group) {
        return error422("Blood group is required.", res);
    } else if (!marital_status) {
        return error422("Marital status is required.", res);
    } else if (!personal_email) {
        return error422("Personal email is required.", res);
    } else if (!country_code) {
        return error422("country code is required.", res);
    } else if (!mobile_number) {
        return error422("Mobile number is required.", res);
    } else if (!profile_photo) {
        return error422("Profile photo is required.", res);
    } else if (!current_address) {
        return error422("Current address is required.", res);
    } else if (!permanent_address) {
        return error422("Permanent address is required.", res);
    } else if (!doj) {
        return error422("Date Of Joining in is required.", res);
    } else if (!office_location) {
        return error422("Office location is required.", res);
    } else if (!work_location) {
        return error422("Work location is required.", res);
    } else if (!employee_status) {
        return error422("Employee status is required.", res);
    } else if (!holiday_calendar_id) {
        return error422("Holiday calendar id is required.", res);
    } else if (!reporting_manager) {
        return error422("Reporting manager is required.", res);
    } else if (!aadhar_number) {
        return error422("Aadhar number is required.", res);
    } else if (!title) {
        return error422("Title is required.", res);
    }

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if employee exists
        const employeeQuery = "SELECT * FROM employee WHERE employee_id  = ?";
        const employeeResult = await connection.query(employeeQuery, [employeeId]);
        if (employeeResult[0].length == 0) {
            return error422("Employee Not Found.", res);
        }

        const allowedMimeTypes = [
            'image/jpeg',
            'image/jpg',
            'image/png'
        ];

        const fileType = await import("file-type");
        const uploadFile = async (base64Str, prefix) => {
            if (!base64Str) return '';

            const cleanedBase64 = base64Str.replace(/^data:.*;base64,/, "");
            const pdfBuffer = Buffer.from(cleanedBase64, "base64");
            const fileTypeResult = await fileType.fileTypeFromBuffer(pdfBuffer);

            if (!fileTypeResult || !allowedMimeTypes.includes(fileTypeResult.mime)) {
                throw new Error("Only JPG, JPEG, PNG files are allowed");
            }

            if (pdfBuffer.length > 10 * 1024 * 1024) {
                throw new Error("File size must be under 10MB");
            }

            const fileName = `${prefix}_${Date.now()}.${fileTypeResult.ext}`;
            const uploadDir = path.join(__dirname, "..", "..", "..", "images");
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            const filePath = path.join(uploadDir, fileName);

            fs.writeFileSync(filePath, pdfBuffer);
            return `${fileName}`;
        };

        // Upload GST and PAN files if provided
        const profilePhotoPath = await uploadFile(profile_photo, 'profile_photo');

        // Update the employee record with new data
        const updateQuery = `
            UPDATE employee
            SET company_id = ?, departments_id = ?, designation_id = ?, employment_type_id = ?, employee_code = ?, title = ?, employee_first_name = ?, employee_last_name = ?, employee_email = ?, dob = ?, gender = ?, father_name = ?, mother_name = ?, blood_group = ?, marital_status = ?, personal_email = ?, country_code = ?, mobile_number = ?, profile_photo = ?, current_address = ?, permanent_address = ?, signed_in = ?, alternate_contact_number = ?, doj = ?, office_location = ?, work_location = ?, employee_status = ?, holiday_calendar_id = ?, reporting_manager = ?, uan_number = ?, esic_number = ?, pf_number = ?, pan_card_number = ?, aadhar_number = ?, passport_no = ?, passport_expiry = ?
            WHERE employee_id = ?
        `;
        await connection.query(updateQuery, [company_id, departments_id, designation_id, employment_type_id, employee_code, title, employee_first_name, employee_last_name, employee_email, dob, gender, father_name, mother_name, blood_group, marital_status, personal_email, country_code, mobile_number, profilePhotoPath, current_address, permanent_address, signed_in, alternate_contact_number, doj, office_location, work_location, employee_status, holiday_calendar_id, reporting_manager, uan_number, esic_number, pf_number, pan_card_number, aadhar_number, passport_no, passport_expiry, employeeId]);

        //update employee_bank_deatils
        const updateBankQuery = `
            UPDATE employee_bank_details
            SET payment_mode = ?, account_number = ?, bank_name = ?, ifsc_code = ?, branch_name = ?
            WHERE employee_id = ?
        `;
        await connection.query(updateBankQuery, [payment_mode, account_number, bank_name, ifsc_code, branch_name, employeeId]);

        //update employee_family
        const updateFamilyQuery = `
            UPDATE employee_family
            SET family_member_name = ?, relationship = ?, dob = ?, is_dependent = ?, is_nominee = ?, mobile_number = ?
            WHERE employee_id = ?
        `;
        await connection.query(updateFamilyQuery, [family_member_name, relationship, family_dob, is_dependent, is_nominee, family_mobile_number, employeeId]);

        //update employee_probation
        const updateProbationQuery = `
            UPDATE employee_probation
            SET probation_start_date = ?, probation_end_date = ? 
            WHERE employee_id = ?
        `;
        await connection.query(updateProbationQuery, [probation_start_date, probation_end_date, employeeId]);

        //update employee_previous_company
        const updatePreviousCompanyQuery = `
            UPDATE employee_previous_company
            SET company_name = ?, start_date = ?, end_date = ?, last_drawn_salary = ?, designation = ?, hr_email = ?, hr_mobile = ?
            WHERE employee_id = ?
        `;
        await connection.query(updatePreviousCompanyQuery, [company_name, start_date, end_date, last_drawn_salary, designation, hr_email, hr_mobile, employeeId]);

        //update employee_shift
        const updateShiftQuery = `
            UPDATE employee_shift
            SET shift_type_header_id = ?, start_date = ?, end_date = ?
            WHERE employee_id = ?
        `;
        await connection.query(updateShiftQuery, [shift_type_header_id, shift_start_date, shift_end_date, employeeId]);

        //update employee_work_week
        const updateWorkQuery = `
            UPDATE employee_work_week
            SET work_week_pattern_id = ?, start_date = ?, end_date = ?
            WHERE employee_id = ?
        `;
        await connection.query(updateWorkQuery, [work_week_pattern_id, work_start_date, work_end_date, employeeId]);

        let documentsArray = employeeDocument
        for (let i = 0; i < documentsArray.length; i++) {
            const element = documentsArray[i];
            const employee_documents_id = element.employee_documents_id ? element.employee_documents_id : '';
            const document_type_id = element.document_type_id ? element.document_type_id : '';
            const document_name = element.document_name ? element.document_name.trim() : '';
            const file_path = element.file_path ? element.file_path.trim() : '';

            // if (!assigned_to) {
            //     await query("ROLLBACK");
            //     return error422("assigned id is require", res);
            // }

            const allowedMimeTypes = [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'image/jpeg',
                'image/jpg',
                'image/png'
            ];

            const fileType = await import("file-type");
            const uploadFile = async (base64Str, prefix) => {
                if (!base64Str) return '';

                const cleanedBase64 = base64Str.replace(/^data:.*;base64,/, "");
                const pdfBuffer = Buffer.from(cleanedBase64, "base64");
                const fileTypeResult = await fileType.fileTypeFromBuffer(pdfBuffer);

                if (!fileTypeResult || !allowedMimeTypes.includes(fileTypeResult.mime)) {
                    return error422("Only PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG files are allowed", res);
                }

                if (pdfBuffer.length > 10 * 1024 * 1024) {
                    return error422("File size must be under 10MB", res);
                }

                const fileName = `${prefix}_${Date.now()}.${fileTypeResult.ext}`;
                const uploadDir = path.join(__dirname, "..", "..", "uploads");
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }
            
                const filePath = path.join(uploadDir, fileName);

                fs.writeFileSync(filePath, pdfBuffer);
                return `${fileName}`;
            };

            // Upload GST and PAN files if provided
            const filePath = await uploadFile(file_path, 'file_path');


            //check document_type is exists or not
            const isExistDocumentTypeQuery = `SELECT * FROM document_type WHERE document_type_id = ? `;
            const isExistDocumentTypeResult = await connection.query(isExistDocumentTypeQuery, [document_type_id]);
            if (isExistDocumentTypeResult[0].length === 0) {
                return error422("Document type not found.", res);
            }

            if (employee_documents_id) {
                let updatePreviousCompanyQuery = `UPDATE employee_documents SET document_type_id = ?, document_name = ?, file_path = ? WHERE employee_id = ? AND employee_documents_id = ?`;
                let updatePreviousCompanyValue = [document_type_id, document_name, filePath, employeeId, employee_documents_id]
                let updatePreviousCompanyResult = await connection.query(updatePreviousCompanyQuery, updatePreviousCompanyValue);
            } else {
                let insertEmployeeDocumentsQuery = 'INSERT INTO employee_documents (employee_id, document_type_id, document_name, file_path) VALUES (?, ?, ?, ?)';
                let insertEmployeeDocumentsValues = [employeeId, document_type_id, document_name, filePath];
                let insertEmployeeDocumentsResult = await connection.query(insertEmployeeDocumentsQuery, insertEmployeeDocumentsValues);
            }
        }

        let educationArray = employeeEducation
        for (let i = 0; i < educationArray.length; i++) {
            const element = educationArray[i];
            const employee_education_id = element.employee_education_id ? element.employee_education_id : '';
            const education_type = element.education_type ? element.education_type : '';
            const education_name = element.education_name ? element.education_name.trim() : '';
            const passing_year = element.passing_year ? element.passing_year : '';
            const university = element.university ? element.university.trim() : '';

            if (employee_education_id) {
                let updateEmployeeEducationQuery = 'UPDATE employee_education SET education_type = ?, education_name = ?, passing_year = ?, university = ? WHERE employee_id = ? AND employee_education_id = ? ';
                let updateEmployeeEducationValues = [education_type, education_name, passing_year, university, employeeId, employee_education_id];
                let updateEmployeeEducationResult = await connection.query(updateEmployeeEducationQuery, updateEmployeeEducationValues);
            } else {
                let insertEmployeeEducationQuery = 'INSERT INTO employee_education (employee_id, education_type, education_name, passing_year, university) VALUES (?, ?, ?, ?, ?)';
                let insertEmployeeEducationValues = [employeeId, education_type, education_name, passing_year, university];
                let insertEmployeeEducationResult = await connection.query(insertEmployeeEducationQuery, insertEmployeeEducationValues);
            }
        }

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Employee updated successfully.",
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
}

//status change of Employee...
const onStatusChange = async (req, res) => {
    const employeeId = parseInt(req.params.id);
    const status = parseInt(req.query.status); // Validate and parse the status parameter


    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        // Check if the employee exists
        const employeeQuery = "SELECT * FROM employee WHERE employee_id = ? ";
        const employeeResult = await connection.query(employeeQuery, [employeeId]);

        if (employeeResult[0].length == 0) {
            return res.status(404).json({
                status: 404,
                message: "Employee not found.",
            });
        }

        // Validate the status parameter
        if (status !== 0 && status !== 1) {
            return res.status(400).json({
                status: 400,
                message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
            });
        }

        // Soft update the employee status
        const updateQuery = `
            UPDATE employee
            SET status = ?
            WHERE employee_id = ?
        `;

        await connection.query(updateQuery, [status, employeeId]);

        const statusMessage = status === 1 ? "activated" : "deactivated";
        // Commit the transaction
        await connection.commit();
        return res.status(200).json({
            status: 200,
            message: `Employee ${statusMessage} successfully.`,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }
};

//get employee active...
const getEmployeeWma = async (req, res) => {

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        const employeeQuery = `SELECT * FROM employee
        
        WHERE status = 1  ORDER BY employee_first_name`;

        const employeeResult = await connection.query(employeeQuery);
        const employee = employeeResult[0];

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Employee retrieved successfully.",
            data: employee,
        });
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release()
    }

}

module.exports = {
    createEmployee,
    getEmployees,
    getEmployee,
    updateEmployee,
    onStatusChange,
    getEmployeeWma

}