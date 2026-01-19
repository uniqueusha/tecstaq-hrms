const express = require("express");
const router = express.Router();
const ProfessionalTaxSlabController = require("../controllers/professional_tax_slabs.controller");
const { verifyToken } = require('../middleware/authMiddleware');


router.post('/', verifyToken,ProfessionalTaxSlabController.createProfessionalTaxSlabs);
router.get('/', ProfessionalTaxSlabController.getAllProfessionalTaxSlabs);
router.get('/wma', ProfessionalTaxSlabController.getProfessionalTaxSlabsIdWma);
router.get('/:id', ProfessionalTaxSlabController.getprofessionalTaxSlab);
router.put('/:id', ProfessionalTaxSlabController.updateProfessionalTaxSlabs);
router.patch('/:id',ProfessionalTaxSlabController.onStatusChange);

module.exports = router