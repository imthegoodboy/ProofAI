// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ProofAI document verification registry
/// @notice Stores compact, immutable verification receipts. Document bytes remain encrypted on 0G Storage.
contract ProofRegistry {
    struct Proof {
        string verificationId;
        uint8 proofScore;
        uint8 riskLevel;
        bytes32 documentRoot;
        bytes32 reportRoot;
        uint64 recordedAt;
    }

    address public immutable verifier;
    mapping(bytes32 documentHash => Proof proof) private proofs;

    error Unauthorized();
    error InvalidProof();
    error ProofConflict();

    event ProofRecorded(
        bytes32 indexed documentHash,
        string verificationId,
        uint8 proofScore,
        uint8 riskLevel,
        bytes32 documentRoot,
        bytes32 reportRoot,
        uint64 recordedAt
    );

    constructor(address initialVerifier) {
        if (initialVerifier == address(0)) revert InvalidProof();
        verifier = initialVerifier;
    }

    function recordProof(
        bytes32 documentHash,
        string calldata verificationId,
        uint8 proofScore,
        uint8 riskLevel,
        bytes32 documentRoot,
        bytes32 reportRoot
    ) external {
        if (msg.sender != verifier) revert Unauthorized();
        if (documentHash == bytes32(0) || bytes(verificationId).length == 0 || proofScore > 100 || riskLevel > 2) {
            revert InvalidProof();
        }

        Proof storage existing = proofs[documentHash];
        if (existing.recordedAt != 0) {
            if (
                keccak256(bytes(existing.verificationId)) != keccak256(bytes(verificationId)) ||
                existing.proofScore != proofScore ||
                existing.riskLevel != riskLevel ||
                existing.documentRoot != documentRoot ||
                existing.reportRoot != reportRoot
            ) revert ProofConflict();
            return;
        }

        uint64 recordedAt = uint64(block.timestamp);
        proofs[documentHash] = Proof({
            verificationId: verificationId,
            proofScore: proofScore,
            riskLevel: riskLevel,
            documentRoot: documentRoot,
            reportRoot: reportRoot,
            recordedAt: recordedAt
        });
        emit ProofRecorded(
            documentHash,
            verificationId,
            proofScore,
            riskLevel,
            documentRoot,
            reportRoot,
            recordedAt
        );
    }

    function getProof(bytes32 documentHash) external view returns (Proof memory) {
        return proofs[documentHash];
    }
}
