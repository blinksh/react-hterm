// @flow

import React from 'react';
import ReactDOM from 'react-dom';
import type { RRowType } from './model';
import RRow from './RRow';

export default class RRowList extends React.Component<*> {
  _dirty = true;
  _rows: RRowType[] = [];

  render() {
    const rows = this._rows;
    const len = rows.length;
    const elements = new Array(len);
    for (var i = 0; i < len; i++) {
      var row = rows[i];
      elements[i] = React.createElement(RRow, { key: row.key, row: row });
    }
    this._dirty = false;
    return React.createElement('div', null, elements);
  }

  setRows(rows: RRowType[]) {
    this._rows = rows;
    this.touch();
  }

  touch() {
    if (this._dirty) {
      return;
    }
    this._dirty = true;
    ReactDOM.unstable_deferredUpdates(() => {
      this.forceUpdate();
    });
  }
}
