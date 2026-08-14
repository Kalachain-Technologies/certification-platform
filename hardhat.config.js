require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/**
 * Networks:
 *  - hardhat: in-memory local chain used for this prototype (no keys needed).
 *  - amoy: Polygon's public testnet, wired up and ready for real deployment.
 *          Set POLYGON_AMOY_RPC_URL and DEPLOYER_PRIVATE_KEY in a .env file
 *          (see .env.example) to deploy there instead of locally.
 *  - polygon: Polygon mainnet (chainId 137). Set POLYGON_MAINNET_RPC_URL and
 *          DEPLOYER_PRIVATE_KEY in .env to deploy here. This uses REAL funds.
 */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      evmVersion: "cancun",
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhat: {},
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    amoy: {
      url: process.env.POLYGON_AMOY_RPC_URL || "https://rpc-amoy.polygon.technology",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId: 80002,
    },
    polygon: {
      url: process.env.POLYGON_MAINNET_RPC_URL || "https://polygon-rpc.com",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId: 137,
    },
  },
};