import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { 
  ReporterInterface, 
  TestResult, 
  TesterConfig 
} from '../types';

/**
 * Reporter for test results
 */
export class Reporter implements ReporterInterface {
  /**
   * Generate a report for test results
   * @param results Test results to report
   * @param config Tester configuration
   */
  async generateReport(results: TestResult[], config: TesterConfig): Promise<void> {
    // Log summary to console
    this.logConsoleReport(results);
    
    // Generate output file if requested
    if (config.outputFormat && config.outputPath) {
      await this.writeReport(results, config);
    }
  }

  /**
   * Log test results to console
   * @param results Test results to log
   */
  private logConsoleReport(results: TestResult[]): void {
    const passedCount = results.filter(r => r.passed).length;
    const failedCount = results.length - passedCount;
    const passRate = results.length > 0 ? Math.round((passedCount / results.length) * 100) : 0;
    
    console.log('\n=======================================');
    console.log('         MCP SERVER TEST REPORT        ');
    console.log('=======================================');
    console.log(`Total tests: ${results.length}`);
    console.log(`Passed: ${chalk.green(passedCount)}`);
    console.log(`Failed: ${chalk.red(failedCount)}`);
    console.log(`Pass rate: ${chalk.yellow(passRate + '%')}`);
    console.log('=======================================\n');

    // Group results by tool
    const toolResults = new Map<string, TestResult[]>();
    
    for (const result of results) {
      if (!toolResults.has(result.testCase.toolName)) {
        toolResults.set(result.testCase.toolName, []);
      }
      toolResults.get(result.testCase.toolName)!.push(result);
    }

    // Print details for each tool
    for (const [toolName, toolTestResults] of toolResults.entries()) {
      const toolPassCount = toolTestResults.filter(r => r.passed).length;
      const toolPassRate = Math.round((toolPassCount / toolTestResults.length) * 100);
      
      console.log(chalk.bold(`Tool: ${toolName} (${toolPassCount}/${toolTestResults.length} - ${toolPassRate}%)\n`));
      
      for (const result of toolTestResults) {
        const status = result.passed ? chalk.green('✓ PASS') : chalk.red('✗ FAIL');
        console.log(`  ${status} ${result.testCase.description}`);
        
        if (!result.passed && result.validationErrors) {
          for (const error of result.validationErrors) {
            console.log(`    ${chalk.red('→')} ${error}`);
          }
        }
      }
      
      console.log('');
    }
  }

  /**
   * Write test results to a file
   * @param results Test results to write
   * @param config Tester configuration
   */
  private async writeReport(results: TestResult[], config: TesterConfig): Promise<void> {
    const outputPath = config.outputPath!;
    
    // Create directory if it doesn't exist
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write report based on format
    switch (config.outputFormat) {
      case 'json':
        await fs.promises.writeFile(
          outputPath,
          JSON.stringify(results, null, 2),
          'utf-8'
        );
        console.log(`JSON report written to: ${outputPath}`);
        break;
        
      case 'html':
        const htmlReport = this.generateHtmlReport(results);
        await fs.promises.writeFile(outputPath, htmlReport, 'utf-8');
        console.log(`HTML report written to: ${outputPath}`);
        break;
        
      default:
        const textReport = this.generateTextReport(results);
        await fs.promises.writeFile(outputPath, textReport, 'utf-8');
        console.log(`Text report written to: ${outputPath}`);
    }
  }

  /**
   * Generate a plain text report
   * @param results Test results to report
   */
  private generateTextReport(results: TestResult[]): string {
    const passedCount = results.filter(r => r.passed).length;
    const failedCount = results.length - passedCount;
    const passRate = results.length > 0 ? Math.round((passedCount / results.length) * 100) : 0;
    
    let report = '=======================================\n';
    report += '         MCP SERVER TEST REPORT         \n';
    report += '=======================================\n';
    report += `Total tests: ${results.length}\n`;
    report += `Passed: ${passedCount}\n`;
    report += `Failed: ${failedCount}\n`;
    report += `Pass rate: ${passRate}%\n`;
    report += '=======================================\n\n';

    // Group results by tool
    const toolResults = new Map<string, TestResult[]>();
    
    for (const result of results) {
      if (!toolResults.has(result.testCase.toolName)) {
        toolResults.set(result.testCase.toolName, []);
      }
      toolResults.get(result.testCase.toolName)!.push(result);
    }

    // Add details for each tool
    for (const [toolName, toolTestResults] of toolResults.entries()) {
      const toolPassCount = toolTestResults.filter(r => r.passed).length;
      const toolPassRate = Math.round((toolPassCount / toolTestResults.length) * 100);
      
      report += `Tool: ${toolName} (${toolPassCount}/${toolTestResults.length} - ${toolPassRate}%)\n\n`;
      
      for (const result of toolTestResults) {
        const status = result.passed ? 'PASS' : 'FAIL';
        report += `  [${status}] ${result.testCase.description}\n`;
        
        if (!result.passed && result.validationErrors) {
          for (const error of result.validationErrors) {
            report += `    → ${error}\n`;
          }
        }
      }
      
      report += '\n';
    }

    return report;
  }

  /**
   * Generate an HTML report
   * @param results Test results to report
   */
  private generateHtmlReport(results: TestResult[]): string {
    const passedCount = results.filter(r => r.passed).length;
    const failedCount = results.length - passedCount;
    const passRate = results.length > 0 ? Math.round((passedCount / results.length) * 100) : 0;

    // Group results by tool
    const toolResults = new Map<string, TestResult[]>();
    
    for (const result of results) {
      if (!toolResults.has(result.testCase.toolName)) {
        toolResults.set(result.testCase.toolName, []);
      }
      toolResults.get(result.testCase.toolName)!.push(result);
    }

    let toolSections = '';
    
    for (const [toolName, toolTestResults] of toolResults.entries()) {
      const toolPassCount = toolTestResults.filter(r => r.passed).length;
      const toolPassRate = Math.round((toolPassCount / toolTestResults.length) * 100);
      
      let testRows = '';
      
      for (const result of toolTestResults) {
        const statusClass = result.passed ? 'success' : 'danger';
        const statusText = result.passed ? 'PASS' : 'FAIL';
        
        let errorDetails = '';
        if (!result.passed && result.validationErrors && result.validationErrors.length > 0) {
          errorDetails = `
            <div class="error-details">
              <ul>
                ${result.validationErrors.map(error => `<li>${error}</li>`).join('')}
              </ul>
            </div>
          `;
        }
        
        testRows += `
          <tr>
            <td><span class="badge bg-${statusClass}">${statusText}</span></td>
            <td>${result.testCase.description}</td>
            <td><pre>${JSON.stringify(result.testCase.inputs, null, 2)}</pre></td>
            <td>${errorDetails}</td>
          </tr>
        `;
      }
      
      toolSections += `
        <div class="card mb-4">
          <div class="card-header">
            <h5>Tool: ${toolName}</h5>
            <div class="tool-stats">
              <span class="badge bg-primary">${toolPassCount}/${toolTestResults.length} - ${toolPassRate}%</span>
            </div>
          </div>
          <div class="card-body">
            <table class="table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Description</th>
                  <th>Inputs</th>
                  <th>Errors</th>
                </tr>
              </thead>
              <tbody>
                ${testRows}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MCP Server Test Report</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    .summary-card {
      background-color: #f8f9fa;
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .summary-stat {
      text-align: center;
      padding: 10px;
    }
    .error-details {
      font-size: 14px;
      color: #dc3545;
    }
    pre {
      font-size: 12px;
      max-height: 100px;
      overflow-y: auto;
    }
  </style>
</head>
<body>
  <div class="container mt-4 mb-5">
    <h1 class="mb-4">MCP Server Test Report</h1>
    
    <div class="summary-card">
      <div class="row">
        <div class="col-md-3 summary-stat">
          <h3>${results.length}</h3>
          <p>Total Tests</p>
        </div>
        <div class="col-md-3 summary-stat">
          <h3 class="text-success">${passedCount}</h3>
          <p>Passed</p>
        </div>
        <div class="col-md-3 summary-stat">
          <h3 class="text-danger">${failedCount}</h3>
          <p>Failed</p>
        </div>
        <div class="col-md-3 summary-stat">
          <h3 class="text-primary">${passRate}%</h3>
          <p>Pass Rate</p>
        </div>
      </div>
    </div>
    
    ${toolSections}
  </div>
</body>
</html>
    `;
  }
} 