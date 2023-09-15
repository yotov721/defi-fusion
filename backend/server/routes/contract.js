const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contract');

router.get('/contract/:address', contractController.getContractInfo);

module.exports = router;
