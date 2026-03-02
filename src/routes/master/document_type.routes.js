const express = require("express");
const router = express.Router();
const documentController = require("../../controllers/master/document_type.controller")
//create 
router.post('/', documentController.addDocumentType);
//get all grade
router.get('/', documentController.getDocumentTypes);
//download list
router.get('/download', documentController.getdocumentTypeDownload);
//Active grade
router.get('/wma', documentController.getDocumentTypeWma);
// by id grade
router.get('/:id', documentController.getDocumentType);
// update grade
router.put('/:id', documentController.updateDocumentType);
// change status grade
router.patch('/:id', documentController.onStatusChange);

module.exports = router