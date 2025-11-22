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
                emit AttendanceRecorded(sessionId, students[i], tokenId);
            }
        }
    }
}


