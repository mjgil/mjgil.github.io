// --- Controller Component ---
// Manages user interactions, coordinates Model and View, and drives the simulation using a state machine.
class WorkflowControllerComponent {
    // --- Configuration & Constants ---
    STATES = {
        IDLE: 'IDLE',
        GOING_TO_COMMIT: 'GOING_TO_COMMIT',
        PAUSED_ON_COMMIT: 'PAUSED_ON_COMMIT',
        GOING_TO_BUILD: 'GOING_TO_BUILD',
        PAUSED_ON_BUILD: 'PAUSED_ON_BUILD',
        GOING_TO_TEST: 'GOING_TO_TEST',
        PAUSED_ON_TEST: 'PAUSED_ON_TEST',
        GOING_TO_DEPLOY: 'GOING_TO_DEPLOY',
        PAUSED_ON_DEPLOY: 'PAUSED_ON_DEPLOY',
        GOING_TO_REGRESSION: 'GOING_TO_REGRESSION',
        PAUSED_ON_REGRESSION: 'PAUSED_ON_REGRESSION'
    };

    // --- Instance Variables ---
    model = null; // WorkflowModel instance
    view = null; // WorkflowViewComponent instance
    container = null; // Root element for this instance
    instanceId = ''; // Unique ID for DOM elements
    logElement = null; // Store log element reference (might be null)
    interlacedDuration = 0; // Store the duration

    currentState = this.STATES.IDLE; // Current state machine state
    movingNodeState = { x: 0, y: 0, text: 'New Code', mode: 'normal' }; // Current position and display of moving node
    targetPosition = { x: 0, y: 0 }; // Target position for animation
    pauseTimer = 0; // Timer for PAUSED_ON state delays
    animationFrameId = null; // For canceling animation loop
    simulationGenerator = null; // Generator from model.runSimulation()
    stageLayout = []; // Layout for main stages
    regressionStageLayout = {}; // Layout for regression stage
    canvasWidth = 0;
    canvasHeight = 0;
    isAnimationComplete = true; // Flag to track if current animation and pause are done

    // --- DOM Elements ---
    startButton = null;
    stopButton = null;
    resetButton = null;

    // --- Initialization ---
    init(config) {
        // Store references passed from CiCdSimulator
        this.model = config.model;
        this.view = config.view;
        this.container = config.container;
        this.instanceId = config.instanceId;
        this.canvasWidth = config.canvasWidth;
        this.canvasHeight = config.canvasHeight;
        this.logElement = config.logElement; // Store logElement (can be null)
        this.interlacedDuration = config.interlacedDuration || 0; // Store the duration

        // Initialize DOM elements specific to this instance
        // Only query for buttons if controls are shown
        if (config.showControls) {
            this.startButton = this.container.querySelector(`#${this.instanceId}-start`);
            this.stopButton = this.container.querySelector(`#${this.instanceId}-stop`);
            this.resetButton = this.container.querySelector(`#${this.instanceId}-reset`);
        }

        // Calculate layout (moved from original view init)
        this.calculateLayout();

        // Initialize View with context (get from canvas in container) and layout
        const canvas = this.container.querySelector(`#${this.instanceId}-canvas`);
        const ctx = canvas.getContext('2d');
        // We need to pass the calculated layout AND the interlaced duration to the view's init
        this.view.init(ctx, this.logElement, {
            stages: this.stageLayout,
            regressionStage: this.regressionStageLayout,
            interlacedDuration: this.interlacedDuration // Pass it here
        });

        // Set initial node position
        this.resetNodePosition();
        this.targetPosition = { x: this.stageLayout[0].centerX, y: this.stageLayout[0].centerY };

        // Set the model's event callback to our handler
        this.model.setEventCallback(this.handleModelEvent.bind(this));

        // Render initial state
        this.view.render(this.model.getState(), this.movingNodeState, this.currentState);
        if (this.logElement) {
            this.view.updateStatusLog(this.model.getState().statusLog);
        }

        // Attach event listeners to instance buttons
        // Only attach listeners if buttons exist
        if (this.startButton) this.startButton.addEventListener('click', this.startSimulation.bind(this));
        if (this.stopButton) this.stopButton.addEventListener('click', this.stopSimulation.bind(this));
        if (this.resetButton) this.resetButton.addEventListener('click', this.resetSimulation.bind(this));

        // console.log("Controller Component Initialized for instance:", this.instanceId);
    }

    // Calculate layout based on canvas size
    calculateLayout() {
        const startX = (this.canvasWidth - (4 * STAGE_WIDTH + 3 * GAP)) / 2;
        const startY = STAGE_HEIGHT + BUILD_NUMBER_Y_OFFSET;
        this.stageLayout = [
            { name: 'Commit', x: startX, y: startY, width: STAGE_WIDTH, height: STAGE_HEIGHT, centerX: startX + STAGE_WIDTH / 2, centerY: startY + STAGE_HEIGHT / 2 },
            { name: 'Build', x: startX + STAGE_WIDTH + GAP, y: startY, width: STAGE_WIDTH, height: STAGE_HEIGHT, centerX: startX + STAGE_WIDTH + GAP + STAGE_WIDTH / 2, centerY: startY + STAGE_HEIGHT / 2 },
            { name: 'Test', x: startX + 2 * (STAGE_WIDTH + GAP), y: startY, width: STAGE_WIDTH, height: STAGE_HEIGHT, centerX: startX + 2 * (STAGE_WIDTH + GAP) + STAGE_WIDTH / 2, centerY: startY + STAGE_HEIGHT / 2 },
            { name: 'Deploy', x: startX + 3 * (STAGE_WIDTH + GAP), y: startY, width: STAGE_WIDTH, height: STAGE_HEIGHT, centerX: startX + 3 * (STAGE_WIDTH + GAP) + STAGE_WIDTH / 2, centerY: startY + STAGE_HEIGHT / 2 }
        ];
        this.regressionStageLayout = {
            name: 'Regression\nMode',
            x: (this.canvasWidth - STAGE_WIDTH) / 2,
            y: startY + STAGE_HEIGHT + VERTICAL_GAP,
            width: STAGE_WIDTH,
            height: STAGE_HEIGHT,
            centerX: (this.canvasWidth) / 2,
            centerY: startY + STAGE_HEIGHT + VERTICAL_GAP + STAGE_HEIGHT / 2
        };
    }

    // Reset moving node position (used in init and reset)
    resetNodePosition() {
        // Reset node position to off-screen left
        this.movingNodeState.x = -MOVING_NODE_WIDTH - GAP / 2;
        this.movingNodeState.y = this.stageLayout[0] ? this.stageLayout[0].centerY : this.canvasHeight / 2; // Fallback y
        this.movingNodeState.text = 'New Code';
        this.movingNodeState.mode = 'normal';
    }

    // --- State Machine Transition Logic ---
    transitionToNextState(modelState) {
        // If in a PAUSED_ON state, check if pause duration is complete
        if (this.currentState.startsWith('PAUSED_ON_') && Date.now() < this.pauseTimer) {
            return; // Do not transition yet
        }

        // Determine next state based on current state and model data
        let nextState = this.currentState;
        const currentModelStage = modelState.currentStage;
        const isInRegressionProcess = modelState.failureType !== ""; // Use failure type

        switch (this.currentState) {
            case this.STATES.IDLE:
                if (modelState.isSimulationRunning) {
                    nextState = this.STATES.GOING_TO_COMMIT;
                    this.setTargetPosition('Commit');
                }
                break;

            case this.STATES.GOING_TO_COMMIT:
                if (this.isAtTarget()) {
                    nextState = this.STATES.PAUSED_ON_COMMIT;
                    this.setPauseTimer();
                }
                break;

            case this.STATES.PAUSED_ON_COMMIT:
                if (currentModelStage === 'Build') {
                    nextState = this.STATES.GOING_TO_BUILD;
                    this.setTargetPosition('Build');
                }
                break;

            case this.STATES.GOING_TO_BUILD:
                if (this.isAtTarget()) {
                    nextState = this.STATES.PAUSED_ON_BUILD;
                    this.setPauseTimer();
                }
                break;

            case this.STATES.PAUSED_ON_BUILD:
                if (currentModelStage === 'Test') {
                    nextState = this.STATES.GOING_TO_TEST;
                    this.setTargetPosition('Test');
                } else if (currentModelStage === 'Regression') {
                    nextState = this.STATES.GOING_TO_REGRESSION;
                    this.setTargetPosition('Regression');
                }
                break;

            case this.STATES.GOING_TO_TEST:
                if (this.isAtTarget()) {
                    nextState = this.STATES.PAUSED_ON_TEST;
                    this.setPauseTimer();
                }
                break;

            case this.STATES.PAUSED_ON_TEST:
                if (currentModelStage === 'Deploy' && !isInRegressionProcess) {
                    nextState = this.STATES.GOING_TO_DEPLOY;
                    this.setTargetPosition('Deploy');
                } else if (currentModelStage === 'Regression') {
                    nextState = this.STATES.GOING_TO_REGRESSION;
                    this.setTargetPosition('Regression');
                } else if (currentModelStage === 'Commit') { // Cycle restarts
                    nextState = this.STATES.GOING_TO_COMMIT;
                    this.resetNodePosition(); // Reset position for slide-in
                    this.setTargetPosition('Commit');
                }
                break;

            case this.STATES.GOING_TO_DEPLOY:
                if (this.isAtTarget()) {
                    nextState = this.STATES.PAUSED_ON_DEPLOY;
                    this.setPauseTimer();
                }
                break;

            case this.STATES.PAUSED_ON_DEPLOY:
                if (currentModelStage === 'Commit') {
                    nextState = this.STATES.GOING_TO_COMMIT;
                    this.resetNodePosition(); // Reset position for slide-in
                    this.setTargetPosition('Commit');
                }
                break;

            case this.STATES.GOING_TO_REGRESSION:
                if (this.isAtTarget()) {
                    nextState = this.STATES.PAUSED_ON_REGRESSION;
                    this.setPauseTimer();
                }
                break;

            case this.STATES.PAUSED_ON_REGRESSION:
                if (currentModelStage === 'Commit') {
                    nextState = this.STATES.GOING_TO_COMMIT;
                    this.resetNodePosition(); // Reset position for slide-in
                    this.setTargetPosition('Commit');
                }
                break;
        }

        if (nextState !== this.currentState) {
            this.currentState = nextState;
            if (this.currentState.startsWith('PAUSED_ON_')) {
                this.isAnimationComplete = false;
            }
        } else if (this.currentState.startsWith('PAUSED_ON_') && Date.now() >= this.pauseTimer) {
            this.isAnimationComplete = true;
        }
    }

    // Helper to set target position based on stage name
    setTargetPosition(stageName) {
        let stageInfo;
        if (stageName === 'Regression') {
            stageInfo = this.regressionStageLayout;
        } else {
            stageInfo = this.stageLayout.find(s => s.name === stageName);
        }
        if (stageInfo) {
            this.targetPosition.x = stageInfo.centerX;
            this.targetPosition.y = stageInfo.centerY;
        } else {
            console.error(`Stage "${stageName}" not found in layout for instance ${this.instanceId}`);
        }
        this.isAnimationComplete = false;
    }

    // Helper to check if node has reached target position
    isAtTarget() {
        const dx = Math.abs(this.movingNodeState.x - this.targetPosition.x);
        const dy = Math.abs(this.movingNodeState.y - this.targetPosition.y);
        return dx < POSITION_THRESHOLD && dy < POSITION_THRESHOLD;
    }

    // Helper to set pause timer for PAUSED_ON states
    setPauseTimer() {
        this.pauseTimer = Date.now() + PAUSE_DURATION;
    }

    // --- Animation and Simulation Loop ---
    animationLoop() {
        if (!this.model.getState().isSimulationRunning) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
            return;
        }

        // Update node position if in a GOING_TO state
        if (this.currentState.startsWith('GOING_TO_')) {
            this.movingNodeState.x += (this.targetPosition.x - this.movingNodeState.x) * ANIMATION_SPEED;
            this.movingNodeState.y += (this.targetPosition.y - this.movingNodeState.y) * ANIMATION_SPEED;
        } else if (this.currentState.startsWith('PAUSED_ON_')) {
            // Enforce exact position ONLY in PAUSED_ON states
            if (this.movingNodeState.x !== this.targetPosition.x || this.movingNodeState.y !== this.targetPosition.y) {
                this.movingNodeState.x = this.targetPosition.x;
                this.movingNodeState.y = this.targetPosition.y;
            }
        }

        // Get current model state
        const modelState = this.model.getState();
        
        // Update moving node text and mode from model
        this.movingNodeState.text = modelState.movingNodeText;
        this.movingNodeState.mode = modelState.failureType ? 'regression' : 'normal';

        // Transition state machine based on model state
        this.transitionToNextState(modelState);

        // Render current state
        this.view.render(modelState, this.movingNodeState, this.currentState);
        // Log update is handled by the model event handler now, but keep view update just in case
        // this.view.updateStatusLog(modelState.statusLog); // Can likely remove

        // Advance model simulation only if animation and pause for current state are complete
        if (this.isAnimationComplete && modelState.isSimulationRunning) {
            if (this.simulationGenerator) {
                const nextStep = this.simulationGenerator.next();
                if (nextStep.done) {
                    this.model.toggleSimulation(false); // Model should probably handle this internally
                    this.updateButtonStates();
                    this.simulationGenerator = null; // Clear generator when done
                }
                // Reset flag AFTER advancing model, for the next animation cycle
                // Only reset if the generator is still active
                if (this.simulationGenerator) {
                    this.isAnimationComplete = false;
                }
            } else {
                console.warn(`Instance ${this.instanceId}: Simulation generator is null, but tried to advance.`);
                this.model.toggleSimulation(false);
                this.updateButtonStates();
            }
        }

        // Continue animation loop if simulation is running
        if (this.model.getState().isSimulationRunning) { // Re-check flag after potential generator completion
            this.animationFrameId = requestAnimationFrame(this.animationLoop.bind(this));
        } else {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }
    
    // --- Event Handlers ---
    startSimulation() {
        if (!this.model.getState().isSimulationRunning) {
            this.model.toggleSimulation(true);
            this.simulationGenerator = this.model.runSimulation();
            this.updateButtonStates();
            if (!this.animationFrameId) {
                this.isAnimationComplete = false; // Ensure first step runs
                this.animationFrameId = requestAnimationFrame(this.animationLoop.bind(this));
            }
        }
    }

    stopSimulation() {
        this.model.toggleSimulation(false); // Signal model to stop
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        // Generator loop will exit on next check
        this.simulationGenerator = null; // Ensure generator is cleared
        this.updateButtonStates();
        // Don't update log here, model will add stop message
        // Manually render the final state if needed (optional)
        this.view.render(this.model.getState(), this.movingNodeState, this.currentState);
        if (this.logElement) {
            this.view.updateStatusLog(this.model.getState().statusLog);
        }
    }

    resetSimulation() {
        console.log("Resetting Simulation for instance:", this.instanceId);
        this.stopSimulation(); // Ensure any running simulation stops

        this.currentState = this.STATES.IDLE;
        this.resetNodePosition();
        this.targetPosition = { x: this.stageLayout[0].centerX, y: this.stageLayout[0].centerY }; // Reset target
        this.isAnimationComplete = true; // Ready for a new animation
        this.pauseTimer = 0;
        this.simulationGenerator = null; // Clear the generator

        this.model.reset(); // Reset model state (clears log, build numbers etc.)
        this.view.reset(); // Reset view state (clears highlights, interlace effect)

        // Update view with initial state
        this.view.render(this.model.getState(), this.movingNodeState, this.currentState);
        if (this.logElement) {
            this.view.updateStatusLog(this.model.getState().statusLog);
        }

        // Update button states (enable start, disable stop)
        this.updateButtonStates();
    }

    updateButtonStates() {
        const isRunning = this.model.getState().isSimulationRunning;
        if (this.startButton) this.startButton.disabled = isRunning;
        if (this.stopButton) this.stopButton.disabled = !isRunning;
    }

    // New function to handle events directly from the model instance
    handleModelEvent(eventData) {
        // console.log(`CONTROLLER (${this.instanceId}) received model event: ${eventData.type}`); // Debug log removed

        // Update the view's status log whenever an event occurs
        if (this.logElement) {
            this.view.updateStatusLog(this.model.getState().statusLog);
        }

        // Process specific event types if controller needs to react beyond state changes
        switch(eventData.type) {
            case 'micro-event':
                this.handleMicroEvent(eventData);
                break;

            case 'regression-start':
                this.movingNodeState.mode = 'regression'; // Ensure node appearance updates early
                break;

            case 'regression-check':
                // console.log(`Ctrl-${this.instanceId}: Regression check for ${eventData.stage} (${eventData.attempt}): ${eventData.passed ? 'PASSED' : 'FAILED'}`);
                // State machine handles transitions based on model.currentStage
                break;

            case 'regression-continue':
                // console.log(`Ctrl-${this.instanceId}: Continuing regression with build #${eventData.nextBuildToCheck}`);
                // State machine handles transitions based on model.currentStage
                break;

            case 'regression-complete':
                // console.log(`Ctrl-${this.instanceId}: Regression complete! Last good build: ${eventData.lastGoodBuild}`);
                this.movingNodeState.mode = 'normal'; // Reset node appearance
                this.movingNodeState.text = 'New Code';
                break;

            case 'regression-no-good-build':
                // console.log(`Ctrl-${this.instanceId}: No good build found during regression!`);
                this.movingNodeState.mode = 'normal'; // Reset node appearance
                this.movingNodeState.text = 'New Code';
                break;
        }

        // Re-render the view to reflect any immediate changes (like node mode)
        // The animation loop also renders, but this ensures faster UI feedback for events
        this.view.render(this.model.getState(), this.movingNodeState, this.currentState);
    }
    
    // Helper to process micro-events consistently (adapted from original)
    handleMicroEvent(eventData) {
        const { stage, result, build, attemptNumber } = eventData;
        // console.log(`Ctrl-${this.instanceId}: Micro-event: ${stage} stage for Build #${build} ${result === 'pass' ? 'PASSED' : 'FAILED'}` + // Debug log removed
        //            (attemptNumber ? ` (Attempt ${attemptNumber})` : ''));

        // For failing build/test events, ensure the node appearance is updated locally
        if (result === 'fail' && (stage === 'Build' || stage === 'Test')) {
            const modelState = this.model.getState(); // Get latest state
            this.movingNodeState.mode = modelState.failureType ? 'regression' : 'normal';
            this.movingNodeState.text = modelState.movingNodeText;
            // The state machine logic (`transitionToNextState`) handles moving to Regression node
        }
    }
}

// Initialize the controller when the page loads
// document.addEventListener('DOMContentLoaded', () => {
//     WorkflowControllerComponent.init(); // This seems incorrect - init is called by CiCdSimulator
// });