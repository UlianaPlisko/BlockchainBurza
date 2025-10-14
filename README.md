# BlockchainBurza — LoliExchange (FIIT DEX)

> A small teaching decentralized exchange (DEX) and ERC-20 token built with Hardhat for learning and demo purposes.

Key features
- ERC-20 token `Token` (name: LoliPop, symbol: LOL) with owner-only mint and a disable-mint switch.
- Simple automated market maker: `TokenExchange` contract with pool creation, add/remove liquidity and swap functions (token <-> ETH) using a constant-product model.
- Example time-locked `Lock` contract (from Hardhat sample).
- Deployment and test scripts using Hardhat.

Why this project is useful
- Educational DEX implementation illustrating liquidity pools, share accounting, basic swap math and fees.
- Useful starter repo for learning Solidity, Hardhat, testing with ethers.js and building a minimal web UI.

Repository layout

- `contracts/` — Solidity contracts: `token.sol`, `exchange.sol`, `Lock.sol`.
- `scripts/` — deployment scripts: `deploy_token.js`, `deploy_exchange.js`.
- `test/` — Mocha/Chai tests using Hardhat in `test/Test.js` which exercise pool lifecycle and swaps.
- `web_app/` — minimal front-end demo (static HTML + `exchange.js`) that connects to a local node.
- `hardhat.config.js` — Hardhat configuration (Solidity 0.8.17).
- `package.json` — dev dependencies (Hardhat, Ethers, OpenZeppelin, solidity-coverage, etc.).

Quick start

Prerequisites

- Node.js (16+ recommended) and npm installed.
- Git (to clone the repo).

Install

```powershell
cd path\to\repo
npm install
```

Run a local Hardhat node (recommended for development)

```powershell
npx hardhat node
```

Deploy contracts to the local node

Open a new terminal (PowerShell) and run:

```powershell
npx hardhat run --network localhost scripts/deploy_token.js
npx hardhat run --network localhost scripts/deploy_exchange.js
```

Run tests

```powershell
npx hardhat test
```

What the contracts do (short)

- Token (contracts/token.sol)
  - ERC20 token inheriting OpenZeppelin's `ERC20` and `Ownable`.
  - Owner-only `mint(uint amount)` and `disable_mint()` to permanently stop minting.

- TokenExchange (contracts/exchange.sol)
  - Creates a token/ETH pool via `createPool(uint amountTokens)` (owner-only requirement in script usage).
  - `addLiquidity`, `removeLiquidity`, `removeAllLiquidity` to manage LP shares.
  - `swapTokensForETH` and `swapETHForTokens` with a simple fee mechanism.

- Lock (contracts/Lock.sol)
  - Time-locked Ether example contract (Hardhat sample).

Usage examples

- Creating a pool (example test shows flow):
  - Mint tokens, approve exchange contract, then call `createPool(tokens, { value: ethers.utils.parseEther("1") })` from the owner account.
- Adding liquidity: approve tokens to the exchange and call `addLiquidity(max_exchange_rate, min_exchange_rate, { value: <ETH> })`.
- Swapping: use `swapTokensForETH(amountTokens, max_exchange_rate)` or `swapETHForTokens(max_exchange_rate)` (send ETH value).

Web demo

- The `web_app/` directory contains a static HTML/JS demo (`index.html`, `exchange.js`) intended to connect an Ethers provider to a local node (JSON-RPC at `http://localhost:8545`).
- To run the web demo, host the `web_app/` folder on a static server and point the ABI/address constants in `web_app/exchange.js` to your deployed contracts.

Developer notes and tips

- The test suite (`test/Test.js`) contains working examples of deploying contracts, minting tokens, approving, creating pools, adding/removing liquidity and swaps — use it as a reference.
- Contracts are written for Solidity 0.8.x; keep OpenZeppelin updated reasonably to avoid compatibility issues.
- The `Token` contract includes TODO comments for token metadata; review and update names/symbols if you fork this repo.

Where to get help

- Check issues on this repository for known problems.
- Read inline code comments in `contracts/` and `test/Test.js` for implementation details.

Maintainers & contribution

- Maintainer: repository owner (see repo settings).
- Contributions: open an issue first, then send a pull request. Keep changes small and focused. For contribution guidelines add a `CONTRIBUTING.md` file and reference it here.

License

This repository does not include a license file. Add a `LICENSE` file to make licensing explicit.

Next steps / improvements

- Add a `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md`.
- Improve the web UI to auto-fill deployed contract addresses and ABIs from a build artifact.
- Add more unit tests and gas usage assertions.

---

Files referenced in this README:

- `contracts/token.sol`, `contracts/exchange.sol`, `contracts/Lock.sol`
- `scripts/deploy_token.js`, `scripts/deploy_exchange.js`
- `test/Test.js`
- `web_app/index.html`, `web_app/exchange.js`
