// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./FusionNFT.sol";

contract FusionStaking is FusionNFT {
    IERC20 public token;
    uint256 public maxTotalStake;
    uint256 public maxUserStake;
    uint256 public totalYield;
    uint256 public totalStaked;

    struct Stake {
        uint256 amount;
        uint256 startTimestamp;
        bool exists;
    }

    mapping(uint256 => Stake) public stakedBalances;
    mapping(address => bool) public hasWithdrawn;

    uint16 public rewardRateInPercentage;
    uint256 public maxStakingDuration;

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
        token = IERC20(_tokenAddress);
        maxTotalStake = _maxTotalStake;
        maxUserStake = _maxUserStake;
        tokenIdCounter = 1;
        maxStakingDuration = _maxStakingDuration;
        rewardRateInPercentage = _rewardRateInPercentage;
    }

    function stakeTokens(uint256 _amount) external {
        require(!hasWithdrawn[msg.sender], "User has already withdrawn");
        require(balanceOf(msg.sender) == 0, "User has a stake already");
        require(_amount > 0, "Amount must be greater than 0");
        require(_amount <= maxUserStake, "Amount exceeds user stake limit");
        require(
            totalStaked + _amount <= maxTotalStake,
            "Amount exceeds total stake limit"
        );
        require(
            token.transferFrom(msg.sender, address(this), _amount),
            "Stake failed, check your allowance"
        );

        totalStaked += _amount;

        _mint(msg.sender, tokenIdCounter);
        stakedBalances[tokenIdCounter] = Stake(_amount, block.timestamp, true);

        emit Staked(msg.sender, _amount, tokenIdCounter);

        tokenIdCounter++;
    }

    function unstake(uint256 _tokenId) external {
        require(_exists(_tokenId), "Token does not exist");
        require(ownerOf(_tokenId) == msg.sender, "You do not own this token");

        Stake storage stake = stakedBalances[_tokenId];
        require(stake.exists, "Stake does not exist");
        uint256 _amount = stake.amount;

        // Calculate and distribute rewards
        uint256 reward = calculateReward(_tokenId);
        uint256 withdrawAmount = 0;

        if (reward > 0) {
            totalYield -= reward;
            withdrawAmount += reward;
        }

        // Burn the ERC-721 token
        _burn(_tokenId);

        // Transfer the staked tokens back to the user
        stake.exists = false;
        totalStaked -= _amount;
        require(token.transfer(msg.sender, withdrawAmount), "Unstake failed");

        emit Unstaked(msg.sender, _amount, _tokenId);
        emit RewardClaimed(msg.sender, _tokenId, reward);

        // Mark the user as having withdrawn
        hasWithdrawn[msg.sender] = true;
    }

    function depositYield(uint256 _amount) external onlyOwner {
        require(_amount > 0, "Amount must be greater than 0");
        require(
            token.transferFrom(owner(), address(this), _amount),
            "Yield deposit failed, check your allowance"
        );
        totalYield += _amount;
        emit YieldDeposited(_amount);
    }

    function calculateReward(uint256 _tokenId) public view returns (uint256) {
        Stake storage stake = stakedBalances[_tokenId];
        if (!stake.exists) {
            return 0;
        }
        uint256 stakingDuration = block.timestamp - stake.startTimestamp;

        if (stakingDuration > maxStakingDuration) {
            stakingDuration = maxStakingDuration;
        }

        uint256 stakingDurationInDays = stakingDuration / 1 days;

        uint256 reward = (stake.amount * stakingDurationInDays * rewardRateInPercentage) / (100 * maxStakingDuration);

        return reward;
    }
}
