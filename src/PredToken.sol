// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract PredToken is ERC20, Ownable {
    constructor(uint256 initialSupply) ERC20("Prediction Token", "PRED") Ownable(msg.sender) {
        if (initialSupply > 0) {
            _mint(msg.sender, initialSupply);
        }
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
