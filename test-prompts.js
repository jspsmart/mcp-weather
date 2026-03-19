import axios from 'axios';

async function testListPrompts() {
  try {
    const response = await axios.post('http://localhost:6277', {
      jsonrpc: '2.0',
      method: 'listPrompts',
      params: {},
      id: 1
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 10bbaf4bba1970d2113c0eba2f74ff57de183396cf75a56e2327056a9b8a6071'
      }
    });
    
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testListPrompts();
