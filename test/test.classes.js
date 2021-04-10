const expect = require('chai').expect;

// The code for setting up a headless browser using JSDOM
// Resource: https://enzymejs.github.io/enzyme/docs/guides/jsdom.html
const { JSDOM } = require('jsdom');

// ============== CLASS TESTING ==============
//          << setting classes >>
const classes = require('../public/javascripts/classesTest');
const Pen = classes.Pen;
const Text = classes.Text;
const Rectangle = classes.Rectangle;


///////////////////////////////////////
//          << pen tests >>          //
///////////////////////////////////////
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

        // it('should erase if mouse is down with eraser selected', () => {
        //     expect(pen.path.on('mouseover')).to.be.a('function');
        // });
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
        it('should set path string correctly', () =>{
            text.setText("abcdefg");
            expect(text.textDiv.innerHTML).to.equal("abcdefg");
        });

        it('should get path string correctly', () =>{
            text.setText("abcdefg");
            expect(text.getText()).to.equal("abcdefg");
        });
    });
    describe('Test enable and disable', () => {
        describe('Test enable', () => {
            it('should set contendEditable to true', () =>{
                text.enable();
                expect(text.textDiv.getAttribute("contentEditable")).to.equal("true");
            });
            it('should add "textEnabled to classList', () =>{
                expect(text.foreignText.classList.contains("textEnabled")).to.equal(true);
            });
        });
        describe('Test disable', () => {
            it('should set contendEditable to false', () =>{
                text.enable();
                text.disable();
                expect(text.textDiv.getAttribute("contentEditable")).to.equal("false");
            });
            it('should remove "textEnabled from classList', () =>{
                text.enable();
                text.disable();
                expect(text.foreignText.classList.contains("textEnabled")).to.equal(false);
            });
        });
    });
});




//          << Rectangle tests >>
describe('Test Rectangle Class', () => {
    let rectangle;

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

          rectangle = new Rectangle(3, { x: 100, y: 100 }, { x: 150, y: 150 }, "#FFFFFF");
    });

    afterEach("Close Dom", function(){
        dom.window.close
    });

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

    describe('Test updateFromCorners', () => {
        it('should properly update rectangle variables', () =>{
            rectangle.updateFromCorners({ x: 75, y: 75 }, { x: 125, y: 125 });
            expect(rectangle.upperLeft.x).to.equal(75);
            expect(rectangle.upperLeft.y).to.equal(75);

            expect(rectangle.lowerRight.x).to.equal(125);
            expect(rectangle.lowerRight.y).to.equal(125);

            expect(rectangle.width).to.equal(rectangle.lowerRight.x - rectangle.upperLeft.x);
            expect(rectangle.height).to.equal(rectangle.lowerRight.y - rectangle.upperLeft.y);
        });
        it('should properly update rectangle variables', () =>{
            rectangle.updateFromCorners({ x: 75, y: 75 }, { x: 125, y: 125 });
            expect(rectangle.rect.getAttribute("x")).to.equal(rectangle.x.toString());
            expect(rectangle.rect.getAttribute("y")).to.equal(rectangle.y.toString());
            expect(rectangle.rect.getAttribute("width")).to.equal(Math.abs(rectangle.width).toString());
            expect(rectangle.rect.getAttribute("height")).to.equal(Math.abs(rectangle.height).toString());
        });
    });

    describe('Test updateFromCorners', () => {
        it('should return rect on getSVG call', () =>{
            expect(rectangle.getSvg()).to.equal(rectangle.rect);
        });
    });
});