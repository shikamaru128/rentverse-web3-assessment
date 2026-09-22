const { ethers } = require('ethers');
const { escrowAbi, realEstateAbi } = require('../blockchain/abis');
const {
  BlockchainConfigError,
  getBlockchainConfig,
} = require('../config/blockchain');

const CONTRACT_CALL_TIMEOUT_MS = 5000;

class BlockchainServiceError extends Error {
  constructor(message, code, statusCode = 502, details) {
    super(message);
    this.name = 'BlockchainServiceError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

const requireConfigValue = (value, variableName) => {
  if (!value) {
    throw new BlockchainConfigError(`${variableName} is required for this operation.`);
  }

  return value;
};

const getProvider = (config) => {
  const rpcUrl = requireConfigValue(config.rpcUrl, 'BLOCKCHAIN_RPC_URL');
  const chainId = requireConfigValue(config.chainId, 'BLOCKCHAIN_CHAIN_ID');
  return new ethers.providers.JsonRpcProvider(
    { url: rpcUrl, timeout: CONTRACT_CALL_TIMEOUT_MS },
    chainId
  );
};

const getRealEstateContract = () => {
  const config = getBlockchainConfig();
  const address = requireConfigValue(
    config.realEstateAddress,
    'REAL_ESTATE_CONTRACT_ADDRESS'
  );

  return {
    config,
    contract: new ethers.Contract(address, realEstateAbi, getProvider(config)),
  };
};

const getEscrowContract = () => {
  const config = getBlockchainConfig();
  const address = requireConfigValue(config.escrowAddress, 'ESCROW_CONTRACT_ADDRESS');

  return {
    config,
    contract: new ethers.Contract(address, escrowAbi, getProvider(config)),
  };
};

const parseTokenId = (value) => {
  if (!/^\d+$/.test(String(value))) {
    throw new BlockchainServiceError(
      'tokenId must be a non-negative integer.',
      'VALIDATION_ERROR',
      400
    );
  }

  return ethers.BigNumber.from(value);
};

const parseAddress = (value, fieldName = 'account') => {
  if (!ethers.utils.isAddress(value || '')) {
    throw new BlockchainServiceError(
      `${fieldName} must be a valid Ethereum address.`,
      'VALIDATION_ERROR',
      400
    );
  }

  return ethers.utils.getAddress(value);
};

const callContract = async (operation) => {
  let timeoutId;

  try {
    const timeout = new Promise((resolve, reject) => {
      timeoutId = setTimeout(() => {
        reject(new BlockchainServiceError(
          `The blockchain RPC request exceeded ${CONTRACT_CALL_TIMEOUT_MS}ms.`,
          'BLOCKCHAIN_RPC_TIMEOUT',
          504
        ));
      }, CONTRACT_CALL_TIMEOUT_MS);
    });

    return await Promise.race([operation(), timeout]);
  } catch (error) {
    if (error instanceof BlockchainConfigError || error instanceof BlockchainServiceError) {
      throw error;
    }

    const reason = error.reason || error.error?.message || error.message;
    const rpcErrorCodes = ['NETWORK_ERROR', 'SERVER_ERROR', 'TIMEOUT'];
    throw new BlockchainServiceError(
      'The smart contract request failed.',
      rpcErrorCodes.includes(error.code) ? 'BLOCKCHAIN_RPC_ERROR' : 'CONTRACT_CALL_ERROR',
      502,
      reason
    );
  } finally {
    clearTimeout(timeoutId);
  }
};

const getStatus = () => {
  const config = getBlockchainConfig();

  return {
    chainId: config.chainId,
    rpcConfigured: Boolean(config.rpcUrl),
    contracts: {
      realEstate: config.realEstateAddress,
      escrow: config.escrowAddress,
    },
  };
};

const getTotalSupply = async () => callContract(async () => {
  const { config, contract } = getRealEstateContract();
  const totalSupply = await contract.totalSupply();

  return {
    chainId: config.chainId,
    contractAddress: contract.address,
    totalSupply: totalSupply.toString(),
  };
});

const getToken = async (tokenIdValue) => callContract(async () => {
  const tokenId = parseTokenId(tokenIdValue);
  const { config, contract } = getRealEstateContract();
  const [owner, tokenURI] = await Promise.all([
    contract.ownerOf(tokenId),
    contract.tokenURI(tokenId),
  ]);

  return {
    chainId: config.chainId,
    contractAddress: contract.address,
    tokenId: tokenId.toString(),
    owner,
    tokenURI,
  };
});

const getEscrowDetails = async () => callContract(async () => {
  const { config, contract } = getEscrowContract();
  const [nftAddress, seller, inspector, lender, balance] = await Promise.all([
    contract.nftAddress(),
    contract.seller(),
    contract.inspector(),
    contract.lender(),
    contract.getBalance(),
  ]);

  return {
    chainId: config.chainId,
    contractAddress: contract.address,
    nftAddress,
    seller,
    inspector,
    lender,
    balanceWei: balance.toString(),
    balanceEth: ethers.utils.formatEther(balance),
  };
});

const getEscrowListing = async (tokenIdValue) => callContract(async () => {
  const tokenId = parseTokenId(tokenIdValue);
  const { config, contract } = getEscrowContract();
  const [isListed, purchasePrice, escrowAmount, buyer, inspectionPassed] = await Promise.all([
    contract.isListed(tokenId),
    contract.purchasePrice(tokenId),
    contract.escrowAmount(tokenId),
    contract.buyer(tokenId),
    contract.inspectionPassed(tokenId),
  ]);

  return {
    chainId: config.chainId,
    contractAddress: contract.address,
    tokenId: tokenId.toString(),
    isListed,
    purchasePriceWei: purchasePrice.toString(),
    purchasePriceEth: ethers.utils.formatEther(purchasePrice),
    escrowAmountWei: escrowAmount.toString(),
    escrowAmountEth: ethers.utils.formatEther(escrowAmount),
    buyer,
    inspectionPassed,
  };
});

const getEscrowApproval = async (tokenIdValue, accountValue) => callContract(async () => {
  const tokenId = parseTokenId(tokenIdValue);
  const account = parseAddress(accountValue);
  const { config, contract } = getEscrowContract();
  const approved = await contract.approval(tokenId, account);

  return {
    chainId: config.chainId,
    contractAddress: contract.address,
    tokenId: tokenId.toString(),
    account,
    approved,
  };
});

const prepareMintTransaction = ({ tokenURI, from }) => {
  if (typeof tokenURI !== 'string' || !tokenURI.trim()) {
    throw new BlockchainServiceError(
      'tokenURI is required and must be a non-empty string.',
      'VALIDATION_ERROR',
      400
    );
  }

  const config = getBlockchainConfig();
  const contractAddress = requireConfigValue(
    config.realEstateAddress,
    'REAL_ESTATE_CONTRACT_ADDRESS'
  );
  const chainId = requireConfigValue(config.chainId, 'BLOCKCHAIN_CHAIN_ID');
  const contractInterface = new ethers.utils.Interface(realEstateAbi);
  const transaction = {
    to: contractAddress,
    data: contractInterface.encodeFunctionData('mint', [tokenURI.trim()]),
    value: '0x0',
    chainId,
  };

  if (from !== undefined) {
    transaction.from = parseAddress(from, 'from');
  }

  return {
    method: 'mint(string)',
    transaction,
  };
};

module.exports = {
  BlockchainServiceError,
  getEscrowApproval,
  getEscrowDetails,
  getEscrowListing,
  getStatus,
  getToken,
  getTotalSupply,
  prepareMintTransaction,
};
