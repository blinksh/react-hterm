// @flow

import React, { Component } from 'react';
import type { RNodeType } from './model';

type PropsType = {
  node: RNodeType,
};

// https://medium.com/reactnative/emojis-in-javascript-f693d0eb79fb
const _emojiRegex = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|[\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|[\ud83c[\ude32-\ude3a]|[\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/;

export default class RNode extends Component<PropsType> {
  _v: number = -1;

  render() {
    const node = this.props.node;
    const attrs = node.attrs;
    this._v = node.v;

    // Fast path
    if (attrs.isDefault) {
      return node.txt;
    }

    // if colors < 256 we have them in className
    // otherwise set them with style
    var style = null;
    if (attrs.fc !== '') {
      style = style || {};
      style.color = node.attrs.fc;
    }
    if (attrs.bc !== '') {
      style = style || {};
      style.backgroundColor = node.attrs.bc;
    }
    if (attrs.uc !== '') {
      style = style || {};
      style.textDecorationColor = node.attrs.uc;
    }

    let className = node.attrs.className;
    if (!attrs.asciiNode) {
      if (attrs.wcNode) {
        if (_emojiRegex.test(node.txt)) {
          className += ' wc wc-node emoji';
        } else {
          className += ' wc wc-node';
        }
      } else if (node.wcw < 300) {
        // TODO: move to config or const
        className += ' wc wc' + node.wcw;
      } else {
        className += ' wc';

        style = style || {};
        style.width = 'calc(var(--hterm-charsize-width) * ' + node.wcw + ')';
      }
    }

    const props = {};
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
