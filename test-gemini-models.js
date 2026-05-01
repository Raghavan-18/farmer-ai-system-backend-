require('dotenv').config();
const axios = require('axios');

async function test() {
  try {
    const response = await axios.get(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
    );
    console.log(response.data.models.map(m => m.name).join(', '));
  } catch (err) {
    console.log('Error:', err.response?.data?.error || err.message);
  }
}
test();
