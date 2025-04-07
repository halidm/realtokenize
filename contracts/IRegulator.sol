// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IRegulator {
    // Structs
    struct TransferRequest {
        address from;
        address to;
        uint256 tokenId;
        bool approved;
    }
    
    struct SaleEscrow {
        address seller;
        address buyer;
        uint256 tokenId;
        uint256 price;
        bool nftDeposited;
        bool paymentReceived;
    }

    // Events
    event TransferRequested(uint256 indexed tokenId, address indexed from, address indexed to);
    event TransferApproved(uint256 indexed tokenId, address indexed from, address indexed to);
    
    event PropertyListedForSale(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price);
    event NFTDepositedToEscrow(uint256 indexed tokenId, address seller);
    event PaymentReceivedInEscrow(uint256 indexed tokenId, address buyer, uint256 amount);
    event SaleCompleted(uint256 indexed tokenId, address seller, address buyer, uint256 price);
    event SaleCancelled(uint256 indexed tokenId, address seller, address buyer);

    // Transfer approval functions (for regular transfers, not sales)
    function requestTransferApproval(uint256 tokenId, address to) external;
    function approveTransfer(uint256 tokenId, address from, address to) external;
    function isTransferApproved(uint256 tokenId, address from, address to) external view returns (bool);
    function getPendingTransfers() external view returns (TransferRequest[] memory);
    
    // Enhanced escrow sale functions
    function listPropertyForSale(uint256 tokenId, address buyer, uint256 price) external;
    
    // New multi-step listing functions
    function createListingWithoutPreApproval(uint256 tokenId, address buyer, uint256 price) external;
    function depositListedNFT(uint256 tokenId) external;
    
    // Status check functions
    function isNFTInEscrow(uint256 tokenId) external view returns (bool);
    function isPaymentReceived(uint256 tokenId) external view returns (bool);
    function getSaleStatus(uint256 tokenId) external view returns (
        bool exists,
        bool nftDeposited,
        bool paymentReceived
    );
    
    // Get sale details
    function getSaleEscrowDetails(uint256 tokenId) external view returns (
        address seller,
        address buyer,
        uint256 price,
        bool nftDeposited,
        bool paymentReceived
    );
    
    // Payment function
    function depositPayment(uint256 tokenId) external payable;
    
    // Sale completion
    function completeSale(uint256 tokenId) external;
    
    // Allow seller to cancel before payment received
    function cancelSale(uint256 tokenId) external;
    
    // Marketplace query functions
    function getAllListedProperties() external view returns (SaleEscrow[] memory);
    function getPropertiesListedToBuyer(address buyer) external view returns (SaleEscrow[] memory);
    function getPropertiesListedBySeller(address seller) external view returns (SaleEscrow[] memory);
    function getPendingSales() external view returns (SaleEscrow[] memory);
} 