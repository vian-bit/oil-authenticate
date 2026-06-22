// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * OilGuard - Smart contract sederhana untuk verifikasi keaslian oli.
 * Deploy ke Polygon Mumbai / Amoy testnet.
 *
 * Catatan: Frontend prototype mensimulasikan kontrak ini di localStorage.
 */
contract OilGuard {
    enum Status { None, Active, Used }

    struct Product {
        bytes32 hash;       // keccak256(productCode + batch + producedAt)
        Status status;
        uint256 registeredAt;
        uint256 verifiedAt;
        address verifier;
    }

    address public admin;
    mapping(bytes32 => Product) public products;
    uint256 public totalRegistered;
    uint256 public totalVerified;

    event ProductRegistered(string productCode, string productName, bytes32 indexed hash, uint256 timestamp);
    event ProductVerified(string productCode, address indexed verifier, bytes32 indexed hash, uint256 timestamp);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function registerProduct(string calldata productCode, string calldata productName, bytes32 _hash) external onlyAdmin {
        require(products[_hash].status == Status.None, "Already registered");
        products[_hash] = Product({
            hash: _hash,
            status: Status.Active,
            registeredAt: block.timestamp,
            verifiedAt: 0,
            verifier: address(0)
        });
        totalRegistered++;
        emit ProductRegistered(productCode, productName, _hash, block.timestamp);
    }

    /// @notice Verifikasi produk. Setiap pemanggilan memancarkan event sehingga
    /// seluruh aktivitas tercatat di transaction history.
    function verifyProduct(string calldata productCode, bytes32 _hash) external returns (Status) {
        Product storage p = products[_hash];
        emit ProductVerified(productCode, msg.sender, _hash, block.timestamp);
        if (p.status == Status.None) return Status.None;
        if (p.status == Status.Used) return Status.Used;

        p.status = Status.Used;
        p.verifiedAt = block.timestamp;
        p.verifier = msg.sender;
        totalVerified++;
        return Status.Active;
    }

    function getProduct(bytes32 _hash) external view returns (Product memory) {
        return products[_hash];
    }
}
