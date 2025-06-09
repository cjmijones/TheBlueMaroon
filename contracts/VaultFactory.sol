// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "./FractionalVault.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

contract VaultFactory {
    address public immutable implementation;
    event VaultCreated(
        address vault,
        address indexed nft,
        uint256 indexed tokenId,
        uint256 shares,
        address creator
    );

    constructor(address _impl) {
        implementation = _impl;
    }

    function createVault(
        address nft,
        uint256 tokenId,
        uint256 shares,
        string calldata name_,
        string calldata symbol_
    ) external returns (address vault) {
        bytes32 salt = keccak256(abi.encodePacked(nft, tokenId, msg.sender));
        vault = Clones.cloneDeterministic(implementation, salt);
        FractionalVault(vault).initialize(
            nft,
            tokenId,
            shares,
            name_,
            symbol_
        );
        emit VaultCreated(vault, nft, tokenId, shares, msg.sender);
    }

    function predictVault(
        address nft,
        uint256 tokenId,
        address creator
    ) external view returns (address) {
        bytes32 salt = keccak256(abi.encodePacked(nft, tokenId, creator));
        return Clones.predictDeterministicAddress(implementation, salt);
    }
}
