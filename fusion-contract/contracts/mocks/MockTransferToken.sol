// SPDX-License-Identifier: MIT
// WARNING: This contract is for testing and educational purposes only.
// Do not use in production environments.
pragma solidity 0.8.19;

import "../FusionToken.sol";

contract MockTransferToken is FusionToken {

    function transfer(address to, uint256 amount) public override returns (bool) {
        address owner = _msgSender();
        _transfer(owner, to, amount);
        return false;
    }
}