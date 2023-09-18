const { ethers } = require("ethers");
const FusionStaking = require("../artifacts/contracts/FusionStaking.sol/FusionStaking.json");
const FusionToken = require("../artifacts/contracts/FusionToken.sol/FusionToken.json");

const dotenv = require("dotenv");
dotenv.config();

const run = async function () {
    const provider = new ethers.InfuraProvider("sepolia", process.env.INFURA_KEY)

    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    const tokenContractAddress = "0xa62C2D95D567F47d8A168Ad92e9bDF79fC557193"
    const ownerFusionToken = new ethers.Contract(tokenContractAddress, FusionToken.abi, wallet);

    const stakingContractAddress = "0x848186D33fEF848f0e965300dD8E1B58D60E96dB";
    const ownerFusionStaking = new ethers.Contract(stakingContractAddress, FusionStaking.abi, wallet);

    const permitDeadline = Math.floor(Date.now() / 1000) + 3600;
    const permitAmount = 500_000;

    const nonce = (await ownerFusionToken.nonces(wallet.address));
    const domain = {
        name: await ownerFusionToken.name(),
        version: '1',
        verifyingContract: ownerFusionToken.target
    };

    const message = {
        owner: wallet.address,
        spender: ownerFusionStaking.target,
        value: permitAmount,
        nonce: nonce.toString(16),
        deadline: permitDeadline.toString()
    };

    const types = {
        Permit: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' }
        ]
    };

    const signatureLike = await wallet.signTypedData(domain, types, message);
    const signature = ethers.Signature.from(signatureLike);

    try {
        const mintTx = await ownerFusionToken.mint(wallet.address, 1_000_000);

        // Wait for the transaction to be mined and get the receipt
        const receipt = await mintTx.wait();

        // Check if the transaction was successful
        if (receipt.status === 1) {
            console.log("Minting was successful!");
        } else {
            console.error("Minting failed.");
        }
    } catch (error) {
        console.error("Error minting tokens:", error);
    }

    try {
        const stakeTx = await ownerFusionStaking.stakeTokens(permitAmount, permitDeadline, signature.v, signature.r, signature.s);

        // Wait for the transaction to be mined and get the receipt
        const receipt = await stakeTx.wait();

        // Check if the transaction was successful
        if (receipt.status === 1) {
            console.log("Staking was successful");
        } else {
            console.error("Staking failed.");
        }
    } catch (error) {
        console.error("Error staking tokens:", error);
    }
}
// node ./scripts/interact-sepolia.js
run()