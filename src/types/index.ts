/**
 * Definition of a test case for an MCP tool
 */
export interface TestCase {
  toolName: string;
  description: string;
  inputs: Record<string, any>;
  expectedOutcome: {
    status: 'success' | 'error';
    schema?: Record<string, any>;
    validationRules?: ValidationRule[];
  };
}

/**
 * Rules for validating the content of a tool response
 */
export interface ValidationRule {
  type: 'contains' | 'matches' | 'hasProperty' | 'custom';
  target?: string;
  value?: any;
  customValidator?: (response: any) => boolean;
  message: string;
}

/**
 * Result of a test execution
 */
export interface TestResult {
  testCase: TestCase;
  passed: boolean;
  response?: any;
  validationErrors?: string[];
  executionTime?: number;
}

/**
 * Result of the validation process
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Configuration for the MCP server tester
 */
export interface TesterConfig {
  serverPath: string;
  numTestsPerTool?: number;
  timeoutMs?: number;
  outputFormat?: 'json' | 'console' | 'html';
  outputPath?: string;
  anthropicApiKey?: string;
  verbose?: boolean;
}

/**
 * Response from a tool execution
 */
export interface ToolResponse {
  status: 'success' | 'error';
  data?: any;
  error?: {
    message: string;
    code?: string;
  };
}

/**
 * Tool definition with JSON schema
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
}

/**
 * Wrapper for accessing MCP server tools
 */
export interface MCPClientInterface {
  connect(serverPath: string): Promise<void>;
  listTools(): ToolDefinition[];
  executeTool(name: string, params: Record<string, any>): Promise<ToolResponse>;
  disconnect(): Promise<void>;
}

/**
 * Generator for test cases
 */
export interface TestGeneratorInterface {
  generateTests(tools: ToolDefinition[], config: TesterConfig): Promise<TestCase[]>;
}

/**
 * Validator for tool responses
 */
export interface ResponseValidatorInterface {
  validateResponse(response: ToolResponse, testCase: TestCase): ValidationResult;
}

/**
 * Reporter for test results
 */
export interface ReporterInterface {
  generateReport(results: TestResult[], config: TesterConfig): Promise<void>;
} 