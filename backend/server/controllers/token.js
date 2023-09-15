const ethereumService = require('../services/etheremService');
const ethers = require('ethers');

exports.getTokenInfo = async (req, res) => {
  try {
    const tokenAddress = req.params.address;

    if (!ethers.isAddress(tokenAddress)) {
        return res.status(400).json({ error: 'Invalid token address' });
    }

    const tokenInfo = await ethereumService.getTokenInfo(tokenAddress);

    res.json(tokenInfo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};