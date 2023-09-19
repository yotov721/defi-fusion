import { Contract, ethers, Wallet } from 'ethers';
import erc20Abi from '../../abi/ERC20abi.json';

const provider = new ethers.InfuraProvider('sepolia', process.env.INFURA_KEY);
const wallet = new Wallet(process.env.PRIVATE_KEY, provider);

async function getTokenInfo(tokenAddress: string) {
  try {
    const tokenContract = new Contract(tokenAddress, erc20Abi, wallet);

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

export default {
  getTokenInfo,
};
