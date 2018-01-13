/**
 * @author Alexander Droste
 * @date 12.01.18
 */


import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import {Button} from "../../base/Button";


const ContentWrapper = styled.div`
    
    transform: rotateZ(-45deg);
`;


const lightGreyDropTheme = `
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0;
    width: 45px;
    height: 45px;
    border: 1px solid transparent;
    border-radius: 50% 0 50% 50% / 50% 0 50% 50%;
    color: transparent;
    transition: color 0.3s, border-color 0.3s;
    transform: rotateZ(+45deg);
    font-size: 28px;
    
    &:hover, 
    &:focus {
        background-color: #fff;
        border-color: #777;
        color: #777;
    }
`;


export class DropButton extends React.Component {
    /**
     * propTypes
     * @property {function()} onClick callback when button was clicked
     */
    static get propTypes() {
        return {
            onClick: PropTypes.func.isRequired,
        };
    }

    static get defaultProps() {
        return {

        };
    }


    render() {
        return (
            <div className={this.props.className}>
                <Button large focusable={false} theme={lightGreyDropTheme} onClick={this.props.onClick}>
                    <ContentWrapper>
                        +
                    </ContentWrapper>
                </Button>
            </div>
        );
    }
}