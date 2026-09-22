const express = require('express');
const {
  getEscrowApproval,
  getEscrowDetails,
  getEscrowListing,
  getStatus,
  getToken,
  getTotalSupply,
  prepareMintTransaction,
} = require('../controllers/blockchainController');

const router = express.Router();

router.get('/status', getStatus);
router.get('/real-estate/total-supply', getTotalSupply);
router.get('/real-estate/tokens/:tokenId', getToken);
router.post('/real-estate/mint/prepare', prepareMintTransaction);
router.get('/escrow/details', getEscrowDetails);
router.get('/escrow/listings/:tokenId', getEscrowListing);
router.get('/escrow/listings/:tokenId/approvals/:account', getEscrowApproval);

module.exports = router;
