// 测试前端到后端的API连接
const API_BASE = 'http://localhost:4000';

async function testAPIConnection() {
  console.log('🔍 测试API连接...\n');

  try {
    // 测试基本连接
    console.log('1. 测试基本连接...');
    const healthResponse = await fetch(`${API_BASE}/health`);
    if (healthResponse.ok) {
      console.log('✅ 基本连接正常');
    } else {
      console.log('⚠️ 健康检查端点不存在，但这不影响主要功能');
    }
  } catch (error) {
    console.log('❌ 基本连接失败:', error.message);
  }

  // 测试证书API - 不需要认证
  console.log('\n2. 测试证书GET API...');
  try {
    const response = await fetch(`${API_BASE}/api/certificates`);
    console.log(`状态码: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ 证书查询成功');
      console.log(`找到 ${data.length} 个证书`);
    } else {
      const errorText = await response.text();
      console.log('❌ 证书查询失败:', errorText);
    }
  } catch (error) {
    console.log('❌ 网络错误:', error.message);
  }

  // 测试证书POST API - 需要认证
  console.log('\n3. 测试证书POST API (无认证)...');
  try {
    const testData = {
      studentAddress: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc',
      name: '测试证书',
      description: '测试描述',
      tokenId: '0',
      txHash: '0x1234567890abcdef'
    };

    const response = await fetch(`${API_BASE}/api/certificates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    console.log(`状态码: ${response.status}`);

    if (response.status === 401) {
      console.log('✅ 认证检查正常 (需要登录)');
    } else if (response.ok) {
      console.log('✅ 证书创建成功 (意外 - 不应该在无认证时成功)');
    } else {
      const errorText = await response.text();
      console.log('❌ 证书创建失败:', errorText);
    }
  } catch (error) {
    console.log('❌ 网络错误:', error.message);
  }

  // 测试数据库连接状态
  console.log('\n4. 测试数据库连接...');
  try {
    const response = await fetch(`${API_BASE}/api/courses`);
    console.log(`数据库连接状态: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ 数据库正常，找到 ${data.length} 个课程`);
    } else {
      console.log('❌ 数据库连接可能有问题');
    }
  } catch (error) {
    console.log('❌ 数据库连接错误:', error.message);
  }
}

// 运行测试
testAPIConnection().then(() => {
  console.log('\n🎉 API连接测试完成');
}).catch(error => {
  console.error('💥 测试失败:', error);
});
