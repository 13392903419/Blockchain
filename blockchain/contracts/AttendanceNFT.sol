// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IRoleManager {
    function isTeacher(address account) external view returns (bool);
}

contract AttendanceNFT is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId = 1;

    // sessionId => minted(address => bool)
    mapping(uint256 => mapping(address => bool)) public hasAttended;
    
    // tokenId => sessionId (New: For Synthesis verification)
    mapping(uint256 => uint256) public tokenSessionIds;

    // RoleManager合约地址
    address public roleManager;

    event AttendanceRecorded(uint256 indexed sessionId, address indexed student, uint256 tokenId);
    event RoleManagerUpdated(address indexed oldRoleManager, address indexed newRoleManager);

    constructor(address initialOwner) ERC721("Attendance NFT", "ATND") Ownable(initialOwner) {}

    // 设置RoleManager合约地址
    function setRoleManager(address _roleManager) external onlyOwner {
        address oldRoleManager = roleManager;
        roleManager = _roleManager;
        emit RoleManagerUpdated(oldRoleManager, _roleManager);
    }

    // 教师权限修饰符
    modifier onlyTeacher() {
        require(
            msg.sender == owner() || (roleManager != address(0) && IRoleManager(roleManager).isTeacher(msg.sender)),
            "Only owner or teacher can call this function"
        );
        _;
    }

    function mintAttendance(
        uint256 sessionId,
        address student,
        string memory tokenUri
    ) external onlyTeacher returns (uint256 tokenId) {
        require(!hasAttended[sessionId][student], "Already attended");
        tokenId = _nextTokenId++;
        _safeMint(student, tokenId);
        _setTokenURI(tokenId, tokenUri);
        
        hasAttended[sessionId][student] = true;
        tokenSessionIds[tokenId] = sessionId; // Record session ID
        
        emit AttendanceRecorded(sessionId, student, tokenId);
    }

    function batchMintAttendance(
        uint256 sessionId,
        address[] calldata students,
        string calldata baseTokenUri
    ) external onlyTeacher {
        for (uint256 i = 0; i < students.length; i++) {
            if (!hasAttended[sessionId][students[i]]) {
                uint256 tokenId = _nextTokenId++;
                _safeMint(students[i], tokenId);
                _setTokenURI(tokenId, baseTokenUri);
                
                hasAttended[sessionId][students[i]] = true;
                tokenSessionIds[tokenId] = sessionId; // Record session ID
                
                emit AttendanceRecorded(sessionId, students[i], tokenId);
            }
        }
    }
    
    /**
     * @dev Burn a token.
     * Useful for Synthesis (burning 10 POAPs to get 1 Master Badge).
     * Only owner or approved operator can burn.
     */
    function burn(uint256 tokenId) external {
        // Solidiity's _update or _burn handles authorization check (msg.sender must be owner or approved)
        // But since we are using OpenZeppelin 5.x, we can just call _burn if we want to implement burnable manually
        // OR better: inherit ERC721Burnable.
        // However, since I am editing the file content directly and don't want to change imports if I can avoid it (to minimize diffs),
        // I will implement a simple burn function that calls _burn.
        // Check ownership/approval
        address owner = _ownerOf(tokenId);
        require(
            _isAuthorized(owner, msg.sender, tokenId), 
            "ERC721: caller is not token owner or approved"
        );
        _burn(tokenId);
    }
}


