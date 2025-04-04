import { 
  ResponseValidatorInterface, 
  TestCase, 
  ToolResponse, 
  ValidationResult,
  ValidationRule
} from '../types';

/**
 * Validator for tool responses
 */
export class ResponseValidator implements ResponseValidatorInterface {
  /**
   * Validate a tool response against a test case
   * @param response Tool response to validate
   * @param testCase Test case to validate against
   */
  validateResponse(response: ToolResponse, testCase: TestCase): ValidationResult {
    const errors: string[] = [];
    
    // Check if status matches expected outcome
    if (response.status !== testCase.expectedOutcome.status) {
      errors.push(`Expected status: ${testCase.expectedOutcome.status}, got: ${response.status}`);
      return { valid: false, errors };
    }

    // If expected error, we're done
    if (testCase.expectedOutcome.status === 'error') {
      return { valid: errors.length === 0, errors };
    }

    // Validate response data against rules
    if (testCase.expectedOutcome.validationRules && testCase.expectedOutcome.validationRules.length > 0) {
      const validationErrors = this.validateRules(response.data, testCase.expectedOutcome.validationRules);
      errors.push(...validationErrors);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate response data against validation rules
   * @param data Response data to validate
   * @param rules Validation rules to apply
   */
  private validateRules(data: any, rules: ValidationRule[]): string[] {
    const errors: string[] = [];

    for (const rule of rules) {
      const { type, target, value, message } = rule;

      // Skip rules with missing required fields
      if (!type || (type !== 'custom' && (!target || value === undefined))) {
        continue;
      }

      // Extract target value if specified
      const targetValue = target ? this.getPropertyValue(data, target) : data;

      switch (type) {
        case 'contains':
          if (typeof targetValue === 'string' && !targetValue.includes(value)) {
            errors.push(message);
          } else if (Array.isArray(targetValue) && !targetValue.includes(value)) {
            errors.push(message);
          }
          break;

        case 'matches':
          if (targetValue !== value) {
            errors.push(message);
          }
          break;

        case 'hasProperty':
          if (typeof targetValue !== 'object' || targetValue === null || !(value in targetValue)) {
            errors.push(message);
          }
          break;

        case 'custom':
          if (rule.customValidator && !rule.customValidator(data)) {
            errors.push(message);
          }
          break;
      }
    }

    return errors;
  }

  /**
   * Get a nested property value from an object
   * @param obj Object to get property from
   * @param path Path to property (e.g. 'user.name')
   */
  private getPropertyValue(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }
} 