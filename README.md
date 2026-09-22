# RentVerse

RentVerse is a full-stack Web3 assessment project for exploring tokenized real
estate. The application combines a React interface, MetaMask wallet connection,
an Express API, and Solidity contracts.

## Implemented Features

- MetaMask connection through ethers v5
- Shared wallet state for account, chain ID, loading, and error handling
- Restoration of previously authorized accounts without opening MetaMask
- Account and network change handling
- Persistent light and dark modes
- Express REST API for reading the supplied Solidity contracts
- Unsigned transaction preparation for `RealEstate.mint(string)`
- Responsive property pages and a Three.js property viewer

The repository includes Solidity source code, but it does not include deployed
contract addresses or a live RPC service. Contract-read endpoints require the
contracts to be deployed and the blockchain environment variables to reference
that deployment. The API never stores a private key or submits transactions.

## Technology

- React 18 and React Router
- Tailwind CSS
- ethers v5
- Express
- Solidity
- Three.js and React Three Fiber

## Architecture

### Frontend

- `src/context/WalletContext.jsx` owns wallet connection state and MetaMask events.
- `src/context/ThemeContext.jsx` owns the selected theme and localStorage persistence.
- `src/components/layout` contains shared navigation and footer components.
- `src/pages` contains route-level application views.

### Blockchain API

- `server/routes/blockchainRoute.js` defines blockchain HTTP routes.
- `server/controllers/blockchainController.js` formats API responses and errors.
- `server/services/blockchainService.js` validates input, reads contracts, and
  prepares transaction data.
- `server/blockchain/abis.js` contains the minimal ABIs derived from the supplied
  contracts.
- `server/config/blockchain.js` validates RPC and contract configuration.

The API returns successful responses in this form:

```json
{
  "success": true,
  "data": {}
}
```

Errors use a consistent structure:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Description of the problem"
  }
}
```

Blockchain integers are returned as decimal strings to avoid JavaScript number
precision loss.

## Setup

### Prerequisites

- Node.js 18 or newer
- npm
- MetaMask for wallet connection
- An Ethereum-compatible RPC endpoint and deployed contracts for live contract reads

### Install

```bash
git clone https://github.com/shikamaru128/rentverse-assessment.git
cd rentverse-assessment
npm install
```

### Environment

Create `.env` in the project root. The blockchain values are only required when
calling contract-dependent API endpoints.

```env
PORT=3099
NODE_ENV=development

BLOCKCHAIN_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
BLOCKCHAIN_CHAIN_ID=11155111
REAL_ESTATE_CONTRACT_ADDRESS=0x...
ESCROW_CONTRACT_ADDRESS=0x...
```

The RPC URL must be a real HTTP or HTTPS JSON-RPC endpoint. Placeholder URLs are
rejected. The contract addresses must be valid addresses for contracts deployed
on `BLOCKCHAIN_CHAIN_ID`.

Other optional backend variables are listed in
`server/config/config.env.example`.

### Run

```bash
npm start
```

This starts the React development server and Express server together:

- Frontend: `http://localhost:3000`
- API: `http://localhost:3099` unless `PORT` is overridden

Create a production frontend build with:

```bash
npm run build
```

## Wallet Flow

The wallet context uses `window.ethereum` and ethers v5. An explicit connection
calls `eth_requestAccounts`. On startup, `eth_accounts` restores an account only
when the user previously authorized the site, so MetaMask is not opened
automatically.

The context listens for `accountsChanged` and `chainChanged`, and all wallet
buttons consume the same shared state. No private key or seed phrase is handled
by the application.

## Theme

The interface uses one shared React theme state and the `rentverse-theme`
localStorage key. Light mode is the default. Dark mode applies a class to the
document root, allowing the existing Tailwind-based interface to switch themes
without changing application behavior.

## Blockchain API

Base path: `/api/blockchain`

| Method | Endpoint | Operation |
| --- | --- | --- |
| `GET` | `/status` | Reports blockchain configuration; no RPC call |
| `GET` | `/real-estate/total-supply` | Calls `RealEstate.totalSupply()` |
| `GET` | `/real-estate/tokens/:tokenId` | Calls inherited ERC-721 `ownerOf()` and `tokenURI()` |
| `GET` | `/escrow/details` | Reads contract participants, NFT address, and balance |
| `GET` | `/escrow/listings/:tokenId` | Reads listing, price, escrow, buyer, and inspection state |
| `GET` | `/escrow/listings/:tokenId/approvals/:account` | Reads `approval(tokenId, account)` |
| `POST` | `/real-estate/mint/prepare` | Encodes unsigned calldata for `mint(string)` |

### Status

`GET /api/blockchain/status` reports which settings are configured. It does not
prove that the RPC endpoint or deployed contracts are reachable.

### Prepare Mint Transaction

Request:

```http
POST /api/blockchain/real-estate/mint/prepare
Content-Type: application/json
```

```json
{
  "tokenURI": "ipfs://property-metadata",
  "from": "0xOptionalWalletAddress"
}
```

The response contains `to`, `data`, `value`, and `chainId`. A frontend wallet
must review, sign, and submit the transaction. If successful,
`RealEstate.mint(string)` mints the NFT to `msg.sender`.

### Errors and Timeouts

- Missing or invalid configuration returns `503 BLOCKCHAIN_CONFIGURATION_ERROR`.
- Invalid request parameters return `400 VALIDATION_ERROR`.
- Unresponsive RPC requests return `504 BLOCKCHAIN_RPC_TIMEOUT` after five seconds.
- RPC and contract-call failures return structured `502` responses.

No endpoint fabricates blockchain data when contracts are not configured or
deployed.

## Smart Contracts

- `contracts/RealEstate.sol` is an ERC-721 URI-storage contract with `mint` and
  `totalSupply` functions.
- `contracts/Escrow.sol` manages property listings, earnest deposits,
  inspections, approvals, finalization, and cancellation.

Compilation and deployment tooling are not included in this repository. A live
integration therefore requires deploying these contracts separately and adding
their addresses to `.env`.
