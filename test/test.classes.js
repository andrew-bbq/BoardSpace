const expect = require('chai').expect;

// The code for setting up a headless browser using JSDOM
// Resource: https://enzymejs.github.io/enzyme/docs/guides/jsdom.html
const { JSDOM } = require('jsdom');
const jsdom = new JSDOM('<!doctype html><html><body></body></html>');
const { window } = jsdom;

function copyProps(src, target) {
  Object.defineProperties(target, {
    ...Object.getOwnPropertyDescriptors(src),
    ...Object.getOwnPropertyDescriptors(target),
  });
}

global.window = window;
global.document = window.document;
global.navigator = {
  userAgent: 'node.js',
};
global.requestAnimationFrame = function (callback) {
  return setTimeout(callback, 0);
};
global.cancelAnimationFrame = function (id) {
  clearTimeout(id);
};
copyProps(window, global);

// ============== CLASS TESTING ==============
//          << setting classes >>
const classes = require('../public/javascripts/classes');
const Pen = classes.Pen;
const Text = classes.Text;
const Rectangle = classes.Rectangle;


///////////////////////////////////////
//          << pen tests >>          //
///////////////////////////////////////
describe('Test Pen Class', () => {

    let pen = new Pen(1, { x: 0, y: 0 }, { x: 0, y: 0 }, 2, "#FFFFFF");

    describe('Test Instantiation', () => {
        // Test if pen is actually created
        it('should not be null', () =>{
            if(pen == null){
                throw "Pen is NULL";
            }
        });

        it('should have correct id', () =>{
            expect(pen.id).to.equal(1);
        });

        it('should have correct upperLeft', () =>{
            expect(pen.upperLeft).to.deep.equal({ x: 0, y: 0 });
        });

        it('should have correct lowerRight', () =>{
            expect(pen.lowerRight).to.deep.equal({ x: 0, y: 0 });
        });

        it('should have correct size', () =>{
            expect(pen.size).to.equal(2);
        });

        it('should have correct color', () =>{
            expect(pen.color).to.equal("#FFFFFF");
        });
    });

    // Test initial path data
    it('should have empy path by default', () =>{
        let path = pen.getPath();
        expect(path).to.equal("");
    });

    // Test setting the path data
    let pathInput = 'M 0 0 L 1 1 L 2 2';
    it('should set the path data', () =>{
        try{
            pen.setPath(pathInput);
        } catch (e) {
            console.error(e);
            throw "Error setting path";
        }
    });

    // Testing retrieving the path data
    it('should return the correct path data', () => {
        expect(pen.getPath()).to.equal(pathInput);
    });

    // Testing resetting the path data
    it('should reset the path to an empty string', () =>{
        try{
            pen.setPath("");
        } catch (e) {
            console.error(e);
            throw "Error setting path";
        }
        expect(pen.getPath()).to.equal("");
    });

    // Test updatePathData
    let newPoints = [
        {type: "jump", x:0 , y:0},
        {type: "line", x:2 , y:4},
        {type: "line", x:3 , y:3},
        {type: "jump", x:4 , y:2},
    ];
    let noPoints = [];
    let newPoints2 = [
        {type: "line", x:0 , y:0}
    ];
    let newPoints3 = [
        {type: "jump", x:0 , y:0}
    ];

    // Testing getSVG
    it('should reset the path to an empty string', () =>{
        try{
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

    it('should return when newPoints is empty', () =>{
        pen.updatePathData(noPoints);
        expect(pen.getPath()).to.not.equal(expectedPath);
    });
    it('should update path data correctly for new path', () =>{
        pen.updatePathData(newPoints);
        expect(pen.getPath()).to.equal(expectedPath);
    });
    it('should update path data correctly when NOT new path (starts with line)', () =>{
        pen.updatePathData(newPoints2);
        expect(pen.getPath()).to.equal(expectedPath2);
    });
    it('should update path data correctly when NOT old path (starts with jump)', () =>{
        pen.updatePathData(newPoints3);
        expect(pen.getPath()).to.equal(expectedPath3);
    });

    // resetting pen to new values
    pen2 = new Pen(1, { x: 50, y: 50 }, { x: 100 , y: 100 }, 2, "#FFFFFF");
    let point1 = { x: 10, y: 10 };
    let point2 = { x: 150, y: 150 };
    it('should correctly update corner points with lower upperLeft values', () =>{
        pen2.updateCornerPoints(point1);
        expect(pen2.upperLeft.x).to.equal(10);
        expect(pen2.upperLeft.y).to.equal(10);
    });
    it('should correctly update corner points with higher lowerRight values', () =>{
        pen2.updateCornerPoints(point2);
        expect(pen2.lowerRight.x).to.equal(150);
        expect(pen2.lowerRight.y).to.equal(150);
    });

    // test mouse events


}); 

////////////////////////////////////////
//          << text tests >>          //
////////////////////////////////////////
describe('Test Text Class', () => {
    let text = new Text(2, { x: 0, y: 0 }, { x: 0, y: 0 }, 2, "#FFFFFF");
    let text2 = new Text(2, { x: 0, y: 0 }, { x: 0, y: 0 }, 2, "#FFFFFF");

    describe('Test Instantiation', () => {
        // Test if text is actually created
        it('should not be null', () =>{
            if(text == null){
                throw "Text is NULL";
            }
        });

        it('should have correct id', () =>{
            expect(text.id).to.equal(2);
        });

        it('should have correct upperLeft', () =>{
            expect(text.upperLeft).to.deep.equal({ x: 0, y: 0 });
        });

        it('should have correct lowerRight', () =>{
            expect(text.lowerRight).to.deep.equal({ x: 0, y: 0 });
        });

        it('should have correct size', () =>{
            expect(text.size).to.equal(2);
        });

        it('should have correct color', () =>{
            expect(text.color).to.equal("#FFFFFF");
        });
    });

    // Testing getSVG
    it('should return a non null foreignText', () =>{
        try{
            text.getSvg();
            expect(text.foreignText).to.not.equal(null);
        } catch (e) {
            console.error(e);
            throw "Error returning foreignText";
        }
    });

    describe('Test setText and getText', () => {
        text.setText("abcdefg");
        it('should set path string correctly', () =>{
            expect(text.textDiv.innerHTML).to.equal("abcdefg");
        });

        it('should get path string correctly', () =>{;
            expect(text.getText()).to.equal("abcdefg");
        });
    });
    describe('Test enable and disable', () => {
        describe('Test enable', () => {
            text.enable();
            it('should set contendEditable to true', () =>{
                expect(text.textDiv.getAttribute("contentEditable")).to.equal("true");
            });
            it('should add "textEnabled to classList', () =>{
                expect(text.foreignText.classList.contains("textEnabled")).to.equal(true);
            });
        });
        describe('Test disable', () => {
            text2.disable();
            it('should set contendEditable to false', () =>{
                expect(text2.textDiv.getAttribute("contentEditable")).to.equal("false");
            });
            it('should remove "textEnabled from classList', () =>{
                expect(text2.foreignText.classList.contains("textEnabled")).to.equal(false);
            });
        });
    });
});




//          << Rectangle tests >>
describe('Test Rectangle Class', () => {
    let rectangle = new Rectangle(3, { x: 100, y: 100 }, { x: 150, y: 150 }, "#FFFFFF");
    let rectangle2 = new Rectangle(3, { x: 100, y: 100 }, { x: 150, y: 150 }, "#FFFFFF");

    describe('Test Instantiation', () => {
        // Test if text is actually created
        it('should not be null', () =>{
            if(rectangle == null){
                throw "Rectangle is NULL";
            }
        });

        it('should have correct id', () =>{
            expect(rectangle.id).to.equal(3);
        });

        it('should have correct upperLeft', () =>{
            expect(rectangle.upperLeft).to.deep.equal({ x: 100, y: 100 });
        });

        it('should have correct lowerRight', () =>{
            expect(rectangle.lowerRight).to.deep.equal({ x: 150, y: 150 });
        });

        it('should have correct color', () =>{
            expect(rectangle.color).to.equal("#FFFFFF");
        });
    });

    describe('Test updateShape', () => {
        it('should properly update rectangle x and y for mouse x,y < rect x,y', () =>{
            rectangle.updateShape(50, 50);
            // test x
            expect(rectangle.upperLeft.x).to.equal(50);
            expect(rectangle.lowerRight.x).to.equal(rectangle.x);
            expect(rectangle.rect.getAttribute("x")).to.equal('50');

            // test y
            expect(rectangle.upperLeft.y).to.equal(50);
            expect(rectangle.lowerRight.y).to.equal(rectangle.y);
            expect(rectangle.rect.getAttribute("y")).to.equal('50');
        });
        it('should properly update rectangle x and y for mouse x,y > rect x,y', () =>{
            rectangle.updateShape(120, 120);
            // test x
            expect(rectangle.upperLeft.x).to.equal(rectangle.x);
            expect(rectangle.lowerRight.x).to.equal(120);
            expect(rectangle.rect.getAttribute("x")).to.equal(rectangle.x.toString());

            // test y
            expect(rectangle.upperLeft.y).to.equal(rectangle.y);
            expect(rectangle.lowerRight.y).to.equal(120);
            expect(rectangle.rect.getAttribute("y")).to.equal(rectangle.y.toString());
        });
    });
});