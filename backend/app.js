const express = require('express');
const ethers = require('ethers');
const dotenv = require("dotenv");
const app = express();
const port = process.env.PORT || 3000;
dotenv.config();

const erc20Abi = require("./abi/ERC20abi.json");

// http://localhost:3000/token/0x53844F9577C2334e541Aec7Df7174ECe5dF1fCf0 -> dai token on sepolia
// http://localhost:3000/token/0xfC089A418902af9C3553E024f013609Bb3C3EAdB -> fusion token
app.get('/token/:address', async (req, res) => {
    try {
      const tokenAddress = req.params.address;

      // Validate the address format
      if (!ethers.isAddress(tokenAddress)) {
        return res.status(400).json({ error: 'Invalid token address' });
      }

      const provider = new ethers.InfuraProvider("sepolia", process.env.INFURA_KEY)
      const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

      const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, wallet);

      const [name, symbol, decimalsBig] = await Promise.all([
        tokenContract.name(),
        tokenContract.symbol(),
        tokenContract.decimals(),
      ]);
      const decimals = Number(decimalsBig);

      res.json({ name, symbol, decimals });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

app.get('/api/hello', (req, res) => {
    res.json({ message: 'Hello, world!' });
});
