// test-requests.js
const axios = require('axios');

// Base URL for your local server
const baseUrl = 'http://localhost:3000';

// Test session ID
const sessionId = 'test123' + Date.now();

// Test MSISDN (phone number)
const msisdn = '254712345678';

async function testUssdFlow() {
  try {
    console.log('Testing USSD Flow with session ID:', sessionId);
    
    // 1. Start Session Request
    console.log('\n1. Testing Start Session:');
    const startResponse = await axios.post(`${baseUrl}/session/${sessionId}/start`, {
      msisdn: msisdn,
      shortCode: '*123#',
      text: '',
      networkName: 'TestNetwork',
      countryName: 'TestCountry'
    });
    
    console.log('Start Response:', JSON.stringify(startResponse.data, null, 2));
    
    // 2. Send Response with input "1" (Check Balance)
    console.log('\n2. Testing Response with "1" (Check Balance):');
    const responseBalance = await axios.put(`${baseUrl}/session/${sessionId}/response`, {
      msisdn: msisdn,
      shortCode: '*123#',
      text: '1',
      networkName: 'TestNetwork',
      countryName: 'TestCountry'
    });
    
    console.log('Balance Response:', JSON.stringify(responseBalance.data, null, 2));
    
    // 3. Test End Session
    console.log('\n3. Testing End Session:');
    const endResponse = await axios.put(`${baseUrl}/session/${sessionId}/end`, {
      exitCode: 200,
      reason: 'Testing end session',
      networkName: 'TestNetwork',
      countryName: 'TestCountry'
    });
    
    console.log('End Response:', JSON.stringify(endResponse.data, null, 2));
    
    console.log('\nTest complete!');
  } catch (error) {
    console.error('Error during test:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testUssdFlow();