// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

/* -------------------------------------------------------------------------- */
/*  FractionalVault – one minimal ERC-20 clone per NFT                         */
/* -------------------------------------------------------------------------- */
contract FractionalVault is ERC20 {
    bool    public initialized;
    address public nft;          // ERC-721 collection
    uint256 public tokenId;      // ID held by this vault
    string private _vaultName;
    string private _vaultSymbol;

    constructor() ERC20("", "") {}   // empty name & symbol – set later

    /**
     * @dev Called *once* by VaultFactory immediately after clone.
     * @param _owner   the EOA that owns the NFT and will receive the shares
     * @param _nft     ERC-721 contract address
     * @param _tokenId id of the NFT to fractionalise
     * @param shares   number of fungible shares to mint (plain number, not 1e18)
     * @param name_    ERC-20 name
     * @param symbol_  ERC-20 symbol
     */
    function initialize(
        address _owner,
        address _nft,
        uint256 _tokenId,
        uint256 shares,
        string calldata name_,
        string calldata symbol_
    ) external {
        require(!initialized, "already init");
        initialized = true;

        nft     = _nft;
        tokenId = _tokenId;
        _vaultName = name_;
        _vaultSymbol = symbol_;

        // pull the NFT from its owner → vault
        IERC721(_nft).transferFrom(_owner, address(this), _tokenId);

        // mint ERC-20 shares to the owner (18 decimals)
        _mint(_owner, shares * 1e18);
    }

    function name() public view override returns (string memory) {
        return _vaultName;
    }

    function symbol() public view override returns (string memory) {
        return _vaultSymbol;
    }
}
