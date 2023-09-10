// SPDX-License-Identifier: MIT
// WARNING: This contract is for testing and educational purposes only.
// Do not use in production environments.
pragma solidity 0.8.19;

import "../FusionToken.sol";

contract MockTransferFromToken is FusionToken {

    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        address spender = _msgSender();
        _spendAllowance(from, spender, amount);
        _transfer(from, to, amount);
        return false;
    }
}