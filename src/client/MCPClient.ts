import { createModelContextProtocolClient, type ToolDefinition, type ModelContextProtocolResponse, type ExecuteToolParams, createStdioTransport, createNetworkTransport } from '@modelcontextprotocol/sdk';
import { spawn } from 'child_process';
import { ConfigLoader } from './ConfigLoader';
import net from 'net';

/**
 * Client for connecting to and interacting with MCP servers
 */
export class MCPClient {
  private client: any = null;
  private serverProcess: any = null;
  private configLoader: ConfigLoader = new ConfigLoader();
  private socket: net.Socket | null = null;
  
  /**
   * Connect to an MCP server
   * @param serverPathOrName Path to server executable, npm package, host:port for socket connection, or name from config
   * @param configPath Optional path to config file
   */
  async connect(serverPathOrName: string, configPath?: string): Promise<void> {
    // Load config if provided
    if (configPath) {
      this.configLoader.loadConfig(configPath);
    } else {
      // Try to load config from default location
      this.configLoader.loadConfig();
    }
    
    // Check if the server name is in the config
    if (this.configLoader.hasServer(serverPathOrName)) {
      return this.connectToConfiguredServer(serverPathOrName);
    }
    
    // Check if it's a host:port connection
    if (serverPathOrName.includes(':')) {
      return this.connectToSocket(serverPathOrName);
    }
    
    // Assume it's a path to an executable or an npm package
    return this.connectToExecutable(serverPathOrName);
  }
  
  /**
   * Connect to a server defined in the config
   */
  private async connectToConfiguredServer(serverName: string): Promise<void> {
    const serverProcess = this.configLoader.spawnServerProcess(serverName);
    
    if (!serverProcess) {
      throw new Error(`Failed to spawn configured server: ${serverName}`);
    }
    
    this.serverProcess = serverProcess;
    
    // Create transport
    const transport = createStdioTransport({
      stdin: serverProcess.stdin,
      stdout: serverProcess.stdout,
    });
    
    // Create client
    this.client = createModelContextProtocolClient({ transport });
    
    // Handle server errors
    serverProcess.on('error', (err: Error) => {
      console.error(`Server process error: ${err.message}`);
    });
    
    serverProcess.stderr.on('data', (data: Buffer) => {
      console.error(`Server stderr: ${data.toString().trim()}`);
    });
    
    // Wait for the client to be ready
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Give the server a moment to start
        resolve();
      }, 500);
    });
  }
  
  /**
   * Connect to a server via socket
   */
  private async connectToSocket(hostPort: string): Promise<void> {
    const [host, portStr] = hostPort.split(':');
    const port = parseInt(portStr, 10);
    
    if (!host || isNaN(port)) {
      throw new Error(`Invalid host:port format: ${hostPort}`);
    }
    
    return new Promise((resolve, reject) => {
      this.socket = new net.Socket();
      
      const transport = createNetworkTransport({
        socket: this.socket,
      });
      
      this.client = createModelContextProtocolClient({ transport });
      
      this.socket.on('error', (err) => {
        reject(new Error(`Socket connection error: ${err.message}`));
      });
      
      this.socket.connect(port, host, () => {
        console.log(`Connected to socket at ${host}:${port}`);
        resolve();
      });
    });
  }
  
  /**
   * Connect to an executable or npm package
   */
  private async connectToExecutable(serverPath: string): Promise<void> {
    let command: string;
    let args: string[] = [];
    
    if (serverPath.startsWith('@') || !serverPath.includes('/')) {
      // Assume it's an npm package
      command = 'npx';
      args = ['-y', serverPath];
    } else {
      // Assume it's a path to an executable
      command = serverPath;
    }
    
    const serverProcess = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    
    this.serverProcess = serverProcess;
    
    const transport = createStdioTransport({
      stdin: serverProcess.stdin,
      stdout: serverProcess.stdout,
    });
    
    this.client = createModelContextProtocolClient({ transport });
    
    // Handle errors
    serverProcess.on('error', (err: Error) => {
      throw new Error(`Failed to start server process: ${err.message}`);
    });
    
    serverProcess.stderr.on('data', (data: Buffer) => {
      console.error(`Server stderr: ${data.toString().trim()}`);
    });
    
    // Wait for the process to start
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Give the server a moment to start
        resolve();
      }, 500);
    });
  }
  
  /**
   * List the available servers in the config
   */
  listConfiguredServers(): string[] {
    return this.configLoader.getServerNames();
  }
  
  /**
   * Get available tools from the MCP server
   */
  listTools(): ToolDefinition[] {
    if (!this.client) {
      throw new Error('Not connected to MCP server');
    }
    
    return this.client.listFunctions();
  }
  
  /**
   * Execute a tool on the MCP server
   * @param toolName Name of the tool to execute
   * @param params Parameters to pass to the tool
   */
  async executeTool(toolName: string, params: any): Promise<ModelContextProtocolResponse> {
    if (!this.client) {
      throw new Error('Not connected to MCP server');
    }
    
    const executeParams: ExecuteToolParams = {
      name: toolName,
      parameters: params,
    };
    
    return await this.client.executeFunctionWithErrorParsing(executeParams);
  }
  
  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    // Close the socket if used
    if (this.socket) {
      this.socket.end();
      this.socket = null;
    }
    
    // Terminate the server process if applicable
    if (this.serverProcess) {
      try {
        this.serverProcess.kill();
        this.serverProcess = null;
      } catch (error) {
        console.error('Error killing server process:', error);
      }
    }
    
    this.client = null;
  }
} 