// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CertificateSBT
 * @dev Soulbound Token for Academic Certificates.
 * Non-transferable once minted.
 */
contract CertificateSBT is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    event CertificateIssued(address indexed student, uint256 tokenId, string tokenURI);

    constructor(address initialOwner) ERC721("Academic Certificate SBT", "CERT") Ownable(initialOwner) {}

    /**
     * @dev Mints a new certificate to a student.
     * Only the owner (teacher/admin) can call this.
     */
    function issueCertificate(address student, string memory _tokenURI) external onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(student, tokenId);
        _setTokenURI(tokenId, _tokenURI);
        emit CertificateIssued(student, tokenId, _tokenURI);
        return tokenId;
    }

    /**
     * @dev Overrides _update to prevent transfers, making it Soulbound.
     * Allows minting (from=0) and burning (to=0), but not transfers between users.
     */
    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);
        
        // Allow minting (from == 0) and burning (to == 0)
        // Disallow transfers (from != 0 && to != 0)
        if (from != address(0) && to != address(0)) {
            revert("CertificateSBT: Transfer is not allowed (Soulbound)");
        }

        return super._update(to, tokenId, auth);
    }
}
