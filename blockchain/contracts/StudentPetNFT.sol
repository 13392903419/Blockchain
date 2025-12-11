// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title StudentPetNFT
 * @dev Dynamic NFT that evolves based on student performance.
 * Stages: 0=Seed, 1=Sprout, 2=Flower, 3=Withered
 * Fully decentralized: All experience and stage data stored on-chain
 */
contract StudentPetNFT is ERC721, Ownable {
    // Start tokenId from 1 to avoid zero being treated as "no pet"
    uint256 private _nextTokenId = 1;

    // Stage definitions
    enum Stage { Seed, Sprout, Flower, Withered }

    // Mapping from tokenId to current Stage
    mapping(uint256 => Stage) public petStages;

    // Mapping from tokenId to experience points
    mapping(uint256 => uint256) public petExperience;

    // Mapping from student address to tokenId (one pet per student)
    mapping(address => uint256) public studentToTokenId;

    // Mapping from Stage to Metadata URI
    mapping(Stage => string) public stageURIs;

    // Experience thresholds for each stage (in XP)
    uint256 public constant SEED_TO_SPROUT = 100;    // 0-99: Seed
    uint256 public constant SPROUT_TO_FLOWER = 200;   // 100-199: Sprout
    // 200+: Flower

    event PetMinted(address indexed student, uint256 tokenId);
    event PetEvolved(uint256 indexed tokenId, Stage oldStage, Stage newStage);
    event ExperienceAdded(uint256 indexed tokenId, uint256 amount, uint256 newTotal);

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
     * Only one pet per student address.
     */
    function mintPet(address student) external onlyOwner returns (uint256) {
        require(studentToTokenId[student] == 0, "Student already has a pet");
        
        uint256 tokenId = _nextTokenId++;
        _safeMint(student, tokenId);
        petStages[tokenId] = Stage.Seed;
        petExperience[tokenId] = 0;
        studentToTokenId[student] = tokenId;
        
        emit PetMinted(student, tokenId);
        return tokenId;
    }

    /**
     * @dev Get or create pet tokenId for a student.
     * If student doesn't have a pet, mint one automatically.
     */
    function getOrCreatePetTokenId(address student) external onlyOwner returns (uint256) {
        uint256 tokenId = studentToTokenId[student];
        if (tokenId == 0) {
            // Auto-mint if doesn't exist (inline implementation to avoid forward reference)
            require(studentToTokenId[student] == 0, "Student already has a pet");
            
            tokenId = _nextTokenId++;
            _safeMint(student, tokenId);
            petStages[tokenId] = Stage.Seed;
            petExperience[tokenId] = 0;
            studentToTokenId[student] = tokenId;
            
            emit PetMinted(student, tokenId);
        }
        return tokenId;
    }

    /**
     * @dev Add experience points to a student's pet.
     * Automatically upgrades stage if threshold is reached.
     * @param studentAddress The student's address
     * @param amount The amount of XP to add
     */
    function addExperience(address studentAddress, uint256 amount) external onlyOwner {
        uint256 tokenId = studentToTokenId[studentAddress];
        // tokenId can be 0 if the first pet was minted before this fix; rely on ownership check instead
        require(_ownerOf(tokenId) != address(0), "Student does not have a pet");

        Stage oldStage = petStages[tokenId];
        petExperience[tokenId] += amount;
        
        // Auto-upgrade stage based on experience
        Stage newStage = _calculateStage(petExperience[tokenId]);
        
        if (newStage != oldStage) {
            petStages[tokenId] = newStage;
            emit PetEvolved(tokenId, oldStage, newStage);
        }
        
        emit ExperienceAdded(tokenId, amount, petExperience[tokenId]);
    }

    /**
     * @dev Internal function to calculate stage based on experience.
     */
    function _calculateStage(uint256 experience) internal pure returns (Stage) {
        if (experience >= SPROUT_TO_FLOWER) {
            return Stage.Flower;
        } else if (experience >= SEED_TO_SPROUT) {
            return Stage.Sprout;
        } else {
            return Stage.Seed;
        }
    }

    /**
     * @dev Get pet information for a student.
     * @param studentAddress The student's address
     * @return tokenId The pet's token ID
     * @return stage The current stage
     * @return experience The current experience points
     */
    function getPetInfo(address studentAddress) external view returns (
        uint256 tokenId,
        Stage stage,
        uint256 experience
    ) {
        tokenId = studentToTokenId[studentAddress];
        if (tokenId == 0) {
            return (0, Stage.Seed, 0);
        }
        stage = petStages[tokenId];
        experience = petExperience[tokenId];
    }

    /**
     * @dev Update the stage of a pet manually (for admin use).
     * Note: This is separate from automatic stage calculation.
     */
    function updateStage(uint256 tokenId, Stage newStage) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        Stage oldStage = petStages[tokenId];
        petStages[tokenId] = newStage;
        emit PetEvolved(tokenId, oldStage, newStage);
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
