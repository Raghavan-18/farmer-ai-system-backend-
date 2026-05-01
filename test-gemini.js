require('dotenv').config();
const axios = require('axios');

async function test() {
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          { role: 'user', parts: [{ text: 'Hello' }] }
        ]
      }
    );
    console.log('Success:', response.data.candidates[0].content.parts[0].text);
  } catch (err) {
    console.log('Error:', err.response?.data?.error || err.message);
  }
}
test();
