// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC4907 {
    // Logged when the user of a NFT is changed or expires is changed
    event UpdateUser(uint256 indexed tokenId, address indexed user, uint64 expires);
    
    /// @notice set the user and expires of a NFT
    /// @dev The zero address indicates there is no user
    /// Throws if `tokenId` is not valid NFT
    /// @param user  The new user of the NFT
    /// @param expires  The timestamp when the user expires
    function setUser(uint256 tokenId, address user, uint64 expires) external;
    
    /// @notice Get the user address of an NFT
    /// @dev The zero address indicates that there is no user or the user is expired
    /// @param tokenId The NFT to get the user address for
    /// @return The user address for this NFT
    function userOf(uint256 tokenId) external view returns(address);
    
    /// @notice Get the user expires of an NFT
    /// @dev The zero value indicates that there is no user
    /// @param tokenId The NFT to get the user expires for
    /// @return The user expires for this NFT
    function userExpires(uint256 tokenId) external view returns(uint256);
} 