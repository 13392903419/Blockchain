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

  // 部署RoleManager合约
  console.log("Deploying RoleManager...");
  const RoleManager = await ethers.getContractFactory("RoleManager");
  const roleManagerContract = await RoleManager.deploy();
  await roleManagerContract.waitForDeployment();
  const roleManagerAddress = await roleManagerContract.getAddress();
  console.log("RoleManager deployed to:", roleManagerAddress);

  // 部署AttendanceNFT合约
  console.log("Deploying AttendanceNFT...");
  const AttendanceNFT = await ethers.getContractFactory("AttendanceNFT");
  const attendanceContract = await AttendanceNFT.deploy(deployer.address);
  await attendanceContract.waitForDeployment();

  const attendanceAddress = await attendanceContract.getAddress();
  console.log("AttendanceNFT deployed to:", attendanceAddress);

  // 设置RoleManager地址到AttendanceNFT合约
  console.log("Setting RoleManager address in AttendanceNFT...");
  console.log("RoleManager address:", roleManagerAddress);
  console.log("AttendanceNFT address:", attendanceAddress);

  try {
    // 使用低级调用来避免TypeScript类型问题
    const iface = new ethers.Interface([
      "function setRoleManager(address _roleManager) external"
    ]);

    const data = iface.encodeFunctionData("setRoleManager", [roleManagerAddress]);
    console.log("Encoded function data:", data);

    // 发送交易
    const tx = await deployer.sendTransaction({
      to: attendanceAddress,
      data: data,
      gasLimit: 100000
    });

    console.log("Transaction sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("RoleManager address set successfully, gas used:", receipt?.gasUsed.toString());

    // 验证设置是否成功
    const currentRoleManager = await attendanceContract.roleManager();
    console.log("Verified RoleManager address in contract:", currentRoleManager);
    if (currentRoleManager.toLowerCase() === roleManagerAddress.toLowerCase()) {
      console.log("✅ RoleManager address verification successful");
    } else {
      console.log("❌ RoleManager address verification failed");
      console.log("Expected:", roleManagerAddress);
      console.log("Got:", currentRoleManager);
    }
  } catch (error) {
    console.error("❌ Failed to set RoleManager address:", error instanceof Error ? error.message : String(error));
    if (error instanceof Error && (error as any).data) {
      console.error("Error data:", (error as any).data);
    }
    // 继续执行，不要让部署失败
    console.log("Continuing deployment despite RoleManager setup failure...");
  }

  console.log("");
  console.log("🎉 合约部署成功！");
  console.log("📋 请将以下合约地址复制到相应配置文件：");
  console.log("");
  console.log("RoleManager合约地址:");
  console.log(`${roleManagerAddress}`);
  console.log("");
  console.log("AttendanceNFT合约地址:");
  console.log(`${attendanceAddress}`);
  console.log("");
  console.log("配置文件位置：");
  console.log("- backend/.env: CONTRACT_ADDRESS=[RoleManager地址]");
  console.log("- frontend/.env.local: VITE_CONTRACT_ADDRESS=[AttendanceNFT地址]");
  console.log("");
  console.log("💡 关于合约地址：");
  console.log("   • 部署时会生成新的合约地址（由区块链网络决定）");
  console.log("   • 本地开发环境：代码中已配置默认地址（Hardhat本地网络确定性地址）");
  console.log("   • 生产环境：必须通过环境变量配置上述地址，不要使用默认值！");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


