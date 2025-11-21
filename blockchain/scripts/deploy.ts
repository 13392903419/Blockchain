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

  // 部署AttendanceNFT合约
  console.log("Deploying AttendanceNFT...");
  const AttendanceNFT = await ethers.getContractFactory("AttendanceNFT");
  const attendanceContract = await AttendanceNFT.deploy(deployer.address);
  await attendanceContract.waitForDeployment();

  const attendanceAddress = await attendanceContract.getAddress();
  console.log("AttendanceNFT deployed to:", attendanceAddress);

  console.log("");
  console.log("🎉 合约部署成功！");
  console.log("📋 请将以下合约地址复制到相应配置文件：");
  console.log("");
  console.log("AttendanceNFT合约地址:");
  console.log(`${attendanceAddress}`);
  console.log("");
  console.log("配置文件位置：");
  console.log("- frontend/.env.local: VITE_CONTRACT_ADDRESS=[合约地址]");
  console.log("");
  console.log("💡 这体现了真正的区块链原生应用：");
  console.log("   合约地址由区块链网络动态决定，不依赖人工固定！");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


