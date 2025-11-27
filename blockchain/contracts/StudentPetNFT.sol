// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title StudentPetNFT
 * @dev Dynamic NFT that evolves based on student performance.
 * Stages: 0=Seed, 1=Sprout, 2=Flower, 3=Withered
 */
contract StudentPetNFT is ERC721, Ownable {
    uint256 private _nextTokenId;

    // Stage definitions
    enum Stage { Seed, Sprout, Flower, Withered }

    // Mapping from tokenId to current Stage
    mapping(uint256 => Stage) public petStages;

    // Mapping from Stage to Metadata URI
    mapping(Stage => string) public stageURIs;

    event PetMinted(address indexed student, uint256 tokenId);
    event PetEvolved(uint256 indexed tokenId, Stage newStage);

    constructor(address initialOwner) ERC721("Student Growth Pet", "PET") Ownable(initialOwner) {
        // Set default URIs (placeholders)
        stageURIs[Stage.Seed] = "ipfs://QmSeed...";
        stageURIs[Stage.Sprout] = "ipfs://QmSprout...";
        stageURIs[Stage.Flower] = "ipfs://QmFlower...";
        stageURIs[Stage.Withered] = "ipfs://QmWithered...";
    }

    /**
     * @dev Set the URI for a specific stage.
     */
    function setStageURI(Stage stage, string memory uri) external onlyOwner {
        stageURIs[stage] = uri;
    }

    /**
     * @dev Mint a new Pet (Seed) to a student.
     */
    function mintPet(address student) external onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(student, tokenId);
        petStages[tokenId] = Stage.Seed;
        emit PetMinted(student, tokenId);
        return tokenId;
    }

    /**
     * @dev Update the stage of a pet.
     * Called by backend based on grades/attendance.
     */
    function updateStage(uint256 tokenId, Stage newStage) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        petStages[tokenId] = newStage;
        emit PetEvolved(tokenId, newStage);
    }

    /**
     * @dev Return the URI based on the current stage.
     */
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        _requireOwned(tokenId);
        Stage currentStage = petStages[tokenId];
        return stageURIs[currentStage];
    }
}
