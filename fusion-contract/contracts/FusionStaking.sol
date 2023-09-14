// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./FusionNFT.sol";
import "./FusionToken.sol";

/**
 * @title FusionStaking
 * @dev This contract allows users to stake tokens and receive rewards.
 */
contract FusionStaking is FusionNFT {
    using SafeMath for uint256;

    address public token;
    uint256 public maxTotalStake;
    uint256 public maxUserStake;
    uint256 public totalYield;
    uint256 public totalStaked;
    uint256 public totalStakers;

    mapping(uint256 => Stake) public stakedBalances;
    mapping(address => bool) public hasWithdrawn;

    uint16 public rewardRateInPercentage;
    uint256 public maxStakingDuration;

    /**
     * @dev Modifier to check if a user is eligible to stake.
     */
    modifier isElegibleToStake() {
        if (hasWithdrawn[msg.sender]) {
            revert UserAlreadyWithdrawn();
        }
        if (balanceOf(msg.sender) > 0) {
            revert UserAlreadyStaked();
        }
        _;
    }

    error UserAlreadyWithdrawn();
    error UserAlreadyStaked();
    error NoAllowance();
    error AmountExceedsUserStakeLimit();
    error AmountExceedsTotalStakeLimit();
    error StakeFailed();
    error AmountMustBeGreaterThanZero();
    error StakeDoesNotExist();
    error TokenDoesNotExist();
    error NotTokenOwner();
    error NoYieldLeft();

    struct Stake {
        uint256 amount;
        uint256 startTimestamp;
    }

    event Staked(address indexed user, uint256 amount, uint256 tokenId);
    event Unstaked(address indexed user, uint256 amount, uint256 tokenId);
    event YieldDeposited(uint256 amount);
    event RewardClaimed(address indexed user, uint256 tokenId, uint256 reward);

    /**
     * @dev Constructor to initialize the contract.
     * @param _tokenAddress Address of the ERC20 token used for staking.
     * @param _maxTotalStake Maximum total staking amount allowed.
     * @param _maxUserStake Maximum staking amount per user.
     * @param _maxStakingDuration Maximum staking duration in seconds.
     * @param _rewardRateInPercentage Reward rate in percentage.
     */
    constructor(
        address _tokenAddress,
        uint256 _maxTotalStake,
        uint256 _maxUserStake,
        uint256 _maxStakingDuration,
        uint16 _rewardRateInPercentage
    ) {
        token = _tokenAddress;
        maxTotalStake = _maxTotalStake;
        maxUserStake = _maxUserStake;
        maxStakingDuration = _maxStakingDuration;
        rewardRateInPercentage = _rewardRateInPercentage;
    }

    /**
     * @dev Stake tokens with permit into the contract
     * @param _amount The amount of tokens to stake
     * @param _deadline The end timestamp of the permit
     * @param _v The recovery id of the permit's signature.
     * @param _r The first 32 bytes of the permit's signature.
     * @param _s The second 32 bytes of the permit's signature.
     */
    function stakeTokens(uint256 _amount, uint256 _deadline, uint8 _v, bytes32 _r, bytes32 _s) external isElegibleToStake() {
        if (_amount == 0) {
            revert AmountMustBeGreaterThanZero();
        }
        if (_amount > maxUserStake) {
            revert AmountExceedsUserStakeLimit();
        }
        if (totalStaked + _amount > maxTotalStake) {
            revert AmountExceedsTotalStakeLimit();
        }

        FusionToken(token).permit(msg.sender, address(this), _amount, _deadline, _v, _r, _s);
        if (!FusionToken(token).transferFrom(msg.sender, address(this), _amount)) {
            revert StakeFailed();
        }

        totalStaked += _amount;

        _mint(msg.sender, tokenIdCounter);
        stakedBalances[tokenIdCounter] = Stake(_amount, block.timestamp);

        emit Staked(msg.sender, _amount, tokenIdCounter);
        totalStakers++;
        tokenIdCounter++;
    }

    /**
     * @dev Unstake tokens from the contract and claim rewards
     * @param _tokenId The Id of the staked NFT
     */
    function unstake(uint256 _tokenId) external {
        if (!_exists(_tokenId)) {
            revert TokenDoesNotExist();
        }

        if (ownerOf(_tokenId) != msg.sender) {
            revert NotTokenOwner();
        }

        Stake storage stake = stakedBalances[_tokenId];
        uint256 _amount = stake.amount;

        // Calculate and distribute rewards
        uint256 reward = calculateReward(_tokenId);
        uint256 withdrawAmount = _amount;

        if (reward > 0) {
            (bool success, uint256 newTotalYield) = totalYield.trySub(reward);

            if (success) {
                totalYield = newTotalYield;
            } else {
                // Handle the underflow case
                revert NoYieldLeft();
            }

            withdrawAmount += reward;
        }

        // Burn the NFT
        _burn(_tokenId);

        totalStaked = totalStaked.sub(_amount);
        require(ERC20(token).transfer(msg.sender, withdrawAmount), "Unstake failed");

        emit Unstaked(msg.sender, _amount, _tokenId);
        emit RewardClaimed(msg.sender, _tokenId, reward);

        // Mark the user as having withdrawn
        hasWithdrawn[msg.sender] = true;
    }

    /**
     * @dev Deposit yield into the contract
     * @param _amount The amount of yield tokens to deposit
     */
    function depositYield(uint256 _amount, uint256 _deadline, uint8 _v, bytes32 _r, bytes32 _s) external onlyOwner {
        if (_amount == 0) {
            revert AmountMustBeGreaterThanZero();
        }

        FusionToken(token).permit(msg.sender, address(this), _amount, _deadline, _v, _r, _s);
        FusionToken(token).transferFrom(owner(), address(this), _amount);

        totalYield += _amount;
        emit YieldDeposited(_amount);
    }

    /**
     * @dev Calculate the reward for a stak
     * @param _tokenId The ID of the staked NFT
     * @return The calculated reward amount
     */
    function calculateReward(uint256 _tokenId) internal view returns (uint256) {
        Stake storage stake = stakedBalances[_tokenId];
        uint256 stakingDuration = block.timestamp - stake.startTimestamp;

        if (stakingDuration > maxStakingDuration) {
            stakingDuration = maxStakingDuration;
        }

        // Solidity uses floor division
        // Yield should only be paid for full days
        // Example: If a user has staked for 1.79 days he will get paid for 1 day only
        stakingDuration = stakingDuration.div(1 days).mul(1 days);

        uint256 reward = stake.amount.mul(stakingDuration).mul(rewardRateInPercentage).div(100).div(maxStakingDuration);

        return reward;
    }
}
