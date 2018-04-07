// @flow

import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import type { RRowType } from './model';
import RNode from './RNode';

type PropsType = {|
  row: RRowType,
|};

export default class RRow extends Component<PropsType> {
  _v: number = -1;
  _dirty: boolean = true;

  render() {
    this._v = this.props.row.v;

    const nodes = this.props.row.nodes;
    const len = nodes.length;
    const elements = new Array(len);
    for (let i = 0; i < len; i++) {
      const node = nodes[i];
      elements[i] = React.createElement(RNode, { key: node.key, node });
    }
    this._dirty = false;
    return React.createElement('x-row', null, elements);
  }

  shouldComponentUpdate(nextProps: PropsType) {
    return this._v !== nextProps.row.v;
  }

  touch() {
    if (this._dirty) {
      return;
    }

    this._dirty = true;
    this.forceUpdate();
  }
}
