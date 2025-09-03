#!/usr/bin/env node

// Simple test script to verify MCP server can be started
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Testing GitHub Changelog MCP Server...\n');

// Build the project first
console.log('📦 Building project...');
const buildProcess = spawn('npm', ['run', 'build'], {
  cwd: __dirname,
  stdio: 'inherit'
});

buildProcess.on('close', (code) => {
  if (code !== 0) {
    console.error('❌ Build failed!');
    process.exit(1);
  }
  
  console.log('✅ Build successful!\n');
  
  // Test the MCP server
  console.log('🚀 Starting MCP server...');
  const serverProcess = spawn('node', ['dist/index.js'], {
    cwd: __dirname,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  let output = '';
  
  serverProcess.stdout.on('data', (data) => {
    output += data.toString();
  });
  
  serverProcess.stderr.on('data', (data) => {
    output += data.toString();
  });
  
  // Send a simple test message to see if server responds
  setTimeout(() => {
    console.log('📤 Sending test message...');
    
    const testMessage = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
      params: {}
    }) + '\n';
    
    serverProcess.stdin.write(testMessage);
    
    setTimeout(() => {
      console.log('📥 Server output:');
      console.log(output);
      
      if (output.includes('GitHub Changelog MCP Server running')) {
        console.log('✅ MCP Server is working correctly!');
      } else {
        console.log('⚠️  Server may have issues - check output above');
      }
      
      serverProcess.kill();
      process.exit(0);
    }, 2000);
  }, 1000);
  
  serverProcess.on('error', (error) => {
    console.error('❌ Server error:', error);
    process.exit(1);
  });
});