import axios from 'axios';

async function testPromptMessages() {
  try {
    // First list all prompts
    const listResponse = await axios.post('http://localhost:6277/prompt/list', {
      jsonrpc: '2.0',
      method: 'listPrompts',
      params: {},
      id: 1
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer a8f01f3dafa4567b363f4c42b06096a2342f4927e97f57ee7a46022f7f77d643'
      }
    });
    
    console.log('Available prompts:', JSON.stringify(listResponse.data.result.prompts, null, 2));
    
    // Then get a specific prompt
    const promptName = listResponse.data.result.prompts[0]?.name;
    if (promptName) {
      console.log(`\nGetting prompt: ${promptName}`);
      
      const getResponse = await axios.post('http://localhost:6277/prompt/get', {
        jsonrpc: '2.0',
        method: 'getPrompt',
        params: { name: promptName },
        id: 2
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer a8f01f3dafa4567b363f4c42b06096a2342f4927e97f57ee7a46022f7f77d643'
        }
      });
      
      console.log('Prompt response:', JSON.stringify(getResponse.data.result.prompt, null, 2));
      console.log('Messages type:', Array.isArray(getResponse.data.result.prompt.messages) ? 'array' : 'not array');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testPromptMessages();
