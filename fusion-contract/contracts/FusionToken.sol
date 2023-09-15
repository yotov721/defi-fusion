// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract FusionToken is ERC20, Ownable {
    bytes32 public DOMAIN_SEPARATOR;

    // representation of keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
    bytes32 public constant PERMIT_TYPEHASH = 0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;

    mapping(address => uint256) public nonces;

    constructor() ERC20("Fusion Token", "FSN") {
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,address verifyingContract)"),
                keccak256(bytes("Fusion Token")),
                keccak256(bytes("1")),
                address(this)
            )
        );
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        // Ensure the permit is not expired
        require(block.timestamp <= deadline, "Permit expired");

        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(
                    abi.encode(
                        PERMIT_TYPEHASH,
                        owner,
                        spender,
                        value,
                        nonces[owner],
                        deadline
                    )
                )
            )
        );

        nonces[owner] += 1;

        address recoveredAddress = ecrecover(digest, v, r, s);
        require(
            recoveredAddress != address(0) && recoveredAddress == owner,
            "Invalid signature"
        );

        _approve(owner, spender, value);
    }
}