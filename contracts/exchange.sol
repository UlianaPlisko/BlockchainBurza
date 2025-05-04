// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import './token.sol';
import "hardhat/console.sol";


contract TokenExchange is Ownable {
    string public exchange_name = 'LoliExchange';

    address tokenAddr = 0x5FbDB2315678afecb367f032d93F642f64180aa3;
    Token public token = Token(tokenAddr);

    // Liquidity pool for the exchange
    uint private token_reserves = 0;
    uint private eth_reserves = 0;

    // Store LP shares as percentage * 1000 for precision
    mapping(address => uint) private lps;
    uint private constant SHARE_DENOMINATOR = 1000;
    uint private total_shares = 0;

    // Needed for looping through the keys of the lps mapping
    address[] private lp_providers;

    // liquidity rewards
    uint private swap_fee_numerator = 3;
    uint private swap_fee_denominator = 100;

    // Constant: x * y = k
    uint private k;

    constructor() {}

    function createPool(uint amountTokens) external payable onlyOwner {
        require(token_reserves == 0, "Token reserves was not 0");
        require(eth_reserves == 0, "ETH reserves was not 0.");
        require(msg.value > 0, "Need eth to create pool.");
        uint tokenSupply = token.balanceOf(msg.sender);
        require(amountTokens <= tokenSupply, "Not have enough tokens to create the pool");
        require(amountTokens > 0, "Need tokens to create pool.");

        token.transferFrom(msg.sender, address(this), amountTokens);
        token_reserves = token.balanceOf(address(this));
        eth_reserves = msg.value;
        k = token_reserves * eth_reserves;
    }

    function removeLP(uint index) private {
        require(index < lp_providers.length, "specified index is larger than the number of lps");
        lp_providers[index] = lp_providers[lp_providers.length - 1];
        lp_providers.pop();
    }

    function getSwapFee() public view returns (uint, uint) {
        return (swap_fee_numerator, swap_fee_denominator);
    }

    // Function addLiquidity: Adds liquidity given a supply of ETH
    function addLiquidity(uint max_exchange_rate, uint min_exchange_rate)
    external
    payable
    {
        require(msg.value > 0, "Must provide ETH");
        require(eth_reserves > 0 && token_reserves > 0, "Pool not initialized");

        // Calculate tokens needed based on current pool ratio
        uint tokens_needed = (msg.value * token_reserves) / eth_reserves;
        require(tokens_needed > 0, "Insufficient token amount");

        // Check exchange rate bounds
        uint current_rate = (token_reserves * 1000) / eth_reserves;
        require(current_rate <= max_exchange_rate, "Exchange rate too high");
        require(current_rate >= min_exchange_rate, "Exchange rate too low");

        // Calculate share of the pool
        uint new_eth_total = eth_reserves + msg.value;
        uint share = (msg.value * SHARE_DENOMINATOR) / new_eth_total;
        require(share > 0, "Share too small");

        // Transfer tokens (assume approval is done)
        token.transferFrom(msg.sender, address(this), tokens_needed);

        // Update reserves
        token_reserves = token.balanceOf(address(this));
        eth_reserves = address(this).balance;
        k = token_reserves * eth_reserves;
        console.log("addLiquidity: token_reserves after: %s, eth_reserves after: %s", token_reserves, eth_reserves);
        console.log("addLiquidity: k after: %s", k);

        // Update LP shares
        if (lps[msg.sender] == 0) {
            lp_providers.push(msg.sender);
        }
        lps[msg.sender] += share;
        total_shares += share;

        // Adjust existing providers' shares
        for (uint i = 0; i < lp_providers.length; i++) {
            if (lp_providers[i] != msg.sender && lps[lp_providers[i]] > 0) {
                lps[lp_providers[i]] = (lps[lp_providers[i]] * (new_eth_total - msg.value)) / new_eth_total;
            }
        }
    }

// Function removeLiquidity: Removes specified amount of liquidity
    function removeLiquidity(uint amountETH, uint max_exchange_rate, uint min_exchange_rate)
    public
    payable
    {
        require(amountETH > 0, "Must specify ETH amount");
        require(lps[msg.sender] > 0, "No liquidity provided");
        require(eth_reserves > amountETH, "Insufficient ETH reserves");
        require(token_reserves > 0, "Insufficient token reserves");

        // Check exchange rate bounds
        uint current_rate = (token_reserves * 1000) / eth_reserves;
        require(current_rate <= max_exchange_rate, "Exchange rate too high");
        require(current_rate >= min_exchange_rate, "Exchange rate too low");

        // Calculate share to remove
        uint user_share = lps[msg.sender];
        uint pool_share = (amountETH * SHARE_DENOMINATOR) / eth_reserves;
        require(pool_share <= user_share, "Insufficient liquidity share");

        // Calculate tokens to return
        uint tokens_to_return = (amountETH * token_reserves) / eth_reserves;
        require(tokens_to_return > 0, "Insufficient token amount");
        require(token_reserves - tokens_to_return >= 1, "Must leave at least 1 token");
        require(eth_reserves - amountETH >= 1, "Must leave at least 1 ETH");

        // Update reserves
        eth_reserves -= amountETH;
        token_reserves -= tokens_to_return;
        k = token_reserves * eth_reserves;

        // Update LP shares
        lps[msg.sender] -= pool_share;
        total_shares -= pool_share;
        if (lps[msg.sender] == 0) {
            for (uint i = 0; i < lp_providers.length; i++) {
                if (lp_providers[i] == msg.sender) {
                    removeLP(i);
                    break;
                }
            }
        }

        // Transfer assets back to user
        token.transfer(msg.sender, tokens_to_return);
        payable(msg.sender).transfer(amountETH);
    }

// Function removeAllLiquidity: Removes all liquidity
    function removeAllLiquidity(uint max_exchange_rate, uint min_exchange_rate)
    external
    payable
    {
        require(lps[msg.sender] > 0, "No liquidity provided");
        require(eth_reserves > 1, "Insufficient ETH reserves");
        require(token_reserves > 1, "Insufficient token reserves");

        // Check exchange rate bounds
        uint current_rate = (token_reserves * 1000) / eth_reserves;
        require(current_rate <= max_exchange_rate, "Exchange rate too high");
        require(current_rate >= min_exchange_rate, "Exchange rate too low");

        // Calculate amounts to return
        uint user_share = lps[msg.sender];
        uint amountETH = (user_share * eth_reserves) / SHARE_DENOMINATOR;
        uint tokens_to_return = (user_share * token_reserves) / SHARE_DENOMINATOR;

        require(amountETH > 0, "No ETH to withdraw");
        require(tokens_to_return > 0, "No tokens to withdraw");
        require(eth_reserves - amountETH >= 1, "Must leave at least 1 ETH");
        require(token_reserves - tokens_to_return >= 1, "Must leave at least 1 token");

        // Update reserves
        eth_reserves -= amountETH;
        token_reserves -= tokens_to_return;
        k = token_reserves * eth_reserves;

        total_shares -= user_share;
        lps[msg.sender] = 0;
        for (uint i = 0; i < lp_providers.length; i++) {
            if (lp_providers[i] == msg.sender) {
                removeLP(i);
                break;
            }
        }

        // Transfer assets back to user
        token.transfer(msg.sender, tokens_to_return);
        payable(msg.sender).transfer(amountETH);
    }

    // Function swapTokensForETH: Swaps tokens for ETH
    function swapTokensForETH(uint amountTokens, uint max_exchange_rate)
    external
    payable
    {
        require(amountTokens > 0, "Must provide tokens");
        require(eth_reserves > 1, "Insufficient ETH reserves");

        // Check exchange rate
        uint current_rate = (token_reserves * 1000) / eth_reserves;
        require(current_rate <= max_exchange_rate, "Exchange rate too high");

        // Calculate ETH to send
        uint eth_to_send = (amountTokens * eth_reserves) / (token_reserves + amountTokens);
        require(eth_to_send > 0, "Insufficient ETH amount");
        require(eth_reserves - eth_to_send >= 1, "Must leave at least 1 ETH");

        // Apply fee
        uint fee = (eth_to_send * swap_fee_numerator) / swap_fee_denominator;
        eth_to_send -= fee;

        // Update reserves
        token_reserves += amountTokens;
        eth_reserves -= eth_to_send;
        k = token_reserves * eth_reserves;

        // Transfer assets
        token.transferFrom(msg.sender, address(this), amountTokens);
        payable(msg.sender).transfer(eth_to_send);
    }

    // Function swapETHForTokens: Swaps ETH for tokens
    function swapETHForTokens(uint max_exchange_rate)
    external
    payable
    {
        require(msg.value > 0, "Must provide ETH");
        require(token_reserves > 1, "Insufficient token reserves");

        // Check exchange rate
        uint current_rate = (token_reserves * 1000) / eth_reserves;
        require(current_rate <= max_exchange_rate, "Exchange rate too high");

        // Calculate tokens to send
        uint tokens_to_send = (msg.value * token_reserves) / (eth_reserves + msg.value);
        require(tokens_to_send > 0, "Insufficient token amount");
        require(token_reserves - tokens_to_send >= 1, "Must leave at least 1 token");

        // Apply fee
        uint fee = (tokens_to_send * swap_fee_numerator) / swap_fee_denominator;
        tokens_to_send -= fee;

        // Update reserves
        eth_reserves += msg.value;
        token_reserves -= tokens_to_send;
        k = token_reserves * eth_reserves;

        // Transfer tokens to user
        token.transfer(msg.sender, tokens_to_send);
    }
}