import React, { Component } from 'react';
import { RRowType, RImageType } from './model';
import RNode from './RNode';

type PropsType = {
  row: RRowType,
};

// Safari/iOS >= 18.4 (WebKit 621) does not invalidate the area of inline content removed
// from a row, so a row can keep painting glyphs it no longer contains. Flipping a
// paint-only property forces a repaint of the row's whole rect; the two values must be
// invisible and distinct.
const PAINT_KICK = ['rgba(0,0,0,0)', 'rgba(0,0,1,0)'];

export default class RRow extends Component<PropsType> {
  _v: number = -1;
  _dirty: boolean = true;

  // Committed value, and the one this render proposes.
  _kick: number = 0;
  _nextKick: number = 1;

  render() {
    this._v = this.props.row.v;
    this._nextKick = this._kick ^ 1;

    const nodes = this.props.row.nodes;
    const len = nodes.length;
    const elements = new Array(len);
    for (let i = 0; i < len; i++) {
      const node = nodes[i];
      elements[i] = React.createElement(RNode, { key: node.key, node });
    }

    const style: any = { backgroundColor: PAINT_KICK[this._nextKick] };

    if (this.props.row.img) {
      elements.push(this._renderImage(this.props.row.img));
      style.overflow = 'visible';
    }

    this._dirty = false;
    return React.createElement('x-row', { style }, elements);
  }

  componentDidMount() {
    this._kick = this._nextKick;
  }

  componentDidUpdate() {
    this._kick = this._nextKick;
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
