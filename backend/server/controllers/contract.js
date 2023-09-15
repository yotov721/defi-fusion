const ethers = require('ethers');

exports.getContractInfo = async (req, res) => {
    try {
        const contractAddress = req.params.address;

        if (!ethers.isAddress(contractAddress)) {
            return res.status(400).json({ error: 'Invalid contract address' });
        }

        const property = req.query.property
        if(property && stakingContract.interface.hasFunction(property)) {

        }
        // todo
        const userAddress = req.query.userAddress
        if (!ethers.isAddress(userAddress)) {
            return res.status(400).json({ error: 'Invalid user address' });
        }

        const contractInfo = {
            address: contractAddress,
            // Add more properties as needed
        };

        res.json(contractInfo);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
