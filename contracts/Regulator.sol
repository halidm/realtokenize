// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IRegulator.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Regulator is IRegulator, ReentrancyGuard, Ownable {
    address public realEstateNFT;
    
    // Transfer approval system (for regular transfers, not sales)
    mapping(uint256 => mapping(address => mapping(address => bool))) public approvedTransfers;
    TransferRequest[] private pendingTransfers;
    
    // Escrow sale system
    mapping(uint256 => SaleEscrow) public saleEscrows;
    uint256[] private pendingSaleTokenIds;

    constructor(address _realEstateNFT) {
        realEstateNFT = _realEstateNFT;
    }

    // Transfer approval functions
    function requestTransferApproval(uint256 tokenId, address to) external override {
        require(IERC721(realEstateNFT).ownerOf(tokenId) == msg.sender, "Not the owner");
        require(to != address(0), "Invalid recipient address");
        
        pendingTransfers.push(TransferRequest({
            from: msg.sender,
            to: to,
            tokenId: tokenId,
            approved: false
        }));
        
        emit TransferRequested(tokenId, msg.sender, to);
    }

    function approveTransfer(uint256 tokenId, address from, address to) external override onlyOwner {
        require(from != address(0), "Invalid sender address");
        require(to != address(0), "Invalid recipient address");
        
        approvedTransfers[tokenId][from][to] = true;
        
        for (uint i = 0; i < pendingTransfers.length; i++) {
            TransferRequest storage request = pendingTransfers[i];
            if (request.tokenId == tokenId && request.from == from && request.to == to) {
                request.approved = true;
                break;
            }
        }
        
        emit TransferApproved(tokenId, from, to);
    }

    function isTransferApproved(uint256 tokenId, address from, address to) external view override returns (bool) {
        return approvedTransfers[tokenId][from][to];
    }

    function getPendingTransfers() external view override returns (TransferRequest[] memory) {
        uint256 count = 0;
        for (uint i = 0; i < pendingTransfers.length; i++) {
            if (!pendingTransfers[i].approved) {
                count++;
            }
        }
        
        TransferRequest[] memory result = new TransferRequest[](count);
        uint256 index = 0;
        
        for (uint i = 0; i < pendingTransfers.length; i++) {
            if (!pendingTransfers[i].approved) {
                result[index] = pendingTransfers[i];
                index++;
            }
        }
        
        return result;
    }

    // Enhanced escrow sale functions
    function listPropertyForSale(uint256 tokenId, address buyer, uint256 price) external override {
        require(price > 0, "Price must be greater than 0");
        require(buyer != address(0), "Invalid buyer address");
        
        // Check if the sender is the owner of the NFT
        address owner = IERC721(realEstateNFT).ownerOf(tokenId);
        require(owner == msg.sender, "Not the owner");
        
        // Check if the contract is approved to transfer this NFT
        address approved = IERC721(realEstateNFT).getApproved(tokenId);
        bool isApprovedForAll = IERC721(realEstateNFT).isApprovedForAll(owner, address(this));
        require(approved == address(this) || isApprovedForAll, "Transfer not approved by owner");
        
        // Transfer NFT to the regulator (escrow)
        IERC721(realEstateNFT).safeTransferFrom(msg.sender, address(this), tokenId);

        // Create sale escrow entry
        saleEscrows[tokenId] = SaleEscrow({
            seller: msg.sender,
            buyer: buyer,
            tokenId: tokenId,
            price: price,
            nftDeposited: true, // NFT is already deposited
            paymentReceived: false
        });
        
        pendingSaleTokenIds.push(tokenId);
        
        emit PropertyListedForSale(tokenId, msg.sender, buyer, price);
        emit NFTDepositedToEscrow(tokenId, msg.sender);
    }
    
    // Status check functions
    function isNFTInEscrow(uint256 tokenId) external view override returns (bool) {
        return saleEscrows[tokenId].nftDeposited;
    }
    
    function isPaymentReceived(uint256 tokenId) external view override returns (bool) {
        return saleEscrows[tokenId].paymentReceived;
    }
    
    function getSaleStatus(uint256 tokenId) external view override returns (
        bool exists,
        bool nftDeposited,
        bool paymentReceived
    ) {
        SaleEscrow storage escrow = saleEscrows[tokenId];
        bool saleExists = escrow.seller != address(0);
        return (
            saleExists,
            escrow.nftDeposited,
            escrow.paymentReceived
        );
    }

    function getSaleEscrowDetails(uint256 tokenId) external view override returns (
        address seller,
        address buyer,
        uint256 price,
        bool nftDeposited,
        bool paymentReceived
    ) {
        SaleEscrow storage escrow = saleEscrows[tokenId];
        return (
            escrow.seller,
            escrow.buyer,
            escrow.price,
            escrow.nftDeposited,
            escrow.paymentReceived
        );
    }
    
    // Payment function
    function depositPayment(uint256 tokenId) external payable override nonReentrant {
        SaleEscrow storage escrow = saleEscrows[tokenId];
        require(escrow.seller != address(0), "Sale does not exist");
        require(escrow.buyer == msg.sender, "Not the buyer");
        require(escrow.nftDeposited, "NFT not in escrow");
        require(!escrow.paymentReceived, "Payment already received");
        require(msg.value == escrow.price, "Incorrect payment amount");

        // Mark payment as received
        escrow.paymentReceived = true;
        
        emit PaymentReceivedInEscrow(tokenId, msg.sender, msg.value);
        
        // Call internal version to avoid ReentrancyGuard conflict
        _completeSale(tokenId);
    }
    
    // Sale completion
    function completeSale(uint256 tokenId) public override nonReentrant {
        // Call internal implementation
        _completeSale(tokenId);
    }
    
    // Internal implementation of sale completion without nonReentrant modifier
    function _completeSale(uint256 tokenId) internal {
        SaleEscrow storage escrow = saleEscrows[tokenId];
        require(escrow.seller != address(0), "Sale does not exist");
        require(escrow.nftDeposited, "NFT not in escrow");
        require(escrow.paymentReceived, "Payment not received");
        
        // Only allow the regulator, seller, or buyer to complete the sale
        require(
            msg.sender == owner() || 
            msg.sender == escrow.seller || 
            msg.sender == escrow.buyer || 
            msg.sender == address(this),
            "Not authorized"
        );

        // Similar to createListingWithoutPreApproval, mark this transfer as approved internally
        // This resolves the "Transfer not approved by regulator" issue
        approvedTransfers[tokenId][address(this)][escrow.buyer] = true;

        // Transfer NFT to buyer
        IERC721(realEstateNFT).transferFrom(address(this), escrow.buyer, tokenId);
        
        // Transfer payment to seller
        (bool sent, ) = escrow.seller.call{value: escrow.price}("");
        require(sent, "Failed to send payment to seller");

        emit SaleCompleted(tokenId, escrow.seller, escrow.buyer, escrow.price);

        // Remove from pending sales
        _removeSaleListing(tokenId);
    }
    
    // Allow seller to cancel before payment received
    function cancelSale(uint256 tokenId) external override {
        SaleEscrow storage escrow = saleEscrows[tokenId];
        require(escrow.seller != address(0), "Sale does not exist");
        require(escrow.seller == msg.sender || msg.sender == owner(), "Not authorized");
        require(!escrow.paymentReceived, "Cannot cancel after payment received");
        
        // Return NFT to seller
        if (escrow.nftDeposited) {
            IERC721(realEstateNFT).transferFrom(address(this), escrow.seller, tokenId);
        }
        
        emit SaleCancelled(tokenId, escrow.seller, escrow.buyer);
        
        // Remove the sale listing
        _removeSaleListing(tokenId);
    }
    
    // Private helper to clean up sale listings
    function _removeSaleListing(uint256 tokenId) private {
        // Remove from pendingSaleTokenIds
        for (uint i = 0; i < pendingSaleTokenIds.length; i++) {
            if (pendingSaleTokenIds[i] == tokenId) {
                // Replace with the last element and pop
                pendingSaleTokenIds[i] = pendingSaleTokenIds[pendingSaleTokenIds.length - 1];
                pendingSaleTokenIds.pop();
                break;
            }
        }
        
        // Delete the escrow data
        delete saleEscrows[tokenId];
    }
    
    // Marketplace query functions
    function getAllListedProperties() external view override returns (SaleEscrow[] memory) {
        uint256 length = pendingSaleTokenIds.length;
        SaleEscrow[] memory allListings = new SaleEscrow[](length);
        
        for (uint256 i = 0; i < length; i++) {
            uint256 tokenId = pendingSaleTokenIds[i];
            allListings[i] = saleEscrows[tokenId];
        }
        
        return allListings;
    }
    
    function getPropertiesListedToBuyer(address buyer) external view override returns (SaleEscrow[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < pendingSaleTokenIds.length; i++) {
            uint256 tokenId = pendingSaleTokenIds[i];
            if (saleEscrows[tokenId].buyer == buyer) {
                count++;
            }
        }
        
        SaleEscrow[] memory buyerListings = new SaleEscrow[](count);
        
        uint256 index = 0;
        for (uint256 i = 0; i < pendingSaleTokenIds.length; i++) {
            uint256 tokenId = pendingSaleTokenIds[i];
            if (saleEscrows[tokenId].buyer == buyer) {
                buyerListings[index] = saleEscrows[tokenId];
                index++;
            }
        }
        
        return buyerListings;
    }
    
    function getPropertiesListedBySeller(address seller) external view override returns (SaleEscrow[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < pendingSaleTokenIds.length; i++) {
            uint256 tokenId = pendingSaleTokenIds[i];
            if (saleEscrows[tokenId].seller == seller) {
                count++;
            }
        }
        
        SaleEscrow[] memory sellerListings = new SaleEscrow[](count);
        
        uint256 index = 0;
        for (uint256 i = 0; i < pendingSaleTokenIds.length; i++) {
            uint256 tokenId = pendingSaleTokenIds[i];
            if (saleEscrows[tokenId].seller == seller) {
                sellerListings[index] = saleEscrows[tokenId];
                index++;
            }
        }
        
        return sellerListings;
    }
    
    // Handle getting pending sales for compatibility
    function getPendingSales() external view override returns (SaleEscrow[] memory) {
        uint256 length = pendingSaleTokenIds.length;
        SaleEscrow[] memory allListings = new SaleEscrow[](length);
        
        for (uint256 i = 0; i < length; i++) {
            uint256 tokenId = pendingSaleTokenIds[i];
            allListings[i] = saleEscrows[tokenId];
        }
        
        return allListings;
    }

    // Add this function to the Regulator contract
    function createListingWithoutPreApproval(uint256 tokenId, address buyer, uint256 price) external override {
        require(price > 0, "Price must be greater than 0");
        require(buyer != address(0), "Invalid buyer address");
        
        // Check if the sender is the owner of the NFT
        address owner = IERC721(realEstateNFT).ownerOf(tokenId);
        require(owner == msg.sender, "Not the owner");
        
        // Create sale escrow entry first
        saleEscrows[tokenId] = SaleEscrow({
            seller: msg.sender,
            buyer: buyer,
            tokenId: tokenId,
            price: price,
            nftDeposited: false, // Not yet deposited
            paymentReceived: false
        });
        
        pendingSaleTokenIds.push(tokenId);
        
        // Emit the property listed event
        emit PropertyListedForSale(tokenId, msg.sender, buyer, price);
        
        // Mark the transfer as approved in our internal system
        // This allows the seller to transfer to us directly later
        approvedTransfers[tokenId][msg.sender][address(this)] = true;
    }

    // Add a method for sellers to deposit after listing
    function depositListedNFT(uint256 tokenId) external override {
        SaleEscrow storage escrow = saleEscrows[tokenId];
        require(escrow.seller == msg.sender, "Not the seller");
        require(!escrow.nftDeposited, "NFT already deposited");
        
        // Transfer NFT to the regulator
        IERC721(realEstateNFT).transferFrom(msg.sender, address(this), tokenId);
        
        // Update the escrow
        escrow.nftDeposited = true;
        
        emit NFTDepositedToEscrow(tokenId, msg.sender);
    }
} 