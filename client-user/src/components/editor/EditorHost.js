/**
 * @author Alexander Droste
 * @date 13.01.18
 */

import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import lookupSocket from 'socket.io-client';
import {Editor} from "./Editor";
import {ConnectionStateEnum} from "../../utilities/ConnectionStateEnum";
import {Path} from "../../geometry/Path";
import {Spline} from "../../geometry/Spline";
import {StrokeStyle} from "../../drawing/StrokeStyle";
import {Point} from "../../geometry/Point";


const Host = styled.div`
    position: relative;
    width: 100%;
`;


const Overlay = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    color: white;
    z-index: 9999;
    font-size: 20px;    
`;


export class EditorHost extends React.Component {
    /**
     * propTypes
     */
    static get propTypes() {
        return {
            documentId: PropTypes.string.isRequired,
            user: PropTypes.object.isRequired,
            onStatsChange: PropTypes.func
        };
    }

    static get defaultProps() {
        return {};
    }


    /**
     * socket.io connection
     * @type {Object|null}
     * @private
     */
    _socket = null;


    /**
     * stats object
     * @type {Object}
     * @private
     */
    _stats = {};

    constructor(props) {
        super(props);

        this._bricks = [];
        this.state = {
            initialConnection: true,
            connectionState: ConnectionStateEnum.DISCONNECTED,
            bricks: [],
        };


        this.setStats({
            connectionRTT: -1
        });


        // create socket & bind listeners
        this._socket = lookupSocket('http://localhost:3210');
        this._socket.on('connect', this.handleConnect);
        this._socket.on('disconnect', this.handleDisconnect);
        this._socket.on('reconnecting', this.handleReconnecting);
        this._socket.on('echo', this.handleEcho);
        this._socket.on('initialize', this.handleInitialize);

        this._socket.on('insertedBrick', this.handleInsertedBrick);
        this._socket.on('beginPath', this.handleBeginPathReceive);
        this._socket.on('addPathPoint', this.handleAddPathPointReceive);
        this._socket.on('endPath', this.handleEndPathReceive);
    }

    componentDidMount() {
        this.latencyInterval = setInterval(() => {
            if (this.state.connectionState !== ConnectionStateEnum.CONNECTED)
                return;
            this._socket.emit('echo', { timestamp: Date.now() });
        }, 5000);
    }

    componentWillUnmount() {
        clearInterval(this.latencyInterval);
    }

    getBrick = (brickId) => {
        // TODO user a better data structure
        for(let row of this._bricks){
            for(let brick of row){
                if(brick.id === brickId)
                    return brick;
            }
        }
        return null;
    };

    setStats = (stats) => {
        const prevStats = JSON.stringify(this._stats);
        Object.assign(this._stats, stats);
        if (this.props.onStatsChange && prevStats !== JSON.stringify(this._stats))
            this.props.onStatsChange(this._stats);
    };

    handleConnect = () => {
        this.setState({
            initialConnection: false,
            connectionState: ConnectionStateEnum.CONNECTED
        });
        console.log('connect');

        // send user information
        this._socket.emit('authentication', {
            userId: this.props.user.userId,
        });
    };

    handleDisconnect = () => {
        this.setState({
            connectionState: ConnectionStateEnum.DISCONNECTED
        });
        console.log('disconnect');
    };

    handleReconnecting = () => {
        this.setState({
            connectionState: ConnectionStateEnum.PENDING
        });
        console.log('reconnecting');
    };

    handleEcho = (data) => {
        if (data.hasOwnProperty('timestamp'))
            this.setStats({
                connectionRTT: Date.now() - data.timestamp
            });
    };

    handleInitialize = (data) => {
        // TODO add error handling
        this._bricks = [];
        if(data.bricks){
            for(let row of data.bricks){
                let curRow = [];
                for(let brick of row) {
                    const paths = [];
                    if(brick.paths){
                        for(let path of brick.paths){
                            paths.push({
                                id: ++this._localPathId,
                                path: Path.fromObject(path)
                            });
                        }
                    }

                    const splines = [];
                    if(brick.splines){
                        for(let spline of brick.splines){
                            splines.push({
                                id: ++this._localPathId,
                                spline: Spline.fromObject(spline),
                            });
                        }
                    }

                    curRow.push({
                        id: brick.id,
                        paths: paths,
                        splines: splines,
                    });
                }
                this._bricks.push(curRow);
            }
        }

        // schedule redraw
        this.setState({
            bricks: this._bricks,
        })
    };

    handleAddBrickClick = (heightIndex, columnIndex) => {

        this._socket.emit("insertBrick", {
            heightIndex: heightIndex,
            // TODO add column index handling
        });
    };

    handleInsertedBrick = (data) => {
        const heightIndex = data.heightIndex;
        const brickId = data.brickId;

        // TODO type checking
        const newBrick =  {
            id: brickId,
            paths: [],
            splines: [],
        };

        let bricks = this._bricks;

        // TODO add proper column index handling
        /*if(columnIndex){
            // insert next to another container
            bricks[heightIndex].splice(columnIndex, 0, newBrick);
        }
        else*/
        // insert at height index
        bricks.splice(heightIndex, 0, [newBrick]);


        this.setState({
            bricks: bricks,
        });
    };

    handleBeginPathReceive = (data) => {
        // update state
        const brickId = data.brickId;
        const userId = data.userId;
        const userUniqueId = data.userUniqueId;
        const strokeStyle = data.strokeStyle;
        // TODO check data types

        // obtain brick
        const brick = this.getBrick(brickId);
        if(!brick)
            return;

        brick.paths.push({
            id: ++this._localPathId,
            path: new Path(StrokeStyle.fromObject(strokeStyle)),
            userId: userId,
            userUniqueId: userUniqueId,
        });
    };

    _localPathId = 0;
    _currentUserPathId = null;
    handlePathBegin = (brick, strokeStyle) => {


        // update state
        brick.paths.push({
            id: ++this._localPathId,
            path: new Path(strokeStyle),
        });
        // remember that out user is drawing this line
        this._currentUserPathId = this._localPathId;

        // redrawing not required yet
        this._socket.emit("beginPath", {
            strokeStyle: strokeStyle.lean(),
            brickId: brick.id,
        });
    };

    handleAddPathPointReceive = (data) => {
        const brickId = data.brickId;
        const userUniqueId = data.userUniqueId;
        const points = data.points;

        // obtain brick
        const brick = this.getBrick(brickId);
        if(!brick)
            return;

        // get path
        let curPath = brick.paths.find(e => e.userUniqueId === userUniqueId);
        if(!curPath)
            return;

        for(let point of points){
            curPath.path.addPoint(Point.fromObject(point));
        }

        this.setStats({
            bricks: this._bricks,
        })
    };

    handlePathPoint = (brick, point) => {
        // add point to current path
        let curPath = brick.paths.find(e => e.id === this._currentUserPathId);
        if(!curPath)
            return;

        curPath.path.addPoint(point);

        // TODO send multiple points?
        this._socket.emit("addPathPoint", {
            points: [point.lean()],
        });

        // redraw
        this.setState({
            bricks: this._bricks,
        });
    };

    handleEndPathReceive = (data) => {
        const brickId = data.brickId;
        const userUniqueId = data.userUniqueId;
        const spline = data.spline;

        // obtain brick
        const brick = this.getBrick(brickId);
        if(!brick)
            return;

        // remove the path
        let idx = brick.paths.findIndex(e => e.userUniqueId === userUniqueId);
        if(idx >= 0){
            brick.paths.splice(idx, 1);
        }

        const convertedSpline = Spline.fromObject(spline);
        if(!convertedSpline)
            return;

        brick.splines.push({
            id: ++this._localPathId,
            spline: convertedSpline,
        });

        this.setState({
           bricks: this._bricks,
        });
    };

    handlePathEnd = (brick) => {
        // generate the spline
        let idx = brick.paths.findIndex(e => e.id === this._currentUserPathId);
        if(idx < 0)
            return;

        this._currentUserPathId = null;
        const spline = brick.paths[idx].path.toSpline();

        // remove path
        brick.paths.splice(idx, 1);

        if(!spline)
            return;

        this._socket.emit("endPath", {
            spline: spline.lean(),
        });

        // add spline
        // TODO generate unique spline id's
        brick.splines.push({
            id: ++this._localPathId,
            spline: spline,
        });

        // force rerender
        this.setState({
            bricks: this._bricks,
        });
    };

    render() {
        return (
            <Host>
                {this.state.connectionState !== ConnectionStateEnum.CONNECTED &&
                <Overlay>
                    Connecting...
                </Overlay>}
                {!this.state.initialConnection &&
                <Editor
                    user={this.props.user}
                    bricks={this.state.bricks}

                    onBrickAdd={this.handleAddBrickClick}

                    onPathBegin={this.handlePathBegin}
                    onPathPoint={this.handlePathPoint}
                    onPathEnd={this.handlePathEnd}
                />}
            </Host>
        );
    }
}