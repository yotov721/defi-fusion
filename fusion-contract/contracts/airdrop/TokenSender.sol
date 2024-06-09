// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TokenSender {
    error LengthMismatch();
    error ZeroAddres();
    error TotalAmountMismatch();

    function airdropERC20(
        address tokenAddress,
        address[] calldata recipients,
        uint256[] calldata amounts,
        uint256 totalAmount
    ) external {
        if (recipients.length != amounts.length) {
            revert LengthMismatch();
        }
        
        SafeERC20.safeTransferFrom(IERC20(tokenAddress), msg.sender, address(this), totalAmount);

        uint256 actualTotal;

        for (uint256 i; i < recipients.length; i++) {
            actualTotal += amounts[i];
            if (recipients[i] == address(0)) {
                revert ZeroAddres();
            }
            SafeERC20.safeTransfer(IERC20(tokenAddress), recipients[i], amounts[i]);
        }

        if (actualTotal != totalAmount) {
            revert TotalAmountMismatch();
        }
    }
}