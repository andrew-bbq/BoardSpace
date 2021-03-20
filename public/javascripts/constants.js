const TOOL_PEN = 0;
const TOOL_HIGHLIGHTER = 1;
const TOOL_RECTANGLE = 2;
const TOOL_CIRCLE = 4;
const TOOL_ERASER = 8;

const BOARD_WIDTH = 500;
const BOARD_HEIGHT = 500;
const POLL_RATE = 10;

let tool = TOOL_PEN;
let mouseDown = false;