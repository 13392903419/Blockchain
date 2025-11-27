// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IAttendanceNFT {
    function ownerOf(uint256 tokenId) external view returns (address);
    function burn(uint256 tokenId) external;
    function tokenSessionIds(uint256 tokenId) external view returns (uint256);
}

/**
 * @title AttendanceSynthesizer
 * @dev Allows students to synthesize multiple Attendance NFTs into a "Perfect Attendance" SBT.
 */
contract AttendanceSynthesizer is ERC721, Ownable {
    uint256 private _nextTokenId;
    
    IAttendanceNFT public attendanceNft;

    constructor(address initialOwner, address _attendanceNft) 
        ERC721("Perfect Attendance Award", "PAA") 
        Ownable(initialOwner) 
    {
        attendanceNft = IAttendanceNFT(_attendanceNft);
    }

    /**
     * @dev Synthesize a new award by burning existing attendance tokens.
     * @param tokenIds List of attendance token IDs to burn.
     * @param requiredSessionIds List of session IDs that MUST be present in the token list.
     */
    function synthesize(uint256[] calldata tokenIds, uint256[] calldata requiredSessionIds) external {
        require(tokenIds.length == requiredSessionIds.length, "Length mismatch");
        
        // Track which sessions are covered
        // Using a simple array check (O(N^2)) since N is small (e.g. 16 weeks)
        bool[] memory sessionFound = new bool[](requiredSessionIds.length);

        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            
            // 1. Check ownership
            require(attendanceNft.ownerOf(tokenId) == msg.sender, "Not token owner");
            
            // 2. Check session ID
            uint256 sessionId = attendanceNft.tokenSessionIds(tokenId);
            
            // Mark session as found
            bool found = false;
            for(uint256 j = 0; j < requiredSessionIds.length; j++) {
                if(requiredSessionIds[j] == sessionId && !sessionFound[j]) {
                    sessionFound[j] = true;
                    found = true;
                    break;
                }
            }
            require(found, "Token does not match any required session or duplicate");

            // 3. Burn the token (User must have setApprovalForAll to this contract)
            attendanceNft.burn(tokenId);
        }

        // Verify all sessions covered
        for(uint256 j = 0; j < requiredSessionIds.length; j++) {
            require(sessionFound[j], "Missing session");
        }

        // Mint the reward
        uint256 newTokenId = _nextTokenId++;
        _safeMint(msg.sender, newTokenId);
    }
}
