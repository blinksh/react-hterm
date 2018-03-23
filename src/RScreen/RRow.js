// @flow

import React, { Component } from 'react';
import type { RRowType } from './model';
import RNode from './RNode';

type PropsType = {|
  row: RRowType,
|};

export default class RRow extends Component<PropsType> {
  _v: number;

  render() {
    this._v = this.props.row.v;

    var nodes = this.props.row.nodes;
    var len = nodes.length;
    var elements = new Array(len);
    for (var i = 0; i < len; i++) {
      var n = nodes[i];
      elements[i] = React.createElement(RNode, { key: n.key, node: n });
    }
    return React.createElement('x-row', null, elements);
  }

  shouldComponentUpdate(nextProps: PropsType) {
    return this._v !== nextProps.row.v;
  }
}
