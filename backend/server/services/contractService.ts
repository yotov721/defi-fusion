import { Contract, ethers, Wallet } from 'ethers';
import fusionStaking from '../../abi/FusionStaking.json';

const provider = new ethers.InfuraProvider('sepolia', process.env.INFURA_KEY);
const wallet = new Wallet(process.env.PRIVATE_KEY, provider);

let fusionStakingContract: Contract | null = null;

function createContract(contractAddress: string): void {
    fusionStakingContract = new ethers.Contract(contractAddress, fusionStaking.abi, wallet);
}

async function getContractData(contractAddress: string, userAddress: string | undefined, property: string | undefined): Promise<any> {
    let contractData: any = {};

    try {
        if (fusionStakingContract === null) {
            createContract(contractAddress);
        }

        if (userAddress && property === 'userData') {
            contractData['userData'] = await getUserDataFromContract(userAddress);
        } else if (userAddress && typeof property === 'undefined') {
            contractData['userData'] = await getUserDataFromContract(userAddress);
            contractData['properties'] = await getAllProperties();
        } else if (property) {
            contractData['properties'] = await getPropertyFromContract(property);
        } else {
            contractData['properties'] = await getAllProperties();
        }
    } catch (error) {
        throw error;
    }

    return contractData;
}

async function getUserDataFromContract(userAddress: string): Promise<any> {
    const nftOwnedCount: number = await fusionStakingContract.balanceOf(userAddress);

    if (nftOwnedCount === 0) {
        throw new Error(`Address: ${userAddress} does not own any stakes in the contract`);
    }

    const nftIds: number[] = [];
    const userData: any = {};

    try {
        const promises: Promise<number>[] = [];
        for (let i = 0; i < nftOwnedCount; i++) {
            promises.push(fusionStakingContract.tokenOfOwnerByIndex(userAddress, i));
        }

        const results: number[] = await Promise.all(promises);
        nftIds.push(...results);

        for (const nftId of nftIds) {
            const stakedBalanceData: any = await fusionStakingContract.stakedBalances(nftId);

            const startTimestampInSeconds: number = Number(stakedBalanceData.startTimestamp);
            const startDatetime: string = new Date(startTimestampInSeconds * 1000).toLocaleString();

            userData[nftId] = {
                stakedAmountInWei: Number(stakedBalanceData.amount),
                stakedAmountInEth: ethers.formatEther(stakedBalanceData.amount),
                startTimestamp: startTimestampInSeconds,
                startDatetime: startDatetime,
            };
        }
    } catch (error) {
        console.error(error);
    }

    return userData;
}

async function getPropertyFromContract(property: string): Promise<any> {
    let result: any;

    try {
        result = await fusionStakingContract[property]();
    } catch (error) {
        throw new Error(`Property ${property} not found in contract`);
    }

    return { [property]: Number(result) };
}

async function getAllProperties(): Promise<any> {
    const propertyNames: string[] = [
        'maxTotalStake',
        'maxUserStake',
        'totalYield',
        'totalStaked',
        'totalStakers',
        'rewardRateInPercentage',
        'maxStakingDuration',
    ];

    const values: number[] = await Promise.all(
        propertyNames.map(async (propertyName: string) => {
            const value = await fusionStakingContract[propertyName]();
            return Number(value);
        })
    );

    const properties: any = Object.fromEntries(
        propertyNames.map((propertyName: string, index: number) => [propertyName, values[index]])
    );

    properties.maxStakingDurationInDays = properties.maxStakingDuration / 86400;
    properties.maxTotalStakeInEth = ethers.formatEther(properties.maxTotalStake);
    properties.maxUserStakeInEth = ethers.formatEther(properties.maxUserStake);

    return properties;
}

export default {
    getContractData,
};
