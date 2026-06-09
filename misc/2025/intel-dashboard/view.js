// --- View Component ---
// Handles drawing the workflow visualization onto the canvas.
class WorkflowViewComponent {

    // --- Colors ---
    // (Keep constants accessible, either globally like this or passed in/imported)
    defaultStageColor = '#4a5568'; defaultTextColor = '#e2e8f0';
    regressionNodeActiveColor = '#f97316'; activeTextColor = '#ffff';
    greyArrowColor = '#9ca3af'; redColor = '#ef4444'; greenColor = '#34d399';
    orangeColor = '#fb923c';
    normalNodeStyle = { fill: '#6366f1', border: '#4338ca', text: '#e0e7ff' };
    regressionNodeStyle = { fill: '#fecaca', border: '#b91c1c', text: '#991b1b' };
    baseBackgroundColor = '#2d3748'; // Darker background for unrevealed areas (e.g., bg-gray-800)
    activeBackgroundColor = '#4a5568'; // Normal background (bg-gray-600)

    ctx = null; // Canvas 2D context
    logElement = null; // Specific log element for this instance
    canvasWidth = 0;
    canvasHeight = 0;
    stageLayout = []; // Layout received from controller
    regressionStageLayout = {}; // Layout received from controller
    highlightedStages = new Set(); // Tracks names of stages paused on in the current cycle

    // Interlacing effect variables
    interlacedDuration = 0;
    interlaceStartTime = null;
    isInterlacing = false;
    numInterlaceBands = 14; // Horizontal bands
    // Define the 0-indexed rendering order (for horizontal bands)
    interlaceRenderOrder = [0, 2, 4, 6, 8, 10, 12, 1, 3, 5, 7, 9, 11, 13];

    // --- Initialization --- Accepts context, log element, and calculated layout
    init(canvasContext, logDivElement, layoutData) {
        this.ctx = canvasContext;
        this.logElement = logDivElement; // Can be null
        this.canvasWidth = this.ctx.canvas.width;
        this.canvasHeight = this.ctx.canvas.height;
        this.stageLayout = layoutData.stages;
        this.regressionStageLayout = layoutData.regressionStage;
        this.interlacedDuration = layoutData.interlacedDuration || 0; // Store duration

        console.log("View Component Initialized for instance:", this.logElement ? this.logElement.id : '(no log element)');
    }

    // --- Drawing Functions (now methods) ---

    // Draw static stage boxes
    drawStageBox(stageInfo, isRegressionActive, currentState, modelState) {
        let fillColor = this.defaultStageColor;
        let textColor = this.defaultTextColor;
        let strokeColor = this.defaultTextColor;
        let lineWidth = 1.5;
        let opacity = 0.5; // Default opacity

        const isRegressionStage = stageInfo.name === this.regressionStageLayout.name;
        
        // Use failureType to determine if regression is in process
        const isInRegressionProcess = modelState && modelState.failureType !== "";

        // Handle Regression Stage visibility/highlighting
        if (isRegressionStage) {
            opacity = isInRegressionProcess ? 1.0 : 0.5;
            if (isInRegressionProcess) {
                fillColor = this.regressionNodeActiveColor;
                textColor = this.activeTextColor;
                strokeColor = this.activeTextColor;
                lineWidth = 2;
            }
        } else {
            // Handle Main Stages opacity: Full opacity if it's in the highlighted set
            if (this.highlightedStages.has(stageInfo.name)) {
                opacity = 1.0; // Stage was visited (paused on) in this cycle
            }
        }

        // Skip drawing Deploy stage box if regression is in process
        if (stageInfo.name === 'Deploy' && isInRegressionProcess && !isRegressionStage) {
             return;
        }

        this.ctx.globalAlpha = opacity; // Apply calculated opacity BEFORE drawing

        this.ctx.fillStyle = fillColor; this.ctx.strokeStyle = strokeColor; this.ctx.lineWidth = lineWidth;
        const cornerRadius = 10; const stage = stageInfo;
        this.ctx.beginPath();
        this.ctx.moveTo(stage.x + cornerRadius, stage.y);
        this.ctx.lineTo(stage.x + stage.width - cornerRadius, stage.y);
        this.ctx.quadraticCurveTo(stage.x + stage.width, stage.y, stage.x + stage.width, stage.y + cornerRadius);
        this.ctx.lineTo(stage.x + stage.width, stage.y + stage.height - cornerRadius);
        this.ctx.quadraticCurveTo(stage.x + stage.width, stage.y + stage.height, stage.x + stage.width - cornerRadius, stage.y + stage.height);
        this.ctx.lineTo(stage.x + cornerRadius, stage.y + stage.height);
        this.ctx.quadraticCurveTo(stage.x, stage.y + stage.height, stage.x, stage.y + stage.height - cornerRadius);
        this.ctx.lineTo(stage.x, stage.y + cornerRadius);
        this.ctx.quadraticCurveTo(stage.x, stage.y, stage.x + cornerRadius, stage.y);
        this.ctx.closePath();
        this.ctx.fill(); this.ctx.stroke();

        // Draw text with full opacity for readability, regardless of box opacity
        this.ctx.fillStyle = textColor; this.ctx.font = 'bold 14px sans-serif'; this.ctx.textAlign = 'center'; this.ctx.textBaseline = 'middle';
        const lines = stage.name.split('\n'); const lineHeight = 16;
        const textStartY = stage.y + stage.height / 2 - (lines.length - 1) * lineHeight / 2;
        lines.forEach((line, i) => { this.ctx.fillText(line, stage.x + stage.width / 2, textStartY + i * lineHeight); });
    }

    // Draw the moving node
    drawMovingNode(nodeState) { // nodeState = {x, y, text, mode}
        const nodeX = nodeState.x - MOVING_NODE_WIDTH / 2;
        const nodeY = nodeState.y - MOVING_NODE_HEIGHT / 2;
        const cornerRadius = 5;
        const colors = nodeState.mode === 'regression' ? this.regressionNodeStyle : this.normalNodeStyle;

        // Draw Shape
        this.ctx.fillStyle = colors.fill; this.ctx.strokeStyle = colors.border; this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.moveTo(nodeX + cornerRadius, nodeY);
        this.ctx.lineTo(nodeX + MOVING_NODE_WIDTH - cornerRadius, nodeY); this.ctx.quadraticCurveTo(nodeX + MOVING_NODE_WIDTH, nodeY, nodeX + MOVING_NODE_WIDTH, nodeY + cornerRadius);
        this.ctx.lineTo(nodeX + MOVING_NODE_WIDTH, nodeY + MOVING_NODE_HEIGHT - cornerRadius); this.ctx.quadraticCurveTo(nodeX + MOVING_NODE_WIDTH, nodeY + MOVING_NODE_HEIGHT, nodeX + MOVING_NODE_WIDTH - cornerRadius, nodeY + MOVING_NODE_HEIGHT);
        this.ctx.lineTo(nodeX + cornerRadius, nodeY + MOVING_NODE_HEIGHT); this.ctx.quadraticCurveTo(nodeX, nodeY + MOVING_NODE_HEIGHT, nodeX, nodeY + MOVING_NODE_HEIGHT - cornerRadius);
        this.ctx.lineTo(nodeX, nodeY + cornerRadius); this.ctx.quadraticCurveTo(nodeX, nodeY, nodeX + cornerRadius, nodeY);
        this.ctx.closePath(); this.ctx.fill(); this.ctx.stroke();

        // Draw Text
        this.ctx.fillStyle = colors.text; this.ctx.font = 'bold 11px sans-serif'; this.ctx.textAlign = 'center'; this.ctx.textBaseline = 'middle';
        this.ctx.fillText(nodeState.text, nodeState.x, nodeState.y);
    }

    // Draw straight arrows between main stages
    drawArrow(fromStageInfo, toStageInfo) {
        const startX = fromStageInfo.x + fromStageInfo.width; const startY = fromStageInfo.centerY;
        const endX = toStageInfo.x; const endY = toStageInfo.centerY; const color = this.greyArrowColor;

        this.ctx.strokeStyle = color; this.ctx.fillStyle = color; this.ctx.lineWidth = 2; this.ctx.setLineDash([]);
        this.ctx.beginPath(); this.ctx.moveTo(startX, startY); this.ctx.lineTo(endX, endY); this.ctx.stroke(); // Line
        const angle = Math.atan2(endY - startY, endX - startX); // Arrowhead
        this.ctx.beginPath(); this.ctx.moveTo(endX, endY); this.ctx.lineTo(endX - ARROW_SIZE * Math.cos(angle - Math.PI / 6), endY - ARROW_SIZE * Math.sin(angle - Math.PI / 6)); this.ctx.lineTo(endX - ARROW_SIZE * Math.cos(angle + Math.PI / 6), endY - ARROW_SIZE * Math.sin(angle + Math.PI / 6)); this.ctx.closePath(); this.ctx.fill();
    }

    // Draw curved, dashed arrows for regression paths
    // Now takes modelState and sourceStageName to determine color and opacity
    drawCurvedArrow(fromStageInfo, toStageInfo, modelState, sourceStageName) {
        const startX = fromStageInfo.centerX;
        const startY = fromStageInfo.centerY + fromStageInfo.height / 2; // Bottom center
        const endX = toStageInfo.centerX;
        const endY = toStageInfo.centerY - toStageInfo.height / 2; // Top center
        let arrowColor = this.greyArrowColor;
        let arrowOpacity = 0.5; // Default to inactive opacity

        // Check if this specific arrow should be active (colored and opaque)
        // Check by failure type, even if regression mode not yet active
        if (modelState) {
            // Check if the failure type matches this arrow's source, regardless of regression mode
            if ((sourceStageName === 'Build' && modelState.failureType === 'Build') ||
                (sourceStageName === 'Test' && modelState.failureType === 'Test'))
            {
                arrowColor = this.regressionNodeActiveColor; // Use active regression color
                arrowOpacity = 1.0; // Full opacity when active
            }
        }

        this.ctx.globalAlpha = arrowOpacity; // Apply opacity
        this.ctx.strokeStyle = arrowColor; // Apply color
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([4, 4]); // Dashed line

        const cp1x = startX;
        const cp1y = startY + VERTICAL_GAP * REGRESSION_CURVE_FACTOR;
        const cp2x = endX;
        const cp2y = endY - VERTICAL_GAP * REGRESSION_CURVE_FACTOR;
        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
        this.ctx.stroke();

        this.ctx.setLineDash([]); // Reset line dash style
        this.ctx.globalAlpha = 1.0; // Reset alpha after drawing
    }

    // Draw the build number text
    drawBuildNumber(modelState) {
        if (!this.ctx || !modelState || !this.stageLayout || this.stageLayout.length === 0) return;

        const isInRegressionProcess = modelState.failureType !== "";
        this.ctx.fillStyle = isInRegressionProcess ? this.orangeColor : this.defaultTextColor;
        this.ctx.font = 'bold 18px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';

        let displayBuild = modelState.buildNumber;
        let text = `Build #${displayBuild}`;

        if (modelState.originalFailureBuild && modelState.failureType) {
            const checkNumber = modelState.regressionAttemptCount > 0 ? modelState.regressionAttemptCount : 1;
            text = `Build #${displayBuild} (Regressing from #${modelState.originalFailureBuild} - ${modelState.failureType} Fail Check #${checkNumber})`;
        }

        const topMargin = 20;
        this.ctx.fillText(text, this.canvasWidth / 2 , topMargin + BUILD_NUMBER_Y_OFFSET);
    }

    // Update the HTML status log element
    updateStatusLog(logMessages) {
        const logDiv = this.logElement;
        if (logDiv) { // Only update if the log element exists
            logDiv.innerHTML = logMessages.map(msg => {
                let color = this.defaultTextColor;
                if (msg.includes('[ERROR]')) color = '#fca5a5'; else if (msg.includes('Failed')) color = this.redColor;
                else if (msg.includes('Passed') || msg.includes('successfully completed')) color = this.greenColor;
                else if (msg.includes('Regression')) color = this.orangeColor;
                else if (msg.includes('Starting') || msg.includes('Simulation reset') || msg.includes('Simulation stopped')) color = '#93c5fd';
                // Basic sanitization (replace potential HTML chars)
                const sanitizedMsg = msg.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                return `<p style="color: ${color}; margin: 0 0 0.3rem 0; word-break: break-word;">${sanitizedMsg}</p>`;
            }).join('');
            logDiv.scrollTop = logDiv.scrollHeight; // Auto-scroll
        }
    }

    // --- Main Render Function ---
    render(currentModelData, movingNodeState, currentState) {
        if (!this.ctx || !this.canvasWidth) return; // Ensure initialized

        // --- Handle Interlacing Effect Start & State ---
        if (this.interlacedDuration > 0 && this.interlaceStartTime === null && currentModelData && currentModelData.isSimulationRunning) {
            this.interlaceStartTime = Date.now();
            this.isInterlacing = true;
            this.highlightedStages.clear();
        }

        // Always clear the canvas
        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

        // --- Apply Clipping / Render Based on Interlace State ---
        if (this.isInterlacing) {
            const elapsed = Date.now() - this.interlaceStartTime;
            if (elapsed >= this.interlacedDuration) {
                this.isInterlacing = false; // Effect finished
            } else {
                // Effect is active: Horizontal bands wiping left-to-right in sequence
                const timePerBand = this.interlacedDuration / this.numInterlaceBands;
                const currentSequenceIndex = Math.floor(elapsed / timePerBand);
                const timeIntoCurrentBand = elapsed % timePerBand;
                const currentBandWipeProgress = Math.min(timeIntoCurrentBand / timePerBand, 1);
                const lineHeight = this.canvasHeight / this.numInterlaceBands;

                // 1. Draw the BASE background over the whole canvas
                this.ctx.fillStyle = this.baseBackgroundColor;
                this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

                // 2. Setup Clipping Path for revealed HORIZONTAL bands/wipes
                this.ctx.save();
                this.ctx.beginPath();

                // Add rects for fully revealed bands (completed wipe)
                for (let i = 0; i < currentSequenceIndex; i++) {
                    const actualBandIndex = this.interlaceRenderOrder[i];
                    const y = actualBandIndex * lineHeight;
                    this.ctx.rect(0, y, this.canvasWidth, lineHeight); // Full width
                }

                // Add rect for the currently wiping band
                if (currentSequenceIndex < this.numInterlaceBands) {
                    const actualBandIndex = this.interlaceRenderOrder[currentSequenceIndex];
                    const y = actualBandIndex * lineHeight;
                    const revealWidth = this.canvasWidth * currentBandWipeProgress;
                     if (revealWidth > 0) { // Only add rect if width is positive
                         this.ctx.rect(0, y, revealWidth, lineHeight);
                    }
                }

                this.ctx.clip();

                // 3. Draw the ACTIVE background *within the clipped area*
                this.ctx.fillStyle = this.activeBackgroundColor;
                this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

                // 4. Update highlights so stages are visible during the interlace reveal
                this.updateHighlights(currentState);

                // 5. Draw the scene content on top of the active background (still clipped)
                this.drawSceneContent(currentModelData, movingNodeState, currentState);

                // 6. Restore context (removes clipping)
                this.ctx.restore();
                return; // Drawn for this frame
            }
        }

        // --- Rendering Logic (Effect Finished, Disabled, or Not Yet Started) ---

        // Draw the standard active background
        this.ctx.fillStyle = this.activeBackgroundColor;
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        // Check if the effect is configured but hasn't started
        if (this.interlacedDuration > 0 && this.interlaceStartTime === null) {
            // If waiting to start, we only drew the background above, so return.
            return;
        }

        // --- Default Full Render (Effect finished or disabled) ---
        this.updateHighlights(currentState);
        this.drawSceneContent(currentModelData, movingNodeState, currentState);
    }

    // Helper function to contain the actual drawing calls (used by both render paths)
    drawSceneContent(currentModelData, movingNodeState, currentState) {
        // Draw Build Number using the latest model data
        if (currentModelData && currentModelData.buildNumber !== undefined) {
            this.drawBuildNumber(currentModelData);
        }

        // Use failureType to determine if regression is in process
        const isInRegressionProcess = currentModelData && currentModelData.failureType !== "";

        // Draw static stage boxes, passing state information and model data
        this.stageLayout.forEach(stageInfo => {
            this.drawStageBox(stageInfo, isInRegressionProcess, currentState, currentModelData);
        });

        // Draw regression stage box separately if it exists
        if (this.regressionStageLayout && this.regressionStageLayout.name) {
            this.drawStageBox(this.regressionStageLayout, isInRegressionProcess, currentState, currentModelData);
        }

        // Draw arrows between main stages
        for (let i = 0; i < this.stageLayout.length - 1; i++) {
            if (!(this.stageLayout[i].name === 'Test' && this.stageLayout[i+1].name === 'Deploy' && isInRegressionProcess)) {
                this.drawArrow(this.stageLayout[i], this.stageLayout[i+1]);
            }
        }

        // Draw curved arrows to Regression stage (if it exists)
        if (this.regressionStageLayout && this.regressionStageLayout.name) {
            const buildStage = this.stageLayout.find(s => s.name === 'Build');
            const testStage = this.stageLayout.find(s => s.name === 'Test');
            if (buildStage) this.drawCurvedArrow(buildStage, this.regressionStageLayout, currentModelData, 'Build');
            if (testStage) this.drawCurvedArrow(testStage, this.regressionStageLayout, currentModelData, 'Test');
        }

        // Draw the moving node
        if (movingNodeState) {
            this.drawMovingNode(movingNodeState);
        }
    }

    // Helper function to update stage highlights
    updateHighlights(currentState) {
        if (!currentState) return;

        if (currentState === 'GOING_TO_COMMIT' || currentState === 'IDLE') {
            this.highlightedStages.clear();
        } else if (currentState.startsWith('PAUSED_ON_')) {
            const pausedStateType = currentState.substring('PAUSED_ON_'.length);
            const stageNameMapping = {
                COMMIT: 'Commit',
                BUILD: 'Build',
                TEST: 'Test',
                DEPLOY: 'Deploy',
                REGRESSION: this.regressionStageLayout.name
            };
            const newlyPausedStageName = stageNameMapping[pausedStateType];
            if (newlyPausedStageName) {
                this.highlightedStages.add(newlyPausedStageName);
            }
        }
    }

    // Add a reset method to clear interlace state
    reset() {
        this.interlaceStartTime = null;
        this.isInterlacing = false;
        this.highlightedStages.clear();
        // Optionally trigger redraw here if controller doesn't guarantee it
    }
}
// --- End of View Component ---