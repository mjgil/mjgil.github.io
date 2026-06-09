// Shared constants for CI/CD workflow simulation

// Animation settings
const ANIMATION_SPEED = 0.05; // Speed factor for node movement (0 to 1 per frame)
const POSITION_THRESHOLD = 2; // Pixels within target to consider "arrived"
const PAUSE_DURATION = 300; // Milliseconds pause for PAUSED_ON states

// Layout dimensions
const STAGE_WIDTH = 120;
const STAGE_HEIGHT = 60;
const GAP = 80;
const VERTICAL_GAP = 80;
const MOVING_NODE_WIDTH = 85;
const MOVING_NODE_HEIGHT = 40;

// View-specific constants
const ARROW_SIZE = 10; // Pixel size for arrowheads
const BUILD_NUMBER_Y_OFFSET = 35; // Vertical offset for build number text
const REGRESSION_CURVE_FACTOR = 0.6; // Bezier curve factor for regression arrows 