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

    const nodes = this.props.row.nodes.map(n => <RNode key={n.key} node={n} />);
    return <x-row>{nodes}</x-row>;
  }

  shouldComponentUpdate(nextProps: PropsType) {
    return this._v !== nextProps.row.v;
  }
}
