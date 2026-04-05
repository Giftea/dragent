// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IReputationRegistry {
    function authorizeCaller(address caller) external;
    function getTier(address agentId) external view returns (uint8);
    function getBudgetLimit(address agentId) external view returns (uint256);
    function recordTrade(address agentId, bool won, int256 pnlBps) external;
}
