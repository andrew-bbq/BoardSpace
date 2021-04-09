const expect = require('chai').expect;

// The code for setting up a headless browser using JSDOM
// Resource: https://enzymejs.github.io/enzyme/docs/guides/jsdom.html
const { JSDOM } = require('jsdom');

// ============== CLASS TESTING ==============
//          << setting classes >>
const classes = require('../public/javascripts/classes');
const Pen = classes.Pen;
const Text = classes.Text;
const Rectangle = classes.Rectangle;


////////////////////////////////////////
//          << pen tests >>          //
////////////////////////////////////////
describe('Test Pen Class', () => {

    let pen;
    let dom;

    beforeEach("Set up Dom and Create New Pen", function () {

         dom = new JSDOM(
            `<html>
               <body>
               </body>
             </html>`,
             { url: 'http://localhost' },
          );
        
          global.window = dom.window;
          global.document = dom.window.document;

        pen = new Pen(1, { x: 0, y: 0 }, { x: 0, y: 0 }, 2, "#FFFFFF");
    });

    afterEach("Close Dom", function(){
        dom.window.close
    });

    describe('Test Instantiation', () => {
        // Test if pen is actually created
        it('should not be null', () => {
            if (pen == null) {
                throw "Pen is NULL";
            }
        });

        it('should have correct id', () => {
            expect(pen.id).to.equal(1);
        });

        it('should have correct upperLeft', () => {
            expect(pen.upperLeft).to.deep.equal({ x: 0, y: 0 });
        });

        it('should have correct lowerRight', () => {
            expect(pen.lowerRight).to.deep.equal({ x: 0, y: 0 });
        });

        it('should have correct size', () => {
            expect(pen.size).to.equal(2);
        });

        it('should have correct color', () => {
            expect(pen.color).to.equal("#FFFFFF");
        });
    });

    // Test initial path data
    it('should have empy path by default', () => {
        let path = pen.getPath();
        expect(path).to.equal("");
    });

    // Test setting the path data
    let pathInput = 'M 0 0 L 1 1 L 2 2';
    it('should set the path data', () => {
        try {
            pen.setPath(pathInput);
        } catch (e) {
            console.error(e);
            throw "Error setting path";
        }
    });

    // Testing retrieving the path data
    it('should return the correct path data', () => {
        pen.setPath(pathInput);
        expect(pen.getPath()).to.equal(pathInput);
    });

    // Testing resetting the path data
    it('should reset the path to an empty string', () => {
        try {
            pen.setPath("");
        } catch (e) {
            console.error(e);
            throw "Error setting path";
        }
        expect(pen.getPath()).to.equal("");
    });

    // Test updatePathData
    let newPoints = [
        { type: "jump", x: 0, y: 0 },
        { type: "line", x: 2, y: 4 },
        { type: "line", x: 3, y: 3 },
        { type: "jump", x: 4, y: 2 },
    ];
    let noPoints = [];
    let newPoints2 = [
        { type: "line", x: 0, y: 0 }
    ];
    let newPoints3 = [
        { type: "jump", x: 0, y: 0 }
    ];

    // Testing getSVG
    it('should reset the path to an empty string', () => {
        try {
            pen.getSvg();
        } catch (e) {
            console.error(e);
            throw "Error setting path";
        }
        expect(pen.getPath()).to.equal("");
    });

    let expectedPath = "M 0 0 L 2 4 L 3 3 M 4 2";
    let expectedPath2 = expectedPath + " L 0 0";
    let expectedPath3 = expectedPath2 + " M 0 0";

    it('should return when newPoints is empty', () => {
        pen.updatePathData(noPoints);
        expect(pen.getPath()).to.not.equal(expectedPath);
    });
    it('should update path data correctly for new path', () => {
        pen.updatePathData(newPoints);
        expect(pen.getPath()).to.equal(expectedPath);
    });
    it('should update path data correctly when NOT new path (starts with line)', () => {
        pen.updatePathData(newPoints);
        pen.updatePathData(newPoints2);
        expect(pen.getPath()).to.equal(expectedPath2);
    });
    it('should update path data correctly when NOT old path (starts with jump)', () => {
        pen.updatePathData(newPoints);
        pen.updatePathData(newPoints2);
        pen.updatePathData(newPoints3);
        expect(pen.getPath()).to.equal(expectedPath3);
    });

    // resetting pen to new values
    let point1 = { x: 10, y: 10 };
    let point2 = { x: 150, y: 150 };
    it('should correctly update corner points with lower upperLeft values', () => {
        pen.updateCornerPoints(point1);
        expect(pen.upperLeft.x).to.equal(0);
        expect(pen.upperLeft.y).to.equal(0);
    });
    it('should correctly update corner points with higher lowerRight values', () => {
        pen.updateCornerPoints(point2);
        expect(pen.lowerRight.x).to.equal(150);
        expect(pen.lowerRight.y).to.equal(150);
    });
});

////////////////////////////////////////
//          << text tests >>          //
////////////////////////////////////////
describe('Test Text Class', () => {
    let text;
    let dom;

    beforeEach("Set up Dom and Create New Pen", function () {
         dom = new JSDOM(
            `<html>
               <body>
               </body>
             </html>`,
             { url: 'http://localhost' },
          );
        
          global.window = dom.window;
          global.document = dom.window.document;

          text = new Text(2, { x: 0, y: 0 }, { x: 0, y: 0 }, 2, "#FFFFFF");
    });

    afterEach("Close Dom", function(){
        dom.window.close
    });

    describe('Test Instantiation', () => {
        // Test if text is actually created
        it('should not be null', () => {
            if (text == null) {
                throw "Text is NULL";
            }
        });

        it('should have correct id', () => {
            expect(text.id).to.equal(2);
        });

        it('should have correct upperLeft', () => {
            expect(text.upperLeft).to.deep.equal({ x: 0, y: 0 });
        });

        it('should have correct lowerRight', () => {
            expect(text.lowerRight).to.deep.equal({ x: 0, y: 0 });
        });

        it('should have correct size', () => {
            expect(text.size).to.equal(2);
        });

        it('should have correct color', () => {
            expect(text.color).to.equal("#FFFFFF");
        });
    });

});




//          << Rectangle tests >>
