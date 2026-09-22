const { ethers } = require('ethers');

const PLACEHOLDER_RPC_HOSTS = new Set(['your-ethereum-rpc.example']);

class BlockchainConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BlockchainConfigError';
    this.code = 'BLOCKCHAIN_CONFIGURATION_ERROR';
    this.statusCode = 503;
  }
}

const getOptionalAddress = (name) => {
  const value = process.env[name]?.trim();

  if (!value) {
    return null;
  }

  if (!ethers.utils.isAddress(value)) {
    throw new BlockchainConfigError(`${name} must be a valid Ethereum address.`);
  }

  return ethers.utils.getAddress(value);
};

const getOptionalRpcUrl = () => {
  const value = process.env.BLOCKCHAIN_RPC_URL?.trim();

  if (!value) {
    return null;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(value);
  } catch {
    throw new BlockchainConfigError('BLOCKCHAIN_RPC_URL must be a valid HTTP or HTTPS URL.');
  }

  if (
    !['http:', 'https:'].includes(parsedUrl.protocol)
    || PLACEHOLDER_RPC_HOSTS.has(parsedUrl.hostname)
    || parsedUrl.hostname.endsWith('.example')
  ) {
    throw new BlockchainConfigError(
      'BLOCKCHAIN_RPC_URL must point to a configured HTTP or HTTPS JSON-RPC endpoint.'
    );
  }

  return value;
};

const getOptionalChainId = () => {
  const value = process.env.BLOCKCHAIN_CHAIN_ID;

  if (!value) {
    return null;
  }

  const chainId = Number(value);
  if (!Number.isSafeInteger(chainId) || chainId <= 0) {
    throw new BlockchainConfigError('BLOCKCHAIN_CHAIN_ID must be a positive integer.');
  }

  return chainId;
};

const getBlockchainConfig = () => ({
  rpcUrl: getOptionalRpcUrl(),
  chainId: getOptionalChainId(),
  realEstateAddress: getOptionalAddress('REAL_ESTATE_CONTRACT_ADDRESS'),
  escrowAddress: getOptionalAddress('ESCROW_CONTRACT_ADDRESS'),
});

module.exports = {
  BlockchainConfigError,
  getBlockchainConfig,
};
