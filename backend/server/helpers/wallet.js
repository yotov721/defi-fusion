const ethers = require('ethers');

const provider = new ethers.InfuraProvider('sepolia', process.env.INFURA_KEY);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

module.exports = {
    wallet,
};
