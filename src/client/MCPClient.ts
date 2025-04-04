import { 
  MCPServer, 
  createStdioTransport,
  createSocketTransport,
  ServerSession,
  ToolDefinition as MCPToolDefinition
} from '@modelcontextprotocol/sdk';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { 
  MCPClientInterface, 
  ToolDefinition, 
  ToolResponse 
} from '../types';

/**
 * Client for connecting to and interacting with MCP servers
 */
export class MCPClient implements MCPClientInterface {
  private server: MCPServer | null = null;
  private session: ServerSession | null = null;
  private tools: ToolDefinition[] = [];
  private serverProcess: any = null;

  /**
   * Connect to an MCP server
   * @param serverPath Path to the server executable or npm package
   */
  async connect(serverPath: string): Promise<void> {
    try {
      // Check if serverPath exists
      if (!serverPath) {
        throw new Error('Server path is required');
      }

      let transport;
      
      // Determine server type and create appropriate transport
      if (serverPath.includes(':')) {
        // Socket transport (format: host:port)
        const [host, portStr] = serverPath.split(':');
        const port = parseInt(portStr);
        
        if (isNaN(port)) {
          throw new Error('Invalid socket format. Expected host:port');
        }
        
        transport = createSocketTransport({ host, port });
      } else {
        // Check if serverPath is a local file or npm package
        const isJsPackage = !fs.existsSync(serverPath) || serverPath.startsWith('@');
        
        if (isJsPackage) {
          // Assume it's an npm package
          this.serverProcess = spawn('npx', ['--yes', serverPath], {
            stdio: ['pipe', 'pipe', 'pipe']
          });
          
          transport = createStdioTransport({
            stdin: this.serverProcess.stdin,
            stdout: this.serverProcess.stdout,
          });
        } else {
          // Assume it's an executable or script
          const ext = path.extname(serverPath);
          
          if (ext === '.js' || ext === '.ts') {
            // For JS/TS scripts
            this.serverProcess = spawn('node', [serverPath], {
              stdio: ['pipe', 'pipe', 'pipe']
            });
          } else if (ext === '.py') {
            // For Python scripts
            this.serverProcess = spawn('python', [serverPath], {
              stdio: ['pipe', 'pipe', 'pipe']
            });
          } else {
            // For other executables
            this.serverProcess = spawn(serverPath, [], {
              stdio: ['pipe', 'pipe', 'pipe']
            });
          }
          
          transport = createStdioTransport({
            stdin: this.serverProcess.stdin,
            stdout: this.serverProcess.stdout,
          });
        }
      }

      // Create MCP server instance and connect
      this.server = new MCPServer({ transport });
      
      // Initialize session
      this.session = await this.server.createSession();

      // Get available tools
      const tools = await this.session.listTools();
      this.tools = tools.map((tool: MCPToolDefinition) => this.convertToolDefinition(tool));

      console.log(`Connected to MCP server with ${this.tools.length} available tools`);
    } catch (error) {
      console.error('Failed to connect to MCP server:', error);
      await this.disconnect();
      throw error;
    }
  }

  /**
   * List available tools from the connected MCP server
   */
  listTools(): ToolDefinition[] {
    if (!this.session) {
      throw new Error('Not connected to an MCP server');
    }
    return this.tools;
  }

  /**
   * Execute a tool from the MCP server
   * @param name Name of the tool to execute
   * @param params Parameters to pass to the tool
   */
  async executeTool(name: string, params: Record<string, any>): Promise<ToolResponse> {
    if (!this.session) {
      throw new Error('Not connected to an MCP server');
    }

    try {
      const startTime = Date.now();
      const response = await this.session.callTool(name, params);
      const executionTime = Date.now() - startTime;

      return {
        status: 'success',
        data: response
      };
    } catch (error: any) {
      return {
        status: 'error',
        error: {
          message: error.message || 'Unknown error',
          code: error.code
        }
      };
    }
  }

  /**
   * Disconnect from the MCP server and clean up resources
   */
  async disconnect(): Promise<void> {
    try {
      if (this.session) {
        await this.session.close();
        this.session = null;
      }

      if (this.server) {
        await this.server.close();
        this.server = null;
      }

      if (this.serverProcess) {
        this.serverProcess.kill();
        this.serverProcess = null;
      }

      this.tools = [];
    } catch (error) {
      console.error('Error disconnecting from MCP server:', error);
    }
  }

  /**
   * Convert MCP tool definition to internal format
   */
  private convertToolDefinition(tool: MCPToolDefinition): ToolDefinition {
    return {
      name: tool.name,
      description: tool.description || '',
      parameters: tool.parameters
    };
  }
} 