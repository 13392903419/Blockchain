import { ethers } from "hardhat";

async function main() {
  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    throw new Error(
      "No signer available. Set PRIVATE_KEY and SEPOLIA_RPC_URL in a .env file under blockchain/."
    );
  }
  const deployer = signers[0];
  console.log("Deployer:", await deployer.getAddress());

  const AttendanceNFT = await ethers.getContractFactory("AttendanceNFT");
  const contract = await AttendanceNFT.deploy(deployer.address);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("AttendanceNFT deployed to:", address);
  console.log("请将以下地址复制到 frontend/.env.local:");
  console.log(`VITE_CONTRACT_ADDRESS=${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


