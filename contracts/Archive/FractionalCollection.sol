// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/* -------------------------------------------------------------------------- */
/*                        Helper ERC-20 used as the “shares”                   */
/* -------------------------------------------------------------------------- */
contract FractionalShare is ERC20, ERC20Capped, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 cap_,           // full capped supply (18 decimals)
        address holder,         // who receives the initial supply
        address admin           // who gets admin + minter roles
    )
        ERC20(name_, symbol_)
        ERC20Capped(cap_)
    {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);

        // Mint the full cap to the designated holder (our FractionalCollection)
        _mint(holder, cap_);
    }

    /* OpenZeppelin v5 requires resolving _update clash */
    function _update(address from, address to, uint256 amount)
        internal
        override(ERC20, ERC20Capped)
    {
        super._update(from, to, amount);
    }

    /* Optional extra mint capability (only MINTER_ROLE) */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
}

/* -------------------------------------------------------------------------- */
/*                         Fractional NFT collection                           */
/* -------------------------------------------------------------------------- */
contract FractionalCollection is
    ERC721URIStorage,
    AccessControl,
    ReentrancyGuard
{
    bytes32 public constant CREATOR_ROLE = keccak256("CREATOR_ROLE");

    struct SaleInfo {
        address sharesToken;   // deployed FractionalShare address
        uint256 pricePerShare; // wei per share (18 decimals)
        uint256 cap;           // max supply (18 decimals)
        uint256 sold;          // amount already sold
    }

    mapping(uint256 => SaleInfo) public sale;
    uint256 public nextTokenId = 1;

    event Minted(uint256 indexed tokenId, address indexed sharesToken);
    event SharesPurchased(uint256 indexed tokenId, address buyer, uint256 amount);

    constructor() ERC721("FractionalNFT", "FRAC") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /* ------------- ERC165 diamond-inheritance resolution ------------------- */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, AccessControl)  // list *all* bases that implement it
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /* -------------------------- Core workflow ------------------------------ */

    /**
     * Creator mints an NFT *and* a capped ERC-20 “share” token.
     * - `shareCap` and `price` are *whole-token* values. Contract uses 18 decimals.
     */
    function mintWithShares(
        string memory uri,
        uint256 shareCap,   // whole tokens (no decimals)
        uint256 price       // wei (per 1 token)
    ) external onlyRole(CREATOR_ROLE) returns (uint256 tokenId) {
        require(shareCap > 0, "cap=0");

        tokenId = nextTokenId++;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, uri);

        /* deploy the ERC-20 capped share token */
        uint256 cap18 = shareCap * 1e18;
        FractionalShare shares = new FractionalShare(
            "Fractional Share",
            "FSHARE",
            cap18,
            address(this),               // holder: the collection contract
            msg.sender                   // admin/minter: creator
        );

        sale[tokenId] = SaleInfo({
            sharesToken: address(shares),
            pricePerShare: price,
            cap: cap18,
            sold: 0
        });

        emit Minted(tokenId, address(shares));
    }

    /**
     * Buy `amount` shares of the NFT at `tokenId`.
     * Pays exact ETH and transfers ERC-20 to the buyer.
     */
    function buyShares(uint256 tokenId, uint256 amount)
        external
        payable
        nonReentrant
    {
        require(amount > 0, "amount=0");

        SaleInfo storage s = sale[tokenId];
        require(s.sharesToken != address(0), "no sale");
        require(s.sold + amount <= s.cap, "sold out");
        require(msg.value == amount * s.pricePerShare, "wrong ETH");

        s.sold += amount;
        FractionalShare(s.sharesToken).transfer(msg.sender, amount * 1e18);

        emit SharesPurchased(tokenId, msg.sender, amount);
    }
}
