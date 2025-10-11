const axios = require('axios');

async function testAPI() {
  try {
    console.log('Testing API endpoints...');
    
    // Test health endpoint
    const health = await axios.get('http://localhost:3001/health');
    console.log('✅ Health check:', health.data);
    
    // Test tickets endpoint (without auth for now)
    try {
      const tickets = await axios.get('http://localhost:3001/api/tickets');
      console.log('✅ Tickets endpoint:', tickets.data);
    } catch (error) {
      console.log('❌ Tickets endpoint error:', error.response?.status, error.response?.data);
    }
    
    // Test cranes endpoint
    try {
      const cranes = await axios.get('http://localhost:3001/api/cranes');
      console.log('❌ Cranes endpoint (should require auth):', cranes.data);
    } catch (error) {
      console.log('✅ Cranes endpoint correctly requires auth:', error.response?.status);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAPI();
