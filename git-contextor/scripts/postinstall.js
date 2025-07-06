#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const net = require('net');

function checkDocker() {
  try {
    execSync('docker --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function createExampleEnv() {
  const envPath = path.resolve(process.cwd(), '.env.example');
  if (!fs.existsSync(envPath)) {
    const envContent = `# Git Contextor Environment Variables
# Uncomment and set the appropriate API key for your embedding provider

# For OpenAI embeddings
# OPENAI_API_KEY=your_openai_api_key_here

# For Google/Gemini embeddings  
# GOOGLE_API_KEY=your_google_api_key_here

# Qdrant Vector Database (usually localhost for local development)
QDRANT_HOST=localhost
QDRANT_PORT=6333
`;
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Created .env.example file.');
  }
}

function checkPort(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(false); // Port is in use
            } else {
                resolve(true); // Other error, assume port is available
            }
        });
        server.once('listening', () => {
            server.close(() => resolve(true)); // Port is free
        });
        server.listen(port);
    });
}

async function main() {
    console.log('🚀 Running Git Contextor post-install checks...');
    try {
        createExampleEnv();
        
        const hasDocker = checkDocker();
        const isPortFree = await checkPort(3000);

        console.log('\n🎉 Git Contextor installed successfully!');
        console.log('\nNext steps:');
        console.log('1. Navigate to your git repository: cd /path/to/your-project');
        console.log('2. Initialize the project: npx git-contextor init');
        
        if (hasDocker) {
            console.log('3. Start the vector database: docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant');
        } else {
            console.log('3. ⚠️ Docker not found. Please install Docker and then run: docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant');
            console.log('   Alternatively, install Qdrant locally: https://qdrant.tech/documentation/quick_start/');
        }
        
        console.log('4. Start the service: npx git-contextor start');
        if (!isPortFree) {
            console.warn('   ⚠️ Port 3000 may be in use. The start command might fail. Use a different port if needed:');
            console.warn('      npx git-contextor start --port 3001');
        }
        console.log('5. Open the dashboard: http://localhost:3000 (if using the default port)');
        
        console.log('\n💡 Tip: For verbose logs, use the DEBUG environment variable, e.g., DEBUG=git-contextor:* npx git-contextor start');
        console.log('📚 For more details, check the README: https://github.com/stromdao/git-contextor#readme');
        console.log('💬 Need help? Open an issue: https://github.com/stromdao/git-contextor/issues\n');

    } catch (error) {
        console.error('❌ Post-install setup failed:', error.message);
    }
}

main();
