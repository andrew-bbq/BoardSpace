const TOOL_PEN = 0;
const TOOL_HIGHLIGHTER = 1;
const TOOL_RECTANGLE = 2;
const TOOL_CIRCLE = 4;
const TOOL_ERASER = 8;
const TOOL_TEXT = 16;
const TOOL_EYEDROP = 32;
const BOARD_WIDTH = 1000;
const BOARD_HEIGHT = 750;
const DEFAULT_TEXT_HEIGHT = 100;
const DEFAULT_TEXT_WIDTH = 300;
const POLL_RATE = 10;

let tool = TOOL_PEN;
let mouseDown = false;