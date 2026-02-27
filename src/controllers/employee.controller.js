const pool = require('../../db');
const fs = require('fs');
const path = require('path');
const xlsx = require("xlsx");
const bcrypt = require("bcrypt");
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
    const company_id = req.body.company_id ? req.body.company_id : null;
    const departments_id = req.body.departments_id ? req.body.departments_id : null;
    const designation_id = req.body.designation_id ? req.body.designation_id : null;
    const employment_type_id = req.body.employment_type_id ? req.body.employment_type_id : null;
    const employee_code = req.body.employee_code ? req.body.employee_code : null;
    const title = req.body.title ? req.body.title : null;
    const first_name = req.body.first_name ? req.body.first_name : null;
    const last_name = req.body.last_name ? req.body.last_name : null;
    const email = req.body.email ? req.body.email : null;
    const personal_email = req.body.personal_email ? req.body.personal_email : null;
    const dob = req.body.dob ? req.body.dob.trim() : null;
    const gender = req.body.gender ? req.body.gender.trim() : null;
    const father_name = req.body.father_name ? req.body.father_name.trim() : null;
    const mother_name = req.body.mother_name ? req.body.mother_name.trim() : null;
    const blood_group = req.body.blood_group ? req.body.blood_group.trim() : null;
    const marital_status = req.body.marital_status ? req.body.marital_status.trim() : null;
    const country_code = req.body.country_code ? req.body.country_code : null;
    const mobile_number = req.body.mobile_number ? req.body.mobile_number : null;
    const profile_photo = req.body.profile_photo ? req.body.profile_photo.trim() : null;
    const current_address = req.body.current_address ? req.body.current_address.trim() : null;
    const permanent_address = req.body.permanent_address ? req.body.permanent_address.trim() : null;
    const signed_in = req.body.signed_in ? req.body.signed_in : '0';
    const alternate_contact_number = req.body.alternate_contact_number ? req.body.alternate_contact_number : null;
    const doj = req.body.doj ? req.body.doj.trim() : null
    const office_location = req.body.office_location ? req.body.office_location.trim() : null;
    const work_location = req.body.work_location ? req.body.work_location.trim() : null;
    const employee_status = req.body.employee_status ? 'Inactive' : 'Inactive';
    const holiday_calendar_id = req.body.holiday_calendar_id ? req.body.holiday_calendar_id : null;
    const reporting_manager_id = req.body.reporting_manager_id ? req.body.reporting_manager_id : null;
    const uan_number = req.body.uan_number ? req.body.uan_number : null;
    const esic_number = req.body.esic_number ? req.body.esic_number : null;
    const pf_number = req.body.pf_number ? req.body.pf_number : null;
    const pan_card_number = req.body.pan_card_number ? req.body.pan_card_number : null;
    const aadhar_number = req.body.aadhar_number ? req.body.aadhar_number : null;
    const passport_no = req.body.passport_no ? req.body.passport_no : null;
    const passport_expiry = req.body.passport_expiry ? req.body.passport_expiry : null;
    const payment_mode = req.body.payment_mode ? req.body.payment_mode.trim() : null;
    const account_number = req.body.account_number ? req.body.account_number : null;
    const bank_name = req.body.bank_name ? req.body.bank_name.trim() : null;
    const ifsc_code = req.body.ifsc_code ? req.body.ifsc_code.trim() : null;
    const branch_name = req.body.branch_name ? req.body.branch_name.trim() : null;
    const family_member_name = req.body.family_member_name ? req.body.family_member_name.trim() : null;
    const relationship = req.body.relationship ? req.body.relationship.trim() : null;
    const family_dob = req.body.family_dob ? req.body.family_dob.trim() : null
    const is_dependent = req.body.is_dependent ? req.body.is_dependent : null;
    const is_nominee = req.body.is_nominee ? req.body.is_nominee : null;
    const family_mobile_number = req.body.family_mobile_number ? req.body.family_mobile_number : null;
    const previous_company_name = req.body.previous_company_name ? req.body.previous_company_name : null;
    const previous_start_date = req.body.previous_start_date ? req.body.previous_start_date : null
    const previous_end_date = req.body.previous_end_date ? req.body.previous_end_date : null
    const last_drawn_salary = req.body.last_drawn_salary ? req.body.last_drawn_salary : null
    const previous_designation = req.body.previous_designation ? req.body.previous_designation : null;
    const hr_email = req.body.hr_email ? req.body.hr_email : null;
    const hr_mobile = req.body.hr_mobile ? req.body.hr_mobile : null;
    const probation_start_date = req.body.probation_start_date ? req.body.probation_start_date : null
    const probation_end_date = req.body.probation_end_date ? req.body.probation_end_date : null
    const shift_type_header_id = req.body.shift_type_header_id ? req.body.shift_type_header_id : null;
    const shift_start_date = req.body.shift_start_date ? req.body.shift_start_date : null
    const shift_end_date = req.body.shift_end_date ? req.body.shift_end_date : null
    const work_week_pattern_id = req.body.work_week_pattern_id ? req.body.work_week_pattern_id : null;
    const work_week_start_date = req.body.work_week_start_date ? req.body.work_week_start_date : null
    const work_week_end_date = req.body.work_week_end_date ? req.body.work_week_end_date : null
    const employeeDocuments = req.body.employeeDocuments ? req.body.employeeDocuments : [];
    const employeeEducation = req.body.employeeEducation ? req.body.employeeEducation : [];
    const employeePreviousCompanyDocuments = req.body.employeePreviousCompanyDocuments ? req.body.employeePreviousCompanyDocuments : [];
    const employeeBankDocuments = req.body.employeeBankDocuments ? req.body.employeeBankDocuments : [];
    const employeeStatutoryDocuments = req.body.employeeStatutoryDocuments ? req.body.employeeStatutoryDocuments : [];
    let userId = req.body.user_id ? req.body.user_id : '';
    if (!first_name) {
        return error422("First name is required.", res);
    } else if (!last_name) {
        return error422("Last name is required.", res);
    } else if (!dob) {
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
    } else if (!reporting_manager_id && reporting_manager_id != 0) {
        return error422("Reporting manager is required.", res);
    } else if (!aadhar_number) {
        return error422("Aadhar number is required.", res);
    } else if (!title) {
        return error422("Title is required.", res);
    } else if (!userId) {
        return error422("User id is required.", res);
    } else if (!personal_email) {
        return error422("Personal Email is required.", res)
    }

    //check employee already exists or not
    const isExistEmployeeQuery = `SELECT * FROM employee WHERE email = ? `;
    const isExistEmployeeResult = await pool.query(isExistEmployeeQuery, [email]);
    if (isExistEmployeeResult[0].length > 0) {
        return error422("Employee is already exists.", res);
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
                return error422("Only JPG, JPEG, PNG files are allowed", res);
            }

            if (pdfBuffer.length > 10 * 1024 * 1024) {
                return error422("File size must be under 10MB", res);
            }

            const fileName = `${prefix}_${Date.now()}.${fileTypeResult.ext}`;
            const uploadDir = path.join(__dirname, "..", "..", "images");
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
        const insertQuery = "INSERT INTO employee (company_id, departments_id, designation_id, employment_type_id, employee_code, title, first_name, last_name, email, personal_email, dob, gender, father_name, mother_name, blood_group, marital_status, country_code, mobile_number, profile_photo, current_address, permanent_address, signed_in, alternate_contact_number, doj, office_location, work_location, employee_status, holiday_calendar_id, reporting_manager_id, uan_number, esic_number, pf_number, pan_card_number, aadhar_number, passport_no, passport_expiry, user_id)VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        const result = await connection.query(insertQuery, [company_id, departments_id, designation_id, employment_type_id, employee_code, title, first_name, last_name, email, personal_email, dob, gender, father_name, mother_name, blood_group, marital_status, country_code, mobile_number, profilePhotoPath, current_address, permanent_address, signed_in, alternate_contact_number, doj, office_location, work_location, employee_status, holiday_calendar_id, reporting_manager_id, uan_number, esic_number, pf_number, pan_card_number, aadhar_number, passport_no, passport_expiry, userId]);
        const employeeId = result[0].insertId;

        //insert employee_bank_deatils
        const insertBankQuery = "INSERT INTO employee_bank_details (employee_id, payment_mode, account_number, bank_name, ifsc_code, branch_name)VALUES( ?, ?, ?, ?, ?, ?)";
        const insertBankResult = await connection.query(insertBankQuery, [employeeId, payment_mode, account_number, bank_name, ifsc_code, branch_name]);

        //insert employee_family
        const insertFamilyQuery = "INSERT INTO employee_family (employee_id, family_member_name, relationship, family_dob, is_dependent, is_nominee, family_mobile_number)VALUES( ?, ?, ?, ?, ?, ?, ?)";
        const insertFamilyResult = await connection.query(insertFamilyQuery, [employeeId, family_member_name, relationship, family_dob, is_dependent, is_nominee, family_mobile_number]);

        //insert employee_probation
        const insertProbationQuery = "INSERT INTO employee_probation (employee_id, probation_start_date, probation_end_date)VALUES( ?, ?, ?)";
        const insertProbationResult = await connection.query(insertProbationQuery, [employeeId, probation_start_date, probation_end_date]);

        //insert employee_previous_company
        const insertPreviousQuery = "INSERT INTO employee_previous_company (employee_id, previous_company_name, previous_start_date, previous_end_date, last_drawn_salary, previous_designation, hr_email, hr_mobile)VALUES( ?, ?, ?, ?, ?, ?, ?, ?)";
        const insertPreviousResult = await connection.query(insertPreviousQuery, [employeeId, previous_company_name, previous_start_date, previous_end_date, last_drawn_salary, previous_designation, hr_email, hr_mobile]);

        //insert employee_shift
        const insertShiftQuery = "INSERT INTO employee_shift (employee_id, shift_type_header_id , shift_start_date, shift_end_date)VALUES( ?, ?, ?, ?)";
        const insertShiftResult = await connection.query(insertShiftQuery, [employeeId, shift_type_header_id, shift_start_date, shift_end_date]);

        //insert employee_work_week
        const insertWorkQuery = "INSERT INTO employee_work_week (employee_id, work_week_pattern_id, work_week_start_date, work_week_end_date)VALUES( ?, ?, ?, ?)";
        const insertWorkResult = await connection.query(insertWorkQuery, [employeeId, work_week_pattern_id, work_week_start_date, work_week_end_date]);

        let documentsArray = employeeDocuments
        for (let i = 0; i < documentsArray.length; i++) {
            const element = documentsArray[i];
            const document_type_id = element.document_type_id ? element.document_type_id : null;
            const document_name = element.document_name ? element.document_name.trim() : null;
            const file_path = element.file_path ? element.file_path.trim() : null;
            if (document_type_id) {
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
                    const uploadDir = path.join(__dirname, "..", "uploads");
                    if (!fs.existsSync(uploadDir)) {
                        fs.mkdirSync(uploadDir, { recursive: true });
                    }

                    const filePath = path.join(uploadDir, fileName);

                    fs.writeFileSync(filePath, pdfBuffer);
                    return `${fileName}`;
                };

                if (document_type_id) {
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
            }
        }

        let educationArray = employeeEducation
        for (let i = 0; i < educationArray.length; i++) {
            const element = educationArray[i];
            const education_type = element.education_type ? element.education_type : null;
            const education_name = element.education_name ? element.education_name.trim() : null;
            const passing_year = element.passing_year ? element.passing_year : null;
            const university = element.university ? element.university.trim() : null;
            const document_name = element.document_name ? element.document_name.trim() : null;
            const file_path = element.file_path ? element.file_path.trim() : null;
            if (file_path) {
                // Upload education document if provided
            const filePath = await uploadFile(file_path, 'education_document');
            let insertEmployeeDocumentsQuery = 'INSERT INTO employee_education (employee_id, education_type, education_name, passing_year, university, document_name, file_path) VALUES (?, ?, ?, ?, ?, ?, ?)';
            let insertEmployeeDocumentsValues = [employeeId, education_type, education_name, passing_year, university, document_name, filePath];
            let insertEmployeeDocumentsResult = await connection.query(insertEmployeeDocumentsQuery, insertEmployeeDocumentsValues);
            }
            
        }

        let previousCompanyDocumentArray = employeePreviousCompanyDocuments
        for (let i = 0; i < previousCompanyDocumentArray.length; i++) {
            const element = previousCompanyDocumentArray[i];
            const document_type_id = element.document_type_id ? element.document_type_id : null
            const document_name = element.document_name ? element.document_name.trim() : null;
            const file_path = element.file_path ? element.file_path.trim() : null;
            if (document_type_id) {
                // Upload previous company files if provided
                const filePath = await uploadFile(file_path, 'previous_company');

                //check document_type is exists or not
                const isExistDocumentTypeQuery = `SELECT * FROM document_type WHERE document_type_id = ? `;
                const isExistDocumentTypeResult = await connection.query(isExistDocumentTypeQuery, [document_type_id]);
                if (isExistDocumentTypeResult[0].length === 0) {
                    return error422("Document type not found.", res);
                }

                let insertEmployeeDocumentsQuery = 'INSERT INTO employee_previous_company_document_details (employee_id, document_type_id, document_name, file_path) VALUES (?, ?, ?, ?)';
                let insertEmployeeDocumentsValues = [employeeId, document_type_id, document_name, filePath];
                let insertEmployeeDocumentsResult = await connection.query(insertEmployeeDocumentsQuery, insertEmployeeDocumentsValues);

            }
        }
        let bankDocumentArray = employeeBankDocuments
        for (let i = 0; i < bankDocumentArray.length; i++) {
            const element = bankDocumentArray[i];
            const document_type_id = element.document_type_id ? element.document_type_id : null;
            const document_name = element.document_name ? element.document_name.trim() : null;
            const file_path = element.file_path ? element.file_path.trim() : null;
            if (document_type_id) {
                // Upload previous company files if provided
                const filePath = await uploadFile(file_path, 'bank_document');

                //check document_type is exists or not
                const isExistDocumentTypeQuery = `SELECT * FROM document_type WHERE document_type_id = ? `;
                const isExistDocumentTypeResult = await connection.query(isExistDocumentTypeQuery, [document_type_id]);
                if (isExistDocumentTypeResult[0].length === 0) {
                    return error422("Document type not found.", res);
                }

                let insertEmployeeDocumentsQuery = 'INSERT INTO employee_bank_document_details (employee_id, document_type_id, document_name, file_path) VALUES (?, ?, ?, ?)';
                let insertEmployeeDocumentsValues = [employeeId, document_type_id, document_name, filePath];
                let insertEmployeeDocumentsResult = await connection.query(insertEmployeeDocumentsQuery, insertEmployeeDocumentsValues);

            }
        }
        let statutoryDocumentArray = employeeStatutoryDocuments
        for (let i = 0; i < statutoryDocumentArray.length; i++) {
            const element = statutoryDocumentArray[i];
            const document_type_id = element.document_type_id ? element.document_type_id : null;
            const document_name = element.document_name ? element.document_name.trim() : null;
            const file_path = element.file_path ? element.file_path.trim() : null;
            if (document_type_id) {
                // Upload statutory files if provided
                const filePath = await uploadFile(file_path, 'statutory_document');

                //check document_type is exists or not
                const isExistDocumentTypeQuery = `SELECT * FROM document_type WHERE document_type_id = ? `;
                const isExistDocumentTypeResult = await connection.query(isExistDocumentTypeQuery, [document_type_id]);
                if (isExistDocumentTypeResult[0].length === 0) {
                    if (connection) await connection.rollback();
                    return error422("Document type not found.", res);
                }

                let insertEmployeeDocumentsQuery = 'INSERT INTO employee_statutory_document_details (employee_id, document_type_id, document_name, file_path) VALUES (?, ?, ?, ?)';
                let insertEmployeeDocumentsValues = [employeeId, document_type_id, document_name, filePath];
                let insertEmployeeDocumentsResult = await connection.query(insertEmployeeDocumentsQuery, insertEmployeeDocumentsValues);
            }

        }
        if (reporting_manager_id == 0) {
            //insert into user
            const insertUserQuery = `INSERT INTO users (first_name, last_name, email_id, mobile_number, role,employee_id) VALUES (?, ?, ?, ?, ?, ?)`;
            const insertUserValues = [first_name, last_name, email, mobile_number, 'Management', employeeId];
            const insertUserResult = await connection.query(insertUserQuery, insertUserValues);
            const user_id = insertUserResult[0].insertId;

            const hash = await bcrypt.hash('123456', 10); // Hash the password using bcrypt

            //insert into Untitled
            const insertUntitledQuery = "INSERT INTO untitled (user_id, extenstions) VALUES (?,?)";
            const insertUntitledValues = [user_id, hash];
            const untitledResult = await connection.query(insertUntitledQuery, insertUntitledValues)
        }
        await connection.commit()
        return res.status(200).json({
            status: 200,
            message: "Employee created successfully."
        })
    } catch (error) {
        if (connection) await connection.rollback();
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
}

// get employee list...
const getEmployees = async (req, res) => {
    const { page, perPage, key, fromDate, toDate, employee_id, department_id, company_id, reporting_manager_id } = req.query;

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let getEmployeesQuery = `SELECT e.*, ebd.payment_mode, ebd.account_number,ebd.bank_name,ebd.ifsc_code,ebd.branch_name,ef.family_member_name,ef.relationship,ef.family_dob,ef.is_dependent,ef.is_nominee,ef.family_mobile_number,empc.previous_start_date,empc.previous_end_date,empc.last_drawn_salary,empc.previous_designation,empc.hr_email,empc.hr_mobile,
        ep.probation_start_date,ep.probation_end_date,es.shift_type_header_id,es.shift_start_date,es.shift_end_date,eww.work_week_pattern_id,eww. work_week_start_date,eww.work_week_end_date, c.name AS company_name, d.designation, ee.first_name AS reporting_manager_first_name,ee.last_name AS reporting_manager_last_name FROM employee e
        LEFT JOIN employee_bank_details ebd ON ebd.employee_id = e.employee_id
        LEFT JOIN company c ON c.company_id = e.company_id
        LEFT JOIN designation d ON d.designation_id = e.designation_id
        LEFT JOIN employee_family ef ON ef.employee_id = e.employee_id
        LEFT JOIN employee_previous_company empc ON empc.employee_id = e.employee_id
        LEFT JOIN employee_probation ep ON ep.employee_id = e.employee_id
        LEFT JOIN employee_shift es ON es.employee_id = e.employee_id
        LEFT JOIN employee_work_week eww ON eww.employee_id = e.employee_id
        LEFT JOIN employee ee ON ee.employee_id = e.reporting_manager_id
        WHERE 1 AND e.reporting_manager_id !=0 `;

        let countQuery = `SELECT COUNT(*) AS total FROM employee e
        LEFT JOIN employee_bank_details ebd ON ebd.employee_id = e.employee_id
        LEFT JOIN company c ON c.company_id = e.company_id
        LEFT JOIN designation d ON d.designation_id = e.designation_id
        LEFT JOIN employee_family ef ON ef.employee_id = e.employee_id
        LEFT JOIN employee_previous_company empc ON empc.employee_id = e.employee_id
        LEFT JOIN employee_probation ep ON ep.employee_id = e.employee_id
        LEFT JOIN employee_shift es ON es.employee_id = e.employee_id
        LEFT JOIN employee_work_week eww ON eww.employee_id = e.employee_id
        LEFT JOIN employee ee ON ee.employee_id = e.reporting_manager_id
        WHERE 1 AND e.reporting_manager_id !=0 `;

        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            if (lowercaseKey === "activated") {
                // getEmployeesQuery += ` AND e.status = 1`;
                // countQuery += ` AND e.status = 1`;
            } else if (lowercaseKey === "deactivated") {
                // getEmployeesQuery += ` AND e.status = 0`;
                // countQuery += ` AND e.status = 0`;
            } else {
                getEmployeesQuery += ` AND (LOWER(e.first_name) LIKE '%${lowercaseKey}%' || LOWER(e.last_name) LIKE '%${lowercaseKey}%' || LOWER(c.name) LIKE '%${lowercaseKey}%' || LOWER(e.employee_code) LIKE '%${lowercaseKey}%' || LOWER(e.email) LIKE '%${lowercaseKey}%' || LOWER(e.mobile_number) LIKE '%${lowercaseKey}%')`;
                countQuery += ` AND (LOWER(e.first_name) LIKE '%${lowercaseKey}%' || LOWER(e.last_name) LIKE '%${lowercaseKey}%' || LOWER(c.name) LIKE '%${lowercaseKey}%' || LOWER(e.employee_code) LIKE '%${lowercaseKey}%' || LOWER(e.email) LIKE '%${lowercaseKey}%' || LOWER(e.mobile_number) LIKE '%${lowercaseKey}%')`;
            }
        }

        // from date and to date
        if (fromDate && toDate) {
            getEmployeesQuery += ` AND DATE(e.cts) BETWEEN '${fromDate}' AND '${toDate}'`;
            countQuery += ` AND DATE(e.cts) BETWEEN '${fromDate}' AND '${toDate}'`;
        }

        if (department_id) {
            getEmployeesQuery += ` AND e.department_id = ${department_id}`;
            countQuery += `  AND e.department_id = ${department_id}`;
        }

        if (company_id) {
            getEmployeesQuery += ` AND e.company_id = ${company_id}`;
            countQuery += `  AND e.company_id = ${company_id}`;
        }
        if (reporting_manager_id) {
            getEmployeesQuery += ` AND e.reporting_manager_id = ${reporting_manager_id}`;
            countQuery += `  AND e.reporting_manager_id = ${reporting_manager_id}`;
        }

        if (employee_id) {
            getEmployeesQuery += ` AND e.employee_id = ${employee_id}`;
            countQuery += `  AND e.employee_id = ${employee_id}`;
        }

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

        const employeeQuery = `SELECT e.*, ebd.payment_mode, ebd.account_number,ebd.bank_name,ebd.ifsc_code,ebd.branch_name,ef.family_member_name,ef.relationship,ef.family_dob,ef.is_dependent,ef.is_nominee,ef.family_mobile_number,empc.previous_company_name, empc.previous_start_date,empc.previous_end_date,empc.last_drawn_salary,empc.previous_designation,empc.hr_email,empc.hr_mobile,
        ep.probation_start_date,ep.probation_end_date,es.shift_type_header_id, sth.shift_type_name, es.shift_start_date,es.shift_end_date,eww.work_week_pattern_id,eww. work_week_start_date,eww.work_week_end_date, c.name AS company_name, d.designation, ee.first_name AS reporting_manager_first_name, ee.last_name AS reporting_manager_last_name,
        dp.department_name, et.employment_type, hc.calendar_name, wwp.pattern_name, c.name AS company_name, d.designation, ee.first_name AS reporting_manager_first_name,ee.last_name AS reporting_manager_last_name   FROM employee e
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
        LEFT JOIN employee ee ON ee.employee_id = e.reporting_manager_id
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
            const imagePath = path.join(__dirname, "..", "..", "images", employee.profile_photo);

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

                const imagePath = path.join(__dirname, "..", "uploads", element.file_path);
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
        for (let index = 0; index < employeeEducationResult[0].length; index++) {
            const element = employeeEducationResult[0][index];
            if (element.file_path) {
                // Read the image file from the filesystem
                const imagePath = path.join(__dirname, "..", "..", "images", element.file_path);
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
        employee['employeeEducation'] = employeeEducationResult[0];

        //get employee previous company 
        let employeePreviousCompanyQuery = `SELECT ee.* FROM employee_previous_company_document_details ee
            WHERE ee.employee_id = ?`;
        let employeePreviousCompanyResult = await connection.query(employeePreviousCompanyQuery, [employeeId]);
        for (let index = 0; index < employeePreviousCompanyResult[0].length; index++) {
            const element = employeePreviousCompanyResult[0][index];
            if (element.file_path) {
                // Read the image file from the filesystem
                const imagePath = path.join(__dirname, "..", "..", "images", element.file_path);
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
        employee['employeePreviousCompanyDocuments'] = employeePreviousCompanyResult[0];

        //get employee bank details
        let employeeBankDocumentQuery = `SELECT ee.* FROM employee_bank_document_details ee
            WHERE ee.employee_id = ?`;
        let employeeBankDocumentResult = await connection.query(employeeBankDocumentQuery, [employeeId]);
        for (let index = 0; index < employeeBankDocumentResult[0].length; index++) {
            const element = employeeBankDocumentResult[0][index];
            if (element.file_path) {
                // Read the image file from the filesystem
                const imagePath = path.join(__dirname, "..", "..", "images", element.file_path);
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
        employee['employeeBankDocuments'] = employeeBankDocumentResult[0];

        //get employee statutory document details
        let employeeStatutoryDocumentQuery = `SELECT ee.* FROM employee_statutory_document_details ee
            WHERE ee.employee_id = ?`;
        let employeeStatutoryDocumentResult = await connection.query(employeeStatutoryDocumentQuery, [employeeId]);
        for (let index = 0; index < employeeStatutoryDocumentResult[0].length; index++) {
            const element = employeeStatutoryDocumentResult[0][index];
            if (element.file_path) {
                // Read the image file from the filesystem
                const imagePath = path.join(__dirname, "..", "..", "images", element.file_path);
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
        employee['employeeStatutoryDocuments'] = employeeStatutoryDocumentResult[0];

        let getCalenderQuery = 'SELECT * FROM holiday_calendar_details WHERE holiday_calendar_id = ?'
        let [calenderResult] = await connection.query(getCalenderQuery, [employee.holiday_calendar_id])
        employee['calendarDetails'] = calenderResult;

        let getWorkWeekPatternQuery = 'SELECT * FROM work_week_pattern WHERE work_week_pattern_id =? '
        let [workWeekPatternResult] = await connection.query(getWorkWeekPatternQuery, [employee.work_week_pattern_id])
        employee['workWeekPatternDetails'] = workWeekPatternResult[0];

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
    const company_id = req.body.company_id ? req.body.company_id : null;
    const departments_id = req.body.departments_id ? req.body.departments_id : null;
    const designation_id = req.body.designation_id ? req.body.designation_id : null;
    const employment_type_id = req.body.employment_type_id ? req.body.employment_type_id : null;
    const employee_code = req.body.employee_code ? req.body.employee_code : null;
    const title = req.body.title ? req.body.title : null;
    const first_name = req.body.first_name ? req.body.first_name : null;
    const last_name = req.body.last_name ? req.body.last_name : null;
    const email = req.body.email ? req.body.email : null;
    const personal_email = req.body.personal_email ? req.body.personal_email : null;
    const dob = req.body.dob ? req.body.dob.trim() : null;
    const gender = req.body.gender ? req.body.gender.trim() : null;
    const father_name = req.body.father_name ? req.body.father_name.trim() : null;
    const mother_name = req.body.mother_name ? req.body.mother_name.trim() : null;
    const blood_group = req.body.blood_group ? req.body.blood_group.trim() : null;
    const marital_status = req.body.marital_status ? req.body.marital_status.trim() : null;
    const country_code = req.body.country_code ? req.body.country_code : null;
    const mobile_number = req.body.mobile_number ? req.body.mobile_number : null;
    const profile_photo = req.body.profile_photo ? req.body.profile_photo.trim() : null;
    const current_address = req.body.current_address ? req.body.current_address.trim() : null;
    const permanent_address = req.body.permanent_address ? req.body.permanent_address.trim() : null;
    const signed_in = req.body.signed_in ? req.body.signed_in : '0';
    const alternate_contact_number = req.body.alternate_contact_number ? req.body.alternate_contact_number : null;
    const doj = req.body.doj ? req.body.doj.trim() : null
    const office_location = req.body.office_location ? req.body.office_location.trim() : null;
    const work_location = req.body.work_location ? req.body.work_location.trim() : null;
    const employee_status = req.body.employee_status ? req.body.employee_status : null;
    const holiday_calendar_id = req.body.holiday_calendar_id ? req.body.holiday_calendar_id : null;
    const reporting_manager_id = req.body.reporting_manager_id ? req.body.reporting_manager_id : null;
    const uan_number = req.body.uan_number ? req.body.uan_number : null;
    const esic_number = req.body.esic_number ? req.body.esic_number : null;
    const pf_number = req.body.pf_number ? req.body.pf_number : null;
    const pan_card_number = req.body.pan_card_number ? req.body.pan_card_number : null;
    const aadhar_number = req.body.aadhar_number ? req.body.aadhar_number : null;
    const passport_no = req.body.passport_no ? req.body.passport_no : null;
    const passport_expiry = req.body.passport_expiry ? req.body.passport_expiry : null;
    const payment_mode = req.body.payment_mode ? req.body.payment_mode.trim() : null;
    const account_number = req.body.account_number ? req.body.account_number : null;
    const bank_name = req.body.bank_name ? req.body.bank_name.trim() : null;
    const ifsc_code = req.body.ifsc_code ? req.body.ifsc_code.trim() : null;
    const branch_name = req.body.branch_name ? req.body.branch_name.trim() : null;
    const family_member_name = req.body.family_member_name ? req.body.family_member_name.trim() : null;
    const relationship = req.body.relationship ? req.body.relationship.trim() : null;
    const family_dob = req.body.family_dob ? req.body.family_dob.trim() : null
    const is_dependent = req.body.is_dependent ? req.body.is_dependent : null;
    const is_nominee = req.body.is_nominee ? req.body.is_nominee : null;
    const family_mobile_number = req.body.family_mobile_number ? req.body.family_mobile_number : null;
    const previous_company_name = req.body.previous_company_name ? req.body.previous_company_name : null;
    const previous_start_date = req.body.previous_start_date ? req.body.previous_start_date : null;
    const previous_end_date = req.body.previous_end_date ? req.body.previous_end_date : null;
    const last_drawn_salary = req.body.last_drawn_salary ? req.body.last_drawn_salary : null;
    const previous_designation = req.body.previous_designation ? req.body.previous_designation : null;
    const hr_email = req.body.hr_email ? req.body.hr_email : null;
    const hr_mobile = req.body.hr_mobile ? req.body.hr_mobile : null;
    const probation_start_date = req.body.probation_start_date ? req.body.probation_start_date : null;
    const probation_end_date = req.body.probation_end_date ? req.body.probation_end_date : null;
    const shift_type_header_id = req.body.shift_type_header_id ? req.body.shift_type_header_id : null;
    const shift_start_date = req.body.shift_start_date ? req.body.shift_start_date : null;
    const shift_end_date = req.body.shift_end_date ? req.body.shift_end_date : null;
    const work_week_pattern_id = req.body.work_week_pattern_id ? req.body.work_week_pattern_id : null;
    const work_week_start_date = req.body.work_week_start_date ? req.body.work_week_start_date : null;
    const work_week_end_date = req.body.work_week_end_date ? req.body.work_week_end_date : null;
    const employeeDocuments = req.body.employeeDocuments ? req.body.employeeDocuments : [];
    const employeeEducation = req.body.employeeEducation ? req.body.employeeEducation : [];
    const employeePreviousCompanyDocuments = req.body.employeePreviousCompanyDocuments ? req.body.employeePreviousCompanyDocuments : [];
    const employeeBankDocuments = req.body.employeeBankDocuments ? req.body.employeeBankDocuments : [];
    const employeeStatutoryDocuments = req.body.employeeStatutoryDocuments ? req.body.employeeStatutoryDocuments : [];
    if (!first_name) {
        return error422("First name is required.", res);
    } else if (!last_name) {
        return error422("Last name is required.", res);
    } else if (!dob) {
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
    } else if (!reporting_manager_id && reporting_manager_id != 0) {
        return error422("Reporting manager is required.", res);
    } else if (!aadhar_number) {
        return error422("Aadhar number is required.", res);
    } else if (!title) {
        return error422("Title is required.", res);
    } else if (!email) {
        return error422("Email is required.", res);
    } else if (!personal_email) {
        return error422("Personal email is required.", res)
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
        // Check if the provided employee exists
        const existingEmployeeQuery = "SELECT * FROM employee WHERE email = ? AND employee_id !=? ";
        const existingEmployeeResult = await connection.query(existingEmployeeQuery, [email, employeeId]);

        if (existingEmployeeResult[0].length > 0) {
            return error422("Email already exists.", res);
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
                return error422("Only JPG, JPEG, PNG files are allowed", res);
            }

            if (pdfBuffer.length > 10 * 1024 * 1024) {
                return error422("File size must be under 10MB", res);
            }

            const fileName = `${prefix}_${Date.now()}.${fileTypeResult.ext}`;
            const uploadDir = path.join(__dirname, "..", "..", "images");
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
            SET company_id = ?, departments_id = ?, designation_id = ?, employment_type_id = ?, employee_code = ?, title = ?, first_name = ?, last_name = ?, email = ?, personal_email = ?, dob = ?, gender = ?, father_name = ?, mother_name = ?, blood_group = ?, marital_status = ?, country_code = ?, mobile_number = ?, profile_photo = ?, current_address = ?, permanent_address = ?, signed_in = ?, alternate_contact_number = ?, doj = ?, office_location = ?, work_location = ?, employee_status = ?, holiday_calendar_id = ?, reporting_manager_id = ?, uan_number = ?, esic_number = ?, pf_number = ?, pan_card_number = ?, aadhar_number = ?, passport_no = ?, passport_expiry = ?
            WHERE employee_id = ?
        `;
        await connection.query(updateQuery, [company_id, departments_id, designation_id, employment_type_id, employee_code, title, first_name, last_name, email, personal_email, dob, gender, father_name, mother_name, blood_group, marital_status, country_code, mobile_number, profilePhotoPath, current_address, permanent_address, signed_in, alternate_contact_number, doj, office_location, work_location, employee_status, holiday_calendar_id, reporting_manager_id, uan_number, esic_number, pf_number, pan_card_number, aadhar_number, passport_no, passport_expiry, employeeId]);
        if (employeeResult[0][0].profile_photo) {
            let oldImageFilePath = path.join(__dirname, "..", "..", "images", employeeResult[0][0].profile_photo);
            if ((oldImageFilePath && fs.existsSync(oldImageFilePath))) {
                fs.unlinkSync(oldImageFilePath);
            }
        }
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
            SET family_member_name = ?, relationship = ?, family_dob = ?, is_dependent = ?, is_nominee = ?, family_mobile_number = ?
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
            SET previous_company_name = ?, previous_start_date = ?, previous_end_date = ?, last_drawn_salary = ?, previous_designation = ?, hr_email = ?, hr_mobile = ?
            WHERE employee_id = ?
        `;
        await connection.query(updatePreviousCompanyQuery, [previous_company_name, previous_start_date, previous_end_date, last_drawn_salary, previous_designation, hr_email, hr_mobile, employeeId]);

        //update employee_shift
        const updateShiftQuery = `
            UPDATE employee_shift
            SET shift_type_header_id = ?, shift_start_date = ?, shift_end_date = ?
            WHERE employee_id = ?
        `;
        await connection.query(updateShiftQuery, [shift_type_header_id, shift_start_date, shift_end_date, employeeId]);

        //update employee_work_week
        const updateWorkQuery = `
            UPDATE employee_work_week
            SET work_week_pattern_id = ?, work_week_start_date = ?, work_week_end_date = ?
            WHERE employee_id = ?
        `;
        await connection.query(updateWorkQuery, [work_week_pattern_id, work_week_start_date, work_week_end_date, employeeId]);

        let documentsArray = employeeDocuments
        for (let i = 0; i < documentsArray.length; i++) {
            const element = documentsArray[i];
            const employee_documents_id = element.employee_documents_id ? element.employee_documents_id : null;
            const document_type_id = element.document_type_id ? element.document_type_id : null;
            const document_name = element.document_name ? element.document_name.trim() : null;
            const file_path = element.file_path ? element.file_path.trim() : null;

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
                const uploadDir = path.join(__dirname, "..", "uploads");
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }

                const filePath = path.join(uploadDir, fileName);

                fs.writeFileSync(filePath, pdfBuffer);
                return `${fileName}`;
            };

            if (document_type_id) {
                // Upload GST and PAN files if provided
                const filePath = await uploadFile(file_path, 'file_path');
                //check document_type is exists or not
                const isExistDocumentTypeQuery = `SELECT * FROM document_type WHERE document_type_id = ? `;
                const isExistDocumentTypeResult = await connection.query(isExistDocumentTypeQuery, [document_type_id]);
                if (isExistDocumentTypeResult[0].length === 0) {
                    return error422("Document type not found.", res);
                }
                            if (employee_documents_id) {
                // get document upload
                let getUploadQuery = `SELECT * FROM employee_documents WHERE employee_documents_id = ${employee_documents_id}`
                let uploadResult = await connection.query(getUploadQuery)

                if (uploadResult[0].length > 0) {
                    let updateDocumentQuery = `UPDATE employee_documents SET document_type_id = ?, document_name = ?, file_path = ? WHERE employee_id = ? AND employee_documents_id = ?`;
                    let updateDocumentValue = [document_type_id, document_name, filePath, employeeId, employee_documents_id]
                    let updateDocumentResult = await connection.query(updateDocumentQuery, updateDocumentValue);
                    let oldImageFilePath = path.join(__dirname, "..", "uploads", uploadResult[0][0].file_path);
                    if ((oldImageFilePath && fs.existsSync(oldImageFilePath))) {
                        fs.unlinkSync(oldImageFilePath);
                    }
                }

            } else {
                let insertEmployeeDocumentsQuery = 'INSERT INTO employee_documents (employee_id, document_type_id, document_name, file_path) VALUES (?, ?, ?, ?)';
                let insertEmployeeDocumentsValues = [employeeId, document_type_id, document_name, filePath];
                let insertEmployeeDocumentsResult = await connection.query(insertEmployeeDocumentsQuery, insertEmployeeDocumentsValues);
            }
            }


        }

        let educationArray = employeeEducation
        for (let i = 0; i < educationArray.length; i++) {
            const element = educationArray[i];
            const employee_education_id = element.employee_education_id ? element.employee_education_id : null;
            const education_type = element.education_type ? element.education_type : null;
            const education_name = element.education_name ? element.education_name.trim() : null;
            const passing_year = element.passing_year ? element.passing_year : null;
            const university = element.university ? element.university.trim() : null;
            const document_name = element.document_name ? element.document_name.trim() : null;
            const file_path = element.file_path ? element.file_path.trim() : null;

            const filePath = await uploadFile(file_path, 'education_document');
            if (employee_education_id) {
                // Upload education document if provided
                // get employee document upload
                let getUploadQuery = `SELECT * FROM employee_education WHERE employee_education_id = ${employee_education_id}`
                let uploadResult = await connection.query(getUploadQuery)

                if (uploadResult[0].length > 0) {
                    let updateDocumentQuery = `UPDATE employee_education SET education_type = ?, education_name = ?, passing_year = ?, university = ?, document_name = ?, file_path = ? WHERE employee_id = ? AND employee_education_id = ?`;
                    let updateDocumentValue = [education_type, education_name, passing_year, university, document_name, filePath, employeeId, employee_education_id]
                    let updateDocumentResult = await connection.query(updateDocumentQuery, updateDocumentValue);
                    // delete old file safely
                    const oldFile = uploadResult?.[0]?.[0]?.file_path;
                    const oldPath = path.join(__dirname, "..", "..", "images", oldFile);
                    if (oldFile && oldFile !== filePath &&fs.existsSync(oldPath)) {
                      try {
                        await fs.promises.unlink(oldPath);
                      } catch (e) {
                        return error422("File delete skipped:"+ e.message,res);
                      }
                    }
                }

            } else {
                let insertEmployeeEducationQuery = 'INSERT INTO employee_education (employee_id, education_type, education_name, passing_year, university, document_name, file_path) VALUES (?, ?, ?, ?, ?, ?, ?)';
                let insertEmployeeEducationValues = [employeeId, education_type, education_name, passing_year, university, document_name, filePath];
                let insertEmployeeEducationResult = await connection.query(insertEmployeeEducationQuery, insertEmployeeEducationValues);
            }
        }
        //update previous company document
        let previousCompanyDocumentsArray = employeePreviousCompanyDocuments
        for (let i = 0; i < previousCompanyDocumentsArray.length; i++) {
            const element = previousCompanyDocumentsArray[i];
            const employee_previous_company_documents_id = element.employee_previous_company_documents_id ? element.employee_previous_company_documents_id : null;
            const document_type_id = element.document_type_id ? element.document_type_id : null;
            const document_name = element.document_name ? element.document_name.trim() : null;
            const file_path = element.file_path ? element.file_path.trim() : null;
            // Upload files if provided
            if (document_type_id) {
                const filePath = await uploadFile(file_path, 'file_path');
                //check document_type is exists or not
                const isExistDocumentTypeQuery = `SELECT * FROM document_type WHERE document_type_id = ? `;
                const isExistDocumentTypeResult = await connection.query(isExistDocumentTypeQuery, [document_type_id]);
                if (isExistDocumentTypeResult[0].length === 0) {
                    return error422("Document type not found.", res);
                }

                if (employee_previous_company_documents_id) {
                    // get document upload
                    let getUploadQuery = `SELECT * FROM employee_previous_company_document_details WHERE employee_previous_company_documents_id = ${employee_previous_company_documents_id}`
                    let uploadResult = await connection.query(getUploadQuery)

                    if (uploadResult[0].length > 0) {
                        let updateDocumentQuery = `UPDATE employee_previous_company_document_details SET document_type_id = ?, document_name = ?, file_path = ? WHERE employee_id = ? AND employee_previous_company_documents_id = ?`;
                        let updateDocumentValue = [document_type_id, document_name, filePath, employeeId, employee_previous_company_documents_id]
                        let updateDocumentResult = await connection.query(updateDocumentQuery, updateDocumentValue);
                        // delete old file safely
                        const oldFile = uploadResult?.[0]?.[0]?.file_path;
                        const oldPath = path.join(__dirname, "..", "..", "images", oldFile);
                        if (oldFile && oldFile !== filePath &&fs.existsSync(oldPath)) {
                          try {
                            await fs.promises.unlink(oldPath);
                          } catch (e) {
                            return error422("File delete skipped:"+ e.message,res);
                          }
                        }
                    }
                    

                } else {
                    let insertEmployeeDocumentsQuery = 'INSERT INTO employee_previous_company_document_details (employee_id, document_type_id, document_name, file_path) VALUES (?, ?, ?, ?)';
                    let insertEmployeeDocumentsValues = [employeeId, document_type_id, document_name, filePath];
                    let insertEmployeeDocumentsResult = await connection.query(insertEmployeeDocumentsQuery, insertEmployeeDocumentsValues);
                }
            }

        }

        //update Statutory Documents
        let statutoryDocumentsArray = employeeStatutoryDocuments
        for (let i = 0; i < statutoryDocumentsArray.length; i++) {
            const element = statutoryDocumentsArray[i];
            const employee_statutory_documents_id = element.employee_statutory_documents_id ? element.employee_statutory_documents_id : null;
            const document_type_id = element.document_type_id ? element.document_type_id : null;
            const document_name = element.document_name ? element.document_name.trim() : null;
            const file_path = element.file_path ? element.file_path.trim() : null;
            // Upload files if provided
            if (document_type_id) {
                const filePath = await uploadFile(file_path, 'file_path');
                //check document_type is exists or not
                const isExistDocumentTypeQuery = `SELECT * FROM document_type WHERE document_type_id = ? `;
                const isExistDocumentTypeResult = await connection.query(isExistDocumentTypeQuery, [document_type_id]);
                if (isExistDocumentTypeResult[0].length === 0) {
                    return error422("Document type not found.", res);
                }

                if (employee_statutory_documents_id) {
                    // get document upload
                    let getUploadQuery = `SELECT * FROM employee_statutory_document_details WHERE employee_statutory_documents_id = ${employee_statutory_documents_id}`
                    let uploadResult = await connection.query(getUploadQuery)

                    if (uploadResult[0].length > 0) {
                        let updateDocumentQuery = `UPDATE employee_statutory_document_details SET document_type_id = ?, document_name = ?, file_path = ? WHERE employee_id = ? AND employee_statutory_documents_id = ?`;
                        let updateDocumentValue = [document_type_id, document_name, filePath, employeeId, employee_statutory_documents_id]
                        let updateDocumentResult = await connection.query(updateDocumentQuery, updateDocumentValue);
                        let oldImageFilePath = path.join(__dirname, "..", "..", "images", uploadResult[0][0].file_path);
                        if ((oldImageFilePath && fs.existsSync(oldImageFilePath))) {
                            fs.unlinkSync(oldImageFilePath);
                        }
                    }

                } else {
                    let insertEmployeeDocumentsQuery = 'INSERT INTO employee_statutory_document_details (employee_id, document_type_id, document_name, file_path) VALUES (?, ?, ?, ?)';
                    let insertEmployeeDocumentsValues = [employeeId, document_type_id, document_name, filePath];
                    let insertEmployeeDocumentsResult = await connection.query(insertEmployeeDocumentsQuery, insertEmployeeDocumentsValues);
                }
            }
        }
        //update bank document
        let bankDocumentsArray = employeeBankDocuments
        for (let i = 0; i < bankDocumentsArray.length; i++) {
            const element = bankDocumentsArray[i];
            const employee_bank_documents_id = element.employee_bank_documents_id ? element.employee_bank_documents_id : null;
            const document_type_id = element.document_type_id ? element.document_type_id : null;
            const document_name = element.document_name ? element.document_name.trim() : null;
            const file_path = element.file_path ? element.file_path.trim() : null;
            // Upload files if provided
            if (document_type_id) {
                const filePath = await uploadFile(file_path, 'file_path');
                //check document_type is exists or not
                const isExistDocumentTypeQuery = `SELECT * FROM document_type WHERE document_type_id = ? `;
                const isExistDocumentTypeResult = await connection.query(isExistDocumentTypeQuery, [document_type_id]);
                if (isExistDocumentTypeResult[0].length === 0) {
                    return error422("Document type not found.", res);
                }

                if (employee_bank_documents_id) {
                    // get document upload
                    let getUploadQuery = `SELECT * FROM employee_bank_document_details WHERE employee_bank_documents_id = ${employee_bank_documents_id}`
                    let uploadResult = await connection.query(getUploadQuery)

                    if (uploadResult[0].length > 0) {
                        let updateDocumentQuery = `UPDATE employee_bank_document_details SET document_type_id = ?, document_name = ?, file_path = ? WHERE employee_id = ? AND employee_bank_documents_id = ?`;
                        let updateDocumentValue = [document_type_id, document_name, filePath, employeeId, employee_bank_documents_id]
                        let updateDocumentResult = await connection.query(updateDocumentQuery, updateDocumentValue);
                        let oldImageFilePath = path.join(__dirname, "..", "..", "images", uploadResult[0][0].file_path);
                        if ((oldImageFilePath && fs.existsSync(oldImageFilePath))) {
                            fs.unlinkSync(oldImageFilePath);
                        }
                    }

                } else {
                    let insertEmployeeDocumentsQuery = 'INSERT INTO employee_bank_document_details (employee_id, document_type_id, document_name, file_path) VALUES (?, ?, ?, ?)';
                    let insertEmployeeDocumentsValues = [employeeId, document_type_id, document_name, filePath];
                    let insertEmployeeDocumentsResult = await connection.query(insertEmployeeDocumentsQuery, insertEmployeeDocumentsValues);
                }
            }

        }

        let isUserQuery = `SELECT  * FROM users WHERE employee_id = ?`;
        let [isUserResult] = await connection.query(isUserQuery, employeeId);
        if (isUserResult[0]) {
            //update employee_work_week
            const updateWorkQuery = `
            UPDATE users
            SET first_name = ?, last_name = ?, email_id = ?,  mobile_number = ?
            WHERE employee_id = ?
        `;
            await connection.query(updateWorkQuery, [first_name, last_name, email, mobile_number, employeeId]);
        }

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Employee updated successfully.",
        });
    } catch (error) {
        console.log(error);
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
        let employee_status = status == 1 ? 'Active' : 'Inactive'
        let getUserQuery = `SELECT * FROM users WHERE employee_id = ?`;
        let [getUserResult] = await connection.query(getUserQuery, [employeeId])
        if (getUserResult[0]) {
            // Soft update the user status
            const updateQuery = `
            UPDATE user
            SET status = ?
            WHERE employee_id = ?`;
            await connection.query(updateQuery, [status, employeeId]);
        }




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
    const { is_upcoming_birthday } = req.query;
    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let employeeQuery = `SELECT * FROM employee
        WHERE status = 1  `;

        // Upcoming birthdays within next 7 days
        if (is_upcoming_birthday) {
            employeeQuery += `
            AND (
              DAYOFYEAR(dob) BETWEEN DAYOFYEAR(CURDATE())
              AND DAYOFYEAR(DATE_ADD(CURDATE(), INTERVAL 7 DAY))
              OR
              (
                DAYOFYEAR(DATE_ADD(CURDATE(), INTERVAL 7 DAY)) < DAYOFYEAR(CURDATE())
                AND (
                  DAYOFYEAR(dob) >= DAYOFYEAR(CURDATE())
                  OR DAYOFYEAR(dob) <= DAYOFYEAR(DATE_ADD(CURDATE(), INTERVAL 7 DAY))
                )
              )
            )
          `;
        }
        employeeQuery += " ORDER BY first_name"
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
//for admin dropdown
const getEmployeeAdminWma = async (req, res) => {

    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        const employeeQuery = `SELECT * FROM employee
        
        WHERE 1 AND reporting_manager_id !=0 ORDER BY first_name`;

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

//download list
const getEmployeeDownload = async (req, res) => {

    const { key } = req.query;

    let connection = await getConnection();
    try {
        await connection.beginTransaction();

        let getEmployeeQuery = `SELECT e.*, ebd.payment_mode, ebd.account_number,ebd.bank_name,ebd.ifsc_code,ebd.branch_name,ef.family_member_name,ef.relationship,ef.family_dob,ef.is_dependent,ef.is_nominee,ef.family_mobile_number,empc.previous_start_date,empc.previous_end_date,empc.last_drawn_salary,empc.previous_designation,empc.hr_email,empc.hr_mobile,
        ep.probation_start_date,ep.probation_end_date,es.shift_type_header_id,es.shift_start_date,es.shift_end_date,eww.work_week_pattern_id,eww. work_week_start_date,eww.work_week_end_date, c.name AS company_name, d.designation, ee.first_name AS reporting_manager_first_name,ee.last_name AS reporting_manager_last_name FROM employee e
        LEFT JOIN employee_bank_details ebd ON ebd.employee_id = e.employee_id
        LEFT JOIN company c ON c.company_id = e.company_id
        LEFT JOIN designation d ON d.designation_id = e.designation_id
        LEFT JOIN employee_family ef ON ef.employee_id = e.employee_id
        LEFT JOIN employee_previous_company empc ON empc.employee_id = e.employee_id
        LEFT JOIN employee_probation ep ON ep.employee_id = e.employee_id
        LEFT JOIN employee_shift es ON es.employee_id = e.employee_id
        LEFT JOIN employee_work_week eww ON eww.employee_id = e.employee_id
        LEFT JOIN employee ee ON ee.employee_id = e.reporting_manager_id
        WHERE 1 AND e.reporting_manager_id !=0 `;
        if (key) {
            const lowercaseKey = key.toLowerCase().trim();
            getEmployeeQuery += ` AND (LOWER(e.first_name) LIKE '%${lowercaseKey}%' || LOWER(e.last_name) LIKE '%${lowercaseKey}%' || LOWER(c.name) LIKE '%${lowercaseKey}%' || LOWER(e.employee_code) LIKE '%${lowercaseKey}%' || LOWER(e.email) LIKE '%${lowercaseKey}%' || LOWER(e.mobile_number) LIKE '%${lowercaseKey}%')`;
        }
        getEmployeeQuery += " ORDER BY e.cts DESC";

        let result = await connection.query(getEmployeeQuery);
        let employee = result[0];

        if (employee.length === 0) {
            return error422("No data found.", res);
        }

        employee = employee.map((item, index) => ({
            "Sr No": index + 1,
            "Code": item.employee_code,
            "Name": `${item.title} ${item.first_name} ${item.last_name}`,
            "Email": item.email_id,
            "Personal Email": item.personal_email,
            "Date of Birth": item.dob,
            "Gender": item.gender,
            "Father Name": item.father_name,
            "Mother Name": item.mother_name,
            "Blood Group": item.blood_group,
            "Marital Status": item.marital_status,
            "Country Code": item.country_code,
            "Mobile No": item.mobile_number,
            "Profile Photo": item.profile_photo,
            "Current Address": item.current_address,
            "Permanent Address": item.permanent_address,
            "Signed In": item.signed_in,
            "Alternate Contact Number": item.alternate_contact_number,
            "Date of Joining": item.doj,
            "Office Location": item.office_location,
            "Work Location": item.work_location,
            "Employee Status": item.employee_status,
            "UAN Number": item.uan_number,
            "ESIC Number": item.esic_number,
            "PF Number": item.pf_number,
            "PAN Card Number": item.pan_card_number,
            "Aadhar Number": item.aadhar_number,
            "Passport Number": item.passport_no,
            "Passport Expiry": item.passport_expiry,
            "Payment Mode": item.payment_mode,
            "Account Number": item.account_number,
            "Bank Name": item.bank_name,
            "IFSC Code": item.ifsc_code,
            "Branch Name": item.branch_name,
            "Family Member Name": item.family_member_name,
            "Relationship": item.relationship,
            "Family DOB": item.family_dob,
            "Is Dependent": item.is_dependent,
            "Is Nominee": item.is_nominee,
            "Family Mobile Number": item.family_mobile_number,
            "Previous Start Date": item.previous_start_date,
            "Previous End Date": item.previous_end_date,
            "Last Drawn Salary": item.last_drawn_salary,
            "Previous Designation": item.previous_designation,
            "HR Email": item.hr_email,
            "HR Mobile": item.hr_mobile,
            "Probation Start Date": item.probation_start_date,
            "Probation End Date": item.probation_end_date,
            "Shift Start Date": item.shift_start_date,
            "Shift End Date": item.shift_end_date,
            "Work Week Start Date": item.work_week_start_date,
            "Work Week End Date": item.work_week_end_date,
            "Company": item.company_name,
            "Designation": item.designation,
            "Reporting Manager": item.reporting_manager_first_name + " " + item.reporting_manager_last_name,
            "Status": item.status === 1 ? "activated" : "deactivated",

        }));

        // Create a new workbook
        const workbook = xlsx.utils.book_new();

        // Create a worksheet and add only required columns
        const worksheet = xlsx.utils.json_to_sheet(employee);

        // Add the worksheet to the workbook
        xlsx.utils.book_append_sheet(workbook, worksheet, "employeeInfo");

        // Create a unique file name
        const excelFileName = `exported_data_${Date.now()}.xlsx`;

        // Write the workbook to a file
        xlsx.writeFile(workbook, excelFileName);

        // Send the file to the client
        res.download(excelFileName, (err) => {
            if (err) {
                console.error(err);
                res.status(500).send("Error downloading the file.");
            } else {
                fs.unlinkSync(excelFileName);
            }
        });

        await connection.commit();
    } catch (error) {
        return error500(error, res);
    } finally {
        if (connection) connection.release();
    }
};
//Upcoming Leave
const getUpcomingLeaves = async (req, res) => {
    // attempt to obtain a database connection
    let connection = await getConnection();

    try {

        //start a transaction
        await connection.beginTransaction();

        let employeeQuery = `SELECT 
                lr.leave_request_id,
                lr.employee_id,
                lr.leave_type_id,
                lr.start_date,
                lr.end_date,
                lr.total_days,
                lr.reason,
                lr.status AS leave_status,
                lr.approver_id,
                lr.applied_date,
                lr.approved_date,

                lrf.leave_request_footer_id,
                lrf.leave_date,
                lrf.type AS leave_day_type,

                e.employee_id,
                e.employee_code,
                e.first_name,
                e.last_name,
                e.email,
                e.departments_id,
                e.designation_id,
                e.profile_photo

            FROM leave_request lr
            INNER JOIN leave_request_footer lrf
                ON lrf.leave_request_id = lr.leave_request_id
            INNER JOIN employee e
                ON e.employee_id = lr.employee_id

            WHERE 
                lr.status = 'Approved'                -- approved leave
                AND e.status = 1             -- active employee
                AND lrf.leave_date BETWEEN CURDATE()
                AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)

            ORDER BY lrf.leave_date ASC `;

        const employeeResult = await connection.query(employeeQuery);
        const employee = employeeResult[0];

        // Commit the transaction
        await connection.commit();

        return res.status(200).json({
            status: 200,
            message: "Upcoming leaves retrieved successfully.",
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
    getEmployeeWma,
    getEmployeeAdminWma,
    getEmployeeDownload,
    getUpcomingLeaves

}