// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract FusionNFT is ERC721Enumerable, Ownable {
    uint256 public tokenIdCounter;

    constructor() ERC721("Staking NFT", "SNFT") {}

}
