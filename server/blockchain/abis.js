const realEstateAbi = [
  'function totalSupply() view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function mint(string tokenURI) returns (uint256)',
];

const escrowAbi = [
  'function nftAddress() view returns (address)',
  'function seller() view returns (address)',
  'function inspector() view returns (address)',
  'function lender() view returns (address)',
  'function isListed(uint256 tokenId) view returns (bool)',
  'function purchasePrice(uint256 tokenId) view returns (uint256)',
  'function escrowAmount(uint256 tokenId) view returns (uint256)',
  'function buyer(uint256 tokenId) view returns (address)',
  'function inspectionPassed(uint256 tokenId) view returns (bool)',
  'function approval(uint256 tokenId, address account) view returns (bool)',
  'function getBalance() view returns (uint256)',
];

module.exports = {
  escrowAbi,
  realEstateAbi,
};
