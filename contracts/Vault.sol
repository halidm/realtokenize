// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./BasketToken.sol";

/**
 * @title Vault
 * @dev Contract for depositing NFTs and minting basket tokens
 */
contract Vault is ERC721Holder, Ownable {
    // The NFT contract
    IERC721 private _nftContract;
    
    // The basket token contract
    BasketToken private _basketToken;
    
    // Mapping from token ID to whether it's in the vault
    mapping(uint256 => bool) private _vaultedNFTs;
    
    // Mapping from token ID to the amount of basket tokens minted for it
    mapping(uint256 => uint256) private _tokenAmounts;
    
    // Events
    event NFTDeposited(address indexed depositor, uint256 indexed tokenId, uint256 tokenAmount);
    event NFTRedeemed(address indexed redeemer, uint256 indexed tokenId, uint256 tokenAmount);

    // Constructor
    constructor(address nftAddress, address basketTokenAddress) {
        _nftContract = IERC721(nftAddress);
        _basketToken = BasketToken(basketTokenAddress);
    }

    /**
     * @dev Deposits an NFT and mints basket tokens
     * @param tokenId The ID of the NFT to deposit
     * @param tokenAmount The amount of basket tokens to mint for this NFT
     */
    function depositNFT(uint256 tokenId, uint256 tokenAmount) external {
        require(tokenAmount > 0, "Token amount must be greater than 0");
        
        // Transfer the NFT to the vault
        _nftContract.safeTransferFrom(msg.sender, address(this), tokenId);
        
        // Mark the NFT as vaulted and store the token amount
        _vaultedNFTs[tokenId] = true;
        _tokenAmounts[tokenId] = tokenAmount;
        
        // Mint basket tokens to the depositor
        _basketToken.mint(msg.sender, tokenAmount);
        
        emit NFTDeposited(msg.sender, tokenId, tokenAmount);
    }

    /**
     * @dev Redeems an NFT by burning basket tokens
     * @param tokenId The ID of the NFT to redeem
     */
    function redeemNFT(uint256 tokenId) external {
        // Check if the NFT is in the vault
        require(_vaultedNFTs[tokenId], "NFT not in vault");
        
        // Get the amount of tokens that were minted for this NFT
        uint256 tokenAmount = _tokenAmounts[tokenId];
        
        // Burn the basket tokens
        _basketToken.burn(msg.sender, tokenAmount);
        
        // Mark the NFT as not vaulted and clear the token amount
        _vaultedNFTs[tokenId] = false;
        delete _tokenAmounts[tokenId];
        
        // Transfer the NFT back to the redeemer
        _nftContract.safeTransferFrom(address(this), msg.sender, tokenId);
        
        emit NFTRedeemed(msg.sender, tokenId, tokenAmount);
    }

    /**
     * @dev Checks if an NFT is in the vault
     * @param tokenId The ID of the NFT
     * @return Whether the NFT is in the vault
     */
    function isNFTVaulted(uint256 tokenId) external view returns (bool) {
        return _vaultedNFTs[tokenId];
    }

    /**
     * @dev Returns the amount of tokens minted for an NFT
     * @param tokenId The ID of the NFT
     * @return The amount of tokens minted for the NFT
     */
    function getTokenAmount(uint256 tokenId) external view returns (uint256) {
        require(_vaultedNFTs[tokenId], "NFT not in vault");
        return _tokenAmounts[tokenId];
    }

    /**
     * @dev Returns the token price based on the vault's assets
     * @return The price of one basket token in ETH
     */
    function getTokenPrice() external pure returns (uint256) {
        // In a real implementation, this would calculate the price based on the vault's assets
        // For demo purposes, we'll return a fixed price
        return 0.01 ether; // 0.01 ETH per token
    }
} 