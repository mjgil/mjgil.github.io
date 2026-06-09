// --- WorkflowModel Class ---
// Encapsulates the state and logic of the CI/CD simulation.
// It yields state updates via a generator function.
class WorkflowModel {
    constructor(startBuildNumber = 10) {
        this.baseStartBuild = startBuildNumber;
        this.eventCallback = null; // Add a property for the event callback
        this.dashboard = null; // Add dashboard reference
        this.reset(); // Initialize using reset method
    }

    // Method for controller to set the callback
    setEventCallback(callback) {
        this.eventCallback = callback;
    }

    // Method to set the dashboard instance
    setDashboard(dashboardInstance) {
        this.dashboard = dashboardInstance;
    }

    // Method to set the instance ID for dashboard aggregation
    setInstanceId(id) {
        this.instanceId = id;
    }

    // Helper to update dashboard with current state and instance ID
    _updateDashboard() {
        if (this.dashboard) {
            this.dashboard.updateStats(this.getState(), this.instanceId);
        }
    }

    // Reset the simulation to initial state
    reset() {
        this.buildNumber = this.baseStartBuild;
        this.retryCount = 0;
        this.regressionAttemptCount = 0;
        this.isRegressionMode = false;
        this.originalFailureBuild = 0;
        this.failureType = ""; // "Build", "Test", or ""
        this.lastGoodBuild = 0;
        this.isFirstAfterRegression = false;
        this.statusLog = [];
        this.currentStage = "Commit"; // Where the *process* is
        this.movingNodeText = "New Code"; // Text for the moving node
        this.isSimulationRunning = false;

        // --- Dashboard Statistics ---
        this.totalBuilds = 0;
        this.successfulBuilds = 0;
        this.failedBuilds = 0;
        this.regressionsDetected = 0;
        this.regressionsFixed = 0;
        this.nextBuildToCheck = undefined;
        // --- End Dashboard Statistics ---

        this.addStatusMessage(`Simulation reset. Starting Build: ${this.buildNumber}`);
        this._updateDashboard(); // Update dashboard on reset
    }

    // Get current state for View/Controller
    getState() {
        return {
            buildNumber: this.buildNumber,
            isRegressionMode: this.isRegressionMode,
            failureType: this.failureType,
            originalFailureBuild: this.originalFailureBuild,
            regressionAttemptCount: this.regressionAttemptCount,
            lastGoodBuild: this.lastGoodBuild,
            currentStage: this.currentStage, // Target stage for the node
            movingNodeText: this.movingNodeText, // Current text for the node
            statusLog: [...this.statusLog], // Return a copy
            isSimulationRunning: this.isSimulationRunning,
            isFirstAfterRegression: this.isFirstAfterRegression, // Include this flag for controller logic

            // --- Dashboard Statistics ---
            totalBuilds: this.totalBuilds,
            successfulBuilds: this.successfulBuilds,
            failedBuilds: this.failedBuilds,
            regressionsDetected: this.regressionsDetected,
            regressionsFixed: this.regressionsFixed
            // --- End Dashboard Statistics ---
        };
    }

    // Add a status message to the log
    addStatusMessage(message) {
        const timestamp = new Date().toLocaleTimeString();
        this.statusLog.push(`[${timestamp}] ${message}`);
         if (this.statusLog.length > 100) { this.statusLog.shift(); } // Keep log size manageable
    }

    // Start or stop the simulation state flag
    toggleSimulation(run) {
        this.isSimulationRunning = run;
    }

    // Generator function providing simulation steps
    *runSimulation() {
        if (this.isSimulationRunning) { // Basic guard, though controller manages start/stop
            // console.warn("Model: Simulation generator started while already running flag set.");
        }
        this.isSimulationRunning = true; // Ensure flag is set when generator starts
        this.addStatusMessage(`Starting workflow simulation at Build #${this.buildNumber}...`);
        yield this.getState(); // Yield initial state

        while (this.isSimulationRunning) {
            if (!this.isRegressionMode) {
                // Yield states from normal processing steps
                yield* this.processNormalMode();
            } else {
                // Yield states from regression processing steps
                yield* this.processRegressionMode();
            }
            // Check if stopped externally between main loop iterations
            if (!this.isSimulationRunning) break;
        }
        // Add message only if the loop terminated because the flag became false
        if (!this.isSimulationRunning && this.statusLog.length > 0 && !this.statusLog[this.statusLog.length-1].includes("Simulation loop exited")) {
             this.addStatusMessage("Simulation loop exited.");
        }
        yield this.getState(); // Yield final state after stopping
    }

   // Generator for normal workflow stages
    *processNormalMode() {
        const currentBuild = this.buildNumber;

        // Stage: Commit -> Build
        if (this.currentStage === "Commit") {
            // Increment total builds only when starting a new build in normal mode
            this.totalBuilds++; 
            this.addStatusMessage(`  - Commit stage for Build #${currentBuild}: Passed`);
            this.currentStage = "Build";
            yield this.getState();
            if (!this.isSimulationRunning) return; // Check if stopped during yield
        }

        // Stage: Build -> Test (or Regression)
        if (this.currentStage === "Build") {
            let buildPassed = this.checkStage(this.retryCount, this.isFirstAfterRegression, "Build");
            if (!buildPassed) {
                this.addStatusMessage(`  - Build stage for Build #${currentBuild}: Failed! Moving to regression mode (Build Failure).`);
                this.regressionsDetected++; // Increment regressions detected
                this.failedBuilds++; // Increment failed builds
                this._updateDashboard(); // Update dashboard on build fail
                this.originalFailureBuild = currentBuild;
                this.failureType = "Build";
                this.movingNodeText = "Build Error"; // Set node text on failure
                this.regressionAttemptCount = 0; // Initialize count to 0 when entering regression
                // this.buildNumber = currentBuild - 1;
                if (this.buildNumber < 1) { this.buildNumber = 1; }
                
                // Emit regression start event
                this.emitRegressionEvent({
                    type: 'regression-start',
                    stage: 'Build',
                    failureType: 'Build',
                    originalBuild: currentBuild,
                    nextBuildToCheck: this.buildNumber
                });
                
                // --- Entering Regression ---
                yield this.getState(); // 1. Yield state showing failure details (node still at Build)
                // 2. Set target to Regression node for animation (Controller uses this)
                this.currentStage = "Regression";
                yield this.getState(); // 3. Yield state with Regression target
                // We're now paused on the Regression node, so set the flag
                this.isRegressionMode = true; // MOVED here - after pausing on regression 
                // 4. Set state ready for the *next* step (regression check starting at Commit)
                this.currentStage = "Commit";
                // Note: The next call to generator.next() will resume *after* this point.
                return; // Exit normal mode processing
            } else {
                this.addStatusMessage(`  - Build stage for Build #${currentBuild}: Passed`);
                this.currentStage = "Test";
                yield this.getState();
                if (!this.isSimulationRunning) return;
            }
        }

        // Stage: Test -> Deploy (or Regression)
        if (this.currentStage === "Test") {
            let testPassed = this.checkStage(this.retryCount, this.isFirstAfterRegression, "Test");
            if (!testPassed) {
                this.addStatusMessage(`  - Test stage for Build #${currentBuild}: Failed! Moving to regression mode (Test Failure).`);
                this.regressionsDetected++; // Increment regressions detected
                this.failedBuilds++; // Increment failed builds
                this._updateDashboard(); // Update dashboard on test fail
                this.originalFailureBuild = currentBuild;
                this.failureType = "Test";
                this.movingNodeText = "Failed Tests"; // Set node text on failure
                this.regressionAttemptCount = 0; // Initialize count to 0 when entering regression
                // this.buildNumber = currentBuild - 1;
                 if (this.buildNumber < 1) { this.buildNumber = 1; }
                 
                // Emit regression start event
                this.emitRegressionEvent({
                    type: 'regression-start',
                    stage: 'Test',
                    failureType: 'Test',
                    originalBuild: currentBuild,
                    nextBuildToCheck: this.buildNumber
                });
                 
                // --- Entering Regression ---
                yield this.getState(); // 1. Yield state showing failure details (node still at Test)
                // 2. Set target to Regression node for animation (Controller uses this)
                this.currentStage = "Regression";
                yield this.getState(); // 3. Yield state with Regression target
                // We're now paused on the Regression node, so set the flag
                this.isRegressionMode = true; // MOVED here - after pausing on regression
                // 4. Set state ready for the *next* step (regression check starting at Commit)
                this.currentStage = "Commit";
                // Note: The next call to generator.next() will resume *after* this point.
                return; // Exit normal mode processing
            } else {
                this.addStatusMessage(`  - Test stage for Build #${currentBuild}: Passed`);
                this.currentStage = "Deploy";
                yield this.getState();
                if (!this.isSimulationRunning) return;
            }
        }

        // Stage: Deploy -> Commit (Next Build)
        if (this.currentStage === "Deploy") {
            this.addStatusMessage(`  - Deploy stage for Build #${currentBuild}: Passed`);
            this.addStatusMessage(`Build #${currentBuild} successfully completed! Moving to next build.`);
            this.successfulBuilds++; // Increment successful builds
            this.buildNumber++;
            this._updateDashboard(); // Update dashboard on success
            this.retryCount++;
             if (this.retryCount > 3) this.retryCount = 3;
            this.isFirstAfterRegression = false; // Reset flag after a successful build
            this.currentStage = "Commit";
            this.movingNodeText = "New Code"; // Reset for next build
            yield this.getState();
        }
    }

    // Generator for regression mode stages
    *processRegressionMode() {
        const regressionBuild = this.buildNumber;
        let buildRegressionPassed = true; // Assume pass unless Build type failure

        // Stage: Commit -> Build (Regression Check)
         if (this.currentStage === "Commit") {
            this.addStatusMessage(`  - Commit stage for Build #${regressionBuild}: Passed (Regression)`);
            
            // Emit micro-event for commit passing (consistent with normal mode)
            this.emitRegressionEvent({
                type: 'micro-event',
                stage: 'Commit',
                result: 'pass',
                build: regressionBuild,
                message: `Commit stage for Build #${regressionBuild} passed in regression mode`
            });
            
            this.currentStage = "Build";
            // Ensure regression mode flag is set during all regression operations
            this.isRegressionMode = true;
            // Node text ("Build Error" / "Failed Tests") persists
            yield this.getState();
            if (!this.isSimulationRunning) return;
        }

        // Stage: Build -> Test (Regression Check)
         if (this.currentStage === "Build") {
             if (this.failureType === "Build") {
                this.regressionAttemptCount++; // Increment count BEFORE check
                buildRegressionPassed = this.checkRegressionStage(this.regressionAttemptCount);
                if (!buildRegressionPassed) {
                    this.addStatusMessage(`  - Build stage for Build #${regressionBuild}: Failed in regression! Checking previous build.`);
                    
                    // Emit micro-event for build failing (consistent with normal mode)
                    this.emitRegressionEvent({
                        type: 'micro-event',
                        stage: 'Build',
                        result: 'fail',
                        build: regressionBuild,
                        attemptNumber: this.regressionAttemptCount,
                        message: `Build stage for Build #${regressionBuild} failed in regression check #${this.regressionAttemptCount}`
                    });
                    
                    // Store the next build to check after visiting regression node
                    this.nextBuildToCheck = regressionBuild - 1;
                    
                    // First, go to Regression node before decrementing build number
                    this.currentStage = "Regression";
                    yield this.getState(); // Yield state to allow animation to Regression node
                    
                    // After pausing at Regression, continue with regression failure handling
                    this.handleRegressionFailure();
                    yield this.getState(); // Yield state showing build number change
                    return; // Exit processing for this cycle
                } else {
                     this.addStatusMessage(`  - Build stage for Build #${regressionBuild}: Passed in regression`);
                     
                     // Emit micro-event for build passing (consistent with normal mode)
                     this.emitRegressionEvent({
                        type: 'micro-event',
                        stage: 'Build',
                        result: 'pass',
                        build: regressionBuild,
                        attemptNumber: this.regressionAttemptCount,
                        message: `Build stage for Build #${regressionBuild} passed in regression check #${this.regressionAttemptCount}`
                     });
                }
            } else {
                 this.addStatusMessage(`  - Build stage for Build #${regressionBuild}: Passed (Not a Build failure regression)`);
                 
                 // Emit micro-event for build passing (non-Build regression type)
                 this.emitRegressionEvent({
                    type: 'micro-event',
                    stage: 'Build',
                    result: 'pass',
                    build: regressionBuild,
                    message: `Build stage for Build #${regressionBuild} passed (not being checked in this regression)`
                 });
                 
                 buildRegressionPassed = true; // Ensure it's true if not checked
            }
             this.currentStage = "Test";
             yield this.getState();
             if (!this.isSimulationRunning) return;
        }

         // Stage: Test -> Handle Result (Regression Check)
         if (this.currentStage === "Test") {
             let testRegressionPassed = true;
             if (this.failureType === "Test") {
                this.regressionAttemptCount++; // Increment count BEFORE check
                testRegressionPassed = this.checkRegressionStage(this.regressionAttemptCount);
                if (!testRegressionPassed) {
                     this.addStatusMessage(`  - Test stage for Build #${regressionBuild}: Failed in regression! Checking previous build.`);
                     
                     // Emit micro-event for test failing (consistent with normal mode)
                     this.emitRegressionEvent({
                        type: 'micro-event',
                        stage: 'Test',
                        result: 'fail',
                        build: regressionBuild,
                        attemptNumber: this.regressionAttemptCount,
                        message: `Test stage for Build #${regressionBuild} failed in regression check #${this.regressionAttemptCount}`
                     });
                     
                    // Store the next build to check after visiting regression node
                    this.nextBuildToCheck = regressionBuild - 1;
                    
                    // First, go to Regression node before decrementing build number
                    this.currentStage = "Regression";
                    yield this.getState(); // Yield state to allow animation to Regression node
                    
                    // After pausing at Regression, continue with regression failure handling
                    this.handleRegressionFailure();
                    yield this.getState(); // Yield state showing build number change
                    return; // Exit processing for this cycle
                } else {
                    this.addStatusMessage(`  - Test stage for Build #${regressionBuild}: Passed in regression`);
                    
                    // Emit micro-event for test passing (consistent with normal mode)
                    this.emitRegressionEvent({
                        type: 'micro-event',
                        stage: 'Test',
                        result: 'pass',
                        build: regressionBuild,
                        attemptNumber: this.regressionAttemptCount,
                        message: `Test stage for Build #${regressionBuild} passed in regression check #${this.regressionAttemptCount}`
                    });
                }
            } else {
                 this.addStatusMessage(`  - Test stage for Build #${regressionBuild}: Passed (Confirming good build after Build regression pass)`);
                 
                 // Emit micro-event for test passing (non-Test regression type)
                 this.emitRegressionEvent({
                    type: 'micro-event',
                    stage: 'Test',
                    result: 'pass',
                    build: regressionBuild,
                    message: `Test stage for Build #${regressionBuild} passed (confirming good build)`
                 });
                 
                 testRegressionPassed = true; // Simulate it passes if the build part passed regression
             }

             // Check if Regression Check Succeeded for this Build
             const regressionSucceeded = (this.failureType === "Build" && buildRegressionPassed) ||
                                         (this.failureType === "Test" && testRegressionPassed);

            if (regressionSucceeded) {
                this.lastGoodBuild = regressionBuild;
                this.addStatusMessage(`Regression complete. Last good build is #${this.lastGoodBuild}. Resuming normal mode starting Build #${this.originalFailureBuild + 1}.`);
                this.regressionsFixed++; // Increment regressions fixed
                this._updateDashboard(); // Update dashboard on regression fix
                
                // Emit regression complete event
                this.emitRegressionEvent({
                    type: 'regression-complete',
                    failureType: this.failureType,
                    lastGoodBuild: this.lastGoodBuild,
                    originalFailureBuild: this.originalFailureBuild,
                    nextBuild: this.originalFailureBuild + 1
                });
                
                this.isRegressionMode = false;
                this.buildNumber = this.originalFailureBuild + 1;
                this.retryCount = 0;
                this.regressionAttemptCount = 0;
                this.isFirstAfterRegression = true; // Set flag BEFORE yielding state
                this.currentStage = "Commit"; // Target Commit for the next build
                this.failureType = "";
                this.movingNodeText = "New Code"; // Reset node text
                yield this.getState();
                return; // Exit regression processing
             }
             // If regression check failed, handleRegressionFailure was called and set stage to Commit
             // The loop will continue, processing the Commit stage for the decremented build number in the next iteration.
         }
    }

    // Helper for handling regression failure logic (when check fails)
    handleRegressionFailure() {
         // Now use the previously stored nextBuildToCheck
         if (this.nextBuildToCheck !== undefined) {
             this.buildNumber = this.nextBuildToCheck;
             this.nextBuildToCheck = undefined; // Clear stored value after use
         } else {
             // Fallback to old behavior if nextBuildToCheck isn't set
             this.buildNumber--;
         }
         
         if (this.buildNumber < 1) {
             this.addStatusMessage("Reached Build #1 during regression with no prior good build found. Exiting regression mode.");
             
             // Note: We don't increment regressionsFixed here as it didn't successfully fix it.
             this._updateDashboard(); // Update dashboard on regression end (no fix)
             
             // Emit regression no-good-build event
             this.emitRegressionEvent({
                 type: 'regression-no-good-build',
                 failureType: this.failureType,
                 originalFailureBuild: this.originalFailureBuild
             });
             
             this.isRegressionMode = false;
             this.buildNumber = this.originalFailureBuild; // Resume from the build that failed
             this.retryCount = 0;
             this.regressionAttemptCount = 0;
             this.isFirstAfterRegression = true; // Set flag BEFORE yielding state
             this.failureType = "";
             this.movingNodeText = "New Code"; // Reset text
         } else {
             // If we are continuing regression with previous build, ensure we're still in regression mode
             this.isRegressionMode = true;
             
             // Emit regression continue event for the next build to check
             this.emitRegressionEvent({
                 type: 'regression-continue',
                 failureType: this.failureType,
                 originalFailureBuild: this.originalFailureBuild,
                 nextBuildToCheck: this.buildNumber
             });
         }
         // Always restart check from Commit for the (potentially decremented) build number
         this.currentStage = "Commit";
    }

    // Helper function to determine if a stage passes in normal mode
    checkStage(retryCount, isFirstAfterRegression, stageName) {
        let passed = false;
        let message = "";
        
        if (isFirstAfterRegression) {
            message = `Auto-passing (First after regression)`;
            passed = true;
        } else if (retryCount === 0) {
            message = `Auto-passing (First attempt)`;
            passed = true;
        } else if (retryCount === 1 || retryCount === 2) {
            passed = Math.random() < 0.5;
            message = passed ? 'Passed (50% chance)' : 'Failed (50% chance)';
        } else { // retryCount >= 3
            message = `Auto-failing (Fourth attempt)`;
            passed = false;
        }
        
        this.addStatusMessage(`    - ${stageName} check (Attempt ${retryCount + 1}): ${message}`);
        
        // Emit micro-event for stage check in normal mode (for consistency with regression mode)
        this.emitRegressionEvent({
            type: 'micro-event',
            stage: stageName,
            result: passed ? 'pass' : 'fail',
            build: this.buildNumber,
            attemptNumber: retryCount + 1,
            message: `${stageName} stage for Build #${this.buildNumber} ${passed ? 'passed' : 'failed'} (${message})`
        });
        
        return passed;
    }

    // Helper function to determine if a regression check passes
    checkRegressionStage(regressionAttemptCount) {
        let passed = false;
        let message = "";
        
        if (regressionAttemptCount === 1) {
            passed = false;
            message = "Auto-failing";
        } else if (regressionAttemptCount === 2) {
            passed = Math.random() < 0.5;
            message = passed ? 'Passed (50% chance)' : 'Failed (50% chance)';
        } else { // regressionAttemptCount >= 3
            passed = true;
            message = "Auto-passing";
        }
        
        // Log the regression check details
        this.addStatusMessage(`    - Regression check (Attempt ${regressionAttemptCount}): ${message}`);
        
        // Emit regression check event info
        this.emitRegressionEvent({
            type: 'regression-check',
            attempt: regressionAttemptCount,
            stage: this.currentStage,
            failureType: this.failureType,
            build: this.buildNumber,
            originalBuild: this.originalFailureBuild,
            passed: passed,
            message: message
        });
        
        return passed;
    }
    
    // New method to emit regression-related events with detailed information
    emitRegressionEvent(eventData) {
        // In a production application, this might dispatch events to listeners
        // For now, we'll just log to console with a clear format
        // console.log(`MODEL EVENT (${this.buildNumber}): ${JSON.stringify(eventData)}`);

        // Use the callback if it's set
        if (this.eventCallback) {
            this.eventCallback(eventData);
        }
        
        // Remove the global dispatch
        /*
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            const event = new CustomEvent('workflow-regression-event', { 
                detail: eventData,
                bubbles: true 
            });
            window.dispatchEvent(event);
        }
        */
    }
}
// --- End of WorkflowModel Class ---