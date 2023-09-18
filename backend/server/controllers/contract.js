const contractService = require('../services/contractService');
const ethers = require('ethers');

exports.getContractInfo = async (req, res) => {
    const contractAddress = req.params.address;
    const { userAddress, property } = req.query;

    try {
        if (!ethers.isAddress(contractAddress)) {
            return res.status(400).json({ error: 'Invalid contract address' });
        }
        const result = await contractService.getContractData(contractAddress, userAddress, property);

        res.json(result)
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};
