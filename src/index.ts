#!/usr/bin/env node

import { Command } from 'commander';
import { config as loadEnv } from 'dotenv';
import path from 'path';
import fs from 'fs';
import { MCPClient } from './client/MCPClient';
import { TestGenerator } from './test-generator/TestGenerator';
import { ResponseValidator } from './validator/ResponseValidator';
import { Reporter } from './reporter/Reporter';
import { TesterConfig, TestResult } from './types';

// Load environment variables from .env file
loadEnv();

// Check for local .env in current working directory
const localEnvPath = path.join(process.cwd(), '.env');
if (fs.existsSync(localEnvPath)) {
  loadEnv({ path: localEnvPath });
}

const program = new Command();

program
  .name('mcp-server-tester')
  .description('Automated testing tool for MCP servers')
  .version('0.1.0');

program
  .requiredOption('-s, --server <path>', 'Path to MCP server executable, npm package, or host:port for socket connection')
  .option('-n, --num-tests <number>', 'Number of tests to generate per tool', '3')
  .option('-t, --timeout <ms>', 'Timeout for each test in milliseconds', '10000')
  .option('-o, --output <path>', 'Path to output report file')
  .option('-f, --format <format>', 'Output format (json, html, console)', 'console')
  .option('-k, --api-key <key>', 'Anthropic API key (can also be set via ANTHROPIC_API_KEY env var or .env file)')
  .option('-v, --verbose', 'Enable verbose logging')
  .parse(process.argv);

async function runTests() {
  let client: MCPClient | null = null;
  
  try {
    const options = program.opts();
    const verbose = options.verbose || false;
    
    // Check for API key (command line arg > env var)
    const apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('Error: Anthropic API key is required. Set it with --api-key, ANTHROPIC_API_KEY env var, or in a .env file.');
      process.exit(1);
    }

    // Create configuration
    const config: TesterConfig = {
      serverPath: options.server,
      numTestsPerTool: parseInt(options.numTests),
      timeoutMs: parseInt(options.timeout),
      outputFormat: options.format as 'json' | 'console' | 'html',
      outputPath: options.output,
      anthropicApiKey: apiKey,
      verbose
    };

    if (verbose) {
      console.log(`Configuration:`, JSON.stringify({
        ...config,
        anthropicApiKey: '***' // Hide the actual API key in logs
      }, null, 2));
    }
    
    console.log(`Starting MCP server testing for: ${config.serverPath}`);

    // Initialize components
    client = new MCPClient();
    const testGenerator = new TestGenerator(apiKey);
    const validator = new ResponseValidator();
    const reporter = new Reporter();

    // Connect to server with timeout
    console.log('Connecting to MCP server...');
    const connectionPromise = client.connect(config.serverPath);
    
    // Set up timeout for connection
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), config.timeoutMs);
    });
    
    // Wait for connection or timeout
    await Promise.race([connectionPromise, timeoutPromise]);
    
    // Get available tools
    const tools = client.listTools();
    console.log(`Found ${tools.length} tools: ${tools.map(t => t.name).join(', ')}`);
    
    if (tools.length === 0) {
      console.error('No tools found in the MCP server. Nothing to test.');
      return;
    }

    // Generate tests
    console.log(`Generating ${config.numTestsPerTool} tests per tool...`);
    const testCases = await testGenerator.generateTests(tools, config);
    console.log(`Generated ${testCases.length} test cases in total.`);

    // Run tests
    console.log('Running tests...');
    const results: TestResult[] = [];

    for (const testCase of testCases) {
      console.log(`Testing ${testCase.toolName}: ${testCase.description}`);
      
      try {
        // Execute the tool with timeout
        const startTime = Date.now();
        
        const toolPromise = client.executeTool(testCase.toolName, testCase.inputs);
        const toolTimeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Tool execution timeout')), config.timeoutMs);
        });
        
        const response = await Promise.race([toolPromise, toolTimeoutPromise]);
        const executionTime = Date.now() - startTime;
        
        // Validate the response
        const validationResult = validator.validateResponse(response, testCase);
        
        // Create test result
        const result: TestResult = {
          testCase,
          passed: validationResult.valid,
          response,
          validationErrors: validationResult.errors,
          executionTime
        };
        
        results.push(result);
        
        // Log result
        if (result.passed) {
          console.log(`  ✓ Passed (${executionTime}ms)`);
        } else {
          console.log(`  ✗ Failed: ${validationResult.errors.join(', ')}`);
        }
      } catch (error) {
        console.error(`  ✗ Error executing test:`, error);
        results.push({
          testCase,
          passed: false,
          validationErrors: [`Unexpected error: ${error instanceof Error ? error.message : String(error)}`]
        });
      }
    }

    // Generate report
    await reporter.generateReport(results, config);
    
    console.log('Testing complete!');
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    if (program.opts().verbose && error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    // Ensure we always clean up
    if (client) {
      try {
        await client.disconnect();
      } catch (error) {
        console.error('Error disconnecting from server:', error);
      }
    }
  }
}

runTests().catch(error => {
  console.error('Unhandled error:', error instanceof Error ? error.message : String(error));
  if (program.opts().verbose && error instanceof Error && error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
}); 