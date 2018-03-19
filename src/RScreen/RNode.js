// @flow

import React, { Component } from 'react';
import type { RNodeType } from './model';

type PropsType = {
  node: RNodeType,
};

export default class RNode extends Component<PropsType> {
  _v: number;
  render() {
    const { node } = this.props;
    this._v = node.v;

    // Fast path
    if (node.attrs.isDefault) {
      return node.txt;
    }

    let className = node.attrs.className;
    var style = null;
    if (!(node.attrs.fc < 256)) {
      style = style || {};
      style.color = node.attrs.fc;
    }
    if (!(node.attrs.bc < 256)) {
      style = style || {};
      style.backgroundColor = node.attrs.bc;
    }
    if (!(node.attrs.uc < 256)) {
      style = style || {};
      style.textDecorationColor = node.attrs.uc;
    }

    if (!node.attrs.asciiNode) {
      if (node.wcwidth < 1000) {
        className += ' wc' + node.wcwidth.toString();
      }
    }

    var props = {};
    if (className) {
      props.className = className;
    }
    if (style) {
      props.style = style;
    }

    return React.createElement('span', props, node.txt);
  }

  shouldComponentUpdate(nextProps: PropsType) {
    return this._v !== nextProps.node.v;
  }
}
