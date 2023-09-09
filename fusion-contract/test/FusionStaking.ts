import {
    time,
    loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("FusionStaking", function () {
    async function deployFusionStaking() {
        const [owner, account1, account2] = await ethers.getSigners();

        const FusionToken =  await ethers.getContractFactory("FusionToken");
        const fusionTokenContract = await FusionToken.deploy();

        await fusionTokenContract.mint(owner.address, 501_000)
        await fusionTokenContract.mint(account1.address, 501_000)
        await fusionTokenContract.mint(account2.address, 501_000)

        const maxTotalStake = 1_000_000;
        const maxUserStake = 500_001;
        const maxStakingDuration = time.duration.days(30);
        const rewardRateInPercentage = 10;

        const FusionStaking =  await ethers.getContractFactory("FusionStaking");
        const fusionStakingContract = await FusionStaking.deploy(
            fusionTokenContract.target,
            maxTotalStake,
            maxUserStake,
            maxStakingDuration,
            rewardRateInPercentage
        );

        await fusionTokenContract.connect(account1).approve(fusionStakingContract.target, 501_000)
        await fusionTokenContract.connect(owner).approve(fusionStakingContract.target, 501_000)

        return { fusionStakingContract, owner, account1, account2, maxUserStake, fusionTokenContract }
    }

    describe("StakeTokens", function () {
        it("Should revert when user has NOT given allowance to contract", async function () {
            const { fusionStakingContract, account2 } = await loadFixture(deployFusionStaking)

            const stakeTx = fusionStakingContract.connect(account2).stakeTokens(500_000)

            await expect(stakeTx).to.be.revertedWithCustomError(fusionStakingContract, "NoAllowance")
        })

        it("Should revert when user tries to stake 0 tokens", async function () {
            const { fusionStakingContract, account1 } = await loadFixture(deployFusionStaking)

            const stakeTx = fusionStakingContract.connect(account1).stakeTokens(0)

            await expect(stakeTx).to.be.revertedWithCustomError(fusionStakingContract, "AmountMustBeGreaterThanZero")
        })


        it("Should revert when user tries to stake more than the limit per user", async function () {
            const { fusionStakingContract, account1, maxUserStake } = await loadFixture(deployFusionStaking)

            const stakeTx = fusionStakingContract.connect(account1).stakeTokens(maxUserStake + 1)

            await expect(stakeTx).to.be.revertedWithCustomError(fusionStakingContract, "AmountExceedsUserStakeLimit")
        })

        it("Should revert when user tries to stake more than the limit per contract", async function () {
            const { fusionStakingContract, account1, account2, maxUserStake, fusionTokenContract } = await loadFixture(deployFusionStaking)

            await fusionStakingContract.connect(account1).stakeTokens(maxUserStake)

            await fusionTokenContract.connect(account2).approve(fusionStakingContract.target, 501_000)
            const stakeTx = fusionStakingContract.connect(account2).stakeTokens(maxUserStake)

            await expect(stakeTx).to.be.revertedWithCustomError(fusionStakingContract, "AmountExceedsTotalStakeLimit")
        })

        it("Should revert when user has already staked", async function () {
            const { fusionStakingContract, account1 } = await loadFixture(deployFusionStaking)

            await fusionStakingContract.connect(account1).stakeTokens(500_000)
            const stakeTx = fusionStakingContract.connect(account1).stakeTokens(500_000)

            await expect(stakeTx).to.be.revertedWithCustomError(fusionStakingContract, "UserAlreadyStaked")
        })

        it("Should revert when user has already withdraw", async function () {
            const { fusionStakingContract, account1, account2, owner } = await loadFixture(deployFusionStaking)

            const nftId = Number(await fusionStakingContract.tokenIdCounter());
            await fusionStakingContract.connect(account1).stakeTokens(500_000)

            await time.increase(time.duration.days(30) + 1)

            await fusionStakingContract.connect(account1).transferFrom(account1.address, account2.address, nftId)
            await fusionStakingContract.connect(owner).depositYield(500_000)
            await fusionStakingContract.connect(account2).unstake(nftId)

            const stakeTx = fusionStakingContract.connect(account2).stakeTokens(500_000)

            await expect(stakeTx).to.be.revertedWithCustomError(fusionStakingContract, "UserAlreadyWithdrawn")
        })
    })

    describe("Unstake", function () {
        it("Should revert when NFT does NOT exist", async function () {
            const { fusionStakingContract, account1 } = await loadFixture(deployFusionStaking)

            const stakeTx = fusionStakingContract.connect(account1).unstake(1234)

            await expect(stakeTx).to.be.revertedWithCustomError(fusionStakingContract, "TokenDoesNotExist")
        })

        it("Should revert when user is NOT the owner of the NFT", async function () {
            const { fusionStakingContract, account1, account2 } = await loadFixture(deployFusionStaking)

            const nftId = Number(await fusionStakingContract.tokenIdCounter());
            await fusionStakingContract.connect(account1).stakeTokens(500_000)
            const stakeTx = fusionStakingContract.connect(account2).unstake(nftId)

            await expect(stakeTx).to.be.revertedWithCustomError(fusionStakingContract, "NotTokenOwner")
        })

        it("Should revert when there is no yield left", async function () {
            const { fusionStakingContract, account1 } = await loadFixture(deployFusionStaking)
            const nftId = Number(await fusionStakingContract.tokenIdCounter());

            await fusionStakingContract.connect(account1).stakeTokens(500_000)
            await time.increase(time.duration.days(30))
            const stakeTx = fusionStakingContract.connect(account1).unstake(nftId)

            await expect(stakeTx).to.be.revertedWithCustomError(fusionStakingContract, "NoYieldLeft")
        })

        it("Should return tokens to user when staking duration is less than a day", async function () {
            const { fusionStakingContract, account1, owner, fusionTokenContract } = await loadFixture(deployFusionStaking)
            const nftId = Number(await fusionStakingContract.tokenIdCounter());
            await fusionStakingContract.connect(owner).depositYield(50_000)

            await fusionStakingContract.connect(account1).stakeTokens(500_000)
            await time.increase(time.duration.days(0.5))

            const userBalanceBefore = await fusionTokenContract.balanceOf(account1.address);

            await fusionStakingContract.connect(account1).unstake(nftId)

            const userBalanceAfter = await fusionTokenContract.balanceOf(account1.address);

            expect(userBalanceAfter).to.be.gt(userBalanceBefore);
            expect(fusionStakingContract.ownerOf(nftId)).to.be.reverted
        })
    })

    describe("DepositYield", function () {})
})