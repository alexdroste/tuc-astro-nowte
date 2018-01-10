import {Spline} from "./Spline";
import {PathFitter} from "./PathFitter";
import {Point} from "./Point";
import {StrokeStyle} from "../drawing/StrokeStyle";
import {fromObjectArray, leanArray} from "../utilities/arrayConverter";
import {Rect} from "./Rect";


export class Path {
    /**
     * @type {Rect|null}
     */
    get boundingBox() {
        const b = this._bbox.clone();
        if (this.strokeStyle)
            b.grow(this.strokeStyle.thickness / 2);
        return b;
    }


    /**
     * @param {StrokeStyle} strokeStyle stroke style to use
     * @param {Point[]} [points=[]] points to create path from (empty by default)
     */
    constructor(strokeStyle, points = []) {
        /**
         * Stroke styling
         * @type {StrokeStyle}
         */
        this.strokeStyle = strokeStyle;

        /**
         * Points describing the path (start to end)
         * @type {Point[]}
         */
        this.points = points;

        /**
         * Bounding box
         * @type {Rect}
         * @private
         */
        this._bbox = this._calcBoundingBox();
    }


    /**
     * Creates Path from object with same properties
     * @param {Object} obj
     * @returns {Path}
     */
    static fromObject(obj) {
        return new Path(StrokeStyle.fromObject(obj.strokeStyle), fromObjectArray(obj.points, Point.fromObject));
    }


    /**
     * Returns lean js object
     * @returns {{strokeStyle: StrokeStyleOptions, points: Array<{x: number, y: number}>}}
     */
    lean() {
        return {
            strokeStyle: this.strokeStyle? this.strokeStyle.lean() : null,
            // points can be used as they are
            points: leanArray(this.points),
        };
    }


    /**
     * Checks if path is valid (has at least two points)
     * @returns {boolean} true if path has at least two points
     */
    isValid() {
        return this.points.length >= 2;
    }


    /**
     * Adds a point to the end of the path
     * @param {Point} point point to add
     */
    addPoint(point) {
        this.points.push(point);

        // update bbox
        if(this._bbox) {
            // adjust bbox
            this._bbox.x1 = Math.min(this._bbox.x1, point.x);
            this._bbox.y1 = Math.min(this._bbox.y1, point.y);
            this._bbox.x2 = Math.max(this._bbox.x2, point.x);
            this._bbox.y2 = Math.max(this._bbox.y2, point.y);
        }
        else {
            // bbox was not calculated before due to lack of points
            this._bbox = Rect.fromPoints(point, point);
        }
    }


    /**
     * converts the path into a spline
     * @returns {Spline}
     */
    toSpline() {
        const splinePoints = new PathFitter(this, false).fit(2.5);
        if(!splinePoints)
            return null; // some error during converting?
        return new Spline(this.strokeStyle, splinePoints);
    }


    /**
     * Calculates bounding box
     * @return {Rect|null}
     * @private
     */
    _calcBoundingBox() {
        if(this.points.length < 1)
            return null;

        let topLeft = this.points[0].clone();
        let bottomRight = this.points[0].clone();

        for(let pt of this.points){
            topLeft.x = Math.min(topLeft.x, pt.x);
            topLeft.y = Math.min(topLeft.y, pt.y);
            bottomRight.x = Math.max(bottomRight.x, pt.x);
            bottomRight.y = Math.max(bottomRight.y, pt.y);
        }

        return Rect.fromPoints(topLeft, bottomRight);
    }


    /**
     * Draws path in rendering context
     * @param {Object} context 2d rendering context of canvas
     */
    draw(context) {
        if (!this.isValid())
            throw new Error('invalid paths can not be drawn');

        context.beginPath();
        this.strokeStyle.apply(context);

        // start point
        context.moveTo(this.points[0].x, this.points[0].y);

        for(let i = 1; i < this.points.length; i++) {
            context.lineTo(this.points[i].x, this.points[i].y);
        }
        context.stroke();
    }
}