const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');

async function debugAccessPass() {
  try {
    // Connect to MongoDB
    const client = new MongoClient('mongodb://localhost:27017');
    await client.connect();

    const db = client.db('nft_attendance');
    const collection = db.collection('accesspasses');

    // Find a sample document
    const sampleDoc = await collection.findOne({});
    console.log('Sample access pass document:');
    console.log(JSON.stringify(sampleDoc, null, 2));

    // Check all documents
    const allDocs = await collection.find({}).limit(3).toArray();
    console.log('\nAll documents (first 3):');
    allDocs.forEach((doc, index) => {
      console.log(`Document ${index + 1}:`, {
        _id: doc._id,
        id: doc.id, // Check if there's an 'id' field
        studentAddress: doc.studentAddress,
        isRedeemed: doc.isRedeemed,
        tokenId: doc.tokenId
      });
    });

    await client.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

debugAccessPass();
