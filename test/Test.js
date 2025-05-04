const { expect } = require("chai");
const { ethers } = require("hardhat");

console.log("Starting TokenExchange test suite");

describe("TokenExchange", function () {
  let Token, Exchange, token, exchange, owner;

  beforeEach(async function () {
    console.log("Running beforeEach setup");
    [owner] = await ethers.getSigners();
    console.log(`Owner address: ${owner.address}`);

    console.log("Deploying Token contract");
    Token = await ethers.getContractFactory("Token");
    token = await Token.deploy();
    await token.deployed();
    console.log(`Token deployed at: ${token.address}`);

    console.log("Minting 10000 tokens");
    await token.mint(ethers.utils.parseEther("10000"));
    const ownerBalance = await token.balanceOf(owner.address);
    console.log(`Owner token balance after mint: ${ethers.utils.formatEther(ownerBalance)}`);

    console.log("Deploying TokenExchange contract");
    Exchange = await ethers.getContractFactory("TokenExchange");
    exchange = await Exchange.deploy();
    await exchange.deployed();
    console.log(`Exchange deployed at: ${exchange.address}`);

    console.log("Approving 10000 tokens for exchange");
    const approveTx = await token.connect(owner).approve(exchange.address, ethers.utils.parseEther("10000"));
    await approveTx.wait();
    const allowance = await token.allowance(owner.address, exchange.address);
    console.log(`Owner allowance for exchange: ${ethers.utils.formatEther(allowance)}`);
  });

  it("Should perform all TokenExchange operations successfully", async function () {
    console.log("Running combined TokenExchange test");

    // Create pool
    console.log("Creating pool with 1000 tokens and 1 ETH");
    const tokensForPool = ethers.utils.parseEther("1000");
    console.log(`Approving ${ethers.utils.formatEther(tokensForPool)} tokens for createPool`);
    await token.connect(owner).approve(exchange.address, tokensForPool).then(tx => tx.wait());
    const allowanceBeforePool = await token.allowance(owner.address, exchange.address);
    console.log(`Allowance before createPool: ${ethers.utils.formatEther(allowanceBeforePool)}`);
    const ownerBalanceBeforePool = await token.balanceOf(owner.address);
    console.log(`Owner balance before createPool: ${ethers.utils.formatEther(ownerBalanceBeforePool)}`);

    try {
      await expect(
          exchange.connect(owner).createPool(tokensForPool, {
            value: ethers.utils.parseEther("1"),
          })
      ).to.not.be.reverted;

      const ethBalance = await ethers.provider.getBalance(exchange.address);
      const tokenBalance = await token.balanceOf(exchange.address);
      console.log(`Pool state: eth_balance=${ethers.utils.formatEther(ethBalance)}, token_balance=${ethers.utils.formatEther(tokenBalance)}`);

      expect(ethBalance).to.equal(ethers.utils.parseEther("1"));
      expect(tokenBalance).to.equal(ethers.utils.parseEther("1000"));
    } catch (error) {
      console.error(`Error in createPool: ${error.message}`);
      throw error;
    }

    // Add liquidity
    console.log("Adding liquidity with 0.5 ETH and 500 tokens");
    const tokenLiquidity = ethers.utils.parseEther("1000");
    const ethLiquidity = ethers.utils.parseEther("1");
    const amountEth = ethers.utils.parseEther("0.5");
    const tokensNeeded = amountEth.mul(tokenLiquidity).div(ethLiquidity);
    console.log(`Calculated tokensNeeded: ${ethers.utils.formatEther(tokensNeeded)}`);

    const ownerBalance = await token.balanceOf(owner.address);
    console.log(`Owner token balance before addLiquidity: ${ethers.utils.formatEther(ownerBalance)}`);

    console.log(`Approving ${ethers.utils.formatEther(tokensNeeded)} tokens for addLiquidity`);
    await token.connect(owner).approve(exchange.address, tokensNeeded).then(tx => tx.wait());
    const allowanceBeforeAdd = await token.allowance(owner.address, exchange.address);
    console.log(`Allowance before addLiquidity: ${ethers.utils.formatEther(allowanceBeforeAdd)}`);

    const currentRate = tokenLiquidity.mul(1000).div(ethLiquidity);
    const slippagePct = 1; // 1% slippage
    const maxExchangeRate = currentRate.mul(100 + slippagePct).div(100);
    const minExchangeRate = 0;
    console.log(`addLiquidity params: maxExchangeRate=${maxExchangeRate.toString()}, minExchangeRate=${minExchangeRate}, amountEth=${ethers.utils.formatEther(amountEth)}`);

    try {
      await expect(
          exchange.connect(owner).addLiquidity(maxExchangeRate, minExchangeRate, {
            value: amountEth,
          })
      ).to.not.be.reverted;
    } catch (error) {
      console.error(`Error in addLiquidity: ${error.message}`);
      throw error;
    }

    // Remove some liquidity
    console.log("Removing 1 ETH worth of liquidity");
    try {
      await expect(
          exchange.connect(owner).removeLiquidity("1", maxExchangeRate, minExchangeRate)
      ).to.not.be.reverted;
    } catch (error) {
      console.error(`Error in removeLiquidity: ${error.message}`);
      throw error;
    }

    // Add liquidity again for remove all liquidity test
    console.log("Adding liquidity again for remove all liquidity");
    await token.connect(owner).approve(exchange.address, tokensNeeded).then(tx => tx.wait());
    await exchange.connect(owner).addLiquidity(maxExchangeRate, minExchangeRate, {
      value: amountEth,
    });

    // Remove all liquidity
    console.log("Removing all liquidity");
    try {
      await expect(
          exchange.connect(owner).removeAllLiquidity(maxExchangeRate, minExchangeRate)
      ).to.not.be.reverted;
    } catch (error) {
      console.error(`Error in removeAllLiquidity: ${error.message}`);
      throw error;
    }

    // Swap tokens for ETH
    console.log("Swapping 50 tokens for ETH");
    await token.connect(owner).approve(exchange.address, ethers.utils.parseEther("50")).then(tx => tx.wait());
    try {
      await expect(
          exchange.connect(owner).swapTokensForETH(ethers.utils.parseEther("50"), maxExchangeRate)
      ).to.not.be.reverted;
    } catch (error) {
      console.error(`Error in swapTokensForETH: ${error.message}`);
      throw error;
    }

    // Swap ETH for tokens
    // console.log("Swapping 40 ETH for tokens");
    // try {
    //   await expect(
    //       exchange.connect(owner).swapETHForTokens(maxExchangeRate, {
    //         value: ethers.utils.parseEther("40"),
    //       })
    //   ).to.not.be.reverted;
    // } catch (error) {
    //   console.error(`Error in swapETHForTokens: ${error.message}`);
    //   throw error;
    // }
  });
});