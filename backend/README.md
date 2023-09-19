# Fusion-backend

Welcome to the Fusion backend project! This project contains backend REST API that interacts with the Fusion contracts.


## Project Structure

- `abi/`: Contains ABIs used to interact with the smart contracts.
- `server/`: The backend ExpressJS application.
- `tests/`: Contains unit tests for the API.
- `server.js`: Project entrypoint.


## Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/my-hardhat-project.git
   cd backend
   ```
1. **Add env variables:**<br>
    Rename `.env.example` to `.env` and populate environment variables.<br>Note: This is only required if sending requests to sepolia or other network
1. **Install Dependencies:**
    ```bash
    npm install
    ```

## Testing

1. **Run tests:**
    ```bash
    npm test
    ```

## Endpoint examples:
Assuming the server is run on port 3000:

GET token data:<br>
http://localhost:3000/token/0xfC089A418902af9C3553E024f013609Bb3C3EAdB

GET user data for given address:<br>
http://localhost:3000/contract/0x848186D33fEF848f0e965300dD8E1B58D60E96dB?userAddress=0xDfEDD116e09aB9a877b08e0E348B6299289643cd&property=userData

GET contract properties and user data for given address:<br>
http://localhost:3000/contract/0x848186D33fEF848f0e965300dD8E1B58D60E96dB?userAddress=0xDfEDD116e09aB9a877b08e0E348B6299289643cd

GET single contract property:<br>
http://localhost:3000/contract/0x848186D33fEF848f0e965300dD8E1B58D60E96dB?property=maxUserStake

GET all contract properties:<br>
http://localhost:3000/contract/0x848186D33fEF848f0e965300dD8E1B58D60E96dB
