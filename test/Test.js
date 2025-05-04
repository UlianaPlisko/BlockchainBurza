const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenExchange", function () {
  let Token, Exchange, token, exchange, owner, user;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    Token = await ethers.getContractFactory("Token");
    token = await Token.deploy();
    await token.deployed();

    await token.mint(ethers.utils.parseEther("10000"));

    Exchange = await ethers.getContractFactory("TokenExchange");
    exchange = await Exchange.deploy();
    await exchange.deployed();

    // Override tokenAddr in exchange contract
    await exchange.connect(owner).setTokenAddress(token.address); // If you make tokenAddr public

    await token.approve(exchange.address, ethers.utils.parseEther("10000"));
  });

  it("Should create a pool successfully", async function () {
    await expect(
        exchange.connect(owner).createPool(ethers.utils.parseEther("1000"), {
          value: ethers.utils.parseEther("1"),
        })
    ).to.not.be.reverted;

    const ethBalance = await ethers.provider.getBalance(exchange.address);
    const tokenBalance = await token.balanceOf(exchange.address);

    expect(ethBalance).to.equal(ethers.utils.parseEther("1"));
    expect(tokenBalance).to.equal(ethers.utils.parseEther("1000"));
  });

  it("Should add liquidity correctly", async function () {
    await exchange.connect(owner).createPool(ethers.utils.parseEther("1000"), {
      value: ethers.utils.parseEther("1"),
    });

    await token.transfer(user.address, ethers.utils.parseEther("500"));
    await token.connect(user).approve(exchange.address, ethers.utils.parseEther("500"));

    await expect(
        exchange.connect(user).addLiquidity(2000000, 1, {
          value: ethers.utils.parseEther("0.5"),
        })
    ).to.not.be.reverted;
  });

  it("Should remove some liquidity", async function () {
    await exchange.connect(owner).createPool(ethers.utils.parseEther("1000"), {
      value: ethers.utils.parseEther("1"),
    });

    await token.transfer(user.address, ethers.utils.parseEther("500"));
    await token.connect(user).approve(exchange.address, ethers.utils.parseEther("500"));

    await exchange.connect(user).addLiquidity(2000000, 1, {
      value: ethers.utils.parseEther("0.5"),
    });

    await expect(
        exchange.connect(user).removeLiquidity(0.1 * 1e18, 2000000, 1)
    ).to.not.be.reverted;
  });

  it("Should remove all liquidity", async function () {
    await exchange.connect(owner).createPool(ethers.utils.parseEther("1000"), {
      value: ethers.utils.parseEther("1"),
    });

    await token.transfer(user.address, ethers.utils.parseEther("500"));
    await token.connect(user).approve(exchange.address, ethers.utils.parseEther("500"));

    await exchange.connect(user).addLiquidity(2000000, 1, {
      value: ethers.utils.parseEther("0.5"),
    });

    await expect(
        exchange.connect(user).removeAllLiquidity(2000000, 1)
    ).to.not.be.reverted;
  });

  it("Should swap tokens for ETH", async function () {
    await exchange.connect(owner).createPool(ethers.utils.parseEther("1000"), {
      value: ethers.utils.parseEther("1"),
    });

    await token.transfer(user.address, ethers.utils.parseEther("100"));
    await token.connect(user).approve(exchange.address, ethers.utils.parseEther("100"));

    await expect(
        exchange.connect(user).swapTokensForETH(ethers.utils.parseEther("50"), 2000000)
    ).to.not.be.reverted;
  });

  it("Should swap ETH for tokens", async function () {
    await exchange.connect(owner).createPool(ethers.utils.parseEther("1000"), {
      value: ethers.utils.parseEther("1"),
    });

    await expect(
        exchange.connect(user).swapETHForTokens(2000000, {
          value: ethers.utils.parseEther("0.1"),
        })
    ).to.not.be.reverted;
  });
});
