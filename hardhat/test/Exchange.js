const { expect } = require("chai");


describe("Exchange Contract", function () {
  let exchange;
  let mockToken;

  // deploy contracts
  beforeEach(async () => {
    const MockToken = await ethers.getContractFactory("Token"); // Replace with your actual token contract's name
    mockToken = await MockToken.deploy();

    const Exchange = await ethers.getContractFactory("Exchange");
    exchange = await Exchange.deploy(mockToken.target);

    // Define the amount of tokens and Ether to add as liquidity
    const liquidityToAdd = ethers.parseEther("100");
    const etherToAdd = ethers.parseEther("1");

    // Approve the Exchange contract to spend your tokens
    await mockToken.approve(exchange.target, liquidityToAdd);

    // Add liquidity by calling the addLiquidity function
    await exchange.addLiquidity(liquidityToAdd, { value: etherToAdd });

  });

  describe("Token and Exchange Contract Deployment", function () {
    it('should correctly deploy Token and Exchange contracts', async function () {
      const exchangeTokenAddress = await exchange.tokenAddress();
      expect(exchangeTokenAddress).to.equal(mockToken.target);
    });
  });

  describe("Add Liquidity", function () {
    it('should correctly add liquidity', async function () {
      // Call the getReserve function again to get the updated reserve balance
      const updatedReserveBalance = await exchange.getReserve();
      const newBalance = await mockToken.balanceOf(exchange.target);

      // Verify that the actual balance matches the updated reserve balance
      expect(updatedReserveBalance).to.equal(newBalance);
    });
  });

  describe("Remove Liquidity", function () {
    it('should return the correct reserve balance after removing liquidity', async function () {
      // Define the amount of tokens and Ether to add as liquidity
      const liquidityToRemove = ethers.parseEther("1");

      // Add liquidity by calling the removeLiquidity function
      await exchange.removeLiquidity(liquidityToRemove);

      // Call the getReserve function again to get the updated reserve balance
      const updatedReserveBalance = await exchange.getReserve();
      const newBalance = await mockToken.balanceOf(exchange.target);

      // Verify that the actual balance matches the updated reserve balance
      expect(updatedReserveBalance).to.equal(newBalance);
    });
  });

  describe("ETH to Token Swap", function () {
    it('should perform Eth to Token swap', async function () {
      // Get the amount of tokens and Eth
      const ethToSwap = ethers.parseEther("0.5");
      const minTokensToReceive = ethers.parseEther("0");

      // perform token swap
      await exchange.ethToTokenSwap(minTokensToReceive, { value: ethToSwap });

      // Call the getReserve function again to get the updated reserve balance
      const updatedReserveBalance = await exchange.getReserve();
      const newBalance = await mockToken.balanceOf(exchange.target);

      // Verify that the actual balance matches the updated reserve balance
      expect(updatedReserveBalance).to.equal(newBalance);
    });

    it("should require minTokensToReceive to be met in ethToTokenSwap", async function () {
      const minTokensToReceive = 100; // Set to a value that would not be met

      // Attempt ethToTokenSwap with minTokensToReceive not met
      await expect(
        exchange.ethToTokenSwap(minTokensToReceive, {
          value: ethers.parseEther("0"), // Send 1 Ether
        })
      ).to.be.revertedWith("Tokens received are less than minimum tokens expected");
    });

  });


  describe("Token to ETH Swap", function () {
    it('should perform Token to ETH swap', async function () {
      // Get the amount of tokens and Eth
      const tokensToSwap = ethers.parseEther("0.1");
      const minTokensToReceive = ethers.parseEther("0");

      const [account] = await ethers.getSigners(); // Get the first signer (usually your test account)
      const yourAddress = await account.getAddress();

      await mockToken.approve(exchange.target, tokensToSwap);

      const allowance = await mockToken.allowance(yourAddress, exchange.target);
      // Ensure that allowance is greater than or equal to `tokensToSwap`
      expect(allowance).to.be.at.least(tokensToSwap);

      await exchange.tokenToEthSwap(tokensToSwap, minTokensToReceive);
      // Call the getReserve function again to get the updated reserve balance
      const updatedReserveBalance = await exchange.getReserve();
      const newBalance = await mockToken.balanceOf(exchange.target);

      // Verify that the actual balance matches the updated reserve balance
      expect(updatedReserveBalance).to.equal(newBalance);
    });

    it("should require minEthToReceive to be met in tokenToEthSwap", async function () {
      const tokensToSwap = 100; // Set to a value that would not yield sufficient Ether
      const minEthToReceive = ethers.parseEther("1"); // Set a higher value than what should be received

      // Attempt tokenToEthSwap with minEthToReceive not met
      await expect(
        exchange.tokenToEthSwap(tokensToSwap, minEthToReceive)
      ).to.be.revertedWith("ETH received is less than minimum ETH expected");
    });
  });

  describe("OutputAmountFromSwap", function () {
    it("should calculate the output amount from a swap", async function () {
      // Parameters for the test
      const inputAmount = 100; // Input amount
      const inputReserve = 1000; // Input reserve
      const outputReserve = 10000; // Output reserve

      // Call the getOutputAmountFromSwap function
      const outputAmount = await exchange.getOutputAmountFromSwap(inputAmount, inputReserve, outputReserve);

      // Expected output amount calculation
      const inputAmountWithFee = inputAmount * 99;
      const numerator = inputAmountWithFee * outputReserve;
      const denominator = inputReserve * 100 + inputAmountWithFee;
      let expectedOutputAmount = numerator / denominator;

      expectedOutputAmount = Math.round(expectedOutputAmount);

      // Assert that the calculated output amount matches the expected value
      expect(outputAmount).to.be.closeTo(expectedOutputAmount, 1);
    });

    it("should handle cases with zero reserves", async function () {
      // Parameters with zero reserves
      const inputAmount = 1; // Input amount
      const inputReserve = 0; // Input reserve
      const outputReserve = 0; // Output reserve

      // Use a try-catch block to capture the revert reason
      let revertReason;
      try {
        // Call the getOutputAmountFromSwap function, which should revert
        await exchange.getOutputAmountFromSwap(inputAmount, inputReserve, outputReserve);
      } catch (error) {
        revertReason = error.message;
      }

      // Assert that the revert reason matches the expected reason
      expect(revertReason).to.include("Reserves must be greater than 0");
    });

  });
});
