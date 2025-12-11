import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // 1. Deploy RoleManager
    const RoleManager = await ethers.getContractFactory("RoleManager");
    const roleManager = await RoleManager.deploy();
    await roleManager.waitForDeployment();
    const roleManagerAddress = await roleManager.getAddress();
    console.log("RoleManager deployed to:", roleManagerAddress);

    // 2. Deploy AttendanceNFT
    const AttendanceNFT = await ethers.getContractFactory("AttendanceNFT");
    const attendanceNFT = await AttendanceNFT.deploy(deployer.address);
    await attendanceNFT.waitForDeployment();
    const attendanceNFTAddress = await attendanceNFT.getAddress();
    console.log("AttendanceNFT deployed to:", attendanceNFTAddress);

    // Set RoleManager in AttendanceNFT
    await attendanceNFT.setRoleManager(roleManagerAddress);
    console.log("AttendanceNFT linked to RoleManager");

    // 3. Deploy CertificateSBT
    const CertificateSBT = await ethers.getContractFactory("CertificateSBT");
    const certificateSBT = await CertificateSBT.deploy(deployer.address);
    await certificateSBT.waitForDeployment();
    console.log("CertificateSBT deployed to:", await certificateSBT.getAddress());

    // 4. Deploy AccessPassNFT
    const AccessPassNFT = await ethers.getContractFactory("AccessPassNFT");
    const accessPassNFT = await AccessPassNFT.deploy(deployer.address);
    await accessPassNFT.waitForDeployment();
    console.log("AccessPassNFT deployed to:", await accessPassNFT.getAddress());

    // 5. Deploy StudentWorkNFT
    const StudentWorkNFT = await ethers.getContractFactory("StudentWorkNFT");
    const studentWorkNFT = await StudentWorkNFT.deploy(deployer.address);
    await studentWorkNFT.waitForDeployment();
    console.log("StudentWorkNFT deployed to:", await studentWorkNFT.getAddress());

    // 6. Deploy StudentPetNFT
    const StudentPetNFT = await ethers.getContractFactory("StudentPetNFT");
    const studentPetNFT = await StudentPetNFT.deploy(deployer.address);
    await studentPetNFT.waitForDeployment();
    const studentPetNFTAddress = await studentPetNFT.getAddress();
    console.log("StudentPetNFT deployed to:", studentPetNFTAddress);

    // 7. Deploy AttendanceSynthesizer
    const AttendanceSynthesizer = await ethers.getContractFactory("AttendanceSynthesizer");
    const attendanceSynthesizer = await AttendanceSynthesizer.deploy(deployer.address, attendanceNFTAddress);
    await attendanceSynthesizer.waitForDeployment();
    console.log("AttendanceSynthesizer deployed to:", await attendanceSynthesizer.getAddress());

    console.log("\n🎉 部署完成！请将以下地址复制到 backend/.env 文件：\n");
    console.log("CONTRACT_ADDRESS=" + roleManagerAddress);
    console.log("STUDENT_PET_CONTRACT_ADDRESS=" + studentPetNFTAddress);
    console.log("\n💡 注意：");
    console.log("   • CONTRACT_ADDRESS 是 RoleManager 合约地址");
    console.log("   • STUDENT_PET_CONTRACT_ADDRESS 是 StudentPetNFT 合约地址（用于完全去中心化的宠物系统）");
    console.log("   • 确保设置了 OWNER_PRIVATE_KEY 环境变量（合约所有者的私钥）");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
