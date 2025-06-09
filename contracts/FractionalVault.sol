// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract FractionalVault is ERC20 {
    bool public initialized;
    address public nft;
    uint256 public tokenId;

    constructor() ERC20("", "") {}

    function initialize(
        address _nft,
        uint256 _tokenId,
        uint256 shares,
        string calldata name_,
        string calldata symbol_
    ) external {
        require(!initialized, "already init");
        initialized = true;

        nft = _nft;
        tokenId = _tokenId;

        _setName(name_);
        _setSymbol(symbol_);

        IERC721(_nft).transferFrom(msg.sender, address(this), _tokenId);
        _mint(msg.sender, shares * 1e18);
    }

    function _setName(string memory name_) internal {
        assembly {
            sstore(0x3, name_)
        }
    }

    function _setSymbol(string memory symbol_) internal {
        assembly {
            sstore(0x4, symbol_)
        }
    }
}
