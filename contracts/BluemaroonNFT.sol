// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract BluemaroonNFT is ERC721URIStorage {
    uint256 private _id;

    constructor() ERC721("BlueMaroonNFT", "BMN") {}

    function mint(string memory tokenURI) external returns (uint256) {
        _id += 1;
        _safeMint(msg.sender, _id);
        _setTokenURI(_id, tokenURI);
        return _id;
    }
}
