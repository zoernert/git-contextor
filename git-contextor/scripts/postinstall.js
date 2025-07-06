#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up Git Contextor...');

// Check if Docker is available
function checkDocker() {
  try {
    execSync('docker --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Create example .env file if it doesn't exist
function createExampleEnv() {
  const envPath = path.join(process.cwd(), '.env.example');
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
    console.log('✅ Created .env.example file');
  }
}

// Display setup instructions
function showInstructions() {
  const hasDocker = checkDocker();
  
  console.log('\n🎉 Git Contextor installed successfully!');
  console.log('\nNext steps:');
  console.log('1. Navigate to your git repository');
  console.log('2. Run: npx git-contextor init');
  
  if (hasDocker) {
    console.log('3. Start Qdrant: docker run -p 6333:6333 qdrant/qdrant');
  } else {
    console.log('3. Install Docker and run: docker run -p 6333:6333 qdrant/qdrant');
    console.log('   Or install Qdrant locally: https://qdrant.tech/documentation/quick_start/');
  }
  
  console.log('4. Run: npx git-contextor start');
  console.log('5. Open http://localhost:3000 in your browser');
  
  console.log('\n📚 Documentation: https://github.com/stromdao/git-contextor#readme');
  console.log('💬 Need help? Open an issue: https://github.com/stromdao/git-contextor/issues');
}

// Main setup
try {
  createExampleEnv();
  showInstructions();
} catch (error) {
  console.error('❌ Setup failed:', error.message);
  process.exit(1);
}const net = require('net');

function checkCommonIssues() {
  // Check if port 3000 is available, as it's the default
  const defaultPort = 3000;
  const server = net.createServer();

  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`\n⚠️  Warning: Port ${defaultPort} is currently in use.`);
      console.warn(`   If you start git-contextor, it may fail. You can specify a different port with:`);
      console.warn(`   git-contextor start --port <other_port>\n`);
    }
  });

  server.once('listening', () => {
    server.close();
  });

  server.listen(defaultPort);

  // Provide general advice
  console.log('\n💡 Git Contextor Tips:');
  console.log('   - Ensure Docker is running before you start the service to use Qdrant.');
  console.log('   - Check your firewall to ensure ports 3000 (API) and 6333 (Qdrant) are accessible.');
  console.log('   - For verbose logs, run commands with the DEBUG environment variable, e.g., DEBUG=git-contextor:* git-contextor start\n');
}

console.log('Running Git Contextor post-install checks...');
try {
    checkCommonIssues();
} catch (error) {
    console.warn('Could not run post-install checks:', error.message);
}
