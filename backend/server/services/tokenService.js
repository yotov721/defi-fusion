const ethers = require('ethers');
const erc20Abi = require('../../abi/ERC20abi.json');

const provider = new ethers.InfuraProvider('sepolia', process.env.INFURA_KEY);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

async function getTokenInfo(tokenAddress) {
  try {
    const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, wallet);

    const [name, symbol, decimalsBig] = await Promise.all([
      tokenContract.name(),
      tokenContract.symbol(),
      tokenContract.decimals(),
    ]);
    const decimals = Number(decimalsBig);

    return { name, symbol, decimals };
  } catch (error) {
    console.error('Ethereum Service Error:', error);
    throw error;
  }
}


module.exports = {
  getTokenInfo,
};
