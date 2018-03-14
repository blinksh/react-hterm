// @flow

import React, { Component } from 'react';
import type { RNodeType } from './model';

type PropsType = {
  node: RNodeType,
};

export default class RNode extends Component<PropsType> {
  render() {
    return this.props.node.txt;
  }

  shouldComponentUpdate(nextProps: PropsType) {
    return this.props.node.v !== nextProps.node.v;
  }
}
