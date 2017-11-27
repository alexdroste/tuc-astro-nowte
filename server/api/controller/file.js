/**
 * @author progmem
 * @date 26.11.17
 */

'use strict';

// -------------------------------------------
// Includes
// -------------------------------------------
const config = require('../../init/config');
const Folder = require('../models/folder').Folder;
const Document = require('../models/document').Document;
const Share = require('../models/share').Share;
const utility = require('./utility');


// -------------------------------------------
// File actions
// -------------------------------------------
/**
 * Retrieves user-permissions for a specified file
 * @param userId
 * @param fileId
 * @param isFolder
 * @returns {Promise.<*|{read: boolean, annotate: boolean, edit: boolean, manage: boolean}>}
 */
async function getFilePermissions(userId, fileId, isFolder) {
    const projection = { ownerId: 1, shareIds: 1 };
    let fileEntry;
    try {
        fileEntry = isFolder ?
            await Folder.findById(fileId, projection)
            : await Document.findById(fileId, projection);
    } catch (err) {
        utility.throwAndLog(err, 'unknown mongo error');
    }

    if (fileEntry.ownerId.toString() === userId)
        return utility.createPermissionsObject(true, true, true, true);

    const shares = await Share.find({ _id: { $in: fileEntry.shareIds }}, { userId: 1, permissions: 1});
    const shareEntryForUser = shares.find((elem) => {
        return elem.userId === userId;
    });
    return shareEntryForUser === undefined ?
        utility.createPermissionsObject(false, false, false, false)
        : utility.fixPermissionsObject(shareEntryForUser.permissions);
}
module.exports.getFilePermissions = getFilePermissions;


/**
 * Checks if provided title is already existent in specified folder
 * @param title
 * @param isFolder specified is title is folder or document title
 * @param parentId id of folder
 * @returns {Promise.<boolean>} true if no duplicate
 */
async function checkTitleIsNoDuplicate(title, isFolder, parentId) {
    utility.requireVarWithType('parentId', 'string', parentId);
    utility.requireVarWithType('title', 'string', title);
    utility.requireVarWithType('isFolder', 'boolean', isFolder);
    title = title.trim();

    let parentFolder;
    try {
        parentFolder = await Folder.findById(parentId, isFolder ? { childIds: 1 } : { documentIds : 1});
    } catch (err) {
        utility.throwAndLog(err, 'unknown mongo error');
    }
    utility.conditionalThrowWithStatus(parentFolder === null, 'parentId not found', 404);

    let fileEntries;
    try {
        fileEntries = isFolder ?
            await Folder.find({ _id: { $in: parentFolder.childIds }}, { title: 1 })
            : await Document.find({ _id: { $in: parentFolder.documentIds }}, { title: 1 });
    } catch (err) {
        utility.throwAndLog(err, 'unknown mongo error');
    }

    const matchingEntry = fileEntries.find((elem) => {
        return elem.title === title;
    });
    return matchingEntry === undefined;
}
module.exports.checkTitleIsNoDuplicate = checkTitleIsNoDuplicate;


/**
 * Creates a file (folder/document) in specified folder (parentId) with title
 * @param ownerId userId of owner
 * @param parentId id of parent folder
 * @param isFolder true if folder, false if document
 * @param title
 * @returns {Promise.<string>}
 */
async function create(ownerId, parentId, isFolder, title) {
    utility.requireVarWithType('ownerId', 'string', ownerId);
    utility.requireVarWithType('parentId', 'string', parentId);
    utility.requireVarWithType('title', 'string', title);
    utility.requireVarWithType('isFolder', 'boolean', isFolder);
    title = title.trim();

    // title is no duplicate
    utility.conditionalThrowWithStatus(
        !await checkTitleIsNoDuplicate(title, isFolder, parentId),
        'title already exists', 409);

    // user is allowed to create file in parent folder
    const permissions = await getFilePermissions(ownerId, parentId, true);
    utility.conditionalThrowWithStatus(permissions.manage === false, 'not allowed to manage parentId', 403);


    // create folder/document (file)
    let file = {
        'title': title,
        'parentId': parentId,
        'ownerId': ownerId
    };
    file = isFolder ? new Folder(file) : new Document(file);
    // save file to db
    try {
        await file.save();
    } catch (err) {
        if (err.message.startsWith('Document validation failed') || err.message.startsWith('Folder validation failed'))
            utility.conditionalThrowWithStatus(true, err.message, 400);
        else
            utility.throwAndLog(err, 'unknown mongo error');
    }

    // add fileId to parent folder (link back)
    let rawResponse;
    try {
        const pushop = isFolder ? { childIds: file._id } : { documentIds: file._id };
        rawResponse = await Folder.update({ _id: parentId }, { $push: pushop});
    } catch (err) {
        utility.throwAndLog(err, 'unknown mongo error');
    }
    utility.conditionalThrowWithStatus(rawResponse.n === 0, 'parentId not found', 404);

    // TODO FIX concurrency check, repair if backlink via id fails

    return file._id.toString();
}
module.exports.create = create;