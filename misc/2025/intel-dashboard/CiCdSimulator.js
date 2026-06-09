class CiCdSimulator {
    constructor(containerSelector, options = {}) {
        this.container = document.querySelector(containerSelector);
        if (!this.container) {
            console.error(`Container element "${containerSelector}" not found.`);
            return;
        }

        // Default options + User overrides
        this.options = {
            startBuildNumber: 10,
            canvasWidth: 850,
            canvasHeight: 350,
            showLog: true,      // New option
            showControls: true, // New option
            dashboard: null,    // Add dashboard option
            interlacedDuration: 0, // Add new option (0 means disabled)
            ...options          // Merge user options
        };

        // Unique IDs for elements within this instance
        this.instanceId = `cicd-sim-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

        this._setupHTML();
        this._initializeMVC();

        // Autoplay logic moved to _initializeMVC after canvas exists
    }

    _setupHTML() {
        const controlsHTML = this.options.showControls ? `
            <div class="mt-4 flex justify-center space-x-4">
                <button id="${this.instanceId}-start" class="px-6 py-2 bg-blue-700 text-white font-semibold rounded-lg shadow-md hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 disabled:opacity-50 disabled:cursor-not-allowed">
                    Start
                </button>
                <button id="${this.instanceId}-stop" class="px-6 py-2 bg-red-700 text-white font-semibold rounded-lg shadow-md hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                    Stop
                </button>
                <button id="${this.instanceId}-reset" class="px-6 py-2 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-75">
                    Reset
                </button>
            </div>
        ` : '';

        const logHTML = this.options.showLog ? `
            <div id="${this.instanceId}-log" class="mt-4 p-3 bg-gray-900 border border-gray-600 rounded-lg h-36 overflow-y-auto text-left font-mono text-sm text-gray-300 leading-snug">
                <p>Simulation log will appear here...</p>
            </div>
        ` : '';

        // Create canvas, buttons, and log area within the container
        this.container.innerHTML = `
            <h1 class="text-xl font-bold mb-3 text-gray-200">CI/CD Workflow Simulation (Instance: ${this.instanceId})</h1>
            <canvas id="${this.instanceId}-canvas" width="${this.options.canvasWidth}" height="${this.options.canvasHeight}" class="bg-gray-700 rounded-lg shadow-md block"></canvas>
            ${controlsHTML}
            ${logHTML}
        `;

        // Add basic styles if not already present globally (or scope them)
        if (!document.getElementById('cicd-sim-styles')) {
            const style = document.createElement('style');
            style.id = 'cicd-sim-styles';
            // Add optional styles if needed, scoped or global
            style.innerHTML = `
                /* .${this.instanceId}-canvas { } */ /* Example scoping */
                button:active { transform: scale(0.95); }
                /* Style for log text - only relevant if log exists */
                #${this.instanceId}-log p { margin: 0 0 0.3rem 0; word-break: break-word; }
            `;
            document.head.appendChild(style);
            // Note: Tailwind handles most styling, this is minimal.
        }
    }

    _initializeMVC() {
        const canvas = this.container.querySelector(`#${this.instanceId}-canvas`);
        if (!canvas) {
            console.error(`Canvas not found for instance ${this.instanceId}`);
            return;
        }
        const ctx = canvas.getContext('2d');
        const logElement = this.options.showLog ? this.container.querySelector(`#${this.instanceId}-log`) : null;

        // Instantiate ACTUAL Model, View, Controller specific to this instance
        this.model = new WorkflowModel(this.options.startBuildNumber);
        this.view = new WorkflowViewComponent(); // Use the actual class
        this.controller = new WorkflowControllerComponent(); // Use the actual class
        
        // --- Pass dashboard and instance ID to Model --- 
        if (this.options.dashboard) {
            this.model.setDashboard(this.options.dashboard);
        }
        this.model.setInstanceId(this.instanceId);
        // --- End Pass dashboard and instance ID to Model ---

        // Pass necessary elements and instances during initialization
        // Controller calculates layout and passes it to view.init
        this.controller.init({
            container: this.container,
            instanceId: this.instanceId,
            model: this.model,
            view: this.view,
            canvasWidth: this.options.canvasWidth,
            canvasHeight: this.options.canvasHeight,
            // Pass logElement (might be null)
            logElement: logElement,
            // Pass showControls flag so controller knows whether to setup buttons
            showControls: this.options.showControls,
            // Pass the interlaced duration
            interlacedDuration: this.options.interlacedDuration
        });

        // Set the model's event callback AFTER controller init (controller holds the handler)
        this.model.setEventCallback(this.controller.handleModelEvent.bind(this.controller));

        // --- Autoplay on Visibility --- 
        if (!this.options.showControls) {
            const observerOptions = {
                root: null, // Use the viewport
                rootMargin: '0px',
                threshold: 0.1 // Trigger when 10% is visible
            };

            const observerCallback = (entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        console.log(`Simulator ${this.instanceId} intersecting, starting...`);
                        // Slight delay still good practice after intersection
                        setTimeout(() => this.start(), 50); 
                        observer.unobserve(canvas); // Stop observing once started
                    }
                });
            };

            const intersectionObserver = new IntersectionObserver(observerCallback, observerOptions);
            intersectionObserver.observe(canvas);
             console.log(`Simulator ${this.instanceId} set up for visibility start.`);
        }
    }

    // Public methods (optional)
    start() {
        // Check if controller exists and has the method (basic safety)
        if (this.controller && typeof this.controller.startSimulation === 'function') {
            this.controller.startSimulation();
        } else {
            console.warn(`Instance ${this.instanceId}: Cannot start, controller not ready.`);
        }
    }

    stop() {
        if (this.controller && typeof this.controller.stopSimulation === 'function') {
            this.controller.stopSimulation();
        }
    }

    reset() {
         if (this.controller && typeof this.controller.resetSimulation === 'function') {
            this.controller.resetSimulation();
        }
    }
}

// --- Remove Placeholder definitions if they were there ---
/*
class WorkflowViewComponent { init(ctx, logElement) {} render(modelState, nodeState, controllerState) {} updateStatusLog(messages) {} }
class WorkflowControllerComponent { init(config) {} startSimulation() {} stopSimulation() {} resetSimulation() {} }
*/

// NOTE: Ensure model.js, view.js, controller.js containing the classes are loaded BEFORE this script. 