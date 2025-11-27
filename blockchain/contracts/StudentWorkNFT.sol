// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title StudentWorkNFT
 * @dev Allows students to mint their work as NFTs.
 * Teachers can endorse (verify) the work.
 */
contract StudentWorkNFT is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    // Mapping to store endorsement status
    mapping(uint256 => bool) public isEndorsed;

    event WorkMinted(address indexed student, uint256 tokenId, string tokenURI);
    event WorkEndorsed(uint256 indexed tokenId, address indexed teacher);

    constructor(address initialOwner) ERC721("Student Work IP", "WORK") Ownable(initialOwner) {}

    /**
     * @dev Students mint their own work.
     * Anyone can mint, but the value comes from the Teacher's endorsement.
     */
    function mintWork(string memory _tokenURI) external returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, _tokenURI);
        emit WorkMinted(msg.sender, tokenId, _tokenURI);
        return tokenId;
    }

    /**
     * @dev Teachers (owner) endorse a specific work.
     * This adds a "Verified" status on-chain.
     */
    function endorseWork(uint256 tokenId) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        isEndorsed[tokenId] = true;
        emit WorkEndorsed(tokenId, msg.sender);
    }
}
