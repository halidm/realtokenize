// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BasketToken
 * @dev ERC20 token representing fractional ownership of real estate NFTs
 */
contract BasketToken is ERC20, Ownable {
    address private _vaultAddress;

    // Constructor
    constructor() ERC20("Real Estate Basket Token", "REBT") {}

    /**
     * @dev Sets the vault address
     * @param vaultAddress The address of the vault contract
     */
    function setVaultAddress(address vaultAddress) external onlyOwner {
        _vaultAddress = vaultAddress;
    }

    /**
     * @dev Returns the vault address
     * @return The address of the vault contract
     */
    function getVaultAddress() external view returns (address) {
        return _vaultAddress;
    }

    /**
     * @dev Mints new tokens
     * @param to The address that will receive the minted tokens
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) external {
        require(msg.sender == _vaultAddress || msg.sender == owner(), "Only vault or owner can mint");
        _mint(to, amount);
    }

    /**
     * @dev Burns tokens
     * @param from The address whose tokens will be burned
     * @param amount The amount of tokens to burn
     */
    function burn(address from, uint256 amount) external {
        require(msg.sender == _vaultAddress || msg.sender == owner() || msg.sender == from, "Not authorized to burn");
        _burn(from, amount);
    }
} 