const ethers = require('ethers');
const fusionStaking = require('../../abi/FusionStaking.json');

const provider = new ethers.InfuraProvider('sepolia', process.env.INFURA_KEY);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

let fusionStakingContract = null;

function createContract(contractAddress) {
    fusionStakingContract = new ethers.Contract(contractAddress, fusionStaking.abi, wallet);
}

async function getContractData(contractAddress, userAddress, property) {
    let contractData = {};

    try {
        if (fusionStakingContract === null) {
            createContract(contractAddress)
        }

        if (userAddress && property === 'userData') {
            contractData['userData'] = await getUserDataFromContract(userAddress);
        } else if (userAddress && typeof property === 'undefined') {
            contractData['userData'] = await getUserDataFromContract(userAddress);
            contractData['properties'] = await getAllProperties();
        } else if (property) {
            contractData['properties'] = await getPropertyFromContract(property);
        } else {
            contractData['properties'] = await getAllProperties()
        }
    } catch (error) {
        throw error;
    }

    return contractData;
}

async function getUserDataFromContract(userAddress) {
    // Get NFTs owned by the address. An address can stake only once, but can buy other stakers's NFTs
    const nftOwnedCount = await fusionStakingContract.balanceOf(userAddress)
    if (nftOwnedCount == 0) {
        throw new Error(`Address: ${userAddress} does not own any stakes in the contract`);
    }

    const nftIds = [];
    const userData = {};

    try {
        const promises = [];
        for (let i = 0; i < nftOwnedCount; i++) {
            promises.push(fusionStakingContract.tokenOfOwnerByIndex(userAddress, i));
        }

        const results = await Promise.all(promises);
        nftIds.push(...results);

        // Fetch stakedBalances for each nftId and populate userData
        for (const nftId of nftIds) {
            const stakedBalanceData = await fusionStakingContract.stakedBalances(nftId);

            const startTimestampInSeconds = Number(stakedBalanceData.startTimestamp);
            const startDatetime = new Date(startTimestampInSeconds * 1000).toLocaleString();

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

async function getPropertyFromContract(property) {
    let result
    try {
        result = await fusionStakingContract[property]()
    } catch (error) {
        throw new Error(`Property ${property} not found in contract`)
    }

    return { [property]: Number(result) };
}

async function getAllProperties() {
    const propertyNames = [
        'maxTotalStake',
        'maxUserStake',
        'totalYield',
        'totalStaked',
        'totalStakers',
        'rewardRateInPercentage',
        'maxStakingDuration',
    ];

    const values = await Promise.all(
        propertyNames.map(async (propertyName) => {
            const value = await fusionStakingContract[propertyName]();
            return Number(value);
        })
    );

    const properties = Object.fromEntries(
        propertyNames.map((propertyName, index) => [propertyName, values[index]])
    );

    properties.maxStakingDurationInDays = properties.maxStakingDuration / 86400;
    properties.maxTotalStakeInEth = ethers.formatEther(properties.maxTotalStake)
    properties.maxUserStakeInEth = ethers.formatEther(properties.maxUserStake)

    return properties;
}

module.exports = {
    getContractData,
};
