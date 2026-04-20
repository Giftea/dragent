// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DUSD — Dragent USD
 * @notice Testnet stablecoin with EIP-3009 support for gasless transfers
 * @dev Drop-in replacement for PYUSD on Kite testnet
 */
contract DUSD is ERC20, EIP712, Ownable {

    enum AuthorizationState { Unused, Used, Canceled }

    mapping(address => mapping(bytes32 => AuthorizationState))
        private _authorizationStates;

    bytes32 private constant _TRANSFER_WITH_AUTHORIZATION_TYPEHASH =
        keccak256(
            "TransferWithAuthorization(address from,address to,uint256 value,"
            "uint256 validAfter,uint256 validBefore,bytes32 nonce)"
        );

    bytes32 private constant _CANCEL_AUTHORIZATION_TYPEHASH =
        keccak256("CancelAuthorization(address authorizer,bytes32 nonce)");

    event AuthorizationUsed(address indexed authorizer, bytes32 indexed nonce);
    event AuthorizationCanceled(address indexed authorizer, bytes32 indexed nonce);

    constructor(address initialHolder, uint256 initialSupply)
        ERC20("Dragent USD", "DUSD")
        EIP712("DUSD", "1")
        Ownable(initialHolder)
    {
        _mint(initialHolder, initialSupply);
    }

    // ── Faucet — anyone can mint 100 DUSD for testing ────
    function faucet() external {
        _mint(msg.sender, 100 * 10 ** decimals());
    }

    // ── Owner can mint any amount ─────────────────────────
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    function authorizationState(address authorizer, bytes32 nonce)
        external view returns (AuthorizationState)
    {
        return _authorizationStates[authorizer][nonce];
    }

    // ── EIP-3009: transferWithAuthorization ───────────────
    function transferWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v, bytes32 r, bytes32 s
    ) external {
        require(block.timestamp > validAfter,  "DUSD: not yet valid");
        require(block.timestamp < validBefore, "DUSD: expired");
        _requireUnused(from, nonce);

        bytes32 structHash = keccak256(abi.encode(
            _TRANSFER_WITH_AUTHORIZATION_TYPEHASH,
            from, to, value, validAfter, validBefore, nonce
        ));

        address signer = ECDSA.recover(_hashTypedDataV4(structHash), v, r, s);
        require(signer == from, "DUSD: invalid signature");

        _authorizationStates[from][nonce] = AuthorizationState.Used;
        emit AuthorizationUsed(from, nonce);
        _transfer(from, to, value);
    }

    // ── EIP-3009: cancelAuthorization ─────────────────────
    function cancelAuthorization(
        address authorizer,
        bytes32 nonce,
        uint8 v, bytes32 r, bytes32 s
    ) external {
        _requireUnused(authorizer, nonce);

        bytes32 structHash = keccak256(abi.encode(
            _CANCEL_AUTHORIZATION_TYPEHASH,
            authorizer, nonce
        ));

        address signer = ECDSA.recover(_hashTypedDataV4(structHash), v, r, s);
        require(signer == authorizer, "DUSD: invalid signature");

        _authorizationStates[authorizer][nonce] = AuthorizationState.Canceled;
        emit AuthorizationCanceled(authorizer, nonce);
    }

    function _requireUnused(address authorizer, bytes32 nonce) private view {
        require(
            _authorizationStates[authorizer][nonce] == AuthorizationState.Unused,
            "DUSD: already used"
        );
    }
}