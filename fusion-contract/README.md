# Fusion-contract

Welcome to the Fusin contract Project! This repository contains a basic setup for an Ethereum smart contract development project using [Hardhat](https://hardhat.org/).

## Project Structure

- `contracts/`: Contains your Ethereum smart contracts written in Solidity.
- `scripts/`: Contains deployment scripts.
- `test/`: Contains unit tests.
- `hardhat.config.js`: Configuration file for Hardhat.

## Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/my-hardhat-project.git
   cd fusion-contract
   ```
1. **Add env variables:**<br>
    Rename `.env.example` to `.env` and populate environment variables.<br>Note: This is only required if sending requests to sepolia or other network
1. **Install Dependencies:**
    ```bash
    npm install
    ```
1. **Compile contracts:**
    ```bash
    npx hardhat compile
    ```
## Testing

1. **Run tests:**
    ```bash
    npx hardhat coverage
    ```
1. **Run slither:** <br>
    ```bash
    // Install slither
    pip3 install slither-analyzer
    // Get slither location to add to path environment variables
    pip3 show slither-analyzer
    ```
    ```bash
    cd fusion-contract
    slither . --checklist > checklist_report.md
    ```
## Deployment
1. **Deploy:**
    ```bash
    npx hardhat deploy --netowrk <network> .\scripts\deploy-fusion.ts
    ```

    If network specified is `sepolia` the contracts are also verified<br>
