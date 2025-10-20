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
  // 地址一致性校验：确保本次部署地址为期望的固定地址（首笔交易确定性地址）
  const EXPECTED_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  if (address.toLowerCase() !== EXPECTED_ADDRESS.toLowerCase()) {
    console.error(
      `部署地址不一致：期望 ${EXPECTED_ADDRESS}，实际 ${address}。\n` +
      "这通常表示本次部署不是该部署者在此链上的首笔交易（nonce 非 0），或链已存在历史交易。\n" +
      "请确保：1) 重启本地链；2) 部署前不要让前端/其他脚本先发送交易；3) 使用 Account #0 作为部署者。"
    );
    process.exit(1);
  }
  console.log("请将以下地址复制到 frontend/.env.local:");
  console.log(`VITE_CONTRACT_ADDRESS=${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


