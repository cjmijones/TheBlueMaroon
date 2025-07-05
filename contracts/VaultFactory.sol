// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "./FractionalVault.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

/* -------------------------------------------------------------------------- */
/*  VaultFactory – deterministic minimal-proxy factory                        */
/* -------------------------------------------------------------------------- */
contract VaultFactory {
    address public immutable implementation;          // FractionalVault logic

    event VaultCreated(
        address indexed vault,
        address indexed nft,
        uint256 indexed tokenId,
        uint256 shares,
        address creator
    );

    constructor(address _impl) {
        implementation = _impl;
    }

    /**
     * @notice Clone a new vault, transfer the NFT into it and mint shares.
     *
     * The `salt` guarantees a unique vault per (nft, tokenId, creator).
     */
    function createVault(
        address nft,
        uint256 tokenId,
        uint256 shares,
        string calldata name_,
        string calldata symbol_
    ) external returns (address vault) {
        bytes32 salt = keccak256(abi.encodePacked(nft, tokenId, msg.sender));
        vault = Clones.cloneDeterministic(implementation, salt);

        /* initialise the clone – pass the *owner* (msg.sender) first         */
        FractionalVault(vault).initialize(
            msg.sender,
            nft,
            tokenId,
            shares,
            name_,
            symbol_
        );

        emit VaultCreated(vault, nft, tokenId, shares, msg.sender);
    }

    /** View helper – what address will the vault have? */
    function predictVault(
        address nft,
        uint256 tokenId,
        address creator
    ) external view returns (address) {
        bytes32 salt = keccak256(abi.encodePacked(nft, tokenId, creator));
        return Clones.predictDeterministicAddress(implementation, salt);
    }
}