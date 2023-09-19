const tokenService = require('../services/tokenService');
const ethers = require('ethers');

exports.getTokenInfo = async (req, res) => {
    const tokenAddress = req.params.address;

    try {
        if (!ethers.isAddress(tokenAddress)) {
            return res.status(400).json({ error: 'Invalid token address' });
        }

        const tokenInfo = await tokenService.getTokenInfo(tokenAddress);

        res.json(tokenInfo);
    } catch (error) {
        if (process.env.DEBUG_MODE === 'true') {
          console.error(error);
        }
        res.status(500).json({ error: error.message });
    }
};