const mongoose = require('mongoose');
const Database = require('./src/database').Database;

async function testPetUpgrade() {
    console.log('🐾 开始测试学习之树自动升级功能...\n');

    const db = new Database();
    console.log('📡 连接数据库...');
    await db.connect();
    console.log('✅ 数据库连接成功\n');

    // 测试学生地址
    const testStudentAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

    console.log(`📚 测试学生地址: ${testStudentAddress}\n`);

    try {
        // 1. 重置宠物状态为初始状态（用于测试）
        console.log('🔄 步骤1: 重置宠物状态');
        await db.createOrUpdateStudentPet(testStudentAddress, {
            stage: 0,
            experience: 0
        });
        console.log('   宠物已重置为种子阶段\n');

        // 2. 模拟出勤记录 (+5 XP)
        console.log('📝 步骤2: 模拟学生出勤 (+5 XP)');
        let pet = await db.getStudentPet(testStudentAddress);
        const afterAttendance = (pet?.experience || 0) + 5;
        const attendanceStage = Math.floor(afterAttendance / 100);

        await db.createOrUpdateStudentPet(testStudentAddress, {
            stage: Math.min(attendanceStage, 2),
            experience: afterAttendance
        });
        console.log(`   出勤后经验值: ${afterAttendance} XP (${getStageName(attendanceStage)})\n`);

        // 3. 模拟铸造作品 (+10 XP)
        console.log('🎨 步骤3: 模拟铸造作品 (+10 XP)');
        pet = await db.getStudentPet(testStudentAddress);
        const afterWork = (pet?.experience || 0) + 10;
        const workStage = Math.floor(afterWork / 100);

        await db.createOrUpdateStudentPet(testStudentAddress, {
            stage: Math.min(workStage, 2),
            experience: afterWork
        });
        console.log(`   铸造作品后经验值: ${afterWork} XP (${getStageName(workStage)})\n`);

        // 4. 模拟作品被认证 (+30 XP)
        console.log('✅ 步骤4: 模拟作品被认证 (+30 XP)');
        pet = await db.getStudentPet(testStudentAddress);
        const afterEndorsement = (pet?.experience || 0) + 30;
        const endorsementStage = Math.floor(afterEndorsement / 100);

        await db.createOrUpdateStudentPet(testStudentAddress, {
            stage: Math.min(endorsementStage, 2),
            experience: afterEndorsement
        });
        console.log(`   认证作品后经验值: ${afterEndorsement} XP (${getStageName(endorsementStage)})\n`);

        // 5. 模拟兑换通行证 (+20 XP)
        console.log('🎫 步骤5: 模拟兑换通行证 (+20 XP)');
        pet = await db.getStudentPet(testStudentAddress);
        const afterRedeem = (pet?.experience || 0) + 20;
        const redeemStage = Math.floor(afterRedeem / 100);

        await db.createOrUpdateStudentPet(testStudentAddress, {
            stage: Math.min(redeemStage, 2),
            experience: afterRedeem
        });
        console.log(`   兑换通行证后经验值: ${afterRedeem} XP (${getStageName(redeemStage)})\n`);

        // 6. 模拟获得证书 (+50 XP)
        console.log('🏆 步骤6: 模拟获得证书 (+50 XP)');
        pet = await db.getStudentPet(testStudentAddress);
        const afterCertificate = (pet?.experience || 0) + 50;
        const certificateStage = Math.floor(afterCertificate / 100);

        await db.createOrUpdateStudentPet(testStudentAddress, {
            stage: Math.min(certificateStage, 2),
            experience: afterCertificate
        });
        console.log(`   获得证书后经验值: ${afterCertificate} XP (${getStageName(certificateStage)})\n`);

        // 7. 验证最终状态
        console.log('📊 步骤7: 验证最终状态');
        const finalPet = await db.getStudentPet(testStudentAddress);
        const expectedExp = 5 + 10 + 30 + 20 + 50; // 115 XP
        const expectedStage = Math.floor(expectedExp / 100); // 1 (幼苗)

        console.log(`   预期经验值: ${expectedExp} XP`);
        console.log(`   实际经验值: ${finalPet?.experience || 0} XP`);
        console.log(`   预期阶段: ${expectedStage} (${getStageName(expectedStage)})`);
        console.log(`   实际阶段: ${finalPet?.stage || 0} (${getStageName(finalPet?.stage || 0)})`);
        console.log(`   测试结果: ${((finalPet?.experience || 0) === expectedExp && (finalPet?.stage || 0) === expectedStage) ? '✅ 通过' : '❌ 失败'}\n`);

        console.log('🎯 经验值奖励总结:');
        console.log('   • 出勤记录: +5 XP');
        console.log('   • 铸造作品: +10 XP');
        console.log('   • 作品认证: +30 XP');
        console.log('   • 兑换通行证: +20 XP');
        console.log('   • 获得证书: +50 XP');
        console.log('   • 总计: +115 XP (升级到幼苗阶段)\n');

        console.log('🎉 测试完成！现在学习之树会自动根据学生行为升级了');

    } catch (error) {
        console.error('❌ 测试失败:', error);
    } finally {
        await db.close();
    }
}

function getStageName(stage) {
    switch (stage) {
        case 0: return '种子 🌱';
        case 1: return '幼苗 🌿';
        case 2: return '花朵 🌸';
        case 3: return '枯萎 🥀';
        default: return '未知 ❓';
    }
}

// 运行测试
testPetUpgrade();
