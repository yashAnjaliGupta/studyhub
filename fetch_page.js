const axios = require('axios');

async function test(url) {
  try {
    const response = await axios.get(url);
    console.log(`URL: ${url} -> Status: ${response.status}`);
  } catch (error) {
    console.log(`URL: ${url} -> Status: ${error.response ? error.response.status : error.message}`);
    if (error.response) {
      console.log(`Response Body Snippet: ${String(error.response.data).slice(0, 500)}`);
    }
  }
}

async function main() {
  await test('http://localhost:3000/CBSE/Class%20X/Mathematics/NonExistentBook');
}

main();
