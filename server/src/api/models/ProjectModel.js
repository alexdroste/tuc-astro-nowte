/**
 * @author progmem
 * @date 10.12.17
 */

'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
mongoose.Promise = global.Promise;


const accessSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'userId is required']
    },
    grantedById: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'grantedById is required']
    },
    permissions: {
        type: Number,
        required: [true, 'permissions is required']
    }
}, { id: false, usePushEach: true }); // TODO remove with mongoose v5


const childrenSchema = new Schema({
    documentId: {
        type: Schema.Types.ObjectId,
        ref: 'Document',
        required: [true, 'documentId is required']
    },
    title: {
        type: String,
        trim: true,
        required: [true, 'title is required']
    }
}, { id: false, usePushEach: true }); // TODO remove with mongoose v5


const treeSchema = new Schema({
    path: {
        type: String,
        trim: true,
        required: [true, 'path is required']
    },
    children: [childrenSchema]
}, { id: false, usePushEach: true }); // TODO remove with mongoose v5


const projectSchema = new Schema({
    title: {
        type: String,
        trim: true,
        required: [true, 'name is required']
    },
    access: [accessSchema],
    tree: [treeSchema]
}, { usePushEach: true }); // TODO remove with mongoose v5


/**
 * Mongoose Model of Project Schema
 */
const ProjectModel = mongoose.model('Project', projectSchema);

module.exports = ProjectModel;
