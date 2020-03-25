import React from 'react';
import { RNodeType } from './model';
export declare const WC_PRECALCULATED_CLASSES = 300;
declare type PropsType = {
    node: RNodeType;
};
export default class RNode extends React.Component<PropsType> {
    _v: number;
    render(): string | React.DetailedReactHTMLElement<{
        style?: any;
        className?: string | undefined;
    }, HTMLElement>;
    shouldComponentUpdate(nextProps: PropsType): boolean;
}
export {};
