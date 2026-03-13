const express = require("express");
const router = express.Router();
const workCategoryController = require("../../controllers/master/work-category.controller")
//create work-category
router.post('/', workCategoryController.createWorkCategory);
//get all work-category
router.get('/', workCategoryController.getAllWorkCategory);
//download list
router.get('/download', workCategoryController.getWorkCategoryDownload);
//Active work-category
router.get('/wma', workCategoryController.getWorkCategoryWma);
// by id work-category
router.get('/:id', workCategoryController.getWorkCategory);
// update work-category
router.put('/:id', workCategoryController.updateWorkCategory);
// change status work-category
router.patch('/:id', workCategoryController.onStatusChange);

module.exports = router