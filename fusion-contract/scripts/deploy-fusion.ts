import { ethers, network, run } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

async function main() {
    const fusionToken = await ethers.deployContract("FusionToken");
    const fusionTokenDeploymentTx = await fusionToken.deploymentTransaction()
    await fusionToken.waitForDeployment();

    console.log(`FusionToken contract deployed to ${fusionToken.target}`);

    const constructorArgs = [
        fusionToken.target,
        1_000_000,                   // maxTotalStake
        500_000,                     // maxUserStake
        time.duration.days(30),      // maxStakingDuration (in seconds)
        10                           // rewardRateInPercentage
    ];

    const fusionStaking = await ethers.deployContract("FusionStaking", constructorArgs)
    const fusionStakingDeploymentTx = await fusionStaking.deploymentTransaction()
    await fusionStaking.waitForDeployment()

    console.log(`FusionStaking contract deployed to ${fusionStaking.target}`)

    if (network.name == "sepolia") {
        await fusionStakingDeploymentTx?.wait(5);
        await fusionTokenDeploymentTx?.wait(5);

        try {
            await run("verify:verify", {
                address: fusionToken.target,
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
