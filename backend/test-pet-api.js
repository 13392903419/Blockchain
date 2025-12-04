// 测试学习之树升级功能的API调用示例
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:4000';
const TEACHER_TOKEN = 'mock-teacher-token'; // 在实际测试中需要真实token
const STUDENT_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

async function testPetUpgradeAPI() {
    console.log('🐾 学习之树升级功能测试指南\n');

    console.log('📋 测试步骤说明:');
    console.log('==================\n');

    console.log('🎯 升级逻辑:');
    console.log('   • 每获得100经验值(XP)可以升级一个阶段');
    console.log('   • 阶段0: 种子 🌱 (0-99 XP)');
    console.log('   • 阶段1: 幼苗 🌿 (100-199 XP)');
    console.log('   • 阶段2: 花朵 🌸 (200+ XP)');
    console.log('   • 阶段3: 枯萎 🥀 (特殊情况)\n');

    console.log('📝 手动测试步骤:');
    console.log('==================\n');

    console.log('1️⃣ 查看当前宠物状态:');
    console.log(`   GET ${API_BASE}/api/student-pet?studentAddress=${STUDENT_ADDRESS}`);
    console.log('   响应示例: { "stage": 0, "experience": 0 }\n');

    console.log('2️⃣ 教师更新宠物经验值 (+50 XP):');
    console.log(`   POST ${API_BASE}/api/student-pet/update`);
    console.log('   请求头: Authorization: Bearer [教师JWT_TOKEN]');
    console.log('   请求体:');
    console.log(`   {
     "studentAddress": "${STUDENT_ADDRESS}",
     "stage": 0,
     "experience": 50
   }`);
    console.log('   结果: 宠物获得50经验值，仍在种子阶段\n');

    console.log('3️⃣ 再次更新宠物经验值 (+60 XP，总计110 XP):');
    console.log(`   POST ${API_BASE}/api/student-pet/update`);
    console.log('   请求头: Authorization: Bearer [教师JWT_TOKEN]');
    console.log('   请求体:');
    console.log(`   {
     "studentAddress": "${STUDENT_ADDRESS}",
     "stage": 1,
     "experience": 110
   }`);
    console.log('   结果: 宠物升级到幼苗阶段 🌿\n');

    console.log('4️⃣ 继续升级到花朵阶段 (+100 XP，总计210 XP):');
    console.log(`   POST ${API_BASE}/api/student-pet/update`);
    console.log('   请求头: Authorization: Bearer [教师JWT_TOKEN]');
    console.log('   请求体:');
    console.log(`   {
     "studentAddress": "${STUDENT_ADDRESS}",
     "stage": 2,
     "experience": 210
   }`);
    console.log('   结果: 宠物升级到花朵阶段 🌸\n');

    console.log('🎮 实际测试执行:');
    console.log('==================\n');

    console.log('由于需要教师权限和真实JWT token，请按以下步骤手动测试:\n');

    console.log('第一步: 教师登录获取token');
    console.log('第二步: 使用Postman或浏览器开发者工具执行上述API调用');
    console.log('第三步: 学生端刷新"我的展示"页面查看宠物成长效果');
    console.log('第四步: 验证升级逻辑是否正确\n');

    console.log('📊 验证要点:');
    console.log('   ✅ 经验值正确累加');
    console.log('   ✅ 阶段按100 XP间隔升级');
    console.log('   ✅ 最高阶段限制为2(花朵)');
    console.log('   ✅ 学生端UI正确显示新阶段\n');

    console.log('🎯 奖励触发时机建议:');
    console.log('   • 获得证书: +50 XP');
    console.log('   • 作品被认证: +30 XP');
    console.log('   • 兑换通行证: +20 XP');
    console.log('   • 出勤满10次: +25 XP');
    console.log('   • 课程完成: +40 XP\n');

    console.log('✨ 测试完成！请按照上述步骤验证学习之树升级功能。');
}

testPetUpgradeAPI();
