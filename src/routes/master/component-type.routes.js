const express = require("express");
const router = express.Router();
const componentTypeController = require("../../controllers/master/component-type.controller")
//create component type
router.post('/', componentTypeController.createComponentType);
//get all component type
router.get('/', componentTypeController.getComponentTypes);
//download list
// router.get('/download', componentTypeController.getGradeDownload);
//Active component type
router.get('/wma', componentTypeController.getComponentTypeWma);
// by id component type
router.get('/:id', componentTypeController.getComponentType);
// update component type
router.put('/:id', componentTypeController.updateComponentType);
// change status component type
router.patch('/:id', componentTypeController.onStatusChange);

module.exports = router