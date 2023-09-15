import {
    time,
    loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { FusionToken, FusionStaking, MockTransferToken } from "../typechain-types";

describe("FusionStaking", function () {
    const maxTotalStake = 1_000_000;
    const maxUserStake = 500_001;
    const maxStakingDuration = time.duration.days(30);
    const rewardRateInPercentage = 10;

    // 1 hour permit deadline
    const permitDeadline = Math.floor(Date.now() / 1000) + 3600;
    const permitAmount = 500_001
    const account1PrivateKey = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
    const ownerPrivateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

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

        const FusionStaking = await ethers.getContractFactory("FusionStaking");
        const fusionStakingContract = await FusionStaking.deploy(
            fusionTokenContract.target,
            maxTotalStake,
            maxUserStake,
            maxStakingDuration,
            rewardRateInPercentage
        );

        const ownerSignature = await generatePermitSignature(
            fusionTokenContract,
            fusionStakingContract,
            permitAmount,
            ownerPrivateKey
        );

        const account1Signature = await generatePermitSignature(
            fusionTokenContract,
            fusionStakingContract,
            permitAmount,
            account1PrivateKey
        );

        return { fusionStakingContract, owner, account1, account2, maxUserStake, fusionTokenContract, permitAmount, ownerSignature, account1Signature }
    }

    /**
     * Fixture for deploying the FusionStaking contract with mock of ERC-20's transferFrom
     */
    async function deployWithTransferFromMock() {
        const [owner] = await ethers.getSigners();

        const MockToken = await ethers.getContractFactory("MockTransferFromToken");
        const mockTokenContract = (await MockToken.deploy()) as FusionToken;

        await mockTokenContract.mint(owner.address, 501_000)

        const FusionStaking = await ethers.getContractFactory("FusionStaking");
        const fusionStakingContract = await FusionStaking.deploy(
            mockTokenContract.target,
            maxTotalStake,
            maxUserStake,
            maxStakingDuration,
            rewardRateInPercentage
        );

        const ownerSignature = await generatePermitSignature(
            mockTokenContract,
            fusionStakingContract,
            permitAmount,
            ownerPrivateKey
        );

        return { fusionStakingContract, owner, mockTokenContract, ownerSignature }
    }

    /**
     * Fixture for deploying the FusionStaking contract with mock of ERC-20's transfer
     * Note: Two separete mock ERC20's are required due to the fact that transferFrom needs to succeed,
     * in order to stake. Stake is needed in order to test unstake.
     */
    async function deployWithTransferTokenMock() {
        const [owner, account1] = await ethers.getSigners();

        const MockToken = await ethers.getContractFactory("MockTransferToken");
        const mockTokenContract = (await MockToken.deploy()) as FusionToken;

        await mockTokenContract.mint(owner.address, 501_000)
        await mockTokenContract.mint(account1.address, 501_000)

        const FusionStaking = await ethers.getContractFactory("FusionStaking");
        const fusionStakingContract = await FusionStaking.deploy(
            mockTokenContract.target,
            maxTotalStake,
            maxUserStake,
            maxStakingDuration,
            rewardRateInPercentage
        );

        const ownerSignature = await generatePermitSignature(
            mockTokenContract,
            fusionStakingContract,
            permitAmount,
            ownerPrivateKey
        );

        const account1Signature = await generatePermitSignature(
            mockTokenContract,
            fusionStakingContract,
            permitAmount,
            account1PrivateKey
        );

        return { fusionStakingContract, mockTokenContract, owner, account1, ownerSignature, account1Signature }
    }

    /**
     * Generates a permit signature for a given Ethereum address using a private key and contract details.
     *
     * @returns {ethers.Signature} - The permit signature.
     */
    async function generatePermitSignature(
        fusionTokenContract: FusionToken,
        fusionStakingContract: FusionStaking,
        msgValue: number,
        accountPrivateKey: string
    ) {
        const wallet = new ethers.Wallet(accountPrivateKey);
        const nonce = (await fusionTokenContract.nonces(wallet.address));
        const domain = {
            name: await fusionTokenContract.name(),
            version: '1',
            verifyingContract: fusionTokenContract.target
        };

        const message = {
            owner: wallet.address,
            spender: fusionStakingContract.target,
            value: msgValue,
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

        return signature
    }

    describe("StakeTokens", function () {
        it("Should let user stake tokens to contract", async function () {
            const { fusionStakingContract, owner, fusionTokenContract, ownerSignature } = await loadFixture(deployFusionStaking)

            const totalStakersBefore = await fusionStakingContract.totalStakers()
            const counterBefore = await fusionStakingContract.tokenIdCounter()
            const balanceBefore = await fusionTokenContract.balanceOf(owner.address)

            const stakeTx = fusionStakingContract.connect(owner).stakeTokens(permitAmount, permitDeadline, ownerSignature.v, ownerSignature.r, ownerSignature.s)

            await expect(stakeTx).to.not.be.reverted
            const totalStakersAfter = await fusionStakingContract.totalStakers()
            const counterAfter = await fusionStakingContract.tokenIdCounter()
            const balanceAfter = await fusionTokenContract.balanceOf(owner.address)

            expect(Number(counterBefore) + 1).to.be.equals(counterAfter)
            expect(Number(balanceBefore) - permitAmount).to.be.equal(Number(balanceAfter))
            expect(Number(totalStakersBefore) + 1).to.be.equal(totalStakersAfter)
        })

        it("Should revert when user tries to stake 0 tokens", async function () {
            const { fusionStakingContract, owner, ownerSignature } = await loadFixture(deployFusionStaking)

            const stakeTx = fusionStakingContract.connect(owner).stakeTokens(0, permitDeadline, ownerSignature.v, ownerSignature.r, ownerSignature.s)

            await expect(stakeTx).to.be.revertedWithCustomError(fusionStakingContract, "AmountMustBeGreaterThanZero")
        })


        it("Should revert when user tries to stake more than the limit per user", async function () {
            const { fusionStakingContract, owner, maxUserStake, ownerSignature } = await loadFixture(deployFusionStaking)

            const permitAmount = maxUserStake + 1
            const stakeTx = fusionStakingContract.connect(owner).stakeTokens(permitAmount, permitDeadline, ownerSignature.v, ownerSignature.r, ownerSignature.s)

            await expect(stakeTx).to.be.revertedWithCustomError(fusionStakingContract, "AmountExceedsUserStakeLimit")
        })

        it("Should revert when contract limit is exceeded", async function () {
            const { fusionStakingContract, owner, fusionTokenContract, ownerSignature, account1, account1Signature } = await loadFixture(deployFusionStaking)

            await fusionStakingContract.connect(owner).stakeTokens(permitAmount, permitDeadline, ownerSignature.v, ownerSignature.r, ownerSignature.s)

            await fusionTokenContract.connect(owner).approve(fusionStakingContract.target, 501_000)
            const stakeTx = fusionStakingContract.connect(account1).stakeTokens(permitAmount, permitDeadline, account1Signature.v, account1Signature.r, account1Signature.s)

            await expect(stakeTx).to.be.revertedWithCustomError(fusionStakingContract, "AmountExceedsTotalStakeLimit")
        })

        it("Should revert when user has already staked", async function () {
            const { fusionStakingContract, owner, ownerSignature } = await loadFixture(deployFusionStaking)

            await fusionStakingContract.connect(owner).stakeTokens(permitAmount, permitDeadline, ownerSignature.v, ownerSignature.r, ownerSignature.s)
            const stakeTx = fusionStakingContract.connect(owner).stakeTokens(permitAmount, permitDeadline, ownerSignature.v, ownerSignature.r, ownerSignature.s)

            await expect(stakeTx).to.be.revertedWithCustomError(fusionStakingContract, "UserAlreadyStaked")
        })

        it("Should revert when user has already withdraw", async function () {
            const { fusionStakingContract, account1, owner, ownerSignature, account1Signature } = await loadFixture(deployFusionStaking)

            const nftId = Number(await fusionStakingContract.tokenIdCounter());
            await fusionStakingContract.connect(account1).stakeTokens(permitAmount, permitDeadline, account1Signature.v, account1Signature.r, account1Signature.s)

            await fusionStakingContract.connect(account1).transferFrom(account1.address, owner.address, nftId)
            await fusionStakingContract.connect(owner).depositYield(permitAmount, permitDeadline, ownerSignature.v, ownerSignature.r, ownerSignature.s)
            await fusionStakingContract.connect(owner).unstake(nftId)

            const stakeTx = fusionStakingContract.connect(owner).stakeTokens(permitAmount, permitDeadline, ownerSignature.v, ownerSignature.r, ownerSignature.s)

            await expect(stakeTx).to.be.revertedWithCustomError(fusionStakingContract, "UserAlreadyWithdrawn")
        })

        it("Should revert when token transfer fails", async function () {
            const { fusionStakingContract, owner, ownerSignature } = await loadFixture(deployWithTransferFromMock)
            const stakeTx = fusionStakingContract.connect(owner).stakeTokens(permitAmount, permitDeadline, ownerSignature.v, ownerSignature.r, ownerSignature.s)
            await expect(stakeTx).to.be.revertedWithCustomError(fusionStakingContract, "StakeFailed")

        })
    })

    describe("Unstake", function () {
        it("Should revert when token transfer fails", async function () {
            const { fusionStakingContract, owner, account1, account1Signature, ownerSignature } = await loadFixture(deployWithTransferTokenMock)
            const nftId = Number(await fusionStakingContract.tokenIdCounter());

            await fusionStakingContract.connect(owner).depositYield(permitAmount, permitDeadline, ownerSignature.v, ownerSignature.r, ownerSignature.s)
            await fusionStakingContract.connect(account1).stakeTokens(permitAmount, permitDeadline, account1Signature.v, account1Signature.r, account1Signature.s)

            const unstakeTx = fusionStakingContract.connect(account1).unstake(nftId)

            await expect(unstakeTx).to.be.revertedWith('Unstake failed')
        })

        it("Should return tokens and yield when user stakes the whole duration", async function () {
            const { fusionStakingContract, account1, owner, fusionTokenContract, account1Signature, ownerSignature } = await loadFixture(deployFusionStaking)
            const nftId = Number(await fusionStakingContract.tokenIdCounter());
            await fusionStakingContract.connect(owner).depositYield(permitAmount, permitDeadline, ownerSignature.v, ownerSignature.r, ownerSignature.s)

            const userBalanceBefore = await fusionTokenContract.balanceOf(account1.address);
            await fusionStakingContract.connect(account1).stakeTokens(permitAmount, permitDeadline, account1Signature.v, account1Signature.r, account1Signature.s)

            await time.increase(maxStakingDuration)

            await fusionStakingContract.connect(account1).unstake(nftId)

            const userBalanceAfter = await fusionTokenContract.balanceOf(account1.address);

            let yieldGenerated = Math.floor((permitAmount * maxStakingDuration * rewardRateInPercentage / 100) / maxStakingDuration)

            expect(userBalanceAfter).to.be.gt(userBalanceBefore);
            expect(userBalanceAfter).to.be.equal(Number(userBalanceBefore) + yieldGenerated);

            expect(fusionStakingContract.ownerOf(nftId)).to.be.reverted
        })

        it("Should return tokens and slashed yield when user stakes less than the full duration", async function () {
            const { fusionStakingContract, account1, owner, fusionTokenContract, account1Signature, ownerSignature } = await loadFixture(deployFusionStaking)
            const nftId = Number(await fusionStakingContract.tokenIdCounter());
            await fusionStakingContract.connect(owner).depositYield(permitAmount, permitDeadline, ownerSignature.v, ownerSignature.r, ownerSignature.s)

            const userBalanceBefore = await fusionTokenContract.balanceOf(account1.address);
            await fusionStakingContract.connect(account1).stakeTokens(permitAmount, permitDeadline, account1Signature.v, account1Signature.r, account1Signature.s)

            const stakingDuration = maxStakingDuration/2
            await time.increase(stakingDuration)

            await fusionStakingContract.connect(account1).unstake(nftId)

            const userBalanceAfter = await fusionTokenContract.balanceOf(account1.address);

            let yieldGenerated = Math.floor(((permitAmount * stakingDuration * rewardRateInPercentage / 100) / maxStakingDuration) / 2)

            expect(userBalanceAfter).to.be.gt(userBalanceBefore);
            expect(userBalanceAfter).to.be.equal(Number(userBalanceBefore) + yieldGenerated);
            expect(fusionStakingContract.ownerOf(nftId)).to.be.reverted
        })

        it("Should revert when NFT does NOT exist", async function () {
            const { fusionStakingContract, account1 } = await loadFixture(deployFusionStaking)

            const stakeTx = fusionStakingContract.connect(account1).unstake(1234)

            await expect(stakeTx).to.be.revertedWithCustomError(fusionStakingContract, "TokenDoesNotExist")
        })

        it("Should revert when user is NOT the owner of the NFT", async function () {
            const { fusionStakingContract, account1, account2, account1Signature } = await loadFixture(deployFusionStaking)

            const nftId = Number(await fusionStakingContract.tokenIdCounter());
            await fusionStakingContract.connect(account1).stakeTokens(permitAmount, permitDeadline, account1Signature.v, account1Signature.r, account1Signature.s)
            const stakeTx = fusionStakingContract.connect(account2).unstake(nftId)

            await expect(stakeTx).to.be.revertedWithCustomError(fusionStakingContract, "NotTokenOwner")
        })

        it("Should revert when there is no yield left", async function () {
            const { fusionStakingContract, account1, account1Signature } = await loadFixture(deployFusionStaking)
            const nftId = Number(await fusionStakingContract.tokenIdCounter());

            await fusionStakingContract.connect(account1).stakeTokens(permitAmount, permitDeadline, account1Signature.v, account1Signature.r, account1Signature.s)
            await time.increase(time.duration.days(30))
            const stakeTx = fusionStakingContract.connect(account1).unstake(nftId)

            await expect(stakeTx).to.be.revertedWithCustomError(fusionStakingContract, "NoYieldLeft")
        })

        it("Should return tokens and NO yield when staking duration is less than a day", async function () {
            const { fusionStakingContract, account1, owner, fusionTokenContract, account1Signature, ownerSignature } = await loadFixture(deployFusionStaking)
            const nftId = Number(await fusionStakingContract.tokenIdCounter());
            await fusionStakingContract.connect(owner).depositYield(permitAmount, permitDeadline, ownerSignature.v, ownerSignature.r, ownerSignature.s)

            const userBalanceBefore = await fusionTokenContract.balanceOf(account1.address);

            await fusionStakingContract.connect(account1).stakeTokens(permitAmount, permitDeadline, account1Signature.v, account1Signature.r, account1Signature.s)
            await time.increase(time.duration.days(0.5))

            await fusionStakingContract.connect(account1).unstake(nftId)

            const userBalanceAfter = await fusionTokenContract.balanceOf(account1.address);

            expect(userBalanceAfter).to.be.eq(userBalanceBefore);
            expect(fusionStakingContract.ownerOf(nftId)).to.be.reverted
        })
    })

    describe("DepositYield", function () {
        it("Should deposit yield when owner deposits yield", async function () {
            const { fusionStakingContract, owner, ownerSignature } = await loadFixture(deployFusionStaking)
            const stakeTx = fusionStakingContract.connect(owner).depositYield(permitAmount, permitDeadline, ownerSignature.v, ownerSignature.r, ownerSignature.s)

            await expect(stakeTx).to.not.be.reverted
        })

        it("Should revert when NOT owner tries to deposit yield", async function () {
            const { fusionStakingContract, account1, ownerSignature } = await loadFixture(deployFusionStaking)
            const stakeTx = fusionStakingContract.connect(account1).depositYield(permitAmount, permitDeadline, ownerSignature.v, ownerSignature.r, ownerSignature.s)

            await expect(stakeTx).to.be.reverted
        })

        it("Should revert when owner tries to deposit 0 yield", async function () {
            const { fusionStakingContract, owner, ownerSignature } = await loadFixture(deployFusionStaking)
            const stakeTx = fusionStakingContract.connect(owner).depositYield(0, permitDeadline, ownerSignature.v, ownerSignature.r, ownerSignature.s)

            await expect(stakeTx).to.be.revertedWithCustomError(fusionStakingContract, "AmountMustBeGreaterThanZero")
        })

        it("Should revert when signature is invalid", async function () {
            const { fusionStakingContract, owner, ownerSignature } = await loadFixture(deployFusionStaking)
            const invalidR = ethers.randomBytes(32);
            const invalidS = ethers.randomBytes(32);
            const stakeTx = fusionStakingContract.connect(owner).depositYield(permitAmount, permitDeadline, ownerSignature.v, invalidR, invalidS)

            await expect(stakeTx).to.be.revertedWith("Invalid signature")
        })

        it("Should revert when signature deadline has expired", async function () {
            const { fusionStakingContract, owner, ownerSignature } = await loadFixture(deployFusionStaking)
            await time.increase(time.duration.hours(2))

            const stakeTx = fusionStakingContract.connect(owner).depositYield(permitAmount, permitDeadline, ownerSignature.v, ownerSignature.r, ownerSignature.s)

            await expect(stakeTx).to.be.revertedWith("Permit expired")
        })
    })
})