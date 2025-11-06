const mongoose = require('mongoose');

// 连接到 MongoDB
mongoose.connect('mongodb://localhost:27017/nft_attendance');

// 获取数据库连接
const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', async () => {
  console.log('✅ Connected to MongoDB');
  
  // 获取所有集合
  const collections = await db.db.listCollections().toArray();
  console.log('\n📊 数据库集合列表:');
  collections.forEach(collection => {
    console.log(`- ${collection.name}`);
  });
  
  // 检查每个集合的数据
  for (const collection of collections) {
    const count = await db.db.collection(collection.name).countDocuments();
    console.log(`\n📋 ${collection.name} 集合:`);
    console.log(`   文档数量: ${count}`);
    
    if (count > 0) {
      const sample = await db.db.collection(collection.name).findOne();
      console.log(`   示例文档:`, JSON.stringify(sample, null, 2));
    }
  }
  
  mongoose.connection.close();
});
