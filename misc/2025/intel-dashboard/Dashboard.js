class Dashboard {
    constructor(selector, options = {}) {
        this.container = document.querySelector(selector);
        if (!this.container) {
            console.error(`Dashboard container not found: ${selector}`);
            return;
        }
        this.options = {
            height: options.height || 150,
            title: options.title || 'Build Statistics',
            interlacedDuration: options.interlacedDuration || 0
        };
        // Initialize with placeholder stats
        this.stats = {
            totalBuilds: 0,
            successfulBuilds: 0,
            failedBuilds: 0,
            regressionsDetected: 0,
            regressionsFixed: 0,
        };
        this.simulatorStats = new Map(); // Track per-simulator stats for aggregation

        // Colors
        this.baseBackgroundColor = '#2d3748'; // Darker base (e.g., bg-gray-800)
        this.activeBackgroundColor = '#4b5563'; // Standard dashboard bg (bg-gray-600)

        // Interlacing state
        this.interlaceStartTime = null;
        this.isInterlacing = false;
        this.rafId = null; // For animation loop
        this.numInterlaceBands = 14; // Match simulator
        this.interlaceRenderOrder = [0, 2, 4, 6, 8, 10, 12, 1, 3, 5, 7, 9, 11, 13]; // Match simulator

        this._setupCanvas();
        this._initVisibilityObserver(); // Start observer
        
        // Initial render will be handled by observer or resize
    }

    _setupCanvas() {
        this.canvas = document.createElement('canvas');
        // Set drawing buffer size based on container, minus padding approximation if needed
        // clientWidth should account for padding, border-box sizing helps
        this.canvas.width = this.container.clientWidth; 
        this.canvas.height = this.options.height;
        this.canvas.style.width = '100%'; // Make display width responsive
        this.canvas.style.height = this.options.height + 'px'; // Keep display height fixed for now
        this.ctx = this.canvas.getContext('2d');
        this.container.innerHTML = ''; // Clear placeholder content
        this.container.appendChild(this.canvas);
        // Set initial background to the active color (will be covered by base during interlace)
        this.canvas.style.backgroundColor = this.activeBackgroundColor; 
        this.canvas.style.borderRadius = '4px';
        this.canvas.style.marginTop = '1rem';
    }

    _initVisibilityObserver() {
        if (!this.canvas) return;

        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1 
        };

        const observerCallback = (entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    console.log('Dashboard intersecting, starting render loop...');
                    this.startRenderLoop();
                    observer.unobserve(this.canvas);
                } else {
                    // Optional: Stop rendering if it goes out of view
                    // this.stopRenderLoop(); 
                }
            });
        };

        const intersectionObserver = new IntersectionObserver(observerCallback, observerOptions);
        intersectionObserver.observe(this.canvas);
        console.log('Dashboard observer setup.');
        
        // Initial placeholder render (just background)
        this.renderBackgroundOnly(); 
    }

    startRenderLoop() {
        if (this.rafId) return; // Already running
        if (this.options.interlacedDuration > 0 && this.interlaceStartTime === null) {
            this.interlaceStartTime = Date.now();
            this.isInterlacing = true;
        }
        const loop = () => {
            this.render(); // Call the main render function
            this.rafId = requestAnimationFrame(loop);
        };
        this.rafId = requestAnimationFrame(loop);
    }

    stopRenderLoop() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    // Method to update statistics - aggregates across multiple simulators
    updateStats(newData, sourceId = 'default') {
        // Store the latest stats from this simulator source
        this.simulatorStats.set(sourceId, {
            totalBuilds: newData.totalBuilds ?? 0,
            successfulBuilds: newData.successfulBuilds ?? 0,
            failedBuilds: newData.failedBuilds ?? 0,
            regressionsDetected: newData.regressionsDetected ?? 0,
            regressionsFixed: newData.regressionsFixed ?? 0,
        });

        // Recompute aggregate totals across all simulator sources
        let totalBuilds = 0;
        let successfulBuilds = 0;
        let failedBuilds = 0;
        let regressionsDetected = 0;
        let regressionsFixed = 0;

        for (const s of this.simulatorStats.values()) {
            totalBuilds += s.totalBuilds;
            successfulBuilds += s.successfulBuilds;
            failedBuilds += s.failedBuilds;
            regressionsDetected += s.regressionsDetected;
            regressionsFixed += s.regressionsFixed;
        }

        this.stats = { totalBuilds, successfulBuilds, failedBuilds, regressionsDetected, regressionsFixed };
        // No direct render call here; the animation loop handles rendering
    }

    renderBackgroundOnly(){
         if (!this.ctx) return;
         this.ctx.fillStyle = this.activeBackgroundColor;
         this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    render() {
        if (!this.ctx) return; // Guard

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        let didClip = false;

        // --- Interlacing Logic (Horizontal Band Wipe) ---
        if (this.isInterlacing && this.options.interlacedDuration > 0) {
            const elapsed = Date.now() - this.interlaceStartTime;
            if (elapsed >= this.options.interlacedDuration) {
                this.isInterlacing = false;
            } else {
                // Effect active: Horizontal bands wiping left-to-right in sequence
                const timePerBand = this.options.interlacedDuration / this.numInterlaceBands;
                const currentSequenceIndex = Math.floor(elapsed / timePerBand);
                const timeIntoCurrentBand = elapsed % timePerBand;
                const currentBandWipeProgress = Math.min(timeIntoCurrentBand / timePerBand, 1);
                const lineHeight = this.canvas.height / this.numInterlaceBands;

                // 1. Draw BASE background
                this.ctx.fillStyle = this.baseBackgroundColor;
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

                // 2. Setup Clipping Path
                this.ctx.save();
                this.ctx.beginPath();

                // Add fully revealed bands (full width)
                for (let i = 0; i < currentSequenceIndex; i++) {
                    const actualBandIndex = this.interlaceRenderOrder[i];
                    const y = actualBandIndex * lineHeight;
                    this.ctx.rect(0, y, this.canvas.width, lineHeight);
                }

                // Add currently wiping band (partial width)
                if (currentSequenceIndex < this.numInterlaceBands) {
                    const actualBandIndex = this.interlaceRenderOrder[currentSequenceIndex];
                    const y = actualBandIndex * lineHeight;
                    const revealWidth = this.canvas.width * currentBandWipeProgress;
                    if (revealWidth > 0) {
                        this.ctx.rect(0, y, revealWidth, lineHeight);
                    }
                }

                this.ctx.clip();
                didClip = true;

                // 3. Draw ACTIVE background within clipped area
                this.ctx.fillStyle = this.activeBackgroundColor;
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                
                // Fall through to draw content within the clip
            }
        }

        // --- Draw Content (potentially clipped) ---
        
        // Draw the standard background if NOT interlacing OR if interlacing finished this frame
        if (!didClip) { 
            this.ctx.fillStyle = this.activeBackgroundColor;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // Don't draw chart content if interlacing is enabled but hasn't started
        if (this.options.interlacedDuration > 0 && this.interlaceStartTime === null) {
            if (didClip) this.ctx.restore(); // Should already be restored if we reached here
            return; 
        }

        // Draw Title
        this.ctx.fillStyle = '#e5e7eb'; // text-gray-200
        this.ctx.font = 'bold 16px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(this.options.title, this.canvas.width / 2, 25);
        this.ctx.font = '14px sans-serif';

        // Bar Chart Settings
        const barPadding = 10;
        const chartAreaHeight = this.canvas.height - 70; // Space for title and labels
        const chartAreaY = 50;
        const barCount = 5; // Total, Success, Failed, Reg Found, Reg Fixed
        const totalBarWidth = this.canvas.width - 40; // Margins - USE DYNAMIC WIDTH
        const barWidth = (totalBarWidth - (barCount - 1) * barPadding) / barCount;
        const maxStatValue = Math.max(1, // Avoid division by zero
            this.stats.totalBuilds,
            this.stats.successfulBuilds,
            this.stats.failedBuilds,
            this.stats.regressionsDetected,
            this.stats.regressionsFixed
        );

        // Data and Colors
        const barsData = [
            { label: 'Total', value: this.stats.totalBuilds, color: '#3b82f6' },      // blue-500
            { label: 'Success', value: this.stats.successfulBuilds, color: '#22c55e' }, // green-500
            { label: 'Failed', value: this.stats.failedBuilds, color: '#ef4444' },     // red-500
            { label: 'Reg Found', value: this.stats.regressionsDetected, color: '#f97316' }, // orange-500
            { label: 'Reg Fixed', value: this.stats.regressionsFixed, color: '#a855f7' }    // purple-500
        ];

        // Draw Bars
        let currentX = 20; // Starting X position
        barsData.forEach(bar => {
            const barHeight = (bar.value / maxStatValue) * chartAreaHeight;
            const yPos = chartAreaY + chartAreaHeight - barHeight;

            this.ctx.fillStyle = bar.color;
            this.ctx.fillRect(currentX, yPos, barWidth, barHeight);

            // Draw Value Label above bar
            this.ctx.fillStyle = '#e5e7eb'; // text-gray-200
            this.ctx.textAlign = 'center';
            this.ctx.fillText(bar.value, currentX + barWidth / 2, yPos - 5);

            // Draw Category Label below chart area
            this.ctx.fillText(bar.label, currentX + barWidth / 2, chartAreaY + chartAreaHeight + 15);

            currentX += barWidth + barPadding;
        });

        // Restore context if we clipped
        if (didClip) {
            this.ctx.restore();
        }
    }
    
    // Debounced resize handler needs adjustment
    _handleResize() {
        // Stop any existing animation loop during resize
        this.stopRenderLoop(); 
        
        // Update canvas drawing buffer size
        this.canvas.width = this.container.clientWidth;
        
        // Reset interlacing state if needed, or just restart render loop
        this.interlaceStartTime = null; // Ensure effect restarts if enabled
        this.isInterlacing = false;
        
        // Restart the render loop (will re-trigger interlacing if applicable)
        this.startRenderLoop(); 
    }
    
    // Optional reset method if needed externally
    reset() {
        this.stopRenderLoop();
        this.interlaceStartTime = null;
        this.isInterlacing = false;
        this.simulatorStats.clear();
        this.stats = {
            totalBuilds: 0,
            successfulBuilds: 0,
            failedBuilds: 0,
            regressionsDetected: 0,
            regressionsFixed: 0,
        };
        this.renderBackgroundOnly(); // Show blank state
    }
} 