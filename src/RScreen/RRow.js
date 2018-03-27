// @flow

import React, { Component } from 'react';
import type { RRowType } from './model';
import RNode from './RNode';

type PropsType = {|
  row: RRowType,
|};

export default class RRow extends Component<PropsType> {
  _v: number = -1;

  render() {
    this._v = this.props.row.v;

    let nodes = this.props.row.nodes;
    let len = nodes.length;
    let elements = new Array(len);
    for (let i = 0; i < len; i++) {
      const n = nodes[i];
      elements[i] = React.createElement(RNode, { key: n.key, node: n });
    }
    return React.createElement('x-row', null, elements);
  }

  shouldComponentUpdate(nextProps: PropsType) {
    return this._v !== nextProps.row.v;
  }
}
