import { ethers } from "hardhat";

// RoleManager合约ABI
const RoleManagerABI = [
  "function grantTeacherRole(address account) external",
  "function revokeTeacherRole(address account) external",
  "function getRole(address account) external view returns (uint8)",
  "function isTeacher(address account) external view returns (bool)",
  "function isStudent(address account) external view returns (bool)",
  "event RoleGranted(address indexed account, uint8 role)",
  "event RoleRevoked(address indexed account, uint8 role)"
];

/**
 * 教师角色管理脚本
 * 用于演示如何在区块链上管理教师角色
 */
async function main() {
  console.log("🎓 区块链课程出勤系统 - 教师角色管理\n");

  const [owner, teacher1, teacher2] = await ethers.getSigners();

  console.log("部署者地址:", await owner.getAddress());
  console.log("教师1地址:", await teacher1.getAddress());
  console.log("教师2地址:", await teacher2.getAddress());
  console.log();

  // 获取已部署的RoleManager合约
  const roleManagerAddress = process.env.CONTRACT_ADDRESS;
  if (!roleManagerAddress) {
    throw new Error("请先部署RoleManager合约并设置CONTRACT_ADDRESS环境变量");
  }

  const roleManager = new ethers.Contract(roleManagerAddress, RoleManagerABI, owner);

  console.log("📋 当前角色状态:");
  console.log(`部署者 (${await owner.getAddress()}):`, await roleManager.getRole(await owner.getAddress()));
  console.log(`教师1 (${await teacher1.getAddress()}):`, await roleManager.getRole(await teacher1.getAddress()));
  console.log(`教师2 (${await teacher2.getAddress()}):`, await roleManager.getRole(await teacher2.getAddress()));
  console.log();

  // 授权教师角色
  console.log("🔑 正在授权教师角色...");

  console.log("为教师1授权教师角色...");
  const tx1 = await roleManager.grantTeacherRole(await teacher1.getAddress());
  await tx1.wait();
  console.log("✅ 教师1已获得教师角色");

  console.log("为教师2授权教师角色...");
  const tx2 = await roleManager.grantTeacherRole(await teacher2.getAddress());
  await tx2.wait();
  console.log("✅ 教师2已获得教师角色");
  console.log();

  // 验证角色
  console.log("🔍 验证角色授权结果:");
  console.log(`部署者 (${await owner.getAddress()}):`, await roleManager.getRole(await owner.getAddress()));
  console.log(`教师1 (${await teacher1.getAddress()}):`, await roleManager.getRole(await teacher1.getAddress()));
  console.log(`教师2 (${await teacher2.getAddress()}):`, await roleManager.getRole(await teacher2.getAddress()));
  console.log();

  // 检查教师状态
  console.log("👨‍🏫 教师身份验证:");
  console.log(`部署者是教师:`, await roleManager.isTeacher(await owner.getAddress()));
  console.log(`教师1是教师:`, await roleManager.isTeacher(await teacher1.getAddress()));
  console.log(`教师2是教师:`, await roleManager.isTeacher(await teacher2.getAddress()));
  console.log();

  console.log("🎉 教师角色设置完成！");
  console.log("现在这些地址的用户登录时，系统会从区块链查询角色并自动获得教师权限。");
  console.log();

  console.log("💡 使用说明:");
  console.log("1. 合约所有者（部署者）可以随时添加/移除教师角色");
  console.log("2. 教师角色记录在区块链上，不可篡改");
  console.log("3. 前端应用会自动查询区块链确定用户角色");
  console.log("4. 这体现了真正的区块链去中心化角色管理");
}

main().catch((error) => {
  console.error("❌ 脚本执行失败:", error);
  process.exitCode = 1;
});
