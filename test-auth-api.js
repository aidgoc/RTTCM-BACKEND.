const axios = require('axios');

async function testAuthAPI() {
  try {
    // Test login for supervisor
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'admin1@gmail.com',
      password: 'password123'
    }, {
      withCredentials: true
    });

    console.log('Login Response:');
    console.log(JSON.stringify(loginResponse.data, null, 2));

    // Test /me endpoint
    const meResponse = await axios.get('http://localhost:3001/api/auth/me', {
      withCredentials: true,
      headers: {
        'Cookie': loginResponse.headers['set-cookie']?.join('; ')
      }
    });

    console.log('\n/me Response:');
    console.log(JSON.stringify(meResponse.data, null, 2));

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testAuthAPI();
