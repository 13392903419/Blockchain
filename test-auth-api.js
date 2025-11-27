// 测试认证API
const API_BASE = 'http://localhost:4000';

async function testAuthAPI() {
  console.log('🔍 测试认证API...\n');

  // 测试证书POST API - 模拟前端请求
  console.log('1. 测试证书POST API (模拟前端请求)...');

  // 模拟前端发送的数据
  const testData = {
    studentAddress: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc',
    name: '测试证书',
    description: '测试描述',
    tokenId: '0',
    txHash: '0x1234567890abcdef'
  };

  // 模拟没有认证头的请求（应该返回401）
  try {
    console.log('发送无认证头的请求...');
    const response = await fetch(`${API_BASE}/api/certificates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    console.log(`状态码: ${response.status}`);
    const responseText = await response.text();
    console.log('响应内容:', responseText);

    if (response.status === 401) {
      console.log('✅ 认证检查正常 - 需要登录');
    } else {
      console.log('❌ 意外的状态码');
    }
  } catch (error) {
    console.log('❌ 请求失败:', error.message);
  }

  // 测试获取认证token的流程
  console.log('\n2. 测试认证流程...');

  try {
    // 1. 获取挑战
    console.log('获取挑战...');
    const challengeResponse = await fetch(`${API_BASE}/auth/challenge`);
    if (!challengeResponse.ok) {
      throw new Error(`挑战请求失败: ${challengeResponse.status}`);
    }
    const challengeData = await challengeResponse.json();
    console.log('挑战数据:', challengeData);

    // 注意：这里无法完成完整的认证流程，因为需要钱包签名
    console.log('注意：完整的认证需要钱包签名，无法在Node.js中完成');

  } catch (error) {
    console.log('❌ 认证流程测试失败:', error.message);
  }

  // 测试其他需要认证的API
  console.log('\n3. 测试其他认证API...');

  try {
    const response = await fetch(`${API_BASE}/api/courses`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`课程API状态码: ${response.status}`);
    if (response.status === 401) {
      console.log('✅ 课程API认证检查正常');
    } else {
      console.log('❌ 课程API认证状态异常');
    }
  } catch (error) {
    console.log('❌ 课程API测试失败:', error.message);
  }
}

// 运行测试
testAuthAPI().then(() => {
  console.log('\n🎉 认证API测试完成');
}).catch(error => {
  console.error('💥 测试失败:', error);
});
