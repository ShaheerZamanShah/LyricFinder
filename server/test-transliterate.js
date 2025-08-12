const axios = require('axios');

async function testTransliteration() {
    const PORT = process.env.PORT || 5000;
    const baseUrl = `http://localhost:${PORT}`;
    const testCases = [
        { text: "こんにちは 世界", description: "Japanese" },
        { text: "你好世界", description: "Chinese" },
        { text: "안녕 세상", description: "Korean" },
        { text: "Я люблю тебя", description: "Russian" },
        { text: "سلام دنیا", description: "Farsi/Persian" }
    ];

    console.log('Testing transliteration API...\n');

    for (const testCase of testCases) {
        try {
            console.log(`Testing ${testCase.description}: "${testCase.text}"`);
            
            const response = await axios.post(`${baseUrl}/api/transliterate`, {
                text: testCase.text
            });

            console.log(`✓ Result: "${response.data.result}"`);
            console.log(`  Method: ${response.data.method}`);
            console.log(`  Provider: ${response.data.provider || 'N/A'}`);
            console.log('');
        } catch (error) {
            console.log(`✗ Error: ${error.message || 'Unknown error'}`);
            if (error.response) {
                console.log(`  Status: ${error.response.status}`);
                console.log(`  Response: ${JSON.stringify(error.response.data)}`);
            } else if (error.request) {
                console.log('  No response received from server.');
            } else {
                console.log(`  Error details: ${error.stack}`);
            }
            console.log('');
        }
    }
}

testTransliteration();
