// @flow

import React, { Component } from 'react';
import type { RRowType } from './model';
import RNode from './RNode';

type PropsType = {
  row: RRowType,
};

type StateType = {
  v: number,
};

export default class RRow extends Component<PropsType, StateType> {
  constructor(props: PropsType) {
    super();
    this.state = { v: props.row.v };
  }
  render() {
    const nodes = this.props.row.nodes.map(n => <RNode key={n.key} node={n} />);
    return <x-row>{nodes}</x-row>;
  }

  shouldComponentUpdate(nextProps: PropsType, nextState: StateType) {
    var result = this.state.v != nextState.v || this.state.v != nextProps.row.v;
    return result;
  }

  touch() {
    this.setState({ v: this.props.row.v });
  }
}
