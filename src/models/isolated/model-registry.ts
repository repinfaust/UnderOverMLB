import {
  IsolatedModel,
  ModelInputData,
  ModelPrediction,
  ModelRegistry,
  ModelExecutionContext,
} from '../../types/model-interfaces.js';

export class SafeModelRegistry implements ModelRegistry {
  private models: Map<string, IsolatedModel> = new Map();
  private executionHistory: Map<string, Array<{ context: ModelExecutionContext; result: ModelPrediction | Error }>> = new Map();
  private isolationViolations: Map<string, number> = new Map();

  registerModel(model: IsolatedModel): void {
    if (this.models.has(model.modelName)) {
      throw new Error(`Model ${model.modelName} is already registered`);
    }

    // Validate model implementation
    this.validateModelImplementation(model);
    
    this.models.set(model.modelName, model);
    this.executionHistory.set(model.modelName, []);
    this.isolationViolations.set(model.modelName, 0);
    
    console.log(`Model ${model.modelName} v${model.version} registered successfully`);
  }

  getModel(modelName: string): IsolatedModel | null {
    return this.models.get(modelName) || null;
  }

  getAllModels(): IsolatedModel[] {
    return Array.from(this.models.values());
  }

  async validateModelIsolation(modelName: string): Promise<boolean> {
    const model = this.getModel(modelName);
    if (!model) {
      throw new Error(`Model ${modelName} not found`);
    }

    // Check for isolation violations
    const violations = this.isolationViolations.get(modelName) || 0;
    if (violations > 0) {
      console.warn(`Model ${modelName} has ${violations} isolation violations`);
      return false;
    }

    // Validate that model doesn't access global state
    const globalStateCheck = await this.checkGlobalStateAccess(model);
    if (!globalStateCheck.isolated) {
      console.error(`Model ${modelName} failed isolation check:`, globalStateCheck.violations);
      return false;
    }

    return true;
  }

  async executeModelSafely(
    modelName: string,
    input: ModelInputData,
    modelSpecificData: any,
    context: ModelExecutionContext
  ): Promise<ModelPrediction> {
    const model = this.getModel(modelName);
    if (!model) {
      throw new Error(`Model ${modelName} not found`);
    }

    // Validate isolation is enabled
    if (!context.isolation.preventCrossTalk || !context.isolation.sandboxed) {
      throw new Error(`Model ${modelName} must be executed with isolation enabled`);
    }

    const startTime = Date.now();
    let result: ModelPrediction | Error;

    try {
      // Create isolated execution environment
      const isolatedExecution = this.createIsolatedExecution(model, context);
      
      // Execute with timeout
      result = await this.executeWithTimeout(
        () => isolatedExecution.predict(input, modelSpecificData),
        context.isolation.timeoutMs
      );

      // Validate result format
      this.validatePredictionResult(result, modelName);
      
      // Check for isolation violations during execution
      await this.checkForIsolationViolations(modelName, context);

      const executionTime = Date.now() - startTime;
      console.log(`Model ${modelName} executed successfully in ${executionTime}ms`);

    } catch (error) {
      result = error instanceof Error ? error : new Error(String(error));
      console.error(`Model ${modelName} execution failed:`, result.message);
      
      // Record isolation violation if applicable
      if (this.isIsolationViolation(error)) {
        this.recordIsolationViolation(modelName);
      }
    }

    // Record execution history
    const execution = { context, result };
    const history = this.executionHistory.get(modelName) || [];
    history.push(execution);
    
    // Keep only last 100 executions
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    
    this.executionHistory.set(modelName, history);

    if (result instanceof Error) {
      throw result;
    }

    return result;
  }

  private validateModelImplementation(model: IsolatedModel): void {
    // Validate required methods exist
    if (typeof model.predict !== 'function') {
      throw new Error(`Model ${model.modelName} missing predict method`);
    }
    
    if (typeof model.validate !== 'function') {
      throw new Error(`Model ${model.modelName} missing validate method`);
    }
    
    if (typeof model.getRequiredDataFields !== 'function') {
      throw new Error(`Model ${model.modelName} missing getRequiredDataFields method`);
    }
    
    if (typeof model.getOptionalDataFields !== 'function') {
      throw new Error(`Model ${model.modelName} missing getOptionalDataFields method`);
    }
    
    if (typeof model.getModelParameters !== 'function') {
      throw new Error(`Model ${model.modelName} missing getModelParameters method`);
    }

    // Validate readonly properties
    if (!model.modelName || typeof model.modelName !== 'string') {
      throw new Error(`Model must have a valid modelName`);
    }
    
    if (!model.version || typeof model.version !== 'string') {
      throw new Error(`Model must have a valid version`);
    }
    
    if (!model.description || typeof model.description !== 'string') {
      throw new Error(`Model must have a valid description`);
    }
  }

  private createIsolatedExecution(model: IsolatedModel, context: ModelExecutionContext): IsolatedModel {
    // Create a sandboxed copy of the model to prevent state pollution
    const isolatedModel = Object.create(Object.getPrototypeOf(model));
    
    // Copy only the essential methods and properties
    isolatedModel.modelName = model.modelName;
    isolatedModel.version = model.version;
    isolatedModel.description = model.description;
    isolatedModel.predict = model.predict.bind(model);
    isolatedModel.validate = model.validate.bind(model);
    isolatedModel.getRequiredDataFields = model.getRequiredDataFields.bind(model);
    isolatedModel.getOptionalDataFields = model.getOptionalDataFields.bind(model);
    isolatedModel.getModelParameters = model.getModelParameters.bind(model);
    
    // Prevent access to registry and other models
    Object.freeze(isolatedModel);
    
    return isolatedModel;
  }

  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Model execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      fn()
        .then(result => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  private validatePredictionResult(result: ModelPrediction, modelName: string): void {
    if (!result || typeof result !== 'object') {
      throw new Error(`Model ${modelName} returned invalid result type`);
    }

    const requiredFields = ['modelName', 'prediction', 'confidence', 'calculatedTotal', 'reasoning', 'factorsUsed', 'keyInsights', 'predictionTime', 'gameId'];
    
    for (const field of requiredFields) {
      if (!(field in result)) {
        throw new Error(`Model ${modelName} result missing required field: ${field}`);
      }
    }

    // Validate specific field types and ranges
    if (result.modelName !== modelName) {
      throw new Error(`Model ${modelName} returned incorrect modelName: ${result.modelName}`);
    }

    if (!['Over', 'Under'].includes(result.prediction)) {
      throw new Error(`Model ${modelName} returned invalid prediction: ${result.prediction}`);
    }

    if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 1) {
      throw new Error(`Model ${modelName} returned invalid confidence: ${result.confidence}`);
    }

    if (typeof result.calculatedTotal !== 'number' || result.calculatedTotal < 0 || result.calculatedTotal > 50) {
      throw new Error(`Model ${modelName} returned invalid calculatedTotal: ${result.calculatedTotal}`);
    }

    if (!Array.isArray(result.factorsUsed) || result.factorsUsed.length === 0) {
      throw new Error(`Model ${modelName} must specify factors used in prediction`);
    }

    if (!Array.isArray(result.keyInsights)) {
      throw new Error(`Model ${modelName} must provide key insights array`);
    }
  }

  private async checkGlobalStateAccess(model: IsolatedModel): Promise<{ isolated: boolean; violations: string[] }> {
    const violations: string[] = [];
    
    // Check if model tries to access process.env or global variables
    const modelString = model.toString();
    
    if (modelString.includes('process.env') && !modelString.includes('// ALLOWED:')) {
      violations.push('Unauthorized process.env access');
    }
    
    if (modelString.includes('global.') || modelString.includes('globalThis.')) {
      violations.push('Global object access detected');
    }
    
    if (modelString.includes('require(') && !modelString.includes('// ALLOWED:')) {
      violations.push('Dynamic require() detected');
    }
    
    if (modelString.includes('import(') && !modelString.includes('// ALLOWED:')) {
      violations.push('Dynamic import() detected');
    }

    return {
      isolated: violations.length === 0,
      violations
    };
  }

  private async checkForIsolationViolations(modelName: string, context: ModelExecutionContext): Promise<void> {
    // Check if model execution modified any global state
    // This is a simplified check - in production, you'd want more sophisticated monitoring
    
    // Check memory usage if limit is set
    if (context.isolation.memoryLimit) {
      const memoryUsage = process.memoryUsage();
      if (memoryUsage.heapUsed > context.isolation.memoryLimit) {
        throw new Error(`Model ${modelName} exceeded memory limit: ${memoryUsage.heapUsed} > ${context.isolation.memoryLimit}`);
      }
    }
  }

  private isIsolationViolation(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    
    const isolationErrorMessages = [
      'exceeded memory limit',
      'Global object access',
      'Unauthorized process.env access',
      'Dynamic require() detected',
      'Dynamic import() detected',
      'Cross-model data access'
    ];
    
    return isolationErrorMessages.some(msg => error.message.includes(msg));
  }

  private recordIsolationViolation(modelName: string): void {
    const currentViolations = this.isolationViolations.get(modelName) || 0;
    this.isolationViolations.set(modelName, currentViolations + 1);
    
    console.warn(`Isolation violation recorded for model ${modelName}. Total violations: ${currentViolations + 1}`);
    
    // If too many violations, disable the model
    if (currentViolations + 1 >= 5) {
      console.error(`Model ${modelName} disabled due to repeated isolation violations`);
      this.models.delete(modelName);
    }
  }

  // Utility methods for debugging and monitoring
  getExecutionHistory(modelName: string): Array<{ context: ModelExecutionContext; result: ModelPrediction | Error }> {
    return this.executionHistory.get(modelName) || [];
  }

  getIsolationViolations(modelName: string): number {
    return this.isolationViolations.get(modelName) || 0;
  }

  getAllViolations(): Record<string, number> {
    const violations: Record<string, number> = {};
    this.isolationViolations.forEach((count, modelName) => {
      violations[modelName] = count;
    });
    return violations;
  }

  resetModel(modelName: string): void {
    const model = this.models.get(modelName);
    if (!model) {
      throw new Error(`Model ${modelName} not found`);
    }
    
    // Clear history and violations
    this.executionHistory.set(modelName, []);
    this.isolationViolations.set(modelName, 0);
    
    console.log(`Model ${modelName} reset successfully`);
  }
}