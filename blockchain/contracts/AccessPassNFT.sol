// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";

/**
 * @title AccessPassNFT
 * @dev ERC1155 tokens for Access Passes (e.g., Office Hours, Lab Access).
 * Teachers mint, Students burn to redeem.
 */
contract AccessPassNFT is ERC1155, Ownable, ERC1155Burnable {
    
    // Token IDs for different pass types
    uint256 public constant OFFICE_HOUR_PASS = 1;
    uint256 public constant LAB_ACCESS_PASS = 2;
    uint256 public constant WORKSHOP_PASS = 3;

    constructor(address initialOwner) ERC1155("https://api.example.com/metadata/{id}.json") Ownable(initialOwner) {}

    /**
     * @dev Set the base URI for metadata.
     */
    function setURI(string memory newuri) public onlyOwner {
        _setURI(newuri);
    }

    /**
     * @dev Mint passes to a student.
     */
    function mint(address account, uint256 id, uint256 amount, bytes memory data)
        public
        onlyOwner
    {
        _mint(account, id, amount, data);
    }

    /**
     * @dev Batch mint passes.
     */
    function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data)
        public
        onlyOwner
    {
        _mintBatch(to, ids, amounts, data);
    }

    /**
     * @dev Students can burn their own passes to "redeem" them.
     * The backend should listen for the TransferSingle event to address(0).
     */
    function redeem(uint256 id, uint256 amount) public {
        burn(msg.sender, id, amount);
    }
}
