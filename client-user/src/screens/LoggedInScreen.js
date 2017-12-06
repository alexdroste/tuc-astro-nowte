import React from 'react';
import PropTypes from 'prop-types';
import FileTree from "../ui/FileTree";
import UserFileTreeForm from "../ui/UserFileTreeForm";
import Button from "../ui/base/Button";
import * as API from '../ServerApi'
import {store} from "./../Redux";
import * as action from './../Actions'

export default class LoggedInScreen extends React.Component {
    /**
     * propTypes
     */
    static get propTypes() {
        return {};
    }

    static get defaultProps() {
        return {};
    }

    handleLogOutClick = () => {
        API.logOut(() => {
            // reset data
            store.dispatch(action.logOut());
        }, this.handleError);
    };

    handleError = (err) => {
        alert(err);
    };

    render() {
        return (
            <div>
                <UserFileTreeForm/>
                <Button
                    label="Log out"
                    onClick={this.handleLogOutClick}
                />
            </div>
        );
    }
}