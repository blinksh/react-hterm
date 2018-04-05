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
    const attrs = node.attrs;
    this._v = node.v;

    // Fast path
    if (attrs.isDefault) {
      return node.txt;
    }

    let className = node.attrs.className;
    var style = null;
    if (!(attrs.fc < 256)) {
      style = style || {};
      style.color = node.attrs.fc;
    }
    if (!(attrs.bc < 256)) {
      style = style || {};
      style.backgroundColor = node.attrs.bc;
    }
    if (!(attrs.uc < 256)) {
      style = style || {};
      style.textDecorationColor = node.attrs.uc;
    }

    if (!attrs.asciiNode) {
      if (node.wcw < 300) {
        // TODO: move to config or const
        className += ' wc wc' + node.wcw;
      } else {
        className += ' wc';
        style = style || {};
        style.width = 'calc(var(--hterm-charsize-width) * ' + node.wcw + ')';
      }
    }

    let props = {};
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
