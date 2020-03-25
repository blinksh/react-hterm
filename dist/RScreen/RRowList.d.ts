import React from 'react';
import { RRowType } from './model';
export default class RRowList extends React.Component {
    _dirty: boolean;
    _rows: RRowType[];
    _rowsMap: Map<number, any>;
    render(): any[];
    setRows(rows: RRowType[]): void;
    touchRow(row: RRowType): void;
    touch(): void;
}
