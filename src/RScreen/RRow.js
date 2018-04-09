// @flow

import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import type { RRowType, RImageType } from './model';
import RNode from './RNode';

type PropsType = {|
  row: RRowType,
|};

export default class RRow extends Component<PropsType> {
  _v: number = -1;
  _dirty: boolean = true;

  render() {
    this._v = this.props.row.v;

    const nodes = this.props.row.nodes;
    const len = nodes.length;
    const elements = new Array(len);
    for (let i = 0; i < len; i++) {
      const node = nodes[i];
      elements[i] = React.createElement(RNode, { key: node.key, node });
    }
    if (this.props.row.img) {
      elements.push(this._renderImage(this.props.row.img));
    }
    this._dirty = false;
    return React.createElement('x-row', null, elements);
  }

  _renderImage(img: RImageType) {
    var imageElement = React.createElement('img', {
      src: img.src,
      alt: img.alt,
      title: img.title,
      style: {
        position: 'absolute',
        objectFit: img.objectFit,
        maxWidth: '100%',
        height: `calc(${img.padRows} * var(--hterm-charsize-height))`,
        bottom: 0,
      },
    });
    return React.createElement(
      'div',
      {
        key: 'image',
        style: {
          position: 'relative',
          textAlign: img.textAlign,
          height: 'calc(var(--hterm-charsize-height))',
        },
      },
      imageElement,
    );
  }

  shouldComponentUpdate(nextProps: PropsType) {
    return this._v !== nextProps.row.v;
  }

  touch() {
    if (this._dirty) {
      return;
    }

    this._dirty = true;
    this.forceUpdate();
  }
}
