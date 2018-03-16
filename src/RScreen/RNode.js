// @flow

import React, { Component } from 'react';
import type { RNodeType } from './model';

type PropsType = {
  node: RNodeType,
};

export default class RNode extends Component<PropsType> {
  _v: number;
  render() {
    this._v = this.props.node.v;
    return this.props.node.txt;
  }

  shouldComponentUpdate(nextProps: PropsType) {
    return this._v !== nextProps.node.v;
  }
}
