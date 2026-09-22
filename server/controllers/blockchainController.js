const blockchainService = require('../services/blockchainService');

const sendSuccess = (res, data) => res.status(200).json({
  success: true,
  data,
});

const sendError = (res, error) => {
  const statusCode = error.statusCode || 500;
  const body = {
    success: false,
    error: {
      code: error.code || 'INTERNAL_SERVER_ERROR',
      message: statusCode === 500 ? 'An unexpected server error occurred.' : error.message,
    },
  };

  if (error.details) {
    body.error.details = error.details;
  }

  return res.status(statusCode).json(body);
};

const handle = (action) => async (req, res) => {
  try {
    return sendSuccess(res, await action(req));
  } catch (error) {
    return sendError(res, error);
  }
};

exports.getStatus = handle(() => blockchainService.getStatus());

exports.getTotalSupply = handle(() => blockchainService.getTotalSupply());

exports.getToken = handle((req) => blockchainService.getToken(req.params.tokenId));

exports.getEscrowDetails = handle(() => blockchainService.getEscrowDetails());

exports.getEscrowListing = handle((req) => (
  blockchainService.getEscrowListing(req.params.tokenId)
));

exports.getEscrowApproval = handle((req) => (
  blockchainService.getEscrowApproval(req.params.tokenId, req.params.account)
));

exports.prepareMintTransaction = handle((req) => (
  blockchainService.prepareMintTransaction(req.body || {})
));
