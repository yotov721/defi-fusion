import { Request, Response } from 'express';
import contractService from '../services/contractService';
import { ethers } from 'ethers';

export const getContractInfo = async (req: Request, res: Response): Promise<void> => {
    const contractAddress: string = req.params.address as string;
    const { userAddress, property }: { userAddress?: string; property?: string } = req.query as {
        userAddress?: string;
        property?: string;
    };

    try {
        if (!ethers.isAddress(contractAddress)) {
            res.status(400).json({ error: 'Invalid contract address' });
            return
        }

        if (userAddress !== undefined && !ethers.isAddress(userAddress)) {
            res.status(400).json({ error: 'Invalid user address' });
            return
        }

        const result = await contractService.getContractData(contractAddress, userAddress, property);

        res.json(result);
    } catch (error) {
        if (process.env.DEBUG_MODE === 'true') {
            console.error(error);
        }
        res.status(500).json({ error: error.message });
    }
};

export default {
    getContractInfo
}