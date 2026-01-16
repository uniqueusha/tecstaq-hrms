const express = require("express");
const router = express.Router();
const gradeController = require("../../controllers/master/grade.controller")
//create 
router.post('/', gradeController.createGrade);
//get all grade
router.get('/', gradeController.getGrades);
//download list
router.get('/download', gradeController.getGradeDownload);
//Active grade
router.get('/wma', gradeController.getGradeWma);
// by id grade
router.get('/:id', gradeController.getGrade);
// update grade
router.put('/:id', gradeController.updateGrade);
// change status grade
router.patch('/:id', gradeController.onStatusChange);

module.exports = router