import { Request, Response } from 'express';
import tokenService from '../services/tokenService';
import { ethers } from 'ethers';

export const getTokenInfo = async (req: Request, res: Response): Promise<void> => {
    const tokenAddress: string = req.params.address as string;

    try {
        if (!ethers.isAddress(tokenAddress)) {
            res.status(400).json({ error: 'Invalid token address' });
            return
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
