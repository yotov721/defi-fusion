import { ethers, network, run } from "hardhat";

async function main() {
    const fusionNFT = await ethers.deployContract("FusionToken");
    const deploymentTx1 = await fusionNFT.deploymentTransaction()
    await fusionNFT.waitForDeployment();

    console.log(`FusionNFT contract deployed to ${fusionNFT.target}`);

    const constructorArgs = [
        fusionNFT.target,
        1000000, // maxTotalStake
        1000,    // maxUserStake
        30,      // maxStakingDuration (in seconds)
        5       // rewardRateInPercentage
    ];

    const fusionStaking = await ethers.deployContract("FusionStaking", constructorArgs)
    const deploymentTx = await fusionStaking.deploymentTransaction()
    await fusionStaking.waitForDeployment()

    console.log(`FusionStaking contract deployed to ${fusionStaking.target}`)

    if (network.name == "sepolia") {
        await deploymentTx?.wait(5);
        await deploymentTx1?.wait(5);

        try {
            await run("verify:verify", {
                address: fusionNFT.target,
                constructorArguments: [],
            });
            console.log("FusionToken contract verified on Etherscan");

            await run("verify:verify", {
                address: fusionStaking.target,
                constructorArguments: constructorArgs,
            });
            console.log("FusionStaking contract verified on Etherscan");
        } catch (e) {
            if (e.message.toLowerCase().includes("already verified")) {
                console.log("Both contracts are already verified on Etherscan!");
            } else {
                console.error("Error verifying contract:", e);
            }
        }
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
