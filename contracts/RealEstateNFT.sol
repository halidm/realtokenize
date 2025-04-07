// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./IERC4907.sol";
import "./IRegulator.sol";

/**
 * @title RealEstateNFT
 * @dev ERC721 token representing real estate properties with rental and regulatory features
 */
contract RealEstateNFT is ERC721, ERC721Enumerable, Ownable, IERC4907 {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;
    
    // Rental user info struct
    struct UserInfo {
        address user;   // address of user role
        uint64 expires; // unix timestamp, user expires
    }

    // Mappings
    mapping(uint256 => UserInfo) internal _users;    // TokenId => UserInfo
    mapping(uint256 => string) private _tokenURIs;   // TokenId => URI
    mapping(uint256 => uint256) public propertyPrices;  // TokenId => Price in wei
    mapping(uint256 => uint256) public rentalRates;     // TokenId => Daily rate in wei

    // Regulator contract
    IRegulator public regulator;

    // Events
    event PropertyPriceSet(uint256 indexed tokenId, uint256 price);
    event RentalRateSet(uint256 indexed tokenId, uint256 dailyRate);
    event TokenURISet(uint256 indexed tokenId, string uri);

    // Constructor
    constructor(address _regulator) ERC721("RealEstateNFT", "RENFT") {
        regulator = IRegulator(_regulator);
    }

    /**
     * @dev ERC4907 implementation
     */
    function setUser(uint256 tokenId, address user, uint64 expires) public virtual override {
        require(_isApprovedOrOwner(_msgSender(), tokenId), "Not approved or owner");
        UserInfo storage info = _users[tokenId];
        info.user = user;
        info.expires = expires;
        emit UpdateUser(tokenId, user, expires);
    }

    function userOf(uint256 tokenId) public view virtual override returns(address) {
        if(uint256(_users[tokenId].expires) >= block.timestamp) {
            return _users[tokenId].user;
        }
        return address(0);
    }

    function userExpires(uint256 tokenId) public view virtual override returns(uint256) {
        return _users[tokenId].expires;
    }

    /**
     * @dev Property price and rental management
     */
    function setPropertyPrice(uint256 tokenId, uint256 price) public {
        require(_isApprovedOrOwner(_msgSender(), tokenId), "Not approved or owner");
        propertyPrices[tokenId] = price;
        emit PropertyPriceSet(tokenId, price);
    }

    function setRentalRate(uint256 tokenId, uint256 dailyRate) public {
        require(_isApprovedOrOwner(_msgSender(), tokenId), "Not approved or owner");
        rentalRates[tokenId] = dailyRate;
        emit RentalRateSet(tokenId, dailyRate);
    }

    /**
     * @dev Override transfer functions to include regulatory checks
     */
    function transferFrom(address from, address to, uint256 tokenId) public override(ERC721) {
        // Check either explicit approval via regulator or internal approval for escrow transfers
        bool isApproved = regulator.isTransferApproved(tokenId, from, to);
        
        // If not approved normally, allow the transfer if being done within the escrow sale process
        if (!isApproved && from == address(regulator)) {
            // Special case: if the regulator is sending the NFT as part of completing a sale
            // We will allow the transfer without explicit approval
            super.transferFrom(from, to, tokenId);
            // Clear user info when transferred
            delete _users[tokenId];
            return;
        }
        
        require(isApproved, "Transfer not approved by regulator");
        super.transferFrom(from, to, tokenId);
        // Clear user info when transferred
        delete _users[tokenId];
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public override(ERC721) {
        // Check either explicit approval via regulator or internal approval for escrow transfers
        bool isApproved = regulator.isTransferApproved(tokenId, from, to);
        
        // If not approved normally, allow the transfer if being done within the escrow sale process
        if (!isApproved && from == address(regulator)) {
            // Special case: if the regulator is sending the NFT as part of completing a sale
            super.safeTransferFrom(from, to, tokenId, data);
            // Clear user info when transferred
            delete _users[tokenId];
            return;
        }
        
        require(isApproved, "Transfer not approved by regulator");
        super.safeTransferFrom(from, to, tokenId, data);
        // Clear user info when transferred
        delete _users[tokenId];
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) public override(ERC721) {
        // Check either explicit approval via regulator or internal approval for escrow transfers
        bool isApproved = regulator.isTransferApproved(tokenId, from, to);
        
        // If not approved normally, allow the transfer if being done within the escrow sale process
        if (!isApproved && from == address(regulator)) {
            // Special case: if the regulator is sending the NFT as part of completing a sale
            super.safeTransferFrom(from, to, tokenId);
            // Clear user info when transferred
            delete _users[tokenId];
            return;
        }
        
        require(isApproved, "Transfer not approved by regulator");
        super.safeTransferFrom(from, to, tokenId);
        // Clear user info when transferred
        delete _users[tokenId];
    }

    /**
     * @dev NFT minting and burning
     */
    function mint(address to, string memory uri) public onlyOwner {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        _tokenURIs[tokenId] = uri;
        emit TokenURISet(tokenId, uri);
    }

    function burn(uint256 tokenId) public {
        require(_isApprovedOrOwner(_msgSender(), tokenId), "Not approved to burn");
        delete _tokenURIs[tokenId];
        delete _users[tokenId];
        _burn(tokenId);
    }

    /**
     * @dev URI management
     */
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "URI query for nonexistent token");
        return _tokenURIs[tokenId];
    }

    /**
     * @dev Required overrides
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal virtual override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return
            interfaceId == type(IERC4907).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function setRegulator(address _regulator) external onlyOwner {
        require(_regulator != address(0), "Invalid regulator address");
        regulator = IRegulator(_regulator);
    }
}