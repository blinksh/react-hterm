// @flow

import React, { Component } from 'react';
import type { RRowType } from './model';
import RNode from './RNode';

type PropsType = {|
  row: RRowType,
  rowRefs: Map<string, any>,
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

  componentDidMount() {
    this.props.rowRefs.set(this.props.row.n, this);
  }

  componentWillUnmount() {
    this.props.rowRefs.delete(this.props.row.n);
  }

  shouldComponentUpdate(nextProps: PropsType) {
    return this._v !== nextProps.row.v;
  }
}
