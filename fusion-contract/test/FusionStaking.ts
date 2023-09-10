import {
    time,
    loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { FusionToken } from "../typechain-types";

describe("FusionStaking", function () {
    const maxTotalStake = 1_000_000;
    const maxUserStake = 500_001;
    const maxStakingDuration = time.duration.days(30);
    const rewardRateInPercentage = 10;

    /**
     * Fixture for deploying the FusionStaking contract with common configurations.
     */
    async function deployFusionStaking() {
        const [owner, account1, account2] = await ethers.getSigners();

        const FusionToken = await ethers.getContractFactory("FusionToken");
        const fusionTokenContract = await FusionToken.deploy();

        await fusionTokenContract.mint(owner.address, 501_000)
        await fusionTokenContract.mint(account1.address, 501_000)
        await fusionTokenContract.mint(account2.address, 501_000)

        const FusionStaking =  await ethers.getContractFactory("FusionStaking");
        const fusionStakingContract = await FusionStaking.deploy(
            fusionTokenContract.target,
            maxTotalStake,
            maxUserStake,
            maxStakingDuration,
            rewardRateInPercentage
        );

        await fusionTokenContract.connect(account1).approve(fusionStakingContract.target, 501_000)
        await fusionTokenContract.connect(owner).approve(fusionStakingContract.target, 100_000)

        return { fusionStakingContract, owner, account1, account2, maxUserStake, fusionTokenContract }
    }

    /**
     * Fixture for deploying the FusionStaking contract with mock of ERC-20's transferFrom
     */
    async function deployWithTransferFromMock() {
        const [owner] = await ethers.getSigners();

        const MockToken =  await ethers.getContractFactory("MockTransferFromToken");
        const mockTokenContract = (await MockToken.deploy()) as FusionToken;

        await mockTokenContract.mint(owner.address, 501_000)

        const FusionStaking =  await ethers.getContractFactory("FusionStaking");
        const fusionStakingContract = await FusionStaking.deploy(
            mockTokenContract.target,
            maxTotalStake,
            maxUserStake,
            maxStakingDuration,
            rewardRateInPercentage
        );

        await mockTokenContract.connect(owner).approve(fusionStakingContract.target, 501_000)

        return { fusionStakingContract, owner, mockTokenContract }
    }

    /**
     * Fixture for deploying the FusionStaking contract with mock of ERC-20's transfer
     * Note: Two separete mock ERC20's are required due to the fact that transferFrom needs to succeed,
     * in order to stake. Stake is needed in order to test unstake.
     */
    async function deployWithTransferTokenMock() {
        const [owner] = await ethers.getSigners();

        const MockToken =  await ethers.getContractFactory("MockTransferToken");
        const mockTokenContract = (await MockToken.deploy()) as FusionToken;

        await mockTokenContract.mint(owner.address, 501_000)

        const FusionStaking =  await ethers.getContractFactory("FusionStaking");
        const fusionStakingContract = await FusionStaking.deploy(
            mockTokenContract.target,
            maxTotalStake,
            maxUserStake,
            maxStakingDuration,
            rewardRateInPercentage
        );

        await mockTokenContract.connect(owner).approve(fusionStakingContract.target, 501_000)

        return { fusionStakingContract, owner, mockTokenContract }
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

        it("Should revert when contract limit is exceeded", async function () {
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
            await fusionStakingContract.connect(owner).depositYield(50_000)
            await fusionStakingContract.connect(account2).unstake(nftId)

            const stakeTx = fusionStakingContract.connect(account2).stakeTokens(500_000)

            await expect(stakeTx).to.be.revertedWithCustomError(fusionStakingContract, "UserAlreadyWithdrawn")
        })

        it("Should revert when token transfer fails", async function () {
            const { fusionStakingContract, owner } = await loadFixture(deployWithTransferFromMock)
            const stakeTx = fusionStakingContract.connect(owner).stakeTokens(500_000)
            await expect(stakeTx).to.be.revertedWithCustomError(fusionStakingContract, "StakeFailed")

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

        it("Should revert when token transfer fails", async function () {
            const { fusionStakingContract, owner } = await loadFixture(deployWithTransferTokenMock)
            const nftId = Number(await fusionStakingContract.tokenIdCounter());

            await fusionStakingContract.connect(owner).stakeTokens(50_000)
            await fusionStakingContract.connect(owner).depositYield(50_000)
            await time.increase(time.duration.days(30))
            const stakeTx = fusionStakingContract.connect(owner).unstake(nftId)

            await expect(stakeTx).to.be.revertedWith("Unstake failed")
        })
    })

    describe("DepositYield", function () {
        it("Should revert when NOT owner tries to deposit yield", async function () {
            const { fusionStakingContract, account1 } = await loadFixture(deployFusionStaking)
            const stakeTx = fusionStakingContract.connect(account1).depositYield(50_000)

            await expect(stakeTx).to.be.reverted
        })

        it("Should revert when owner tries to deposit 0 yield", async function () {
            const { fusionStakingContract, owner } = await loadFixture(deployFusionStaking)
            const stakeTx = fusionStakingContract.connect(owner).depositYield(0)

            await expect(stakeTx).to.be.revertedWithCustomError(fusionStakingContract, "AmountMustBeGreaterThanZero")
        })

        it("Should revert when owner desn't have enought allowance", async function () {
            const { fusionStakingContract, owner } = await loadFixture(deployFusionStaking)
            const stakeTx = fusionStakingContract.connect(owner).depositYield(500_000)

            await expect(stakeTx).to.be.revertedWith("ERC20: insufficient allowance")
        })

        it("Should revert whentransferFrom fails", async function () {
            const { fusionStakingContract, owner } = await loadFixture(deployWithTransferFromMock)
            const stakeTx = fusionStakingContract.connect(owner).depositYield(50_000)

            await expect(stakeTx).to.be.revertedWithCustomError(fusionStakingContract, "NoAllowance")
        })
    })
})