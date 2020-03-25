import React, { Component } from 'react';
import { RRowType, RImageType } from './model';
declare type PropsType = {
    row: RRowType;
};
export default class RRow extends Component<PropsType> {
    _v: number;
    _dirty: boolean;
    render(): React.DOMElement<React.DOMAttributes<Element>, Element>;
    _renderImage(img: RImageType): React.ReactElement<{
        key: string;
        style: {
            position: string;
            textAlign: string;
            height: string;
        };
    }, string | ((props: any) => React.ReactElement<any, string | any | (new (props: any) => React.Component<any, any, any>)> | null) | (new (props: any) => React.Component<any, any, any>)>;
    shouldComponentUpdate(nextProps: PropsType): boolean;
    touch(): void;
}
export {};
