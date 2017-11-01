import React from 'react';
import PropTypes from 'prop-types';

export default class ForgotPasswordScreen extends React.Component {
    /**
     * propTypes
     * @property {function(state: string)} onStateChange function to set the app state
     */
    static get propTypes() {
        return {
            onStateChange: PropTypes.func.isRequired
        };
    }

    static get defaultProps() {
        return {};
    }

    render() {
        return (
            <div>
                ForgotPasswordScreen
            </div>
        );
    }
}