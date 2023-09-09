// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./FusionNFT.sol";
import "./FusionToken.sol";

// TODO
// NatSpec
// README
// require -> custom errors
// Add SafeMath for operations
//
contract FusionStaking is FusionNFT {
    using SafeMath for uint256;
    using Math for uint256;

    IERC20 public token;
    uint256 public maxTotalStake;
    uint256 public maxUserStake;
    uint256 public totalYield;
    uint256 public totalStaked;

    mapping(uint256 => Stake) public stakedBalances;
    mapping(address => bool) public hasWithdrawn;

    uint16 public rewardRateInPercentage;
    uint256 public maxStakingDuration;

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
        bool exists;
    }

    event Staked(address indexed user, uint256 amount, uint256 tokenId);
    event Unstaked(address indexed user, uint256 amount, uint256 tokenId);
    event YieldDeposited(uint256 amount);
    event RewardClaimed(address indexed user, uint256 tokenId, uint256 reward);

    constructor(
        address _tokenAddress,
        uint256 _maxTotalStake,
        uint256 _maxUserStake,
        uint256 _maxStakingDuration,
        uint16 _rewardRateInPercentage
    ) {
        token = ERC20(_tokenAddress);
        maxTotalStake = _maxTotalStake;
        maxUserStake = _maxUserStake;
        maxStakingDuration = _maxStakingDuration;
        rewardRateInPercentage = _rewardRateInPercentage;
    }

    function stakeTokens(uint256 _amount) external isElegibleToStake() {
        if (token.allowance(msg.sender, address(this)) < _amount) {
            revert NoAllowance();
        }
        if (_amount == 0) {
            revert AmountMustBeGreaterThanZero();
        }
        if (_amount > maxUserStake) {
            revert AmountExceedsUserStakeLimit();
        }
        if (totalStaked + _amount > maxTotalStake) {
            revert AmountExceedsTotalStakeLimit();
        }
        if (!token.transferFrom(msg.sender, address(this), _amount)) {
            revert StakeFailed();
        }

        totalStaked += _amount;

        _mint(msg.sender, tokenIdCounter);
        stakedBalances[tokenIdCounter] = Stake(_amount, block.timestamp, true);

        emit Staked(msg.sender, _amount, tokenIdCounter);

        tokenIdCounter++;
    }

    function unstake(uint256 _tokenId) external {
        if (!_exists(_tokenId)) {
            revert TokenDoesNotExist();
        }

        if (ownerOf(_tokenId) != msg.sender) {
            revert NotTokenOwner();
        }

        Stake storage stake = stakedBalances[_tokenId];
        if (!stake.exists) {
            revert StakeDoesNotExist();
        }
        uint256 _amount = stake.amount;

        // Calculate and distribute rewards
        uint256 reward = calculateReward(_tokenId);
        uint256 withdrawAmount = 0;

        if (reward > 0) {
            (bool success, uint256 newTotalYield) = trySub(totalYield, reward);

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

        // Transfer the staked tokens back to the user
        stake.exists = false;
        totalStaked = totalStaked.sub(_amount);
        require(token.transfer(msg.sender, withdrawAmount), "Unstake failed");

        emit Unstaked(msg.sender, _amount, _tokenId);
        emit RewardClaimed(msg.sender, _tokenId, reward);

        // Mark the user as having withdrawn
        hasWithdrawn[msg.sender] = true;
    }

    function depositYield(uint256 _amount) external onlyOwner {
        if (_amount == 0) {
            revert AmountMustBeGreaterThanZero();
        }
        if (!token.transferFrom(owner(), address(this), _amount)) {
            revert NoAllowance();
        }
        totalYield += _amount;
        emit YieldDeposited(_amount);
    }

    function calculateReward(uint256 _tokenId) internal view returns (uint256) {
        Stake storage stake = stakedBalances[_tokenId];
        if (!stake.exists) {
            return 0;
        }
        uint256 stakingDuration = block.timestamp - stake.startTimestamp;

        if (stakingDuration > maxStakingDuration) {
            stakingDuration = maxStakingDuration;
        }

        // Solidity uses floor division
        // Yield should only be paid for full days
        // Example: if a user has staked for 1.79 days he will get paid for 1 day only
        uint256 stakingDurationInDays = stakingDuration.div(1 days);

        uint256 reward = stake.amount.mul(stakingDurationInDays).mul(rewardRateInPercentage).div(100).div(maxStakingDuration);

        return reward;
    }
}