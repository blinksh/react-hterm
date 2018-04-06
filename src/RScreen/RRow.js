// @flow

import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import type { RRowType } from './model';
import RNode from './RNode';

type PropsType = {|
  row: RRowType,
|};

export default class RRow extends Component<PropsType> {
  _v: number = -1;
  _dirty: boolean = true;

  render() {
    this._v = this.props.row.v;

    let nodes = this.props.row.nodes;
    let len = nodes.length;
    let elements = new Array(len);
    for (let i = 0; i < len; i++) {
      const n = nodes[i];
      elements[i] = React.createElement(RNode, { key: n.key, node: n });
    }
    this._dirty = false;
    return React.createElement('x-row', null, elements);
  }

  shouldComponentUpdate(nextProps: PropsType) {
    return this._v !== nextProps.row.v;
  }

  _touch = () => this.forceUpdate();

  touch() {
    if (this._dirty) {
      return;
    }

    this._dirty = true;
    this._touch();
    //ReactDOM.unstable_deferredUpdates(this._touch);
  }
}
