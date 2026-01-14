/**
 * Test script for Ollama Local AI
 * Run with: npx tsx scripts/test-ollama.ts
 */

import { 
    checkOllamaHealth, 
    generateWithOllama, 
    testOllama,
    getDefaultOllamaConfig 
} from '../lib/ollama';

async function main() {
    console.log('🧪 Testing Industrial-Grade Local AI Setup...\n');

    // 1. Health Check
    console.log('1️⃣ Checking Ollama health...');
    const health = await checkOllamaHealth();
    
    if (!health.healthy) {
        console.error('❌ Ollama is not healthy:', health.error);
        process.exit(1);
    }
    
    console.log('✅ Ollama is healthy!');
    console.log(`   URL: ${health.url}`);
    console.log(`   Models: ${health.models.length}`);
    health.models.forEach(m => {
        console.log(`   - ${m.name} (${(m.size / 1024 / 1024).toFixed(2)} MB)`);
    });
    console.log('');

    // 2. Quick Test
    console.log('2️⃣ Running quick generation test...');
    const testResult = await testOllama();
    
    if (!testResult.success) {
        console.error('❌ Test failed:', testResult.error);
        process.exit(1);
    }
    
    console.log('✅ Generation test passed!');
    console.log(`   Response: ${testResult.response}`);
    console.log(`   Duration: ${testResult.duration}ms`);
    console.log('');

    // 3. Production Test
    console.log('3️⃣ Testing production prompt...');
    const config = getDefaultOllamaConfig();
    const prompt = `You are a professional AI assistant for truck driver logistics.
Call a driver named "Rajesh" and ask about their current location.
Keep the conversation brief and professional in Hindi.`;

    try {
        const startTime = Date.now();
        const result = await generateWithOllama(prompt, config);
        const duration = Date.now() - startTime;

        console.log('✅ Production test passed!');
        console.log(`   Model: ${result.model}`);
        console.log(`   Response length: ${result.response.length} characters`);
        console.log(`   Duration: ${duration}ms`);
        if (result.evalCount && result.evalDuration) {
            const tokensPerSecond = (result.evalCount / (result.evalDuration / 1e9)).toFixed(1);
            console.log(`   Speed: ${tokensPerSecond} tokens/sec`);
        }
        console.log(`   Response preview: ${result.response.substring(0, 100)}...`);
        console.log('');

        // 4. Summary
        console.log('════════════════════════════════════════');
        console.log('✅ All tests passed! Local AI is ready.');
        console.log('════════════════════════════════════════');
        console.log('');
        console.log('📊 Performance Metrics:');
        console.log(`   - Model: ${config.model}`);
        console.log(`   - Response time: ${duration}ms`);
        console.log(`   - Status: Production Ready`);
        console.log('');

    } catch (error) {
        console.error('❌ Production test failed:', error);
        process.exit(1);
    }
}

main().catch(console.error);






