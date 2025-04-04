# MCP Server Tester

Automated testing tool for Model Context Protocol (MCP) servers

## Overview

MCP Server Tester is a command-line tool that helps you automatically test MCP servers by:

1. Connecting to an MCP server (local or remote)
2. Discovering available tools
3. Generating intelligent test cases using Claude
4. Running tests against the server
5. Validating responses
6. Generating comprehensive reports

## Installation

```bash
# Install globally
npm install -g mcp-server-tester

# Or use npx directly
npx mcp-server-tester -s your-server-package
```

## Usage

```bash
mcp-server-tester -s path/to/server -k your-anthropic-api-key
```

### Options

```
-s, --server <path>      Path to MCP server executable, npm package, or host:port for socket connection (required)
-n, --num-tests <number> Number of tests to generate per tool (default: 3)
-t, --timeout <ms>       Timeout for each test in milliseconds (default: 10000)
-o, --output <path>      Path to output report file
-f, --format <format>    Output format (json, html, console) (default: console)
-k, --api-key <key>      Anthropic API key (can also be set via ANTHROPIC_API_KEY env var or .env file)
-v, --verbose            Enable verbose logging
-h, --help               Display help information
-V, --version            Display version number
```

## Server Connection Methods

The tool supports multiple ways to connect to MCP servers:

### 1. NPM Package

Use an NPM package name directly, and the tool will use npx to run it:

```bash
mcp-server-tester -s @modelcontextprotocol/server-filesystem
```

### 2. Local Script

Use a path to a local script file:

```bash
# JavaScript/TypeScript
mcp-server-tester -s ./path/to/server.js

# Python
mcp-server-tester -s ./path/to/server.py
```

### 3. Socket Connection

Connect to a server running on a specific host and port:

```bash
mcp-server-tester -s localhost:3000
```

## Examples

### Basic usage

```bash
# Test a locally installed MCP server package
mcp-server-tester -s @modelcontextprotocol/server-filesystem

# Test an MCP server executable
mcp-server-tester -s ./path/to/my-server.js

# Test with custom settings
mcp-server-tester -s my-server -n 5 -t 15000 -f html -o report.html
```

### API Key Management

The tool provides several ways to provide your Anthropic API key:

#### 1. Command Line Argument

```bash
mcp-server-tester -s your-server -k your-anthropic-api-key
```

#### 2. Environment Variable

```bash
export ANTHROPIC_API_KEY=your-api-key
mcp-server-tester -s your-server
```

#### 3. .env File

Create a `.env` file in your project directory (you can copy and modify the included `.env.example` file):

```
ANTHROPIC_API_KEY=your-api-key
```

Then run:

```bash
mcp-server-tester -s your-server
```

The tool will automatically detect and use the API key from your .env file.

## Test Case Generation

The tool uses Claude to automatically generate test cases for each tool in the MCP server. Test cases include:

- Happy path tests with valid inputs
- Edge case tests with boundary values
- Error case tests with invalid inputs

Each test case contains:
- Description of what is being tested
- Input parameters
- Expected outcome
- Validation rules for checking the response

## Test Validation

The tester validates each response from the MCP server against expected outcomes, checking:

1. Response status (success or error)
2. Content validation using rules:
   - `contains`: Check if a string/array contains a specific value
   - `matches`: Verify exact value matches
   - `hasProperty`: Check if an object has a specific property
   - `custom`: Apply custom validation logic

## Reports

The tool can generate reports in multiple formats:

- **Console**: Displays results directly in the terminal
- **JSON**: Outputs a structured JSON file for programmatic analysis
- **HTML**: Creates a visual HTML report with detailed results

## Development

To set up the development environment:

```bash
# Clone the repository
git clone https://github.com/your-username/mcp-server-tester.git
cd mcp-server-tester

# Install dependencies
npm install

# Create your .env file from the example
cp .env.example .env
# Edit .env and add your API key

# Build the project
npm run build

# Run locally
npm run dev -- -s your-server-package
```

## Troubleshooting

### Connection Issues

- For socket connections, verify the host and port are correct
- For npx packages, ensure they're available in the npm registry
- For local files, check file permissions and path validity

### Tool Execution Timeouts

If you're experiencing timeouts during tool execution, try:

```bash
mcp-server-tester -s your-server -t 30000  # Increase timeout to 30 seconds
```

### Verbose Logging

For detailed logs to help diagnose issues:

```bash
mcp-server-tester -s your-server -v
```

## License

MIT 